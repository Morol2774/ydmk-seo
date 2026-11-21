/* =====================================================================
   YDMK — волна первого экрана на WebGL
   Точный перенос SVG-волны (home.js + home.css) в один фрагментный шейдер:
   те же 5 слоёв (shadow, under, main, front, edge), те же формулы формы
   (две синусоиды, фаза по длительности слоя), те же повторяющиеся
   градиенты с той же скоростью движения, та же прозрачность и размытие.
   Размытие считается аналитически (гауссова кромка ленты через erf), а не
   фильтром, поэтому кадр стоит почти ничего, и всё считает видеокарта.
   Холст встаёт на место <svg> внутри .wv-ribbon, поэтому CSS-трансформации
   ленты (поворот, растяжение, сдвиг) остаются те же.
   Рисуется в 0.5 разрешения (лента размытая — разницы не видно),
   засыпает вне экрана и на скрытой вкладке; при reduced-motion — один кадр.
   Нет WebGL → остаётся исходная SVG-волна (home.js).
   ===================================================================== */
(function (global) {
  'use strict';

  /* Параметры формы — те же, что в home.js */
  var VS = 'attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec4 uMap; uniform float uK;', /* uMap: пиксель холста → viewBox (масштаб, сдвиг) */
    'uniform vec3 cPink,cPeach,cLav,cBlue,cMid;',
    'const float TAU=6.2831853;',
    /* форма ленты: центр и толщина как в home.js; ph — фаза 0..1 */
    'float waveC(float x,float mid,float a1,float l1,float p1,float a2,float l2,float p2,float ph){',
    '  return mid+a1*sin(TAU*x/l1+p1+TAU*ph)+a2*sin(TAU*x/l2+p2-2.*TAU*ph); }',
    'float erf_(float x){ float s=sign(x); x=abs(x); float t=1./(1.+.3275911*x);',
    '  float y=1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*exp(-x*x); return s*y; }',
    /* покрытие размытой лентой: полоса [c-th/2, c+th/2] с гауссовым размытием sigma */
    'float band(float y,float c,float th,float sg){ float k=.70710678/max(sg,.001);',
    '  return clamp(.5*(erf_((c+th*.5-y)*k)-erf_((c-th*.5-y)*k)),0.,1.); }',
    /* повторяющийся градиент из 5 стопов (0, .25, .5, .75, 1) */
    'vec3 rep5(float u,vec3 a,vec3 b,vec3 c,vec3 d,vec3 e){ u=fract(u)*4.;',
    '  if(u<1.) return mix(a,b,u); if(u<2.) return mix(b,c,u-1.); if(u<3.) return mix(c,d,u-2.); return mix(d,e,u-3.); }',
    'vec4 over(vec4 dst,vec3 c,float a){ return vec4(c*a+dst.rgb*(1.-a),a+dst.a*(1.-a)); }',
    'void main(){',
    /* пиксель холста → координаты viewBox 1400×400 (с запасом по краям) */
    '  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',
    '  vec2 p=(px-uMap.zw)/uMap.xy; float x=p.x, y=p.y; float s=uMap.x;',
    '  float t=uTime; vec4 acc=vec4(0.);',
    /* ранний выход: далеко от всех лент — пиксель пустой (экономит большую часть холста) */
    '  { float cm=waveC(x,208.,42.,1500.,0.,16.,620.,1.3,fract(t/12.)); float cu=waveC(x,258.,36.,1300.,2.1,14.,540.,.4,fract(t/9.));',
    '    float m=min(abs(y-cm-5.),abs(y-cu))-(130.+90.*uK); if(m>0.){ gl_FragColor=vec4(0.); return; } }',
    /* bbox пути по x: от -80 до 1480 → u 0..1 для градиентов objectBoundingBox */
    '  float u=(x+80.)/1560.;',
    /* --- shadow: main, 12s, сдвиг (1.5%, 2.5%) viewBox, blur 28, opacity .35; градиент x1 0→-1 за 7s */
    '  { vec2 q=p-vec2(21.,10.); float ph=fract(t/12.);',
    '    float c=waveC(q.x,208.,42.,1500.,0.,16.,620.,1.3,ph);',
    '    float a=band(q.y,c,150.,28.*uK)*.35; float uu=(q.x+80.)/1560.;',
    '    vec3 col=rep5(uu+t/7.,cPeach,cMid,cPeach,cMid,cPeach); acc=over(acc,col,a); }',
    /* --- under: under, 9s, blur 13, opacity .8; градиент x1 0→1 за 9s */
    '  { float ph=fract(t/9.);',
    '    float c=waveC(x,258.,36.,1300.,2.1,14.,540.,.4,ph);',
    '    float a=band(y,c,110.,13.*uK)*.8;',
    '    vec3 col=rep5(u-t/9.,cBlue,cMid,cPink,cMid,cBlue); acc=over(acc,col,a); }',
    /* --- main: main, 12s, blur 8, opacity .95, белая обводка 2px .75; градиент x1 0→-1 за 7s */
    '  { float ph=fract(t/12.);',
    '    float c=waveC(x,208.,42.,1500.,0.,16.,620.,1.3,ph);',
    '    float a=band(y,c,150.,8.*uK);',
    '    float st=band(y,c-75.,2.,8.*uK)+band(y,c+75.,2.,8.*uK);', /* обводка по краям ленты */
    '    vec3 col=rep5(u+t/7.,cPink,cMid,cBlue,cMid,cPink);',
    '    col=mix(col,vec3(1.),clamp(st*.75,0.,1.));',
    '    acc=over(acc,col,clamp(max(a,st*.75),0.,1.)*.95); }',
    /* --- front: main, 17s, scale(.88) от центра bbox + translateX(9% ширины bbox), blur 7, opacity .6; x1 0→1 за 7s */
    '  { float ph=fract(t/17.);',
    '    vec2 cen=vec2(700.,208.); vec2 q=(p-vec2(.09*1560.*.88,0.)-cen)/.88+cen;',
    '    float c=waveC(q.x,208.,42.,1500.,0.,16.,620.,1.3,ph);',
    '    float a=band(q.y,c,150.,7.*uK/.88)*.6; float uu=(q.x+80.)/1560.;',
    '    vec3 col=rep5(uu-t/7.,cPink,cMid,cBlue,cMid,cPink); acc=over(acc,col,a); }',
    /* --- edge: main, 12s, вертикальный фиолетовый градиент снизу, blur 6, opacity .8, режим overlay */
    '  { float ph=fract(t/12.);',
    '    float c=waveC(x,208.,42.,1500.,0.,16.,620.,1.3,ph);',
    '    float a=band(y,c,150.,6.*uK)*.8;',
    '    float v=clamp((y-(c-75.))/150.,0.,1.); float ea=smoothstep(.55,1.,v)*.5*a;',
    '    vec3 base=acc.rgb+vec3(.984,.98,.973)*(1.-acc.a);', /* что под ним: лента поверх светлого фона */
    '    vec3 pur=vec3(.624,.369,1.);',
    '    vec3 ov=mix(2.*base*pur,1.-2.*(1.-base)*(1.-pur),step(.5,base));',
    '    vec3 res=mix(base,ov,ea);',
    /* записываем как разницу к уже накопленному (premultiplied) */
    '    acc.rgb=acc.rgb+(res-base)*max(acc.a,ea); acc.a=max(acc.a,ea); }',
    '  gl_FragColor=acc;',
    '}'
  ].join('\n');

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function cssVar(el, name, fb) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : fb; }

  function mount(svg) {
    var ribbon = svg.parentNode, atmo = svg.closest('.atmo') || document.body;
    var canvas = document.createElement('canvas');
    canvas.className = 'wv-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;display:block;pointer-events:none';
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    var P;
    try { P = gl.createProgram(); gl.attachShader(P, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(P, 0, 'aPos'); gl.linkProgram(P); if (!gl.getProgramParameter(P, gl.LINK_STATUS)) return false; } catch (e) { return false; }
    gl.useProgram(P);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uRes', 'uTime', 'uMap', 'uK', 'cPink', 'cPeach', 'cLav', 'cBlue', 'cMid'].forEach(function (n) { U[n] = gl.getUniformLocation(P, n); });
    gl.uniform3fv(U.cPink, hex(cssVar(atmo, '--wv-pink', '#ffb3c2')));
    gl.uniform3fv(U.cPeach, hex(cssVar(atmo, '--wv-peach', '#f8c9a3')));
    gl.uniform3fv(U.cLav, hex(cssVar(atmo, '--wv-lav', '#cdb8ec')));
    gl.uniform3fv(U.cBlue, hex(cssVar(atmo, '--wv-blue', '#93d3ec')));
    gl.uniform3fv(U.cMid, hex('#fcc6f8'));

    /* холст встаёт вместо svg; svg удаляется — его SMIL-анимация больше не считается */
    ribbon.insertBefore(canvas, svg); svg.remove();

    /* у исходного svg overflow:visible — лента и размытие выходят за рамку.
       Холст покрывает viewBox с запасом: x −140…1540, y −120…520. */
    var VX0 = -140, VY0 = -120, VW = 1680, VH = 640;
    var SCALE = 0.4, W = 1, H = 1, sPix = 1, sCss = 1;
    function resize() {
      var bw = ribbon.clientWidth, bh = ribbon.clientHeight; if (!bw || !bh) return;
      var s = Math.max(bw / 1400, bh / 400); sCss = s; var ox = (bw - 1400 * s) / 2, oy = bh - 400 * s;
      canvas.style.left = (ox + VX0 * s) + 'px'; canvas.style.top = (oy + VY0 * s) + 'px';
      canvas.style.width = (VW * s) + 'px'; canvas.style.height = (VH * s) + 'px';
      var w = Math.max(1, Math.round(VW * s * SCALE)), h = Math.max(1, Math.round(VH * s * SCALE));
      sPix = w / VW;
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, W, H); }
      draw();
    }
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var start = performance.now(), T0 = 0;
    function now() { return reduced ? T0 : T0 + (performance.now() - start) / 1000; }
    function draw() {
        gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uTime, now());
      gl.uniform4f(U.uMap, sPix, sPix, -VX0 * sPix, -VY0 * sPix);
      gl.uniform1f(U.uK, 1 / sCss); /* blur в CSS задан в экранных px → в единицы viewBox */
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var raf = 0, visible = true, shown = true;
    var lastDraw = 0;
    /* волна медленная (циклы 7–17 с) — 30 кадров/с глазом не отличить от 60, а нагрузка вдвое меньше */
    function frame(ts) { raf = 0; if (ts - lastDraw >= 30) { lastDraw = ts; draw(); } if (visible && shown && !document.hidden && !reduced) raf = requestAnimationFrame(frame); }
    function startLoop() { if (!raf && visible && shown) raf = requestAnimationFrame(frame); }
    new ResizeObserver(resize).observe(ribbon); resize();
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; startLoop(); }).observe(atmo);
    document.addEventListener('visibilitychange', startLoop);
    /* на телефонах волна скрыта стилями — и холст не считаем */
    var mobile = global.matchMedia('(max-width:768px)');
    function sync() { shown = !mobile.matches; startLoop(); }
    if (mobile.addEventListener) mobile.addEventListener('change', sync); sync();
    draw();
    global.YDMKWave = { setTime: function (t) { reduced = true; T0 = t; draw(); } }; /* для сравнения кадров */
    return true;
  }

  global.YDMKWaveGL = { mount: mount };
})(window);
