/* =====================================================================
   YDMK — наклон к курсору + блик (из шаблона 10 · Пружинные карточки)
   Взята только часть «наведение»: масштаб 1.03, наклон к курсору, блик.
   Перетаскивания и броска нет — на карточках с ценами и кнопками это мешает.
   Пружины как в шаблоне: наклон 220/20, масштаб 420/28, полунеявный Эйлер,
   3 подшага, шаг кадра не больше 1/30 с; цикл засыпает, когда всё замерло.

   Разметка:  <div data-tilt="10">…</div>        максимальный угол, градусов
   Если внутри есть [data-tilt-inner] — наклоняется он, а сам элемент только
   масштабируется. Так сделано для WebGL-стекла: форма стекла в шейдере
   остаётся ровной, а наклон стекло получает через el.lgTilt (кант, блик,
   параллакс рисует liquid-glass.js).
   Работает только с мышью/пером (hover:hover и pointer:fine) и выключено
   при prefers-reduced-motion. На телефоне ничего не меняется.
   ===================================================================== */
(function () {
  'use strict';
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var TILT_SPRING = [220, 20], SCALE_SPRING = [420, 28];

  function Spring(v, cfg) { this.v = v; this.t = v; this.vel = 0; this.k = cfg[0]; this.d = cfg[1]; }
  Spring.prototype.step = function (dt) { var a = -this.k * (this.v - this.t) - this.d * this.vel; this.vel += a * dt; this.v += this.vel * dt; };
  Spring.prototype.idle = function () { return Math.abs(this.v - this.t) < 0.005 && Math.abs(this.vel) < 0.005; };
  Spring.prototype.snap = function () { this.v = this.t; this.vel = 0; };

  var items = [], raf = 0, last = 0;

  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    var moving = false, h = dt / 3;
    items.forEach(function (k) {
      if (!k.active) return;
      for (var s = 0; s < 3; s++) { k.rx.step(h); k.ry.step(h); k.s.step(h); k.hv.step(h); }
      var still = k.rx.idle() && k.ry.idle() && k.s.idle() && k.hv.idle();
      if (still) { k.rx.snap(); k.ry.snap(); k.s.snap(); k.hv.snap(); }
      apply(k);
      if (!still) moving = true; else if (!k.over) { k.active = false; reset(k); }
    });
    if (moving) raf = requestAnimationFrame(tick);
  }
  function apply(k) {
    var rot = 'perspective(' + k.persp + 'px) rotateX(' + k.rx.v.toFixed(2) + 'deg) rotateY(' + k.ry.v.toFixed(2) + 'deg)';
    var sc = 'scale(' + k.s.v.toFixed(4) + ')';
    if (k.inner) { k.el.style.transform = sc; k.inner.style.transform = rot; }
    else k.el.style.transform = rot + ' ' + sc;
    /* для WebGL-стекла: наклон −1…1 и сила наведения 0…1 (ось Y в шейдере смотрит вверх) */
    k.el.lgTilt = [2 * k.ry.v / k.max, 2 * k.rx.v / k.max, Math.max(0, Math.min(1, k.hv.v))];
  }
  function reset(k) {
    k.el.style.transform = ''; if (k.inner) k.inner.style.transform = '';
    k.el.lgTilt = null; k.el.classList.remove('is-tilting');
  }

  function bind(el) {
    if (el.__tilt) return; el.__tilt = true;
    var k = { el: el, inner: el.querySelector('[data-tilt-inner]'), max: Number(el.dataset.tilt) || 10,
      rx: new Spring(0, TILT_SPRING), ry: new Spring(0, TILT_SPRING), s: new Spring(1, SCALE_SPRING), hv: new Spring(0, SCALE_SPRING),
      over: false, active: false, persp: 900 };
    if (!el.querySelector('.tilt-glare')) {
      var gl = document.createElement('span'); gl.className = 'tilt-glare'; gl.setAttribute('aria-hidden', 'true'); el.appendChild(gl);
    }
    items.push(k);
    el.classList.add('tilt-live');
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !enabled()) return;
      var r = el.getBoundingClientRect(); if (!k.active) k.persp = Math.round(Math.max(900, Math.max(r.width, r.height) * 2.4)); var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      px = Math.max(0, Math.min(1, px)); py = Math.max(0, Math.min(1, py));
      /* формула шаблона 10: −(py−0.5)·TILT — у самого края половина TILT */
      k.rx.t = (0.5 - py) * k.max; k.ry.t = (px - .5) * k.max;
      k.s.t = 1.03; k.hv.t = 1; k.over = true; k.active = true;
      el.classList.add('is-tilting');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      wake();
    });
    el.addEventListener('pointerleave', function () {
      k.over = false; k.rx.t = 0; k.ry.t = 0; k.s.t = 1; k.hv.t = 0; wake();
    });
  }
  function enabled() { return fine.matches && !reduced.matches; }

  function init() { document.querySelectorAll('[data-tilt]').forEach(bind); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.YDMKTilt = { bind: bind };
})();
