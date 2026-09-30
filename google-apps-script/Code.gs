/**
 * ============================================================
 *  WEB BÁN HÀNG — Máy chủ nhận đơn (Google Apps Script + Google Sheet)
 *
 *  Cài đặt:
 *   1. Mở https://sheets.google.com → tạo 1 file Google Sheet trống.
 *   2. Trong Sheet: menu Extensions → Apps Script.
 *   3. Xoá nội dung file Code.gs, dán toàn bộ mã dưới đây vào, Lưu.
 *   4. Sửa TOKEN ở hằng số TOKEN bên dưới thành chuỗi ngẫu nhiên của bạn
 *      (ví dụ chạy trong trình duyệt: Math.random().toString(36).slice(2) + ...).
 *   5. Deploy → New deployment → Type: Web app
 *      → Execute as: Me  ·  Who has access: Anyone
 *      → Deploy, rồi copy link kết thúc bằng /exec
 *   6. Vào admin.html → Cửa hàng → Máy chủ: dán link /exec + TOKEN.
 *
 *  Hợp đồng API (giữ đúng với assets/js/remote.js):
 *    GET  ?action=ping   &token=T            -> { ok, app, count }
 *    GET  ?action=list   &token=T            -> { ok, orders: [...] }
 *    POST ?action=add    &token=T  body: đơn hàng (JSON)
 *    POST ?action=status &token=T  body: { id, status }
 *    POST ?action=delete &token=T  body: { id }
 *    Có &callback=fn thì trả về fn({...}); để khách gọi được khi CORS chặn.
 *    GET  ?action=config    &token=T          -> { ok, config, updatedAt }
 *    POST ?action=saveConfig&token=T body: { config }
 *      Cấu hình (món, giá, màu, logo) do chủ quán đẩy lên, khách mở web là lấy về.
 * ============================================================
 */

var TOKEN = 'shop-rDlaW9c8hwP_N3Ik1kXCiw5k3TN8zwG8';
var SHEET_NAME = 'DonHang';
var APP_NAME = 'Bún Bò Huế — máy chủ nhận đơn';
var CONFIG_SHEET = 'CauHinh';
var CHUNK = 45000;   // mỗi ô Sheet chứa tối đa 50.000 ký tự

var HEADERS = ['Mã đơn', 'Thời gian', 'Khách hàng', 'SĐT', 'Địa chỉ', 'Ghi chú',
  'Món (dòng 1)', 'Tạm tính', 'Ưu đãi', 'Phí giao', 'TỔNG', 'Mã ưu đãi', 'Trạng thái', 'Cửa hàng'];


/* ------------------ điểm vào ------------------ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  if (!checkToken(p.token)) return reply({ ok: false, error: 'Sai token' }, p.callback);

  try {
    if (action === 'list') return reply({ ok: true, orders: readAll() }, p.callback);
    if (action === 'config') {
      return reply({ ok: true, config: readConfig(), updatedAt: configUpdatedAt() }, p.callback);
    }
    return reply({ ok: true, app: APP_NAME, count: readAll().length, now: new Date().toISOString() }, p.callback);
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) }, p.callback);
  }
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (!checkToken(p.token)) return reply({ ok: false, error: 'Sai token' }, p.callback);

  var body = parseBody(e);
  var action = p.action;

  try {
    if (action === 'add') {
      var id = addOrder(body);
      return reply({ ok: true, id: id });
    }
    if (action === 'status') {
      updateStatus(String(body.id), String(body.status));
      return reply({ ok: true });
    }
    if (action === 'delete') {
      deleteOrder(String(body.id));
      return reply({ ok: true });
    }
    if (action === 'saveConfig') {
      var saved = writeConfig(body.config);
      return reply({ ok: true, saved: saved, updatedAt: configUpdatedAt() });
    }
    return reply({ ok: false, error: 'Không rõ tác vụ: ' + action });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

function checkToken(t) {
  return !!t && String(t) === TOKEN;
}

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
  }
  if (e && e.parameter && e.parameter.body) {
    try { return JSON.parse(e.parameter.body); } catch (err) { return {}; }
  }
  return {};
}

function reply(data, callback) {
  var json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput('/**/' + callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}


/* ------------------ Sheet ------------------ */
function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.getRange(1, 1, 1, HEADERS.length).setBackground('#d92b1f').setFontColor('#ffffff');
    [140, 150, 130, 110, 260, 180, 300, 110, 100, 100, 110, 100, 110, 160]
      .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}


