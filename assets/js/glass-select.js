/* =====================================================================
   YDMK — стеклянные элементы выбора для формы (contact.html)
   Настоящий <select> остаётся в форме и остаётся «источником правды»:
   проверка, отправка, ?pkg= и сводка в contact.js работают через него.
   Этот скрипт только рисует поверх него удобный элемент и синхронизирует значение.

   <select data-gs="plans">  — карточки тарифов (группы <optgroup>: первая — карточки,
                               остальные — чипы под ними)
   <select data-gs="seg">    — сегментный переключатель (до 3 вариантов), «капсула» переезжает
   <select data-gs="chips">  — чипы (как «Payment preference»)
   <select data-gs="list">   — стеклянный выпадающий список (только мышь/трекпад;
                               на телефоне остаётся системный список — он там удобнее)
   Клавиатура: радио-группы — стрелки; список — ↑↓ Home End Enter Space Esc Tab
   и быстрый поиск по буквам. Без библиотек и без инлайн-скриптов (CSP).
   ===================================================================== */
(function () {
  'use strict';
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var uid = 0;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function realOptions(sel) { return Array.prototype.filter.call(sel.options, function (o) { return o.value !== ''; }); }
  function setValue(sel, v) { if (sel.value === v) return; sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  function hideNative(sel, control) {
    sel.classList.add('gs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel._gs = control; /* contact.js фокусирует это при ошибке */
  }
  function labelOf(sel) {
    var lab = sel.closest('.f').querySelector('label[for="' + sel.id + '"]');
    if (lab && !lab.id) lab.id = sel.id + '-lab';
    return lab;
  }
  /* «Morning (9:00–12:00)» → ['Morning', '9:00–12:00'] */
  function split(t) { var m = t.match(/^(.*?)\s*\((.*)\)\s*$/); return m ? [m[1], m[2]] : [t, '']; }

  /* ---------- радио-группа (карточки / сегменты / чипы) ---------- */
  function radioGroup(sel, kind) {
    var lab = labelOf(sel), name = 'gs-' + sel.id, wrap, inputs = [];
    wrap = el('div', 'gs-' + kind);
    wrap.setAttribute('role', 'radiogroup');
    if (lab) { wrap.setAttribute('aria-labelledby', lab.id); lab.removeAttribute('for'); }
    if (sel.required) wrap.setAttribute('aria-required', 'true');

    function addRadio(parent, opt, cls, build) {
      var l = el('label', cls), i = el('input');
      i.type = 'radio'; i.name = name; i.value = opt.value;
      i.setAttribute('form', 'gs-none'); /* не попадает в FormData формы */
      l.appendChild(i); build(l, opt); parent.appendChild(l); inputs.push(i);
      i.addEventListener('change', function () { if (i.checked) { setValue(sel, i.value); if (ind) moveInd(); } });
    }

    if (kind === 'plans') {
      var groups = sel.querySelectorAll('optgroup');
      var grid = el('div', 'gs-plan-grid'), extra = el('div', 'chips gs-plan-extra');
      Array.prototype.forEach.call(groups, function (g, gi) {
        Array.prototype.forEach.call(g.querySelectorAll('option'), function (o) {
          if (gi === 0) addRadio(grid, o, 'gs-plan', function (l) {
            /* «Starter – Landing page · $2,800» */
            var t = o.textContent, price = '', name = t, desc = '';
            var p = t.split(' · '); if (p.length > 1) { price = p.pop(); name = p.join(' · '); }
            var d = name.split(' – '); if (d.length > 1) { name = d.shift(); desc = d.join(' – '); }
            var box = el('span', 'gs-plan-in');
            box.appendChild(el('b', 'gs-plan-name', name));
            if (desc) box.appendChild(el('span', 'gs-plan-desc', desc));
            if (price) box.appendChild(el('span', 'gs-plan-price', price));
            box.appendChild(el('span', 'gs-plan-tick')).setAttribute('aria-hidden', 'true');
            l.appendChild(box);
          });
          else addRadio(extra, o, 'chip', function (l) { l.appendChild(el('span', null, o.textContent)); });
        });
      });
      wrap.appendChild(grid); if (extra.children.length) wrap.appendChild(extra);
    } else if (kind === 'seg') {
      realOptions(sel).forEach(function (o) {
        addRadio(wrap, o, 'gs-seg-it', function (l) {
          var s = split(o.textContent), sp = el('span', 'gs-seg-txt');
          sp.appendChild(el('b', null, s[0])); if (s[1]) sp.appendChild(el('small', null, s[1]));
          l.appendChild(sp); if (s[1]) l.title = o.textContent;
        });
      });
      var ind = el('span', 'gs-seg-ind'); ind.setAttribute('aria-hidden', 'true'); wrap.insertBefore(ind, wrap.firstChild);
    } else {
      wrap.className = 'chips gs-chips';
      realOptions(sel).forEach(function (o) { addRadio(wrap, o, 'chip', function (l) { l.appendChild(el('span', null, o.textContent)); }); });
    }

    function moveInd() {
      if (!ind) return;
      var on = inputs.filter(function (i) { return i.checked; })[0];
      if (!on) { ind.style.opacity = 0; return; }
      var l = on.parentNode; ind.style.opacity = 1;
      ind.style.transform = 'translateX(' + l.offsetLeft + 'px)'; ind.style.width = l.offsetWidth + 'px';
    }
    function sync() { inputs.forEach(function (i) { i.checked = i.value === sel.value && sel.value !== ''; }); moveInd(); }
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    hideNative(sel, { focus: function () { (inputs.filter(function (i) { return i.checked; })[0] || inputs[0]).focus(); } });
    sel.addEventListener('change', sync); sel._gsSync = sync;
    if (ind) { new ResizeObserver(moveInd).observe(wrap); requestAnimationFrame(function () { wrap.classList.add('gs-ready'); }); }
    sync();
  }

  /* ---------- стеклянный выпадающий список (select-only combobox, WAI-ARIA APG) ---------- */
  function list(sel) {
    var lab = labelOf(sel), id = 'gs' + (++uid), opts = Array.prototype.slice.call(sel.options);
    var box = el('div', 'gs-list');
    var btn = el('button', 'gs-trigger'); btn.type = 'button'; btn.id = id + '-btn';
    btn.setAttribute('role', 'combobox'); btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id + '-lb');
    if (lab) { btn.setAttribute('aria-labelledby', lab.id + ' ' + btn.id); lab.setAttribute('for', btn.id); }
    var val = el('span', 'gs-val'); btn.appendChild(val);
    var pop = el('ul', 'gs-pop'); pop.id = id + '-lb'; pop.setAttribute('role', 'listbox'); pop.tabIndex = -1;
    if (lab) pop.setAttribute('aria-labelledby', lab.id);
    var items = opts.map(function (o, i) {
      var li = el('li', 'gs-opt' + (o.value === '' ? ' gs-ph' : ''), o.textContent);
      li.id = id + '-o' + i; li.setAttribute('role', 'option');
      li.addEventListener('mousedown', function (e) { e.preventDefault(); });
      li.addEventListener('click', function () { choose(i); close(); btn.focus(); });
      li.addEventListener('mousemove', function () { if (active !== i) setActive(i, false); });
      pop.appendChild(li); return li;
    });
    box.appendChild(btn); box.appendChild(pop);
    sel.parentNode.insertBefore(box, sel.nextSibling);
    hideNative(sel, btn);

    var active = -1, open = false, typed = '', typedT = 0;
    function sync() {
      var i = sel.selectedIndex; val.textContent = i >= 0 ? opts[i].textContent : '';
      box.classList.toggle('is-empty', !sel.value);
      items.forEach(function (li, k) { li.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }
    function setActive(i, scroll) {
      active = i; items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      if (i >= 0) { btn.setAttribute('aria-activedescendant', items[i].id); if (scroll) items[i].scrollIntoView({ block: 'nearest' }); }
      else btn.removeAttribute('aria-activedescendant');
    }
    function choose(i) { if (opts[i].value === '' && sel.required) return; setValue(sel, opts[i].value); sync(); }
    function openList() {
      if (open) return; open = true;
      var r = btn.getBoundingClientRect(), below = innerHeight - r.bottom;
      box.classList.toggle('gs-up', below < 300 && r.top > below);
      box.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
      setActive(Math.max(sel.selectedIndex, firstReal()), true);
      document.addEventListener('pointerdown', outside, true);
    }
    function close() {
      if (!open) return; open = false;
      box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); setActive(-1);
      document.removeEventListener('pointerdown', outside, true);
    }
    function outside(e) { if (!box.contains(e.target)) close(); }
    function firstReal() { for (var k = 0; k < opts.length; k++) if (opts[k].value !== '') return k; return 0; }
    function move(d) { var i = active < 0 ? sel.selectedIndex : active; i = Math.min(opts.length - 1, Math.max(firstReal(), i + d)); setActive(i, true); }

    btn.addEventListener('click', function () { open ? close() : openList(); });
    btn.addEventListener('keydown', function (e) {
      var k = e.key;
      if (!open) {
        if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openList(); }
        else if (k === 'Home' || k === 'End') { e.preventDefault(); openList(); setActive(k === 'Home' ? firstReal() : opts.length - 1, true); }
        else if (k.length === 1) { openList(); find(k); }
        return;
      }
      if (k === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (k === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (k === 'Home') { e.preventDefault(); setActive(firstReal(), true); }
      else if (k === 'End') { e.preventDefault(); setActive(opts.length - 1, true); }
      else if (k === 'PageDown') { e.preventDefault(); move(10); }
      else if (k === 'PageUp') { e.preventDefault(); move(-10); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (active >= 0) choose(active); close(); }
      else if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'Tab') { if (active >= 0) choose(active); close(); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); find(k); }
    });
    btn.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== btn) close(); }, 0); });
    function find(ch) {
      clearTimeout(typedT); typed += ch.toLowerCase(); typedT = setTimeout(function () { typed = ''; }, 600);
      var start = active < 0 ? 0 : active, n = opts.length;
      for (var k = 0; k < n; k++) {
        var i = (start + (typed.length === 1 ? k + 1 : k)) % n; /* одна буква — следующий; слово — с текущего */
        if (opts[i].value !== '' && opts[i].textContent.toLowerCase().indexOf(typed) === 0) { setActive(i, true); return; }
      }
    }
    pop.addEventListener('mousedown', function (e) { e.preventDefault(); }); /* клик по прокрутке не уводит фокус */
    sel.addEventListener('change', sync); sel._gsSync = sync; sync();
  }

  function init() {
    document.querySelectorAll('select[data-gs]').forEach(function (sel) {
      var k = sel.dataset.gs;
      if (k === 'list') { if (fine) list(sel); }
      else radioGroup(sel, k);
    });
    /* «Submit another request» сбрасывает форму — подтягиваем новые значения */
    document.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('reset', function () { setTimeout(function () { f.querySelectorAll('select[data-gs]').forEach(function (s) { if (s._gsSync) s._gsSync(); }); }, 0); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
