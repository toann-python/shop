/* ============================================================
   KHU VỰC CHỦ QUÁN — logic
   Đăng nhập: xem hàm signIn() trong assets/js/data.js
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = BB.money;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 2200);
  }

  function closeModal(m) { $(m).classList.remove('on'); document.body.style.overflow = ''; }
  function openModal(m) { $(m).classList.add('on'); document.body.style.overflow = 'hidden'; }

  /* ---------------- LOGIN ---------------- */
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var r = BB.signIn($('#lUser').value.trim(), $('#lPass').value);
    if (!r.ok) { $('#loginErr').textContent = r.error; return; }
    $('#loginErr').textContent = '';
    $('#lPass').value = '';
    boot();
  });

  $('#logout').addEventListener('click', function () {
    BB.signOut();
    $('#adminView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    toast('Đã đăng xuất');
  });

  $('#viewSite').addEventListener('click', function () { window.open('index.html', '_blank'); });

  /* ---------------- TABS ---------------- */
  var TABS = ['dish', 'order', 'qr', 'shop'];
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    var t = b.getAttribute('data-tab');
    TABS.forEach(function (x) {
      $('[data-tab="' + x + '"]').classList.toggle('on', x === t);
      $('[data-panel="' + x + '"]').classList.toggle('hidden', x !== t);
    });
    if (t === 'qr') drawQR();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal('#' + e.target.closest('.modal').id);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.modal.on').forEach(function (m) { closeModal('#' + m.id); });
  });

  /* ---------------- MÓN ĂN ---------------- */
  var dishFilter = 'all', dishSearch = '';

  function renderDishFilter() {
    $('#dishFilter').innerHTML = BB.categories().map(function (c) {
      return '<button class="chip' + (c.id === dishFilter ? ' active' : '') + '" data-dcat="' + c.id + '">' +
        (c.emoji || '') + ' ' + esc(c.name) + '</button>';
    }).join('');
  }

  function catName(id) {
    var c = BB.categories().filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }

  function renderDishes() {
    var q = dishSearch.trim().toLowerCase();
    var rows = BB.menu().filter(function (m) {
      if (dishFilter !== 'all' && m.cat !== dishFilter) return false;
      if (q && m.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    $('#dishRows').innerHTML = rows.length ? rows.map(function (m) {
      return '<tr>' +
        '<td><div style="display:flex;gap:10px;align-items:center">' +
        '<div class="tbl-thumb">' + (m.image ? '<img alt="" src="' + esc(m.image) + '" />' : (esc(m.emoji) || '🍽️')) + '</div>' +
        '<div><b>' + esc(m.name) + '</b>' + (m.hot ? ' <span class="badge" style="position:static">🔥</span>' : '') +
        '<div class="muted" style="font-size:12px">' + esc(m.desc || '') + '</div></div></div></td>' +
        '<td>' + esc(catName(m.cat)) + '</td>' +
        '<td style="white-space:nowrap"><input class="price-edit" type="number" min="0" step="500" value="' + m.price + '" data-price="' + m.id + '" />' +
        ' <span class="muted" style="font-size:12px">/ ' + esc(m.unit || 'phần') + '</span></td>' +
        '<td><label style="display:flex;gap:6px;align-items:center;cursor:pointer">' +
        '<input type="checkbox" data-avail="' + m.id + '" ' + (m.available ? 'checked' : '') + ' style="width:auto" />' +
        (m.available ? 'Đang bán' : 'Tạm ẩn') + '</label></td>' +
        '<td class="num"><button class="btn ghost sm" data-edit="' + m.id + '">Sửa</button> ' +
        '<button class="btn ghost sm" data-del="' + m.id + '">Xoá</button></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5" class="center muted">Chưa có sản phẩm nào. Bấm “+ Thêm sản phẩm”.</td></tr>';
  }

  function fillCatSelect(sel) {
    sel.innerHTML = BB.categories().filter(function (c) { return c.id !== 'all'; })
      .map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
  }

  /* ---------------- ẢNH: dùng chung cho món và logo ---------------- */
  var draftImage = '';   // ảnh món đang sửa (data URL hoặc link http/s)

  /** Đọc file ảnh, thu nhỏ về `max` px rồi nén để localStorage không đầy. */
  function loadImageFile(file, max, done) {
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast('Chỉ nhận file ảnh (jpg, png, webp…)', 'err');
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var out = '';
        try { out = c.toDataURL('image/webp', 0.8); } catch (err) { out = ''; }
        if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
        done(out);
        toast('Đã nạp ảnh (' + Math.round(out.length / 1024) + ' KB)', 'ok');
      };
      img.onerror = function () { toast('Không đọc được ảnh này', 'err'); };
      img.src = fr.result;
    };
    fr.onerror = function () { toast('Không đọc được file', 'err'); };
    fr.readAsDataURL(file);
  }

  /** Gắn bộ chọn ảnh cho một cặp input/URL/preview. */
  function wireImagePicker(ids, opts) {
    var state = { value: opts.initial || '' };
    function paint() {
      var box = $(ids.prev);
      box.innerHTML = state.value ? '<img alt="" src="' + esc(state.value) + '" />' : esc(opts.fallback ? opts.fallback() : '🖼');
    }
    function set(v) { state.value = v || ''; paint(); }

    $(ids.pick).addEventListener('click', function () { $(ids.file).click(); });
    $(ids.file).addEventListener('change', function (e) {
      loadImageFile(e.target.files[0], opts.max || 640, function (dataUrl) {
        set(dataUrl);
        $(ids.url).value = '';
        opts.onChange(state.value);
      });
    });
    $(ids.clear).addEventListener('click', function () {
      $(ids.file).value = '';
      $(ids.url).value = '';
      set('');
      opts.onChange('');
    });
    var timer = null;
    $(ids.url).addEventListener('input', function (e) {
      var v = e.target.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () {
        // chỉ nhận link có tên miền đủ, tránh tải ảnh khi mới gõ dở
        set(/^https?:\/\/[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v) ? v : '');
        opts.onChange(state.value);
      }, 500);
    });
    if (opts.emojiField) {
      $(opts.emojiField).addEventListener('input', function () { if (!state.value) paint(); });
    }
    set(state.value);
    return { set: set, paint: paint, value: function () { return state.value; } };
  }

  var dishImage = wireImagePicker(
    { pick: '#dImgPick', file: '#dImgFile', url: '#dImgUrl', clear: '#dImgClear', prev: '#dPrev' },
    { max: 640, emojiField: '#dEmoji', fallback: function () { return $('#dEmoji').value.trim() || '🍽️'; },
      onChange: function (v) { draftImage = v; } }
  );

  var logoPicker = wireImagePicker(
    { pick: '#lImgPick', file: '#lImgFile', url: '#lImgUrl', clear: '#lImgClear', prev: '#lPrev' },
    { max: 256, fallback: function () { return ($('#sEmoji').value || '').trim() || '🍜'; },
      onChange: function (v) { BB.shop().logo = v; BB.applyBrand(); } }
  );

  function openDishForm(id) {
    var m = id ? BB.findDish(id) : null;
    $('#dishModalTitle').textContent = m ? 'Sửa sản phẩm: ' + m.name : 'Thêm sản phẩm mới';
    fillCatSelect($('#dCat'));
    if (m) $('#dCat').value = m.cat;
    $('#dName').value = m ? m.name : '';
    $('#dDesc').value = m ? (m.desc || '') : '';
    $('#dPrice').value = m ? m.price : '';
    $('#dOld').value = m ? (m.oldPrice || '') : '';
    $('#dEmoji').value = m ? (m.emoji || '') : '🍜';
    $('#dUnit').value = m ? (m.unit || 'phần') : 'tô';
    draftImage = m ? (m.image || '') : '';
    $('#dImgUrl').value = draftImage && /^https?:/i.test(draftImage) ? draftImage : '';
    $('#dImgFile').value = '';
    dishImage.set(draftImage);
    $('#dHot').checked = m ? !!m.hot : false;
    $('#dAvail').checked = m ? m.available !== false : true;
    $('#dishForm').dataset.id = m ? m.id : '';
    openModal('#dishModal');
    setTimeout(function () { $('#dName').focus(); }, 60);
  }

  $('#addDish').addEventListener('click', function () { openDishForm(null); });

  $('#dishForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#dName').value.trim();
    if (name.length < 2) { toast('Tên món phải có ít nhất 2 ký tự', 'err'); $('#dName').focus(); return; }
    if (!(Number($('#dPrice').value) > 0)) { toast('Giá bán phải lớn hơn 0', 'err'); $('#dPrice').focus(); return; }
    var id = e.target.dataset.id;
    var old = id ? BB.findDish(id) : null;
    var payload = {
      id: id || null,
      name: name,
      cat: $('#dCat').value,
      desc: $('#dDesc').value.trim(),
      price: Number($('#dPrice').value),
      oldPrice: Number($('#dOld').value) || 0,
      emoji: $('#dEmoji').value.trim() || '🍽️',
      unit: $('#dUnit').value.trim() || 'phần',
      hot: $('#dHot').checked,
      available: $('#dAvail').checked,
      image: draftImage
    };
    try {
      BB.saveDish(payload);
    } catch (err) {
      toast(err.message, 'err');
      return;
    }
    closeModal('#dishModal');
    toast(id ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm', 'ok');
    renderDishes();
  });

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-dcat]');
    if (f) { dishFilter = f.getAttribute('data-dcat'); renderDishFilter(); renderDishes(); return; }

    var ed = e.target.closest('[data-edit]');
    if (ed) return openDishForm(ed.getAttribute('data-edit'));

    var del = e.target.closest('[data-del]');
    if (del) {
      var m = BB.findDish(del.getAttribute('data-del'));
      if (!m) return;
      if (!confirm('Xoá món "' + m.name + '" khỏi thực đơn?')) return;
      BB.deleteDish(m.id);
      renderDishes();
      toast('Đã xoá món');
    }
  });

  document.addEventListener('change', function (e) {
    var av = e.target.closest('[data-avail]');
    if (av) {
      var m = BB.findDish(av.getAttribute('data-avail'));
      if (m) { m.available = av.checked; BB.commit(); renderDishes(); toast(av.checked ? 'Đã bán món này' : 'Đã tạm ẩn món', 'ok'); }
      return;
    }
    var pr = e.target.closest('[data-price]');
    if (pr) {
      var d = BB.findDish(pr.getAttribute('data-price'));
      var v = Math.max(0, Math.round(Number(pr.value) || 0));
      if (!d || d.price === v) return;
      if (!v) { pr.value = d.price; return toast('Giá phải lớn hơn 0', 'err'); }
      d.price = v; BB.commit();
      pr.value = v;
      toast('Giá "' + d.name + '" → ' + money(v), 'ok');
    }
  });

  document.addEventListener('keydown', function (e) {
    var pr = e.target.closest('[data-price]');
    if (pr && e.key === 'Enter') pr.blur();
  });
  $('#dishSearch').addEventListener('input', function (e) { dishSearch = e.target.value; renderDishes(); });

  /* ---------------- ĐƠN HÀNG ---------------- */
  var STATUS = { new: 'Mới', cooking: 'Đang nấu', done: 'Hoàn tất', cancel: 'Đã huỷ' };

  /** Đơn trên máy chủ (☁️) và đơn còn nằm cục bộ (📱), gộp theo mã, ưu tiên bản máy chủ. */
  function allOrders() {
    var map = {};
    BB.orders().forEach(function (o) { map[o.id] = Object.assign({}, o, { source: 'local' }); });
    BBQR_REMOTE().cachedOrders().forEach(function (o) { map[o.id] = Object.assign({}, o, { source: 'remote' }); });
    return Object.keys(map)
      .map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  }
  function BBQR_REMOTE() { return window.BBRemote || { cachedOrders: function () { return []; }, isConfigured: function () { return false; } }; }

  function renderOrders() {
    var list = allOrders();
    var today = new Date().toDateString();
    var sumToday = list.filter(function (o) { return new Date(o.at).toDateString() === today; })
      .reduce(function (s, o) { return s + o.total; }, 0);
    var newCount = list.filter(function (o) { return o.status === 'new'; }).length;

    $('#kpi').innerHTML = '' +
      box(list.length, 'tổng đơn') +
      box(newCount, 'đơn chờ xử lý') +
      box(money(sumToday), 'doanh thu hôm nay') +
      box(money(list.reduce(function (s, o) { return s + o.total; }, 0)), 'tổng doanh thu');

    $('#newOrderCount').innerHTML = newCount ? '<span class="pill st-new">' + newCount + ' mới</span>' : '';

    $('#orderRows').innerHTML = list.length ? list.map(function (o) {
      var tag = o.source === 'remote'
        ? '<span class="pill st-done" title="Đơn đã về máy chủ">☁️ server</span>'
        : '<span class="pill" title="Chỉ có trên máy này">📱 máy này</span>';
      return '<td><b>' + o.id + '</b> ' + tag +
        '<div class="muted" style="font-size:12px">' + new Date(o.at).toLocaleString('vi-VN') + '</div></td>' +
        '<td><b>' + esc(o.customer.name) + '</b><div class="muted" style="font-size:12px">' + esc(o.customer.phone) + '</div>' +
        '<div class="muted" style="font-size:12px;max-width:230px">' + esc(o.customer.address) + '</div></td>' +
        '<td style="max-width:240px">' + o.items.map(function (i) { return esc(i.name) + ' ×' + i.qty; }).join('<br />') + '</td>' +
        '<td class="num"><b>' + money(o.total) + '</b>' + (o.code ? '<div class="muted" style="font-size:12px">' + o.code + '</div>' : '') + '</td>' +
        '<td><select class="price-edit" data-status="' + o.id + '">' +
        Object.keys(STATUS).map(function (k) {
          return '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>';
        }).join('') + '</select></td>' +
        '<td class="num"><button class="btn ghost sm" data-odetail="' + o.id + '">Chi tiết</button> ' +
        '<button class="btn ghost sm" data-odel="' + o.id + '">Xoá</button></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6" class="center muted">Chưa có đơn nào. Mở trang bán hàng và đặt một đơn thử.</td></tr>';
  }

  function box(v, l) { return '<div class="box"><b>' + v + '</b><span>' + l + '</span></div>'; }

  function openOrder(id) {
    var o = allOrders().filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    $('#orderSheet').innerHTML = '' +
      '<div class="sheet-head"><h3>Đơn #' + o.id + '</h3><button class="icon-btn" data-close>✕</button></div>' +
      '<p class="muted" style="margin:0 0 10px">' + new Date(o.at).toLocaleString('vi-VN') + ' · Trạng thái: <b>' +
      (STATUS[o.status] || o.status) + '</b></p>' +
      '<div class="mini-order">' +
      '<div class="row" style="display:flex;justify-content:space-between"><span>Khách</span><b>' + esc(o.customer.name) + '</b></div>' +
      '<div class="row" style="display:flex;justify-content:space-between"><span>Điện thoại</span><a href="tel:' + o.customer.phone + '"><b>' + o.customer.phone + '</b></a></div>' +
      '<div class="row" style="display:flex;justify-content:space-between"><span>Địa chỉ</span><b style="max-width:65%;text-align:right">' + esc(o.customer.address) + '</b></div>' +
      (o.customer.note ? '<div class="row" style="display:flex;justify-content:space-between"><span>Ghi chú</span><b style="max-width:65%;text-align:right">' + esc(o.customer.note) + '</b></div>' : '') +
      '</div>' +
      '<div class="mini-order">' +
      o.items.map(function (i) {
        return '<div class="row" style="display:flex;justify-content:space-between"><span>' + esc(i.name) + ' ×' + i.qty +
          '</span><b>' + money(i.sum) + '</b></div>';
      }).join('') +
      '<div class="row" style="display:flex;justify-content:space-between"><span>Tạm tính</span><span>' + money(o.sub) + '</span></div>' +
      (o.discount ? '<div class="row" style="display:flex;justify-content:space-between"><span>Ưu đãi' + (o.code ? ' ' + o.code : '') + '</span><span>−' + money(o.discount) + '</span></div>' : '') +
      '<div class="row" style="display:flex;justify-content:space-between"><span>Giao hàng</span><span>' + (o.ship ? money(o.ship) : 'Miễn phí') + '</span></div>' +
      '<div class="row" style="display:flex;justify-content:space-between;font-size:18px;border-top:1px solid var(--line);padding-top:8px"><b>Tổng</b><b style="color:var(--accent)">' + money(o.total) + '</b></div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<a class="btn green" href="tel:' + o.customer.phone + '">📞 Gọi khách</a>' +
      '<a class="btn ghost" target="_blank" href="https://maps.google.com/?q=' + encodeURIComponent(o.customer.address) + '">🗺️ Mở bản đồ</a>' +
      '<button class="btn ghost" data-close>Đóng</button>' +
      '</div>';
    openModal('#orderModal');
  }

  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-odetail]');
    if (d) return openOrder(d.getAttribute('data-odetail'));
    var x = e.target.closest('[data-odel]');
    if (x) {
      var id = x.getAttribute('data-odel');
      if (!confirm('Xoá đơn ' + id + '?')) return;
      var order = allOrders().filter(function (o) { return o.id === id; })[0];
      BB.deleteOrder(id);
      if (order && order.source === 'remote') BBQR_REMOTE().deleteOrder(id).then(function () { return syncOrders(true); });
      renderOrders();
      toast('Đã xoá đơn');
    }
  });

  document.addEventListener('change', function (e) {
    var s = e.target.closest('[data-status]');
    if (!s) return;
    var id = s.getAttribute('data-status');
    var order = allOrders().filter(function (o) { return o.id === id; })[0];
    BB.setStatus(id, s.value);
    if (order && order.source === 'remote') {
      BBQR_REMOTE().setStatus(id, s.value).then(function () { syncOrders(true); });
    }
    renderOrders();
    toast('Đã cập nhật trạng thái', 'ok');
  });

  /* ---------------- QR ---------------- */
  function defaultUrl() {
    var s = BB.shop();
    if (s.siteUrl) return s.siteUrl;
    if (location.protocol === 'file:') return '';
    return location.origin + location.pathname.replace(/admin\.html$/, '');
  }

  function drawQR() {
    var v = $('#qrUrl').value.trim();
    if (!v) {
      v = defaultUrl();
      $('#qrUrl').value = v || '(chưa có địa chỉ — hãy dán link web của bạn)';
      if (!v) return;
    }
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (!/^https?:\/\/[\w-]+(\.[\w-]+)+/i.test(v)) {
      toast('Địa chỉ web chưa đúng — QR sẽ không quét được. Ví dụ: https://tenban.github.io/bunbo/', 'err');
      return;
    }
    try {
      var info = BBQR.draw($('#qrCanvas'), v, { size: 520, ec: 'M' });
      $('#qrPoster').href = 'poster.html?u=' + encodeURIComponent(v);
    } catch (err) {
      toast('Không tạo được mã QR: ' + err.message, 'err');
    }
  }

  $('#qrRedraw').addEventListener('click', drawQR);
  $('#qrDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = BBQR.toPNG($('#qrCanvas'));
    a.download = 'qr-bun-bo.png';
    a.click();
    toast('Đã tải ảnh PNG', 'ok');
  });
  $('#qrCopy').addEventListener('click', function () {
    var v = $('#qrUrl').value.trim();
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast('Đã sao chép link', 'ok'); });
    else toast('Không sao chép được, hãy copy tay: ' + v, 'err');
  });

  /* ---------------- CỬA HÀNG ---------------- */
  function fillShop() {
    var s = BB.shop();
    $('#sName').value = s.name; $('#sPhone').value = s.phone; $('#sSlogan').value = s.slogan;
    $('#sAddr').value = s.address; $('#sOpen').value = s.open; $('#sSite').value = s.siteUrl || '';
    $('#sShip').value = s.shipFee; $('#sFree').value = s.freeShipFrom;
    $('#sEmoji').value = s.emoji || '🍜';
    $('#lImgUrl').value = s.logo && /^https?:/i.test(s.logo) ? s.logo : '';
    $('#lImgFile').value = '';
    logoPicker.set(s.logo || '');
    $('#sideShop').textContent = s.name;
    $('#whoami').textContent = 'Đang đăng nhập: ' + (BB.session() ? BB.session().user : '');
    BB.applyBrand();
    fillTheme();
  }

  /* ---------------- MÀU SẮC ---------------- */
  function fillTheme() {
    var t = BB.theme();
    $('#tAccent').value = t.accent; $('#tBg').value = t.bg; $('#tText').value = t.text;
    $('#themePresets').innerHTML = Object.keys(BB.themePresets).map(function (k) {
      var p = BB.themePresets[k];
      return '<button class="swatch" data-preset="' + k + '">' +
        '<i style="background:' + p.accent + '"></i><i style="background:' + p.bg + '"></i>' + p.name + '</button>';
    }).join('');
    $('#themeState').textContent = 'Đang dùng — nhấn: ' + t.accent + ' · nền: ' + t.bg + ' · chữ: ' + t.text;
  }

  function saveThemeFromInputs() {
    BB.shop().theme = { accent: $('#tAccent').value, bg: $('#tBg').value, text: $('#tText').value };
    try { BB.commit(); } catch (err) { return toast(err.message, 'err'); }
    BB.applyTheme();
    fillTheme();
  }

  ['#tAccent', '#tBg', '#tText'].forEach(function (sel) {
    $(sel).addEventListener('input', saveThemeFromInputs);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-preset]');
    if (!b) return;
    var p = BB.themePresets[b.getAttribute('data-preset')];
    if (!p) return;
    $('#tAccent').value = p.accent; $('#tBg').value = p.bg; $('#tText').value = p.text;
    saveThemeFromInputs();
    toast('Đã đổi sang bảng màu ' + p.name, 'ok');
  });

  $('#saveShop').addEventListener('click', function () {
    var s = BB.shop();
    s.name = $('#sName').value.trim() || s.name;
    s.phone = $('#sPhone').value.trim();
    s.slogan = $('#sSlogan').value.trim();
    s.address = $('#sAddr').value.trim();
    s.open = $('#sOpen').value.trim();
    var site = $('#sSite').value.trim();
    s.siteUrl = /^https?:\/\/.+\..+/.test(site) ? site.replace(/\/+$/, '/') : '';
    s.emoji = $('#sEmoji').value.trim() || '🍜';
    s.shipFee = Math.max(0, Math.round(Number($('#sShip').value) || 0));
    s.freeShipFrom = Math.max(0, Math.round(Number($('#sFree').value) || 0));
    BB.applyBrand();
    try { BB.commit(); } catch (err) { return toast(err.message, 'err'); }
    fillShop();
    $('#qrUrl').value = s.siteUrl || '';
    toast('Đã lưu cài đặt', 'ok');
  });

  function renderCats() {
    $('#catChips').innerHTML = BB.categories().map(function (c) {
      return '<span class="chip">' + (c.emoji || '') + ' ' + esc(c.name) + ' <b style="color:var(--muted)">' + esc(c.id) + '</b>' +
        (c.id === 'all' ? '' : ' <button data-delcat="' + c.id + '" title="Xoá">✕</button>') + '</span>';
    }).join('');
  }

  $('#addCat').addEventListener('click', function () {
    var name = $('#catName').value.trim();
    if (name.length < 2) return toast('Tên danh mục quá ngắn', 'err');
    var id = ('cat-' + Date.now().toString(36));
    BB.categories().push({ id: id, name: name, emoji: $('#catEmoji').value.trim() || '🍲' });
    BB.commit();
    $('#catName').value = ''; $('#catEmoji').value = '';
    renderCats(); renderDishFilter(); fillCatSelect($('#dCat'));
    toast('Đã thêm danh mục', 'ok');
  });

  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-delcat]');
    if (!d) return;
    var id = d.getAttribute('data-delcat');
    if (BB.menu().some(function (m) { return m.cat === id; })) return toast('Còn món thuộc danh mục này, hãy chuyển món trước', 'err');
    var cats = BB.categories().filter(function (c) { return c.id !== id; });
    BB.db().categories = cats; BB.commit();
    renderCats(); renderDishFilter();
    toast('Đã xoá danh mục');
  });

  function renderCodes() {
    var codes = BB.codes();
    var keys = Object.keys(codes);
    $('#codeRows').innerHTML = keys.length ? keys.map(function (k) {
      var c = codes[k];
      var type = c.type === 'percent' ? 'Phần trăm' : c.type === 'fixed' ? 'Số tiền' : 'Miễn phí ship';
      var val = c.type === 'ship' ? '—' : (c.type === 'percent' ? c.value + '%' : money(c.value));
      return '<tr><td><b>' + esc(k) + '</b></td><td>' + type + '</td><td>' + val + '</td><td>' + esc(c.note || '') + '</td>' +
        '<td class="num"><button class="btn ghost sm" data-delcode="' + esc(k) + '">Xoá</button></td></tr>';
    }).join('') : '<tr><td colspan="5" class="center muted">Chưa có mã nào.</td></tr>';
  }

  $('#addCode').addEventListener('click', function () {
    var k = $('#nCode').value.trim().toUpperCase().replace(/\s/g, '');
    if (k.length < 3) return toast('Mã phải có ít nhất 3 ký tự', 'err');
    if (BB.codes()[k]) return toast('Mã đã tồn tại', 'err');
    var type = $('#nType').value;
    var val = type === 'ship' ? 0 : Math.max(1, Math.round(Number($('#nValue').value) || 1));
    var note = type === 'percent' ? 'Giảm ' + val + '%' : type === 'fixed' ? 'Giảm ' + money(val) : 'Miễn phí giao hàng';
    BB.db().codes[k] = { type: type, value: val, note: note };
    BB.commit();
    $('#nCode').value = '';
    renderCodes();
    toast('Đã tạo mã ' + k, 'ok');
  });

  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-delcode]');
    if (!d) return;
    var k = d.getAttribute('data-delcode');
    delete BB.codes()[k];
    BB.commit();
    renderCodes();
    toast('Đã xoá mã ' + k);
  });

  /* ---------------- DỮ LIỆU ---------------- */
  $('#exportData').addEventListener('click', function () {
    var blob = new Blob([BB.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bunbo-data-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Đã xuất dữ liệu', 'ok');
  });
  $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
  $('#importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        BB.importJSON(fr.result);
        renderAll();
        toast('Đã nhập dữ liệu', 'ok');
      } catch (err) { toast('Không nhập được: ' + err.message, 'err'); }
    };
    fr.readAsText(f);
  });
  $('#resetMenu').addEventListener('click', function () {
    if (!confirm('Khôi phục danh sách món mặc định? Món bạn tự thêm sẽ mất.')) return;
    BB.resetMenu();
    renderAll();
    toast('Đã khôi phục món mặc định', 'ok');
  });
  $('#resetAll').addEventListener('click', function () {
    if (!confirm('XOÁ TOÀN BỘ dữ liệu kể cả đơn hàng? Không thể hoàn tác.')) return;
    BB.resetAll();
    renderAll();
    toast('Đã tạo lại dữ liệu từ đầu', 'ok');
  });

  /* ---------------- MÁY CHỦ NHẬN ĐƠN ---------------- */
  function fillRemote() {
    var r = BBQR_REMOTE().config();
    $('#rUrl').value = r.url || '';
    $('#rToken').value = r.token || '';
    $('#rShop').value = r.shop || $('#sName').value || '';
    renderSyncState();
  }

  function renderSyncState() {
    var R = BBQR_REMOTE();
    var state = $('#syncState'), panelState = $('#rState'), pending = $('#rPending');
    if (!R.isConfigured()) {
      state.textContent = 'Chưa kết nối máy chủ — đơn chỉ nằm trên máy khách';
      panelState.textContent = 'Chưa cấu hình';
      panelState.style.color = 'var(--muted)';
      pending.innerHTML = 'Chưa cấu hình máy chủ: đơn khách chốt vẫn hiện trên web nhưng không tự về quán. ' +
        'Dán link <b>/exec</b> và TOKEN ở trên để nhận đơn tự động.';
      return;
    }
    var n = R.cachedOrders().length;
    var mins = Math.round(R.cacheAge() / 60000);
    var when = mins < 1 ? 'vừa xong' : (mins > 120 ? 'chưa tải lần nào' : mins + ' phút trước');
    state.textContent = '☁️ Đã kết nối · ' + n + ' đơn trên máy chủ · cập nhật ' + when;
    panelState.textContent = '⏳ Đang kiểm tra…';
    panelState.style.color = 'var(--muted)';
    var q = R.pendingCount();
    pending.innerHTML = q
      ? '⚠️ Còn <b>' + q + '</b> đơn chưa gửi được lên máy chủ (rất có thể do mất mạng). ' +
        'Chúng sẽ tự gửi lại ngay khi có mạng — hoặc bấm “⬆️ Đẩy đơn trên máy này lên server”.'
      : '✓ Mọi đơn trên máy này đã được gửi lên máy chủ. Khách đặt trên điện thoại cũng tự về đây.';
  }

  function syncOrders(quiet) {
    var R = BBQR_REMOTE();
    if (!R.isConfigured()) return Promise.resolve([]);
    return R.listOrders().then(function (res) {
      renderOrders();
      renderSyncState();
      return res.orders;
    }).catch(function (err) {
      $('#syncState').textContent = '⚠️ Không gọi được máy chủ: ' + err.message;
      $('#rState').textContent = '❌ Lỗi: ' + err.message;
      $('#rState').style.color = 'var(--accent)';
      if (!quiet) toast('Không gọi được máy chủ: ' + err.message, 'err');
      return [];
    });
  }

  $('#syncBtn').addEventListener('click', function () {
    toast('Đang lấy đơn từ máy chủ…');
    syncOrders();
  });

  $('#rSave').addEventListener('click', function () {
    BBQR_REMOTE().saveConfig({
      url: $('#rUrl').value, token: $('#rToken').value, shop: $('#rShop').value
    });
    renderSyncState();
    if (!BBQR_REMOTE().isConfigured()) return toast('Cần có cả link /exec và TOKEN', 'err');
    $('#rState').textContent = '⏳ Đang kiểm tra…';
    BBQR_REMOTE().ping().then(function (res) {
      $('#rState').textContent = '✓ Kết nối được: ' + (res.app || 'máy chủ') +
        ' · ' + res.count + ' đơn trong Sheet';
      $('#rState').style.color = 'var(--ok)';
      toast('Kết nối máy chủ thành công', 'ok');
      return BBQR_REMOTE().flush();
    }).then(function () {
      return syncOrders(true);
    }).catch(function (err) {
      $('#rState').textContent = '❌ Không kết nối được: ' + err.message +
        ' (kiểm tra lại link /exec, TOKEN và quyền truy cập "Anyone")';
      $('#rState').style.color = 'var(--accent)';
      toast('Không kết nối được máy chủ', 'err');
    });
  });

  $('#rPushAll').addEventListener('click', function () {
    if (!BBQR_REMOTE().isConfigured()) return toast('Chưa cấu hình máy chủ', 'err');
    BBQR_REMOTE().pushAllLocal().then(function (n) {
      toast(n ? 'Đã đẩy ' + n + ' đơn lên máy chủ' : 'Không có đơn nào mới để đẩy', n ? 'ok' : '');
      return syncOrders(true);
    }).catch(function (err) { toast(err.message, 'err'); });
  });

  /* ---------------- ĐẨY CẤU HÌNH LÊN WEB ---------------- */
  $('#rPushConfig').addEventListener('click', function () {
    var R = BBQR_REMOTE();
    if (!R.isConfigured()) return toast('Chưa cấu hình máy chủ', 'err');
    $('#rConfState').textContent = '⏳ Đang đẩy món, giá, màu và logo lên máy chủ…';
    R.pushConfig(BB.publicConfig()).then(function () {
      $('#rConfState').textContent = '✓ Đã đẩy lên máy chủ. Khách mở trang sẽ thấy giá/màu mới (tối đa 5 phút sau).';
      toast('Đã đẩy cấu hình lên web', 'ok');
    }).catch(function (err) {
      $('#rConfState').textContent = '❌ Lỗi: ' + err.message;
      toast('Đẩy cấu hình lỗi: ' + err.message, 'err');
    });
  });

  $('#rPullConfig').addEventListener('click', function () {
    var R = BBQR_REMOTE();
    if (!R.isConfigured()) return toast('Chưa cấu hình máy chủ', 'err');
    $('#rConfState').textContent = '⏳ Đang lấy cấu hình từ máy chủ…';
    R.fetchConfig(true).then(function (cfg) {
      var res = BB.applyRemoteConfig(cfg);
      if (!res.ok) {
        $('#rConfState').textContent = 'Máy chủ chưa có cấu hình nào — bấm “Đẩy món + giá + màu lên web” sau khi sửa xong.';
        return toast(res.error, 'err');
      }
      renderAll();
      $('#rConfState').textContent = '✓ Đã lấy cấu hình từ máy chủ về máy này.';
      toast('Đã lấy cấu hình từ web', 'ok');
    });
  });

  /* ---------------- RENDER ALL ---------------- */
  function renderAll() {
    renderDishFilter();
    renderDishes();
    renderOrders();
    renderCats();
    renderCodes();
    fillShop();
    fillRemote();
    if (!$('#qrUrl').value) $('#qrUrl').value = defaultUrl();
  }

  function boot() {
    if (!BB.isAdmin()) {
      $('#loginView').classList.remove('hidden');
      $('#adminView').classList.add('hidden');
      return;
    }
    $('#loginView').classList.add('hidden');
    $('#adminView').classList.remove('hidden');
    renderAll();
    syncOrders(true);
  }

  boot();
})();
