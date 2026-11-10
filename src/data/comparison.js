import { competitors } from './competitors.js';
import { kontur } from './kontur.js';

const players = [
  { key: 'kontur', name: 'Контур', accent: true, route: '#kontur', profile: kontur },
  { key: 'osnovanie', name: 'Основание', route: '#competitor/osnovanie', profile: competitors.osnovanie },
  { key: 'tenzor', name: 'Тензор / Saby', route: '#competitor/tenzor', profile: competitors.tenzor },
  { key: 'taxcom', name: 'Такском', route: '#competitor/taxcom', profile: competitors.taxcom },
  { key: 'astral', name: 'Калуга Астрал', route: '#competitor/astral', profile: competitors.astral }
];

const capabilityRows=[
  {key:'personalAccount',group:'user',title:'Личный кабинет клиента',scope:'Для пользователя',help:'Сравнивается обычный кабинет клиента УЦ без покупки КЦР, Корпоративного УЦ или ТУС. Учитываются самостоятельные заявки, сертификаты, сроки и обновление. Функции корпоративного администратора здесь не учитываются.'},
  {key:'remoteIssuance',group:'user',title:'Выпуск КЭП без визита',help:'Сравнивается получение новой КЭП без посещения УЦ, в том числе для клиента без действующей подписи. Биометрия — способ подтверждения личности при выпуске, не подписание каждого документа. ЕБС — Единая биометрическая система; для этого способа биометрия должна быть зарегистрирована заранее. КЭП Госключа оформляется отдельно.'},
  {key:'remoteRenewal',group:'user',title:'Дистанционное продление',help:'Сравнивается обновление имеющейся КЭП. Онлайн-продление не подтверждает возможность первого получения без визита. Перевыпуск КЭП ФНС — отдельная процедура, её условия нельзя переносить на КЭП физлица.'},
  {key:'mobileWithoutToken',group:'user',title:'Мобильная КЭП без токена',help:'Сравнивается КЭП с ключом на смартфоне без физического токена. КЭП на компьютере, облачная НЭП и подписание через Госключ — другие сценарии. Наличие этого способа само по себе не означает превосходства продукта: важны задачи клиента и поддерживаемые приложения.'},
  {key:'nfc',group:'user',title:'Подписание через NFC',help:'Сравнивается действующий сценарий подписания со смартфона через NFC-токен. Продажа носителя не подтверждает поддержку сценария.'},
  {key:'certificateManagement',group:'organization',title:'Корпоративный выпуск и управление',scope:'Для организаций',help:'КЦР, Корпоративный УЦ и ТУС сопоставляются по операциям выпуска и управления сертификатами. Названия не означают одинаковую техническую реализацию.'},
  {key:'apiIntegrations',group:'organization',title:'API и интеграции',help:'Сравниваются подтверждённые операции с сертификатами и МЧД, автоматизируемые из систем организации, и условия доступа.'},
  {key:'mchd',group:'organization',title:'МЧД и полномочия',help:'Сравниваются операции и управление полномочиями. Цены сервисов представлены в отдельной таблице выше.'}
];

const criteria = [
  {
    key: 'base',
    title: 'Базовые КЭП',
    differenceBasis: 'published',
    rows: [
      { key: 'kep-leader', role: 'leader', product: 'КЭП руководителя / ИП', source: 'base', comparableWithKontur: [] },
      { key: 'kep-employee', role: 'employee', product: 'КЭП сотрудника', source: 'base', comparableWithKontur: [] },
      { key: 'kep-person', role: 'person', product: 'КЭП физлица', source: 'base', comparableWithKontur: [] }
    ],
    analysis: 'По стартовым ценам Контур находится в верхней части диапазона сравниваемых УЦ. Для сотрудников его цена — на верхней границе, на уровне Тензора. Для руководителей и ИП — ниже Основания, но выше Такскома и Астрала. По КЭП физлица Контур находится в средней части диапазона.'
  },
  {
    key: 'mchd',
    title: 'МЧД',
    differenceBasis: 'published',
    rows: [
      { key: 'mchd-1', product: '1 МЧД', source: 'tariff', parent: 'mchd', comparableWithKontur: [] },
      { key: 'mchd-5', product: 'Пакет 5 МЧД', source: 'tariff', parent: 'mchd', comparableWithKontur: [] },
      { key: 'mchd-unlimited', product: 'Безлимитный тариф', source: 'tariff', parent: 'mchd', comparableWithKontur: [] }
    ],
    analysis: 'Контур дороже Тензора во всех трёх категориях, но дешевле Такскома по пакету 5 МЧД и безлимиту. Минимально заявленная цена безлимита Астрала — 44 000 ₽, на 5 851 ₽ ниже Контура. У Основания указана региональная цена заполнения МЧД. Сроки лицензий и состав операций могут различаться; разница цен не означает одинаковый состав услуги.'
  },
  {
    key: 'addons',
    title: 'СКЗИ и носители',
    differenceBasis: 'published',
    rows: [
      { key: 'csp-annual', product: 'КриптоПро CSP 5.0, отдельная годовая лицензия', source: 'addon', comparableWithKontur: ['taxcom', 'astral'] },
      { key: 'rutoken-lite', product: 'Рутокен Lite', source: 'addon', comparableWithKontur: [] },
      { key: 'rutoken-ecp3', product: 'Рутокен ЭЦП 3.0', source: 'addon', comparableWithKontur: ['taxcom'] },
      { key: 'rutoken-ecp3-nfc', product: 'Рутокен ЭЦП 3.0 NFC', source: 'addon', comparableWithKontur: [] }
    ],
    analysis: 'Годовая лицензия КриптоПро CSP у Контура стоит столько же, сколько у Основания, Тензора и Такскома, и на 650 ₽ дешевле Астрала. По Рутокен Lite Контур находится в средней части диапазона: дороже Тензора и Такскома, но дешевле Основания и Астрала. Опубликованная цена Рутокен ЭЦП 3.0 у Контура ниже остальных представленных УЦ. По NFC-носителю Контур находится на уровне Тензора и Такскома. Разница относится к опубликованным ценам; регион, версия и модификация носителя могут различаться.'
  }
];

