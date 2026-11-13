/* THE OUTSIDE — controls, narrative, simulated cosmic memory. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const worlds=[
 {id:'01',latin:'I. THE ORIGIN',category:'THE UNCREATED',short:'기원',title:'탄생 이전의<br /><i>형태.</i>',desc:'존재하지 않는 공간이 당신의 움직임에 반응합니다. 마우스를 움직이면, 아직 이름 붙여지지 않은 물리 법칙이 모습을 드러냅니다.'},
 {id:'02',latin:'II. THE FOLD',category:'NON-EUCLIDEAN SPACE',short:'접힘',title:'끝없이 접히는<br /><i>거리.</i>',desc:'직선은 여기서 방향을 잃습니다. 이 터널은 멀어지는 것이 아니라, 자기 자신 속으로 반복해서 접힙니다.'},
 {id:'03',latin:'III. THE MEMORY',category:'THE LIVING NETWORK',short:'기억',title:'우주가 당신을<br /><i>기억한다면.</i>',desc:'보이지 않는 연결들이 시선 주변에서 빛납니다. 살아 있는 별자리 사이로 이동하며, 존재의 흔적을 남겨보세요.'},
 {id:'04',latin:'IV. THE RECURSION',category:'THE INFINITE INSIDE',short:'재귀',title:'끝을 품고 있는<br /><i>무한.</i>',desc:'어떤 경계에 가까이 갈수록 또 다른 세계가 열립니다. 한 번의 연산이 수백만 개의 형태로 증식하는 공간입니다.'},
 {id:'05',latin:'V. THE HORIZON',category:'THE LAST QUESTION',short:'경계',title:'이 너머에도<br /><i>바깥이 있을까.</i>',desc:'빛조차 돌아올 수 없는 경계. 하지만 질문은 아직 남아 있습니다. 당신이 우주를 관찰한다면, 누가 당신을 관찰할까요?'},
 {id:'06',latin:'VI. THE OBSERVER',category:'THE ROOM THAT DID NOT EXIST',short:'관찰자',title:'당신은 처음부터<br /><i>우주 안에.</i>',desc:'여섯 번째 공간은 처음부터 존재하지 않았습니다. 당신이 지나온 궤적이 이 세계의 별자리로 기록되었습니다. 이제 이 우주는 당신의 우주입니다.'}
];
const canvas=$('universe'),particlesCanvas=$('particles'),pctx=particlesCanvas.getContext('2d');
const renderer=new UniverseRenderer(canvas),sound=new Soundscape();
const app=$('app');let entered=false,scene=0,transitioning=false,lastWheel=0,toastTimer=0,modalOpen=null;let visited=new Set([0]),unlocked=false;let trace=[];
let pointerDown=null,pointer={x:window.innerWidth*.5,y:window.innerHeight*.5},cursor={x:pointer.x,y:pointer.y};
let stars=[];let lastParticle=0;let pointerTrail=[];let frame=0;

function init(){renderNav();loadLaw();resizeParticles();window.addEventListener('resize',resizeParticles,{passive:true});
 $('enterBtn').addEventListener('click',enter);
 $('brand').addEventListener('click',e=>{e.preventDefault();if(entered)go(0);else window.scrollTo(0,0);});
 $('ruptureBtn').addEventListener('click',rupture);$('lawBtn').addEventListener('click',()=>openModal('law'));
 $('prevBtn').addEventListener('click',()=>go(scene-1));$('nextBtn').addEventListener('click',()=>go(scene+1));
 $('soundBtn').addEventListener('click',toggleSound);$('fullBtn').addEventListener('click',toggleFull);
 $('helpBtn').addEventListener('click',()=>openModal('help'));
 $('lawClose').addEventListener('click',closeModal);$('helpClose').addEventListener('click',closeModal);$('helpDone').addEventListener('click',closeModal);
 document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeModal));
 document.querySelectorAll('[data-law]').forEach(el=>el.addEventListener('click',()=>{$('lawInput').value=el.dataset.law;$('lawInput').focus();}));
 $('applyLaw').addEventListener('click',applyLaw);$('lawInput').addEventListener('keydown',e=>{if(e.key==='Enter')applyLaw();});
 window.addEventListener('keydown',keyDown);
 window.addEventListener('wheel',onWheel,{passive:false});
 window.addEventListener('pointermove',pointerMove,{passive:true});window.addEventListener('pointerdown',onDown,{passive:true});
 window.addEventListener('pointerup',onUp,{passive:true});window.addEventListener('pointercancel',()=>{pointerDown=null;});
 document.addEventListener('fullscreenchange',()=>{$('fullBtn').setAttribute('aria-label',document.fullscreenElement?'전체화면 종료':'전체화면');});
 renderer.start();requestAnimationFrame(particleLoop);
}
function renderNav(){const nav=$('sceneNav');nav.innerHTML='';nav.style.gridTemplateColumns=`repeat(${unlocked?6:5},1fr)`;worlds.slice(0,unlocked?6:5).forEach((w,i)=>{let b=document.createElement('button');b.type='button';b.className='scene-button'+(i===scene?' active':'');b.innerHTML=`<strong>${w.id}</strong><small>${w.short}</small>`;b.setAttribute('aria-label',`${w.id}번 세계 ${w.short}`);b.setAttribute('aria-current',i===scene?'step':'false');b.addEventListener('click',()=>go(i));nav.appendChild(b);});}
function enter(){if(entered)return;entered=true;app.classList.remove('is-intro');$('expedition').hidden=false;renderer.burst();setTimeout(()=>{$('intro').hidden=true;},1150);showToast('관찰자가 세계에 진입했습니다. 움직여 보세요.');}
function go(index){if(!entered){enter();}index=(index+(unlocked?6:5))%(unlocked?6:5);if(index===scene||transitioning||modalOpen)return;transitioning=true;const trans=$('transition');$('transitionNum').textContent=worlds[index].id+' / '+(index===5?'∞':'05');trans.classList.add('show');trans.setAttribute('aria-hidden','false');
 setTimeout(()=>{scene=index;visited.add(index);if(visited.size>=5&&!unlocked){unlocked=true;setTimeout(()=>showToast('새로운 차원이 생겼습니다. 06 / 관찰자'),1100);$('dockRange').textContent='01 — ∞';$('dockHeading').textContent='THE ROOM THAT DID NOT EXIST';}renderer.setScene(index);sound.setScene(index);updateWorld();},385);
 setTimeout(()=>{trans.classList.remove('show');trans.setAttribute('aria-hidden','true');},580);
 setTimeout(()=>{transitioning=false;},1040);
}
function updateWorld(){const w=worlds[scene];$('chapterIndex').textContent='CHAPTER '+w.id+' / '+(scene===5?'∞':'05');$('chapterCategory').textContent=w.category;$('chapterLatin').textContent=w.latin;$('chapterTitle').innerHTML=w.title;$('chapterDesc').textContent=w.desc;renderNav();$('stateText').textContent=scene===4?'SINGULARITY / NEAR':'REALITY / STABLE';document.title=w.short+' — THE OUTSIDE';if(scene===5){showToast('이 별자리는 당신의 움직임으로 만들어졌습니다.');}}
function onWheel(e){if(!entered||modalOpen)return;if(Math.abs(e.deltaY)<7)return;e.preventDefault();const now=performance.now();if(now-lastWheel<1050)return;lastWheel=now;go(scene+(e.deltaY>0?1:-1));}
function keyDown(e){const active=document.activeElement;if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA')){if(e.key==='Escape')closeModal();return;}if(e.key==='Escape'){closeModal();return;}if(modalOpen)return;
 if(!entered){if(e.key==='Enter'||e.key===' '){e.preventDefault();enter();}return;}
 if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();go(scene+1);}
 else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(scene-1);}
 else if(e.key==='r'||e.key==='R'||e.key===' '){e.preventDefault();rupture();}
 else if(e.key==='m'||e.key==='M')toggleSound();
 else if(e.key==='f'||e.key==='F')toggleFull();
 else if(e.key==='p'||e.key==='P')capture();
 else if(e.key==='l'||e.key==='L')openModal('law');
 else if(e.key==='?'||e.key==='/')openModal('help');
 else if(/^[1-6]$/.test(e.key))go(Number(e.key)-1);
}
function pointerMove(e){pointer.x=e.clientX;pointer.y=e.clientY;const nx=e.clientX/innerWidth,ny=e.clientY/innerHeight;renderer.setMouse(nx,ny);if(entered&&!modalOpen){const last=trace[trace.length-1];if(!last||Math.hypot(last.x-e.clientX,last.y-e.clientY)>7){trace.push({x:e.clientX,y:e.clientY});if(trace.length>440)trace.shift();}}$('coordinates').textContent='X '+(nx*2-1).toFixed(3)+' / Y '+(1-ny*2).toFixed(3);if(pointerDown&&!modalOpen&&!pointerDown.ui){const dx=e.clientX-pointerDown.lastX,dy=e.clientY-pointerDown.lastY;renderer.addDrag(dx,dy);pointerDown.lastX=e.clientX;pointerDown.lastY=e.clientY;}}
function onDown(e){pointerDown={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:performance.now(),ui:!!(e.target.closest&&e.target.closest('button,a,input,.modal-panel'))};$('cursor-halo').classList.add('down');}
function onUp(e){$('cursor-halo').classList.remove('down');if(!pointerDown)return;const dx=e.clientX-pointerDown.x,dy=e.clientY-pointerDown.y,dt=performance.now()-pointerDown.time;if(entered&&!modalOpen&&!pointerDown.ui&&e.pointerType==='touch'&&dt<950&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.3){go(scene+(dx<0?1:-1));}else if(entered&&!modalOpen&&!pointerDown.ui&&Math.abs(dx)<10&&Math.abs(dy)<10){renderer.energy=Math.min(2,renderer.energy+.18);}
 pointerDown=null;
}
function rupture(){renderer.burst();sound.burst();const f=$('flash');f.classList.remove('ignite');void f.offsetWidth;f.classList.add('ignite');$('stateText').textContent='REALITY / FRACTURED';setTimeout(()=>{$('stateText').textContent=scene===4?'SINGULARITY / NEAR':'REALITY / STABLE';},1250);}
async function toggleSound(){const on=await sound.toggle();$('soundText').textContent=on?'SOUND ON':'SOUND OFF';$('soundBtn').setAttribute('aria-label',on?'사운드 끄기':'사운드 켜기');if(!on&&sound.ctx===null)showToast('이 브라우저는 사운드 합성을 지원하지 않습니다.');}
async function toggleFull(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){showToast('이 환경에서는 전체화면을 사용할 수 없습니다.');}}
function capture(){try{const a=document.createElement('a');a.href=renderer.capture();a.download=`THE-OUTSIDE-${worlds[scene].id}-${new Date().toISOString().slice(0,10)}.png`;document.body.appendChild(a);a.click();a.remove();showToast('현재 우주의 이미지가 저장되었습니다.');}catch(e){showToast('이미지 저장을 지원하지 않는 브라우저입니다.');}}
function openModal(which){modalOpen=which;const modal=$(which==='law'?'lawModal':'helpModal');modal.hidden=false;setTimeout(()=>{(which==='law'?$('lawInput'):$('helpClose')).focus();},40);}
function closeModal(){if(!modalOpen)return;$(modalOpen==='law'?'lawModal':'helpModal').hidden=true;modalOpen=null;}
function hashLaw(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function loadLaw(){try{const str=localStorage.getItem('outside_law');if(str){$('lawInput').value=str;setLaw(str,false);}}catch(e){/* private mode */}}
function setLaw(str,animate=true){const hash=hashLaw(str);renderer.setSeed(hash/4294967295);$('seedLabel').textContent=hash.toString(16).padStart(8,'0').slice(0,8).toUpperCase();$('seedLabel').title=str;if(animate){rupture();showToast('세계의 물리 법칙이 재작성되었습니다. 고유 시드 '+$('seedLabel').textContent);}}
function applyLaw(){const str=$('lawInput').value.trim();if(!str){$('lawInput').focus();showToast('먼저 한 문장의 법칙을 입력해 주세요.');return;}setLaw(str);try{localStorage.setItem('outside_law',str);}catch(e){}closeModal();}
function showToast(str){const el=$('toast');el.textContent=str;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function resizeParticles(){const dpr=Math.min(window.devicePixelRatio||1,1.5);particlesCanvas.width=Math.floor(innerWidth*dpr);particlesCanvas.height=Math.floor(innerHeight*dpr);stars=Array.from({length:innerWidth<680?55:115},(_,i)=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,z:.25+Math.random()*.85,phase:Math.random()*6.28,drift:(Math.random()-.5)*.2}));}
function particleLoop(now){const ctx=pctx,w=particlesCanvas.width,h=particlesCanvas.height;const dpr=w/innerWidth;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(dpr,0,0,dpr,0,0);
 const isMemory=entered&&scene===2, isObserver=entered&&scene===5;let pts=[];
 for(let i=0;i<stars.length;i++){const s=stars[i];const x=s.x+Math.sin(now*.00011+s.phase)*25*s.z,y=s.y+Math.cos(now*.00013+s.phase)*19*s.z;let d=Math.hypot(x-pointer.x,y-pointer.y);const att=isMemory?Math.max(0,1-d/420):0;
 if(isMemory){const ox=(x-pointer.x)/(d+1),oy=(y-pointer.y)/(d+1);const shift=att*att*60;pts.push({x:x+ox*shift,y:y+oy*shift,d,att});}else pts.push({x,y,d,att});}
 if(isMemory){ctx.lineWidth=.7;for(let i=0;i<pts.length;i++){const a=pts[i];for(let j=i+1;j<pts.length;j++){const b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>120)continue;let alpha=(1-d/120)*.18*(.45+Math.max(a.att,b.att));ctx.strokeStyle=`rgba(124,220,241,${alpha})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
 for(let i=0;i<pts.length;i++){const p=pts[i],s=stars[i],a=(.12+.13*Math.sin(now*.001+s.phase))*(isMemory?1.7:1);ctx.beginPath();ctx.arc(p.x,p.y,isMemory?(1.2+s.z*1.2):(s.z*.75),0,Math.PI*2);ctx.fillStyle=`rgba(${isMemory?'136,226,245':'211,193,240'},${Math.max(.04,a)})`;ctx.fill();}
 if(isObserver&&trace.length>3){
   ctx.lineWidth=1.1;ctx.beginPath();
   for(let i=0;i<trace.length;i++){
     const p=trace[i],angle=i/trace.length*2*Math.PI*3.1;
     const x=innerWidth*.5+(p.x/innerWidth-.5)*innerWidth*.60+Math.cos(angle)*19;
     const y=innerHeight*.5+(p.y/innerHeight-.5)*innerHeight*.56+Math.sin(angle)*19;
     if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.strokeStyle='rgba(179,201,255,.21)';ctx.shadowColor='#a882e9';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
   for(let i=0;i<trace.length;i+=12){const p=trace[i];let angle=i/trace.length*2*Math.PI*3.1;const x=innerWidth*.5+(p.x/innerWidth-.5)*innerWidth*.60+Math.cos(angle)*19;const y=innerHeight*.5+(p.y/innerHeight-.5)*innerHeight*.56+Math.sin(angle)*19;
      ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fillStyle='rgba(219,187,255,.64)';ctx.fill();}
 }
 if(entered){pointerTrail.push({x:pointer.x,y:pointer.y,life:1});if(pointerTrail.length>22)pointerTrail.shift();for(let i=0;i<pointerTrail.length;i++){let p=pointerTrail[i];p.life-=.022;if(p.life<=0)continue;if(isMemory){ctx.beginPath();ctx.arc(p.x,p.y,(1.-p.life)*13+1.5,0,Math.PI*2);ctx.strokeStyle=`rgba(140,236,236,${p.life*.12})`;ctx.lineWidth=.7;ctx.stroke();}}}
 const halo=$('cursor-halo');cursor.x+=(pointer.x-cursor.x)*.1;cursor.y+=(pointer.y-cursor.y)*.1;if(entered&&innerWidth>680){halo.style.left=cursor.x+'px';halo.style.top=cursor.y+'px';}
 let integrity=(98.7-Math.min(35,renderer.rupture*26)+Math.sin(now*.00042)*.4);$('integrity').textContent=integrity.toFixed(1)+'%';$('integrityBar').style.width=integrity+'%';
 if(document.hidden){setTimeout(()=>requestAnimationFrame(particleLoop),150);}else requestAnimationFrame(particleLoop);
}
init();
})();
