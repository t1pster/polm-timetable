(()=>{
  const bind=()=>document.querySelectorAll('.event').forEach(el=>{
    if(el.dataset.dragfix)return;
    el.dataset.dragfix='1';
    el.addEventListener('pointerdown',ev=>{
      if(ev.pointerType==='touch'){
        ev.preventDefault();
        try{el.setPointerCapture(ev.pointerId)}catch{}
      }
    },{capture:true,passive:false});
  });
  bind();
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();
