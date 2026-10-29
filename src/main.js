import { market } from './data/market.js';
import { competitors, competitorList } from './data/competitors.js';
import { kontur } from './data/kontur.js';
import { downloadXlsx } from './xlsx.js';

const app = document.querySelector('#app');
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const linkTo = (item, label = item.name) => item.href ? `<a href="${esc(item.href)}">${esc(label)}</a>` : esc(label);
let activeRankingMode = 'all';
let activeFinancialMetric = 'revenue';

// The Market navigation is the public entry point for competitor profiles.
// Keep incomplete legacy profiles out of every Market navigation surface until
// they are migrated to the current page contract.
const publishedCompetitors = () => competitorList.filter((item) => (
  item.showInMenu !== false && item.marketComparison && item.hero
));

function competitorMenu() {
  const menuItems = publishedCompetitors();
  const [route] = (location.hash.replace(/^#/, '') || 'market').split('?');
  const [, currentSlug] = route.split('/');
  const current = route.startsWith('competitor/') ? menuItems.find((item) => item.slug === currentSlug) : null;
  const label = current?.shortName ?? 'Конкуренты';
  return `<details class="nav-menu${current ? ' is-current' : ''}"><summary>${esc(label)}</summary><div>${menuItems.map((item) => `<a class="${item.slug === currentSlug ? 'active' : ''}" href="#competitor/${item.slug}">${esc(item.shortName)}</a>`).join('')}</div></details>`;
}

function closeCompetitorMenus(except = null) {
  document.querySelectorAll('.nav-menu[open]').forEach((menu) => {
    if (menu !== except) menu.removeAttribute('open');
  });
}

function layout(content, current) {
  app.innerHTML = `
    <header class="topbar">
      <a class="logo" href="#market">РАДАР <span>РЫНКА УЦ</span></a>
      <nav><a class="${current === 'market' ? 'active' : ''}" href="#market">Рынок</a><a class="${current === 'kontur' ? 'active' : ''}" href="#kontur">Контур</a>${competitorMenu()}</nav>
    </header>
    <main>${content}</main>
    <footer>${current === 'market' ? 'Данные за январь–июнь 2026 · методика, ограничения и источники доступны для проверки' : 'MVP · срез 1П 2026 · факты, расчёты и аналитические выводы разделены'}</footer>`;
}

const section = (eyebrow, title, body, className = '') => `<section class="${className}"><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${body}</section>`;

const kpis = (items = []) => `<div class="kpi-grid">${items.map((item) => `<article class="kpi"><p>${esc(item.label)}</p><strong>${esc(item.value)}</strong>${item.note ? `<small>${esc(item.note)}</small>` : ''}</article>`).join('')}</div>`;

function conclusions(items = []) {
  if (!items.length) return '';
  return `<div class="conclusion-grid">${items.map((item) => `<article class="analysis-note conclusion"><h3>${esc(item.title)}</h3><p><b>Основание.</b> ${esc(item.fact)}</p><p><b>Значение.</b> ${esc(item.implication ?? item.meaning)}</p></article>`).join('')}</div>`;
}

function renderMarketOld() {
  const competitorCards = publishedCompetitors().map((item) => {
    const lead = item.conclusions?.[0];
    return `<a class="competitor-card" href="#competitor/${item.slug}"><span>Профиль конкурента</span><h3>${esc(item.shortName)}</h3><p>${esc(lead?.title ?? item.positioning.title)}</p><b>Открыть профиль →</b></a>`;
  }).join('');

  layout(`
    <section class="hero market-hero">
      <p class="eyebrow">Рынок квалифицированной электронной подписи · ${market.period}</p>
      <h1>Радар рынка УЦ</h1>
      <p class="lead">${esc(market.hero.fact)}</p>
      <div class="callout"><b>Что важно.</b> ${esc(market.hero.interpretation)}</div>
    </section>
    ${section('Ключевые показатели', 'Рынок в одном срезе', kpis(market.kpis))}
    ${section('Выводы для команды', 'Что означает текущий срез', conclusions(market.conclusions))}
    ${section('Структура рынка', 'Государственный и коммерческий сегменты', `<div class="contours">${market.contours.map((item) => `<article class="contour"><div><h3>${esc(item.label)}</h3><strong>${item.value.toLocaleString('ru-RU')} млн</strong><p>${esc(item.note)}</p></div><div class="bar"><i style="width:${item.share}%"></i></div><b>${String(item.share).replace('.', ',')}%</b></article>`).join('')}</div>`)}
    ${section('Карта игроков', 'Крупнейшие УЦ по выпуску КЭП', `<div class="table-wrap"><table><thead><tr><th>№</th><th>УЦ</th><th>Выпуск</th><th>Доля raw</th><th>г/г</th></tr></thead><tbody>${market.players.map((item) => `<tr><td>${item.rank}</td><td>${linkTo(item)}</td><td>${esc(item.issued)}</td><td>${esc(item.share)}</td><td class="${item.yoy.startsWith('+') ? 'positive' : ''}">${esc(item.yoy)}</td></tr>`).join('')}</tbody></table></div>`)}
    ${section('Конкуренты MVP', 'Шесть профилей для сравнения', `<div class="competitor-grid">${competitorCards}</div>`)}
    ${renderMarketMchd()}
    ${section('Что изменилось', 'Сигналы рынка', `<div class="signal-grid">${market.signals.map((signal, index) => `<article class="signal"><span>${String(index + 1).padStart(2, '0')}</span><p><b>Факт.</b> ${esc(signal.fact)}</p><p><b>Значение.</b> ${esc(signal.meaning)}</p></article>`).join('')}</div>`)}
    ${methodology()}`, 'market');
}

function mchdTable(items, title) {
  return `<article class="mchd-table"><h3>${esc(title)}</h3><table><tbody>${items.map((item, index) => `<tr><td><span>${index + 1}</span>${linkTo(item)}</td><td>${esc(item.value)}</td></tr>`).join('')}</tbody></table></article>`;
}

function renderMarketMchd() {
  return section('МЧД', 'Активность в реестре ФНС', `
    <p class="section-note">Срез: ${esc(market.mchd.asOf)}. ${esc(market.mchd.definition)}</p>
    <div class="mchd-summary"><p>Дополнительно через портал ФНС загружено</p><strong>${esc(market.mchd.portalFns)}</strong><span>МЧД</span></div>
    <div class="mchd-columns">${mchdTable(market.mchd.transferred, 'Передано на хранение')}${mchdTable(market.mchd.requested, 'Запрошено из реестра')}</div>`);
}

const infoTip = (content, label) => `<span class="info-tip" data-info-tip tabindex="0" role="button" aria-expanded="false" aria-label="${esc(label)}"><span aria-hidden="true">i</span><span role="tooltip">${content}</span></span>`;
const info = (text, label = 'Пояснение') => infoTip(esc(text), label);
const externalLink = (source) => `<a href="${esc(source.href)}"${source.href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${esc(source.label ?? source.name)}</a>`;
const embeddedSourceLink = (source) => `<a class="source-link" href="${esc(source.href)}" target="_blank" rel="noreferrer">${esc(source.text)}&nbsp;<span class="source-arrow">↗</span></a>`;
const infoWithEmbeddedSource = (item, label) => {
  const embedded = item.infoEmbedded ?? item;
  return infoTip(`${esc(embedded.before)}${embeddedSourceLink({ text: embedded.linkText, href: embedded.source.href })}${esc(embedded.after ?? '')}${(embedded.extraSources ?? []).map((source) => ` ${embeddedSourceLink(source)}${esc(source.after ?? '')}`).join('')}`, label);
};
const infoWithSource = (text, source, label = 'Пояснение') => infoTip(`${esc(text)} ${externalLink(source)}`, label);
const inlineInfo = (content, tooltip, className = '') => tooltip ? `<span class="info-inline${className ? ` ${className}` : ''}"><span>${content}</span>${tooltip}</span>` : content;
const textWithInfo = (text, tooltip, className = '') => {
  if (!tooltip) return esc(text);
  const words = String(text).trim().split(/\s+/);
  const lastWord = words.pop();
  return `${words.length ? `${esc(words.join(' '))} ` : ''}${inlineInfo(esc(lastWord), tooltip, className)}`;
};
const promoPriceWithInfo = (price, tooltip) => tooltip
  ? `<span class="promo-price-with-info">${esc(price)}${tooltip}</span>`
  : esc(price);

function formatVolumeChange(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1) return `${sign}${absolute.toFixed(3).replace('.', ',')} млн`;
  return `${sign}${Math.round(absolute * 1000).toLocaleString('ru-RU')} тыс.`;
}

function formatGrowth(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return '—';
  const value = (current / previous - 1) * 100;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1).replace('.', ',')}%`;
}

function getRankingRows(mode = 'all') {
  const slice = market.ranking.slices[mode];
  const items = market.ranking.players.filter((item) => {
    if (mode === 'all') return true;
    if (mode === 'commercial') return item.type === 'commercial';
    return item.type === 'state' || item.type === 'iit';
  });
  const otherTooltip = 'Состав группы «Другие УЦ» между периодами изменился. В январе–июне 2025 в нее входил АТЛАС-КАРТ с выпуском 505 тыс. сертификатов. К январю–июню 2026 его аккредитация завершилась, а тахографический поток был перенесен в Модум, который теперь показан отдельной строкой. Поэтому динамика «Других УЦ» отражает не только изменение выпуска, но и изменение состава группы.';
  const rows = items.map((item, index) => {
    const change = Number.isFinite(item.previous) ? item.volume - item.previous : null;
    return {
      rank: index + 1,
      name: item.name,
      volume: item.volume,
      display: item.display,
      share: item.volume / slice.volume,
      growth: item.growth,
      growthValue: Number.isFinite(item.previous) ? item.volume / item.previous - 1 : null,
      change,
      item
    };
  });
  if (slice.other) {
    const { other } = slice;
    rows.push({
      rank: other.rank,
      name: 'Другие УЦ',
      volume: other.volume,
      display: other.display,
      share: other.volume / slice.volume,
      growth: formatGrowth(other.volume, other.previous),
      growthValue: other.volume / other.previous - 1,
      change: other.volume - other.previous,
      other: true,
      tooltip: otherTooltip
    });
  }
  rows.push({
    rank: '',
    name: 'Итого',
    volume: slice.volume,
    display: `${slice.volume.toFixed(3).replace('.', ',')} млн`,
    share: 1,
    growth: formatGrowth(slice.volume, slice.previous),
    growthValue: slice.volume / slice.previous - 1,
    change: slice.volume - slice.previous,
    total: true
  });
  return { slice, rows };
}

function rankingDynamics(row) {
  if (!Number.isFinite(row.growthValue)) {
    return '<td class="ranking-dynamics"><span class="ranking-dynamics-grid"><span class="ranking-dynamics-percent">—</span><small class="ranking-dynamics-change">—</small></span></td>';
  }
  const isPositive = row.growth.startsWith('+');
  const isNegative = row.growth.startsWith('−');
  return `<td class="ranking-dynamics${isPositive ? ' positive' : isNegative ? ' negative' : ''}"><span class="ranking-dynamics-grid"><span class="ranking-dynamics-percent">${esc(row.growth)}</span><small class="ranking-dynamics-change">${esc(formatVolumeChange(row.change))}</small></span></td>`;
}

function renderRankingRows(mode = 'all') {
  const { rows } = getRankingRows(mode);
  const formatShare = (value, total) => total ? '100%' : `${(value * 100).toFixed(1).replace('.', ',')}%`;
  return rows.map((row) => {
    const itemName = row.item && mode === 'state' && row.item.type === 'iit'
      ? textWithInfo(row.name, info(row.item.stateInfo, 'Почему ИИТ в этом срезе'))
      : row.item ? linkTo(row.item) : row.tooltip ? textWithInfo(row.name, info(row.tooltip, 'Другие УЦ')) : esc(row.name);
    const volume = row.item
      ? textWithInfo(row.display, row.item.breakdown ? info(row.item.breakdown, 'Состав объема') : '')
      : esc(row.display);
    const classes = [row.item?.accent ? 'is-kontur' : '', row.other ? 'ranking-other' : '', row.total ? 'ranking-total' : ''].filter(Boolean).join(' ');
    return `<tr class="${classes}"><td>${esc(row.rank)}</td><td>${itemName}</td><td>${volume}</td><td>${formatShare(row.share, row.total)}</td>${rankingDynamics(row)}</tr>`;
  }).join('');
}

function renderRankingAnalysis(mode = activeRankingMode) {
  return renderRadarAnalysis(market.ranking.analysis?.[mode]);
}

function formatFinancialValue(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1000) return `${sign}${(absolute / 1000).toFixed(1).replace('.', ',')} млрд ₽`;
  return `${sign}${absolute.toFixed(1).replace('.', ',')} млн ₽`;
}

function formatFinancialTooltipValue(value, metricKey) {
  if (metricKey === 'revenue') {
    const sign = value < 0 ? '−' : '';
    const digits = (Math.abs(value) / 1000).toFixed(3).replace('.', ',');
    return `${sign}${digits} млрд ₽`;
  }
  return formatFinancialValue(value);
}

function formatFinancialPercent(value) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value * 100).toFixed(1).replace('.', ',')}%`;
}

