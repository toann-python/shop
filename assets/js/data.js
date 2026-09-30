/* ============================================================
   BÚN BÒ HUẾ — Data layer (localStorage)
   Namespace: window.BB
   ============================================================ */
(function (global) {
  'use strict';

  var DB_KEY = 'bunbo.db.v1';
  var CART_KEY = 'bunbo.cart.v1';
  var SESSION_KEY = 'bunbo.session.v1';

  /* ---------- helpers ---------- */
  function now() { return new Date().toISOString(); }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function money(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  /* ---------- seed data ---------- */
  function seedMenu() {
    return [
      { id: 'm01', name: 'Bún bò Huế đặc biệt', cat: 'combo', price: 45000, oldPrice: 52000, unit: 'tô', emoji: '🍜', desc: 'Tô đầy topping: bò tươi, chả cua, giò heo, tôm, rau, nước dùng Huế thơm nồng.', hot: true, available: true },
      { id: 'm02', name: 'Bún bò bắp', cat: 'classic', price: 35000, oldPrice: 0, unit: 'tô', emoji: '🌽', desc: 'Bắp ngọt bùi, bò mềm, nước dùng ngọt thanh, ăn kèm rau muống và chanh.', hot: false, available: true },
      { id: 'm03', name: 'Bún bò gà', cat: 'classic', price: 35000, oldPrice: 0, unit: 'tô', emoji: '🐔', desc: 'Gà hầm gừng, tách xương, nấm và hành lá trên mặt nước trong.', hot: false, available: true },
      { id: 'm04', name: 'Bún mắm nêm', cat: 'classic', price: 38000, oldPrice: 0, unit: 'tô', emoji: '🥣', desc: 'Nước mắm pha nêm đậm đà, thịt bò xào, quế, lạc rang giòn rục.', hot: false, available: true },
      { id: 'm05', name: 'Bánh bèo bánh canh', cat: 'side', price: 25000, oldPrice: 28000, unit: 'phần', emoji: '🥟', desc: 'Bánh bèo cuốn tôm thịt, bánh canh giò heo nước ngọt.', hot: true, available: true },
      { id: 'm06', name: 'Nem lụi cuốn bánh tráng', cat: 'side', price: 55000, oldPrice: 0, unit: 'đĩa', emoji: '🌯', desc: 'Nem lụi cuốn bánh tráng, chấm mắm tôm gừng kiểu Huế.', hot: false, available: true },
      { id: 'm07', name: 'Chả bò xanh Vị', cat: 'side', price: 85000, oldPrice: 95000, unit: 'đĩa', emoji: '🥩', desc: 'Chả bò truyền thống thơm nồng, bán theo cân.', hot: false, available: true },
      { id: 'm08', name: 'Bò bít tết bún', cat: 'side', price: 79000, oldPrice: 0, unit: 'phần', emoji: '🥖', desc: 'Bò áp chảo sốt tiêu, kèm bánh mì và rau củ nướng.', hot: false, available: true },
      { id: 'm09', name: 'Nước hầm rau muống', cat: 'drink', price: 20000, oldPrice: 0, unit: 'ly', emoji: '🥬', desc: 'Rau muống cuộn trong nước ngọt, giải mát cùng tô bún.', hot: false, available: true },
      { id: 'm10', name: 'Trà đá', cat: 'drink', price: 10000, oldPrice: 0, unit: 'ly', emoji: '🧊', desc: 'Trà đá pha sẵn, mát lạnh.', hot: false, available: true },
      { id: 'm11', name: 'Combo đôi', cat: 'combo', price: 79000, oldPrice: 90000, unit: 'set', emoji: '🍱', desc: '2 tô bún bò Huế đặc biệt + chả cua cuốn bánh tráng, tiết kiệm 20%.', hot: true, available: true },
      { id: 'm12', name: 'Bún bò chay', cat: 'classic', price: 32000, oldPrice: 0, unit: 'tô', emoji: '🥗', desc: 'Bún bò chay đậm đà, nước dùng nấm và rau củ.', hot: false, available: false }
    ];
  }

  function seedDb() {
    return {
      version: 1,
      shop: {
        name: 'Bún Bò Huế Nhà Làm',
        slogan: 'Nước dùng ninh 6 tiếng, ăn một miếng là nhớ Huế',
        phone: '0909 123 456',
        address: '128 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
        open: '06:30 – 21:00 hằng ngày',
        shipFee: 15000,
        freeShipFrom: 250000,
        siteUrl: 'https://toann-python.github.io/shop/',
        logo: '',
        emoji: '🍜',
        theme: { accent: '#d92b1f', bg: '#ffffff', text: '#1f2937' }
      },
      remote: { url: '', token: '', shop: '' },
      categories: [
        { id: 'all', name: 'Tất cả', emoji: '🍽️' },
        { id: 'combo', name: 'Combo', emoji: '🍱' },
        { id: 'classic', name: 'Bún bò', emoji: '🍜' },
        { id: 'side', name: 'Món ăn kèm', emoji: '🥢' },
        { id: 'drink', name: 'Thức uống', emoji: '🥤' }
      ],
      codes: {
        BUNBO10: { type: 'percent', value: 10, note: 'Giảm 10%' },
        FREESHIP: { type: 'ship', value: 0, note: 'Miễn phí giao hàng' },
        GIAM20K: { type: 'fixed', value: 20000, note: 'Giảm thẳng 20.000đ' }
      },
      menu: seedMenu(),
      orders: []
    };
  }

  /* ---------- persistence ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) { var fresh = seedDb(); persist(fresh); return fresh; }
      var data = JSON.parse(raw);
      var base = seedDb();
      var db = {
        version: 1,
        shop: Object.assign({}, base.shop, data.shop || {}),
        categories: (data.categories && data.categories.length) ? data.categories : base.categories,
        codes: data.codes || {},
        menu: Array.isArray(data.menu) ? data.menu : base.menu,
        orders: Array.isArray(data.orders) ? data.orders : [],
        remote: Object.assign({}, base.remote, data.remote || {})
      };
      return db;
    } catch (e) {
      console.warn('[BB] db hỏng, khôi phục dữ liệu mặc định', e);
      var fresh = seedDb(); persist(fresh); return fresh;
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data || load()));
    } catch (e) {
      throw new Error('Không lưu được: trình duyệt đã đầy chỗ (ảnh món quá nặng?). Xoá bớt ảnh hoặc dùng link ảnh thay vì tải lên.');
    }
  }

  var cache = null;
  function db() { if (!cache) cache = load(); return cache; }
  function commit() { persist(cache); applyTheme(); notify(); }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function notify() {
    listeners.forEach(function (fn) {
      try { fn(db()); } catch (e) { console.error(e); }
    });
  }

  /* ---------- auth ---------- */
  // Tài khoản chủ quán: admin / 070608 — đổi trực tiếp ở đây rồi đẩy lên web.
  function signIn(user, pass) {
    if (user === 'admin' && pass === '070608') {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: 'admin', at: Date.now(), until: Date.now() + 8 * 3600e3
      }));
      return { ok: true, user: 'admin' };
    }
    return { ok: false, error: 'Sai tài khoản hoặc mật khẩu.' };
  }
  function signOut() { localStorage.removeItem(SESSION_KEY); }
  function session() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.until && s.until > Date.now()) return s;
      if (s) localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* session rác -> coi như chưa đăng nhập */ }
    return null;
  }
  function isAdmin() { return !!session(); }

  /* ---------- menu ---------- */
  function menu() { return db().menu; }
  function findDish(id) {
    return db().menu.filter(function (m) { return m.id === id; })[0] || null;
  }
  function saveDish(d) {
    if (!d.id) d.id = uid('m');
    if (!d.name || !String(d.name).trim()) d.name = 'Món mới';
    d.price = Math.max(0, Math.round(Number(d.price) || 0));
    d.oldPrice = Math.max(0, Math.round(Number(d.oldPrice) || 0));
    if (d.oldPrice && d.oldPrice <= d.price) d.oldPrice = 0;
    d.hot = !!d.hot;
    d.available = d.available !== false;
    d.image = normalizeImage(d.image);
    var list = db().menu;
    var i = list.findIndex(function (m) { return m.id === d.id; });
    if (i >= 0) list[i] = d; else list.push(d);
    commit();
    return d;
  }

  /** Ảnh món: data URL (tải lên) hoặc link http(s) bên ngoài; rỗng thì dùng emoji. */
  function normalizeImage(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (/^data:image\//i.test(v)) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return '';
  }
  function deleteDish(id) {
    var arr = db().menu;
    var i = arr.findIndex(function (m) { return m.id === id; });
    if (i >= 0) { arr.splice(i, 1); commit(); }
  }

  /* ---------- cart ---------- */
  function readCart() {
    try {
      var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(c) ? c.filter(function (l) { return l && l.id; }) : [];
    } catch (e) { return []; }
  }
  function writeCart(lines) { localStorage.setItem(CART_KEY, JSON.stringify(lines || [])); }

  function addToCart(id, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var dish = findDish(id);
    if (!dish || !dish.available) return { ok: false, error: 'Món này tạm hết hàng.' };
    var lines = readCart();
    var line = lines.filter(function (l) { return l.id === id; })[0];
    if (line) line.qty += qty; else lines.push({ id: id, qty: qty, note: '' });
    writeCart(lines);
    notify();
    return { ok: true, dish: dish };
  }
  function setQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    var lines = readCart()
      .filter(function (l) { return l.id === id; })
      .map(function (l) { l.qty = qty; return l; });
    writeCart(lines.filter(function (l) { return l.qty > 0; }));
    notify();
  }
  function removeLine(id) { setQty(id, 0); }
  function clearCart() { writeCart([]); notify(); }
  function cartCount() {
    return readCart().reduce(function (s, l) { return s + (l.qty || 0); }, 0);
  }

  /* ---------- totals ---------- */
  function applyCode(code) {
    if (!code) return null;
    var table = db().codes;
    return table[String(code).trim().toUpperCase()] || null;
  }

  function totals(code) {
    var shop = db().shop;
    var items = readCart().map(function (l) {
      var d = findDish(l.id);
      if (!d) return null;
      return {
        id: d.id, name: d.name, emoji: d.emoji, image: d.image || '', unit: d.unit,
        price: d.price, qty: l.qty, sum: d.price * l.qty
      };
    }).filter(Boolean);

    var sub = items.reduce(function (s, i) { return s + i.sum; }, 0);
    var c = applyCode(code);
    var discount = 0, freeShip = false;
    if (c) {
      if (c.type === 'percent') discount = Math.round(sub * (c.value / 100));
      if (c.type === 'fixed') discount = Math.min(sub, c.value);
      if (c.type === 'ship') freeShip = true;
    }
    var ship = items.length === 0 ? 0
      : (freeShip || sub >= shop.freeShipFrom ? 0 : shop.shipFee);

    return {
      items: items,
      count: items.reduce(function (s, i) { return s + i.qty; }, 0),
      sub: sub,
      discount: discount,
      ship: ship,
      total: Math.max(0, sub - discount) + ship,
      code: c ? String(code).trim().toUpperCase() : '',
      codeError: (c ? '' : (code ? 'Mã ưu đãi không tồn tại' : '')),
      freeShipLeft: Math.max(0, shop.freeShipFrom - sub)
    };
  }

  /* ---------- orders ---------- */
  function validPhone(p) {
    return /^0\d{9,10}$/.test(String(p || '').replace(/[\s.\-()]/g, ''));
  }

  function placeOrder(info) {
    var errs = {};
    if (!info.name || String(info.name).trim().length < 2) errs.name = 'Vui lòng nhập họ tên';
    if (!validPhone(info.phone)) errs.phone = 'Số điện thoại không hợp lệ (10–11 số, bắt đầu bằng 0)';
    if (!info.address || String(info.address).trim().length < 5) errs.address = 'Vui lòng nhập địa chỉ nhận hàng';
    if (Object.keys(errs).length) return { ok: false, errors: errs };

    var t = totals(info.code);
    if (!t.items.length) return { ok: false, errors: { cart: 'Giỏ hàng đang trống' } };

    var order = {
      id: 'BB' + Date.now().toString().slice(-8),
      at: now(),
      customer: {
        name: String(info.name).trim(),
        phone: String(info.phone).replace(/\s/g, ''),
        address: String(info.address).trim(),
        note: String(info.note || '').trim()
      },
      items: t.items.map(function (i) {
        return { id: i.id, name: i.name, price: i.price, qty: i.qty, sum: i.sum };
      }),
      sub: t.sub, discount: t.discount, ship: t.ship, total: t.total,
      code: t.code, status: 'new'
    };
    db().orders.unshift(order);
    commit();
    clearCart();
    return { ok: true, order: order };
  }

  function orders() { return db().orders; }
  function setStatus(id, status) {
    var arr = db().orders;
    var i = arr.findIndex(function (o) { return o.id === id; });
    if (i >= 0) { arr[i].status = status; commit(); }
  }
  function deleteOrder(id) {
    var arr = db().orders;
    var i = arr.findIndex(function (o) { return o.id === id; });
    if (i >= 0) { arr.splice(i, 1); commit(); }
  }

  /* ---------- màu sắc giao diện ----------
     Chủ quán chọn 3 màu: màu nhấn (nút, giá), màu nền, màu chữ.
     Mọi màu còn lại (viền, chữ phụ, nền ô nhập) tự suy ra từ 3 màu này. */
  function hex2rgb(h) {
    h = String(h || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map(function (n) {
      return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
    }).join('');
  }
  /** Trộn 2 màu: t = 0 -> a, t = 1 -> b. */
  function mix(a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    if (!x || !y) return a;
    return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  function normHex(v, fallback) { var c = hex2rgb(v); return c ? rgb2hex(c[0], c[1], c[2]) : fallback; }

  var THEME_PRESETS = {
    plain: { name: 'Đơn giản', accent: '#d92b1f', bg: '#ffffff', text: '#1f2937' },
    green: { name: 'Xanh lá', accent: '#17794a', bg: '#ffffff', text: '#16281f' },
    blue: { name: 'Xanh dương', accent: '#1d4ed8', bg: '#f7f9ff', text: '#16213e' },
    dark: { name: 'Tối', accent: '#f5a524', bg: '#16181d', text: '#eef0f4' }
  };

  function theme() {
    var t = db().shop.theme || {};
    return {
      accent: normHex(t.accent, THEME_PRESETS.plain.accent),
      bg: normHex(t.bg, THEME_PRESETS.plain.bg),
      text: normHex(t.text, THEME_PRESETS.plain.text)
    };
  }

  /** Đổ 3 màu lên biến CSS để toàn trang đổi màu theo. */
  function applyTheme() {
    if (typeof document === 'undefined') return null;
    var t = theme();
    var st = document.documentElement.style;
    st.setProperty('--accent', t.accent);
    st.setProperty('--accent-dk', mix(t.accent, '#000000', 0.25));
    st.setProperty('--accent-soft', mix(t.accent, t.bg, 0.88));
    st.setProperty('--bg', t.bg);
    st.setProperty('--surface', mix(t.bg, t.text, 0.03));
    st.setProperty('--bg-soft', mix(t.bg, t.text, 0.06));
    st.setProperty('--text', t.text);
    st.setProperty('--muted', mix(t.text, t.bg, 0.45));
    st.setProperty('--line', mix(t.text, t.bg, 0.85));
    return t;
  }

  /** Phần dữ liệu chủ quán gửi lên máy chủ để mọi khách đều thấy. */
  function publicConfig() {
    var d = db();
    return { shop: d.shop, menu: d.menu, categories: d.categories, codes: d.codes };
  }

  /** Nhận cấu hình từ máy chủ, giữ nguyên đơn hàng và cấu hình riêng của máy. */
  function applyRemoteConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return { ok: false, error: 'Máy chủ chưa có cấu hình' };
    var d = db();
    if (cfg.shop && typeof cfg.shop === 'object') d.shop = Object.assign({}, d.shop, cfg.shop);
    if (Array.isArray(cfg.menu) && cfg.menu.length) d.menu = cfg.menu;
    if (Array.isArray(cfg.categories) && cfg.categories.length) d.categories = cfg.categories;
    if (cfg.codes && typeof cfg.codes === 'object') d.codes = cfg.codes;
    commit();
    return { ok: true };
  }

  /* ---------- thương hiệu: logo + emoji ---------- */
  /** Vẽ logo/emoji vào mọi ô đánh dấu [data-brand-mark] và đổi favicon. */
  function applyBrand() {
    if (typeof document === 'undefined') return;
    var s = db().shop;
    var logo = s.logo || '';
    var emoji = s.emoji || '🍜';
    Array.prototype.forEach.call(document.querySelectorAll('[data-brand-mark]'), function (el) {
      el.innerHTML = logo ? '<img alt="" src="' + logo + '" />' : esc(emoji);
      el.classList.toggle('has-img', !!logo);
    });
    if (logo) {
      var icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.href = logo;
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- data management ---------- */
  function exportJSON() { return JSON.stringify(db(), null, 2); }
  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || !Array.isArray(data.menu)) throw new Error('File không đúng định dạng menu');
    cache = Object.assign(seedDb(), data);
    commit();
  }
  function resetMenu() {
    var d = db();
    d.menu = seedMenu();
    d.categories = seedDb().categories;
    d.codes = seedDb().codes;
    commit();
  }
  function resetAll() { cache = seedDb(); commit(); }
  // Mọi trang dùng data.js đều lấy màu đã lưu ngay khi mở.
  if (typeof document !== 'undefined') applyTheme();


  global.BB = {
    db: db, commit: commit, onChange: onChange,
    now: now, uid: uid, money: money, clone: clone,
    shop: function () { return db().shop; },
    categories: function () { return db().categories; },
    codes: function () { return db().codes; },
    applyBrand: applyBrand, esc: esc,
    signIn: signIn, signOut: signOut, session: session, isAdmin: isAdmin,
    menu: menu, findDish: findDish, saveDish: saveDish, deleteDish: deleteDish,
    cart: readCart, addToCart: addToCart, setQty: setQty,
    removeLine: removeLine, clearCart: clearCart, cartCount: cartCount,
    totals: totals, applyCode: applyCode, validPhone: validPhone,
    placeOrder: placeOrder, orders: orders, setStatus: setStatus, deleteOrder: deleteOrder,
    applyTheme: applyTheme, theme: theme, themePresets: THEME_PRESETS,
    publicConfig: publicConfig, applyRemoteConfig: applyRemoteConfig,
    exportJSON: exportJSON, importJSON: importJSON, resetMenu: resetMenu, resetAll: resetAll,
    STORAGE_KEYS: { db: DB_KEY, cart: CART_KEY, session: SESSION_KEY }
  };
})(window);