const exactPrice = (value) => {
  const text = String(value ?? '').trim();
  if (!text || /от\s|[–—-]/i.test(text)) return null;
  const digits = text.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

const uniqueLinks = (links) => links.filter((link, index, all) => link?.href && all.findIndex((item) => item?.href === link.href) === index);
const sourceOf = (item, parent) => item?.priceSource ?? item?.source ?? parent?.priceSource ?? parent?.source ?? null;

function regionalPriceContext(item, parent, fallbackInfo) {
  const source = sourceOf(item, parent);
  const priceInfo = item?.priceInfo ?? parent?.priceInfo ?? fallbackInfo;
  return {
    region: item && Object.hasOwn(item, 'region') ? item.region : parent?.region,
    regionStatus: item?.regionStatus ?? parent?.regionStatus,
    priceInfo: priceInfo && typeof priceInfo === 'object' ? { ...priceInfo, source: priceInfo.source ?? source } : priceInfo,
    priceInfoEmbedded: item?.priceInfoEmbedded ?? parent?.priceInfoEmbedded
  };
}

function resolveBase(profile, key) {
  const item = profile.productsV2?.baseOffers?.find((offer) => offer.comparisonId === key);
  if (!item) return null;
  const tariff = item.tariffs?.find((candidate) => candidate.tariffId === item.baseTariffId) ?? item.tariffs?.[0];
  const tariffPrice = String(tariff?.price ?? item.price).split('/')[0].trim();
  return { item: tariff ?? item, parent: item, price: tariffPrice, offerType: item.role, included: tariff?.includes?.join(' · '), term: tariff?.comparisonTerm ?? item.comparisonTerm, source: sourceOf(tariff, item), checkedAt: tariff?.priceCheckedAt ?? tariff?.checkedAt ?? item.priceCheckedAt ?? item.checkedAt, ...regionalPriceContext(tariff, item), research: item.comparisonStatus === 'research', reason: item.comparisonStatus === 'research' ? profile.productsV2.baseNote : '' };
}

function resolveTariff(profile, parentKey, key) {
  const parent = profile.productsV2?.otherOffers?.find((offer) => offer.comparisonId === parentKey);
  const item = parent?.tariffs?.find((tariff) => tariff.comparisonId === key)
    ?? (parent?.comparisonTariffId === key ? parent : null);
  if (!item) return null;
  const sourcePrice = String(item.price).replace(/^Стоимость:\s*/u, '');
  const priceIsMinimum = /^от\s+/iu.test(String(sourcePrice));
  const price = String(sourcePrice).replace(/^от\s+/iu, '');
  return { item, parent, price, sourcePrice, priceIsMinimum, offerType: parent.title, included: item.includes?.join(' · '), term: item.comparisonTerm ?? parent.comparisonTerm, source: sourceOf(item, parent), checkedAt: item.priceCheckedAt ?? item.checkedAt ?? parent.priceCheckedAt, ...regionalPriceContext(item, parent), excludePriceDelta: item.excludePriceDelta ?? parent.excludePriceDelta };
}

function resolveAddon(profile, key) {
  const item = profile.productsV2?.addons?.find((addon) => addon.comparisonId === key);
  if (!item) return null;
  const sourcePrice = String(item.price).trim();
  const priceIsMinimum = /^от\s+/iu.test(sourcePrice);
  const price = sourcePrice.replace(/^от\s+/iu, '');
  const source = sourceOf(item);
  const fallbackInfo = profile.productsV2.addonsPriceInfo ?? (item.region && item.regionStatus !== 'moscow_mo' ? { text: `Региональная цена: ${item.region}.`, source } : null);
  return { item, parent: item, price, sourcePrice, priceIsMinimum, offerType: item.title, included: item.condition, source, checkedAt: item.priceCheckedAt ?? item.checkedAt ?? item.priceDate, ...regionalPriceContext(item, null, fallbackInfo), excludePriceDelta: item.excludePriceDelta };
}

function resolveProfilePrice(profile, row) {
  if (row.source === 'base') return resolveBase(profile, row.key);
  if (row.source === 'tariff') return resolveTariff(profile, row.parent, row.key);
  return resolveAddon(profile, row.key);
}

function buildCell(player, row) {
  const resolved = resolveProfilePrice(player.profile, row);
  if (!resolved) return { missing: true, reason: 'Цена или отдельная позиция не опубликована в актуальном профиле УЦ.' };
  return {
    price: exactPrice(resolved.price),
    priceDisplay: resolved.price,
    sourcePrice: resolved.sourcePrice ?? resolved.price,
    priceIsMinimum: resolved.priceIsMinimum === true,
    priceInfoEmbedded: resolved.priceInfoEmbedded,
    priceInfo: resolved.priceInfo,
    excludePriceDelta: resolved.excludePriceDelta === true,
    offerType: resolved.offerType,
    included: resolved.included,
    term: resolved.term,
    region: resolved.region,
    regionStatus: resolved.regionStatus,
    source: resolved.source,
    checkedAt: resolved.checkedAt,
    reason: resolved.reason,
    research: resolved.research === true,
    comparable: player.key === 'kontur' || row.comparableWithKontur.includes(player.key)
  };
}

function buildAnalysis(group) {
  if (group.analysis) return group.analysis;
  const statements = (group.analysisRules ?? []).flatMap((rule) => {
    const row = group.rows.find((item) => item.key === rule.row);
    const konturCell = row?.cells.kontur;
    const competitorCell = row?.cells[rule.player];
    if (!Number.isFinite(konturCell?.price) || !Number.isFinite(competitorCell?.price) || !competitorCell.comparable) return [];
    return [rule.template(`${Math.abs(competitorCell.price - konturCell.price).toLocaleString('ru-RU')} ₽`)];
  });
  return statements.length ? statements.join(' ') : 'Для этого блока не установлены подтверждённые сопоставимые цены: сравнение требует совпадения сценария, срока, комплектации и региональных условий.';
}

const groups = criteria.map((group) => {
  const rows = group.rows.map((row) => ({
    ...row,
    differenceBasis: group.differenceBasis,
    cells: Object.fromEntries(players.map((player) => [player.key, buildCell(player, row)]))
  }));
  return { ...group, rows, analysis: buildAnalysis({ ...group, rows }) };
});

function methodologySources() {
  return players.map((player) => ({
    name: player.name,
    links: uniqueLinks([...groups.flatMap((group) => group.rows.map((row) => row.cells[player.key].source)), ...capabilityRows.flatMap(row => player.profile.functionalityV2[row.group][row.key]?.sources ?? [])])
  })).filter((group) => group.links.length);
}

export const comparison = {
  title: 'Контур и конкуренты',
  lead: 'Где Контур дешевле, где дороже и что входит в стоимость предложения.',
  updatedAt: 'октябрь 2026',
  players,
  groups,
  capabilityRows,
  capabilityAnalysis: 'Корпоративный выпуск и API представлены у всех пяти УЦ, поэтому сами по себе не выделяют Контур. Более существенное различие — получение подписи без визита: Основание и Тензор предлагают идентификацию по заранее зарегистрированной биометрии; Контур и Астрал описывают выпуск с действующей КЭП или КЭП Госключа, которую сначала нужно оформить отдельно. У Такскома подтверждён дистанционный перевыпуск, а получение новой КЭП без визита требует уточнения. Контур и Тензор также предлагают КЭП с ключом на смартфоне, но использовать её можно в определённых приложениях. Таким образом, преимущество для клиента определяется числом шагов до первой подписи и возможностью работать в нужной системе, а не просто наличием ЛК, API или подписания без токена.',
  methodology: {
    reading: [
      'Возможности наследуются из functionalityV2 профилей. Сценарии КЭП без токена и NFC разделены. «Не подтверждено» означает недостаток данных; рекомендации по численности организации не считаются техническим запретом. Публичная документация не заменяет фактическую проверку продукта.',
      'Цены наследуются из актуальных продуктовых профилей УЦ. После изменения тарифа в профиле и пересборки страницы соответствующая ячейка сравнения обновляется автоматически.',
      'В КЭП, МЧД и СКЗИ с носителями маркер показывает разницу опубликованных сумм с Контуром. Срок, состав, регион и модификация могут различаться; разница не означает одинаковый комплект или окончательную стоимость заказа. Минимально заявленные цены показаны без приставки «от». Для прочерков и услуги заполнения МЧД Основания разница не рассчитывается.',
      'В первую очередь используются цены Москвы и Московской области. При отсутствии подтверждённой московской цены допускается региональная; региональная замена и отсутствие указанного региона раскрываются в tooltip. Основные суммы и пояснения наследуются из профилей УЦ.',
      'Прочерк означает отсутствие подтверждённой цены в текущем продуктовом профиле УЦ, а не отсутствие услуги. Для сравнения МЧД учитываются различия в сроках лицензий, составе операций, ограничениях и единицах тарификации.'
    ],
    sources: methodologySources()
  }
};
