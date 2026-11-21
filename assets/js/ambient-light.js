/* =====================================================================
   05 · AMBIENT LIGHT — живой белый фон (студийная версия YDMK)
   Основа — шаблон 05 библиотеки: те же формулы движения пятен, шум fbm,
   дизеринг, зерно, разрешение 0.75, пауза вне экрана, запасной CSS.
   Отличия этой версии:
   • ОДИН фон на всю зону [data-ambient-zone] (на главной — от блока
     «Why Do Most…» до футера, на остальных страницах — весь <main>).
     Холст размером с экран «прилипает» (position: sticky) внутри зоны,
     поэтому секции идут без швов, а видеокарта рисует только один экран.
   • Время — общие часы (AmbientLight.time()), формула — общий GLSL
     (AmbientLight.GLSL). Стекло (liquid-glass.js) считает под собой тот же
     свет в тех же координатах — фон под стеклом и вокруг совпадает.
   • Пятна за курсором нет.
   • Палитра YDMK: пастельные голубой / розовый / лаванда на #FBF9F8.
   ===================================================================== */
(function (global) {
  'use strict';

  var PALETTES = {
    ydmk:     { base: '#FBF9F8', c1: '#F7C2D6', c2: '#B9E3F5', c3: '#D9CEF2' },
    daylight: { base: '#F9F8F6', c1: '#FFCC9E', c2: '#B3CCFF', c3: '#E0C7FF' }
  };
  var CFG = { palette: PALETTES.ydmk, speed: 1, intensity: 1.2, grain: 0.012, scale: 0.75, maxDpr: 1.5 };

  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* общие часы: одинаковое время для фона и для стекла; при reduced-motion — один кадр */
  var T0 = 37.0, start = performance.now();
  function time() { return reduced ? T0 : T0 + (performance.now() - start) / 1000 * CFG.speed; }

  /* общая формула света. ambientWarp — искривление (дорогое, считать раз на пиксель),
     ambientAt — цвет в точке с уже готовым искривлением (дёшево, можно много раз). */
  var GLSL = [
    'uniform vec3 uABase,uAC1,uAC2,uAC3; uniform float uAInt;',
    'float ahash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float avnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);',
    '  return mix(mix(ahash(i),ahash(i+vec2(1.,0.)),u.x),mix(ahash(i+vec2(0.,1.)),ahash(i+vec2(1.,1.)),u.x),u.y); }',
    'float afbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<3;i++){ s+=a*avnoise(p); p=p*2.03+17.1; a*=.5; } return s; }',
    'vec2 ambientWarp(vec2 uv,float asp,float t){ vec2 p=vec2(uv.x*asp,uv.y);',
    '  return (vec2(afbm(p*1.1+vec2(t*.03,0.)),afbm(p*1.1+vec2(5.2,-t*.025)))-.5)*.32; }',
    'vec3 ambientAt(vec2 uv,float asp,float t,vec2 w){ vec2 p=vec2(uv.x*asp,uv.y); vec2 q=p+w;',
    '  vec2 c1=vec2(asp*(.5+.38*sin(t*.07)),.55+.32*cos(t*.05));',
    '  vec2 c2=vec2(asp*(.5+.40*sin(t*.05+2.)),.45+.35*cos(t*.06+1.));',
    '  vec2 c3=vec2(asp*(.5+.36*sin(t*.04+4.)),.50+.30*cos(t*.045+3.));',
    '  vec3 col=uABase;',
    '  col=mix(col,uAC1,uAInt*.30*exp(-dot(q-c1,q-c1)*2.2));',
    '  col=mix(col,uAC2,uAInt*.28*exp(-dot(q-c2,q-c2)*2.0));',
    '  col=mix(col,uAC3,uAInt*.22*exp(-dot(q-c3,q-c3)*2.6));',
    '  return col; }'
  ].join('\n');

  function rgb(hex) { var n = parseInt(hex.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  /* передать палитру в любую программу, где подключён GLSL */
  function bindUniforms(gl, prog) {
    var p = CFG.palette;
    gl.uniform3fv(gl.getUniformLocation(prog, 'uABase'), rgb(p.base));
    gl.uniform3fv(gl.getUniformLocation(prog, 'uAC1'), rgb(p.c1));
    gl.uniform3fv(gl.getUniformLocation(prog, 'uAC2'), rgb(p.c2));
    gl.uniform3fv(gl.getUniformLocation(prog, 'uAC3'), rgb(p.c3));
    gl.uniform1f(gl.getUniformLocation(prog, 'uAInt'), CFG.intensity);
  }
  function cssFallback() {
    var p = CFG.palette;
    return 'radial-gradient(40% 50% at 30% 40%,' + p.c1 + '66,transparent 70%),radial-gradient(45% 55% at 75% 60%,' + p.c2 + '66,transparent 70%),radial-gradient(35% 45% at 55% 25%,' + p.c3 + '55,transparent 70%),' + p.base;
  }

  var VS = 'attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }';
  var FS = [
    'precision highp float;',
    GLSL,
    'uniform vec2 uRes; uniform float uTime; uniform float uGrain;',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y;',
    '  vec3 col=ambientAt(uv,asp,uTime,ambientWarp(uv,asp,uTime));',
    '  float n=ahash(gl_FragCoord.xy+fract(uTime*7.13)*100.);',
    '  col+=(n-.5)*(2./255.)+(n-.5)*uGrain;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  var zoneCanvas = null; /* холст зоны — по нему стекло берёт координаты */

  function mountZone(zone) {
    if (zone._ambient) return zone._ambient;
    zone.classList.add('amb-zone');
    var layer = document.createElement('div'); layer.className = 'amb-layer'; layer.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas'); canvas.className = 'amb-canvas';
    layer.appendChild(canvas); zone.insertBefore(layer, zone.firstChild);

    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    function fail() { layer.remove(); zone.classList.add('amb-fallback'); zone.style.background = cssFallback(); return (zone._ambient = { ok: false }); }
    if (!gl) return fail();
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var prog;
    try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'aPos'); gl.linkProgram(prog); } catch (e) { return fail(); }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    bindUniforms(gl, prog);
    var uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uGrain = gl.getUniformLocation(prog, 'uGrain');
    zone.style.background = CFG.palette.base;
    zoneCanvas = canvas;

    var W = 1, H = 1;
    function resize() {
      var d = Math.min(global.devicePixelRatio || 1, CFG.maxDpr) * CFG.scale;
      var w = Math.max(1, Math.round(canvas.clientWidth * d)), h = Math.max(1, Math.round(canvas.clientHeight * d));
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, W, H); draw(); }
    }
    function draw() { gl.uniform2f(uRes, W, H); gl.uniform1f(uTime, time()); gl.uniform1f(uGrain, CFG.grain); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    var raf = 0, visible = true;
    function frame() { raf = 0; draw(); if (visible && !document.hidden) raf = requestAnimationFrame(frame); }
    function startLoop() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }
    var ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) startLoop(); }, { rootMargin: '100px' });
    io.observe(zone);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) startLoop(); });
    draw(); startLoop();
    return (zone._ambient = { ok: true, canvas: canvas });
  }

  global.AmbientLight = {
    GLSL: GLSL, time: time, bindUniforms: bindUniforms, palettes: PALETTES, config: CFG,
    mountZone: mountZone,
    /* прямоугольник холста зоны на экране — в нём считаются координаты света */
    rect: function () { return zoneCanvas ? zoneCanvas.getBoundingClientRect() : null; },
    active: function () { return !!zoneCanvas; }
  };

  function auto() { document.querySelectorAll('[data-ambient-zone]').forEach(mountZone); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})(window);
