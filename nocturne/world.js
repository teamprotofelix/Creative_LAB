/* NOCTURNE — GitHub Pages / file:// 에서 동작하는 순수 JavaScript 정원 */
(() => {
  'use strict';
  const canvas=document.getElementById('world');
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx){
    document.getElementById('hint').textContent='Canvas 2D를 지원하는 최신 브라우저에서 열어주세요.';
    return;
  }
  const MAX_FLOWERS=120;
  const STORAGE_KEY='nocturne.garden.v2';
  const OLD_STORAGE_KEY='nocturne.garden.v1';
  const reducedQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion=reducedQuery.matches;
  const audio=new AmbientAudio();
  const intro=document.getElementById('intro');
  const poem=document.getElementById('poem');
  const poemText=poem.querySelector('.poem-text');
  const counter=document.getElementById('counter');
  const countText=counter.querySelector('.count');
  const hint=document.getElementById('hint');
  const timeLabel=document.getElementById('time-label');
  const btnSound=document.getElementById('btn-sound');
  const btnUndo=document.getElementById('btn-undo');
  const btnExport=document.getElementById('btn-export');
  const btnImport=document.getElementById('btn-import');
  const btnClear=document.getElementById('btn-clear');
  const fileInput=document.getElementById('file-import');
  const dialog=document.getElementById('clear-dialog');
  const toastEl=document.getElementById('toast');
  const palettes=[
    {name:'DAWN', top:'#1b1128',bottom:'#29203b',cloud:'#8b5272'},
    {name:'DAY', top:'#101b30',bottom:'#223458',cloud:'#587aa1'},
    {name:'DUSK',top:'#1d132e',bottom:'#30243e',cloud:'#93628e'},
    {name:'NIGHT',top:'#060a17',bottom:'#10162a',cloud:'#6c66ac'}
  ];
  let palette=palettes[3];
  let W=0,H=0,dpr=1,bg=null;
  let flowers=[],stars=[],shootingStars=[],ripples=[],sparks=[];
  let selected=null,hovered=null,mouse={x:W/2,y:H/2};
  let pointerStart=null;
  let lastMoveX=-100,lastMoveY=-100;
  let lastActivity=performance.now(),lastTime=performance.now();
  let toastTimer=null;

  function toast(text){
    toastEl.textContent=text;toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2600);
  }
  function getPalette(){
    const hour=new Date().getHours();
    return hour>=5&&hour<8?palettes[0]:hour>=8&&hour<18?palettes[1]:hour>=18&&hour<21?palettes[2]:palettes[3];
  }
  function updatePalette(){
    const next=getPalette();
    if(next!==palette){palette=next;buildBackground();}
    const date=new Date();
    timeLabel.textContent=`${palette.name} · ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }
  function buildBackground(){
    if(!W||!H)return;
    const back=document.createElement('canvas');
    // 큰 화면에서도 메모리 사용량을 제한합니다.
    const scale=Math.min(1,1400/Math.max(W,H));
    back.width=Math.max(1,Math.round(W*scale));back.height=Math.max(1,Math.round(H*scale));
    const c=back.getContext('2d');c.scale(scale,scale);
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,palette.top);g.addColorStop(1,palette.bottom);
    c.fillStyle=g;c.fillRect(0,0,W,H);
    const clouds=[
      [W*.24,H*.34,Math.max(W*.43,H*.52),palette.cloud,.21],
      [W*.77,H*.57,Math.max(W*.34,H*.43),'#a17c9d',.09],
      [W*.51,H*1.05,Math.max(W*.52,H*.35),'#b2a5bf',.08]
    ];
    for(const [x,y,r,color,alpha] of clouds){
      const glow=c.createRadialGradient(x,y,0,x,y,r);
      glow.addColorStop(0,hexToRgba(color,alpha));glow.addColorStop(1,hexToRgba(color,0));
      c.fillStyle=glow;c.fillRect(x-r,y-r,r*2,r*2);
    }
    const horizon=c.createLinearGradient(0,H*.7,0,H);
    horizon.addColorStop(0,'rgba(7,12,22,0)');horizon.addColorStop(1,'rgba(3,7,14,.8)');
    c.fillStyle=horizon;c.fillRect(0,H*.7,W,H*.3);
    bg=back;
  }
  function hexToRgba(hex,alpha){
    const n=parseInt(hex.slice(1),16);
    return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`;
  }
  function initStars(){
    stars=[];
    const count=Math.min(250,Math.max(70,Math.floor(W*H/5600)));
    for(let i=0;i<count;i++)stars.push({
      u:Math.random(),v:Math.random(),size:.35+Math.random()*1.45,
      phase:Math.random()*6.283,twinkle:.7+Math.random()*1.1,
      alpha:.26+Math.random()*.58
    });
  }
  function resize(){
    W=Math.max(1,window.innerWidth);H=Math.max(1,window.innerHeight);
    dpr=Math.min(1.5,window.devicePixelRatio||1);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    canvas.style.width=`${W}px`;canvas.style.height=`${H}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    initStars();buildBackground();
    flowers.forEach(f=>f.setViewport(W,H));
  }
  function syncUI(){
    countText.textContent=String(flowers.length);
    btnUndo.disabled=flowers.length===0;
    btnClear.disabled=flowers.length===0;
    intro.classList.toggle('hidden',flowers.length>0);
    hint.textContent=flowers.length>=MAX_FLOWERS?'정원이 가득 찼어요. ⇩ 로 백업하거나 ↶ 로 되돌리세요.':
      flowers.length?'빈 하늘을 누르면 꽃이 피고, 꽃을 누르면 시가 열립니다':'빈 하늘을 클릭해 별꽃을 심어주세요';
  }
  function serialize(){return {format:'nocturne-garden',version:2,flowers:flowers.map(f=>f.toJSON())};}
  function saveGarden(){
    try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(serialize()));return true;}
    catch(error){console.warn('[NOCTURNE] Storage unavailable:',error);return false;}
  }
  function normalizeEntries(input){
    const raw=Array.isArray(input)?input:input&&input.flowers;
    if(!Array.isArray(raw))throw new Error('올바른 정원 파일이 아닙니다.');
    const result=[];
    for(const item of raw.slice(0,MAX_FLOWERS)){
      if(!item||typeof item!=='object')continue;
      const seed=Number(item.seed);
      let u=Number(item.u),v=Number(item.v);
      // 1.x 자료 호환: 과거 버전에서 화면 픽셀로 저장했던 꽃 위치
      if(!Number.isFinite(u)||!Number.isFinite(v)){
        u=Number(item.x)/W;v=Number(item.y)/H;
      }
      if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(u)||!Number.isFinite(v))continue;
      if(u<0||u>1||v<0||v>1)continue;
      result.push({u,v,seed});
    }
    return result;
  }
  function createFlower(entry,full=true){
    const f=new Flower(entry.u,entry.v,entry.seed);
    f.setViewport(W,H);
    if(full)f.age=f.duration;
    return f;
  }
  function loadGarden(){
    try{
      const current=window.localStorage.getItem(STORAGE_KEY);
      const old=current?null:window.localStorage.getItem(OLD_STORAGE_KEY);
      if(!current&&!old)return;
      const entries=normalizeEntries(JSON.parse(current||old));
      flowers=entries.map(e=>createFlower(e));
      if(old)saveGarden();
    }catch(error){console.warn('[NOCTURNE] Invalid saved garden ignored:',error);}
  }
  function showPoem(f){
    if(!f){poem.classList.remove('visible');return;}
    poemText.textContent=f.poem;
    poem.classList.add('visible');
  }
  function selectFlower(f){
    selected=f;
    showPoem(f);
    if(f)audio.note(f.noteFreq,1.8,.14);
  }
  function activate(){lastActivity=performance.now();}
  function burst(x,y,count=16){
    for(let i=0;i<count&&sparks.length<180;i++){
      const a=Math.random()*Math.PI*2,speed=28+Math.random()*100;
      sparks.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-16,life:.6+Math.random()*.65,max:1.25,size:.5+Math.random()*2});
    }
    ripples.push({x,y,r:2,age:0});
    if(ripples.length>24)ripples.shift();
  }
  function plant(x,y){
    if(flowers.length>=MAX_FLOWERS){toast('120송이의 별꽃이 모두 피어났습니다.');return;}
    const u=clamp(x/W,.045,.955);
    const v=clamp(y/H,Math.min(.46,Math.max(.3,200/H)),.94);
    const seed=Math.floor(Math.random()*4294967296);
    const f=createFlower({u,v,seed},false);
    flowers.push(f);
    selectFlower(f);
    burst(x,y,23);
    audio.bloom(seed);
    const saved=saveGarden();syncUI();activate();
    if(!saved)toast('이 브라우저에서는 자동 저장이 제한됩니다. ⇩ 로 백업하세요.');
  }
  function findFlower(x,y,time){
    for(let i=flowers.length-1;i>=0;i--){
      if(flowers[i].isHovered(x,y,time,reduceMotion))return flowers[i];
    }
    return null;
  }
  function pointerPosition(e){const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};
  });
  canvas.addEventListener('pointerup',e=>{
    if(!pointerStart||pointerStart.id!==e.pointerId)return;
    const start=pointerStart;pointerStart=null;
    if(Math.hypot(start.x-e.clientX,start.y-e.clientY)>14)return;
    const p=pointerPosition(e);
    const hit=findFlower(p.x,p.y,performance.now()/1000);
    if(hit)selectFlower(hit);else plant(p.x,p.y);
    activate();
  });
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
  canvas.addEventListener('pointerleave',()=>{hovered=null;if(!selected)showPoem(null);});
  canvas.addEventListener('pointermove',e=>{
    const p=pointerPosition(e);mouse=p;
    activate();
    if(e.pointerType==='mouse'||e.pointerType==='pen'){
      const hit=findFlower(p.x,p.y,performance.now()/1000);
      if(hit!==hovered){hovered=hit;if(!selected||hit)showPoem(hit||selected);}
      canvas.style.cursor=hit?'pointer':'crosshair';
      const dist=Math.hypot(p.x-lastMoveX,p.y-lastMoveY);
      if(dist>25){lastMoveX=p.x;lastMoveY=p.y;
        if(sparks.length<170)sparks.push({x:p.x,y:p.y,vx:(Math.random()-.5)*8,vy:-10-Math.random()*15,life:.75,max:.75,size:1});
      }
    }
  },{passive:true});
  document.getElementById('btn-plant').addEventListener('click',()=>plant(W*.5,H*.72));
  document.getElementById('poem-close').addEventListener('click',()=>{selected=null;hovered=null;showPoem(null);});
  btnSound.addEventListener('click',async()=>{
    const on=await audio.toggle();
    btnSound.setAttribute('aria-pressed',String(on));
    btnSound.title=on?'배경 음악 끄기':'배경 음악 켜기';
    btnSound.setAttribute('aria-label',btnSound.title);
    if(!on&&!audio.ctx)toast('이 브라우저에서는 오디오를 사용할 수 없습니다.');
    activate();
  });
  btnUndo.addEventListener('click',()=>{
    if(!flowers.length)return;
    flowers.pop();selectFlower(null);hovered=null;
    saveGarden();syncUI();activate();toast('마지막 별꽃을 되돌렸습니다.');
  });
  btnClear.addEventListener('click',()=>{
    if(!flowers.length)return;
    activate();
    if(typeof dialog.showModal==='function')dialog.showModal();
    else if(window.confirm('정원을 모두 비우시겠습니까?'))clearGarden();
  });
  dialog.addEventListener('close',()=>{if(dialog.returnValue==='clear')clearGarden();});
  function clearGarden(){
    flowers=[];selected=null;hovered=null;showPoem(null);
    saveGarden();syncUI();toast('정원을 비웠습니다. 새로운 별꽃을 심어보세요.');
  }
  btnExport.addEventListener('click',()=>{
    try{
      const json=JSON.stringify(serialize(),null,2);
      const objectUrl=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
      const a=document.createElement('a');a.href=objectUrl;
      a.download=`nocturne-garden-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
      toast('정원을 JSON 파일로 저장했습니다.');
    }catch(error){console.error(error);toast('파일 저장에 실패했습니다.');}
  });
  btnImport.addEventListener('click',()=>{fileInput.value='';fileInput.click();});
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files&&fileInput.files[0];if(!file)return;
    try{
      if(file.size>160000)throw new Error('파일 크기가 너무 큽니다.');
      const raw=JSON.parse(await file.text());
      const entries=normalizeEntries(raw);
      if(entries.length===0 && !(Array.isArray(raw)?raw.length===0:Array.isArray(raw.flowers)&&raw.flowers.length===0)){
        throw new Error('유효한 꽃 정보가 없습니다.');
      }
      flowers=entries.map(e=>createFlower(e));
      selected=null;hovered=null;showPoem(null);
      saveGarden();syncUI();activate();toast(`${flowers.length}송이의 별꽃을 불러왔습니다.`);
    }catch(error){console.warn('[NOCTURNE] Import error:',error);toast(`가져오기 실패: ${error.message}`);}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){selected=null;showPoem(null);}
    if(e.key.toLowerCase()==='z'&&(e.ctrlKey||e.metaKey)&&flowers.length){e.preventDefault();btnUndo.click();}
  });
  function shootingStar(){
    if(shootingStars.length>2)return;
    shootingStars.push({x:Math.random()*W*.75,y:Math.random()*H*.35,vx:190+Math.random()*170,vy:75+Math.random()*110,age:0,life:.85+Math.random()*.5});
  }
  function drawShootingStars(dt){
    for(let i=shootingStars.length-1;i>=0;i--){
      const s=shootingStars[i];s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
      if(s.age>=s.life){shootingStars.splice(i,1);continue;}
      const alpha=Math.min(1,(s.life-s.age)*1.8);
      const g=ctx.createLinearGradient(s.x,s.y,s.x-s.vx*.28,s.y-s.vy*.28);
      g.addColorStop(0,`rgba(255,245,217,${alpha})`);g.addColorStop(1,'rgba(255,245,217,0)');
      ctx.strokeStyle=g;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(s.x,s.y);
      ctx.lineTo(s.x-s.vx*.28,s.y-s.vy*.28);ctx.stroke();
    }
  }
  function drawRipples(dt){
    for(let i=ripples.length-1;i>=0;i--){
      const r=ripples[i];r.age+=dt;r.r+=dt*48;
      if(r.age>.85){ripples.splice(i,1);continue;}
      ctx.strokeStyle=`rgba(222,210,179,${(1-r.age/.85)*.38})`;
      ctx.lineWidth=1;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();
    }
  }
  function drawSparks(dt){
    for(let i=sparks.length-1;i>=0;i--){
      const p=sparks[i];p.life-=dt;
      if(p.life<=0){sparks.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*30;
      const alpha=clamp(p.life/p.max,0,1);
      ctx.fillStyle=`rgba(241,224,184,${alpha*.8})`;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*alpha,0,Math.PI*2);ctx.fill();
    }
  }
  function render(time,dt){
    ctx.drawImage(bg,0,0,W,H);
    for(const s of stars){
      const twinkle=reduceMotion?.75:(.63+.37*Math.sin(time*s.twinkle+s.phase));
      const a=s.alpha*twinkle;
      ctx.fillStyle=`rgba(240,236,234,${a})`;
      ctx.beginPath();ctx.arc(s.u*W,s.v*H,s.size,0,Math.PI*2);ctx.fill();
    }
    // 별지평선 위에 작고 고요한 광채
    if(!reduceMotion&&Math.random()<dt*.08)shootingStar();
    drawShootingStars(dt);
    drawRipples(dt);
    for(const f of flowers){f.update(dt);f.draw(ctx,time,reduceMotion,f===selected||f===hovered);}
    drawSparks(dt);
    if(!reduceMotion&&performance.now()-lastActivity>30000){
      shootingStar();audio.idleMelody();lastActivity=performance.now();
    }
  }
  function frame(timestamp){
    // 부드러운 30fps 상한. 화면 비활성화나 기기 성능 저하 시 프레임 폭주를 방지합니다.
    const elapsed=timestamp-lastTime;
    if(elapsed<32){window.requestAnimationFrame(frame);return;}
    const dt=Math.min(.065,Math.max(0,elapsed/1000));lastTime=timestamp;
    render(timestamp/1000,dt);window.requestAnimationFrame(frame);
  }
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{lastTime=performance.now();activate();});
  if(reducedQuery.addEventListener)reducedQuery.addEventListener('change',e=>{reduceMotion=e.matches;});
  resize();updatePalette();loadGarden();syncUI();
  setInterval(updatePalette,30000);
  window.requestAnimationFrame(frame);
  // 간단한 진단용 상태 (비공개 데이터·키가 아닌 공개 런타임 수치만 표시)
  Object.defineProperty(window,'NOCTURNE_STATUS',{configurable:false,get(){return Object.freeze({flowers:flowers.length,canvasReady:!!ctx,audioEnabled:audio.enabled});}});
})();
