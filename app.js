const $=id=>document.getElementById(id);
const G=$("grid"),GS=$("gridStage"),B=$("board"),M=$("modal"),S=$("sheet"),TM=$("tm"),TS=$("ts");
const TIMES=T.filter(t=>mm(t)<=mm("19:55")),DEFAULT_COLOR="#3e88b4";
let E=load(),edit=null,gesture=null,press=null,fitMode=false,fitScale=1,previousView=null,touchPointers=new Set();

function mm(t){const[a,b]=t.split(":").map(Number);return a*60+b}
function ff(v){v=Math.round(v);return String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0")}
function esc(s){return String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]))}
function clean(s){return String(s||"").replace(/\s*\(profilový predmet\)/gi,"").replace(/\s*\(PP\)/gi,"").trim()}
function load(){try{const x=JSON.parse(localStorage.getItem(K));if(Array.isArray(x)&&x.length)return x.map((e,i)=>({...e,id:e.id||"e"+i,color:e.color||DEFAULT_COLOR,cancelled:!!e.cancelled}))}catch{}return raw.map((e,i)=>({...e,id:"s"+i,color:e.color||DEFAULT_COLOR,cancelled:false}))}
function save(){localStorage.setItem(K,JSON.stringify(E))}
function metrics(){return{day:innerWidth<=700?166:300,time:innerWidth<=700?60:96,ppm:innerWidth<=700?2.2:1.65,head:innerWidth<=700?44:50}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function snapStart(v){let best=TIMES[0],d=Infinity;for(const t of TIMES){const x=Math.abs(mm(t)-v);if(x<d){d=x;best=t}}return best}
function snapEnd(v,start){const s=mm(start);let best=TIMES[TIMES.length-1],d=Infinity;for(const t of TIMES){const n=mm(t);if(n<=s)continue;const x=Math.abs(n-v);if(x<d){d=x;best=t}}return best}
function eventHeight(e,m){const i=Math.max(0,TIMES.indexOf(e.start)),next=TIMES[Math.min(TIMES.length-1,i+1)],minDur=Math.max(45,mm(next)-mm(e.start));return Math.max(minDur*m.ppm-8,(mm(e.end)-mm(e.start))*m.ppm-8)}
function rect(e,m){return{x:m.time+clamp(+e.day,0,D.length-1)*m.day+4,y:m.head+(mm(e.start)-mm(TIMES[0]))*m.ppm+4,w:m.day-8,h:eventHeight(e,m)}}
function gridHeight(m){return m.head+(mm(TIMES[TIMES.length-1])-mm(TIMES[0]))*m.ppm+2}
function conflicts(){const bad=new Set;for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){const a=E[i],b=E[j];if(a.day===b.day&&mm(a.start)<mm(b.end)&&mm(a.end)>mm(b.start)){bad.add(a.id);bad.add(b.id)}}return bad}
function fitText(el){const name=el.querySelector(".name");if(!name)return;let n=parseFloat(getComputedStyle(name).fontSize)||12.3;for(let k=0;k<30&&name.scrollHeight>name.clientHeight+1&&n>9.4;k++){n-=.12;name.style.fontSize=n+"px"}}

function applyFit(){
  const w=+(G.dataset.baseWidth||0),h=+(G.dataset.baseHeight||0);if(!w||!h)return;
  G.style.width=w+"px";G.style.height=h+"px";G.style.minWidth=w+"px";G.style.minHeight=h+"px";G.style.transformOrigin="0 0";
  if(fitMode){G.style.transform=`scale(${fitScale})`;GS.style.width=w*fitScale+"px";GS.style.height=h*fitScale+"px"}
  else{G.style.transform="none";GS.style.width=w+"px";GS.style.height=h+"px"}
}
function boardSize(){return{w:Math.max(1,B.clientWidth-2),h:Math.max(1,B.clientHeight-2)}}
function fitAll(){
  if(fitMode){fitMode=false;fitScale=1;applyFit();if(previousView)requestAnimationFrame(()=>{B.scrollLeft=previousView.left;B.scrollTop=previousView.top});previousView=null;return}
  const w=+(G.dataset.baseWidth||0),h=+(G.dataset.baseHeight||0);if(!w||!h)return;
  previousView={left:B.scrollLeft,top:B.scrollTop};const v=boardSize();fitScale=Math.min(1,(v.w-8)/w,(v.h-8)/h);if(!Number.isFinite(fitScale)||fitScale<=0)fitScale=1;
  fitMode=true;applyFit();requestAnimationFrame(()=>{B.scrollLeft=0;B.scrollTop=0});
}