function financialChange(values) {
  const previous = values[1];
  const current = values[2];
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return '—';
  if (previous >= 0 && current < 0) return 'Переход к убытку';
  if (previous < 0 && current < 0) return formatFinancialValue(current - previous);
  if (previous === 0) return '—';
  return formatFinancialPercent(current / previous - 1);
}

function financialCagr(values) {
  const start = values[0];
  const end = values[2];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) return '—';
  return formatFinancialPercent((end / start) ** 0.5 - 1);
}

function financialCagrLabel(values) {
  return financialCagr(values);
}

function formatFinancialChartValue(value, metricKey) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (metricKey === 'revenue') {
    return `${sign}${(absolute / 1000).toFixed(1).replace('.', ',')}`;
  }
  return `${sign}${absolute.toFixed(1).replace('.', ',')}`;
}

function financialChartPlayerName(player) {
  return player.name === 'Тензор / Saby' ? 'Тензор' : player.name;
}

function financialGroupTooltipContent(player, metricKey) {
  const years = ['2023', '2024', '2025'];
  const values = player.values.map((value, index) => `<li><span><i class="financial-year-${years[index]}"></i>${years[index]}</span><b>${Number.isFinite(value) ? esc(formatFinancialTooltipValue(value, metricKey)) : 'Нет данных'}</b></li>`).join('');
  const cagr = financialCagr(player.values);
  const cagrText = player.name === 'Росэлторг' && metricKey === 'revenue' ? 'Не рассчитан' : cagr === '—' ? 'Не рассчитан' : cagr;
  return `<strong>${esc(player.name)}</strong><p>${esc(metricKey === 'revenue' ? 'Выручка, млрд ₽' : 'Чистая прибыль, млн ₽')}</p><ul>${values}</ul><div><span>CAGR 2023–2025</span><b>${esc(cagrText)}</b></div>`;
}

function financialPlayerTooltip(player) {
  if (!player.accent || !player.infoLines?.length) return '';
  return `<span class="info-tip financial-kontur-tooltip" tabindex="0" aria-label="Финансовый периметр ${esc(player.name)}" data-financial-kontur-tooltip><span>i</span><span role="tooltip"><span class="tooltip-title">${esc(player.infoIntro)}</span>${player.infoLines.map((line) => `<a class="tooltip-link-line" href="${esc(line.href)}" target="_blank" rel="noreferrer">${esc(line.label)}</a>`).join('')}</span></span>`;
}

function financialPlayerName(player) {
  const name = player.source?.href
    ? `<a href="${esc(player.source.href)}" target="_blank" rel="noreferrer">${esc(player.name)}</a>`
    : esc(player.name);
  return `<span class="financial-player-name">${name}${financialPlayerTooltip(player)}</span>`;
}

function renderFinancialChart(metricKey = activeFinancialMetric) {
  const metric = market.financials.metrics[metricKey];
  const values = metric.players.flatMap((player) => player.values.filter(Number.isFinite));
  const observedPositiveMax = Math.max(...values.filter((value) => value > 0), 1);
  const positiveMax = observedPositiveMax * 1.12;
  const negativeMax = Math.max(...values.filter((value) => value < 0).map(Math.abs), 0);
  const hasNegative = negativeMax > 0;
  const chartHeight = 360;
  const positiveHeight = hasNegative ? Math.round(chartHeight * positiveMax / (positiveMax + negativeMax)) : chartHeight;
  const negativeHeight = hasNegative ? chartHeight - positiveHeight : 0;
  const chartStyle = `--financial-positive-height:${positiveHeight}px;--financial-negative-height:${negativeHeight}px;--financial-chart-height:${chartHeight}px;`;
  const years = ['2023', '2024', '2025'];
  const grid = [0, .25, .5, .75, 1].map((ratio, index) => `<i class="financial-grid-line${index === 0 ? ' is-zero' : ''}" style="bottom:${negativeHeight + positiveHeight * ratio}px"></i>`).join('');
  const players = metric.players.map((player, playerIndex) => {
    const barSizes = player.values.map((value) => {
      if (!Number.isFinite(value)) return 0;
      return value < 0 ? Math.abs(value) / negativeMax * negativeHeight : value / positiveMax * positiveHeight;
    });
    const bars = player.values.map((value, index) => {
      if (!Number.isFinite(value)) return `<div class="financial-bar is-placeholder" aria-hidden="true"></div>`;
      const isNegative = value < 0;
      const size = barSizes[index];
      const tooltip = `${player.name} · ${years[index]} · ${formatFinancialTooltipValue(value, metricKey)}`;
      return `<div class="financial-bar ${isNegative ? 'is-negative' : ''} financial-year-${years[index]}" style="--financial-bar-size:${size}px" tabindex="0" title="${esc(tooltip)}" aria-label="${esc(tooltip)}"><span>${esc(formatFinancialChartValue(value, metricKey))}</span><i></i></div>`;
    }).join('');
    const hoverHeight = Math.max(90, ...barSizes);
    const cagr = financialCagr(player.values);
    const cagrLabel = player.name === 'Росэлторг' && metricKey === 'revenue' ? '—*' : financialCagrLabel(player.values);
    return `<article class="financial-chart-player${player.accent ? ' is-kontur' : ''}" data-financial-player="${playerIndex}" tabindex="0" role="button" aria-expanded="false" aria-label="Финансовые показатели: ${esc(player.name)}"><div class="financial-bars"><span class="financial-hover-zone" data-financial-hover-zone aria-hidden="true" style="--financial-hover-height:${hoverHeight}px"></span>${bars}</div><h3>${financialPlayerName({ ...player, name: financialChartPlayerName(player) })}</h3><p class="financial-cagr${cagr.startsWith('+') ? ' is-positive' : ''}">${esc(cagrLabel)}</p></article>`;
  }).join('');
  const footnotes = metricKey === 'revenue' ? `<div class="financial-footnotes"><p>* Для Росэлторга CAGR за 2023–2025 годы не рассчитан: отсутствуют данные за 2025 год.</p><p>Источник: <a href="https://bo.nalog.gov.ru/" target="_blank" rel="noreferrer">ГИР БО ФНС России <span aria-hidden="true">↗</span></a></p></div>` : '';
  return `<div class="financial-chart-shell" data-financial-chart-shell data-financial-metric="${esc(metricKey)}"><div class="financial-chart-title">${esc(metric.chartTitle)}</div><div class="financial-chart-scroll"><div class="financial-chart" style="${chartStyle}--financial-player-count:${metric.players.length};"><div class="financial-chart-grid" aria-hidden="true">${grid}</div>${players}<div class="financial-legend" aria-label="Легенда годов"><span><i class="financial-year-2023"></i>2023</span><span><i class="financial-year-2024"></i>2024</span><span><i class="financial-year-2025"></i>2025</span><span class="financial-cagr-key">CAGR 2023–2025 — среднегодовой темп роста выручки</span></div></div></div><div class="financial-group-tooltip" data-financial-group-tooltip role="tooltip" hidden></div></div>${footnotes}`;
}

function financialExportChange(values) {
  const previous = values[1];
  const current = values[2];
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return '—';
  if (previous >= 0 && current < 0) return 'Переход к убытку';
  if (previous < 0 && current < 0) return `${current - previous} млн ₽`;
  if (previous === 0) return '—';
  return current / previous - 1;
}

function financialExportMeta(player) {
  if (player.legalEntity || player.inn) return { legalEntity: player.legalEntity ?? '', inn: player.inn ?? '' };
  const [legalEntity] = String(player.info ?? '').split('. ');
  const inn = String(player.info ?? '').match(/ИНН\s+(\d+)/)?.[1] ?? '';
  return { legalEntity, inn };
}

function downloadFinancials(metricKey = activeFinancialMetric) {
  const metric = market.financials.metrics[metricKey];
  downloadXlsx({
    filename: `Экономический_срез_${metric.label}_2023-2025.xlsx`,
    sheetName: metric.label,
    columns: [
      { key: 'name', label: 'Игрок', type: 'text', width: 24 },
      { key: 'legalEntity', label: 'Юридическое лицо / финансовый периметр', type: 'text', width: 50 },
      { key: 'inn', label: 'ИНН', type: 'text', width: 16 },
      { key: 'year2023', label: '2023', type: 'number', width: 16 },
      { key: 'year2024', label: '2024', type: 'number', width: 16 },
      { key: 'year2025', label: '2025', type: 'number', width: 16 },
      { key: 'change', label: 'Изменение 2025/2024', type: 'signedPercent', width: 24 },
      { key: 'cagr', label: 'CAGR 2023–2025', type: 'signedPercent', width: 19 },
      { key: 'source', label: 'Источник', type: 'text', width: 56 }
    ],
    rows: metric.players.map((player) => {
      const meta = financialExportMeta(player);
      return {
        name: player.name,
        legalEntity: meta.legalEntity,
        inn: meta.inn,
        year2023: Number.isFinite(player.values[0]) ? player.values[0] : '',
        year2024: Number.isFinite(player.values[1]) ? player.values[1] : '',
        year2025: Number.isFinite(player.values[2]) ? player.values[2] : '',
        change: financialExportChange(player.values),
        cagr: financialCagr(player.values) === '—' ? '' : (player.values[2] / player.values[0]) ** .5 - 1,
        source: player.sources?.map((source) => source.href).join('\n') || player.source?.href || '—'
      };
    })
  });
}

function renderFinancialAnalysis(metricKey = activeFinancialMetric) {
  return renderRadarAnalysis(market.financials.metrics[metricKey].analysis);
}

function renderFinancialSnapshot(metricKey = activeFinancialMetric) {
  return `${renderFinancialChart(metricKey)}${renderFinancialAnalysis(metricKey)}`;
}

function renderMchdRankingRow(item, index, maxValue, totalValue) {
  const volume = esc(item.value.toLocaleString('ru-RU'));
  const volumeMarkup = item.breakdown
    ? inlineInfo(volume, info(item.breakdown, 'Состав агрегированного показателя'))
    : volume;
  return `<div class="mchd-row ${item.accent ? 'is-kontur' : ''}"><span>${index + 1}</span><p>${linkTo(item, item.shortName)}</p><div><i style="width:${item.value / maxValue * 100}%"></i></div><b>${volumeMarkup}</b><strong class="mchd-share">${String((item.value / totalValue * 100).toFixed(1)).replace('.', ',')}%</strong></div>`;
}

function downloadRanking(mode = activeRankingMode) {
  const sliceLabels = { all: 'Все', commercial: 'Коммерческие', state: 'Государственные' };
  const { rows } = getRankingRows(mode);
  downloadXlsx({
    filename: `Рейтинг_УЦ_${sliceLabels[mode]}_Янв-июнь_2026.xlsx`,
    sheetName: 'Рейтинг УЦ',
    columns: [
      { key: 'rank', label: '№', type: 'number', width: 7 },
      { key: 'name', label: 'Игрок', type: 'text', width: 34 },
      { key: 'volume', label: 'Объем', type: 'number', width: 18 },
      { key: 'share', label: 'Доля', type: 'percent', width: 14 },
      { key: 'growth', label: 'Динамика, %', type: 'signedPercent', width: 17 },
      { key: 'change', label: 'Изменение объема', type: 'signedNumber', width: 23 }
    ],
    rows: rows.map((row) => ({
      rank: row.rank,
      name: row.name,
      volume: Math.round(row.volume * 1_000_000),
      share: row.share,
      growth: row.growthValue ?? '—',
      change: Number.isFinite(row.change) ? Math.round(row.change * 1_000_000) : '—',
      total: row.total
    }))
  });
}

const hasText = (value) => Boolean(String(value ?? '').trim());

function marketSignalMetadata(item) {
  if (hasText(item?.date)) return [item.date, item.status].filter(hasText).join(' · ');
  return item?.metadata ?? item?.status ?? '';
}

function hasMarketSignal(item) {
  const hasStructuredMetadata = hasText(item?.date) && hasText(item?.status);
  const hasLegacyMetadata = !hasText(item?.date) && hasText(marketSignalMetadata(item));
  return !item?.placeholder
    && (hasStructuredMetadata || hasLegacyMetadata)
    && hasText(item.title)
    && hasText(item.description)
    && hasText(item.source?.label)
    && hasText(item.source?.href)
    && Array.isArray(item.details)
    && item.details.length > 0;
}

