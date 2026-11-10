import { createMarketSignals } from './market-signals.js';

const playerEventMonths = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
const playerEventTypeLabels = {
  product: 'Продукт', scenario: 'Клиентские сценарии', channel: 'Каналы продаж',
  technology: 'Технологии', geography: 'География', partnership: 'Партнёрства',
  regulation: 'Регуляторика', infrastructure: 'Инфраструктура', scale: 'Масштаб', status: 'Статус', other: 'Другие изменения'
};
function playerEventIsoDate(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return Number(text.slice(5)) >= 1 && Number(text.slice(5)) <= 12 ? text : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}
function playerEventDisplayDate(value) {
  const text = String(value ?? '').trim().toUpperCase();
  const day = text.match(/^(?:С\s*)?(\d{2})\.(\d{2})\.(\d{4})$/);
  if (day) return playerEventIsoDate(day[3] + '-' + day[2] + '-' + day[1]);
  const month = text.match(/^([А-ЯЁ]+)\s+(\d{4})$/);
  if (!month) return null;
  const index = playerEventMonths.indexOf(month[1].slice(0, 3));
  return index < 0 ? null : month[2] + '-' + String(index + 1).padStart(2, '0');
}
function playerEventSnapshotYear(profile) {
  const iso = playerEventIsoDate(profile.asOf);
  if (iso) return iso.slice(0, 4);
  const match = String(profile.asOf ?? profile.checkedAt ?? '').match(/(?:^|\.)(\d{4})$/);
  return match?.[1] ?? null;
}
function playerEventStableId(event, owner) {
  if (event.id) return event.id;
  const source = event.sources?.[0]?.href ?? event.title;
  let hash = 2166136261;
  for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return owner + '-event-' + (hash >>> 0).toString(16);
}
function playerEventType(event) {
  if (event.type) return event.type;
  const tags = { 'ПРОДУКТ': 'product', 'НОВЫЙ СЦЕНАРИЙ': 'scenario', 'НОВЫЙ КАНАЛ': 'channel', 'ПАРТНЕРСТВО': 'partnership', 'РЕГУЛЯТОРИКА': 'regulation', 'ИНФРАСТРУКТУРА': 'infrastructure', 'МАСШТАБ': 'scale', 'СТАТУС': 'status' };
  return (event.tags ?? []).map(tag => tags[tag]).find(Boolean) ?? 'other';
}
export function buildCompetitorEventRegistry(profile, owner) {
  const records = new Map();
  const currentIds = new Set();
  const snapshotYear = playerEventSnapshotYear(profile);
  const add = (event, current) => {
    if (!event.title || !event.summary || !event.sources?.[0]?.href || event.approved === false || ['draft', 'pending', 'rejected'].includes(event.reviewStatus)) return;
    const id = playerEventStableId(event, owner);
    if (current) currentIds.add(id);
    if (records.has(id)) return;
    const actualDate = event.eventDateBasis === 'publication' ? null : playerEventIsoDate(event.eventDate) ?? playerEventDisplayDate(event.date);
    const publishedAt = playerEventIsoDate(event.publishedAt) ?? '';
    const details = (Array.isArray(event.details) ? [...event.details] : [event.details]).filter(Boolean);
    if (event.titleInfo?.text && !details.includes(event.titleInfo.text)) details.push(event.titleInfo.text);
    if (event.caveat) details.push('Важно учитывать. ' + event.caveat);
    const sources = event.sources.map(source => ({ ...source }));
    if (event.titleInfo?.source?.href && !sources.some(source => source.href === event.titleInfo.source.href)) sources.push({ ...event.titleInfo.source });
    const meaning = event.whyItMatters ?? '';
    records.set(id, {
      id, type: playerEventType(event), title: event.title, description: event.summary,
      company: profile.brandName ?? profile.shortName, status: event.status ?? (event.tags ?? []).join(' · '),
      publishedAt, sortDate: actualDate ?? publishedAt, details, meaning,
      searchTerms: [meaning], sources,
      filterDates: actualDate ? [actualDate] : [],
      yearValues: [...new Set([actualDate?.slice(0, 4), publishedAt?.slice(0, 4), current ? snapshotYear : null].filter(Boolean))],
      displayDate: event.eventDateBasis === 'publication' ? '' : event.date ?? actualDate ?? ''
    });
  };
  // Current approved wording wins when an archived record has the same ID.
  for (const event of profile.events ?? []) add(event, true);
  for (const event of profile.archivedEvents ?? []) add(event, false);
  return { events: [...records.values()], currentIds: [...currentIds], editions: [] };
}
export function createCompetitorEventArchive(profile, owner, options = {}) {
  const registry = buildCompetitorEventRegistry(profile, owner);
  const typeIds = [...new Set(registry.events.map(event => event.type))];
  const name = profile.eventsName ?? profile.brandName ?? profile.shortName;
  return createMarketSignals(registry, {
    ...options,
    view: {
      archiveTitle: 'Все события ' + name,
      eyebrow: 'СОБЫТИЯ И ВАЖНЫЕ ИЗМЕНЕНИЯ',
      backHref: owner === 'kontur' ? '#kontur' : '#competitor/' + owner,
      backLabel: '← На страницу ' + name,
      typeOptions: [['all', 'Все события'], ...typeIds.map(id => [id, playerEventTypeLabels[id] ?? playerEventTypeLabels.other])],
      monthHelp: 'Месяц изменения или мероприятия. Дата публикации источника не используется. Без подтверждённой даты событие доступно при выборе «Все месяцы».'
    }
  });
}
