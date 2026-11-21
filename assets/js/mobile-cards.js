/* =====================================================================
   YDMK — блоки карточек на телефоне (≤720 px): карусель или стопка (swipe deck).
   Разметка:
     <div class="vgrid"  data-mobile="deck">      — существующие карточки → стопка
     <div class="pgrid"  data-mobile="carousel">  — существующие карточки → карусель
     <div class="tscroll" data-mobile="deck">     — строки таблицы .plans → карточки → стопка
   Карточки не копируются: ссылки, кнопки и бейджи остаются рабочими.
   Карусель: прокрутка пальцем со «щелчком», краешек следующей карточки, точки.
   Стопка: смахивание по кругу (ничего не теряется), стрелки, счётчик, подсказка-покачивание.
   Доступность: подписи кнопок, счётчик в aria-live, ←/→ на клавиатуре,
   при prefers-reduced-motion — без анимаций. Без библиотек и инлайн-скриптов (CSP).
   ===================================================================== */
(function () {
  'use strict';
  if (!matchMedia('(max-width: 720px)').matches) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function title(c, i) { var h = c.querySelector('h3'); return h ? h.textContent.trim() : 'Card ' + (i + 1); }
  function region(box, label) { box.setAttribute('role', 'region'); box.setAttribute('aria-roledescription', 'carousel'); box.setAttribute('aria-label', label); }
  function slide(c, i, n) { c.setAttribute('role', 'group'); c.setAttribute('aria-roledescription', 'slide'); c.setAttribute('aria-label', (i + 1) + ' of ' + n + ': ' + title(c, i)); }

  /* строки таблицы → карточки */
  function fromTable(host) {
    var box = el('div', 'mcards-src');
    Array.prototype.forEach.call(host.querySelectorAll('table.plans tr'), function (tr) {
      var td = tr.querySelectorAll('td'); if (td.length < 3) return;
      var a = el('article', 'pcard glass'), top = el('div', 'pcard-top');
      top.appendChild(el('h3', 'pcard-name', td[0].textContent.trim()));
      var pr = el('p', 'pcard-price'); pr.appendChild(el('b', null, td[2].textContent.trim())); pr.appendChild(el('span', null, 'CAD / mo'));
      top.appendChild(pr); a.appendChild(top); a.appendChild(el('p', 'pcard-desc', td[1].textContent.trim()));
      box.appendChild(a);
    });
    host.classList.add('has-mob'); host.appendChild(box);
    return box;
  }

  /* ---------- А. Карусель ---------- */
  function carousel(box, label) {
    var items = Array.prototype.slice.call(box.children), n = items.length;
    box.classList.add('mcar'); box.tabIndex = 0; region(box, label);
    items.forEach(function (c, i) { slide(c, i, n); });
    var dots = el('div', 'mdots');
    var ds = items.map(function (c, i) {
      var d = el('button', 'mdot'); d.type = 'button'; d.setAttribute('aria-label', 'Show ' + title(c, i));
      d.addEventListener('click', function () { go(i); }); dots.appendChild(d); return d;
    });
    box.parentNode.insertBefore(dots, box.nextSibling);
    function go(i) { var c = items[i]; box.scrollTo({ left: c.offsetLeft - box.offsetLeft - (box.clientWidth - c.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' }); }
    function cur() { var mid = box.scrollLeft + box.clientWidth / 2, best = 0, bd = 1e9;
      items.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - box.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }); return best; }
    function upd() { var b = cur(); ds.forEach(function (d, i) { d.classList.toggle('on', i === b); d.setAttribute('aria-current', i === b ? 'true' : 'false'); }); }
    box.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
    box.addEventListener('keydown', function (e) {
      if (e.target !== box) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.min(n - 1, cur() + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.max(0, cur() - 1)); }
    });
    upd();
  }

  /* ---------- Б. Стопка ---------- */
  function deck(box, label) {
    var cards = Array.prototype.slice.call(box.children), n = cards.length, order = cards.map(function (_, i) { return i; });
    var wrap = el('div', 'mdeck'); region(wrap, label);
    box.parentNode.insertBefore(wrap, box); wrap.appendChild(box); box.classList.add('mdeck-stage');
    cards.forEach(function (c, i) { slide(c, i, n); });
    var nav = el('div', 'mdeck-nav');
    var prev = el('button', 'mdeck-btn mdeck-prev'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous');
    var cnt = el('span', 'mdeck-count'); cnt.setAttribute('aria-live', 'polite');
    var next = el('button', 'mdeck-btn mdeck-next'); next.type = 'button'; next.setAttribute('aria-label', 'Next');
    nav.appendChild(prev); nav.appendChild(cnt); nav.appendChild(next);
    var hint = el('p', 'mdeck-hint', 'Swipe to see all ' + n);
    wrap.appendChild(nav); wrap.appendChild(hint);

    var SHOW = Math.min(n, 5), GAP = 10, busy = false;   /* видны края всех карточек — ни одна не «пропадает» */
    function size() {
      cards.forEach(function (c) { c.style.minHeight = ''; });
      var h = 0; cards.forEach(function (c) { h = Math.max(h, c.offsetHeight); });
      cards.forEach(function (c) { c.style.minHeight = h + 'px'; });   /* одна высота — ровные края стопки */
      box.style.height = (h + (SHOW - 1) * GAP) + 'px';
    }
    function layout(anim) {
      order.forEach(function (ci, pos) {
        var c = cards[ci], p = Math.min(pos, SHOW - 1), vis = pos < SHOW;
        c.style.transition = anim && !reduced ? '' : 'none';
        c.style.zIndex = String(n - pos);
        c.style.transform = 'translateY(' + (p * GAP) + 'px) scale(' + (1 - p * .04) + ')';
        c.style.opacity = vis ? String(Math.max(.5, 1 - pos * .14)) : '0';
        c.style.visibility = vis ? 'visible' : 'hidden';
        c.classList.toggle('is-top', pos === 0);
        c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
        c.inert = pos !== 0;                                            /* ссылки нижних карточек недоступны */
      });
      cnt.textContent = (order[0] + 1) + ' / ' + n;
    }
    function shift(dir, fromX) {
      if (busy) return; busy = true;
      if (dir > 0) {
        var top = cards[order[0]], off = (fromX < 0 ? -1 : 1) * box.offsetWidth * .62;
        if (reduced) { order.push(order.shift()); layout(false); busy = false; return; }
        /* 1) карточка отъезжает в сторону, 2) уходит под стопку и встаёт последней */
        top.style.transition = 'transform .26s cubic-bezier(.2,.7,.3,1)';
        top.style.transform = 'translateX(' + off + 'px) rotate(' + (off > 0 ? 7 : -7) + 'deg)';
        setTimeout(function () {
          top.style.zIndex = '0'; order.push(order.shift()); layout(true);
          setTimeout(function () { busy = false; }, 380);
        }, 260);
      } else {
        order.unshift(order.pop());
        var c = cards[order[0]];
        if (reduced) { layout(false); busy = false; return; }
        /* последняя выходит из-под стопки в сторону и ложится сверху */
        c.style.transition = 'transform .24s cubic-bezier(.2,.7,.3,1)';
        c.style.transform = 'translateX(' + -(box.offsetWidth * .62) + 'px) rotate(-7deg)';
        setTimeout(function () { c.style.zIndex = String(n + 1); layout(true); setTimeout(function () { busy = false; }, 380); }, 240);
      }
    }
    prev.addEventListener('click', function () { shift(-1); });
    next.addEventListener('click', function () { shift(1, 1); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); shift(1, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); shift(-1); }
    });
    /* смахивание: только горизонтальный жест по верхней карточке, вертикальный скролл страницы свободен */
    var sx = 0, sy = 0, dx = 0, drag = false, axis = '', moved = false;
    box.addEventListener('pointerdown', function (e) {
      var c = cards[order[0]]; if (!c.contains(e.target) || busy) return;
      drag = true; axis = ''; moved = false; sx = e.clientX; sy = e.clientY; dx = 0;
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var mx = e.clientX - sx, my = e.clientY - sy;
      if (!axis) { if (Math.abs(mx) < 6 && Math.abs(my) < 6) return; axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (axis === 'x') { box.setPointerCapture(e.pointerId); cards[order[0]].style.transition = 'none'; } }
      if (axis !== 'x') { drag = false; return; }
      moved = true; dx = mx; cards[order[0]].style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 22) + 'deg)';
    });
    function end() { if (!drag) return; drag = false; if (Math.abs(dx) > 70) shift(1, dx); else layout(true); if (moved) hint.classList.add('done'); }
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    /* после смахивания не срабатывает случайный клик по кнопке внутри карточки */
    box.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    if (!reduced && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        var c = cards[order[0]]; c.classList.add('nudge'); setTimeout(function () { c.classList.remove('nudge'); }, 1300);
      }, { threshold: .6 });
      io.observe(box);
    }
    var rw = 0; window.addEventListener('resize', function () { if (innerWidth === rw) return; rw = innerWidth; size(); layout(false); });
    size(); layout(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); layout(false); });
  }

  function init() {
    document.querySelectorAll('[data-mobile]').forEach(function (host) {
      var box = host.matches('.tscroll') ? fromTable(host) : host;
      var sec = host.closest('section'), h = sec && sec.querySelector('h2');
      var label = h ? h.textContent.trim() : 'Cards';
      (host.dataset.mobile === 'deck' ? deck : carousel)(box, label);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