function signalDetails(index) {
  const item = market.signals[index];
  if (!hasMarketSignal(item)) return '';
  const firstIsIntro = item.details[0].endsWith(':');
  const content = firstIsIntro
    ? `<p>${esc(item.details[0])}</p><ul>${item.details.slice(1, -1).map((line) => `<li>${esc(line)}</li>`).join('')}</ul><p>${esc(item.details.at(-1))}</p>`
    : item.details.map((line) => `<p>${esc(line)}</p>`).join('');
  return `<div class="signal-panel-content"><div><h3>${esc(item.title)}</h3>${content}${item.sourceStatus ? `<p><b>Статус источника:</b> ${esc(item.sourceStatus)}</p>` : ''}</div><div class="signal-panel-sources"><p>Основной источник</p>${externalLink(item.source)}<p>Дополнительный источник</p>${externalLink(item.additionalSource)}</div></div>`;
}

function renderSignalCard(item, index, group) {
  if (!hasMarketSignal(item)) return '';
  return `<article class="signal-card" data-signal-card="${index}"><p class="signal-status">${esc(marketSignalMetadata(item))}</p><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="signal-actions"><button class="inline-disclosure" type="button" data-signal-index="${index}" data-signal-group="${group}">Подробнее ↓</button>${externalLink(item.source)}</div></article>`;
}

function hasTeamConclusion(item) {
  const hasText = (value) => Boolean(String(value ?? '').trim());
  return !item?.placeholder && hasText(item.title) && hasText(item.fact) && hasText(item.implication ?? item.meaning);
}

function renderTeamConclusions(items = []) {
  const visibleItems = items.filter(hasTeamConclusion);
  if (!visibleItems.length) return '';
  return `<div class="team-conclusions">${visibleItems.map((item, index) => `<article class="team-card"><span>${String(index + 1).padStart(2, '0')}</span><h3>${esc(item.title)}</h3><p><b>Факт.</b> ${esc(item.fact)}</p><p><b>Значение.</b> ${esc(item.implication ?? item.meaning)}</p></article>`).join('')}</div>`;
}

function marketSignalRows(signals) {
  if (signals.length === 5) return [signals.slice(0, 3), signals.slice(3)];
  if (signals.length === 4) return [signals.slice(0, 2), signals.slice(2)];
  return signals.length ? [signals] : [];
}

function renderMarket() {
  activeRankingMode = 'all';
  activeFinancialMetric = 'revenue';
  const heroCards = market.hero.cards.map((card) => {
    const content = `<div><h2>${textWithInfo(card.title, card.info ? info(card.info) : '')}</h2>${card.subtitle ? `<p class="hero-card-subtitle">${esc(card.subtitle)}</p>` : ''}</div><div class="hero-card-metrics"><p><strong>${esc(card.volume)}</strong> <span>${esc(card.unit)}</span></p><b>${esc(card.growth)}</b></div>${card.share ? `<p class="hero-card-share">${esc(card.share)}</p>` : ''}${card.shares ? `<ul>${card.shares.map((share) => `<li>${esc(share)}</li>`).join('')}</ul>` : ''}`;
    return card.href
      ? `<a class="hero-card ${esc(card.id)}" href="${esc(card.href)}">${content}</a>`
      : `<article class="hero-card ${esc(card.id)}">${content}</article>`;
  }).join('');

  const structureBars = ['previous', 'current'].map((period) => `<article class="market-share-row"><div class="share-period"><b>${esc(market.period[period])}</b></div><div class="share-bar" aria-label="Структура рынка за ${esc(market.period[period])}">${market.structure.segments.map((segment) => `<div class="segment ${esc(segment.id)}" style="width:${segment[period].share}%"><span>${String(segment[period].share).replace('.', ',')}%</span></div>`).join('')}</div><div class="share-legend">${market.structure.segments.map((segment) => `<p><i class="${esc(segment.id)}"></i><span>${textWithInfo(segment.name, segment.info ? info(segment.info) : '')}</span><b>${esc(segment[period].volume)}${period === 'current' ? ` · ${esc(segment.growth)}` : ''}</b>${period === 'current' ? `<em>${esc(segment.change)}</em>` : ''}</p>`).join('')}</div></article>`).join('');

  const growthMax = Math.max(...market.konturPosition.growth.map((item) => item.value));
  const growth = `<div class="growth-chart">${market.konturPosition.growth.map((item) => `<div class="growth-row ${esc(item.id)}"><p>${esc(item.label)}</p><div><i style="width:${item.value / growthMax * 100}%"></i></div><b>${esc(item.display)}</b></div>`).join('')}</div>`;
  const shares = `<div class="share-cards">${market.konturPosition.shares.map((item) => `<article><p>${esc(item.title)}</p><strong>${esc(item.values)}</strong><span>${esc(item.delta)}</span></article>`).join('')}</div>`;

  const comparisonPeriod = 'Сравнение: Янв–июнь 2025 → Янв–июнь 2026';
  const ranking = `<p class="market-period ranking-period">${comparisonPeriod}</p><div class="ranking-head"><div class="ranking-tabs" role="group" aria-label="Срез рейтинга"><button class="active" type="button" data-ranking="all">Все</button><button type="button" data-ranking="commercial">Коммерческие</button><button type="button" data-ranking="state">Государственные</button></div><div class="ranking-actions"><div class="ranking-meta">${inlineInfo(`<b data-ranking-top10>${esc(market.ranking.slices.all.meta)}</b>`, info(market.ranking.info, 'Как читать рейтинг'))}</div><button class="ranking-download" type="button" data-ranking-download>Скачать XLSX ↓</button></div></div><div class="ranking-table"><table><thead><tr><th>№</th><th>Игрок</th><th>Объем</th><th>Доля</th><th>Динамика</th></tr></thead><tbody data-ranking-body>${renderRankingRows()}</tbody></table></div><div data-ranking-analysis>${renderRankingAnalysis('all')}</div>`;

  const financials = `<div class="financial-meta-row"><p class="market-period financial-period">${esc(market.financials.summaryLine)}</p><button class="ranking-download" type="button" data-financial-download>Скачать XLSX ↓</button></div><div data-financial-snapshot>${renderFinancialSnapshot('revenue')}</div>`;

  const mchdMax = market.mchd.transferred[0].value;
  const mchdTotal = market.mchd.transferred.reduce((sum, item) => sum + item.value, market.mchd.portalFnsValue);
  const mchd = `<p class="market-period">Срез на июнь 2026</p><p class="section-note">${esc(market.mchd.intro)}</p><div class="mchd-summary-v2"><article><p>Контур: передано на хранение</p><strong>${esc(market.mchd.konturTransferred)} МЧД</strong><small>Суммарно по узлам СКБ Контур и Сертум-Про.</small></article><article><p>Запрошено из реестра</p><strong>${esc(market.mchd.konturRequested)} МЧД</strong></article></div><div class="mchd-bars"><div class="mchd-row mchd-header"><span></span><p>Узел</p><div></div><b>Передано</b><strong>Доля*</strong></div>${market.mchd.transferred.map((item, index) => renderMchdRankingRow(item, index, mchdMax, mchdTotal)).join('')}</div>${renderRadarAnalysis(market.mchd.conclusion)}<p class="mchd-footnote">* Доля рассчитана от общего объема ${mchdTotal.toLocaleString('ru-RU')} МЧД: сумма объемов узлов, вошедших в рейтинг, и ${esc(market.mchd.portalFns)} МЧД, отдельно загруженных через портал ФНС.</p>`;

  const visibleSignals = market.signals
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => hasMarketSignal(item));
  const signals = marketSignalRows(visibleSignals).map((row, rowIndex) => {
    const rowClass = row.length === 3 ? 'signal-row-three' : row.length === 2 ? 'signal-row-two' : 'signal-row-one';
    const group = `market-${rowIndex}`;
    return `<div class="signal-row ${rowClass} market-signal-row">${row.map(({ item, index }) => renderSignalCard(item, index, group)).join('')}</div><div class="signal-panel" data-signal-panel="${group}" hidden></div>`;
  }).join('');

  const teamConclusions = renderTeamConclusions(market.conclusions);

  const demographics = `<details class="fold-section"><summary><span><span class="eyebrow">ДЕМОГРАФИЯ ПОТЕНЦИАЛЬНОГО СПРОСА</span><strong>Как меняется потенциальная клиентская база</strong></span><i>Открыть ↓</i></summary><div class="fold-content"><p class="section-note">${esc(market.demographics.intro)}</p><div class="demographics-v2">${market.demographics.indicators.map((item) => `<article><h3>${esc(item.name)}</h3><strong>${esc(item.current)}</strong><span class="trend-change ${item.change.startsWith('+') ? 'positive' : 'negative'}">${esc(item.change)} за весь период</span><ol>${item.points.map((point) => `<li><time>${esc(point.date)}</time><b>${esc(point.value)}</b></li>`).join('')}</ol><p>${externalLink(item.source)}</p></article>`).join('')}</div>${renderRadarAnalysis(market.demographics.conclusion)}<p class="method-note">${esc(market.demographics.caveat)}</p></div></details>`;

  const methodology = renderCompactMethodology(market.methodology);

  layout(`<section class="hero market-hero-v2"><div class="market-hero-copy"><p class="eyebrow">${esc(market.hero.eyebrow)}</p><h1>${esc(market.hero.title)}</h1><p class="lead">${esc(market.hero.text)}</p><div class="hero-conclusion"><b>${esc(market.hero.conclusion)}</b></div></div><div class="hero-cascade">${heroCards}</div></section>
    ${section('СТРУКТУРА РЫНКА', 'Какие сегменты обеспечили рост рынка', `<div class="structure-visual">${structureBars}</div>${renderRadarAnalysis(market.structure.conclusion)}`, 'market-section')}
    ${section('КОНТУР НА РЫНКЕ', 'Динамика выпуска и доли', `<p class="market-period">${comparisonPeriod}</p>${growth}${shares}${renderRadarAnalysis(market.konturPosition.conclusion)}`, 'market-section')}
    ${section('ИГРОКИ РЫНКА', 'Как меняется рынок', ranking, 'market-section ranking-section')}
    ${section('ЭКОНОМИЧЕСКИЙ СРЕЗ', 'Как меняется выручка игроков', financials, 'market-section financial-section')}
    ${section('МЧД', 'Где сосредоточена активность инфраструктуры МЧД', mchd, 'market-section mchd-section')}
    <section class="market-section signals-section"><div class="section-heading"><div><p class="eyebrow">СИГНАЛЫ РЫНКА</p><h2>Что меняется в регуляторике и у конкурентов</h2></div><p>Актуально на ${esc(market.period.updatedAt)}</p></div>${signals}</section>
    ${teamConclusions ? section('ВЫВОДЫ ДЛЯ КОМАНДЫ', 'Что учитывать в работе с рынком', teamConclusions, 'market-section') : ''}
    <section class="collapsible-section">${demographics}</section>
    <section class="collapsible-section">${methodology}</section>`, 'market');
}

function renderPositioning(competitor) {
  const data = competitor.positioning;
  return section('Позиционирование', data.title, `
    <p class="section-note lead-small">${esc(data.summary)}</p>
    <div class="callout"><b>Ценностное предложение.</b> ${esc(data.value)}</div>
    <div class="three-column">
      <article><h3>Целевые сегменты</h3><ul>${data.segments.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
      <article><h3>Заявленные преимущества</h3><ul>${data.advantages.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
      <article><h3>Доказательства масштаба</h3><ul>${data.proofs.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
    </div>`);
}

function renderOffers(competitor) {
  if (competitor.productsV2) return renderProductsV2(competitor, 'competitor-zone competitor-zone-products');
  if (!competitor.offers?.length) return '';
  return section('Продукты и цены', `Предложения ${competitor.shortName}`, `
    <div class="offer-grid">${competitor.offers.map((offer) => `<article><p>${esc(offer.name)}</p><strong>${esc(offer.price)}</strong>${offer.note ? `<small>${esc(offer.note)}</small>` : ''}</article>`).join('')}</div>
    <div class="commercial-strip"><p>${esc(competitor.commercial.pricePolicy)}</p><p>${esc(competitor.commercial.promotion)}</p><p><b>Ограничение сравнения.</b> ${esc(competitor.commercial.caveat)}</p></div>`);
}

