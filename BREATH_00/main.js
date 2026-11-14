/* 숨 / BREATH — Standalone GitHub Pages installation; no network requests. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('world');
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) { $('world-status').textContent = '이 브라우저는 캔버스를 지원하지 않습니다'; return; }
  const ui = {
    hint: $('context-hint'), status: $('world-status'), count: $('star-count'),
    visits: $('visit-count'), time: $('session-time'), whispers: $('whisper-layer'),
    quiet: $('quiet-message'), toast: $('toast'), poem: $('poem-dialog'),
    memory: $('memory-dialog'), motion: $('motion-toggle')
  };
  const KEY = {visits:'breath_visits',stars:'breath_stars', last:'breath_last_visit_v2',motion:'breath_reduced_motion_v2'};
  const MAX_STARS = 80, MAX_PARTICLES = 260, MAX_ROOTS = 145, TAU = Math.PI*2;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rand = (a,b) => a + Math.random()*(b-a);
  const safeGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeSet = (key,value) => { try { localStorage.setItem(key,value); return true; } catch { return false; } };
  const safeRemove = key => { try { localStorage.removeItem(key); } catch { /* blocked */ } };
  const asInt = v => Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0;
  function parseSavedStars(raw) {
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.filter(s => s && typeof s === 'object' && Number.isFinite(s.x) && Number.isFinite(s.y)
          && s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1)
        .slice(-MAX_STARS)
        .map(s => ({x:s.x,y:s.y,born:Number.isFinite(s.born) ? clamp(s.born,0,Date.now()) : Date.now()}));
    } catch { return []; }
  }
  const startedAt = Date.now();
  let previousVisit = clamp(asInt(safeGet(KEY.last)),0,Date.now());
  let visits = clamp(asInt(safeGet(KEY.visits)),0,1000000) + 1;
  let stars = parseSavedStars(safeGet(KEY.stars));
  safeSet(KEY.visits,String(visits));
  safeSet(KEY.last,String(startedAt));
  let motionManual = safeGet(KEY.motion) === '1';
  const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => motionManual || motionMedia.matches;
  let viewport = {w:innerWidth,h:innerHeight,dpr:1};
  let palette = null;
  let lastPaletteHour = -1;
  let pendingFrame = 0, lastFrame = 0, activeMs = 0, poemReady = false;
  let sessionDistance = 0, sessionClicks = 0, pauses = 0, lastIntentAt = performance.now();
  let quietNotified = false, lastWhisper = 0, whisperInterval = 0;
  let notificationTimeout = 0;
  let pointer = {x:innerWidth/2,y:innerHeight/2,visible:false,type:'mouse',lastX:null,lastY:null,lastMove:0,lastRoot:0,lastDust:0,stationarySpots:0};
  const starsNow = stars.map(s => ({...s,phase:rand(0,TAU)}));
  const particles = [], roots = [], bgStars = [];

  const palettes = [
    {start:5,end:8,bg:'#090b1b',halo:'#eeb591',edge:'#e99e8c',center:'#fff1cf',star:'#ffe5c1',dust:'#f5c1a5',title:'새벽빛'},
    {start:8,end:17,bg:'#070b18',halo:'#acd9ca',edge:'#5eafa6',center:'#f5e8bd',star:'#fce3bd',dust:'#c0e8df',title:'낮빛'},
    {start:17,end:20,bg:'#0a0817',halo:'#eea780',edge:'#cf6c7d',center:'#ffdfb7',star:'#ffc3a9',dust:'#f7b4a2',title:'저녁빛'},
    {start:20,end:24,bg:'#050814',halo:'#91b5e6',edge:'#7079cb',center:'#cceaff',star:'#c8dcff',dust:'#a8d8f3',title:'밤빛'},
    {start:0,end:5,bg:'#050814',halo:'#91b5e6',edge:'#7079cb',center:'#cceaff',star:'#c8dcff',dust:'#a8d8f3',title:'밤빛'}
  ];
  const mix = (hex, alpha) => { const n = parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`; };
  function choosePalette() {
    const hour = new Date().getHours();
    if (lastPaletteHour === hour) return;
    palette = palettes.find(p => hour >= p.start && hour < p.end) || palettes[3];
    lastPaletteHour = hour;
    document.documentElement.style.setProperty('--bg', palette.bg);
    document.body.style.background = palette.bg;
    document.querySelector('meta[name="theme-color"]').setAttribute('content',palette.bg);
    ui.status.textContent = `${palette.title}으로 세계가 숨을 쉽니다`;
  }
  function resize() {
    const w = Math.max(1,innerWidth), h=Math.max(1,innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 1.55 : 1.8);
    viewport = {w,h,dpr};
    canvas.width = Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (!bgStars.length) {
      const count = clamp(Math.round(w*h/11000),38,185);
      for(let i=0;i<count;i++) bgStars.push({x:Math.random(),y:Math.random(),size:rand(.4,1.6),phase:rand(0,TAU),speed:rand(.0003,.0013)});
    }
  }
  let resizeTimeout = 0;
  addEventListener('resize',() => {clearTimeout(resizeTimeout);resizeTimeout=setTimeout(resize,170);},{passive:true});
  resize(); choosePalette();
  function updateUI(){ui.count.textContent=String(starsNow.length);$('mobile-star-count').textContent=String(starsNow.length);ui.visits.textContent=String(visits);}
  updateUI();
  if (visits > 1) ui.hint.textContent = `다시 만나서 반갑습니다. ${visits}번째 방문이에요.`;

  class Dust {
    constructor(x,y,burst=false) {
      this.x=x;this.y=y;this.vx=rand(-1.7,1.7)*(burst?3:1);this.vy=rand(-1.9,.6)*(burst?3:1);
      this.life=1;this.decay=rand(.010,.020)*(burst?.65:1);this.r=rand(.6,2.2);this.phase=rand(0,TAU);
      this.burst=burst;
    }
    step(t){this.phase+=t*.003;this.x+=(this.vx+Math.sin(this.phase)*.3)*t/16;this.y+=this.vy*t/16;this.vx*=.975;this.vy*=.982;this.life-=this.decay*t/16;}
    draw(){if(this.life<=0)return;ctx.fillStyle=mix(palette.dust,clamp(this.life*.65,0,1));ctx.beginPath();ctx.arc(this.x,this.y,Math.max(.1,this.r*this.life),0,TAU);ctx.fill();}
  }
  class Root {
    constructor(x,y) {this.x=x/viewport.w;this.y=y/viewport.h;this.grow=0;this.size=rand(.8,2.2);this.phase=rand(0,TAU);this.threads=Array.from({length:3},() => ({a:rand(0,TAU),len:rand(12,25)}));}
    step(dt){this.grow=Math.min(1,this.grow+dt*.0005);this.phase+=dt*.001;}
    draw(){const x=this.x*viewport.w,y=this.y*viewport.h,level=this.grow;if(level<=0)return;
      ctx.lineWidth=.8;for(const b of this.threads){const ex=x+Math.cos(b.a)*b.len*level,ey=y+Math.sin(b.a)*b.len*level;ctx.strokeStyle=mix(palette.star,.13*level);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+ex)*.5,(y+ey)*.5-7*level,ex,ey);ctx.stroke();}
      const r=this.size*(.85+Math.sin(this.phase)*.12);ctx.fillStyle=mix(palette.star,.6*level);ctx.beginPath();ctx.arc(x,y,Math.max(.2,r*level),0,TAU);ctx.fill();}
  }
  const orb={phase:rand(0,TAU),presence:0};
  function drawOrb(dt,t){
    const {w,h}=viewport, cx=w*.5,cy=h*.535, base=Math.min(w,h)*.115;
    if(!isReduced()) orb.phase+=dt*.00032;
    const dist=pointer.visible?Math.hypot(pointer.x-cx,pointer.y-cy):Infinity;
    const target=clamp(1-dist/(Math.min(w,h)*.5),0,1);
    orb.presence+=(target-orb.presence)*Math.min(1,dt*.003);
    const inhale=(Math.sin(orb.phase*TAU)+1)*.5,p=orb.presence;
    const rad=base*(.94+inhale*.18+p*.17);
    let g=ctx.createRadialGradient(cx,cy,rad*.23,cx,cy,rad*3.4);
    g.addColorStop(0,mix(palette.halo,.30+p*.16));g.addColorStop(.40,mix(palette.halo,.10+p*.04));g.addColorStop(1,mix(palette.halo,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,rad*3.4,0,TAU);ctx.fill();
    ctx.beginPath();const steps=isReduced()?96:170;
    for(let i=0;i<=steps;i++){const a=i*TAU/steps;const wobble=isReduced()?0:(.042*Math.sin(a*3+orb.phase*3)+.025*Math.sin(a*7-orb.phase*2)+.014*Math.sin(a*11+orb.phase*5));const r=rad*(1+wobble);const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();
    g=ctx.createRadialGradient(cx-rad*.28,cy-rad*.3,rad*.03,cx,cy,rad*1.33);
    g.addColorStop(0,palette.center);g.addColorStop(.32,palette.halo);g.addColorStop(.83,palette.edge);g.addColorStop(1,mix(palette.edge,.22));
    ctx.save();ctx.shadowColor=palette.halo;ctx.shadowBlur=isReduced()?12:27+p*32;ctx.fillStyle=g;ctx.fill();ctx.restore();
    g=ctx.createRadialGradient(cx,cy,0,cx,cy,rad*.6);
    g.addColorStop(0,'rgba(255,255,255,.44)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,rad*.6,0,TAU);ctx.fill();
    for(let i=0;i<7;i++){const a=i*TAU/7+orb.phase*(i%2?1:-1)*.7;const r=rad*(1.45+i*.18);const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.fillStyle=mix(palette.star,.25+.28*Math.cos(a)*Math.cos(a));ctx.beginPath();ctx.arc(x,y,1+(i%3)*.5,0,TAU);ctx.fill();}
  }
  function drawStarfield(dt){const{w,h}=viewport;for(const s of bgStars){s.phase+=isReduced()?0:s.speed*dt;const a=.12+(.5+.5*Math.sin(s.phase))*.38;ctx.fillStyle=`rgba(218,229,241,${a})`;ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.size,0,TAU);ctx.fill();}}
  function drawSavedStars(dt,t){const {w,h}=viewport, group=starsNow.slice(-32);
    ctx.lineWidth=.6;
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i],b=group[j],dx=(a.x-b.x)*w,dy=(a.y-b.y)*h,d2=dx*dx+dy*dy;if(d2<195*195){ctx.strokeStyle=mix(palette.star,(1-Math.sqrt(d2)/195)*.18);ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}
    for(const s of starsNow){s.phase+=isReduced()?0:dt*.0018;const x=s.x*w,y=s.y*h,r=1.7+.55*Math.sin(s.phase),alive=clamp((Date.now()-s.born)/1200,.15,1);
      ctx.fillStyle=mix(palette.star,alive*.85);ctx.shadowColor=palette.star;ctx.shadowBlur=isReduced()?0:9;ctx.beginPath();ctx.arc(x,y,Math.max(.7,r),0,TAU);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=mix(palette.star,alive*.23);ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.stroke();}
  }
  let previousRender=0;
  function render(now){pendingFrame=0;if(document.hidden)return;
    const throttle=isReduced()?130:(viewport.w<720?32:24);
    if(now-previousRender<throttle){pendingFrame=requestAnimationFrame(render);return;}
    const elapsed=lastFrame?Math.max(0,now-lastFrame):16;const dt=Math.min(elapsed,45);lastFrame=now;previousRender=now;
    activeMs+=Math.min(elapsed,250);choosePalette();
    if(!poemReady && activeMs>=50000){poemReady=true;showToast('당신의 시가 완성되었습니다. ‘나의 시’를 열어보세요.');}
    const seconds=Math.floor(activeMs/1000);const shownTime=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    if(ui.time.textContent!==shownTime)ui.time.textContent=shownTime;
    if(pointer.visible && now-pointer.lastMove>450){
      if(!quietNotified && now-lastIntentAt>12000){quietNotified=true;ui.quiet.textContent='움직이지 않아도, 이 세계는 당신과 함께 있습니다.';ui.quiet.classList.add('visible');}
      if(now-pointer.lastRoot>1150 && !isReduced() && pointer.stationarySpots<9){roots.push(new Root(pointer.x,pointer.y));pointer.stationarySpots++;pointer.lastRoot=now;if(roots.length>MAX_ROOTS)roots.splice(0,roots.length-MAX_ROOTS);}
    }
    ctx.fillStyle=palette.bg;ctx.fillRect(0,0,viewport.w,viewport.h);
    drawStarfield(dt);drawSavedStars(dt,now);
    for(const r of roots){r.step(dt);r.draw();}
    drawOrb(dt,now);
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.step(dt);p.draw();if(p.life<=0)particles.splice(i,1);}
    if(pointer.visible && !isReduced()){const g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,55);g.addColorStop(0,mix(palette.star,.22));g.addColorStop(1,mix(palette.star,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(pointer.x,pointer.y,55,0,TAU);ctx.fill();}
    pendingFrame=requestAnimationFrame(render);
  }
  const startLoop = () => {if(pendingFrame || document.hidden)return;lastFrame=0;previousRender=0;pendingFrame=requestAnimationFrame(render);};
  document.addEventListener('visibilitychange',() => {if(document.hidden){if(pendingFrame)cancelAnimationFrame(pendingFrame);pendingFrame=0;lastFrame=0;ui.quiet.classList.remove('visible');}else{lastIntentAt=performance.now();quietNotified=false;startLoop();}});
  if (motionMedia.addEventListener) motionMedia.addEventListener('change',() => {applyMotionState();});
  const addDust=(x,y,number=1,burst=false)=>{if(isReduced())return;for(let i=0;i<number;i++)particles.push(new Dust(x,y,burst));if(particles.length>MAX_PARTICLES)particles.splice(0,particles.length-MAX_PARTICLES);};
  function onPointerMove(e){if(!e.isPrimary)return;const now=performance.now(),x=clamp(e.clientX,0,viewport.w),y=clamp(e.clientY,0,viewport.h);
    if(pointer.lastX!==null){const d=Math.hypot(x-pointer.lastX,y-pointer.lastY);if(d>1.7){if(now-lastIntentAt>1200)pauses++;sessionDistance+=Math.min(150,d);lastIntentAt=now;quietNotified=false;ui.quiet.classList.remove('visible');if(d>18)pointer.stationarySpots=0;if(!isReduced() && now-pointer.lastDust>34){addDust(x,y,2);pointer.lastDust=now;}}}
    pointer.lastX=x;pointer.lastY=y;pointer.x=x;pointer.y=y;pointer.visible=true;pointer.lastMove=now;
  }
  canvas.addEventListener('pointermove',onPointerMove,{passive:true});
  canvas.addEventListener('pointerleave',() => {pointer.visible=false;pointer.lastX=null;pointer.lastY=null;},{passive:true});
  function plantStar(x,y){const now=Date.now(),w=viewport.w,h=viewport.h;const s={x:clamp(x/w,0,1),y:clamp(y/h,0,1),born:now};
    starsNow.push({...s,phase:rand(0,TAU)});if(starsNow.length>MAX_STARS)starsNow.splice(0,starsNow.length-MAX_STARS);
    stars=starsNow.map(({x,y,born})=>({x,y,born}));const stored=safeSet(KEY.stars,JSON.stringify(stars));
    sessionClicks++;lastIntentAt=performance.now();quietNotified=false;ui.quiet.classList.remove('visible');addDust(x,y,23,true);updateUI();
    showClickPhrase(x,y);ui.hint.textContent=stored?'당신의 별이 이 브라우저에 남았습니다.':'저장할 수 없는 브라우저 환경입니다. 이 방문 동안 별을 간직합니다.';
    if(Math.hypot(x-w*.5,y-h*.535)<Math.min(w,h)*.19)whisper('당신이 세계의 중심을 만졌습니다.');
  }
  canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary || e.button>0)return;onPointerMove(e);plantStar(e.clientX,e.clientY);},{passive:true});
  $('plant-button').addEventListener('click',()=>{const x=viewport.w*.5+rand(-90,90),y=viewport.h*.52+rand(-80,80);plantStar(clamp(x,25,viewport.w-25),clamp(y,25,viewport.h-25));});
  // Do not register a second click/touchstart handler: a touch pointerdown yields exactly one star.
  const whispers=['당신이 보는 것은 빛인가, 그 빛을 느끼는 마음인가','시간은 흐르지만, 잠시 머무를 수도 있습니다','고요한 순간에도 작은 변화는 계속됩니다','모든 것은 서로에게 영향을 주며 살아갑니다','당신이 남긴 한 점의 빛이 길이 됩니다','인식은 세상과 만나는 하나의 방식입니다','여기 있는 것만으로도 이 세계는 달라집니다','오늘의 한순간은 다시 돌아오지 않습니다','고요는 아무 일도 없는 상태가 아닙니다','작은 관심이 하나의 우주를 만듭니다'];
  const phrases=['한 점의 빛','지금, 여기','기억','머무름','숨결','존재','한순간','다시 피어남'];
  function whisper(message){const now=performance.now();if(document.hidden||now-lastWhisper<900 || isReduced())return;lastWhisper=now;const el=document.createElement('span');el.className='whisper';el.textContent=message||whispers[Math.floor(Math.random()*whispers.length)];el.style.left=`${clamp(rand(viewport.w*.18,viewport.w*.7),20,Math.max(20,viewport.w-280))}px`;el.style.top=`${rand(viewport.h*.34,viewport.h*.67)}px`;ui.whispers.appendChild(el);setTimeout(()=>el.remove(),6800);}
  function showClickPhrase(x,y){if(isReduced())return;const el=document.createElement('span');el.className='spark-phrase';el.textContent=phrases[Math.floor(Math.random()*phrases.length)];el.style.left=`${clamp(x,55,viewport.w-55)}px`;el.style.top=`${clamp(y,70,viewport.h-90)}px`;ui.whispers.appendChild(el);setTimeout(()=>el.remove(),2600);}
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('visible');clearTimeout(notificationTimeout);notificationTimeout=setTimeout(()=>ui.toast.classList.remove('visible'),3300);}
  let whisperTick=0;function scheduleWhispers(){clearInterval(whisperTick);whisperTick=setInterval(()=>{if(!document.hidden && !ui.poem.open && !ui.memory.open && performance.now()-lastIntentAt<8000)whisper();},10500);}
  scheduleWhispers();
  function applyMotionState(){document.body.classList.toggle('manual-reduced',isReduced());ui.motion.disabled=motionMedia.matches;ui.motion.setAttribute('aria-pressed',String(isReduced()));ui.motion.title=isReduced()?'움직임 다시 켜기':'움직임 줄이기';ui.motion.querySelector('.control-label').textContent=isReduced()?'움직임 제한 중':'고요 모드';if(isReduced()){particles.length=0;ui.whispers.replaceChildren();}}
  ui.motion.addEventListener('click',()=>{motionManual=!motionManual;safeSet(KEY.motion,motionManual?'1':'0');applyMotionState();showToast(isReduced()?'고요 모드가 켜졌습니다.':'움직임이 다시 시작됩니다.');});
  applyMotionState();
  function poemFromTraces(variant=0){const secs=Math.max(1,activeMs/1000),speed=sessionDistance/secs;
    let pace=speed<5?'서두르지 않고 머물렀습니다':speed<85?'천천히 이 세계를 거닐었습니다':'자유롭게 이 빛의 바다를 여행했습니다';
    const stars=starsNow.length,chosen=[
      [`당신은 ${pace}`,`작은 숨들이 모여 길이 되고,`,`${sessionClicks?`오늘 남긴 ${sessionClicks}개의 별이`:'아직 심지 않은 별의 자리도'}`,`그 길을 조용히 밝혀 줍니다.`,`지금, 여기. 당신이 있습니다.`],
      [`화면 위로 ${Math.round(sessionDistance).toLocaleString('ko-KR')}픽셀의 여정이 흘렀습니다.`,`그 모든 움직임 사이에도`,`${pauses?`${pauses}번의 멈춤이 있었고,`:'머무름의 가능성이 있었고,'}`,`${stars?`${stars}개의 작은 빛이 남았습니다.`:'빛은 아직 태어나기를 기다립니다.'}`,`한순간도 같은 하늘은 없었습니다.`],
      [`오늘의 세계는 당신을 닮지 않았습니다.`,`다만 당신이 그곳을 스친 순간,`,`보이지 않던 것들이 모습을 드러냈습니다.`,`${sessionClicks?'별은 클릭이 아니라 마음의 기록처럼 빛나고,':'별이 없는 하늘도 충분히 넓고,'}`,`이 모든 것은 잠시 함께한 시간입니다.`],
      [`무엇을 남겨야 하는 것은 아닙니다.`,`움직이지 않는 손에도 온기가 있고,`,`어떤 조용한 시선에도 세계가 있습니다.`,`${Math.floor(secs)}초라는 짧은 우주를 지나,`,`당신은 여전히 여기 있습니다.`]
    ];
    return chosen[variant%chosen.length].join('\n');
  }
  let poemVersion=0, currentPoem='';
  function refreshPoem(){currentPoem=poemFromTraces(poemVersion);$('poem-text').textContent=currentPoem;
    $('poem-meta').textContent=`${Math.floor(activeMs/1000)}초 · 이번 방문에서 심은 별 ${sessionClicks}개 · 총 별 ${starsNow.length}개`;
  }
  function showDialog(d){if(d.open)return;if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');}
  function closeDialog(d){if(!d.open)return;if(typeof d.close==='function')d.close();else d.removeAttribute('open');}
  function openPoem(){refreshPoem();showDialog(ui.poem);}
  $('poem-open').addEventListener('click',openPoem);$('poem-open-top').addEventListener('click',openPoem);
  $('poem-regenerate').addEventListener('click',()=>{poemVersion=(poemVersion+1)%4;refreshPoem();});
  $('poem-copy').addEventListener('click',async()=>{const txt=`숨 — 나의 시\n\n${currentPoem}\n\n${$('poem-meta').textContent}`;
    try{if(!navigator.clipboard?.writeText)throw Error('clipboard unsupported');await navigator.clipboard.writeText(txt);showToast('시를 클립보드에 복사했습니다.');}
    catch {const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const success=document.execCommand('copy');ta.remove();showToast(success?'시를 복사했습니다.':'이 환경에서는 자동 복사가 어렵습니다. 시를 직접 선택해 주세요.');}
  });
  function formatTime(){const sec=Math.floor(activeMs/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  function refreshMemory(){ $('memory-visits').textContent=String(visits);$('memory-stars').textContent=String(starsNow.length);$('memory-duration').textContent=formatTime();
    $('memory-note').textContent=previousVisit && visits>1?`지난 방문: ${new Date(previousVisit).toLocaleString('ko-KR')} · 별은 이 기기에만 저장됩니다.`:'별은 화면 크기가 바뀌어도 같은 자리에 남습니다.'; }
  $('memory-open').addEventListener('click',()=>{refreshMemory();$('memory-confirmation').hidden=true;showDialog(ui.memory);});
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>{const dialog=$(btn.dataset.close);closeDialog(dialog);}));
  [ui.poem,ui.memory].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)closeDialog(d);}));
  $('clear-button').addEventListener('click',()=>{$('memory-confirmation').hidden=false;});
  $('clear-cancel').addEventListener('click',()=>{$('memory-confirmation').hidden=true;});
  $('clear-confirm').addEventListener('click',()=>{starsNow.length=0;stars=[];visits=1;previousVisit=0;sessionClicks=0;safeRemove(KEY.stars);safeSet(KEY.visits,'1');safeSet(KEY.last,String(Date.now()));updateUI();refreshMemory();$('memory-confirmation').hidden=true;showToast('이 브라우저에 저장된 별과 방문 기록을 지웠습니다.');});
  function savePNG(){const out=document.createElement('canvas');out.width=1400;out.height=900;const o=out.getContext('2d');
    const g=o.createRadialGradient(700,430,50,700,450,760);g.addColorStop(0,'#142737');g.addColorStop(1,'#050814');o.fillStyle=g;o.fillRect(0,0,1400,900);
    for(const s of bgStars){o.fillStyle='rgba(208,227,243,.30)';o.beginPath();o.arc(s.x*1400,s.y*900,s.size,0,TAU);o.fill();}
    const pts=starsNow.slice(-32);o.lineWidth=1;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],dist=Math.hypot((a.x-b.x)*1400,(a.y-b.y)*900);if(dist<260){o.strokeStyle='rgba(234,215,179,.17)';o.beginPath();o.moveTo(a.x*1400,a.y*900);o.lineTo(b.x*1400,b.y*900);o.stroke();}}
    for(const s of starsNow){o.shadowColor='#fae8ca';o.shadowBlur=17;o.fillStyle='#f8e2b9';o.beginPath();o.arc(s.x*1400,s.y*900,3.2,0,TAU);o.fill();o.shadowBlur=0;}
    o.fillStyle='#f4e5ce';o.font='38px "Noto Serif CJK KR",serif';o.fillText('숨 · BREATH',74,95);o.fillStyle='#b9b6ae';o.font='20px "Noto Serif CJK KR",serif';o.fillText('당신이 남긴 별 · '+starsNow.length+'개',75,135);
    o.fillStyle='rgba(229,220,204,.45)';o.font='18px sans-serif';o.fillText('THE ART OF ATTENTION',75,842);
    const a=document.createElement('a');a.href=out.toDataURL('image/png');a.download='breath-constellation.png';document.body.appendChild(a);a.click();a.remove();showToast('별자리 PNG를 저장했습니다.');
  }
  $('export-button').addEventListener('click',()=>{try{savePNG();}catch{showToast('이 브라우저에서는 PNG 저장을 사용할 수 없습니다.');}});
  addEventListener('storage',e=>{if(e.key===KEY.stars){stars=parseSavedStars(e.newValue);starsNow.length=0;stars.forEach(s=>starsNow.push({...s,phase:rand(0,TAU)}));updateUI();if(ui.memory.open)refreshMemory();}});
  // A static keyboard-accessible action is always available; canvas itself needs no focus.
  startLoop();
  setTimeout(()=>{if(!document.hidden)whisper(visits>1?'다시 찾아온 당신을, 이곳이 기억합니다.':'빛은 이미 이곳에서 당신을 기다리고 있었습니다.');},3300);
})();
