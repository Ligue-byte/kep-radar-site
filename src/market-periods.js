// Approved Market period selector, ranking calculations, and export model.
export function createMarketPeriods(data,{now=new Date(),download=()=>{}}={}) {
const periodData = data;
const periodSeries = new Map([...periodData.observations, ...periodData.derived].map(s => [s.id, s]));
const periodSourceMap = new Map(periodData.sources.map(s => [s.id, s]));
const periodState = { year: null, months: [], slice: 'all' };
let periodRoot = null;
let documentEventsBound = false;
const roman = ['I', 'II', 'III', 'IV'];
const shortMonths = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const pe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
const validNumber = x => typeof x === 'number' && Number.isFinite(x);
const pnum = x => validNumber(x) ? x.toLocaleString('ru-RU') : '—';
const ppct = x => validNumber(x) ? (x * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—';
const deltaPct = (a,b) => validNumber(a) && validNumber(b) && b !== 0 ? a / b - 1 : null;
const signed = (v, percent = false) => validNumber(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + (percent ? ppct(Math.abs(v)) : pnum(Math.abs(v))) : '—';
const prefixId = (year,q) => q === 1 ? `kep-${year}-q1` : q === 2 ? `kep-${year}-h1` : q === 3 ? `kep-${year}-09-ytd` : `kep-${year}-year`;
const availableYears = [...new Set(periodData.observations.map(s => Number(s.periodStart.slice(0,4))))].sort((a,b)=>b-a);

function sourceIds(series, seen = new Set()) {
  if (!series || seen.has(series.id)) return [];
  seen.add(series.id);
  return series.inputSeries ? [...new Set(series.inputSeries.flatMap(id => sourceIds(periodSeries.get(id), seen)))] : [series.sourceImage];
}
function plainSnapshot(s) {
  return s ? { values: Object.fromEntries(s.players.map(p => [p.entityId,p.value])), market: s.marketTotal, sources: sourceIds(s), direct: !s.inputSeries?.length, complete: s.players.length === 10, note: [s.inputSeries?.length?'Расчётный ряд по исходным публикациям.':'',s.sourceIssue,s.sourceScopeNote,s.note].filter(Boolean).join(' ') } : null;
}
function baseline() { return {year:periodState.year===null?null:periodState.year-1,months:[...periodState.months]}; }
function sliceSnapshot(s,slice) {
  if(!s) return null;
  const v=s.values;
  const publicIds=['fns','treasury','iit'];
  const publicVolume=publicIds.every(id=>validNumber(v[id]))?publicIds.reduce((sum,id)=>sum+v[id],0):null;
  const denominator=slice==='all'?s.market:slice==='state'?publicVolume:validNumber(publicVolume)&&validNumber(s.market)?s.market-publicVolume:null;
  const entries=Object.entries(v).filter(([id])=>id!=='skb-kontur'&&id!=='sertum-pro'&&(slice==='all'||(slice==='state'?periodData.entities[id].segment!=='commercial':periodData.entities[id].segment==='commercial')));
  if(slice!=='state') entries.push(['kontur',validNumber(v['skb-kontur'])&&validNumber(v['sertum-pro'])?v['skb-kontur']+v['sertum-pro']:null]);
  const values=Object.fromEntries(entries);
  const other=slice!=='state'&&s.complete&&validNumber(denominator)&&Object.values(values).every(validNumber)?denominator-Object.values(values).reduce((sum,n)=>sum+n,0):null;
  return {values,denominator,other:validNumber(other)&&other>=0?other:null,source:s};
}
function viewData() {
  const b=baseline();
  const currentRaw=monthsSnapshot(periodState.year,periodState.months);
  const baseRaw=monthsSnapshot(b.year,b.months);
  return {baseline:b,currentRaw,baseRaw,current:sliceSnapshot(currentRaw,periodState.slice),base:sliceSnapshot(baseRaw,periodState.slice)};
}
const nameFor = id => id==='kontur'?'Контур':periodData.entities[id]?.label??periodData.entities[id]?.name??id;
const tipFor = id => id==='kontur'?'СКБ Контур + Сертум-Про':id==='iit'?'Отдельный аналитический сегмент ИИТ / Госключ; в этой вкладке учитывается вместе с государственными УЦ.':'';
function otherUcTooltip(view) {
  const current=view.current;
  const known=Object.values(current.values).reduce((sum,value)=>sum+(validNumber(value)?value:0),0);
  const base=periodState.slice==='commercial'?'объём коммерческих УЦ':'весь рынок';
  return `${monthsLabel(periodState.year,periodState.months)}: ${base} (${pnum(current.denominator)}) минус выпуски УЦ, показанных отдельными строками (${pnum(known)}), — ${pnum(current.other)} сертификатов. Состав группы «Другие УЦ» между периодами может меняться. Поэтому её динамика отражает как изменение выпуска, так и изменение состава группы. Отсутствующая строка УЦ не означает нулевой выпуск.${view.currentRaw.direct?'':' Для расчётного диапазона состав показанных УЦ получен по исходным рейтингам; он не является подтверждённым топ-10 именно этого периода.'}`;
}
function periodPlayerName(row,view) {
  const href=row.id==='kontur'?'#kontur':periodData.entities[row.id]?.href;
  const name=href?`<a href="${pe(href)}">${pe(row.name)}</a>`:pe(row.name);
  let tip='',label='';
  if(row.id==='other'){tip=otherUcTooltip(view);label='Как рассчитаны Другие УЦ';}
  else if(row.id==='iit'&&periodState.slice==='state'){tip=periodData.entities.iit.stateInfo;label='Почему ИИТ в этом срезе';}
  else if(row.id==='kontur'){
    const values=view.currentRaw.values;
    tip=`СКБ Контур — ${pnum(values['skb-kontur'])} сертификатов; Сертум-Про — ${pnum(values['sertum-pro'])} сертификатов. ${monthsLabel(periodState.year,periodState.months)}.`;
    label='Состав выпуска Контура';
  }
  return tip?`<div class="period-player-info"><span>${name}</span><details class="ranking-coverage-info ranking-row-info"><summary aria-label="${pe(label)}">i</summary><span role="tooltip">${pe(tip)}</span></details></div>`:name;
}
function tableRows(view) {
  const c=view.current,b=view.base;
  if(!c)return [];
  const ids=Object.keys(c.values).filter(id=>validNumber(c.values[id])).sort((a,z)=>c.values[z]-c.values[a]||nameFor(a).localeCompare(nameFor(z),'ru'));
  const rows=ids.map(id=>({id,name:nameFor(id),current:c.values[id]??null,previous:b?.values[id]??null}));
  if(validNumber(c.other)) rows.push({id:'other',name:'Другие УЦ',current:c.other,previous:b?.other??null});
  rows.push({id:'total',name:'Итого',current:c.denominator,previous:b?.denominator??null});
  return rows.map(r=>({...r,share:validNumber(r.current)&&validNumber(c.denominator)&&c.denominator!==0?r.current/c.denominator:null,growth:deltaPct(r.current,r.previous),change:validNumber(r.current)&&validNumber(r.previous)?r.current-r.previous:null}));
}
function rankingCoverage(view) {
  const s=view.currentRaw;
  const period=monthsLabel(periodState.year,periodState.months);
  if(periodState.slice!=='all'){
    const governmentIds=['fns','treasury'];
    const government=governmentIds.every(id=>validNumber(s?.values[id]))?governmentIds.reduce((sum,id)=>sum+s.values[id],0):null;
    const volume=periodState.slice==='commercial'?view.current?.denominator:government;
    const share=validNumber(volume)&&validNumber(s?.market)&&s.market>0&&volume>=0&&volume<=s.market?volume/s.market:null;
    const label=periodState.slice==='commercial'?'Доля коммерческих УЦ':'Доля государственных УЦ';
    const explanation=periodState.slice==='commercial'
      ? `Доля коммерческих УЦ во всём рынке за ${period}: ${pnum(volume)} из ${pnum(s?.market)} сертификатов. Коммерческий сегмент — весь рынок за вычетом ФНС, Казначейства и ИИТ / Госключа. Доли игроков в таблице считаются внутри коммерческого сегмента.`
      : `Доля государственных УЦ во всём рынке за ${period}: ФНС и Казначейство — ${pnum(volume)} из ${pnum(s?.market)} сертификатов. ИИТ / Госключ — отдельный аналитический сегмент и в эту плашку не включён. В таблице этой вкладки он показан вместе с государственными УЦ, поэтому её итог и база долей строк включают ИИТ / Госключ.`;
    return {share,label,note:validNumber(share)?explanation:`${label} за ${period} не рассчитана: нет сопоставимого объёма сегмента или итога всего рынка.`};
  }
  const values=Object.values(s?.values??{});
  const sum=values.reduce((total,value)=>total+(validNumber(value)?value:0),0);
  const share=s?.complete&&values.length>0&&values.every(validNumber)&&validNumber(s.market)&&s.market>0&&sum<=s.market?sum/s.market:null;
  const note=!validNumber(share)?'Доля не рассчитана: нет полного набора сопоставимых значений УЦ или итога всего рынка.':s.direct?'Доля топ-10 во всём рынке: сумма опубликованных выпусков каждого из десяти УЦ, делённая на весь рынок выбранного периода. СКБ Контур и Сертум-Про учтены до объединения в одну строку.':'Доля УЦ с сопоставимыми расчётными значениями во всём рынке выбранного периода. Расчёт по границам периодов не подтверждает, что это топ-10 именно этого диапазона.';
  return {share,note,label:'Доля рейтинга во всём рынке'};
}
function monthSnapshot(year,month) {
  const ym=`${year}-${String(month).padStart(2,'0')}`;
  const selected=month===6?periodData.june[year]:month===11&&year===2025?'kep-2025-11-derived':`kep-${ym}`;
  const s=periodSeries.get(selected);
  let result=plainSnapshot(s);
  if(year===2026&&month===2&&result){const partial=plainSnapshot(periodSeries.get('kep-2026-02-players-derived'));result={...result,values:partial.values,direct:false,complete:false,sources:[...new Set([...result.sources,...partial.sources])],note:[result.note,partial.note,'Февраль: выпуски отдельных УЦ рассчитаны как январь–февраль минус январь. Итог всего рынка взят из месячной публикации; состав игроков неполный.'].filter(Boolean).join(' ')};}
  return result;
}
// Available dates come from the collected facts, never from a hardcoded quarter.
const previewToday=now;
const monthNumbers=Array.from({length:12},(_,i)=>i+1);
function availableMonths(year) {
  return monthNumbers.filter(m=>{
    if(year>previewToday.getFullYear()||year===previewToday.getFullYear()&&m>previewToday.getMonth()+1)return false;
    const s=monthSnapshot(year,m);
    return s&&(validNumber(s.market)||Object.values(s.values).some(validNumber));
  });
}
const defaultYear=availableYears.find(y=>availableMonths(y).length);
periodState.year=defaultYear??null;
periodState.months=defaultYear?availableMonths(defaultYear):[];
function quarterMonths(year,q) {return availableMonths(year).filter(m=>Math.ceil(m/3)===q);}
function cumulativeSnapshot(year,m) {
  if(!m)return null;
  const candidates=[...periodSeries.values()].filter(s=>s.periodStart===`${year}-01-01`&&Number(s.periodEnd.slice(5,7))===m);
  return plainSnapshot(candidates.find(s=>s.id===prefixId(year,m/3))??candidates[0]);
}
function mergeSnapshots(parts,note) {
  if(parts.some(p=>!p))return null;
  const keys=[...new Set(parts.flatMap(p=>Object.keys(p.values)))];
  return {values:Object.fromEntries(keys.map(k=>[k,parts.every(p=>validNumber(p.values[k]))?parts.reduce((sum,p)=>sum+p.values[k],0):null])),market:parts.every(p=>validNumber(p.market))?parts.reduce((sum,p)=>sum+p.market,0):null,sources:[...new Set(parts.flatMap(p=>p.sources))],direct:false,complete:parts.every(p=>p.complete)&&keys.every(k=>parts.every(p=>validNumber(p.values[k]))),note:[note,...parts.map(p=>p.note)].filter(Boolean).join(' ')};
}
function monthsSnapshot(year,selected) {
  const ms=[...selected].sort((a,b)=>a-b);
  if(!ms.length||year===null||ms.some(m=>!availableMonths(year).includes(m)))return null;
  const consecutive=ms.every((m,i)=>!i||m===ms[i-1]+1);
  if(consecutive&&ms.length===1)return monthSnapshot(year,ms[0]);
  if(consecutive){
    const end=cumulativeSnapshot(year,ms.at(-1));
    if(ms[0]===1&&end)return end; // Published H1 remains authoritative.
    const start=cumulativeSnapshot(year,ms[0]-1);
    if(end&&start){
      const keys=[...new Set([...Object.keys(end.values),...Object.keys(start.values)])];
      return {values:Object.fromEntries(keys.map(k=>[k,validNumber(end.values[k])&&validNumber(start.values[k])&&end.values[k]>=start.values[k]?end.values[k]-start.values[k]:null])),market:validNumber(end.market)&&validNumber(start.market)?end.market-start.market:null,sources:[...new Set([...end.sources,...start.sources])],direct:false,complete:end.complete&&start.complete&&keys.every(k=>validNumber(end.values[k])&&validNumber(start.values[k])&&end.values[k]>=start.values[k]),note:['Расчётный период: разность сопоставимых накопительных итогов.',end.note,start.note].filter(Boolean).join(' ')};
    }
    return mergeSnapshots(ms.map(m=>monthSnapshot(year,m)),'Сумма выбранных месячных значений.');
  }
  const runs=[];
  for(const m of ms){if(!runs.length||m!==runs.at(-1).at(-1)+1)runs.push([]);runs.at(-1).push(m);}
  return mergeSnapshots(runs.map(run=>monthsSnapshot(year,run)),'Сумма выбранных непересекающихся периодов.');
}
function monthsLabel(year,months) {
  const ms=[...new Set(months)].sort((a,b)=>a-b);
  if(!ms.length)return 'Период не задан';
  const full=[1,2,3,4].filter(q=>[q*3-2,q*3-1,q*3].every(m=>ms.includes(m)));
  if(full.length*3===ms.length){
    if(full.length===1)return `${roman[full[0]-1]} квартал ${year}`;
    const consecutive=full.every((q,i)=>!i||q===full[i-1]+1);
    const title=consecutive?`${roman[full[0]-1]}–${roman[full.at(-1)-1]}`:full.slice(0,-1).map(q=>roman[q-1]).join(', ')+' и '+roman[full.at(-1)-1];
    return `${title} кварталы ${year}`;
  }
  const pieces=[];
  for(let i=0;i<ms.length;){
    const start=ms[i],q=Math.ceil(start/3);
    if(full.includes(q)){pieces.push(`${roman[q-1]} квартал`);i+=3;continue;}
    let end=start;i++;
    while(i<ms.length&&ms[i]===end+1&&!full.includes(Math.ceil(ms[i]/3))){end=ms[i];i++;}
    pieces.push(shortMonths[start-1].toLocaleLowerCase('ru-RU')+(end===start?'':'–'+shortMonths[end-1].toLocaleLowerCase('ru-RU')));
  }
  const title=pieces.join(', ');
  return title[0].toLocaleUpperCase('ru-RU')+title.slice(1)+` ${year}`;
}
function selectMonths(year,months,checked) {
  const next=periodState.year===year?periodState.months:[];
  periodState.months=checked?[...new Set([...next,...months])].sort((a,b)=>a-b):next.filter(m=>!months.includes(m));
  periodState.year=periodState.months.length?year:null;
}
function exportRows(current,previous,currentLabel,previousLabel,note='') {
  const keys=Object.keys(current?.values??{}).sort((a,b)=>(current.values[b]??-1)-(current.values[a]??-1)||nameFor(a).localeCompare(nameFor(b),'ru'));
  const rows=keys.map(id=>({player:nameFor(id),current:current?.values[id]??null,previous:previous?.values[id]??null}));
  if(periodState.slice!=='state')rows.push({player:'Другие УЦ',current:current?.other??null,previous:previous?.other??null});
  rows.push({player:'Итого',current:current?.denominator??null,previous:previous?.denominator??null,total:true});
  return rows.map(r=>({...r,total:false,period:currentLabel,basePeriod:previousLabel,change:validNumber(r.current)&&validNumber(r.previous)?r.current-r.previous:null,growth:deltaPct(r.current,r.previous),share:validNumber(r.current)&&current?.denominator?r.current/current.denominator:null,note:[note,current?.source.note,previous?.source.note,!validNumber(r.current)?'Нет подтверждённого значения выбранного игрока.':''].filter(Boolean).join(' '),sources:[...(current?.source.sources??[]),...(previous?.source.sources??[])].map(id=>periodSourceMap.get(id)?.messageUrl).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' ')}));
}
function periodExportSpec() {
  const v=viewData();
  if(!periodState.months.length)return null;
  const months=periodState.months;
  const monthRows=months.flatMap(m=>{
    const current=sliceSnapshot(monthSnapshot(periodState.year,m),periodState.slice);
    const previous=sliceSnapshot(monthSnapshot(v.baseline.year,m),periodState.slice);
    const note=m===6?'Июнь — расчёт: полугодие минус январь–май.':m===11?'Ноябрь 2025 рассчитан по году, декабрю и октябрю.':current?.source.direct===false||previous?.source.direct===false?'Расчётные месячные значения; метод и ограничения указаны в примечании.':'Исходные месячные значения; могут отличаться от разностей накопительных итогов.';
    return exportRows(current,previous,`${shortMonths[m-1]} ${periodState.year}`,`${shortMonths[m-1]} ${v.baseline.year}`,note).filter(r=>r.player!=='Итого').map(r=>({...r,year:periodState.year,quarter:`${roman[Math.ceil(m/3)-1]} квартал`,month:shortMonths[m-1]}));
  });
  const quarters=[1,2,3,4].filter(q=>[q*3-2,q*3-1,q*3].every(m=>months.includes(m)));
  const quarterRows=quarters.flatMap(q=>{
    const ms=[q*3-2,q*3-1,q*3];
    return exportRows(sliceSnapshot(monthsSnapshot(periodState.year,ms),periodState.slice),sliceSnapshot(monthsSnapshot(v.baseline.year,ms),periodState.slice),monthsLabel(periodState.year,ms),monthsLabel(v.baseline.year,ms),'Полный квартал; расчёт по сопоставимым исходным периодам.').filter(r=>r.player!=='Итого').map(r=>({...r,year:periodState.year,quarter:`${roman[q-1]} квартал`}));
  });
  const shared=[{key:'player',label:'Игрок',width:30},{key:'current',label:'Выпуск',type:'number',width:19},{key:'share',label:'Доля',type:'percent',width:14},{key:'previous',label:'Выпуск за аналогичный период прошлого года',type:'number',width:30},{key:'growth',label:'Динамика, %',type:'signedPercent',width:14},{key:'change',label:'Изменение, сертификаты',type:'signedNumber',width:26},{key:'sources',label:'Источники',width:65},{key:'note',label:'Примечание',width:64}];
  const common=[{key:'year',label:'Год',type:'integer',width:10},{key:'quarter',label:'Квартал',width:16}];
  const monthly={sheetName:'По месяцам',columns:[...common,{key:'month',label:'Месяц',width:16},...shared],rows:monthRows,headerHeight:42};
  const quarterly=quarterRows.length?{sheetName:'По кварталам',columns:[...common,...shared],rows:quarterRows,headerHeight:42}:{sheetName:'По кварталам',columns:[{key:'note',label:'Квартальные данные',width:100}],rows:[{note:'Нет полностью выбранных кварталов. Для квартального сравнения выберите все три месяца квартала.'}]};
  return {filename:`Рынок_КЭП_${periodState.year}_${months.map(m=>String(m).padStart(2,'0')).join('-')}.xlsx`,sheets:[monthly,quarterly]};
}
let periodPickerOpen = false;
const expandedPeriodYears = new Set();
const expandedPeriodQuarters = new Set();
const periodChevron = '<svg class="period-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg>';

function compactPeriodLabel() {
  return monthsLabel(periodState.year,periodState.months);
}
function periodPicker() {
  return `<div class="simple-picker"><span class="simple-picker-label" id="period-picker-label">Период</span><button id="period-picker-toggle" class="simple-picker-toggle" type="button" aria-labelledby="period-picker-label period-picker-value" aria-controls="period-picker-panel" aria-expanded="${periodPickerOpen}"><span id="period-picker-value">${compactPeriodLabel()}</span><span class="picker-chevron" aria-hidden="true">${periodChevron}</span></button>
  ${periodPickerOpen?`<div class="simple-picker-panel" id="period-picker-panel" role="group" aria-label="Выбор года, кварталов и месяцев"><div class="simple-picker-tree">${availableYears.map(year=>{
    const available=availableMonths(year),active=periodState.year===year,all=active&&available.every(m=>periodState.months.includes(m)),expanded=expandedPeriodYears.has(year);
    return `<div class="simple-year"><div class="simple-year-row"><button type="button" class="year-expander" data-expand-year="${year}" aria-label="${expanded?'Свернуть':'Развернуть'} ${year} год" aria-expanded="${expanded}">${periodChevron}</button><label><input id="year-${year}" type="checkbox" data-select-year="${year}"${all?' checked':''}><span>${year}</span></label></div>
    ${expanded?`<div class="simple-quarter-list">${[1,2,3,4].map(q=>{
      const ms=quarterMonths(year,q),enabled=ms.length>0,key=`${year}-${q}`,open=expandedPeriodQuarters.has(key),checked=active&&enabled&&ms.every(m=>periodState.months.includes(m));
      return `<div class="simple-quarter"><div class="simple-quarter-row ${enabled?'':'quarter-unavailable'}"><button type="button" class="year-expander" data-expand-quarter="${key}" aria-label="${open?'Свернуть':'Развернуть'} ${roman[q-1]} квартал ${year}" aria-expanded="${open}"${enabled?'':' disabled'}>${periodChevron}</button><label><input id="quarter-${year}-${q}" type="checkbox" data-select-quarter="${q}" data-year="${year}"${checked?' checked':''}${enabled?'':' disabled'}><span>${roman[q-1]} квартал</span>${enabled?'':'<small>нет данных</small>'}</label></div>${open&&enabled?`<div class="simple-month-list">${[q*3-2,q*3-1,q*3].map(m=>`<label class="${ms.includes(m)?'':'quarter-unavailable'}"><input id="month-${year}-${m}" type="checkbox" data-select-month="${m}" data-year="${year}"${active&&periodState.months.includes(m)?' checked':''}${ms.includes(m)?'':' disabled'}><span>${shortMonths[m-1]}</span>${ms.includes(m)?'':'<small>нет данных</small>'}</label>`).join('')}</div>`:''}</div>`;
    }).join('')}</div>`:''}</div>`;
  }).join('')}</div><div class="simple-picker-footer"><span>Сравнение — с теми же месяцами прошлого года.</span><button type="button" data-picker-done>Готово</button></div></div>`:''}</div>`;
}
function periodRender() {
  if(!periodRoot)return;
  if(!periodState.months.length){
    periodRoot.innerHTML=`<div class="simple-period-line">${periodPicker()}</div><p class="simple-empty-period" role="status">Период не задан. Выберите год, квартал или месяцы.</p>`;
    return;
  }
  const v=viewData(),c=v.current;
  const currentLabel=monthsLabel(periodState.year,periodState.months),baseLabel=monthsLabel(v.baseline.year,v.baseline.months);
  const rows=tableRows(v);
  const coverage=rankingCoverage(v);
  periodRoot.innerHTML=`<div class="simple-period-line">${periodPicker()}<p class="simple-comparison" aria-live="polite"><span>Сравнение:</span> ${pe(baseLabel)} <span aria-hidden="true">→</span> <b>${pe(currentLabel)}</b></p></div>
  ${!v.baseRaw?`<p class="simple-missing-comparison">За ${v.baseline.year} год пока нет данных для сравнения. Значения ${periodState.year} года показаны, динамика не рассчитана.</p>`:''}
  <div class="ranking-head"><div class="ranking-tabs" role="group" aria-label="Срез рейтинга">${[['all','Все'],['commercial','Коммерческие'],['state','Государственные']].map(([id,label])=>`<button type="button" data-slice="${id}" aria-pressed="${periodState.slice===id}" class="${periodState.slice===id?'active':''}">${label}</button>`).join('')}</div><div class="ranking-actions"><div class="ranking-meta"><b data-ranking-coverage>${validNumber(coverage.share)?`${ppct(coverage.share)} рынка`:'Доля не рассчитана'}</b><details class="ranking-coverage-info"><summary aria-label="${pe(coverage.label)}">i</summary><span role="tooltip">${pe(coverage.note)}</span></details></div><button type="button" class="ranking-download" data-export>Скачать XLSX ↓</button></div></div>
  <div class="period-table-scroll ranking-table"><table class="period-table"><thead><tr><th scope="col">№</th><th scope="col">Игрок</th><th scope="col">${pe(currentLabel)}</th><th scope="col">Доля</th><th scope="col" class="period-dynamics-heading">Динамика · <span>${pe(baseLabel)}</span></th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.id==='kontur'?'is-kontur':r.id==='total'?'is-total':''}"><td>${['total','other'].includes(r.id)?'':i+1}</td><td${tipFor(r.id)?` title="${pe(tipFor(r.id))}"`:''}>${periodPlayerName(r,v)}</td><td>${pnum(r.current)}</td><td>${ppct(r.share)}</td><td><span class="delta"><b class="${r.growth>0?'positive':''}">${signed(r.growth,true)}</b><small>${signed(r.change)}</small></span></td></tr>`).join('')}</tbody></table></div>
  <p class="period-source-note">Источник: <a href="https://t.me/ep_uc" target="_blank" rel="noreferrer">Telegram-канал «Об ЭП и УЦ»</a>, публикации за выбранные периоды. Показан выпуск квалифицированных сертификатов. «Другие УЦ» — удостоверяющие центры, не вошедшие в опубликованный топ-10. Прочерк означает отсутствие сопоставимых данных.</p>
`;
  for(const input of periodRoot.querySelectorAll('[data-select-year]')) {
    const year=Number(input.dataset.selectYear);
    input.indeterminate=periodState.year===year&&periodState.months.length>0&&periodState.months.length<availableMonths(year).length;
  }
  for(const input of periodRoot.querySelectorAll('[data-select-quarter]')){
    const ms=quarterMonths(Number(input.dataset.year),Number(input.dataset.selectQuarter));
    const count=periodState.year===Number(input.dataset.year)?ms.filter(m=>periodState.months.includes(m)).length:0;
    input.indeterminate=count>0&&count<ms.length;
  }
}

function restorePickerFocus(id) { if(id)document.getElementById(id)?.focus({preventScroll:true}); }
function onRootToggle(event) {
  const details=event.target;
  if(!details.matches('.ranking-row-info')||!details.open)return;
  const anchor=details.querySelector('summary').getBoundingClientRect();
  const tooltip=details.querySelector('[role="tooltip"]');
  const bounds=tooltip.getBoundingClientRect();
  tooltip.style.left=`${Math.max(12,Math.min(anchor.left,document.documentElement.clientWidth-bounds.width-12))}px`;
  tooltip.style.top=`${Math.max(12,Math.min(anchor.top-bounds.height-8,document.documentElement.clientHeight-bounds.height-12))}px`;
}
function onRootClick(event) {
  if(event.target.closest('#period-picker-toggle')){periodPickerOpen=!periodPickerOpen;periodRender();restorePickerFocus('period-picker-toggle');return;}
  const expand=event.target.closest('[data-expand-year]');
  if(expand){const y=Number(expand.dataset.expandYear);if(expandedPeriodYears.has(y))expandedPeriodYears.delete(y);else expandedPeriodYears.add(y);periodRender();return;}
  const expandQuarter=event.target.closest('[data-expand-quarter]');
  if(expandQuarter){const key=expandQuarter.dataset.expandQuarter;if(expandedPeriodQuarters.has(key))expandedPeriodQuarters.delete(key);else expandedPeriodQuarters.add(key);periodRender();return;}
  if(event.target.closest('[data-picker-done]')){periodPickerOpen=false;periodRender();restorePickerFocus('period-picker-toggle');return;}
  const slice=event.target.closest('[data-slice]');
  if(slice){periodState.slice=slice.dataset.slice;periodPickerOpen=false;periodRender();return;}
  if(event.target.closest('[data-export]')){const spec=periodExportSpec();if(spec)download(spec);return;}
}
function onRootChange(event) {
  const input=event.target,focusId=input.id;
  if(input.matches('[data-select-year]')){
    const year=Number(input.dataset.selectYear);selectMonths(year,availableMonths(year),input.checked);
  }else if(input.matches('[data-select-quarter]')){
    const year=Number(input.dataset.year),q=Number(input.dataset.selectQuarter);
    selectMonths(year,quarterMonths(year,q),input.checked);
  }else if(input.matches('[data-select-month]')){
    selectMonths(Number(input.dataset.year),[Number(input.dataset.selectMonth)],input.checked);
  }else return;
  periodRender();restorePickerFocus(focusId);
}
function onDocumentClick(event) {
  if(!periodRoot?.isConnected)return;
  if(periodPickerOpen&&!event.target.closest('.simple-picker')){periodPickerOpen=false;periodRender();}
}
function onDocumentKeydown(event) {
  if(!periodRoot?.isConnected)return;
  if(event.key==='Escape'&&periodPickerOpen){periodPickerOpen=false;periodRender();restorePickerFocus('period-picker-toggle');}
}

function setSelection(year,months) {
  const unique=[...new Set(months)].sort((a,b)=>a-b);
  if(unique.length&&(!availableYears.includes(year)||unique.some(m=>!availableMonths(year).includes(m))))throw new Error('Selected period is unavailable');
  periodState.year=unique.length?year:null;
  periodState.months=unique;
  periodRender();
}
function setSlice(slice) {
  if(!['all','commercial','state'].includes(slice))throw new Error('Unknown market slice');
  periodState.slice=slice;periodRender();
}
function mount(root,{reset=false}={}) {
  if(!root)return;
  if(reset){periodState.year=defaultYear??null;periodState.months=defaultYear?availableMonths(defaultYear):[];periodState.slice='all';}
  periodRoot=root;
  periodPickerOpen=false;
  root.addEventListener('toggle',onRootToggle,true);
  root.addEventListener('click',onRootClick);
  root.addEventListener('change',onRootChange);
  if(!documentEventsBound){
    document.addEventListener('click',onDocumentClick);
    document.addEventListener('keydown',onDocumentKeydown);
    documentEventsBound=true;
  }
  periodRender();
}
return {mount,setSelection,setSlice,getState:()=>({...periodState,months:[...periodState.months]}),getView:viewData,getRows:()=>tableRows(viewData()),getCoverage:()=>rankingCoverage(viewData()),getExportSpec:periodExportSpec};

}
