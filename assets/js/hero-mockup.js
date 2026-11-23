/* =====================================================================
   YDMK — «живой» мокап первого экрана (index.html, .hero-mock)
   Видео под прозрачными экранами мокапа (matrix3d по углам экранов),
   наклон за курсором/пальцем с пружиной, блик по стеклу, глубина экрана.
   reduced-motion: видео не грузятся, сцена статична (постеры).
   Мобильный интернет / Save-Data: видео ноутбука не грузится (только постер).
   Без библиотек и инлайн-скриптов (CSP).
   ===================================================================== */
(function(){
  'use strict';
  var scene=document.getElementById('heroScene'); if(!scene)return;
  var tilt=scene.querySelector('.hm-tilt'), stage=scene.querySelector('.hm-stage'), glare=scene.querySelector('.hm-glare');
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, fine=matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- экраны: углы в координатах мокапа 1536×1024 (с запасом под «глубину») ---------- */
  var LAP=[[326.1,190.1],[1142.1,164.3],[1086.3,722.1],[272.8,700.7]];
  var PH =[[1071.3,337.5],[1304.5,337.0],[1289.4,880.4],[1057.7,872.3]];
  function grow(q,k){var cx=0,cy=0;q.forEach(function(p){cx+=p[0]/4;cy+=p[1]/4});return q.map(function(p){return[cx+(p[0]-cx)*k,cy+(p[1]-cy)*k]})}
  /* матрица гомографии: прямоугольник w×h → четырёхугольник q */
  function solve(A,b){var n=b.length;for(var i=0;i<n;i++){var m=i;for(var r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;
    var t=A[i];A[i]=A[m];A[m]=t;t=b[i];b[i]=b[m];b[m]=t;for(r=i+1;r<n;r++){var f=A[r][i]/A[i][i];for(var c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
    var x=new Array(n);for(i=n-1;i>=0;i--){var s=b[i];for(c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return x}
  function matrix3d(w,h,q){var src=[[0,0],[w,0],[w,h],[0,h]],A=[],b=[];
    for(var i=0;i<4;i++){var x=src[i][0],y=src[i][1],X=q[i][0],Y=q[i][1];
      A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y);}
    var p=solve(A,b);
    return 'matrix3d('+[p[0],p[3],0,p[6], p[1],p[4],0,p[7], 0,0,1,0, p[2],p[5],0,1].join(',')+')'}
  var scr=[{el:scene.querySelector('.hm-scr-lap'),w:1600,h:1000,q:grow(LAP,1.012),depth:7},
           {el:scene.querySelector('.hm-scr-ph'), w:436, h:1000,q:grow(PH,1.012), depth:5}];
  function place(dx,dy){scr.forEach(function(s){var q=s.q.map(function(p){return[p[0]-dx*s.depth,p[1]-dy*s.depth]});s.el.style.transform=matrix3d(s.w,s.h,q)})}

  /* ---------- масштаб сцены под ширину ---------- */
  function fit(){stage.style.transform='scale('+(scene.clientWidth/1536)+')'}
  new ResizeObserver(fit).observe(scene); fit(); place(0,0);

  /* ---------- видео: только когда видно; без «тяжёлого» на мобильном интернете ---------- */
  var c=navigator.connection||{}, lowData=!!c.saveData||/(^|-)2g|3g/.test(c.effectiveType||'')||c.type==='cellular';
  var vids=[].slice.call(scene.querySelectorAll('video')).filter(function(v){return !(v.hasAttribute('data-heavy')&&lowData)});
  function play(v){if(!v.src){v.src=v.dataset.src;v.addEventListener('playing',function(){v.previousElementSibling&&v.previousElementSibling.tagName==='IMG'&&(v.previousElementSibling.style.visibility='hidden')},{once:true})}
    var pr=v.play();pr&&pr.catch(function(){})}
  if(!reduced){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){vids.forEach(function(v){e.isIntersecting?play(v):v.pause()})})},{threshold:.15});
    io.observe(scene);
    document.addEventListener('visibilitychange',function(){vids.forEach(function(v){document.hidden?v.pause():(v.src&&play(v))})});
  }

  /* ---------- наклон с пружиной ---------- */
  if(reduced)return;
  var MAX_X=7, MAX_Y=11;                 /* градусы */
  var tx=0,ty=0, x=0,y=0, vx=0,vy=0, idle=0, raf=0, dragging=false, last=performance.now(), sx=0, sy=0;
  function target(nx,ny){tx=Math.max(-1,Math.min(1,nx));ty=Math.max(-1,Math.min(1,ny));kick()}
  function kick(){if(!raf)raf=requestAnimationFrame(step)}
  function step(now){
    raf=0; var dt=Math.min(.05,(now-last)/1000); last=now;
    var k=120, d=14;                      /* жёсткость и затухание: лёгкий перелёт */
    var gx=tx, gy=ty;
    if(!fine&&!dragging){idle+=dt; gx=Math.sin(idle*.7)*.18; gy=Math.cos(idle*.55)*.12}   /* лёгкое покачивание на телефоне */
    vx+=((gx-x)*k-vx*d)*dt; vy+=((gy-y)*k-vy*d)*dt; x+=vx*dt; y+=vy*dt;
    tilt.style.transform='rotateX('+(-y*MAX_X).toFixed(3)+'deg) rotateY('+(x*MAX_Y).toFixed(3)+'deg)';
    place(x,y);
    glare.style.setProperty('--gx',(30+x*40).toFixed(1)+'%'); glare.style.setProperty('--gy',(22+y*30).toFixed(1)+'%');
    glare.style.setProperty('--go',(.35+Math.min(1,Math.hypot(x,y))*.5).toFixed(3));
    if(Math.abs(gx-x)+Math.abs(gy-y)+Math.abs(vx)+Math.abs(vy)>.0005||(!fine&&!dragging))kick();
  }
  if(fine){
    var hero=scene.closest('.hero');
    hero.addEventListener('pointermove',function(e){var r=scene.getBoundingClientRect();target((e.clientX-(r.left+r.width/2))/(r.width*.6),(e.clientY-(r.top+r.height/2))/(r.height*.8))});
    hero.addEventListener('pointerleave',function(){target(0,0)});
  }else{
    scene.addEventListener('pointerdown',function(e){dragging=true;sx=e.clientX;sy=e.clientY});
    scene.addEventListener('pointermove',function(e){if(!dragging)return;target((e.clientX-sx)/120,(e.clientY-sy)/160)});
    ['pointerup','pointercancel','pointerleave'].forEach(function(t){scene.addEventListener(t,function(){dragging=false;target(0,0)})});
  }
  setTimeout(function(){scene.classList.remove('hm-enter')},1200);
  kick();
})();

/* ---------- размер мокапа = высота текстового блока (≥1101 px) ----------
   Видимая часть мокапа (растение сверху → низ ноутбука) занимает строки 45…895
   из 1024 px картинки. Мокап масштабируется так, чтобы эта часть совпала
   с высотой .hero-in, и сдвигается вверх, чтобы верхние края совпали. */
(function(){
  'use strict';
  var mock=document.getElementById('heroScene'), text=document.querySelector('.hero-in'); if(!mock||!text)return;
  var mq=matchMedia('(min-width:1240px)'), TOP=45/1024, VIS=(895-45)/1024, RATIO=1536/1024, EDGE=24;
  function size(){
    if(!mq.matches){mock.style.width='';mock.style.marginTop='';mock.style.marginBottom='';return;}
    var th=text.getBoundingClientRect().height, h=th/VIS, w=h*RATIO;
    var avail=document.documentElement.clientWidth-mock.getBoundingClientRect().left-EDGE;       /* до правого края окна */
    if(w>avail){w=avail;h=w/RATIO;}
    mock.style.width=Math.round(w)+'px';
    var off=h*TOP+(th-h*VIS)/2;                       /* верх устройств = верх текста (по центру, если ширины не хватило) */
    mock.style.marginTop=(-off).toFixed(1)+'px';
    mock.style.marginBottom=(-(h-off-th)).toFixed(1)+'px';
  }
  new ResizeObserver(size).observe(text); addEventListener('resize',size);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(size);
  size();
})();
