/* ============================================================
   Đồng bộ đơn hàng về máy chủ (Google Apps Script + Google Sheet)
   Namespace: window.BBRemote

   Hợp đồng API (URL = link /exec của Web App):
     GET  ?action=ping  &token=T            -> { ok, app, count }
     GET  ?action=list  &token=T            -> { ok, orders: [...] }
     POST ?action=add   &token=T  body: order
     POST ?action=status&token=T body: { id, status }
     POST ?action=delete&token=T body: { id }
     Có thêm tham số &callback=fn -> trả về fn({...}); (JSONP dự phòng khi CORS chặn)
     GET  ?action=config&token=T            -> { ok, config, updatedAt }
     POST ?action=saveConfig&token=T body: cấu hình cửa hàng (món, giá, màu, logo)
   ============================================================ */
(function (global) {
  'use strict';

  var QUEUE_KEY = 'bunbo.remote.queue.v1';
  var CACHE_KEY = 'bunbo.remote.cache.v1';
  var CONF_KEY = 'bunbo.remote.conf.v1';
  var CONF_TTL = 5 * 60e3;   // bản nhớ trong máy khách tự làm mới sau 5 phút
  var TIMEOUT = 8000;

  /* ---------- cấu hình ---------- */
  function saveConfig(patch) {
    var d = BB.db();
    d.remote = d.remote || {};
    if (patch.url !== undefined) d.remote.url = String(patch.url || '').trim();
    if (patch.token !== undefined) d.remote.token = String(patch.token || '').trim();
    if (patch.shop !== undefined) d.remote.shop = String(patch.shop || '').trim();
    BB.commit();
  }
  function isConfigured() {
    var r = config();
    return !!(r.url && /^https?:\/\//i.test(r.url) && r.token);
  }
  /** Cấu hình trong file deploy (khách dùng) gộp với cấu hình riêng của máy chủ quán. */
  function config() {
    var file = (typeof global.BB_SERVER_CONFIG === 'object' && global.BB_SERVER_CONFIG) || {};
    var local = BB.db().remote || {};
    return {
      url: local.url || file.url || '',
      token: local.token || file.token || '',
      shop: local.shop || file.shop || ''
    };
  }
  function baseUrl() { return config().url.replace(/\/+$/, ''); }

  function withParams(action, extra) {
    var r = config();
    var q = 'action=' + action + '&token=' + encodeURIComponent(r.token);
    if (extra) q += '&' + extra;
    return baseUrl() + (baseUrl().indexOf('?') >= 0 ? '&' : '?') + q;
  }

  /* ---------- hàng đợi gửi lại ---------- */
  function readQueue() {
    try {
      var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (e) { return []; }
  }
  function writeQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q || [])); }

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Array.isArray(c.orders)) return c;
    } catch (e) { }
    return { at: 0, orders: [] };
  }
  function writeCache(orders) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), orders: orders || [] }));
  }

  /* ---------- JSONP (dự phòng khi CORS chặn) ---------- */
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = '__bbJsonp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var script = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, TIMEOUT);

      function cleanup() {
        clearTimeout(timer);
        delete global[name];
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      global[name] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () { cleanup(); reject(new Error('jsonp error')); };
      script.src = url + '&callback=' + name;
      document.head.appendChild(script);
    });
  }

  /* ---------- đọc ---------- */
  function read(action) {
    var url = withParams(action);
    return fetch(url, { method: 'GET', redirect: 'follow' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        return jsonp(url).catch(function () { throw err; });
      })
      .then(function (data) {
        if (!data || data.ok !== true) throw new Error((data && data.error) || 'Máy chủ từ chối yêu cầu');
        return data;
      });
  }

  /* ---------- ghi ----------
     Apps Script chặn CORS preflight nên dùng Content-Type đơn giản (text/plain).
     Nếu CORS chặn hoàn toàn thì gửi no-cors: vẫn tới máy chủ, chỉ không đọc được phản hồi. */
  function write(action, payload) {
    var url = withParams(action);
    var body = JSON.stringify(payload);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    }).then(function () {
      return { ok: true };
    }).catch(function () {
      return fetch(url, { method: 'POST', mode: 'no-cors', body: body, redirect: 'follow' })
        .then(function () { return { ok: true }; });
    });
  }

  /* ---------- API ---------- */
  function ping() {
    if (!isConfigured()) return Promise.reject(new Error('Chưa cấu hình máy chủ'));
    return read('ping');
  }

  function pushOrder(order) {
    var payload = BB.clone(order);
    payload.shop = config().shop || BB.shop().name;
    if (!isConfigured()) return Promise.resolve({ ok: false, skipped: true });
    return write('add', payload).catch(function (err) { return { ok: false, error: err.message }; });
  }

  function setStatus(id, status) {
    if (!isConfigured()) return Promise.resolve({ ok: false, skipped: true });
    return write('status', { id: id, status: status }).catch(function (err) { return { ok: false, error: err.message }; });
  }
  function deleteOrder(id) {
    if (!isConfigured()) return Promise.resolve({ ok: false, skipped: true });
    return write('delete', { id: id }).catch(function (err) { return { ok: false, error: err.message }; });
  }

  function listOrders() {
    if (!isConfigured()) return Promise.resolve({ ok: true, orders: [] });
    return read('list').then(function (data) {
      var orders = (data.orders || []).map(function (o) { o.remote = true; return o; });
      writeCache(orders);
      notify(orders);
      return { ok: true, orders: orders };
    });
  }

  function cachedOrders() { return readCache().orders; }
  function cacheAge() { return Date.now() - readCache().at; }

  /* ---------- hàng đợi + gửi lại ---------- */
  var listeners = [];
  function onSync(fn) { listeners.push(fn); }
  function notify(orders) { listeners.forEach(function (f) { try { f(orders); } catch (e) { console.error(e); } }); }

  function enqueue(order) {
    if (!isConfigured()) return;
    var q = readQueue();
    if (q.some(function (x) { return x.id === order.id; })) return;
    q.push(BB.clone(order));
    writeQueue(q);
    flush();
  }

  var flushing = false;
  function flush() {
    if (!isConfigured() || flushing) return Promise.resolve(0);
    var q = readQueue();
    if (!q.length) return Promise.resolve(0);
    flushing = true;
    var sent = 0;

    return q.reduce(function (chain, item) {
      return chain.then(function () {
        return pushOrder(item).then(function (res) {
          if (res && res.ok) {
            sent++;
            writeQueue(readQueue().filter(function (x) { return x.id !== item.id; }));
          }
        });
      });
    }, Promise.resolve())
      .then(function () { flushing = false; return sent; })
      .catch(function (err) { flushing = false; console.warn('[BBRemote] gửi lại thất bại', err); return sent; });
  }

  function pendingCount() { return readQueue().length; }

  /** Đẩy toàn bộ đơn đang lưu cục bộ (chưa có trên máy chủ) lên máy chủ. */
  function pushAllLocal() {
    if (!isConfigured()) return Promise.reject(new Error('Chưa cấu hình máy chủ'));
    var known = {};
    cachedOrders().forEach(function (o) { known[o.id] = true; });
    var todo = BB.orders().filter(function (o) { return !known[o.id]; });
    if (!todo.length) return Promise.resolve(0);
    todo.forEach(enqueue);
    return flush().then(function () { return todo.length; });
  }

  /* ---------- cấu hình cửa hàng (món, giá, màu, logo) ----------
     Chủ quán đẩy lên máy chủ; khách mở web là tự lấy về. */
  function readConf() {
    try {
      var c = JSON.parse(localStorage.getItem(CONF_KEY) || 'null');
      if (c && c.config && Date.now() - c.at < CONF_TTL) return c;
    } catch (e) { }
    return null;
  }

  function fetchConfig(force) {
    if (!isConfigured()) return Promise.resolve(null);
    var hit = force ? null : readConf();
    if (hit) return Promise.resolve(hit.config);
    return read('config').then(function (data) {
      if (!data.config) return null;
      try { localStorage.setItem(CONF_KEY, JSON.stringify({ at: Date.now(), config: data.config })); } catch (e) { }
      return data.config;
    }).catch(function () { return null; });
  }

  function pushConfig(config) {
    if (!isConfigured()) return Promise.reject(new Error('Chưa cấu hình máy chủ'));
    return write('saveConfig', { config: config }).then(function () {
      try { localStorage.setItem(CONF_KEY, JSON.stringify({ at: Date.now(), config: config })); } catch (e) { }
      return { ok: true };
    });
  }


  /* ---------- tự động gửi lại ---------- */
  if (typeof document !== 'undefined' && !global.__bbRemoteAuto) {
    global.__bbRemoteAuto = true;
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) flush();
    });
    global.addEventListener('online', function () { flush(); });
    setInterval(function () { if (pendingCount()) flush(); }, 60000);
    setTimeout(function () { flush(); }, 1500);
  }

  global.BBRemote = {
    config: config, saveConfig: saveConfig, isConfigured: isConfigured,
    ping: ping, listOrders: listOrders, cachedOrders: cachedOrders, cacheAge: cacheAge,
    pushOrder: pushOrder, pushAllLocal: pushAllLocal,
    setStatus: setStatus, deleteOrder: deleteOrder,
    fetchConfig: fetchConfig, pushConfig: pushConfig,
    enqueue: enqueue, flush: flush, pendingCount: pendingCount, onSync: onSync
  };
})(window);