function render(){
  const m=metrics(),h=gridHeight(m),w=m.time+m.day*D.length;
  G.innerHTML="";G.dataset.baseWidth=w;G.dataset.baseHeight=h;
  const c=document.createElement("div");c.className="corner";Object.assign(c.style,{width:m.time+"px",height:m.head+"px"});c.textContent="ČAS / DEŇ";G.appendChild(c);
  TIMES.slice(0,-1).forEach((t,i)=>{const q=document.createElement("div");q.className="time";Object.assign(q.style,{top:m.head+(mm(t)-mm(TIMES[0]))*m.ppm+"px",width:m.time+"px",height:(mm(TIMES[i+1])-mm(t))*m.ppm+"px"});q.textContent=t;G.appendChild(q)});
  D.forEach((d,di)=>{
    const q=document.createElement("div");q.className="day";Object.assign(q.style,{left:m.time+di*m.day+"px",width:m.day+"px",height:m.head+"px"});q.textContent=d;G.appendChild(q);
    for(let i=0;i<TIMES.length-1;i++){const c=document.createElement("div");c.className="cell"+(i%2?" alt":"");c.dataset.day=di;c.dataset.start=TIMES[i];Object.assign(c.style,{left:m.time+di*m.day+"px",top:m.head+(mm(TIMES[i])-mm(TIMES[0]))*m.ppm+"px",width:m.day+"px",height:(mm(TIMES[i+1])-mm(TIMES[i]))*m.ppm+"px"});G.appendChild(c)}
  });
  const bad=conflicts();E.forEach(e=>draw(e,bad,m));applyFit();requestAnimationFrame(()=>G.querySelectorAll(".event").forEach(fitText));
}

function draw(e,bad,m){
  const r=rect(e,m),el=document.createElement("div");el.className="event mine"+(bad.has(e.id)?" conflict":"")+(e.cancelled?" cancelled":"");el.dataset.id=e.id;Object.assign(el.style,{left:r.x+"px",top:r.y+"px",width:r.w+"px",height:r.h+"px",background:e.color||DEFAULT_COLOR});
  const n=clean(e.name),meta=[e.format,e.room,e.date].filter(Boolean).join(" · "),note=String(e.note||"").trim();
  const info=meta||note?`<div class="info">${meta?`<span class="meta">${esc(meta)}</span>`:""}${note?`<span class="note">${esc(note)}</span>`:""}</div>`:"";
  el.innerHTML=`<div class="content"><div class="name">${esc(n)}</div>${e.teacher?`<div class="teacher">${esc(e.teacher)}</div>`:""}${info}</div>${e.cancelled?'<div class="cancelLabel">×</div>':""}${bad.has(e.id)?'<div class="conflictBadge">KOLÍZIA</div>':""}<div class="handle hy" data-h="y"><i></i></div>`;
  G.appendChild(el);el.addEventListener("pointerdown",ev=>down(ev,e,el),{passive:false});
}

function clearPress(){if(press){clearTimeout(press.timer);press=null}}
function releaseGesture(){if(gesture?.el){gesture.el.classList.remove("dragging","resizing");gesture.el.style.touchAction=""}gesture=null}
function beginMove(e,el,x,y,pointerId,scale){
  const er=el.getBoundingClientRect(),br=B.getBoundingClientRect(),s=scale||1;
  gesture={kind:"move",id:e.id,el,sx:x,sy:y,orig:{day:e.day,start:e.start,end:e.end,left:parseFloat(el.style.left)||0,top:parseFloat(el.style.top)||0},m:metrics(),live:null,pointerId,scale:s,offsetX:(x-er.left)/s,offsetY:(y-er.top)/s,boardLeft:br.left,boardTop:br.top};
  el.classList.add("dragging");el.style.touchAction="none";
}
function beginResize(e,el,x,y,pointerId){gesture={kind:"resizeY",id:e.id,el,sx:x,sy:y,orig:{start:e.start,end:e.end,height:parseFloat(el.style.height)||eventHeight(e,metrics())},m:metrics(),live:null,pointerId};el.classList.add("resizing");el.style.touchAction="none"}

