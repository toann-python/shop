/* ============================================================
   QR helper — vẽ mã QR bằng thư viện qrcode-generator (offline)
   Namespace: window.BBQR
   ============================================================ */
(function (global) {
  'use strict';

  /**
   * Vẽ mã QR lên canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {string} text nội dung (URL web)
   * @param {object} opt  { size, margin, dark, light, ec }
   */
  function draw(canvas, text, opt) {
    opt = opt || {};
    var size = opt.size || 520;
    var margin = opt.margin == null ? 4 : opt.margin;   // số module trắng viền
    var ec = opt.ec || 'M';
    var dark = opt.dark || '#2b1512';
    var light = opt.light || '#ffffff';

    var qr = global.qrcode(0, ec);
    qr.addData(String(text || ''), 'Byte');
    qr.make();

    var count = qr.getModuleCount();
    var total = count + margin * 2;
    var scale = Math.max(1, Math.floor(size / total));
    var dim = scale * total;

    canvas.width = dim;
    canvas.height = dim;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = dark;
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
    return { modules: count, scale: scale, dim: dim };
  }

  /** Trả về data-URL PNG để tải về / nhúng vào <img>. */
  function toPNG(canvas) { return canvas.toDataURL('image/png'); }

  /** Mã QR dạng <img> (tiện cho poster). */
  function toImg(text, px, opt) {
    opt = opt || {};
    var size = px || 480;
    var c = document.createElement('canvas');
    draw(c, text, opt);
    var img = new Image();
    img.src = toPNG(c);
    img.width = size; img.height = size;
    img.style.display = 'block';
    return img;
  }

  global.BBQR = { draw: draw, toPNG: toPNG, toImg: toImg };
})(window);
