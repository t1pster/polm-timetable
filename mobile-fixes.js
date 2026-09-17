(()=>{
  let touchState=null;
  let mobileFit=false;
  let mobileScale=1;
  let mobilePreviousView=null;
  let patching=false;

  const q=s=>document.querySelector(s);
  const board=()=>q('#board');
  const grid=()=>q('#grid');
  const stage=()=>q('#gridStage');
  const fitBtn=()=>q('#zoomFit');

  function cancelTouch(){
    if(touchState?.timer)clearTimeout(touchState.timer);
    touchState=null;
  }

  function eventForTarget(target){
    const el=target?.closest?.('.event');
    if(!el)return null;
    const id=el.dataset.id;
    const item=typeof E!=='undefined'?E.find(x=>x.id===id):null;
    return item?{el,item}:null;
  }

  function beginTouchDrag(state,t){
    if(!touchState||touchState!==state)return;
    const b=board();
    if(!b)return;
    if(state.timer){clearTimeout(state.timer);state.timer=null}
    state.active=true;
    state.scrollLeft=b.scrollLeft;
    state.scrollTop=b.scrollTop;
    const m=metrics();
    const e=state.item;
    state.m=m;
    state.origLeft=parseFloat(state.el.style.left)||0;
    state.origTop=parseFloat(state.el.style.top)||0;
    state.origHeight=parseFloat(state.el.style.height)||eventHeight(e,m);
    state.origStart=e.start;
    state.pointerStartX=t.clientX;
    state.pointerStartY=t.clientY;
    state.live=null;
    state.el.classList.add(state.kind==='resize'?'resizing':'dragging');
    b.scrollLeft=state.scrollLeft;
    b.scrollTop=state.scrollTop;
  }

  function updateTouch(t,ev){
    if(!touchState||!touchState.active)return false;
    const s=touchState,b=board();
    if(!b)return false;
    ev.preventDefault();
    ev.stopPropagation();
    b.scrollLeft=s.scrollLeft;
    b.scrollTop=s.scrollTop;
    const scale=mobileFit?(mobileScale||1):1;
    const m=s.m||metrics();
    const e=s.item;
    const dx=(t.clientX-s.pointerStartX)/scale;
    const dy=(t.clientY-s.pointerStartY)/scale;

    if(s.kind==='resize'){
      const nextIndex=Math.min(TIMES.length-1,Math.max(1,TIMES.indexOf(s.origStart)+1));
      const minH=Math.max(54,(mm(TIMES[nextIndex])-mm(s.origStart))*m.ppm-8);
      const startMin=mm(s.origStart);
      const bottom=m.head+(startMin-mm(TIMES[0]))*m.ppm+4;
      const maxH=Math.max(minH,gridHeight(m)-bottom-2);
      const h=clamp(s.origHeight+dy*1.15,minH,maxH);
      s.live={height:h};
      s.el.style.height=h+'px';
      return true;
    }

    const duration=Math.max(1,mm(e.end)-mm(e.start));
    const minLeft=m.time+4;
    const rawLeft=s.origLeft+dx;
    const day=clamp(Math.round((rawLeft-minLeft)/m.day),0,D.length-1);
    const left=minLeft+day*m.day;
    const rawTop=s.origTop+dy;
    const maxStart=Math.max(mm(TIMES[0]),mm(TIMES[TIMES.length-1])-duration);
    const rawStartMin=mm(TIMES[0])+(rawTop-(m.head+4))/m.ppm;
    const start=snapStart(clamp(rawStartMin,mm(TIMES[0]),maxStart));
    const top=m.head+(mm(start)-mm(TIMES[0]))*m.ppm+4;
    const end=snapEnd(mm(start)+duration,start);

    s.live={day,start,end,left,top};
    s.el.style.left=left+'px';
    s.el.style.top=top+'px';
    return true;
  }

  function commitTouch(){
    const s=touchState;
    if(!s)return;
    const e=s.item,b=board();
    s.el.classList.remove('dragging','resizing');
    if(s.live&&e){
      if(s.kind==='resize'){
        const endMin=mm(s.origStart)+(s.live.height+8)/s.m.ppm;
        e.end=snapEnd(Math.min(endMin,mm(TIMES[TIMES.length-1])),s.origStart);
      }else{
        e.day=s.live.day;
        e.start=s.live.start;
        e.end=s.live.end;
      }
      save();
      render();
    }
    if(b){b.scrollLeft=s.scrollLeft;b.scrollTop=s.scrollTop}
    touchState=null;
    requestAnimationFrame(applyMobileFit);
  }

  function onTouchStart(ev){
    const b=board();
    if(!b)return;
    if(ev.touches.length!==1){cancelTouch();return}
    const hit=eventForTarget(ev.target);
    if(!hit){cancelTouch();return}
    const t=ev.touches[0];
    const handle=ev.target.closest('.handle');
    cancelTouch();
    touchState={el:hit.el,item:hit.item,kind:handle?'resize':'move',startX:t.clientX,startY:t.clientY,pointerStartX:t.clientX,pointerStartY:t.clientY,moved:false,active:false,scrollLeft:b.scrollLeft,scrollTop:b.scrollTop,timer:null,m:null,live:null};
    const s=touchState;
    if(s.kind==='resize')beginTouchDrag(s,t);
    else s.timer=setTimeout(()=>beginTouchDrag(s,t),360);
    ev.stopPropagation();
  }

  function onTouchMove(ev){
    if(ev.touches.length!==1){cancelTouch();return}
    if(!touchState)return;
    const t=ev.touches[0];
    if(!touchState.active){
      if(Math.hypot(t.clientX-touchState.startX,t.clientY-touchState.startY)>12){
        touchState.moved=true;
        cancelTouch();
      }
      ev.stopPropagation();
      return;
    }
    updateTouch(t,ev);
  }

  function onTouchEnd(ev){
    if(!touchState)return;
    const s=touchState;
    ev.stopPropagation();
    if(s.active){commitTouch();return}
    const b=board();
    if(s.timer)clearTimeout(s.timer);
    touchState=null;
    if(!s.moved&&s.item){
      if(b){b.scrollLeft=s.scrollLeft;b.scrollTop=s.scrollTop}
      open(s.item);
    }
  }

  function patchNotes(){
    if(patching)return;
    const g=grid();
    if(!g||typeof E==='undefined')return;
    patching=true;
    g.querySelectorAll('.event').forEach(el=>{
      const e=E.find(x=>x.id===el.dataset.id);
      if(!e)return;
      const content=el.querySelector('.content');
      if(!content)return;
      const details=[e.format,e.room,e.date].filter(Boolean).join(' · ');
      let info=content.querySelector('.info');
      if(!details&&!e.note){if(info)info.remove();return}
      if(!info){info=document.createElement('div');info.className='info';content.appendChild(info)}
      let meta=info.querySelector('.meta');
      if(!meta){meta=document.createElement('span');meta.className='meta';info.prepend(meta)}
      meta.textContent=details;
      let note=info.querySelector('.note');
      if(e.note){
        if(!note){note=document.createElement('span');note.className='note';info.appendChild(note)}
        note.textContent=e.note;
      }else if(note)note.remove();
    });
    patching=false;
  }

  function applyMobileFit(){
    const b=board(),g=grid(),s=stage();
    if(!b||!g||!s)return;
    const w=+(g.dataset.baseWidth||0),h=+(g.dataset.baseHeight||0);
    if(!w||!h)return;
    g.style.width=w+'px';g.style.height=h+'px';g.style.minWidth=w+'px';g.style.minHeight=h+'px';g.style.transformOrigin='0 0';
    if(mobileFit){g.style.transform=`scale(${mobileScale})`;s.style.width=(w*mobileScale)+'px';s.style.height=(h*mobileScale)+'px'}
    else{g.style.transform='none';s.style.width=w+'px';s.style.height=h+'px'}
  }

  function doFitToggle(){
    const b=board(),g=grid(),s=stage();
    if(!b||!g||!s)return;
    const w=+(g.dataset.baseWidth||0),h=+(g.dataset.baseHeight||0);
    if(!w||!h)return;
    if(mobileFit){
      mobileFit=false;mobileScale=1;applyMobileFit();
      if(mobilePreviousView){b.scrollLeft=mobilePreviousView.left;b.scrollTop=mobilePreviousView.top}
      mobilePreviousView=null;return;
    }
    mobilePreviousView={left:b.scrollLeft,top:b.scrollTop};
    const vv=window.visualViewport;
    const bw=Math.max(1,Math.min(b.clientWidth||b.getBoundingClientRect().width,vv?.width||Infinity));
    const bh=Math.max(1,Math.min(b.clientHeight||b.getBoundingClientRect().height,vv?.height||Infinity));
    mobileScale=Math.min(1,(bw-8)/w,(bh-8)/h);
    if(!Number.isFinite(mobileScale)||mobileScale<=0)mobileScale=1;
    mobileFit=true;applyMobileFit();b.scrollLeft=0;b.scrollTop=0;
  }

  function init(){
    const b=board(),g=grid(),f=fitBtn();
    if(!b||!g||!f)return;
    b.style.width='fit-content';b.style.maxWidth='100%';b.style.alignSelf='flex-start';
    f.onclick=doFitToggle;
    g.addEventListener('touchstart',onTouchStart,{capture:true,passive:true});
    g.addEventListener('touchmove',onTouchMove,{capture:true,passive:false});
    g.addEventListener('touchend',onTouchEnd,{capture:true,passive:true});
    g.addEventListener('touchcancel',cancelTouch,{capture:true,passive:true});
    const observer=new MutationObserver(()=>{patchNotes();requestAnimationFrame(applyMobileFit)});
    observer.observe(g,{childList:true,subtree:true});
    patchNotes();applyMobileFit();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