function renderTariffPanel(offer, key) {
  const rows = offer.tariffs.map((tariff) => `<tr${tariff.comparisonId ? ` data-product-tariff="${esc(tariff.comparisonId)}"` : ''}><td>${esc(tariff.name)}</td><td>${esc(tariff.price)}</td><td>${esc((tariff.includes ?? []).join(' · '))}</td></tr>`).join('');
  return `<div class="product-detail-panel" data-product-panel="${key}" hidden>
    <div class="product-detail-head"><h4>${esc(offer.role ?? offer.title)}</h4></div>
    <div class="table-wrap product-tariff-table"><table><thead><tr><th>${esc(offer.detailLabel ?? 'Тариф')}</th><th>Цена</th><th>Состав и отличия</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

function formatAddonCount(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? 'позиций' : last === 1 ? 'позиция' : last >= 2 && last <= 4 ? 'позиции' : 'позиций';
  return `${count} ${word}`;
}

function renderAddonPrice(item) {
  const tooltip = !item.priceInfo
    ? ''
    : typeof item.priceInfo === 'string'
      ? info(item.priceInfo, `Уточнение цены «${item.title}»`)
      : infoWithSource(item.priceInfo.text, item.priceInfo.source, `Уточнение цены «${item.title}»`);
  return inlineInfo(esc(item.price), tooltip);
}

function renderProductsV2(competitor, className = '') {
  const data = competitor.productsV2;
  const baseOffers = data.baseOffers ?? [];
  const baseClass = `product-card-grid product-card-grid-${Math.min(baseOffers.length, 3)}`;
  const base = baseOffers.length ? `
    <h3 class="competitor-subheading product-subheading">${textWithInfo('Базовые КЭП', data.baseNoteEmbedded ? infoWithEmbeddedSource(data.baseNoteEmbedded, 'Применимость прейскуранта') : info(data.baseNote, 'Методика цены'))}</h3>
    <div class="${baseClass}">${baseOffers.map((offer, index) => {
      const roleKey = offer.comparisonId?.replace(/^kep-/, '') ?? String(index);
      const key = `base-${competitor.slug}-${roleKey}`;
      const hasDetails = offer.tariffs?.length > 0;
      return `<article class="product-card" data-product-card="${key}" data-base-role="${esc(roleKey)}"><h4>${esc(offer.role)}</h4><strong>${esc(offer.price)}</strong><div class="product-card-actions"><span>${esc(offer.meta ?? '')}</span>${hasDetails ? `<button class="secondary-action inline-disclosure" type="button" data-product-index="${key}">Подробнее ↓</button>` : ''}</div></article>`;
    }).join('')}</div>${baseOffers.map((offer, index) => {
      const roleKey = offer.comparisonId?.replace(/^kep-/, '') ?? String(index);
      return offer.tariffs?.length ? renderTariffPanel(offer, `base-${competitor.slug}-${roleKey}`) : '';
    }).join('')}` : '';
  const other = data.otherOffers?.length ? `
    <h3 class="competitor-subheading product-subheading">Другие продукты и решения</h3>
    <div class="product-card-grid product-card-grid-${Math.min(data.otherOffers.length, 3)}">${data.otherOffers.map((offer, index) => {
      const key = `other-${index}`;
      const hasDetails = offer.tariffs?.length > 0;
      const [costLabel, ...costValue] = offer.price.split(':');
      return `<article class="product-card product-card-secondary" data-product-card="${key}"${offer.comparisonId ? ` data-product-offer="${esc(offer.comparisonId)}"` : ''}><h4>${esc(offer.title)}</h4><p class="product-cost"><span>${esc(`${costLabel}:`)}</span> <strong>${esc(costValue.join(':').trim())}</strong></p><p class="product-description">${esc(offer.description)}</p><div class="product-card-actions"><span>${esc(offer.meta ?? '')}</span>${hasDetails ? `<button class="secondary-action inline-disclosure" type="button" data-product-index="${key}">Подробнее ↓</button>` : ''}</div></article>`;
    }).join('')}</div>${data.otherOffers.map((offer, index) => offer.tariffs?.length ? renderTariffPanel(offer, `other-${index}`) : '').join('')}` : '';
  const addonsKey = `${competitor.slug}-addons`;
  const addonsSummary = data.addons?.length ? `${formatAddonCount(data.addons.length)}${data.addonsSummary ? ` · ${data.addonsSummary}` : ''}` : '';
  const addonsPositionTooltip = data.addonsPositionInfo
    ? infoWithEmbeddedSource(data.addonsPositionInfo, 'Источники и применимость цен')
    : '';
  const addons = data.addons?.length ? `
    <div class="product-addons"><h3 class="competitor-subheading product-subheading">${textWithInfo(data.addonsTitle ?? 'Дополнения к КЭП', data.addonsInfo ? infoWithEmbeddedSource(data.addonsInfo, 'Условия стоимости носителей') : '')}</h3>
      <div class="product-addons-summary"><p>${esc(addonsSummary)}</p><button class="secondary-action inline-disclosure" type="button" data-product-addons-toggle="${esc(addonsKey)}">Подробнее ↓</button></div>
      <div class="table-wrap product-addon-table product-addon-panel" data-product-addons-panel="${esc(addonsKey)}" hidden><table><thead><tr><th>${textWithInfo('Позиция', addonsPositionTooltip)}</th><th>Цена</th><th>Условие</th></tr></thead><tbody>${data.addons.map((item) => `<tr><td>${textWithInfo(item.title, addonsPositionTooltip ? '' : item.source ? infoWithSource('Стоимость и условия позиции опубликованы на официальной странице.', item.source, `Источник «${item.title}»`) : '')}</td><td>${renderAddonPrice(item)}</td><td>${esc(item.condition)}</td></tr>`).join('')}</tbody></table>${data.addonsTableNote ? `<p class="product-addon-note">${esc(data.addonsTableNote)}</p>` : ''}</div>
    </div>` : '';
  const promotions = data.promotions?.length ? `
    <h3 class="competitor-subheading product-subheading">Акции и специальные предложения</h3>
    <div class="promo-grid promo-grid-${Math.min(data.promotions.length, 3)}">${data.promotions.map((promo) => `<article><span>${esc(promo.label)}</span><h4>${esc(promo.title)}</h4><strong>${promoPriceWithInfo(promo.value, promo.valueInfo ? infoWithEmbeddedSource(promo.valueInfo, `Пояснение цены «${promo.title}»`) : '')}</strong><p>${esc(promo.description)}</p>${promo.note ? `<p class="promo-note">${esc(promo.note)}</p>` : ''}</article>`).join('')}</div>` : data.promotionsEmptyNote ? `
    <h3 class="competitor-subheading product-subheading">Акции и специальные предложения</h3>
    <div class="product-empty-state">${esc(data.promotionsEmptyNote)}</div>` : '';
  const analysis = renderRadarAnalysis(data.analysis);
  return section('ПРОДУКТЫ И ЦЕНЫ', 'Что продает и как упаковывает', `${base}${other}${addons}${promotions}${analysis}`, className);
}

function renderSales(competitor) {
  if (competitor.salesV2) return renderSalesV2(competitor);
  const sales = competitor.sales;
  if (!sales) return '';
  return section('Продажи и каналы', 'Как устроена покупка', `
    <div class="facts">
      <article><p>Самостоятельность покупки</p><strong>${esc(sales.purchase)}</strong></article>
      <article><p>Оплата</p><strong>${esc(sales.payment)}</strong></article>
      <article><p>Участие менеджера</p><strong>${esc(sales.manager)}</strong></article>
      <article><p>Очный этап</p><strong>${esc(sales.visit)}</strong></article>
      <article><p>Партнёрские продажи</p><strong>${esc(sales.partners)}</strong></article>
      <article><p>Продление</p><strong>${esc(sales.renewal)}</strong></article>
    </div>
    <div class="callout"><b>Итог по пути.</b> ${esc(sales.summary)}</div>`);
}

function renderSalesV2(competitor) {
  const data = competitor.salesV2;
  const purchaseModel = data.purchaseModel ?? [];
  const purchaseRows = purchaseModel.length
    ? ['Первичный выпуск', 'Продление', 'Оплата'].map((label) => {
      const item = purchaseModel.find((entry) => entry.label === label);
      return item
        ? `<article><p>${esc(item.label)}</p>${item.value ? `<strong>${esc(item.value)}</strong>` : `<small>Не раскрыто в изученных открытых источниках.</small>`}${item.note ? `<small>${esc(item.note)}</small>` : ''}</article>`
        : `<article class="sales-empty-row"><p>${esc(label)}</p><small>Не раскрыто в изученных открытых источниках.</small></article>`;
    }).join('')
    : '<p class="sales-empty">В изученных открытых источниках порядок покупки не раскрыт.</p>';
  const channels = data.channels?.length
    ? `<div class="sales-channels"><p>Каналы продаж</p><strong>${esc(data.channels.join(' · '))}</strong></div>`
    : '<div class="sales-channels sales-empty"><p>Каналы продаж</p><span>В изученных открытых источниках каналы продаж не раскрыты.</span></div>';
  const partner = data.partnerModel
    ? `<article class="sales-partner"><p>${esc(data.partnerModel.label)}</p>${data.partnerModel.value ? `<strong>${esc(data.partnerModel.value)}</strong>` : '<small>Не раскрыто в изученных открытых источниках.</small>'}${data.partnerModel.note ? `<small>${esc(data.partnerModel.note)}</small>` : ''}</article>`
    : '<article class="sales-partner sales-empty-row"><p>Партнерская модель</p><small>Не раскрыта в изученных открытых источниках.</small></article>';
  return section('ПРОДАЖИ И КАНАЛЫ', 'Как устроены покупка и дистрибуция', `
    <div class="sales-module">
      <div class="sales-column"><h3 class="sales-column-heading">КАК ПОКУПАЮТ</h3><div class="sales-rows">${purchaseRows}</div></div>
      <div class="sales-column"><h3 class="sales-column-heading">КАК ПРОДАЮТ</h3>${channels}${partner}</div>
    </div>
    ${renderRadarAnalysis(data.analysis)}`);
}

function renderJourney(competitor) {
  if (competitor.journeyV2) return renderJourneyV2(competitor);
  if (!competitor.journey?.length) return '';
  return section('Клиентский путь', 'От обращения до выпуска', `<ol class="journey">${competitor.journey.map((step) => `<li><span></span><p>${esc(step)}</p></li>`).join('')}</ol>`);
}

function renderJourneyStage(stage, index) {
  const isUnchecked = stage.status !== 'checked';
  const hasDetails = !isUnchecked && stage.details?.length;
  return `<article class="journey-stage ${isUnchecked ? 'is-unchecked' : ''}" data-journey-card="${index}">
    <span>${String(index + 1).padStart(2, '0')}</span>
    <h3>${esc(stage.title)}</h3>
    <p>${esc(isUnchecked ? 'Не проверено' : stage.summary)}</p>
    ${stage.metric && !isUnchecked ? `<strong>${esc(stage.metric)}</strong>` : ''}
    ${hasDetails ? `<button class="secondary-action inline-disclosure" type="button" data-journey-index="${index}">Подробнее ↓</button>` : ''}
  </article>`;
}

function renderJourneyPanel(stage, index) {
  if (stage.status !== 'checked' || !stage.details?.length) return '';
  return `<div class="journey-detail-panel" data-journey-panel="${index}" hidden>
    <div class="journey-detail-content">
      <div><h4>${esc(stage.title)}</h4><ul>${stage.details.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><p>Источник: контрольная покупка</p></div>
    </div>
  </div>`;
}

function renderJourneyV2(competitor, className = '') {
  const data = competitor.journeyV2;
  const researchContext = data.researchContext ?? {};
  const status = researchContext.status;
  const statusLabel = researchContext.statusLabel ?? status;
  const noResearch = status === 'Контрольная покупка не проводилась';
  const contextStatusClass = researchContext.statusTone ? `status-${researchContext.statusTone}` : status === 'Полный путь проверен' ? 'status-active' : status === 'Частичная проверка' ? 'status-conditional' : 'status-neutral';
  const contextParts = noResearch
    ? [researchContext.scenario, researchContext.period]
    : ['Контрольная покупка', researchContext.scenario, researchContext.period];
  const defaultContextLabel = contextParts.filter(Boolean).join(' · ');
  const contextLabel = researchContext.contextLabel
    ?? (noResearch && !defaultContextLabel ? 'Консультация и контрольная покупка не проводились' : defaultContextLabel);
  const context = `<div class="journey-context"><p>${esc(contextLabel)}</p><span class="${contextStatusClass}">${esc(statusLabel)}</span></div>`;
  const stagesList = data.journeyStages ?? [];
  const stages = !noResearch && stagesList.length ? `<div class="journey-stage-grid">${stagesList.map(renderJourneyStage).join('')}</div>` : '';
  const panels = noResearch ? '' : stagesList.map(renderJourneyPanel).join('');
  const observationCount = Math.max(1, Math.min(data.journeyObservations?.length ?? 0, 3));
  const observations = !noResearch && data.journeyObservations?.length ? `<h3 class="competitor-subheading journey-observations-heading">Особенности пути</h3><div class="journey-observations journey-observations-${observationCount}">${data.journeyObservations.map((item) => `<article><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></article>`).join('')}</div>` : '';
  const analysis = !noResearch ? renderRadarAnalysis(data.analysis) : '';
  return section('КЛИЕНТСКИЙ ПУТЬ', 'От обращения до выпуска', `${context}${stages}${panels}${observations}${analysis}`, className);
}

function renderProduct(competitor) {
  if (competitor.functionalityV2) return renderFunctionalityV2(competitor, 'competitor-zone competitor-zone-functionality');
  if (!competitor.product) return '';
  return section('Продукт', 'Возможности и ограничения', `<div class="three-column product-columns">
    <article><h3>Подтверждённые возможности</h3><ul>${competitor.product.capabilities.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
    <article><h3>Отличия</h3><ul>${competitor.product.differentiators.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
    <article class="limitations"><h3>Ограничения</h3><ul>${competitor.product.limitations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>
  </div>`);
}

const functionalityStatus = {
  available: 'Есть',
  conditional: 'Есть с условиями',
  unconfirmed: 'Не подтверждено'
};

function renderFunctionRow(item, fallbackTitle) {
  const title = item.title ?? fallbackTitle ?? item.value;
  const description = item.solutionName ? `<strong class="function-solution-name">${esc(item.solutionName)}</strong> — ${esc(item.description)}` : esc(item.description);
  const statusClass = item.status === 'available' ? 'status-active' : item.status === 'conditional' ? 'status-conditional' : 'status-neutral';
  return `<article class="function-row">
    <div><h4>${textWithInfo(title, item.tooltip ? info(item.tooltip, title) : '')}</h4><span class="function-status ${statusClass}">${esc(functionalityStatus[item.status] ?? item.status)}</span></div>
    ${item.value && item.value !== title && !item.solutionName ? `<strong>${esc(item.value)}</strong>` : ''}
    <p>${description}</p>
    ${item.note ? `<small>${esc(item.note)}</small>` : ''}
  </article>`;
}

function renderFunctionalityV2(competitor, className = '') {
  const data = competitor.functionalityV2;
  const userRows = [
    renderFunctionRow(data.user.personalAccount, 'Личный кабинет'),
    renderFunctionRow(data.user.remoteScenarios, 'Дистанционные сценарии'),
    renderFunctionRow(data.user.mobileSignature, 'Мобильная ЭП')
  ].join('');
  const orgRows = [
    renderFunctionRow(data.organization.certificateManagement, 'Массовый выпуск и управление сертификатами'),
    renderFunctionRow(data.organization.apiIntegrations, 'API и интеграции'),
    renderFunctionRow(data.organization.mchd, 'МЧД и полномочия')
  ].join('');
  const focus = data.focus ? `<div class="function-focus"><span>ФУНКЦИОНАЛЬНЫЙ ФОКУС</span><p>${esc(data.focus)}</p></div>` : '';
  const claimed = data.claimedVsChecked ? `<div class="analysis-note function-claimed"><span>ЗАЯВЛЕНО VS ПРОВЕРЕНО</span><b>${esc(data.claimedVsChecked)}</b></div>` : '';
  return section('ФУНКЦИОНАЛЬНОСТЬ', 'Что умеет продукт и корпоративный контур', `
    <div class="function-module">
      <div class="function-column"><h3>ДЛЯ ПОЛЬЗОВАТЕЛЯ</h3>${userRows}</div>
      <div class="function-column"><h3>ДЛЯ ОРГАНИЗАЦИЙ</h3>${orgRows}</div>
    </div>
    ${focus}${claimed}`, className);
}

function renderSupport(competitor) {
  if (!competitor.support) return '';
  const support = competitor.support;
  return section('Поддержка и сопровождение', 'Каналы, скорость и знания', `<div class="facts support-facts">
    <article><p>Каналы</p><strong>${esc(support.channels)}</strong></article>
    <article><p>Скорость ответа</p><strong>${esc(support.response)}</strong></article>
    <article><p>Автоматизация</p><strong>${esc(support.automation)}</strong></article>
    <article><p>Инструкции</p><strong>${esc(support.knowledge)}</strong></article>
  </div><div class="callout muted-callout"><b>Условие.</b> ${esc(support.limitation)}</div>`);
}

function renderReputation(competitor) {
  if (competitor.presenceV2) return renderPresenceV2(competitor, 'competitor-zone competitor-zone-presence');
  if (!competitor.reputation) return '';
  return section('Репутация', 'Клиентские оценки и повторяющиеся темы', `<div class="reputation"><article><p>Диапазон оценки</p><strong>${esc(competitor.reputation.rating)}</strong><small>${esc(competitor.reputation.note)}</small></article><article><p>${esc(competitor.reputation.topics)}</p></article></div>`);
}

function renderPresenceV2(competitor, className = '') {
  const data = competitor.presenceV2 ?? {};
  const reputation = data.reputation ?? {};
  const renderEvent = (item) => {
    const tags = item.tags?.length ? item.tags.slice(0, 2) : (item.status ? [item.status] : []);
    return `<article class="presence-event"><div><time>${esc(item.date)}</time>${tags.map((tag) => `<span class="status-conditional">${esc(tag)}</span>`).join('')}</div><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p>${item.source ? `<a class="presence-event-source" href="${esc(item.source.href)}" target="_blank" rel="noreferrer">${esc(item.source.label ?? 'Источник')} ↗</a>` : ''}</article>`;
  };
  const renderExpert = (item) => `<article><strong>${esc(item.name)}</strong><p>${esc(item.position)}</p></article>`;
  const asOf = data.asOf ? new Date(`${data.asOf}T00:00:00`) : new Date();
  asOf.setHours(0, 0, 0, 0);
  const twelveMonthsAgo = new Date(asOf);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const eventDate = (item) => {
    if (!item.eventDate) return null;
    const value = /^\d{4}-\d{2}$/.test(item.eventDate) ? `${item.eventDate}-01` : item.eventDate;
    return new Date(`${value}T00:00:00`);
  };
  const eventItems = (data.events ?? [])
    .filter((item) => {
      const date = eventDate(item);
      return date && !Number.isNaN(date.getTime()) && date >= twelveMonthsAgo;
    })
    .slice()
    .sort((a, b) => {
      const aDate = eventDate(a);
      const bDate = eventDate(b);
      const aFuture = aDate >= asOf;
      const bFuture = bDate >= asOf;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return aFuture ? aDate - bDate : bDate - aDate;
    });
  const events = eventItems.map(renderEvent).join('');
  const expertItems = (data.publicExperts ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const experts = expertItems.map(renderExpert).join('');
  const expertCount = Math.max(1, Math.min(expertItems.length, 4));
  const themeItems = reputation.complaintThemes?.slice(0, 4) ?? [];
  const themes = themeItems.map((item) => `<article><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></article>`).join('');
  const complaintMessages = {
    none: 'В изученных отзывах жалобы по электронной подписи не выявлены.',
    unresearched: 'Отзывы по электронной подписи не исследованы.'
  };
  const complaintState = reputation.complaintsState ?? (themeItems.length ? 'identified' : 'unresearched');
  const visibleThemes = complaintState === 'identified' ? themes : '';
  const complaintMessage = visibleThemes ? '' : complaintMessages[complaintState] ?? complaintMessages.unresearched;
  const complaints = `<h3>ТЕМЫ ЖАЛОБ</h3><div class="presence-complaints${complaintMessage ? ' presence-complaints-empty' : ''}">${visibleThemes || `<p>${esc(complaintMessage)}</p>`}</div>`;
  const eventContent = events || '<p class="presence-empty">За последние 12 месяцев в изученных открытых источниках подтверждённых профильных мероприятий не найдено.</p>';
  const rating = reputation.rating && reputation.ratingsCount
    ? `<div class="presence-rating-panel"><p class="presence-rating-label">Общий рейтинг центров</p><div class="presence-rating"><strong>${textWithInfo(reputation.rating, reputation.ratingTooltip ? info(reputation.ratingTooltip, 'Как рассчитана оценка') : '')}</strong><p>${esc(reputation.ratingsCount)}</p></div></div>`
    : '<p class="presence-empty">Недостаточно подтверждённых данных для расчёта общего рейтинга центров.</p>';
  const expertContent = experts || '<p class="presence-expert-empty">В изученных открытых источниках профильные публичные представители не подтверждены.</p>';
  const expertBlock = `<div class="presence-expert-panel"><h3>ПУБЛИЧНЫЕ ПРЕДСТАВИТЕЛИ</h3>${experts ? `<div class="presence-experts presence-experts-${expertCount}">${experts}</div>` : expertContent}</div>`;
  return section('ПРИСУТСТВИЕ И ДОВЕРИЕ', 'Публичные эксперты и клиентская репутация', `
    <div class="presence-module">
      <div class="presence-column"><h3>ПРОФЕССИОНАЛЬНОЕ ПРИСУТСТВИЕ</h3>${eventContent}</div>
      <div class="presence-column"><h3>КЛИЕНТСКАЯ РЕПУТАЦИЯ</h3>${rating}${complaints}</div>
    </div>
    ${expertBlock}
    ${renderRadarAnalysis(data.analysis, 'presence-analysis')}`, className);
}

function renderCompetitorMchd(competitor) {
  if (!competitor.mchd) return '';
  const cards = [
    competitor.mchd.transferred && { label: 'Передано на хранение', value: competitor.mchd.transferred },
    competitor.mchd.requested && { label: 'Запрошено из реестра', value: competitor.mchd.requested }
  ].filter(Boolean);
  return section('МЧД', 'Активность в реестре ФНС', `<p class="section-note">Срез: ${esc(competitor.mchd.asOf)}. Показатели отражают инфраструктурную активность, а не рыночную долю.</p>${kpis(cards)}`);
}

function renderPositioningV2(competitor) {
  const data = competitor.positioningV2;
  if (!data) return renderPositioning(competitor);
  const differentiation = data.value.differentiation.replace(/^Отстройка:\s*/i, '').replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase('ru-RU'));
  // The four base segments keep their fixed order. Explicitly promoted
  // additional buyer groups are appended to the same visual matrix so that a
  // page has one coherent answer to “who is this offer for?”.
  const segmentsData = [...data.segments, ...(data.additionalSegments ?? [])];
  const segmentCount = Math.max(1, segmentsData.length);
  const segmentLayout = segmentCount >= 5
    ? `positioning-segments-balanced positioning-segments-remainder-${segmentCount % 3}`
    : `positioning-segments-${segmentCount}`;
  const scenarioCount = data.scenarios?.length ?? 0;
  const scenarioLayout = scenarioCount >= 5
    ? `positioning-scenarios-balanced positioning-scenarios-remainder-${scenarioCount % 3}`
    : `positioning-scenarios-${Math.max(1, scenarioCount)}`;
  const segments = segmentsData.map((item) => `<article><h4>${esc(item.title)}</h4><p>${esc(item.text)}${item.note ? ` ${esc(item.note)}` : ''}</p></article>`).join('');
  const scenarios = data.scenarios.map((item) => `<article><h4>${esc(item.title)}</h4><p>${esc(item.text)}</p></article>`).join('');
  const advantages = data.advantages.map((item) => `<article><h4>${esc(item.title)}</h4><p>${esc(item.text)}</p></article>`).join('');
  const trustCount = Math.max(1, Math.min(data.trust.length, 4));
  const trust = data.trust.map((item) => {
    const tooltip = item.infoEmbedded ? infoWithEmbeddedSource(item, item.label) : item.info ? item.source ? infoWithSource(item.info, item.source, item.label) : info(item.info, item.label) : '';
    return `<article><strong>${esc(item.value)}</strong><p>${textWithInfo(item.label, tooltip, 'trust-label-tail')}</p></article>`;
  }).join('');
  const clients = data.clients ? `<div class="positioning-clients"><strong>${esc(data.clients.label)}</strong><p>${data.clients.items?.length ? data.clients.items.map((item, index) => `<span class="client-list-item">${esc(item.name)}${index < data.clients.items.length - 1 ? '<span aria-hidden="true"> ·</span>' : ''}</span>`).join(' ') : esc(data.clients.text)}</p></div>` : '';
  const positioningInfo = data.positioning.info ? data.positioning.source ? infoWithSource(data.positioning.info, data.positioning.source, data.positioning.ariaLabel ?? 'Пояснение к позиционированию') : info(data.positioning.info, data.positioning.ariaLabel ?? 'Пояснение к позиционированию') : '';
  return section('КОНКУРЕНТНОЕ ПРЕДЛОЖЕНИЕ', 'Кому продает и чем привлекает', `
    <div class="positioning-intro"><h3>Позиционирование</h3><p>${textWithInfo(data.positioning.text, positioningInfo, 'positioning-info-tail')}</p></div>
    <div class="positioning-offer-row"><div class="positioning-value"><p class="positioning-label">ЦЕННОСТНОЕ ПРЕДЛОЖЕНИЕ</p><p>${esc(data.value.text)}</p></div>${renderRadarAnalysis(differentiation, 'positioning-analysis')}</div>
    <h3 class="competitor-subheading">Целевые сегменты</h3><div class="positioning-segments ${segmentLayout}">${segments}</div>
    ${scenarioCount ? `<h3 class="competitor-subheading">Выделенные сценарии</h3><div class="positioning-scenarios ${scenarioLayout}">${scenarios}</div>` : ''}
    <div class="positioning-trust-module"><h3 class="positioning-trust-heading">Преимущества и аргументы доверия</h3><div class="positioning-trust"><div class="positioning-advantages"><h4>Заявленные преимущества</h4>${advantages}</div><div class="positioning-proof"><h4>Аргументы доверия</h4><div class="positioning-proof-grid positioning-proof-grid-${trustCount}">${trust}</div>${clients}</div></div></div>`);
}

function renderCompetitorProfileV2(competitor) {
  return `<div class="competitor-meta">${competitor.profile.map((item) => {
    if (item.pairs?.length) {
      return `<div class="competitor-meta-identities"><div class="competitor-meta-identity-head"><p>${esc(item.label)}</p><p>ИНН</p></div>${item.pairs.map((pair) => `<div class="competitor-meta-identity-row"><strong>${esc(pair.value)}</strong><strong data-label="ИНН">${esc(pair.inn)}</strong></div>`).join('')}</div>`;
    }
    const isStatus = item.status || item.label === 'Доверенное лицо УЦ ФНС';
    const statusValue = isStatus && item.value === 'Да' ? 'Доверенное лицо УЦ ФНС' : isStatus && item.value === 'Нет' ? 'Не является доверенным лицом УЦ ФНС' : item.value;
    const value = item.href
      ? `<a href="${esc(item.href)}" target="_blank" rel="noreferrer">${esc(statusValue)} ↗</a>`
      : esc(statusValue).replace(/\n/g, '<br>');
    return `<div class="${isStatus ? 'is-status' : ''}"><p>${esc(isStatus ? 'Статус' : item.label)}</p><strong>${value}</strong></div>`;
  }).join('')}</div>`;
}

function renderCompetitorLogo(logo) {
  return logo ? `<span class="competitor-logo logo-slot ${esc(logo.variant ? `is-${logo.variant}` : '')}"><img src="${esc(logo.src)}" alt="${esc(logo.alt)}"></span>` : '';
}

function renderCompetitorMarketPositionV2(competitor) {
  const data = competitor.marketComparison;
  const scaleMarkup = data.scale.map((item) => `<article><p>${textWithInfo(item.label, item.infoEmbedded ? infoWithEmbeddedSource(item, item.label) : item.info ? item.source ? infoWithSource(item.info, item.source, item.label) : info(item.info, item.label) : '')}</p>${item.values ? `<div class="competitor-scale-values">${item.values.map((value) => `<strong>${esc(value.value)}${value.label ? `<small>${esc(value.label)}</small>` : ''}</strong>`).join('')}</div>` : `<strong>${esc(item.value)}</strong>`}${item.note ? `<small>${esc(item.note)}</small>` : ''}${item.source && !item.info && !item.infoEmbedded ? `<small>${externalLink(item.source)}</small>` : ''}</article>`).join('');
  const scaleCount = Math.max(1, Math.min(data.scale.length, 3));
  if (data.mode === 'scale-only') {
    return section('РЫНОЧНАЯ ПОЗИЦИЯ', 'Показатели масштаба', `<div class="competitor-scale-grid competitor-scale-grid-${scaleCount}">${scaleMarkup}</div>`);
  }
  const maxGrowth = Math.max(...data.growth.map((item) => item.value));
  const kpisMarkup = data.kpis.map((item, index) => `<article class="competitor-kpi ${index === 0 ? 'is-primary' : ''}"><p>${textWithInfo(item.label, item.info ? info(item.info, item.label) : '')}</p><strong>${esc(item.value)}</strong><small>${esc(item.note)}</small></article>`).join('');
  const growthMarkup = data.growth.map((item) => `<div class="growth-row ${esc(item.id)}"><p>${esc(item.label)}</p><div><i style="width:${item.value / maxGrowth * 100}%"></i></div><b>${esc(item.display)}</b></div>`).join('');
  return section('РЫНОЧНАЯ ПОЗИЦИЯ', 'Масштаб и динамика', `<div class="competitor-period">Сравнение: ${esc(data.period)}</div><div class="competitor-kpi-grid">${kpisMarkup}</div><div class="competitor-growth"><h3>Темпы роста выпуска</h3><div class="growth-chart">${growthMarkup}</div></div>${renderRadarAnalysis(data.conclusion)}<h3 class="competitor-subheading">Другие показатели масштаба</h3><div class="competitor-scale-grid competitor-scale-grid-${scaleCount}">${scaleMarkup}</div>`);
}

function renderKonturMarketPosition() {
  const data = kontur.marketComparison;
  const maxGrowth = Math.max(...data.growth.map((item) => item.value));
  const kpis = data.kpis.map((item, index) => `<article class="competitor-kpi ${index === 0 ? 'is-primary' : ''}"><p>${esc(item.label)}</p><strong>${esc(item.value)}</strong><small>${esc(item.note)}</small></article>`).join('');
  const growth = data.growth.map((item) => `<div class="growth-row ${esc(item.id)}"><p>${esc(item.label)}</p><div><i style="width:${item.value / maxGrowth * 100}%"></i></div><b>${esc(item.display)}</b></div>`).join('');
  const scale = data.scale.map((item) => `<article><p>${textWithInfo(item.label, item.infoEmbedded ? infoWithEmbeddedSource(item, item.label) : item.info ? item.source ? infoWithSource(item.info, item.source, item.label) : info(item.info, item.label) : '')}</p><strong>${esc(item.value)}</strong>${item.note ? `<small>${esc(item.note)}</small>` : ''}</article>`).join('');
  const scaleCount = Math.max(1, Math.min(data.scale.length, 3));
  return section('РЫНОЧНАЯ ПОЗИЦИЯ', 'Масштаб и динамика', `<div class="competitor-period">Сравнение: ${esc(data.period)}</div><div class="competitor-kpi-grid">${kpis}</div><div class="competitor-growth"><h3>Темпы роста выпуска</h3><div class="growth-chart">${growth}</div></div>${renderRadarAnalysis(data.conclusion)}<h3 class="competitor-subheading">Другие показатели масштаба</h3><div class="competitor-scale-grid competitor-scale-grid-${scaleCount}">${scale}</div>`);
}

function renderKontur() {
  return layout(`<div class="competitor-page kontur-page">
    <section class="hero compact competitor-hero-v2">
      <a class="back" href="#market">← К обзору рынка</a><div class="competitor-hero-main"><p class="eyebrow">${esc(kontur.hero.eyebrow)}</p><div class="competitor-hero-title-row"><h1>${esc(kontur.brandName)}</h1>${renderCompetitorLogo(kontur.logo)}</div><p class="lead">${esc(kontur.hero.summary)}</p></div>
      ${renderCompetitorProfileV2(kontur)}
    </section>
    ${renderKonturMarketPosition()}
    ${renderCompetitorEvents(kontur, 'competitor-zone competitor-zone-events')}
    ${renderPositioningV2(kontur)}
    ${renderProductsV2(kontur, 'competitor-zone competitor-zone-products')}
    ${renderSales(kontur)}
    ${renderJourneyV2(kontur, 'competitor-zone competitor-zone-journey')}
    ${renderFunctionalityV2(kontur, 'competitor-zone competitor-zone-functionality')}
    ${renderPresenceV2(kontur, 'competitor-zone competitor-zone-presence')}
    ${competitorMethodologyFold(kontur)}
  </div>`, 'kontur');
}

function renderRadarAnalysis(text, className = '') {
  if (!text) return '';
  return `<div class="analysis-note ${className}"><b>${esc(text)}</b></div>`;
}

function renderCompetitorEventTitle(event) {
  const title = String(event.title ?? '');
  const titleInfo = event.titleInfo;
  if (!titleInfo?.text) return esc(title);
  const ariaLabel = titleInfo.ariaLabel ?? `Что такое ${titleInfo.term ?? 'термин'}`;
  const tooltip = titleInfo.source
    ? infoWithSource(titleInfo.text, titleInfo.source, ariaLabel)
    : info(titleInfo.text, ariaLabel);
  return textWithInfo(title, tooltip, 'title-info-tail');
}

function renderCompetitorEvent(event, index, group) {
  const [primarySource] = event.sources ?? [];
  const status = [event.date, ...(event.tags ?? (event.status ? [event.status] : []))]
    .filter(Boolean)
    .join(' · ');
  return `<article class="signal-card competitor-event-card" data-competitor-event-card="${index}">
    <p class="signal-status">${esc(status)}</p>
    <h3>${renderCompetitorEventTitle(event)}</h3>
    <p>${esc(event.summary)}</p>
    <div class="signal-actions">
      <button class="secondary-action inline-disclosure" type="button" data-competitor-event-index="${index}" data-competitor-event-group="${group}">Подробнее ↓</button>
      ${primarySource ? `<a href="${esc(primarySource.href)}" target="_blank" rel="noreferrer">${esc(primarySource.shortLabel ?? primarySource.label)} ↗</a>` : ''}
    </div>
  </article>`;
}

function competitorEventDetails(event, group) {
  const [primarySource, ...additionalSources] = event.sources ?? [];
  return `<div class="signal-panel-content"><div>
    <h3>${renderCompetitorEventTitle(event)}</h3>
    <p>${esc(event.details)}</p>
    ${event.caveat ? `<p><b>Важно учитывать.</b> ${esc(event.caveat)}</p>` : ''}
    ${event.whyItMatters ? `<p><b>Почему важно.</b> ${esc(event.whyItMatters)}</p>` : ''}
  </div><div class="signal-panel-sources">
    ${primarySource ? `<p>Основной источник</p>${externalLink(primarySource)}` : ''}
    ${additionalSources.length ? `<p>Дополнительные источники</p>${additionalSources.map(externalLink).join('')}` : ''}
  </div></div>`;
}

function renderCompetitorEventRow(events, offset, group) {
  const rowClass = events.length === 3 ? 'signal-row-three' : events.length === 1 ? 'signal-row-one' : 'signal-row-two';
  return `<div class="signal-row ${rowClass} competitor-event-row">${events.map((event, index) => renderCompetitorEvent(event, event.sourceIndex ?? offset + index, group)).join('')}</div><div class="signal-panel" data-competitor-event-panel="${group}" hidden></div>`;
}

function renderCompetitorEvents(competitor, className = '') {
  const parseEventDate = (value) => {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
    const date = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const asOf = parseEventDate(competitor.asOf);
  const twelveMonthsAgo = asOf ? new Date(asOf) : null;
  if (twelveMonthsAgo) twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const events = (competitor.events ?? [])
    .map((event, sourceIndex) => ({ ...event, sourceIndex, parsedEventDate: parseEventDate(event.eventDate) }))
    .filter((event) => event.title && event.summary && event.sources?.[0])
    .filter((event) => !asOf || !event.eventDate || (event.parsedEventDate && event.parsedEventDate >= twelveMonthsAgo && event.parsedEventDate <= asOf))
    .sort((a, b) => (b.parsedEventDate?.getTime() ?? 0) - (a.parsedEventDate?.getTime() ?? 0));
  if (!events.length) return '';
  const visibleEvents = events.slice(0, 3);
  const firstRow = renderCompetitorEventRow(visibleEvents, 0, 'first');
  const extraEvents = events.slice(3);
  const more = extraEvents.length ? `<div class="competitor-events-more" data-competitor-events-more hidden>${renderCompetitorEventRow(extraEvents, 3, 'extra')}</div><button class="secondary-action inline-disclosure competitor-events-toggle" type="button" data-competitor-events-toggle data-competitor-events-count="${events.length}">Все изменения (${events.length}) ↓</button>` : '';
  return section('СОБЫТИЯ И ВАЖНЫЕ ИЗМЕНЕНИЯ', `Что меняется у ${competitor.eventsName ?? competitor.shortName}`, `${firstRow}${more}`, className);
}

function renderCompetitorV2(competitor) {
  const isOsnovanie = competitor.slug === 'osnovanie';
  const trailing = competitor.v2BlockLimit && competitor.v2BlockLimit <= 3
    ? ''
    : isOsnovanie
      ? `${renderPositioningV2(competitor)}${renderProductsV2(competitor, 'competitor-zone competitor-zone-products')}${renderSales(competitor)}${renderJourneyV2(competitor, 'competitor-zone competitor-zone-journey')}${renderProduct(competitor)}${renderPresenceV2(competitor, 'competitor-zone competitor-zone-presence')}${renderCompetitorMchd(competitor)}${competitorMethodologyFold(competitor)}`
      : `${competitor.positioningV2 ? renderPositioningV2(competitor) : competitor.positioning ? renderPositioning(competitor) : ''}${renderOffers(competitor)}${renderSales(competitor)}${renderJourney(competitor)}${renderProduct(competitor)}${renderReputation(competitor)}${renderCompetitorMchd(competitor)}${competitor.methodologyV2 ? competitorMethodologyFold(competitor) : ''}`;
  return layout(`<div class="competitor-page">
    <section class="hero compact competitor-hero-v2">
      <a class="back" href="#market">← К обзору рынка</a><div class="competitor-hero-main"><p class="eyebrow">${esc(competitor.hero.eyebrow)}</p><div class="competitor-hero-title-row"><h1>${esc(competitor.brandName)}</h1>${renderCompetitorLogo(competitor.logo)}</div><p class="lead">${textWithInfo(competitor.hero.summary, competitor.hero.info ? infoWithSource(competitor.hero.info.text, competitor.hero.info.source, 'Пояснение') : '')}</p></div>
      ${renderCompetitorProfileV2(competitor)}
    </section>
    ${renderCompetitorMarketPositionV2(competitor)}
    ${renderCompetitorEvents(competitor, 'competitor-zone competitor-zone-events')}
    ${trailing}</div>`, 'competitor');
}

function renderCompetitor(competitor) {
  if (competitor.marketComparison && competitor.hero) return renderCompetitorV2(competitor);
  layout(`
    <section class="hero compact competitor-hero">
      ${renderCompetitorLogo(competitor.logo)}
      <a class="back" href="#market">← К обзору рынка</a>
      <p class="eyebrow">Профиль конкурента · данные на ${esc(competitor.checkedAt)}</p>
      <h1>${esc(competitor.brandName)}</h1>
      <p class="lead">${esc(competitor.positioning.summary)}</p>
    </section>
    ${section('Выводы для команды', 'Конкурентный профиль в двух тезисах', conclusions(competitor.conclusions))}
    ${competitor.marketPosition?.length ? section('Рыночная позиция', 'Масштаб и положение', kpis(competitor.marketPosition)) : ''}
    ${section('Профиль', 'Компания и статус', `<div class="profile-grid">${competitor.profile.map((item) => `<article><p>${esc(item.label)}</p><strong>${item.href ? `<a href="${esc(item.href)}" target="_blank" rel="noreferrer">${esc(item.value)}</a>` : esc(item.value)}</strong></article>`).join('')}</div>`)}
    ${renderPositioning(competitor)}
    ${renderOffers(competitor)}
    ${renderSales(competitor)}
    ${renderJourney(competitor)}
    ${renderProduct(competitor)}
    ${renderReputation(competitor)}
    ${renderCompetitorMchd(competitor)}
    ${methodology()}`, 'competitor');
}

function methodology() {
  return section('Методика', 'Как читать данные', `<ul class="methodology"><li>Выпуск КЭП не равен числу клиентов или выручке.</li><li>Клиентская база и выручка показаны только с указанием масштаба: УЦ, компания или экосистема.</li><li>Переданные МЧД — показатель инфраструктурной активности, а не размер рынка.</li><li>Витринные обещания и фактический опыт контрольной покупки разделены.</li></ul>`);
}

function renderCompactMethodology(data) {
  const renderMethodologyLink = (link) => {
    const label = String(link.label ?? link.name ?? '').replace(/\s*↗$/u, '');
    return `<a href="${esc(link.href)}" target="_blank" rel="noreferrer">${esc(label)}&nbsp;<span class="source-arrow">↗</span></a>`;
  };
  const sourceRows = (data.sources ?? [])
    .filter((source) => source.links?.length > 0 || source.documents?.length > 0 || source.internal)
    .map((source) => {
      if (source.internal) {
        return `<div class="method-source-row"><strong>${esc(source.name)}</strong></div>`;
      }
      if (!source.links?.length) {
        return `<div class="method-source-row"><strong>${esc(source.name)}</strong><span>${source.documents.map(esc).join(' · ')}</span></div>`;
      }
      if (source.links.length === 1) {
        const link = source.links[0];
        return `<div class="method-source-row"><strong><a href="${esc(link.href)}" target="_blank" rel="noreferrer">${esc(source.name)}&nbsp;<span class="source-arrow">↗</span></a></strong></div>`;
      }
      return `<div class="method-source-row"><strong>${esc(source.name)}</strong><span>${source.links.map(renderMethodologyLink).join(' · ')}</span></div>`;
    })
    .join('');
  return `<section class="collapsible-section"><details class="fold-section methodology-fold"><summary><span><span class="eyebrow">ИСТОЧНИКИ И МЕТОДИКА</span><strong>Как читать данные и откуда информация</strong></span><i>Открыть ↓</i></summary><div class="fold-content compact-methodology"><div class="method-reading"><p class="method-subheading">ИНТЕРПРЕТАЦИЯ ПОКАЗАТЕЛЕЙ</p><ul>${(data.reading ?? []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div><div class="method-sources-block"><h3>ИСТОЧНИКИ</h3><div class="method-sources-compact">${sourceRows}</div></div></div></details></section>`;
}

function competitorMethodologyFold(competitor) {
  return renderCompactMethodology(competitor.methodologyV2 ?? {
    reading: ['Факты конкурента отделены от аналитических выводов Radar.', 'Публичное заявление конкурента не равно результату контрольной покупки.', 'Показатели компании в целом не равны показателям направления КЭП.'],
    sources: []
  });
}

function render(resetScroll = false) {
  if (resetScroll) window.scrollTo(0, 0);
  const [route, query = ''] = (location.hash.replace(/^#/, '') || 'market').split('?');
  const params = new URLSearchParams(query);
  const requestedRole = params.get('role');
  const requestedOffer = params.get('offer');
  const requestedTariff = params.get('tariff');
  const [, slug] = route.split('/');
  if (route === 'kontur') renderKontur();
  else if (route.startsWith('competitor/') && competitors[slug]) renderCompetitor(competitors[slug]);
  else renderMarket();
  if (route === 'kontur' || route.startsWith('competitor/')) {
    if (requestedOffer) requestAnimationFrame(() => openComparedOffer(requestedOffer, requestedTariff));
    else if (requestedRole) requestAnimationFrame(() => openBaseOffer(requestedRole));
  }
}

function resetProductDisclosure() {
  document.querySelectorAll('[data-product-card]').forEach((item) => item.classList.remove('selected'));
  document.querySelectorAll('[data-product-index]').forEach((item) => { item.textContent = 'Подробнее ↓'; });
  document.querySelectorAll('[data-product-panel]').forEach((item) => { item.hidden = true; });
  document.querySelectorAll('[data-product-tariff]').forEach((item) => item.classList.remove('selected'));
}

function scrollToProductTarget(target) {
  const headerHeight = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function openBaseOffer(role) {
  const card = document.querySelector(`[data-base-role="${CSS.escape(role)}"]`);
  const button = card?.querySelector('[data-product-index]');
  const key = button?.dataset.productIndex;
  const panel = key ? document.querySelector(`[data-product-panel="${CSS.escape(key)}"]`) : null;
  if (!card) return;
  resetProductDisclosure();
  card.classList.add('selected');
  if (button && panel) {
    button.textContent = 'Скрыть ↑';
    panel.hidden = false;
  }
  scrollToProductTarget(card);
}

function openComparedOffer(offerId, tariffId = '') {
  const card = document.querySelector(`[data-product-offer="${CSS.escape(offerId)}"]`);
  if (!card) return;
  const button = card.querySelector('[data-product-index]');
  const key = button?.dataset.productIndex;
  const panel = key ? document.querySelector(`[data-product-panel="${CSS.escape(key)}"]`) : null;
  resetProductDisclosure();
  card.classList.add('selected');
  if (button && panel) {
    button.textContent = 'Скрыть ↑';
    panel.hidden = false;
  }
  const tariffRow = tariffId
    ? panel?.querySelector(`[data-product-tariff="${CSS.escape(tariffId)}"]`)
    : null;
  if (tariffRow) tariffRow.classList.add('selected');
  scrollToProductTarget(tariffRow ?? card);
}

function positionFinancialKonturTooltip(trigger) {
  const tooltip = trigger?.querySelector('[role="tooltip"]');
  if (!tooltip) return;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 12;
  const left = Math.max(viewportPadding, Math.min(
    triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    window.innerWidth - tooltipRect.width - viewportPadding
  ));
  const opensBelow = triggerRect.top - tooltipRect.height - viewportPadding < 0;
  const top = opensBelow
    ? Math.min(window.innerHeight - tooltipRect.height - viewportPadding, triggerRect.bottom + 10)
    : triggerRect.top - tooltipRect.height - 10;
  tooltip.style.setProperty('--financial-tooltip-left', `${left}px`);
  tooltip.style.setProperty('--financial-tooltip-top', `${Math.max(viewportPadding, top)}px`);
}

function financialPlayerFromTrigger(trigger) {
  const shell = trigger?.closest('[data-financial-chart-shell]');
  const metric = market.financials.metrics[shell?.dataset.financialMetric];
  const player = metric?.players[Number(trigger?.dataset.financialPlayer)];
  return { shell, metric, player };
}

function positionFinancialGroupTooltip(trigger, tooltip, point = {}) {
  if (!trigger || !tooltip) return;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 12;
  const anchorX = Number.isFinite(point.clientX) ? point.clientX : triggerRect.left + triggerRect.width / 2;
  const anchorY = Number.isFinite(point.clientY) ? point.clientY : triggerRect.top + triggerRect.height / 2;
  const left = Math.max(viewportPadding, Math.min(
    anchorX + 14,
    window.innerWidth - tooltipRect.width - viewportPadding
  ));
  const opensBelow = anchorY - tooltipRect.height - viewportPadding < 0;
  const top = opensBelow
    ? Math.min(window.innerHeight - tooltipRect.height - viewportPadding, anchorY + 14)
    : anchorY - tooltipRect.height - 14;
  tooltip.style.setProperty('--financial-tooltip-left', `${left}px`);
  tooltip.style.setProperty('--financial-tooltip-top', `${Math.max(viewportPadding, top)}px`);
}

function showFinancialGroupTooltip(trigger, point) {
  const { shell, metric, player } = financialPlayerFromTrigger(trigger);
  const tooltip = shell?.querySelector('[data-financial-group-tooltip]');
  if (!tooltip || !metric || !player) return;
  tooltip.innerHTML = financialGroupTooltipContent(player, shell.dataset.financialMetric);
  tooltip.hidden = false;
  tooltip.dataset.financialPlayer = trigger.dataset.financialPlayer;
  document.querySelectorAll('[data-financial-player]').forEach((item) => item.setAttribute('aria-expanded', String(item === trigger)));
  positionFinancialGroupTooltip(trigger, tooltip, point);
}

function hideFinancialGroupTooltip(shell = document.querySelector('[data-financial-chart-shell]')) {
  const tooltip = shell?.querySelector('[data-financial-group-tooltip]');
  if (!tooltip) return;
  tooltip.hidden = true;
  delete tooltip.dataset.financialPlayer;
  shell.querySelectorAll('[data-financial-player]').forEach((item) => item.setAttribute('aria-expanded', 'false'));
}

function financialHoverZone(target) {
  return target?.closest?.('[data-financial-hover-zone], .financial-bar:not(.is-placeholder)');
}

function closeInfoTip(trigger) {
  trigger.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
}

function closeInfoTips(except = null) {
  document.querySelectorAll('[data-info-tip].is-open').forEach((trigger) => {
    if (trigger !== except) closeInfoTip(trigger);
  });
}

function positionInfoTip(trigger) {
  const tooltip = trigger.querySelector('[role="tooltip"]');
  const icon = trigger.firstElementChild;
  if (!tooltip || !icon) return;

  const inset = 12;
  const gap = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const anchor = icon.getBoundingClientRect();
  const width = Math.min(290, viewportWidth - inset * 2);
  tooltip.style.width = `${width}px`;
  const { height } = tooltip.getBoundingClientRect();
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const centeredX = clamp(anchor.left + anchor.width / 2 - width / 2, inset, viewportWidth - width - inset);
  const centeredY = clamp(anchor.top + anchor.height / 2 - height / 2, inset, viewportHeight - height - inset);
  const place = (x, y) => {
    tooltip.style.setProperty('--info-tooltip-x', `${Math.round(x)}px`);
    tooltip.style.setProperty('--info-tooltip-y', `${Math.round(y)}px`);
  };

  if (viewportWidth <= 680) {
    if (anchor.top - gap - height >= inset) return place(centeredX, anchor.top - gap - height);
    return place(centeredX, clamp(anchor.bottom + gap, inset, viewportHeight - height - inset));
  }
  if (anchor.right + gap + width <= viewportWidth - inset) return place(anchor.right + gap, centeredY);
  if (anchor.left - gap - width >= inset) return place(anchor.left - gap - width, centeredY);
  if (anchor.top - gap - height >= inset) return place(centeredX, anchor.top - gap - height);
  place(centeredX, clamp(anchor.bottom + gap, inset, viewportHeight - height - inset));
}

function openInfoTip(trigger) {
  closeInfoTips(trigger);
  trigger.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  positionInfoTip(trigger);
}

document.addEventListener('pointerover', (event) => {
  const infoTrigger = event.target.closest('[data-info-tip]');
  if (infoTrigger && event.pointerType !== 'touch') openInfoTip(infoTrigger);
  const trigger = event.target.closest('[data-financial-kontur-tooltip]');
  if (trigger) positionFinancialKonturTooltip(trigger);
  const zone = financialHoverZone(event.target);
  const group = zone?.closest('[data-financial-player]');
  if (group) showFinancialGroupTooltip(group, event);
});

document.addEventListener('pointerout', (event) => {
  const infoTrigger = event.target.closest('[data-info-tip]');
  if (infoTrigger && event.pointerType !== 'touch' && !infoTrigger.contains(event.relatedTarget)) closeInfoTip(infoTrigger);
  if (event.pointerType === 'touch') return;
  const zone = financialHoverZone(event.target);
  const group = zone?.closest('[data-financial-player]');
  const nextGroup = financialHoverZone(event.relatedTarget)?.closest('[data-financial-player]');
  if (!group || nextGroup === group) return;
  const shell = group.closest('[data-financial-chart-shell]');
  const tooltip = shell?.querySelector('[data-financial-group-tooltip]');
  if (tooltip?.dataset.financialPlayer === group.dataset.financialPlayer) hideFinancialGroupTooltip(shell);
});

document.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch') return;
  const zone = financialHoverZone(event.target);
  const group = zone?.closest('[data-financial-player]');
  if (group) showFinancialGroupTooltip(group, event);
  else hideFinancialGroupTooltip();
});

document.addEventListener('pointermove', (event) => {
  const zone = financialHoverZone(event.target);
  const group = zone?.closest('[data-financial-player]');
  const tooltip = group?.closest('[data-financial-chart-shell]')?.querySelector('[data-financial-group-tooltip]');
  if (group && tooltip?.dataset.financialPlayer === group.dataset.financialPlayer) positionFinancialGroupTooltip(group, tooltip, event);
});

document.addEventListener('focusin', (event) => {
  const infoTrigger = event.target.closest('[data-info-tip]');
  if (infoTrigger) openInfoTip(infoTrigger);
  const trigger = event.target.closest('[data-financial-kontur-tooltip]');
  if (trigger) positionFinancialKonturTooltip(trigger);
  const group = event.target.closest('[data-financial-player]');
  if (group && !event.target.closest('a, [data-financial-kontur-tooltip]')) showFinancialGroupTooltip(group);
});

document.addEventListener('focusout', (event) => {
  const infoTrigger = event.target.closest('[data-info-tip]');
  if (infoTrigger && !infoTrigger.contains(event.relatedTarget)) closeInfoTip(infoTrigger);
  const group = event.target.closest('[data-financial-player]');
  const nextGroup = event.relatedTarget?.closest?.('[data-financial-player]');
  if (!group || nextGroup === group) return;
  const shell = group.closest('[data-financial-chart-shell]');
  const tooltip = shell?.querySelector('[data-financial-group-tooltip]');
  if (tooltip?.dataset.financialPlayer === group.dataset.financialPlayer) hideFinancialGroupTooltip(shell);
});

window.addEventListener('resize', () => {
  document.querySelectorAll('[data-info-tip].is-open').forEach(positionInfoTip);
  document.querySelectorAll('[data-financial-kontur-tooltip]').forEach(positionFinancialKonturTooltip);
  const tooltip = document.querySelector('[data-financial-group-tooltip]:not([hidden])');
  const trigger = tooltip ? document.querySelector(`[data-financial-player="${tooltip.dataset.financialPlayer}"]`) : null;
  if (tooltip && trigger) positionFinancialGroupTooltip(trigger, tooltip);
});

window.addEventListener('scroll', () => {
  document.querySelectorAll('[data-info-tip].is-open').forEach(positionInfoTip);
}, true);

document.addEventListener('keydown', (event) => {
  const infoTrigger = event.target.closest('[data-info-tip]');
  const group = event.target.closest('[data-financial-player]');
  if (event.key === 'Escape') {
    closeCompetitorMenus();
    closeInfoTips();
    hideFinancialGroupTooltip();
    return;
  }
  if (infoTrigger && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    if (infoTrigger.classList.contains('is-open')) closeInfoTip(infoTrigger);
    else openInfoTip(infoTrigger);
    return;
  }
  if (!group || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  showFinancialGroupTooltip(group);
});

window.addEventListener('hashchange', () => render(true));
document.addEventListener('click', (event) => {
  const menu = event.target.closest('.nav-menu');
  const menuSummary = event.target.closest('.nav-menu summary');
  if (menuSummary) {
    event.preventDefault();
    const shouldOpen = !menu.open;
    closeCompetitorMenus(menu);
    menu.toggleAttribute('open', shouldOpen);
    return;
  }

  if (menu) {
    if (event.target.closest('a')) menu.removeAttribute('open');
  } else {
    closeCompetitorMenus();
  }

  const infoTrigger = event.target.closest('[data-info-tip]');
  if (infoTrigger) {
    if (event.target.closest('a')) return;
    event.preventDefault();
    if (infoTrigger.classList.contains('is-open')) closeInfoTip(infoTrigger);
    else openInfoTip(infoTrigger);
    return;
  }
  closeInfoTips();

  const rankingButton = event.target.closest('[data-ranking]');
  if (rankingButton) {
    const mode = rankingButton.dataset.ranking;
    activeRankingMode = mode;
    document.querySelectorAll('[data-ranking]').forEach((button) => button.classList.toggle('active', button === rankingButton));
    const body = document.querySelector('[data-ranking-body]');
    if (body) body.innerHTML = renderRankingRows(mode);
    const top10 = document.querySelector('[data-ranking-top10]');
    if (top10) top10.textContent = market.ranking.slices[mode].meta;
    const analysis = document.querySelector('[data-ranking-analysis]');
    if (analysis) analysis.innerHTML = renderRankingAnalysis(mode);
  }

  const rankingDownload = event.target.closest('[data-ranking-download]');
  if (rankingDownload) downloadRanking();

  const financialMetricButton = event.target.closest('[data-financial-metric]');
  if (financialMetricButton) {
    activeFinancialMetric = financialMetricButton.dataset.financialMetric;
    document.querySelectorAll('[data-financial-metric]').forEach((button) => button.classList.toggle('active', button === financialMetricButton));
    const snapshot = document.querySelector('[data-financial-snapshot]');
    if (snapshot) snapshot.innerHTML = renderFinancialSnapshot(activeFinancialMetric);
  }

  const financialDownload = event.target.closest('[data-financial-download]');
  if (financialDownload) downloadFinancials('revenue');

  const signalButton = event.target.closest('[data-signal-index]');
  if (signalButton) {
    const index = Number(signalButton.dataset.signalIndex);
    const card = signalButton.closest('[data-signal-card]');
    const wasSelected = card.classList.contains('selected');
    document.querySelectorAll('[data-signal-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-signal-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    document.querySelectorAll('[data-signal-panel]').forEach((panel) => { panel.hidden = true; panel.innerHTML = ''; });
    if (!wasSelected) {
      card.classList.add('selected');
      signalButton.textContent = 'Скрыть ↑';
      const panel = document.querySelector(`[data-signal-panel="${signalButton.dataset.signalGroup}"]`);
      panel.innerHTML = signalDetails(index);
      panel.hidden = false;
    }
  }

  const competitorEventButton = event.target.closest('[data-competitor-event-index]');
  if (competitorEventButton) {
    const index = Number(competitorEventButton.dataset.competitorEventIndex);
    const route = location.hash.replace(/^#/, '');
    const [, slug] = route.split('/');
    const competitor = route === 'kontur' ? kontur : competitors[slug];
    const item = competitor?.events?.[index];
    const card = competitorEventButton.closest('[data-competitor-event-card]');
    const wasSelected = card?.classList.contains('selected');
    document.querySelectorAll('[data-competitor-event-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-competitor-event-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    document.querySelectorAll('[data-competitor-event-panel]').forEach((panel) => { panel.hidden = true; panel.innerHTML = ''; });
    if (!wasSelected && item) {
      card.classList.add('selected');
      competitorEventButton.textContent = 'Скрыть ↑';
      const panel = document.querySelector(`[data-competitor-event-panel="${competitorEventButton.dataset.competitorEventGroup}"]`);
      if (panel) {
        panel.innerHTML = competitorEventDetails(item, competitorEventButton.dataset.competitorEventGroup);
        panel.hidden = false;
      }
    }
  }

  const competitorEventClose = event.target.closest('[data-competitor-event-close]');
  if (competitorEventClose) {
    document.querySelectorAll('[data-competitor-event-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-competitor-event-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    const panel = document.querySelector(`[data-competitor-event-panel="${competitorEventClose.dataset.competitorEventClose}"]`);
    if (panel) { panel.hidden = true; panel.innerHTML = ''; }
  }

  const competitorEventsToggle = event.target.closest('[data-competitor-events-toggle]');
  if (competitorEventsToggle) {
    const more = document.querySelector('[data-competitor-events-more]');
    if (more) {
      more.hidden = !more.hidden;
      competitorEventsToggle.textContent = more.hidden ? `Все изменения (${competitorEventsToggle.dataset.competitorEventsCount}) ↓` : 'Скрыть ↑';
    }
  }

  const productButton = event.target.closest('[data-product-index]');
  if (productButton) {
    const index = productButton.dataset.productIndex;
    const card = productButton.closest('[data-product-card]');
    const panel = document.querySelector(`[data-product-panel="${index}"]`);
    const wasSelected = card?.classList.contains('selected');
    document.querySelectorAll('[data-product-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-product-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    document.querySelectorAll('[data-product-panel]').forEach((item) => { item.hidden = true; });
    if (!wasSelected && panel) {
      card.classList.add('selected');
      productButton.textContent = 'Скрыть ↑';
      panel.hidden = false;
    }
  }

  const addonsToggle = event.target.closest('[data-product-addons-toggle]');
  if (addonsToggle) {
    const panel = document.querySelector(`[data-product-addons-panel="${addonsToggle.dataset.productAddonsToggle}"]`);
    if (panel) {
      panel.hidden = !panel.hidden;
      addonsToggle.textContent = panel.hidden ? 'Подробнее ↓' : 'Скрыть ↑';
    }
  }

  const productClose = event.target.closest('[data-product-close]');
  if (productClose) {
    document.querySelectorAll('[data-product-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-product-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    const panel = document.querySelector(`[data-product-panel="${productClose.dataset.productClose}"]`);
    if (panel) panel.hidden = true;
  }

  const journeyButton = event.target.closest('[data-journey-index]');
  if (journeyButton) {
    const index = journeyButton.dataset.journeyIndex;
    const card = journeyButton.closest('[data-journey-card]');
    const panel = document.querySelector(`[data-journey-panel="${index}"]`);
    const wasSelected = card?.classList.contains('selected');
    document.querySelectorAll('[data-journey-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-journey-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    document.querySelectorAll('[data-journey-panel]').forEach((item) => { item.hidden = true; });
    if (!wasSelected && panel) {
      card.classList.add('selected');
      journeyButton.textContent = 'Скрыть ↑';
      panel.hidden = false;
    }
  }

  const journeyClose = event.target.closest('[data-journey-close]');
  if (journeyClose) {
    document.querySelectorAll('[data-journey-card]').forEach((item) => item.classList.remove('selected'));
    document.querySelectorAll('[data-journey-index]').forEach((button) => { button.textContent = 'Подробнее ↓'; });
    const panel = document.querySelector(`[data-journey-panel="${journeyClose.dataset.journeyClose}"]`);
    if (panel) panel.hidden = true;
  }

  const foldSummary = event.target.closest('.fold-section summary');
  if (foldSummary) {
    requestAnimationFrame(() => {
      const details = foldSummary.closest('details');
      const label = foldSummary.querySelector('i');
      if (label) label.textContent = details.open ? 'Скрыть ↑' : 'Открыть ↓';
    });
  }
});

render(true);
