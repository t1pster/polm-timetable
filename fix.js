(()=>{
const B=document.getElementById("board"),G=document.getElementById("grid"),W=document.getElementById("scaleWrap"),Z=document.getElementById("zoomVal");
let fixDrag=null;
function clamp2(v,a,b){return Math.max(a,Math.min(b,v))}
function syncScale(s){viewScale=s;W.style.width=(baseW*s)+"px";W.style.height=(baseH*s)+"px";G.style.transform=`scale(${s})`;Z.textContent=Math.round(s*100)+"%";B.offsetWidth}
function scaleAt(s,cx,cy){s=clamp2(Math.round(s*100)/100,MIN_SCALE,MAX_SCALE);const old=viewScale||1,ox=B.scrollLeft+cx,oy=B.scrollTop+cy,wx=ox/old,wy=oy/old;syncScale(s);requestAnimationFrame(()=>{B.scrollLeft=Math.max(0,wx*s-cx);B.scrollTop=Math.max(0,wy*s-cy)})}
window.applyScale=syncScale;
window.setScale=s=>scaleAt(s,B.clientWidth/2,B.clientHeight/2);
window.fit=()=>{if(!baseW||!baseH)return;const w=Math.max(1,B.clientWidth-2),h=Math.max(1,B.clientHeight-2);scaleAt(clamp2(Math.min(w/baseW,h/baseH),MIN_SCALE,1),B.clientWidth/2,B.clientHeight/2)};
function dragCleanup(){if(!fixDrag)return;const d=fixDrag;clearTimeout(d.timer);d.el.classList.remove("dragging","resizing");d.el.style.touchAction="none";try{d.el.releasePointerCapture(d.pid)}catch{};fixDrag=null}
window.down=(ev,e,el)=>{
 if(ev.pointerType!=="touch"&&(ev.button!==undefined&&ev.button!==0))return;
 ev.preventDefault();ev.stopPropagation();
 const isResize=!!ev.target.closest?.(".handle")?.dataset.h;
 dragCleanup();
 if(isResize){
   const m=metrics();fixDrag={kind:"resizeY",id:e.id,el,pid:ev.pointerId,sx:ev.clientX,sy:ev.clientY,orig:{start:e.start,height:parseFloat(el.style.height)||eventHeight(e,m)},moved:false,m};
   el.classList.add("resizing");el.style.touchAction="none";try{el.setPointerCapture(ev.pointerId)}catch{};
 }else{
   fixDrag={kind:"move",id:e.id,el,pid:ev.pointerId,sx:ev.clientX,sy:ev.clientY,active:false,moved:false,orig:{day:e.day,start:e.start,end:e.end,left:parseFloat(el.style.left)||0,top:parseFloat(el.style.top)||0},m:metrics(),timer:null};
   el.classList.remove("dragging","resizing");el.style.touchAction="none";try{el.setPointerCapture(ev.pointerId)}catch{};
   const d=fixDrag;d.timer=setTimeout(()=>{if(fixDrag===d&&d.pid===ev.pointerId){d.active=true;d.moved=false;d.el.classList.add("dragging")}},300);
 }
};
function pointerMove(ev){const d=fixDrag;if(!d||d.pid!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();
 if(d.kind==="move"){
   if(!d.active){if(Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)>12){d.moved=true;clearTimeout(d.timer);d.timer=null}return}
   const m=d.m,s=viewScale||1,dx=(ev.clientX-d.sx)/s,dy=(ev.clientY-d.sy)/s,h=eventHeight(E.find(x=>x.id===d.id)||{start:d.orig.start,end:d.orig.end},m);
   const left=clamp2(d.orig.left+dx,m.time+4,m.time+4+(D.length-1)*m.day),top=clamp2(d.orig.top+dy,m.head+4,Math.max(m.head+4,gridHeight(m)-h-4));d.live={x:left,y:top};d.el.style.left=left+"px";d.el.style.top=top+"px";
 }else{
   const startMin=mm(d.orig.start),next=TIMES[Math.min(TIMES.length-1,Math.max(1,TIMES.indexOf(d.orig.start)+1))],minH=Math.max(54,(mm(next)-startMin)*m.ppm-8),bottomStart=m.head+(startMin-mm(TIMES[0]))*m.ppm+4,maxH=Math.max(minH,gridHeight(m)-bottomStart-2);d.live={height:clamp2(d.orig.height+(ev.clientY-d.sy),minH,maxH)};d.el.style.height=d.live.height+"px";
 }
 d.moved=true;
}
function pointerUp(ev){const d=fixDrag;if(!d||d.pid!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();clearTimeout(d.timer);const e=E.find(x=>x.id===d.id);if(e&&d.moved){if(d.kind==="move"&&d.live){const m=d.m,dx=d.live.x-d.orig.left,dy=d.live.y-d.orig.top;e.day=clamp2(d.orig.day+Math.round(dx/m.day),0,D.length-1);const rawStart=mm(d.orig.start)+dy/m.ppm;e.start=snapStart(clamp2(rawStart,mm(TIMES[0]),mm(TIMES[TIMES.length-1])-1));const dur=Math.max(1,mm(d.orig.end)-mm(d.orig.start)),wanted=mm(e.start)+dur;e.end=TIMES.some(t=>mm(t)===wanted)?ff(wanted):snapEnd(wanted,e.start);if(mm(e.end)>mm(TIMES[TIMES.length-1]))e.end=TIMES[TIMES.length-1]}else if(d.kind==="resizeY"&&d.live){const endMin=mm(d.orig.start)+(d.live.height+8)/d.m.ppm;e.end=snapEnd(Math.min(endMin,mm(TIMES[TIMES.length-1])),d.orig.start)}save();render()}else if(d.kind==="move"&&!d.active&&!d.moved&&e){open(e)}d.el.classList.remove("dragging","resizing");d.el.style.touchAction="none";try{d.el.releasePointerCapture(ev.pointerId)}catch{};fixDrag=null}
function pointerCancel(ev){if(fixDrag&&fixDrag.pid===ev.pointerId){dragCleanup()}}
EventTarget.prototype.addEventListener.call(document,"pointermove",pointerMove,{passive:false,capture:true});
EventTarget.prototype.addEventListener.call(document,"pointerup",pointerUp,{passive:false,capture:true});
EventTarget.prototype.addEventListener.call(document,"pointercancel",pointerCancel,{passive:false,capture:true});
function pStart(a,b){dragCleanup();const r=B.getBoundingClientRect(),cx=(a.clientX+b.clientX)/2-r.left,cy=(a.clientY+b.clientY)/2-r.top,dist=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));pinch={startScale:viewScale||1,startDist:dist,cx,cy,wx:(B.scrollLeft+cx)/(viewScale||1),wy:(B.scrollTop+cy)/(viewScale||1)};B.classList.add("pinching")}
function pMove(a,b,ev){if(!pinch)return;ev.preventDefault();const dist=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),s=clamp2(Math.round(pinch.startScale*(dist/pinch.startDist)*100)/100,MIN_SCALE,MAX_SCALE);syncScale(s);requestAnimationFrame(()=>{B.scrollLeft=Math.max(0,pinch.wx*s-pinch.cx);B.scrollTop=Math.max(0,pinch.wy*s-pinch.cy)})}
function pEnd(){pinch=null;B.classList.remove("pinching")}
B.addEventListener("touchstart",ev=>{if(ev.touches.length>=2){pStart(ev.touches[0],ev.touches[1]);ev.preventDefault()}},{passive:false,capture:true});
B.addEventListener("touchmove",ev=>{if(ev.touches.length>=2&&pinch)pMove(ev.touches[0],ev.touches[1],ev)},{passive:false,capture:true});
B.addEventListener("touchend",ev=>{if(ev.touches.length<2)pEnd()},{passive:false,capture:true});
B.addEventListener("touchcancel",pEnd,{passive:false,capture:true});
document.addEventListener("touchstart",ev=>{if(ev.touches.length>=2&&B.contains(ev.target)){dragCleanup();ev.preventDefault()}},{passive:false,capture:true});
["gesturestart","gesturechange","gestureend"].forEach(t=>document.addEventListener(t,ev=>{if(B.contains(ev.target))ev.preventDefault()},{passive:false,capture:true}));
setTimeout(()=>window.setScale(viewScale||1),0);
})();