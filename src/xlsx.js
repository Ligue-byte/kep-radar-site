const textEncoder = new TextEncoder();

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const uint16 = (value) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
const uint32 = (value) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);

function concatenate(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  bytes.forEach((byte) => {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  });
  return (value ^ 0xffffffff) >>> 0;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const fileName = textEncoder.encode(name);
    const fileContent = textEncoder.encode(content);
    const checksum = crc32(fileContent);
    const localHeader = concatenate([
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(checksum), uint32(fileContent.length), uint32(fileContent.length), uint16(fileName.length), uint16(0)
    ]);
    localParts.push(localHeader, fileName, fileContent);

    const centralHeader = concatenate([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(checksum), uint32(fileContent.length), uint32(fileContent.length), uint16(fileName.length), uint16(0),
      uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset)
    ]);
    centralParts.push(centralHeader, fileName);
    offset += localHeader.length + fileName.length + fileContent.length;
  });

  const centralDirectory = concatenate(centralParts);
  const end = concatenate([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0)
  ]);
  return concatenate([...localParts, centralDirectory, end]);
}

const columnName = (index) => String.fromCharCode(65 + index);

function cell(reference, value, style) {
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value ?? '')}</t></is></c>`;
}

const styleFor = (column, total = false) => {
  const base = {
    text: 0,
    number: 2,
    percent: 3,
    signedPercent: 4,
    signedNumber: 5,
    integer: 11
  }[column.type] ?? 0;
  return total && base <= 5 ? base + 5 : base;
};

const workbookStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF20242B"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123955"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="165" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="165" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Обычный" xfId="0" builtinId="0"/></cellStyles><dxfs count="2"><dxf><font><color rgb="FF008A68"/></font></dxf><dxf><font><color rgb="FFBE453E"/></font></dxf></dxfs></styleSheet>`;

function createWorkbook({ sheetName, columns, rows, freezeHeader = true }) {
  const worksheet = createWorksheet(columns, rows, { freezeHeader });

  return createZip([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
    { name: 'xl/styles.xml', content: workbookStyles }
  ]);
}

export function createXlsxBytes({ sheetName, columns, rows, sheets }) {
  return sheets?.length
    ? createMultiSheetWorkbook(sheets)
    : createWorkbook({ sheetName, columns, rows });
}

function columnWidth(column, rows) {
  if (!column.autoWidth) return column.width ?? 16;
  const contentWidth = Math.max(
    String(column.label ?? '').length,
    ...rows.map((row) => String(row[column.key] ?? '').length)
  );
  return Math.max(column.minWidth ?? 10, Math.min(column.maxWidth ?? 30, contentWidth + 2));
}

function conditionalFormatting(columns, lastRow) {
  if (lastRow < 2) return '';
  let priority = 1;
  return columns.map((column, index) => {
    if (column.conditional !== 'signedPercent') return '';
    const range = `${columnName(index)}2:${columnName(index)}${lastRow}`;
    const result = `<conditionalFormatting sqref="${range}"><cfRule type="cellIs" dxfId="0" priority="${priority}" operator="greaterThan"><formula>0</formula></cfRule><cfRule type="cellIs" dxfId="1" priority="${priority + 1}" operator="lessThan"><formula>0</formula></cfRule></conditionalFormatting>`;
    priority += 2;
    return result;
  }).join('');
}

function createWorksheet(columns, rows, { freezeHeader = true } = {}) {
  const header = `<row r="1" ht="24" customHeight="1">${columns.map((column, index) => cell(`${columnName(index)}1`, column.label, 1)).join('')}</row>`;
  const body = rows.map((row, rowIndex) => {
    const currentRow = rowIndex + 2;
    return `<row r="${currentRow}">${columns.map((column, columnIndex) => cell(
      `${columnName(columnIndex)}${currentRow}`,
      row[column.key],
      styleFor(column, row.total)
    )).join('')}</row>`;
  }).join('');
  const lastRow = rows.length + 1;
  const widths = columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${columnWidth(column, rows)}" customWidth="1"/>`).join('');
  const sheetView = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(columns.length - 1)}${lastRow}"/>${sheetView}<sheetFormatPr defaultRowHeight="18"/><cols>${widths}</cols><sheetData>${header}${body}</sheetData><autoFilter ref="A1:${columnName(columns.length - 1)}${lastRow}"/>${conditionalFormatting(columns, lastRow)}</worksheet>`;
}

function createMultiSheetWorkbook(sheets) {
  const sheetNodes = sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  const worksheetRels = sheets.map((sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  return createZip([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNodes}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${worksheetRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: createWorksheet(sheet.columns, sheet.rows, sheet) })),
    { name: 'xl/styles.xml', content: workbookStyles }
  ]);
}

export function downloadXlsx({ filename, sheetName, columns, rows, sheets }) {
  const workbook = createXlsxBytes({ sheetName, columns, rows, sheets });
  const blob = new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
