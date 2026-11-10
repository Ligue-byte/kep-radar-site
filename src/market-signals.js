export function createMarketSignals(signalRegistry,{now=new Date(),view={}}={}){
let signalRoot;
const roots=new WeakSet();

const currentYear=String(now.getFullYear());
const signalState={year:currentYear,month:'all',type:'all',query:'',open:null,expanded:false,archive:false};
const se=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const dateText=value=>!value?'':/^\d{4}-\d{2}$/.test(value)?months[Number(value.slice(5,7))-1]+' '+value.slice(0,4):value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(0,4);
const normal=value=>String(value??'').toLowerCase().replaceAll('ё','е').replace(/[«»„“”"']/g,'').replace(/\s+/g,' ').trim();
const sourceLink=source=>`<a href="${se(source.href)}" target="_blank" rel="noreferrer">${se(source.label.replace(/\s*↗$/,''))} ↗</a>`;
const isArchive=()=>signalState.archive;
const significantDates=event=>event.filterDates??[event.effectiveAt,...(event.milestones||[]).map(item=>item.date)].filter(Boolean);
const eventEditions=event=>signalRegistry.editions.filter(edition=>edition.entries.some(entry=>entry.eventId===event.id));
const eventYears=event=>event.yearValues??[...new Set([...eventEditions(event).map(edition=>edition.publishedAt.slice(0,4)),...significantDates(event).map(date=>date.slice(0,4))])];
function searchableText(event){
  const dates=significantDates(event).flatMap(date=>[date,dateText(date),`${months[Number(date.slice(5,7))-1]} ${date.slice(0,4)}`]);
  return normal([event.title,event.description,event.company,event.status,...event.details,...(event.searchTerms||[]),...event.sources.map(source=>source.label),...dates].join(' '));
}

function searchParts(event){
  const dates=significantDates(event).flatMap(date=>[date,dateText(date),months[Number(date.slice(5,7))-1]+' '+date.slice(0,4)]);
  return [event.title,event.description,[...event.details,...(event.searchTerms||[]),event.company,event.status,...dates].filter(Boolean).join(' '),event.sources.map(source=>source.label).join(' ')];
}
function searchRank(event){
  const words=normal(signalState.query).split(' ').filter(Boolean);
  if(!words.length)return 0;
  const index=searchParts(event).findIndex(part=>words.every(word=>normal(part).includes(word)));
  return index<0?5:index+1;
}
function highlight(text){
  text=String(text??'');
  if(!isArchive()||!signalState.query.trim())return se(text);
  const lower=text.toLowerCase().replaceAll('ё','е'),ranges=[];
  for(const word of normal(signalState.query).split(' ').filter(Boolean)){
    let start=0,index;
    while((index=lower.indexOf(word,start))>=0){ranges.push([index,index+word.length]);start=index+word.length;}
  }
  ranges.sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
  let html='',cursor=0;
  for(const [start,end] of merged){html+=se(text.slice(cursor,start))+'<mark>'+se(text.slice(start,end))+'</mark>';cursor=end;}
  return html+se(text.slice(cursor));
}
function searchSnippet(event){
  if(!isArchive()||!signalState.query.trim()||searchRank(event)<3)return '';
  const sourceOnly=searchRank(event)===4;
  const dateLines=significantDates(event).flatMap(date=>[date,dateText(date),months[Number(date.slice(5,7))-1]+' '+date.slice(0,4)]);
  const lines=sourceOnly?event.sources.map(source=>source.label):[...event.details,...(event.searchTerms||[]),event.company,event.status,...dateLines];
  const words=normal(signalState.query).split(' ').filter(Boolean);
  const line=lines.filter(Boolean).map(text=>({text,count:words.filter(word=>normal(text).includes(word)).length})).sort((a,b)=>b.count-a.count)[0];
  if(!line?.count)return '';
  const index=Math.max(0,normal(line.text).indexOf(words.find(word=>normal(line.text).includes(word))));
  const start=Math.max(0,index-45),end=Math.min(line.text.length,start+185);
  return '<p class="search-match">'+(sourceOnly?'В источнике: ':dateLines.includes(line.text)?'Дата события: ':'В подробностях: ')+highlight((start?'…':'')+line.text.slice(start,end)+(end<line.text.length?'…':''))+'</p>';
}

function selectedEvents(){
  if(!isArchive())return (signalRegistry.previewPriorityIds||signalRegistry.currentIds).map(id=>signalRegistry.events.find(event=>event.id===id));
  const query=normal(signalState.query),words=query.split(' ').filter(Boolean);
  const monthYear=months.map((month,i)=>({month:String(i+1).padStart(2,'0'),match:query.match(new RegExp(normal(month)+'\\s+(\\d{4})(?=\\s|$)'))})).find(item=>item.match);
  return signalRegistry.events.filter(event=>(signalState.year==='all'||eventYears(event).includes(signalState.year))&&(signalState.type==='all'||event.type===signalState.type)&&(signalState.month==='all'||significantDates(event).some(date=>date.slice(5,7)===signalState.month&&(signalState.year==='all'||date.startsWith(signalState.year))))&&(!monthYear||significantDates(event).some(date=>date.startsWith(monthYear.match[1]+'-'+monthYear.month)))&&words.every(word=>searchableText(event).includes(word))).sort((a,b)=>searchRank(a)-searchRank(b)||(b.sortDate??b.publishedAt??'').localeCompare(a.sortDate??a.publishedAt??'')||a.id.localeCompare(b.id));
}
function signalPanel(event){
  return `<div class="signal-panel-content"><div><h3>${se(event.title)}</h3>${event.effectiveAt?`<p class="signal-detail-meta">Вступление в силу: ${dateText(event.effectiveAt)}</p>`:''}${event.details.map(text=>`<p>${se(text)}</p>`).join('')}<div class="analysis-note"><b>${se(event.meaning)}</b></div></div><aside class="signal-panel-sources"><p>Источники</p>${event.sources.map(source=>`<div class="signal-source">${sourceLink(source)}</div>`).join('')}</aside></div>`;
}

function cardTiming(event){
  if(event.displayDate!==undefined)return event.displayDate;
  if(event.effectiveAt)return event.status;
  const dates=(event.milestones||[]).map(item=>item.date);
  if(dates.length>1)return dates[0].slice(8,10)+'–'+dateText(dates.at(-1));
  if(dates.length)return dateText(dates[0]);
  const updated=event.sources.find(source=>source.updatedAt);
  return updated?dateText(updated.updatedAt):'';
}

function signalCard(event){
  const open=signalState.open===event.id;
  return `<article class="signal-card${open?' selected':''}" data-event="${se(event.id)}">${cardTiming(event)?`<p class="signal-status">${se(cardTiming(event))}</p>`:''}<h3>${highlight(event.title)}</h3><p>${highlight(event.description)}</p>${searchSnippet(event)}<div class="signal-actions"><button class="inline-disclosure" type="button" data-open-event="${se(event.id)}" aria-expanded="${open}"${open?' aria-controls="market-signal-detail"':''}>${open?'Скрыть ↑':'Подробнее ↓'}</button>${sourceLink(event.sources[0])}</div></article>`;
}
function eventRows(events){
  const rows=events.length===5?[events.slice(0,3),events.slice(3)]:events.length===4?[events.slice(0,2),events.slice(2)]:Array.from({length:Math.ceil(events.length/3)},(_,i)=>events.slice(i*3,i*3+3));
  return rows.map(row=>`<div class="signal-row signal-row-${row.length===3?'three':row.length===2?'two':'one'}">${row.map(event=>`${signalCard(event)}${signalState.open===event.id?`<div class="signal-panel" id="market-signal-detail" role="region" aria-label="Подробности события">${signalPanel(event)}</div>`:''}`).join('')}</div>`).join('');
}
function archiveFilters(){
  const years=[...new Set([currentYear,...signalRegistry.events.flatMap(eventYears)])].sort().reverse();
  return `<div class="archive-filters"><label>Год<select data-filter="year" aria-label="Год">${years.map(year=>`<option value="${year}"${signalState.year===year?' selected':''}>${year}</option>`).join('')}<option value="all"${signalState.year==='all'?' selected':''}>Все годы</option></select></label><label><span class="month-filter-label">Месяц события <span class="month-help" tabindex="0" role="note" aria-label="${se(view.monthHelp??'Для действующих норм — месяц вступления в силу; для проектов и позиций — дата документа; для конкурентов — месяц изменения или мероприятия')}">i<span class="month-help-text">${se(view.monthHelp??'Для действующих норм — вступление в силу. Для проектов и позиций — дата документа. Для конкурентов — дата изменения или мероприятия. Дата публикации источника не используется.')}</span></span></span><select data-filter="month" aria-label="Месяц события"><option value="all">Все месяцы</option>${months.map((month,i)=>{const value=String(i+1).padStart(2,'0');return `<option value="${value}"${signalState.month===value?' selected':''}>${month}</option>`;}).join('')}</select></label><label>Тип события<select data-filter="type" aria-label="Тип события">${(view.typeOptions??[['all','Все события'],['regulation','Регуляторика'],['competitor','Конкуренты']]).map(([id,label])=>`<option value="${se(id)}"${signalState.type===id?' selected':''}>${se(label)}</option>`).join('')}</select></label><label class="archive-search">Поиск<input type="search" data-search aria-label="Поиск событий" placeholder="Введите слово, фразу или номер документа" value="${se(signalState.query)}"></label><button class="reset-filters" type="button" data-reset-filters>Сбросить</button></div>`;
}
function renderSignalsPreview(){
  const archive=isArchive(),events=selectedEvents(),visible=archive||signalState.expanded?events:events.slice(0,3);
  signalRoot.innerHTML=`<section class="market-section market-signals-section"><p class="eyebrow">${se(view.eyebrow??'СИГНАЛЫ РЫНКА')}</p><div class="signals-title-row"><${archive?'h1':'h2'}>${archive?se(view.archiveTitle??'Все события'):'Что меняется в регуляторике и у конкурентов'}</${archive?'h1':'h2'}><a class="signals-archive-link" href="${archive?se(view.backHref??'#market'):'#market-signals'}">${archive?se(view.backLabel??'← К текущей подборке'):'Все события →'}</a></div>${archive?archiveFilters():''}${events.length?eventRows(visible):'<p class="archive-empty" role="status">По выбранным условиям событий нет.</p>'}${!archive&&events.length>3?'<button class="events-expand" type="button" data-expand-events aria-expanded="'+signalState.expanded+'">'+(signalState.expanded?'Свернуть ↑':'Показать ещё '+(events.length-3)+' '+(events.length-3===1?'событие':'события')+' ↓')+'</button>':''}</section>`;
}
function focusControl(selector,caret){const control=signalRoot.querySelector?.(selector);control?.focus();if(typeof caret==='number')control?.setSelectionRange(caret,caret);}
function bindRoot(){
signalRoot.addEventListener('click',event=>{
  if(event.target.closest('[data-expand-events]')){signalState.expanded=!signalState.expanded;signalState.open=null;renderSignalsPreview();focusControl('[data-expand-events]');return;}
  const button=event.target.closest('[data-open-event]');
  if(button){signalState.open=signalState.open===button.dataset.openEvent?null:button.dataset.openEvent;renderSignalsPreview();focusControl(`[data-open-event="${button.dataset.openEvent}"]`);}
  else if(event.target.closest('[data-reset-filters]')){Object.assign(signalState,{year:currentYear,month:'all',type:'all',query:'',open:null});renderSignalsPreview();focusControl('[data-reset-filters]');}
});
signalRoot.addEventListener('change',event=>{if(event.target.matches('[data-filter]')){const key=event.target.dataset.filter;signalState[key]=event.target.value;signalState.open=null;renderSignalsPreview();focusControl(`[data-filter="${key}"]`);}});
signalRoot.addEventListener('input',event=>{if(event.target.matches('[data-search]')){const caret=event.target.selectionStart;signalState.query=event.target.value;signalState.open=null;renderSignalsPreview();focusControl('[data-search]',caret);}});
}

return {mount(root,{archive=false}={}){signalRoot=root;signalState.archive=archive;signalState.open=null;if(!roots.has(root)){bindRoot();roots.add(root);}renderSignalsPreview();}};
}