/* ------------------ Cấu hình cửa hàng (món, giá, màu, logo) ------------------ */
function configSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG_SHEET) || ss.insertSheet(CONFIG_SHEET);
}

function configUpdatedAt() {
  return String(configSheet().getRange('A1').getValue() || '');
}

function readConfig() {
  var sh = configSheet();
  var last = Math.max(2, sh.getLastRow());
  var cells = sh.getRange(2, 1, last - 1, 1).getValues();
  var text = cells.map(function (r) { return String(r[0] || ''); })
    .filter(function (s) { return s; }).join('');
  if (!text) return null;
  try { return JSON.parse(text); } catch (err) { return null; }
}

function writeConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('Cấu hình rỗng');
  var text = JSON.stringify(config);
  var sh = configSheet();
  var chunks = Math.ceil(text.length / CHUNK) || 1;
  var need = 1 + chunks;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    sh.clearContents();
    sh.getRange('A1').setValue(new Date().toISOString());
    for (var i = 0; i < chunks; i++) {
      sh.getRange(i + 2, 1).setValue(text.substr(i * CHUNK, CHUNK));
    }
  } finally {
    lock.releaseLock();
  }
  return text.length;
}

function itemsText(items) {
  return (items || []).map(function (i) {
    return i.name + ' x' + i.qty + (i.note ? ' (' + i.note + ')' : '');
  }).join(' | ');
}

function addOrder(o) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet();
    var id = o.id || ('BB' + Date.now().toString().slice(-8));
    var c = (o.customer) || {};
    sh.appendRow([
      id,
      o.at || new Date().toISOString(),
      c.name || '',
      c.phone || '',
      c.address || '',
      c.note || '',
      itemsText(o.items),
      num(o.sub),
      num(o.discount),
      num(o.ship),
      num(o.total),
      o.code || '',
      o.status || 'new',
      o.shop || ''
    ]);
    return id;
  } finally {
    lock.releaseLock();
  }
}

function readAll() {
  var sh = sheet();
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[0]) continue;
    out.push({
      id: String(row[0]),
      at: toIso(row[1]),
      customer: { name: String(row[2] || ''), phone: String(row[3] || ''), address: String(row[4] || ''), note: String(row[5] || '') },
      items: parseItems(row[6]),
      sub: num(row[7]),
      discount: num(row[8]),
      ship: num(row[9]),
      total: num(row[10]),
      code: String(row[11] || ''),
      status: String(row[12] || 'new'),
      shop: String(row[13] || ''),
      remote: true
    });
  }
  out.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  return out;
}

function updateStatus(id, status) {
  var sh = sheet();
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Chưa có đơn nào');
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      sh.getRange(i + 2, 13).setValue(status);
      return;
    }
  }
  throw new Error('Không thấy đơn ' + id);
}

function deleteOrder(id) {
  var sh = sheet();
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === id) {
      sh.deleteRow(i + 2);
      return;
    }
  }
}


/* ------------------ tiện ích ------------------ */
function num(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toIso(v) {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  var d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Tái tạo mảng món từ chuỗi "Tên x2 (ghi chú) | Tên x1". */
function parseItems(text) {
  var s = String(text || '').trim();
  if (!s) return [];
  if (s.charAt(0) === '[') {
    try { return JSON.parse(s); } catch (e) { /* rơi xuống nhánh phân tích chuỗi */ }
  }
  return s.split('|').map(function (part) {
    var note = '';
    var m = part.match(/\(([^)]*)\)\s*$/);
    if (m) { note = m[1]; part = part.slice(0, m.index).trim(); }
    var q = part.match(/x\s*(\d+)\s*$/i);
    var qty = q ? parseInt(q[1], 10) : 1;
    var name = (q ? part.slice(0, q.index) : part).trim();
    return { name: name, qty: qty, note: note };
  });
}


/* ------------------ chẩn đoán ------------------ */
/** Chạy hàm này (View → Execution log) để xem đơn gần nhất khi gặp lỗi. */
function xemDonGanNhat() {
  var all = readAll();
  Logger.log('Số đơn: ' + all.length);
  if (all.length) Logger.log(JSON.stringify(all[0], null, 2));
  return all;
}