function down(ev,e,el){
  if(ev.button!==undefined&&ev.button!==0)return;
  if(ev.pointerType==="touch"){
    touchPointers.add(ev.pointerId);
    if(touchPointers.size>1){clearPress();releaseGesture();return}
  }
  const handle=ev.target.closest(".handle");
  if(handle){ev.preventDefault();ev.stopPropagation();beginResize(e,el,ev.clientX,ev.clientY,ev.pointerId);try{el.setPointerCapture(ev.pointerId)}catch{};return}
  clearPress();press={id:e.id,el,pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,active:false,moved:false,isTouch:ev.pointerType==="touch"};
  if(!press.isTouch){try{el.setPointerCapture(ev.pointerId)}catch{}}
  press.timer=setTimeout(()=>{
    if(!press||press.pointerId!==ev.pointerId||touchPointers.size>1)return;
    press.active=true;beginMove(e,el,press.x,press.y,press.pointerId,fitMode?fitScale:1);
    if(press.isTouch)try{el.setPointerCapture(ev.pointerId)}catch{}
  },press.isTouch?340:320);
}

function updateGesture(x,y,ev){
  if(!gesture)return;const e=E.find(z=>z.id===gesture.id);if(!e)return;
  if(ev){ev.preventDefault();ev.stopPropagation()}
  const m=gesture.m,scale=gesture.scale||1;
  if(gesture.kind==="move"){
    const br=B.getBoundingClientRect(),localX=(x-br.left+B.scrollLeft)/scale-gesture.offsetX,localY=(y-br.top+B.scrollTop)/scale-gesture.offsetY;
    const minLeft=m.time+4,maxLeft=m.time+4+(D.length-1)*m.day,day=clamp(Math.round((localX-minLeft)/m.day),0,D.length-1),left=clamp(minLeft+day*m.day,minLeft,maxLeft);
    const duration=Math.max(1,mm(e.end)-mm(e.start)),maxStart=mm(TIMES[TIMES.length-1])-duration,rawStart=mm(TIMES[0])+(localY-(m.head+4))/m.ppm,start=snapStart(clamp(rawStart,mm(TIMES[0]),maxStart)),end=snapEnd(mm(start)+duration,start);
    gesture.live={day,start,end,left,top:m.head+(mm(start)-mm(TIMES[0]))*m.ppm+4};gesture.el.style.left=gesture.live.left+"px";gesture.el.style.top=gesture.live.top+"px";
  }else{
    const startMin=mm(gesture.orig.start),next=TIMES[Math.min(TIMES.length-1,Math.max(1,TIMES.indexOf(gesture.orig.start)+1))],minH=Math.max(54,(mm(next)-startMin)*m.ppm-8),bottom=m.head+(startMin-mm(TIMES[0]))*m.ppm+4,maxH=Math.max(minH,gridHeight(m)-bottom-2),h=clamp(gesture.orig.height+(y-gesture.sy)/scale*1.15,minH,maxH);
    gesture.live={height:h};gesture.el.style.height=h+"px";
  }
  if(press)press.moved=true;
}
function move(ev){
  if(ev.pointerType==="touch"&&touchPointers.size>1){clearPress();releaseGesture();return}
  if(press&&press.pointerId===ev.pointerId&&!press.active){if(Math.hypot(ev.clientX-press.x,ev.clientY-press.y)>12){press.moved=true;clearPress()}return}
  if(gesture&&gesture.pointerId===ev.pointerId)updateGesture(ev.clientX,ev.clientY,ev);
}
function finish(ev){
  if(ev.pointerType==="touch")touchPointers.delete(ev.pointerId);
  if(press&&press.pointerId===ev.pointerId){const p=press,e=E.find(z=>z.id===p.id),active=p.active;clearPress();if(active&&gesture){commitMove(ev);return}if(e&&!p.moved)open(e);return}
  if(gesture&&gesture.pointerId===ev.pointerId&&gesture.kind==="resizeY"){commitResize();return}
  if(gesture&&gesture.pointerId===ev.pointerId&&gesture.kind==="move")commitMove(ev);
}
function commitMove(ev){const g=gesture,e=E.find(x=>x.id===g.id);if(!e){releaseGesture();return}g.el.classList.remove("dragging");g.el.style.touchAction="";if(g.live){e.day=g.live.day;e.start=g.live.start;e.end=g.live.end;save();render()}gesture=null}
function commitResize(){const g=gesture,e=E.find(z=>z.id===g.id);if(!e){releaseGesture();return}g.el.classList.remove("resizing");g.el.style.touchAction="";if(g.live){const endMin=mm(g.orig.start)+(g.live.height+8)/g.m.ppm;e.end=snapEnd(Math.min(endMin,mm(TIMES[TIMES.length-1])),g.orig.start);save();render()}gesture=null}
function cancelGesture(){clearPress();releaseGesture()}
document.addEventListener("pointermove",move,{passive:false});
document.addEventListener("pointerup",finish,{capture:true});
document.addEventListener("pointercancel",ev=>{if(ev.pointerType==="touch")touchPointers.delete(ev.pointerId);cancelGesture()},{capture:true});
document.addEventListener("pointerdown",ev=>{if(ev.pointerType==="touch")touchPointers.add(ev.pointerId)},{capture:true,passive:true});
G.addEventListener("click",ev=>{const c=ev.target.closest(".cell");if(c)addAt(+c.dataset.day,c.dataset.start)});

