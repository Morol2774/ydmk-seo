/* YDMK — Contact: request form validation + summary. contact.html?pkg=starter|business|store|growth preselects a package */
(function(){
  var form=document.getElementById('reqForm'), done=document.getElementById('done'), date=document.getElementById('f-date');
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var tmr=new Date(); tmr.setDate(tmr.getDate()+1); date.min=iso(tmr);
  function clearErr(el){var f=el.closest('.f');if(f)f.classList.remove('err');}
  form.addEventListener('input',function(e){clearErr(e.target);if(e.target.id==='f-consent')document.getElementById('consentRow').classList.remove('err');});
  form.addEventListener('change',function(e){clearErr(e.target);});
  function sunday(v){if(!v)return false;var p=v.split('-');return new Date(+p[0],+p[1]-1,+p[2]).getDay()===0;}
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var bad=null;
    form.querySelectorAll('.f [required]').forEach(function(el){
      var ok=el.value.trim()!==''&&el.checkValidity(); if(el===date&&sunday(el.value))ok=false;
      el.closest('.f').classList.toggle('err',!ok); if(!ok&&!bad)bad=el;
    });
    var c=document.getElementById('f-consent');
    document.getElementById('consentRow').classList.toggle('err',!c.checked);
    if(!c.checked&&!bad)bad=c;
    if(bad){bad.focus();bad.scrollIntoView({behavior:'smooth',block:'center'});window.ydmkToast('Please complete the highlighted fields.');return;}
    var fd=new FormData(form), sel=document.getElementById('f-pkg'), svcs=fd.getAll('svc');
    var dt=date.value.split('-'), dstr=new Date(+dt[0],+dt[1]-1,+dt[2]).toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'});
    var rows=[['Business',fd.get('business')],['Package',sel.options[sel.selectedIndex].text.split(' · ')[0]],['Services',svcs.length?svcs.join(', '):'—'],['Call',dstr+', '+fd.get('time').split(' (')[0]],['Language',fd.get('lang')],['Contact via',fd.get('via')]];
    var box=document.getElementById('dSum'); box.innerHTML='';
    rows.forEach(function(r){var d=document.createElement('div'),a=document.createElement('span'),b=document.createElement('span');a.textContent=r[0];b.textContent=r[1];d.append(a,b);box.appendChild(d);});
    document.getElementById('dName').textContent=String(fd.get('name')).split(' ')[0];
    form.hidden=true; done.hidden=false;
    document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.getElementById('again').addEventListener('click',function(){form.reset();date.min=iso(tmr);done.hidden=true;form.hidden=false;});

  var pkg=new URLSearchParams(location.search).get('pkg'), sel=document.getElementById('f-pkg');
  if(pkg&&sel.querySelector('option[value="'+pkg+'"]'))sel.value=pkg;
})();
