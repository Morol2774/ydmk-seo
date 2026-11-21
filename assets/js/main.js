/* YDMK — shared on every page: mobile menu, toast, "coming soon" links */
(function(){
  var burger=document.getElementById('burger'), mnav=document.getElementById('mnav');
  if(burger&&mnav){
    burger.addEventListener('click',function(){var o=mnav.classList.toggle('open');burger.setAttribute('aria-expanded',o);});
    mnav.addEventListener('click',function(e){if(e.target.closest('a')){mnav.classList.remove('open');burger.setAttribute('aria-expanded','false');}});
  }

  var tEl=document.getElementById('toast'),tT;
  window.ydmkToast=function(m){if(!tEl)return;tEl.textContent=m;tEl.classList.add('show');clearTimeout(tT);tT=setTimeout(function(){tEl.classList.remove('show');},2600);};

  document.addEventListener('click',function(e){
    var soon=e.target.closest('[data-soon]');
    if(soon){e.preventDefault();window.ydmkToast(soon.dataset.soon+' link will be added when the project goes live.');}
  });
})();
