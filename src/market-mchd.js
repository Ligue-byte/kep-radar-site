export function createMarketMchd(data,{info,infoTip,inlineInfo,nodes=[],download:exportWorkbook=()=>{}}={}){
  let root;
  const roots=new WeakSet();
  const latestYear = data.snapshots.map(item=>item.asOf.slice(0,4)).sort().at(-1);
  const snapshots = data.snapshots.filter(item => item.asOf.startsWith(latestYear)).sort((a,b) => a.asOf.localeCompare(b.asOf));
  let selected = snapshots.at(-1).asOf;
  const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
  const number = value => value.toLocaleString('ru-RU');
  const date = value => value.split('-').reverse().join('.');
  const month = value => new Intl.DateTimeFormat('ru-RU', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')).replace(/ г\.$/,'');
  const periodTitle = value => month(value).replace(/^./,character=>character.toUpperCase());
  const dynamicsTitle = (previous,current) => previous ? 'Динамика '+(previous.asOf.slice(0,4) === current.asOf.slice(0,4) ? month(previous.asOf).replace(/ \d{4}$/,'')+'–'+month(current.asOf) : month(previous.asOf)+' — '+month(current.asOf)) : 'Динамика';
  const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + number(Math.abs(value));
  const percent = value => (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(1).replace('.',',') + '%';
  const groupTotal = (snapshot,metric) => ['СКБ Контур','Сертум-Про'].reduce((sum,name) => sum + snapshot[metric].find(item => item[0] === name)[1],0);
  const change = (current,previous) => previous === undefined ? null : {absolute:current-previous,percent:previous > 0 ? (current/previous-1)*100 : null};
  const changeText = delta => delta ? `${signed(delta.absolute)} МЧД${delta.percent === null ? '' : ' · '+percent(delta.percent)}` : '';
  function state() {
    const index = snapshots.findIndex(item => item.asOf === selected);
    const current = snapshots[index], previous = snapshots[index-1];
    const rows = current.transferred.filter(item => !['СКБ Контур','Сертум-Про'].includes(item[0]));
    rows.push(['Контур',groupTotal(current,'transferred')]);
    rows.sort((a,b) => b[1]-a[1]);
    const base = current.transferred.reduce((sum,item) => sum+item[1],current.portalFnsTransferred);
    return {current,previous,rows,base};
  }
  function render() {
    const {current,previous,rows,base} = state();
    const previousRows = previous ? new Map([...previous.transferred,['Контур',groupTotal(previous,'transferred')]]) : new Map();
    const sourceDetails = [current,previous].filter(Boolean).map(item=>`<a href="${html(item.sourceUrl)}" target="_blank" rel="noreferrer">EDOB2B · ${html(periodTitle(item.asOf))} ↗</a><br>Данные на ${date(item.asOf)}, публикация ${date(item.publishedAt.slice(0,10))}.`).join('<br><br>');
    const kpi = (metric,title) => {
      const value = groupTotal(current,metric), delta = previous ? change(value,groupTotal(previous,metric)) : null;
      const requestedInfo = metric === 'requested' ? info('Запрошенные МЧД — отдельный показатель. В источнике у СКБ Контур исключены МЧД, загруженные через собственный узел.','Как считаются запрошенные МЧД') : '';
      return `<article><p>${requestedInfo?inlineInfo(title,requestedInfo):title}</p><strong>${number(value)} МЧД</strong><small>Суммарно по узлам СКБ Контур и Сертум-Про.</small>${delta ? `<small class="mchd-kpi-change">${changeText(delta)}</small>` : ''}</article>`;
    };
    const ranking = rows.map(([name,value],index) => {
      const delta = change(value,previousRows.get(name));
      const groupInfo = name === 'Контур' ? info(current.transferred.filter(([node])=>['СКБ Контур','Сертум-Про'].includes(node)).map(([node,count])=>node+' — '+number(count)+' МЧД').join('; ')+'.','Состав показателя Контура') : '';
      const nodeLink = nodes.find(item=>item.shortName===name)?.href;
      const unchangedInfo = name === 'ФТС России' && delta?.absolute === 0 ? info(`В обеих исходных таблицах, на ${date(previous.asOf)} и ${date(current.asOf)}, указано ${number(value)} МЧД. Причина неизменности в источнике не объяснена.`,'Почему показатель ФТС не изменился') : '';
      const valueInfo = groupInfo || unchangedInfo;
      return `<tr class="${name === 'Контур' ? 'is-kontur' : ''}"><td>${index+1}</td><td>${nodeLink?`<a href="${html(nodeLink)}">${html(name)}</a>`:html(name)}</td><td class="mchd-bar-cell"><div class="mchd-bar-track"><i style="width:${value/rows[0][1]*100}%"></i></div></td><td>${valueInfo?inlineInfo(number(value),valueInfo):number(value)}</td><td>${(value/base*100).toFixed(1).replace('.',',')}%</td><td class="mchd-growth${delta?.percent>0?' positive':''}">${delta?.percent === null || !delta ? '—' : percent(delta.percent)}</td><td class="mchd-change">${delta ? signed(delta.absolute) : '—'}</td></tr>`;
    }).join('');
    root.innerHTML = `
      <p class="mchd-latest">Последние опубликованные данные — ${html(month(snapshots.at(-1).asOf))}</p>
      <div class="simple-period-line"><div class="simple-picker"><label class="simple-picker-label" for="mchd-period">Период</label><div class="mchd-period-select"><select id="mchd-period" data-mchd-snapshot aria-label="Период МЧД">${snapshots.toReversed().map(item=>`<option value="${item.asOf}"${item.asOf===selected?' selected':''}>${html(periodTitle(item.asOf))}</option>`).join('')}</select><span class="picker-chevron" aria-hidden="true"><svg class="period-chevron" viewBox="0 0 20 20" focusable="false"><path d="m5 7.5 5 5 5-5"/></svg></span></div></div><p class="simple-comparison" aria-live="polite"><span>Сравнение:</span> ${previous?`${html(periodTitle(previous.asOf))} <span aria-hidden="true">→</span> <b>${html(periodTitle(current.asOf))}</b>`:'нет данных за предыдущий период'}</p></div>
      <div class="mchd-summary-v2">${kpi('transferred','Контур: передано на хранение')}${kpi('requested','Контур: запрошено из реестра')}</div>
      <div class="mchd-ranking-head"><button class="ranking-download" type="button" data-mchd-download>Скачать XLSX ↓</button></div>
      <div class="mchd-ranking-scroll" tabindex="0" aria-label="Рейтинг узлов МЧД"><table class="period-table mchd-ranking-table"><colgroup><col style="width:4%"><col style="width:23%"><col style="width:25%"><col style="width:14%"><col style="width:10%"><col style="width:12%"><col style="width:12%"></colgroup><thead><tr><th scope="col">№</th><th scope="col">Узел</th><th scope="col"><span class="sr-only">Объём переданных МЧД</span></th><th scope="col">${html(periodTitle(current.asOf))}</th><th scope="col">Доля*</th><th scope="colgroup" colspan="2">${html(dynamicsTitle(previous,current))}</th></tr></thead><tbody>${ranking}</tbody></table></div>
      <div class="analysis-note"><p>Контур занимает первое место в наблюдаемом рейтинге по переданным МЧД.${previous ? ` Между ${date(previous.asOf)} и ${date(current.asOf)} показатель группы вырос на ${number(groupTotal(current,'transferred')-groupTotal(previous,'transferred'))} МЧД (${percent((groupTotal(current,'transferred')/groupTotal(previous,'transferred')-1)*100)}).` : ''}</p></div>
      <p class="mchd-footnote">* Доля — от представленного объёма ${number(base)} МЧД: узлы топ-10 и ${number(current.portalFnsTransferred)} загрузок через портал ФНС, не от всего рынка. Показатели не равны числу уникальных доверенностей или клиентов. Динамика — между датами исходных таблиц. ${inlineInfo('Источники',infoTip(sourceDetails,'Источники статистики МЧД'))}</p>`;
  }
  function download() {
    const {current,previous,rows,base} = state();
    const previousRows = previous ? new Map([...previous.transferred,['Контур',groupTotal(previous,'transferred')]]) : new Map();
    exportWorkbook({filename:`МЧД_${current.asOf}.xlsx`,sheetName:'Передано МЧД',columns:[{key:'name',label:'Узел',width:28},{key:'value',label:'На '+date(current.asOf),type:'number',width:20},{key:'share',label:'Доля в представленном объёме',type:'percent',width:22},{key:'previous',label:previous?'На '+date(previous.asOf):'Предыдущий период',type:'number',width:20},{key:'delta',label:'Изменение, МЧД',type:'signedNumber',width:20},{key:'growth',label:'Изменение, %',type:'signedPercent',width:18},{key:'source',label:'Источник',width:42}],rows:rows.map(([name,value])=>{const delta=change(value,previousRows.get(name));return {name,value,share:value/base,previous:previousRows.get(name)??'',delta:delta?.absolute??'',growth:delta?.percent===null||!delta?'':delta.percent/100,source:current.sourceUrl};})});
  }

  function bindRoot(){
    root.addEventListener('change',event=>{
      if(!event.target.matches('[data-mchd-snapshot]'))return;
      selected=event.target.value;
      render();
      root.querySelector('[data-mchd-snapshot]')?.focus();
    });
    root.addEventListener('click',event=>{if(event.target.closest('[data-mchd-download]'))download();});
  }
  return {mount(target){
    root=target;
    root.classList.add('market-mchd');
    selected=snapshots.at(-1).asOf;
    if(!roots.has(root)){bindRoot();roots.add(root);}
    render();
  }};
}
