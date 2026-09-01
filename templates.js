/**
 * ============================================================
 *  БАЗА УЗЛОВ УЧЁТА МЕТРОЛОГИЧЕСКОЙ СЛУЖБЫ
 *  Печатные формы, версия v1
 * ------------------------------------------------------------
 *  Здесь и только здесь лежит вид бумаги. index.html вызывает
 *  две функции и кладёт результат в скрытый блок, который
 *  и уходит на печать:
 *
 *    renderNodeDoc     - сводный лист по одному узлу учёта:
 *                        общие сведения, состав, история поверок,
 *                        перечень документов.
 *
 *    renderRegistryDoc - реестр узлов: то, что сейчас на экране,
 *                        с учётом фильтров, плюс итоги по срокам.
 *
 *  Стили печати живут в этом же файле, а не в styles.css.
 *  Причина простая: бумага и экран расходятся, и когда правишь
 *  текст документа, править его оформление удобнее рядом,
 *  а не в другом файле через двести строк экранных правил.
 *
 *  ПРАВИТЬ ТЕКСТ ДОКУМЕНТОВ МОЖНО. Меняя формулировки, поднимите
 *  TPL_VERSION: через год по нему будет видно, по какой редакции
 *  печаталась старая бумага.
 * ============================================================
 */

const TPL_VERSION = 'v1';


/** Общие стили печати. size задаётся отдельно каждому документу. */
function docCss(orientation) {
  return '<style>' +
    '@page { size: A4 ' + orientation + '; margin: 14mm 12mm; }' +
    '.doc { font: 11pt/1.35 "Times New Roman", Georgia, serif; color: #000; }' +
    '.doc h1 { font-size: 14pt; text-align: center; margin: 0 0 2mm; text-transform: uppercase; }' +
    '.doc h2 { font-size: 11pt; margin: 6mm 0 2mm; text-transform: uppercase; letter-spacing: .04em; }' +
    '.doc .org { text-align: center; font-size: 10pt; margin-bottom: 4mm; }' +
    '.doc .sub { text-align: center; font-size: 11pt; margin: 0 0 5mm; }' +
    '.doc table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }' +
    '.doc th, .doc td { border: 0.4pt solid #000; padding: 1.2mm 1.8mm; vertical-align: top; font-size: 9.5pt; }' +
    '.doc th { background: #eee; font-weight: bold; text-align: left; }' +
    '.doc td.num { text-align: center; width: 8mm; }' +
    '.doc table.info td:first-child { width: 62mm; color: #333; }' +
    '.doc .late { font-weight: bold; }' +
    '.doc .note { font-size: 9pt; color: #333; }' +
    '.doc .foot { margin-top: 8mm; font-size: 9pt; display: flex; justify-content: space-between; }' +
    '.doc .sign { margin-top: 10mm; font-size: 10pt; }' +
    '.doc .sign td { border: none; padding: 4mm 0 0; }' +
    '.doc .empty { font-size: 9.5pt; color: #333; margin-bottom: 3mm; }' +
    'tr, .doc h2 { page-break-inside: avoid; }' +
    'thead { display: table-header-group; }' +
  '</style>';
}


/* ---------------- служебное ---------------- */

function tplEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tplDate(ru) {
  const m = String(ru || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}

function tplLeft(ru) {
  const d = tplDate(ru);
  if (!d) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

function tplToday() {
  const d = new Date();
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
}

/** Строка таблицы «поле - значение». Пустые поля в бумагу не идут. */
function infoRow(label, value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return '';
  return '<tr><td>' + tplEsc(label) + '</td><td>' + tplEsc(v) + '</td></tr>';
}


/* ============================================================
   КАРТОЧКА УЗЛА УЧЁТА
   ============================================================ */

function renderNodeDoc(node, devices, files, org, opts) {
  const o = opts || {};
  const title = [node['Обозначение'], node['Наименование']].filter(Boolean).join('. ');

  const info =
    '<table class="info">' +
      infoRow('Вид ресурса', node['Вид ресурса']) +
      infoRow('Назначение учёта', node['Назначение']) +
      infoRow('Объект', node['Объект']) +
      infoRow('Адрес', node['Адрес']) +
      infoRow('Место установки', node['Место установки']) +
      infoRow('Подразделение', node['Подразделение']) +
      infoRow('Абонент', node['Абонент']) +
      infoRow('Ресурсоснабжающая организация', node['Ресурсоснабжающая организация']) +
      infoRow('Договор', [node['Договор номер'], node['Договор дата']].filter(Boolean).join(' от ')) +
      infoRow('Схема учёта', node['Схема учёта']) +
      infoRow('Проект', node['Проект номер']) +
      infoRow('Проектная организация', node['Проектная организация']) +
      infoRow('Монтажная организация', node['Монтажная организация']) +
      infoRow('Состояние', node['Статус']) +
      infoRow('Акт ввода в эксплуатацию',
        [node['Номер акта ввода'], node['Дата акта ввода']].filter(Boolean).join(' от ')) +
      infoRow('Допуск действует до', node['Допуск действует до']) +
      infoRow('Акт вывода из эксплуатации',
        [node['Номер акта вывода'], node['Дата акта вывода']].filter(Boolean).join(' от ')) +
      infoRow('Причина вывода', node['Причина вывода']) +
      infoRow('Ответственный',
        [node['Ответственный должность'], node['Ответственный ФИО']].filter(Boolean).join(', ')) +
      infoRow('Съём показаний', node['Способ съёма показаний']) +
      infoRow('Идентификатор в диспетчеризации', node['Идентификатор в системе диспетчеризации']) +
      infoRow('Примечание', node['Примечание']) +
    '</table>';

  /* ---- состав узла ---- */

  const работающие = (devices || []).filter(function (d) { return d['Статус прибора'] !== 'Снят'; });
  const снятые = (devices || []).filter(function (d) { return d['Статус прибора'] === 'Снят'; });

  function deviceRows(list, withRemoval) {
    return list.map(function (d, i) {
      const left = tplLeft(d['Дата следующей поверки']);
      const late = (left !== null && left < 0);
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td>' + tplEsc(d['Позиция']) + '</td>' +
        '<td>' + tplEsc(d['Тип прибора']) + '</td>' +
        '<td>' + tplEsc([d['Марка'], d['Модификация']].filter(Boolean).join(' ')) + '</td>' +
        '<td>' + tplEsc(d['Заводской номер']) + '</td>' +
        '<td>' + tplEsc(d['Год выпуска']) + '</td>' +
        '<td>' + tplEsc(d['Межповерочный интервал, мес']) + '</td>' +
        '<td>' + tplEsc(d['Дата поверки']) + '</td>' +
        '<td' + (late ? ' class="late"' : '') + '>' + tplEsc(d['Дата следующей поверки']) +
          (late ? ' (просрочена)' : '') + '</td>' +
        (withRemoval
          ? '<td>' + tplEsc(d['Дата снятия']) + '</td>'
          : '<td>' + tplEsc(d['Номер свидетельства о поверке']) + '</td>') +
      '</tr>';
    }).join('');
  }

  const head = '<tr><th class="num">№</th><th>Поз.</th><th>Тип прибора</th><th>Марка</th>' +
    '<th>Зав. №</th><th>Год</th><th>МПИ</th><th>Поверен</th><th>Действ. до</th>';

  const composition = работающие.length
    ? '<table><thead>' + head + '<th>Свидетельство</th></tr></thead><tbody>' +
        deviceRows(работающие, false) + '</tbody></table>'
    : '<div class="empty">Приборы не внесены.</div>';

  const removed = снятые.length
    ? '<h2>Снятые приборы</h2><table><thead>' + head + '<th>Снят</th></tr></thead><tbody>' +
        deviceRows(снятые, true) + '</tbody></table>'
    : '';

  /* ---- история поверок ---- */

  const withChecks = (devices || []).filter(function (d) { return (d.checks || []).length; });

  const history = withChecks.length
    ? '<h2>История поверок</h2>' + withChecks.map(function (d) {
        const name = [d['Позиция'], d['Марка'], d['Заводской номер'] ? 'зав. № ' + d['Заводской номер'] : '']
          .filter(Boolean).join(', ');
        const rows = d.checks.map(function (c, i) {
          return '<tr>' +
            '<td class="num">' + (i + 1) + '</td>' +
            '<td>' + tplEsc(c['Дата поверки']) + '</td>' +
            '<td>' + tplEsc(c['Вид поверки']) + '</td>' +
            '<td>' + tplEsc(c['Результат']) + '</td>' +
            '<td>' + tplEsc(c['Дата следующей поверки']) + '</td>' +
            '<td>' + tplEsc(c['Номер свидетельства']) + '</td>' +
            '<td>' + tplEsc(c['Номер записи ФГИС Аршин']) + '</td>' +
            '<td>' + tplEsc(c['Поверитель']) + '</td>' +
          '</tr>';
        }).join('');
        return '<div class="note"><b>' + tplEsc(name) + '</b></div>' +
          '<table><thead><tr><th class="num">№</th><th>Поверен</th><th>Вид</th><th>Результат</th>' +
          '<th>Действ. до</th><th>Свидетельство</th><th>ФГИС «Аршин»</th><th>Поверитель</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table>';
      }).join('')
    : '';

  /* ---- документы ---- */

  const docs = (files || []).length
    ? '<table><thead><tr><th class="num">№</th><th>Документ</th><th>Часть</th>' +
        '<th>Файл</th><th>Загрузил</th><th>Когда</th></tr></thead><tbody>' +
        files.map(function (f, i) {
          return '<tr>' +
            '<td class="num">' + (i + 1) + '</td>' +
            '<td>' + tplEsc(f.type) + '</td>' +
            '<td>' + tplEsc(f.part) + '</td>' +
            '<td>' + tplEsc(f.name) + '</td>' +
            '<td>' + tplEsc(f.by) + '</td>' +
            '<td>' + tplEsc(f.when) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table>'
    : '<div class="empty">Документы не приложены.</div>';

  /* ---- сборка ---- */

  return docCss('portrait') +
    '<div class="doc">' +
      '<div class="org">' + tplEsc(org || '') + '</div>' +
      '<h1>Карточка узла учёта № ' + tplEsc(node['Номер']) + '</h1>' +
      '<div class="sub">' + tplEsc(title) + '</div>' +

      '<h2>Общие сведения</h2>' + info +
      '<h2>Состав узла</h2>' + composition + removed +
      history +
      '<h2>Документы</h2>' + docs +

      '<table class="sign"><tr>' +
        '<td style="width:60%">Карточку составил: ' + tplEsc(o.user || '') +
          ' _________________</td>' +
        '<td>«____» ______________ 20___ г.</td>' +
      '</tr></table>' +

      '<div class="foot">' +
        '<span>Напечатано ' + tplToday() + '</span>' +
        '<span>Форма ' + TPL_VERSION + '. Сведения о поверке подтверждаются ФГИС «Аршин»</span>' +
      '</div>' +
    '</div>';
}


/* ============================================================
   РЕЕСТР УЗЛОВ УЧЁТА
   ============================================================ */

function renderRegistryDoc(nodes, org, filters, opts) {
  const o = opts || {};
  const f = filters || {};
  const list = nodes || [];

  const picked = [
    f.object   ? 'объект: ' + f.object : '',
    f.resource ? 'ресурс: ' + f.resource : '',
    f.status   ? 'состояние: ' + f.status : '',
    f.q        ? 'поиск: ' + f.q : ''
  ].filter(Boolean).join('; ');

  let overdue = 0, soon = 0;

  const rows = list.map(function (n, i) {
    const left = tplLeft(n.nearest);
    const late = n.overdue > 0;
    if (late) overdue++;
    else if (left !== null && left <= (o.warnDays || 90)) soon++;

    const срок = late
      ? 'просрочено с ' + (n.nearest || '')
      : (n.nearest ? 'до ' + n.nearest : '');

    return '<tr>' +
      '<td class="num">' + tplEsc(n.number) + '</td>' +
      '<td>' + tplEsc([n.code, n.name].filter(Boolean).join('. ')) + '</td>' +
      '<td>' + tplEsc(n.resource) + '</td>' +
      '<td>' + tplEsc(n.purpose) + '</td>' +
      '<td>' + tplEsc(n.object) + '</td>' +
      '<td>' + tplEsc(n.status) + '</td>' +
      '<td>' + tplEsc(n.actIn) + '</td>' +
      '<td class="num">' + tplEsc(n.devices) + '</td>' +
      '<td' + (late ? ' class="late"' : '') + '>' + tplEsc(срок) + '</td>' +
    '</tr>';
  }).join('');

  return docCss('landscape') +
    '<div class="doc">' +
      '<div class="org">' + tplEsc(org || '') + '</div>' +
      '<h1>Реестр узлов учёта</h1>' +
      '<div class="sub">' +
        'на ' + tplToday() + (picked ? '. Отбор: ' + tplEsc(picked) : '') +
      '</div>' +

      (list.length
        ? '<table><thead><tr>' +
            '<th class="num">№</th><th>Обозначение, наименование</th><th>Ресурс</th>' +
            '<th>Назначение</th><th>Объект</th><th>Состояние</th><th>Введён</th>' +
            '<th class="num">Приб.</th><th>Ближайшая поверка</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="empty">По заданному отбору узлов нет.</div>') +

      '<div class="note">' +
        'Всего узлов в списке: ' + list.length +
        '. С просроченной поверкой: ' + overdue +
        '. С поверкой в ближайшие ' + (o.warnDays || 90) + ' дней: ' + soon + '.' +
      '</div>' +

      '<table class="sign"><tr>' +
        '<td style="width:60%">Реестр составил: ' + tplEsc(o.user || '') +
          ' _________________</td>' +
        '<td>«____» ______________ 20___ г.</td>' +
      '</tr></table>' +

      '<div class="foot">' +
        '<span>Напечатано ' + tplToday() + '</span>' +
        '<span>Форма ' + TPL_VERSION + '</span>' +
      '</div>' +
    '</div>';
}
