/* YDMK — Portfolio: filter projects by service (portfolio.html?f=web|smm|photo) */
(function(){
  var bar=document.getElementById('filters'), grid=document.getElementById('pfgrid');
  function setFilter(f){
    bar.querySelectorAll('button').forEach(function(b){var on=b.dataset.f===f;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});
    grid.querySelectorAll('.proj').forEach(function(el){el.hidden=!(f==='all'||el.dataset.c===f);});
  }
  bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b){setFilter(b.dataset.f);history.replaceState(null,'',b.dataset.f==='all'?'portfolio.html':'?f='+b.dataset.f);}});
  var f=new URLSearchParams(location.search).get('f');
  if(f&&bar.querySelector('[data-f="'+f+'"]'))setFilter(f);
})();
