/* 당신이라는 우주 — 개선판. 외부 의존성, 네트워크 요청 없음. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const rand = (a, b) => a + Math.random() * (b - a);
  const nf = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
  const savedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    motionReduced: Boolean(savedMotion),
    activeAccumulated: 0, visibleSince: performance.now(),
    chapter: 1, visible: new Set([1]), revealed: [], revealCount: 0,
    planks: Array(24).fill(false), scrollRemainder: 0,
    observingUntil: 0, observerXY: { x: .5, y: .5 }, observerHover: false,
    nodes: [], otherIndex: -1, otherConnections: 0,
    visits: 1, lastVisit: null, storageAvailable: false,
    trail: [], pointer: { x: -300, y: -300, prevX: null, prevY: null },
  };
  let lastScrollY = window.scrollY, lastTrailDraw = 0, lastCanvasFrame = 0, lastUI = 0;
  let introTimeout;
  const renderers = {};
  const sizes = {};

  function safeVisit() {
    try {
      const previous = JSON.parse(localStorage.getItem('ucy-visit-v2') || 'null');
      if (previous && Number.isSafeInteger(previous.count) && previous.count >= 1 && previous.count < 1000000) {
        state.visits = previous.count + 1;
        if (typeof previous.at === 'number' && previous.at > 0 && previous.at < Date.now()) state.lastVisit = previous.at;
      }
      localStorage.setItem('ucy-visit-v2', JSON.stringify({ count: state.visits, at: Date.now() }));
      state.storageAvailable = true;
    } catch (_) {
      state.storageAvailable = false;
      state.visits = 1;
      state.lastVisit = null;
    }
  }
  safeVisit();

  function sessionMs() {
    return state.activeAccumulated + (document.hidden ? 0 : Math.max(0, performance.now() - state.visibleSince));
  }
  function formatClock(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return (h ? `${String(h).padStart(2,'0')}:` : '') + `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function formatValue(n) { return nf.format(Math.max(0, Math.round(n))); }
  function fitCanvas(id) {
    const c = $(id), r = c.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizes[id] = { c, ctx, w, h, dpr };
    return sizes[id];
  }
  function coords(event, id) {
    const r = $(id).getBoundingClientRect();
    return { x: clamp((event.clientX - r.left) / Math.max(1, r.width), 0, 1),
      y: clamp((event.clientY - r.top) / Math.max(1, r.height), 0, 1) };
  }

  // Custom cursor and transitory stroke history. Never persisted or transmitted.
  const cursor = $('cursor');
  const trailCtx = fitCanvas('trail');
  let lastPointAt = 0;
  function pointerMove(e) {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      cursor.classList.add('visible');
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    }
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    const at = performance.now();
    const p = state.trail[state.trail.length - 1];
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10 && at - lastPointAt < 85) return;
    state.trail.push({ x: e.clientX, y: e.clientY, t: at });
    if (state.trail.length > 500) state.trail.shift();
    lastPointAt = at;
  }
  document.addEventListener('pointermove', pointerMove, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
  function drawTrail(now) {
    const dim = sizes.trail; if (!dim || now - lastTrailDraw < (state.motionReduced ? 600 : 180)) return;
    lastTrailDraw = now;
    const { ctx, w, h } = dim;
    ctx.clearRect(0, 0, w, h);
    if (state.motionReduced || state.trail.length < 2) return;
    for (let i = 1; i < state.trail.length; i++) {
      const a = state.trail[i - 1], b = state.trail[i];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 110) continue; // no line across jumps
      const fade = Math.max(.025, .25 * Math.exp(-(now - b.t) / 18000));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(177,211,255,${fade.toFixed(3)})`;
      ctx.lineWidth = .75;
      ctx.stroke();
    }
  }

  // I. Revealing a universe beneath an opaque veil.
  const starRand = (() => { let x = 0x92abc2 | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; })();
  function drawStarMap() {
    const dim = sizes['star-map']; if (!dim) return;
    const {ctx,w,h} = dim;
    ctx.clearRect(0,0,w,h);
    const bg = ctx.createRadialGradient(w*.48,h*.55,2,w*.48,h*.55,Math.max(w,h)*.78);
    bg.addColorStop(0,'#263a59'); bg.addColorStop(.45,'#10203a'); bg.addColorStop(1,'#060c19');
    ctx.fillStyle = bg;ctx.fillRect(0,0,w,h);
    // Spiral nebula is intentionally procedural, not a downloaded image.
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<7;i++){
      const x=w*(.4+i*.042),y=h*(.48+Math.sin(i*.9)*.045);
      const gr=ctx.createRadialGradient(x,y,0,x,y,Math.max(w,h)*(.18+i*.023));
      gr.addColorStop(0,i%2?'rgba(215,176,228,.13)':'rgba(99,169,255,.11)');
      gr.addColorStop(1,'rgba(20,32,60,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
    }
    for(let i=0;i<800;i++){
      const a=starRand()*Math.PI*2, radius=Math.pow(starRand(),.72), spiral=a+radius*5;
      const x=w*.5+Math.cos(spiral)*radius*w*.52, y=h*.5+Math.sin(spiral)*radius*h*.48;
      const alpha=.14+starRand()*.72, sz=starRand()<.045?1.6:.35+starRand()*.8;
      ctx.fillStyle=`rgba(${starRand()<.18?'255,220,177':'200,226,255'},${alpha.toFixed(2)})`;
      ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    const gh=ctx.createRadialGradient(w*.52,h*.52,0,w*.52,h*.52,Math.min(w,h)*.28);
    gh.addColorStop(0,'rgba(251,229,181,.28)');gh.addColorStop(1,'rgba(149,177,224,0)');
    ctx.fillStyle=gh;ctx.fillRect(0,0,w,h);
  }
  function drawVeil() {
    const dim = sizes['reveal-veil']; if (!dim) return;
    const {ctx,w,h} = dim;
    ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);
    ctx.fillStyle='rgba(3,7,14,.99)';ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='destination-out';
    for(const hole of state.revealed){
      const r=hole.r*Math.min(w,h),x=hole.x*w,y=hole.y*h;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.48,'rgba(0,0,0,.9)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  function addReveal(x,y,r=.22,count=true){
    state.revealed.push({x,y,r});
    if(state.revealed.length>240) state.revealed.splice(0,state.revealed.length-240);
    if(count){state.revealCount++;$('reveal-stat').textContent=`드러난 빛 ${state.revealCount}회`;}
    drawVeil();
  }
  let lastRevealAt=0;
  $('reveal-world').addEventListener('pointermove', e=>{
    if(e.pointerType==='touch' && !e.buttons) return;
    if(performance.now()-lastRevealAt<34) return;
    lastRevealAt=performance.now();
    const p=coords(e,'reveal-veil');addReveal(p.x,p.y,.22);
  },{passive:true});
  $('reveal-world').addEventListener('pointerdown',e=>{const p=coords(e,'reveal-veil');addReveal(p.x,p.y,.28);});
  $('reveal-button').addEventListener('click',()=>addReveal(rand(.2,.8),rand(.2,.8),.27));
  $('reveal-reset').addEventListener('click',()=>{state.revealed=[];state.revealCount=0;$('reveal-stat').textContent='드러난 빛 0회';drawVeil();});

  // II. Session time counts visible-tab time only.
  function updateTime() {
    const sec = sessionMs()/1000;
    $('timer').textContent=formatClock(sec*1000);
    $('earth-move').textContent=formatValue(sec*29.78);
    $('cosmic-expand').textContent=formatValue(sec*70); // example: 1 Mpc distance with H0=70 km/s/Mpc
    $('heartbeats').textContent=formatValue(sec*70/60);
    $('born-people').textContent=formatValue(sec*4.2);
    const d=new Date();
    $('local-info').textContent=d.toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  // III. A visible boat, made from actual replaceable planks.
  function replacePlank() {
    const original=[];state.planks.forEach((v,i)=>{if(!v)original.push(i);});
    if(!original.length) return;
    const chosen=original[Math.floor(Math.random()*original.length)];state.planks[chosen]=true;
    updatePlanks();drawShip();
  }
  function updatePlanks() {
    const changed=state.planks.filter(Boolean).length;
    $('original-count').textContent=`${24-changed} / 24`;
    $('plank-progress').setAttribute('aria-valuenow',String(changed));
    $('plank-progress-fill').style.width=`${changed/24*100}%`;
  }
  $('replace-plank').addEventListener('click',replacePlank);
  $('reset-ship').addEventListener('click',()=>{state.planks.fill(false);state.scrollRemainder=0;updatePlanks();drawShip();});
  function drawShip(){
    const dim=sizes['ship-canvas'];if(!dim)return;
    const {ctx,w,h}=dim;ctx.clearRect(0,0,w,h);
    const s=Math.min(w/760,h/390),cx=w*.5,baseY=h*.73;
    ctx.save();ctx.translate(cx,baseY);ctx.scale(s,s);
    // Water under the ship
    for(let k=0;k<7;k++){
      ctx.beginPath();ctx.moveTo(-310+k*13,25+k*4);ctx.quadraticCurveTo(0,17+k*4,310-k*13,25+k*4);
      ctx.strokeStyle=`rgba(138,182,229,${.12-k*.012})`;ctx.lineWidth=1;ctx.stroke();
    }
    // Hull frame and cut-out planks.
    ctx.beginPath();ctx.moveTo(-290,-72);ctx.lineTo(290,-72);ctx.quadraticCurveTo(254,5,170,26);
    ctx.lineTo(-180,26);ctx.quadraticCurveTo(-265,0,-290,-72);ctx.closePath();
    ctx.fillStyle='#1c2b40';ctx.fill();ctx.save();ctx.clip();
    const segmentW=580/24;
    for(let i=0;i<24;i++){
      const x=-290+i*segmentW;
      const isNew=state.planks[i];
      ctx.fillStyle=isNew?'#b7a17f':(i%2?'#394e65':'#304359');
      ctx.fillRect(x+1,-83,segmentW-2,114);
      ctx.strokeStyle=isNew?'rgba(255,240,210,.65)':'rgba(171,204,241,.2)';ctx.lineWidth=.8;
      for(let g=0;g<4;g++){ctx.beginPath();ctx.moveTo(x+5,-59+g*23);ctx.lineTo(x+segmentW-5,-59+g*23);ctx.stroke();}
      if(isNew){ctx.fillStyle='rgba(255,237,194,.26)';ctx.fillRect(x+3,-80,2,110);}
    }
    ctx.restore();
    ctx.beginPath();ctx.moveTo(-290,-72);ctx.lineTo(290,-72);ctx.quadraticCurveTo(254,5,170,26);
    ctx.lineTo(-180,26);ctx.quadraticCurveTo(-265,0,-290,-72);ctx.closePath();
    ctx.strokeStyle='#d2c69e';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-306,-77);ctx.lineTo(303,-77);ctx.strokeStyle='#e1cb9e';ctx.lineWidth=4;ctx.stroke();
    // Mast, small gold pennant, translucent sail.
    ctx.beginPath();ctx.moveTo(9,-76);ctx.lineTo(9,-270);ctx.strokeStyle='#bfa77e';ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(14,-256);ctx.lineTo(150,-95);ctx.lineTo(14,-95);ctx.closePath();
    const sail=ctx.createLinearGradient(12,-245,148,-100);sail.addColorStop(0,'rgba(219,234,251,.75)');sail.addColorStop(1,'rgba(110,155,208,.17)');
    ctx.fillStyle=sail;ctx.fill();ctx.strokeStyle='rgba(218,233,252,.52)';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.moveTo(4,-248);ctx.lineTo(-124,-105);ctx.lineTo(4,-105);ctx.closePath();
    ctx.fillStyle='rgba(129,174,217,.2)';ctx.fill();ctx.strokeStyle='rgba(190,219,245,.45)';ctx.stroke();
    ctx.fillStyle='#e9d6a9';ctx.beginPath();ctx.arc(9,-272,4,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#8fa2be';ctx.font=`${Math.max(9,10*s)}px monospace`;ctx.textAlign='center';
    ctx.fillText('THE SAME SHIP / DIFFERENT PARTS',w/2,h-20);
  }

  // IV. Deliberately an interactive metaphor, not a simulation of wavefunction collapse.
  function isObserving(now) {return state.observerHover || now < state.observingUntil;}
  function updateObservation(now) {
    const active=isObserving(now);
    $('observe-state').textContent=active?'하나의 위치로 집중':'가능성의 물결';
    $('observe-led').classList.toggle('active',active);
  }
  $('quantum-canvas').addEventListener('pointermove',e=>{
    state.observerXY=coords(e,'quantum-canvas');
    if(e.pointerType==='mouse'||e.pointerType==='pen')state.observerHover=true;
    else state.observingUntil=performance.now()+1750;
  },{passive:true});
  $('quantum-canvas').addEventListener('pointerleave',()=>{state.observerHover=false;});
  $('quantum-canvas').addEventListener('pointerdown',e=>{state.observerXY=coords(e,'quantum-canvas');state.observingUntil=performance.now()+2200;});
  $('observe-button').addEventListener('click',()=>{state.observerXY={x:rand(.25,.75),y:rand(.25,.75)};state.observingUntil=performance.now()+3400;updateObservation(performance.now());drawQuantum(performance.now());});
  function drawQuantum(now){
    const dim=sizes['quantum-canvas'];if(!dim)return;
    const {ctx,w,h}=dim;ctx.clearRect(0,0,w,h);
    const mid=h*.51, t=state.motionReduced?0:now*.00048;
    const obs=isObserving(now),ox=state.observerXY.x*w,oy=state.observerXY.y*h;
    // Wave field background.
    for(let k=-5;k<=5;k++){
      const amp=17+Math.abs(k)*5;
      ctx.beginPath();
      for(let x=0;x<=w;x+=3){
        const y=mid+k*13+Math.sin(x*.018-t*2+k*.19)*amp*.8;
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=`rgba(123,172,240,${.13+(5-Math.abs(k))*.035})`;
      ctx.lineWidth=k===0?1.2:.8;ctx.stroke();
    }
    for(let i=0;i<85;i++){
      const x=(i*83.713+(state.motionReduced?0:now*.014*(1+i%5)))%(w+20)-10;
      const y=mid+Math.sin(x*.016-t*2+i*.47)*54+Math.sin(i*17.1)*53;
      const mx=obs? ox+(Math.cos(i*2.4)*Math.sqrt(i)*5.5) : x;
      const my=obs? oy+(Math.sin(i*2.4)*Math.sqrt(i)*5.5) : y;
      const a=obs?.23+.72*(1-i/85):.16+.25*(1-i/85);
      ctx.fillStyle=`rgba(${obs?'239,220,174':'183,214,255'},${a})`;
      ctx.beginPath();ctx.arc(mx,my,obs?1.9:1.1,0,Math.PI*2);ctx.fill();
    }
    if(obs){
      const r=ctx.createRadialGradient(ox,oy,0,ox,oy,125);
      r.addColorStop(0,'rgba(247,229,178,.26)');r.addColorStop(1,'rgba(247,229,178,0)');
      ctx.fillStyle=r;ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(243,225,181,.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(ox,oy,25+(state.motionReduced?0:Math.sin(t*9)*4),0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(ox-41,oy);ctx.lineTo(ox-32,oy);ctx.moveTo(ox+32,oy);ctx.lineTo(ox+41,oy);ctx.moveTo(ox,oy-41);ctx.lineTo(ox,oy-32);ctx.stroke();
    }
    updateObservation(now);
  }

  // V. Bounded, lightweight network.
  function addNode(x,y){
    const dim=sizes['neural-canvas'];if(!dim)return;
    const p={x:clamp(x,12,dim.w-12),y:clamp(y,12,dim.h-12),vx:rand(-.15,.15),vy:rand(-.15,.15)};
    state.nodes.push(p);if(state.nodes.length>80)state.nodes.shift();
  }
  function spawnThought() {
    const dim=sizes['neural-canvas'];if(!dim)return;
    const anchor=state.nodes.length?state.nodes[Math.floor(Math.random()*state.nodes.length)]:{x:dim.w/2,y:dim.h/2};
    for(let i=0;i<3;i++)addNode(anchor.x+rand(-65,65),anchor.y+rand(-55,55));
    drawNeural(false);
  }
  let lastNodeAt=0;
  $('neural-canvas').addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&!e.buttons)return;
    if(performance.now()-lastNodeAt<90)return;
    const p=coords(e,'neural-canvas'),d=sizes['neural-canvas'];if(!d)return;
    addNode(p.x*d.w,p.y*d.h);lastNodeAt=performance.now();
  },{passive:true});
  $('neural-canvas').addEventListener('pointerdown',e=>{
    const p=coords(e,'neural-canvas'),d=sizes['neural-canvas'];if(d)addNode(p.x*d.w,p.y*d.h);
  });
  $('add-node').addEventListener('click',spawnThought);
  $('reset-neural').addEventListener('click',()=>{state.nodes=[];drawNeural(false);});
  function drawNeural(animate=true) {
    const dim=sizes['neural-canvas'];if(!dim)return;
    const {ctx,w,h}=dim;ctx.clearRect(0,0,w,h);
    const nodes=state.nodes;
    if(animate&&!state.motionReduced){for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<8||n.x>w-8)n.vx*=-1;if(n.y<8||n.y>h-8)n.vy*=-1;}}
    let edges=0;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
        if(d2>=118*118)continue;
        edges++;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(142,189,249,${(.4*(1-d2/(118*118))).toFixed(3)})`;
        ctx.lineWidth=.8;ctx.stroke();
      }
    }
    for(const node of nodes){
      const glow=ctx.createRadialGradient(node.x,node.y,0,node.x,node.y,13);
      glow.addColorStop(0,'rgba(207,234,255,.48)');glow.addColorStop(1,'rgba(207,234,255,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(node.x,node.y,13,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(node.x,node.y,2.2,0,Math.PI*2);ctx.fillStyle='#cbe3ff';ctx.fill();
    }
    $('neural-count').textContent=String(edges);
  }

  // VI. Other minds: choose a light. Not a claim that other people are fictional.
  const otherMessages=[
    '“내가 본 밤하늘은 당신이 본 밤하늘과 조금 달라요.”',
    '“나의 침묵에도 아직 말하지 않은 이야기가 있습니다.”',
    '“우리는 같은 시간을 지나지만, 다른 기억을 지닙니다.”',
    '“당신이 나를 이해하지 못해도, 나는 여기에 있습니다.”',
    '“어떤 빛은 멀리 있어도 누군가를 따뜻하게 합니다.”',
    '“나는 당신이 모르는 풍경에서 걸어왔습니다.”',
    '“서로를 바라볼 때, 우리는 조금 더 넓어집니다.”'
  ];
  const others=Array.from({length:7},(_,i)=>({x:.13+i*.122,y:.53+Math.sin(i*2.04)*.16,phase:i*1.69}));
  function selectOther(i){
    state.otherIndex=((i%others.length)+others.length)%others.length;
    state.otherConnections++;
    $('others-count').textContent=`연결 ${state.otherConnections}회`;
    $('others-message').textContent=otherMessages[state.otherIndex];
    drawOthers(performance.now());
  }
  $('others-canvas').addEventListener('pointerdown',e=>{
    const p=coords(e,'others-canvas');let idx=0,min=Infinity;
    others.forEach((o,i)=>{const d=(p.x-o.x)**2+(p.y-o.y)**2;if(d<min){idx=i;min=d;}});
    selectOther(idx);
  });
  $('connect-other').addEventListener('click',()=>{
    const next=state.otherIndex<0?0:(state.otherIndex+1)%7;selectOther(next);
  });
  function drawOthers(now){
    const dim=sizes['others-canvas'];if(!dim)return;
    const {ctx,w,h}=dim;ctx.clearRect(0,0,w,h);
    const t=state.motionReduced?0:now*.001;
    for(let i=0;i<others.length;i++){
      const o=others[i],x=o.x*w,y=(o.y+Math.sin(t*.27+o.phase)*.018)*h,active=i===state.otherIndex;
      const halo=ctx.createRadialGradient(x,y,0,x,y,active?105:67);
      halo.addColorStop(0,active?'rgba(240,215,157,.24)':'rgba(119,166,240,.12)');
      halo.addColorStop(1,'rgba(80,120,180,0)');ctx.fillStyle=halo;ctx.fillRect(x-115,y-115,230,230);
      if(active){
        ctx.beginPath();ctx.arc(x,y,47+(state.motionReduced?0:Math.sin(t*1.5)*4),0,Math.PI*2);
        ctx.strokeStyle='rgba(236,212,164,.48)';ctx.lineWidth=1;ctx.stroke();
      }
      // Abstract person: head, torso, shadow underneath.
      ctx.fillStyle=active?'rgba(246,222,173,.93)':'rgba(171,200,237,.45)';
      ctx.beginPath();ctx.arc(x,y-19,9.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x-7,y-3);ctx.quadraticCurveTo(x-20,y+18,x-13,y+48);
      ctx.quadraticCurveTo(x,y+59,x+13,y+48);ctx.quadraticCurveTo(x+20,y+18,x+7,y-3);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.ellipse(x,y+54,20,3,0,0,Math.PI*2);ctx.fillStyle='rgba(136,171,223,.2)';ctx.fill();
      ctx.fillStyle=active?'#e6d0a4':'#7794ba';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),x,y+76);
    }
  }

  // VII. Letter updated while visible. Kept entirely on-device.
  function updateVisitNote() {
    let msg=state.storageAvailable?`이 브라우저의 ${state.visits}번째 방문입니다.`:'방문 기록 저장이 차단되어 이번 방문만 보여드립니다.';
    if(state.lastVisit){const d=new Date(state.lastVisit);msg+=` 이전 방문: ${d.toLocaleDateString('ko-KR')} ${d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}.`;}
    $('visit-note').textContent=msg;
  }
  function getLetter() {
    const elapsed=formatClock(sessionMs()),changed=state.planks.filter(Boolean).length;
    const p=state.revealCount,n=state.nodes.length,o=state.otherConnections;
    const lines=[
      `당신은 이 우주에서 ${elapsed} 동안 머물렀습니다.`,
      `${p}번 빛을 드러냈고, ${changed}개의 나무판을 교체했습니다.`,
      `${n}개의 생각이 남아 있고, 다른 존재의 빛에 ${o}번 응답했습니다.`,
      '사라지는 것은 화면입니다. 당신이 발견한 의미는 어디에 남을까요?'
    ];
    return lines.join('\n');
  }
  function updateFinal() {
    $('final-duration').textContent=formatClock(sessionMs());
    $('final-reveals').textContent=String(state.revealCount);
    $('final-ship').textContent=String(state.planks.filter(Boolean).length);
    $('final-nodes').textContent=String(state.nodes.length);
    $('final-others').textContent=String(state.otherConnections);
    $('final-text').textContent=getLetter();
  }
  $('clear-visits').addEventListener('click',()=>{
    try {localStorage.removeItem('ucy-visit-v2');state.storageAvailable=false;state.visits=1;state.lastVisit=null;updateVisitNote();status('이 브라우저의 방문 기록을 지웠습니다.');}
    catch(_) {status('브라우저의 저장소 접근이 차단되어 기록을 지울 수 없습니다.');}
  });
  function status(s) {$('action-status').textContent=s;}
  async function copyLetter() {
    const text=`당신이라는 우주\n\n${getLetter()}\n\n— The Universe Called You`;
    let success=false;
    try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);success=true;}}catch(_){}
    if(!success){
      const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();
      try{success=document.execCommand('copy');}catch(_){}ta.remove();
    }
    status(success?'편지 문장을 복사했습니다.':'자동 복사가 제한되었습니다. 브라우저의 텍스트 선택으로 복사해 주세요.');
  }
  $('copy-letter').addEventListener('click',copyLetter);
  function drawWrapped(ctx,str,x,y,maxW,step){
    let line='',yy=y;
    for(const char of [...str]){
      if(char==='\n'){ctx.fillText(line,x,yy);line='';yy+=step;continue;}
      if(ctx.measureText(line+char).width>maxW && line){ctx.fillText(line,x,yy);line='';yy+=step;}
      line+=char;
    }
    if(line)ctx.fillText(line,x,yy);
    return yy+step;
  }
  function saveLetter(){
    try{
      const c=document.createElement('canvas');c.width=1200;c.height=1500;
      const g=c.getContext('2d');if(!g)throw Error('Canvas unsupported');
      const gradient=g.createLinearGradient(0,0,1200,1500);
      gradient.addColorStop(0,'#0b1423');gradient.addColorStop(.58,'#101d30');gradient.addColorStop(1,'#080c15');
      g.fillStyle=gradient;g.fillRect(0,0,1200,1500);
      for(let i=0;i<170;i++){
        const x=(i*73.3)%1200,y=(i*i*6.59)%1500;
        g.fillStyle=`rgba(192,224,255,${.1+(i%7)*.065})`;g.beginPath();g.arc(x,y,i%9===0?2:1,0,Math.PI*2);g.fill();
      }
      g.strokeStyle='rgba(208,224,245,.32)';g.lineWidth=2;g.strokeRect(70,65,1060,1370);
      g.strokeStyle='rgba(215,197,148,.55)';g.beginPath();g.arc(600,270,95,0,Math.PI*2);g.stroke();
      g.beginPath();g.ellipse(600,270,135,46,-.22,0,Math.PI*2);g.stroke();
      g.beginPath();g.arc(600,270,13,0,Math.PI*2);g.fillStyle='#e5cca0';g.fill();
      g.textAlign='center';g.fillStyle='#d3e6fb';g.font='36px Georgia, serif';g.fillText('THE UNIVERSE CALLED YOU',600,440);
      g.fillStyle='#ead6ab';g.font='32px serif';g.fillText('당신이라는 우주',600,507);
      g.textAlign='left';g.fillStyle='#e4edf8';g.font='38px serif';
      let y=625;
      const paragraphs=getLetter().split('\n');
      for(const line of paragraphs){y=drawWrapped(g,line,165,y,870,62)+38;}
      g.beginPath();g.moveTo(165,1205);g.lineTo(1035,1205);g.strokeStyle='rgba(207,224,251,.27)';g.stroke();
      g.font='22px sans-serif';g.fillStyle='#a9bdd6';g.fillText('NOEMA  ·  A SMALL UNIVERSE OF PERCEPTION',165,1270);
      g.fillStyle='#9fb1c9';g.font='20px sans-serif';g.fillText(new Date().toLocaleDateString('ko-KR'),165,1320);
      const a=document.createElement('a');a.download='당신이라는_우주_편지.png';a.href=c.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
      status('편지 PNG 이미지를 생성했습니다.');
    }catch(err){status('이 브라우저에서는 이미지 저장을 완료하지 못했습니다. 문장 복사를 이용해 주세요.');}
  }
  $('save-letter').addEventListener('click',saveLetter);
  $('restart').addEventListener('click',()=>window.location.reload());

  // Navigation and resource-aware render scheduling.
  const sections=Array.from(document.querySelectorAll('[data-chapter]'));
  const visibleObserver=new IntersectionObserver(entries=>{
    for(const e of entries){const i=Number(e.target.dataset.chapter);if(e.isIntersecting)state.visible.add(i);else state.visible.delete(i);}
    updateChapter();
  },{threshold:0,rootMargin:'10% 0px 10% 0px'});
  sections.forEach(el=>visibleObserver.observe(el));
  function updateChapter(){
    const center=window.innerHeight*.48;
    let best=1,dist=Infinity;
    for(const el of sections){const r=el.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-center);if(d<dist){dist=d;best=Number(el.dataset.chapter);}}
    state.chapter=best;
    $('chapter-now').textContent=`${String(best).padStart(2,'0')} / 07`;
    document.querySelectorAll('.chapter-nav a').forEach(a=>{
      const yes=Number(a.dataset.nav)===best;a.classList.toggle('active',yes);
      if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    });
    const root=document.documentElement;
    const total=Math.max(1,root.scrollHeight-window.innerHeight);
    $('progress').style.width=`${clamp(window.scrollY/total*100,0,100)}%`;
  }
  window.addEventListener('scroll',()=>{
    const dy=Math.abs(window.scrollY-lastScrollY);lastScrollY=window.scrollY;
    const shipRect=$('ch3').getBoundingClientRect();
    const viewportCenter=window.innerHeight*.48;
    // Only scrolling *within* the ship scene should replace planks; skip chapter jumps.
    if(state.chapter===3 && shipRect.top<viewportCenter && shipRect.bottom>viewportCenter && dy>0 && dy<window.innerHeight*.75){
      state.scrollRemainder+=dy;
      let n=0;while(state.scrollRemainder>=130&&n<5){state.scrollRemainder-=130;n++;replacePlank();}
    }
    updateChapter();
  },{passive:true});
  function resize(){
    for(const id of ['trail','star-map','reveal-veil','ship-canvas','quantum-canvas','neural-canvas','others-canvas'])fitCanvas(id);
    drawStarMap();drawVeil();drawShip();drawQuantum(performance.now());drawNeural(false);drawOthers(performance.now());
    updateChapter();
  }
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,130);},{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){state.activeAccumulated+=Math.max(0,performance.now()-state.visibleSince);state.observerHover=false;}
    else {state.visibleSince=performance.now();lastCanvasFrame=0;}
  });
  $('motion-toggle').addEventListener('click',()=>{
    state.motionReduced=!state.motionReduced;
    document.body.classList.toggle('motion-reduced',state.motionReduced);
    $('motion-toggle').setAttribute('aria-pressed',String(state.motionReduced));
    $('motion-toggle').textContent=state.motionReduced?'움직임 켜기':'정적인 우주';
    drawQuantum(performance.now());drawNeural(false);drawOthers(performance.now());
  });
  document.body.classList.toggle('motion-reduced',state.motionReduced);
  $('motion-toggle').setAttribute('aria-pressed',String(state.motionReduced));
  $('motion-toggle').textContent=state.motionReduced?'움직임 켜기':'정적인 우주';

  function finishIntro(){clearTimeout(introTimeout);$('intro').classList.add('hide');}
  $('skip-intro').addEventListener('click',finishIntro);
  introTimeout=setTimeout(finishIntro,state.motionReduced?30:1900);

  function frame(now){
    if(!document.hidden){
      if(now-lastUI>270){lastUI=now;updateTime();if(state.visible.has(7))updateFinal();}
      const frameInterval=state.motionReduced?800:40;
      if(now-lastCanvasFrame>frameInterval){
        lastCanvasFrame=now;
        if(state.visible.has(4))drawQuantum(now);
        if(state.visible.has(5))drawNeural(true);
        if(state.visible.has(6))drawOthers(now);
        drawTrail(now);
      }
    }
    requestAnimationFrame(frame);
  }
  // Initial reveal stays entirely local; doesn't count as user action.
  addReveal(.5,.5,.17,false);
  resize();updateTime();updatePlanks();updateVisitNote();updateFinal();
  requestAnimationFrame(frame);
  console.info('✦ 당신이라는 우주 — 이 화면은 방문 정보를 외부로 보내지 않습니다.');
})();
