/* YDMK — Home only: wave ribbon (shape generated as SMIL keyframes) + reviews carousel */
(function(){
  /* ---------- Wave ---------- */
  var svg=document.getElementById('wvSvg');
  if(svg){
    var X0=-80,X1=1480,N=220,F=12,T=Math.PI*2;
    var W={
      main: {mid:208,th:150,a1:42,l1:1500,p1:0,  a2:16,l2:620,p2:1.3},
      under:{mid:258,th:110,a1:36,l1:1300,p1:2.1,a2:14,l2:540,p2:.4}
    };
    function frame(w,t){
      var ph=T*t,top=[],bot=[];
      for(var i=0;i<=N;i++){
        var x=X0+(X1-X0)*i/N,
            c=w.mid+w.a1*Math.sin(T*x/w.l1+w.p1+ph)+w.a2*Math.sin(T*x/w.l2+w.p2-2*ph);
        top.push(x.toFixed(1)+' '+(c-w.th/2).toFixed(1));
        bot.unshift(x.toFixed(1)+' '+(c+w.th/2).toFixed(1));
      }
      return 'M '+top.join(' L ')+' L '+bot.join(' L ')+' Z';
    }
    var cache={},reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    svg.querySelectorAll('path[data-wave]').forEach(function(p){
      var k=p.dataset.wave;
      if(!cache[k]){cache[k]=[];for(var j=0;j<=F;j++)cache[k].push(frame(W[k],(j%F)/F));}
      p.setAttribute('d',cache[k][0]);
      if(reduce)return;
      var a=document.createElementNS('http://www.w3.org/2000/svg','animate');
      a.setAttribute('attributeName','d');a.setAttribute('dur',p.dataset.dur+'s');
      a.setAttribute('repeatCount','indefinite');a.setAttribute('values',cache[k].join(';'));
      p.appendChild(a);
    });
    /* on phones the wave is hidden (home.css) — stop it ticking too */
    var mobile=matchMedia('(max-width:768px)');
    function sync(){try{mobile.matches?svg.pauseAnimations():svg.unpauseAnimations();}catch(e){}}
    sync(); if(mobile.addEventListener)mobile.addEventListener('change',sync);
  }

  /* ---------- Reviews carousel ---------- */
  var track=document.getElementById('revTrack');
  function step(d){var c=track.querySelector('.review');var w=c?c.getBoundingClientRect().width+24:300;track.scrollBy({left:d*w,behavior:'smooth'});}
  if(track){
    document.getElementById('revPrev').addEventListener('click',function(){step(-1);});
    document.getElementById('revNext').addEventListener('click',function(){step(1);});
  }
})();