function fill(){$("start").innerHTML=TIMES.slice(0,-1).map(t=>`<option>${t}</option>`).join("");$("end").innerHTML=TIMES.slice(1).map(t=>`<option>${t}</option>`).join("")}
function showModal(){S.style.transform="translateY(0)";M.classList.add("open")}
function open(e){edit=e.id;$("badge").textContent="UPRAVIŤ HODINU";$("mt").textContent="Upraviť hodinu";$("name").value=e.name||"";$("day").value=e.day;$("start").value=e.start;$("end").value=e.end;$("format").value=e.format||"";$("room").value=e.room||"";$("teacher").value=e.teacher||"";$("date").value=e.date||"";$("note").value=e.note||"";$("color").value=e.color||DEFAULT_COLOR;$("cancelled").checked=!!e.cancelled;$("copy").style.display="block";$("del").style.display="block";showModal()}
function add(day=0,start="08:00"){edit=null;$("badge").textContent="NOVÁ HODINA";$("mt").textContent="Pridať hodinu";["name","format","room","teacher","date","note"].forEach(id=>$(id).value="");$("day").value=day;$("start").value=start;const idx=Math.max(0,TIMES.indexOf(start));$("end").value=TIMES[Math.min(TIMES.length-1,idx+1)];$("color").value=DEFAULT_COLOR;$("cancelled").checked=false;$("copy").style.display="none";$("del").style.display="none";showModal();setTimeout(()=>$('name').focus(),80)}
function addAt(day,start){add(day,start)}
function close(){M.classList.remove("open");S.style.transform="translateY(0)"}
$("add").onclick=()=>add();$("cancel").onclick=close;
$("save").onclick=()=>{const d={day:+$("day").value,start:$("start").value,end:$("end").value,name:$("name").value.trim()||"Nová hodina",type:"mine",format:$("format").value.trim(),room:$("room").value.trim(),teacher:$("teacher").value.trim(),date:$("date").value.trim(),note:$("note").value.trim(),color:$("color").value||DEFAULT_COLOR,cancelled:$("cancelled").checked};if(mm(d.end)<=mm(d.start))return;if(edit){const i=E.findIndex(x=>x.id===edit);if(i>=0)E[i]={...E[i],...d}}else E.push({...d,id:crypto.randomUUID?.()||String(Date.now())});save();close();render()};
$("copy").onclick=()=>{const e=E.find(x=>x.id===edit);if(e){E.push({...e,id:crypto.randomUUID?.()||String(Date.now())});save();close();render()}};
$("del").onclick=()=>{E=E.filter(x=>x.id!==edit);save();close();render()};
function sheetDrag(hit,target,fn){let y=null;hit.onpointerdown=e=>{e.preventDefault();y=e.clientY;try{hit.setPointerCapture(e.pointerId)}catch{}target.classList.add("drag")};hit.onpointermove=e=>{if(y===null)return;e.preventDefault();target.style.transform=`translateY(${clamp(e.clientY-y,0,360)}px)`};hit.onpointerup=e=>{if(y===null)return;const d=e.clientY-y;y=null;target.classList.remove("drag");if(d>55){target.style.transform="translateY(110%)";setTimeout(fn,180)}else target.style.transform="translateY(0)"}};
sheetDrag($("grab"),S,close);sheetDrag($("tgrab"),TS,()=>TM.classList.remove("open"));
$("title").onclick=()=>{$("titleInput").value=localStorage.getItem(TK)||"POLM · ZS 2026/27";TS.style.transform="translateY(0)";TM.classList.add("open")};$("tcancel").onclick=()=>TM.classList.remove("open");$("tsave").onclick=()=>{localStorage.setItem(TK,$("titleInput").value.trim()||"POLM · ZS 2026/27");TM.classList.remove("open");render()};
$("zoomFit").onclick=fitAll;
window.addEventListener("resize",()=>requestAnimationFrame(()=>{if(fitMode){fitMode=false;fitScale=1;render()}else render()}));
fill();render();
