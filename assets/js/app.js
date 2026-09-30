/* ============================================================
   Trang bán hàng — logic
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = BB.money;

  var state = { cat: 'all', q: '', code: '' };
  try { state.code = sessionStorage.getItem('bunbo.code') || ''; } catch (e) { }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind) {
    var wrap = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 2400);
  }

  /* ---------- thông tin cửa hàng ---------- */
  function renderShop() {
    var s = BB.shop();
    $('#shopName').childNodes[0].nodeValue = s.name;
    $('#shopSlogan').textContent = s.slogan || '';
    $('#footName').textContent = s.name;
    $('#footAddr').textContent = s.address || '';
    $('#footOpen').textContent = s.open || '';
    $('#footPhone').textContent = s.phone || '';
    $('#footPhone').href = 'tel:' + String(s.phone || '').replace(/\s/g, '');
    document.title = s.name;
  }

  /* ---------- danh mục + lưới sản phẩm ---------- */
  function renderChips() {
    $('#chips').innerHTML = BB.categories().map(function (c) {
      return '<button class="chip' + (c.id === state.cat ? ' active' : '') + '" data-cat="' + esc(c.id) + '">' +
        (c.emoji || '') + ' ' + esc(c.name) + '</button>';
    }).join('');
  }

  function renderMenu() {
    var q = state.q.trim().toLowerCase();
    var items = BB.menu().filter(function (m) {
      if (!m.available) return false;
      if (state.cat !== 'all' && m.cat !== state.cat) return false;
      if (q && (m.name + ' ' + (m.desc || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    $('#menuGrid').innerHTML = items.map(function (m) {
      var off = m.oldPrice && m.oldPrice > m.price ? '<s>' + money(m.oldPrice) + '</s>' : '';
      return '' +
        '<article class="card">' +
        '<div class="card-thumb">' +
        (m.hot ? '<span class="badge">Bán chạy</span>' : '') +
        (m.image ? '<img alt="' + esc(m.name) + '" src="' + esc(m.image) + '" loading="lazy" />' : esc(m.emoji || '🛍️')) +
        '</div>' +
        '<div class="card-body">' +
        '<h3>' + esc(m.name) + '</h3>' +
        (m.desc ? '<p>' + esc(m.desc) + '</p>' : '<p></p>') +
        '<div class="price"><b>' + money(m.price) + '</b>' + off +
        '<span class="muted" style="font-size:12px">/ ' + esc(m.unit || 'phần') + '</span></div>' +
        '<div class="card-foot"><button class="btn sm" data-add="' + esc(m.id) + '">+ Thêm vào giỏ</button></div>' +
        '</div></article>';
    }).join('');

    $('#menuEmpty').classList.toggle('hidden', items.length > 0);
  }

  /* ---------- giỏ hàng ---------- */
  function renderCart() {
    var t = BB.totals(state.code);
    var n = BB.cartCount();

    $('#cartBadge').textContent = n;
    $('#cartBadge').style.display = n ? 'grid' : 'none';

    // thanh giỏ cố định dưới màn hình điện thoại
    $('#cartBar').classList.toggle('hidden', n === 0);
    document.body.classList.toggle('has-cart', n > 0);
    $('#barCount').textContent = n + ' món trong giỏ';
    $('#barTotal').textContent = money(t.total);

    var body = $('#cartBody');
    if (!t.items.length) {
      body.innerHTML = '<div class="empty"><span class="big">🛒</span>Giỏ hàng đang trống.</div>';
    } else {
      body.innerHTML = t.items.map(function (i) {
        return '' +
          '<div class="line">' +
          '<div class="thumb">' + (i.image ? '<img alt="" src="' + esc(i.image) + '" />' : (i.emoji || '🛍️')) + '</div>' +
          '<div><div class="name">' + esc(i.name) + '</div>' +
          '<div class="unit">' + money(i.price) + ' / ' + esc(i.unit) + '</div></div>' +
          '<div class="right">' +
          '<span class="sum">' + money(i.sum) + '</span>' +
          '<span class="qty"><button data-minus="' + esc(i.id) + '" aria-label="Bớt 1">−</button>' +
          '<b>' + i.qty + '</b><button data-plus="' + esc(i.id) + '" aria-label="Thêm 1">+</button></span>' +
          '<button class="icon-btn" data-del="' + esc(i.id) + '" title="Bỏ khỏi giỏ">✕</button>' +
          '</div></div>';
      }).join('');
    }

    var foot = $('#cartFoot');
    if (!t.items.length) { foot.innerHTML = ''; return; }

    foot.innerHTML = '' +
      '<div class="code-row">' +
      '<input id="codeInput" placeholder="Mã ưu đãi (nếu có)" value="' + esc(state.code) + '" />' +
      '<button class="btn ghost sm" id="codeApply">Dùng</button>' +
      '</div>' +
      (t.codeError ? '<div style="color:var(--accent);font-size:12.5px;margin:-4px 0 8px">✗ ' + esc(t.codeError) + '</div>' : '') +
      '<div class="totals">' +
      '<div class="row"><span>Tạm tính</span><span>' + money(t.sub) + '</span></div>' +
      (t.discount ? '<div class="row"><span>Ưu đãi' + (t.code ? ' (' + esc(t.code) + ')' : '') + '</span><span>−' + money(t.discount) + '</span></div>' : '') +
      '<div class="row"><span>Phí giao hàng</span><span>' + (t.ship ? money(t.ship) : 'Miễn phí') + '</span></div>' +
      '<div class="row grand"><span>Tổng cộng</span><b>' + money(t.total) + '</b></div>' +
      '</div>' +
      '<button class="btn block" id="toCheckout">Chốt đơn — ' + money(t.total) + '</button>';

    $('#codeInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCode(); });
  }

  function saveCode() {
    try {
      if (state.code) sessionStorage.setItem('bunbo.code', state.code);
      else sessionStorage.removeItem('bunbo.code');
    } catch (e) { }
  }

  function applyCode() {
    var v = ($('#codeInput').value || '').trim().toUpperCase();
    state.code = v;
    saveCode();
    renderCart();
    if (BB.applyCode(v)) toast('Đã dùng mã ' + v, 'ok');
    else if (v) toast('Mã ưu đãi không tồn tại', 'err');
  }

  function openCart() {
    $('#drawer').classList.add('on');
    $('#overlay').classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeAll() {
    $('#drawer').classList.remove('on');
    $('#overlay').classList.remove('on');
    $$('.modal.on').forEach(function (m) { m.classList.remove('on'); });
    document.body.style.overflow = '';
  }

  /* ---------- chốt đơn ---------- */
  function openCheckout() {
    var t = BB.totals(state.code);
    if (!t.items.length) return toast('Giỏ hàng đang trống', 'err');
    $('#orderSummary').innerHTML = t.items.map(function (i) {
      return '<div class="row"><span>' + (i.emoji || '') + ' ' + esc(i.name) + ' ×' + i.qty + '</span><b>' + money(i.sum) + '</b></div>';
    }).join('') +
      (t.discount ? '<div class="row"><span>Ưu đãi</span><b>−' + money(t.discount) + '</b></div>' : '') +
      '<div class="row"><span>Giao hàng</span><b>' + (t.ship ? money(t.ship) : 'Miễn phí') + '</b></div>' +
      '<div class="row grand" style="border-top:1px solid var(--line);margin-top:4px;padding-top:6px">' +
      '<span>Tổng</span><b style="color:var(--accent)">' + money(t.total) + '</b></div>';
    $('#checkoutModal').classList.add('on');
  }

  function fieldError(id, msg) {
    var f = $('#f-' + id);
    if (!f) return;
    f.classList.toggle('err', !!msg);
    f.querySelector('.msg').textContent = msg || '';
  }

  function submitOrder(e) {
    e.preventDefault();
    var info = {
      name: $('#cName').value, phone: $('#cPhone').value,
      address: $('#cAddress').value, note: $('#cNote').value,
      code: state.code
    };
    ['name', 'phone', 'address'].forEach(function (k) { fieldError(k, ''); });
    var res = BB.placeOrder(info);
    if (!res.ok) {
      Object.keys(res.errors).forEach(function (k) { fieldError(k, res.errors[k]); });
      toast('Vui lòng kiểm tra lại thông tin', 'err');
      return;
    }
    var o = res.order;
    $('#checkoutModal').classList.remove('on');
    $('#checkoutForm').reset();
    $('#doneCode').textContent = '#' + o.id;
    $('#doneDetail').innerHTML = o.items.map(function (i) {
      return '<div class="row"><span>' + esc(i.name) + ' ×' + i.qty + '</span><b>' + money(i.sum) + '</b></div>';
    }).join('') + '<div class="row grand" style="border-top:1px solid var(--line);margin-top:4px;padding-top:6px">' +
      '<span>Tổng</span><b style="color:var(--accent)">' + money(o.total) + '</b></div>';

    $('#sendWA').onclick = function () {
      window.open('https://wa.me/' + o.customer.phone.replace(/^0/, '84') +
        '?text=' + encodeURIComponent(orderText(o)), '_blank', 'noopener');
    };
    $('#copyOrder').onclick = function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(orderText(o)).then(function () { toast('Đã chép nội dung đơn', 'ok'); });
      } else toast('Trình duyệt không cho phép chép tự động', 'err');
    };

    var sent = $('#doneSent');
    if (window.BBRemote && BBRemote.isConfigured()) {
      BBRemote.enqueue(o);
      sent.textContent = 'Đơn đã gửi thẳng về chủ quán.';
    } else {
      sent.textContent = 'Chủ quán sẽ gọi bạn để xác nhận. Bạn cũng có thể chép nội dung đơn để gửi.';
    }
    $('#doneModal').classList.add('on');
    renderCart();
  }

  function orderText(o) {
    var s = BB.shop();
    return 'Đơn #' + o.id + ' — ' + s.name + '\n' +
      'Khách: ' + o.customer.name + ' — ' + o.customer.phone + '\n' +
      'Địa chỉ: ' + o.customer.address + '\n' +
      o.items.map(function (i) { return '- ' + i.name + ' x' + i.qty + ': ' + money(i.sum); }).join('\n') +
      '\nTạm tính: ' + money(o.sub) +
      (o.discount ? '\nƯu đãi ' + (o.code || '') + ': -' + money(o.discount) : '') +
      '\nGiao hàng: ' + (o.ship ? money(o.ship) : 'Miễn phí') +
      '\nTỔNG: ' + money(o.total) +
      (o.customer.note ? '\nGhi chú: ' + o.customer.note : '');
  }

  /* ---------- sự kiện ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-add],[data-cat],[data-plus],[data-minus],[data-del],[data-close],#openCart,#closeCart,#overlay,#toCheckout,#codeApply,#doneMenu,#barCheckout');
    if (!el) return;

    if (el.id === 'openCart' || el.id === 'barCheckout') return openCart();
    if (el.id === 'closeCart' || el.id === 'overlay') return closeAll();
    if (el.hasAttribute('data-close') || el.id === 'doneMenu') return closeAll();

    if (el.hasAttribute('data-cat')) {
      state.cat = el.getAttribute('data-cat');
      renderChips(); renderMenu();
      return;
    }
    if (el.hasAttribute('data-add')) {
      var r = BB.addToCart(el.getAttribute('data-add'), 1);
      return r.ok ? toast('Đã thêm ' + r.dish.name, 'ok') : toast(r.error, 'err');
    }
    if (el.hasAttribute('data-plus') || el.hasAttribute('data-minus')) {
      var id = el.getAttribute('data-plus') || el.getAttribute('data-minus');
      var line = BB.cart().filter(function (l) { return l.id === id; })[0];
      if (!line) return;
      BB.setQty(id, el.hasAttribute('data-plus') ? line.qty + 1 : line.qty - 1);
      return;
    }
    if (el.hasAttribute('data-del')) return BB.removeLine(el.getAttribute('data-del'));
    if (el.id === 'toCheckout') return openCheckout();
    if (el.id === 'codeApply') return applyCode();
  });

  $('#search').addEventListener('input', function (e) {
    state.q = e.target.value; renderMenu();
  });
  $('#checkoutForm').addEventListener('submit', submitOrder);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  /* ---------- khởi động ---------- */
  function paint() {
    renderShop();
    renderChips();
    renderMenu();
    renderCart();
    BB.applyBrand();
  }

  paint();
  BB.onChange(function () { renderCart(); BB.applyBrand(); });
  window.addEventListener('storage', function (e) {
    if (e.key === BB.STORAGE_KEYS.db || e.key === BB.STORAGE_KEYS.cart) location.reload();
  });

  // Lấy món/giá/màu mới nhất do chủ quán đẩy lên máy chủ (nếu đã cấu hình).
  if (window.BBRemote && BBRemote.isConfigured()) {
    BBRemote.fetchConfig().then(function (cfg) {
      if (cfg && BB.applyRemoteConfig(cfg).ok) paint();
    });
  }
})();
