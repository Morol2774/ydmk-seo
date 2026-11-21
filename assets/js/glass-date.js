/* =====================================================================
   YDMK — стеклянный календарь для <input type="date" data-gs="date">
   Настоящее поле даты остаётся в форме (значение, min, required, проверка
   в contact.js). Скрипт рисует поверх кнопку и всплывающий календарь.
   • воскресенье и дни раньше min недоступны (как в проверке формы)
   • клавиатура (WAI-ARIA APG «Date picker dialog»): стрелки — день/неделя,
     PageUp/PageDown — месяц, Home/End — начало/конец недели, Enter/Space — выбрать,
     Esc — закрыть; фокус возвращается на кнопку
   • только мышь/трекпад; на телефоне остаётся системный выбор даты
   Без библиотек и без инлайн-скриптов (CSP).
   ===================================================================== */
(function () {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var LOC = 'en-CA';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(v) { if (!v) return null; var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function same(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  function picker(input) {
    var lab = input.closest('.f').querySelector('label[for="' + input.id + '"]');
    var box = el('div', 'gs-date');
    var btn = el('button', 'gs-trigger gs-date-btn'); btn.type = 'button'; btn.id = input.id + '-btn';
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    var val = el('span', 'gs-val'); btn.appendChild(val);
    var ico = el('span', 'gs-date-ico'); ico.setAttribute('aria-hidden', 'true'); btn.appendChild(ico);
    if (lab) { if (!lab.id) lab.id = input.id + '-lab'; lab.setAttribute('for', btn.id); btn.setAttribute('aria-labelledby', lab.id + ' ' + btn.id); }

    var dlg = el('div', 'gs-cal'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'false');
    dlg.id = input.id + '-cal'; btn.setAttribute('aria-controls', dlg.id);
    var head = el('div', 'gs-cal-head');
    var prev = el('button', 'gs-cal-nav gs-prev'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous month');
    var next = el('button', 'gs-cal-nav gs-next'); next.type = 'button'; next.setAttribute('aria-label', 'Next month');
    var title = el('h3', 'gs-cal-title'); title.id = input.id + '-title'; title.setAttribute('aria-live', 'polite');
    head.appendChild(prev); head.appendChild(title); head.appendChild(next);
    dlg.setAttribute('aria-labelledby', title.id);
    var grid = el('table', 'gs-cal-grid'); grid.setAttribute('role', 'grid'); grid.setAttribute('aria-labelledby', title.id);
    var thead = el('thead'), hr = el('tr');
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(function (d, i) {
      var th = el('th', null, d); th.scope = 'col';
      th.setAttribute('abbr', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]); hr.appendChild(th);
    });
    thead.appendChild(hr); grid.appendChild(thead);
    var tbody = el('tbody'); grid.appendChild(tbody);
    var foot = el('p', 'gs-cal-note', 'Mon–Sat · Sundays closed');
    dlg.appendChild(head); dlg.appendChild(grid); dlg.appendChild(foot);
    box.appendChild(btn); box.appendChild(dlg);
    input.parentNode.insertBefore(box, input.nextSibling);
    input.classList.add('gs-native'); input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
    input._gs = btn; /* contact.js фокусирует это при ошибке */

    var view = null, focusD = null, open = false;
    function min() { return parse(input.min) || new Date(0); }
    function ok(d) { return d.getDay() !== 0 && d >= min(); }
    function sync() {
      var d = parse(input.value);
      val.textContent = d ? d.toLocaleDateString(LOC, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a date';
      box.classList.toggle('is-empty', !d);
    }
    function render() {
      title.textContent = view.toLocaleDateString(LOC, { month: 'long', year: 'numeric' });
      var first = new Date(view.getFullYear(), view.getMonth(), 1), start = addDays(first, -first.getDay());
      var sel = parse(input.value), today = new Date(); tbody.textContent = '';
      var mn = min(); prev.disabled = new Date(view.getFullYear(), view.getMonth(), 0) < mn;
      for (var w = 0; w < 6; w++) {
        var tr = el('tr');
        for (var i = 0; i < 7; i++) {
          var d = addDays(start, w * 7 + i), td = el('td'), b = el('button', 'gs-day', String(d.getDate()));
          td.setAttribute('role', 'gridcell'); b.type = 'button'; b.dataset.d = iso(d);
          b.setAttribute('aria-label', d.toLocaleDateString(LOC, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
          if (d.getMonth() !== view.getMonth()) b.classList.add('is-out');
          if (same(d, today)) { b.classList.add('is-today'); b.setAttribute('aria-current', 'date'); }
          if (!ok(d)) { b.setAttribute('aria-disabled', 'true'); b.classList.add('is-off'); }
          if (same(d, sel)) { b.classList.add('is-sel'); td.setAttribute('aria-selected', 'true'); }
          b.tabIndex = same(d, focusD) ? 0 : -1;
          td.appendChild(b); tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
    }
    function focusDay(d) {
      focusD = d;
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
      render(); var b = tbody.querySelector('[data-d="' + iso(d) + '"]'); if (b) b.focus();
    }
    function firstOk(from) { var d = new Date(from); for (var i = 0; i < 400 && !ok(d); i++) d = addDays(d, 1); return d; }
    function choose(d) {
      if (!ok(d)) return;
      input.value = iso(d);
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      sync(); close(true);
    }
    function openCal() {
      if (open) return; open = true;
      var r = btn.getBoundingClientRect(), below = innerHeight - r.bottom;
      box.classList.toggle('gs-up', below < 400 && r.top > below);
      var start = parse(input.value) || firstOk(min() > new Date() ? min() : new Date());
      view = new Date(start.getFullYear(), start.getMonth(), 1);
      box.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
      focusDay(start);
      document.addEventListener('pointerdown', outside, true);
    }
    function close(refocus) {
      if (!open) return; open = false;
      box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      if (refocus) btn.focus();
    }
    function outside(e) { if (!box.contains(e.target)) close(false); }

    btn.addEventListener('click', function () { open ? close(true) : openCal(); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); openCal(); } });
    prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); focusD = new Date(view); render(); });
    next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); focusD = new Date(view); render(); });
    tbody.addEventListener('click', function (e) { var b = e.target.closest('.gs-day'); if (b) choose(parse(b.dataset.d)); });
    dlg.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); close(true); return; }
      if (k === 'Tab') { /* ловушка фокуса внутри календаря: назад/вперёд, день */
        var items = [prev, next, tbody.querySelector('.gs-day[tabindex="0"]')].filter(function (x) { return x && !x.disabled; });
        var i = items.indexOf(document.activeElement);
        e.preventDefault(); items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus(); return;
      }
      var b = e.target.closest('.gs-day'); if (!b) return;
      var d = parse(b.dataset.d), n = null;
      if (k === 'ArrowLeft') n = addDays(d, -1);
      else if (k === 'ArrowRight') n = addDays(d, 1);
      else if (k === 'ArrowUp') n = addDays(d, -7);
      else if (k === 'ArrowDown') n = addDays(d, 7);
      else if (k === 'Home') n = addDays(d, -d.getDay());
      else if (k === 'End') n = addDays(d, 6 - d.getDay());
      else if (k === 'PageUp') n = new Date(d.getFullYear(), d.getMonth() - (e.shiftKey ? 12 : 1), d.getDate());
      else if (k === 'PageDown') n = new Date(d.getFullYear(), d.getMonth() + (e.shiftKey ? 12 : 1), d.getDate());
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(d); return; }
      if (n) { e.preventDefault(); focusDay(n); }
    });
    input.addEventListener('change', sync);
    var f = input.form; if (f) f.addEventListener('reset', function () { setTimeout(sync, 0); });
    sync();
  }

  function init() { document.querySelectorAll('input[type="date"][data-gs="date"]').forEach(picker); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
