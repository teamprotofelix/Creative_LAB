/* PHENOMENON — six chapters, no external dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const format = n => Math.floor(n).toLocaleString('ko-KR');
  const rand = (a, b) => a + Math.random() * (b - a);
  const reducedPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const state = { sky: true, breath: false, time: false, life: false, cosmos: false, ending: false };
  const KEY = 'phenomenon.memory.v2';
  const blankRecord = () => ({ visits: 0, breaths: 0, seeds: 0, word: '' });
  let storageOK = true;
  let record = blankRecord();
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') {
      record.visits = clamp(Number(parsed.visits) || 0, 0, 1000000);
      record.breaths = clamp(Number(parsed.breaths) || 0, 0, 1000000);
      record.seeds = clamp(Number(parsed.seeds) || 0, 0, 1000000);
      record.word = typeof parsed.word === 'string' ? parsed.word.slice(0, 24) : '';
    }
    record.visits += 1;
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch (_) { storageOK = false; record.visits = 1; }
  function persist() {
    if (!storageOK) return;
    try { localStorage.setItem(KEY, JSON.stringify(record)); }
    catch (_) { storageOK = false; updateStorageStatus(); }
  }
  function updateStorageStatus() {
    $('storage-status').textContent = storageOK ? '이 기기의 브라우저에만 저장됩니다' : '저장이 제한된 브라우저입니다';
  }
  updateStorageStatus();
  $('visit-note').textContent = record.visits > 1 ? `${format(record.visits)}번째 다시 만난 순간입니다.` : '처음 만나는 순간입니다.';
  $('breath-count').textContent = format(record.breaths);
  $('life-total').textContent = format(record.seeds);
  function renderWord() { $('memory-result').textContent = record.word ? `“${record.word}” — 이 기기에 남겨둔 말` : ''; }
  renderWord();

  let toastTimer;
  function notify(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2900);
  }
  const motionToggle = $('motion-toggle');
  const savedMotionOff = (() => { try { return localStorage.getItem('phenomenon.motion.off') === '1'; } catch { return false; } })();
  let motionOff = savedMotionOff || reducedPreference.matches;
  function applyMotion() {
    document.body.classList.toggle('motion-off', motionOff);
    document.documentElement.classList.toggle('motion-off', motionOff);
    motionToggle.setAttribute('aria-pressed', String(motionOff));
    motionToggle.setAttribute('aria-label', motionOff ? '움직임 효과 다시 켜기' : '움직임 제한 켜기');
    motionToggle.title = motionOff ? '움직임 효과 켜기' : '움직임 효과 줄이기';
  }
  applyMotion();
  motionToggle.addEventListener('click', () => {
    motionOff = !motionOff;
    applyMotion();
    try { localStorage.setItem('phenomenon.motion.off', motionOff ? '1' : '0'); } catch (_) { /* optional */ }
    notify(motionOff ? '움직임을 최소화했습니다.' : '움직임 효과를 다시 켰습니다.');
  });

  // Intro and navigation. Native anchors work even with JavaScript disabled.
  const chapters = [...document.querySelectorAll('.chapter')];
  const navLinks = [...document.querySelectorAll('.chapter-nav a')];
  let scrollQueued = false;
  function updateNavigation() {
    scrollQueued = false;
    const anchorY = innerHeight * .50;
    let best = 0, bestDist = Infinity;
    chapters.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const distance = r.top > anchorY ? r.top - anchorY : r.bottom < anchorY ? anchorY - r.bottom : 0;
      if (distance < bestDist) { bestDist = distance; best = i; }
    });
    navLinks.forEach((el, i) => {
      const active = i === best;
      el.classList.toggle('current', active);
      if (active) el.setAttribute('aria-current', 'location'); else el.removeAttribute('aria-current');
    });
    const d = document.documentElement;
    const scrollMax = Math.max(1, d.scrollHeight - innerHeight);
    $('reading-progress').style.width = `${clamp(scrollY / scrollMax * 100, 0, 100)}%`;
    const introTitle = document.querySelector('.intro-copy h1');
    if (introTitle) document.body.classList.toggle('returned', scrollY < 20 && hasVisitedEnd);
    state.sky = true;
  }
  let hasVisitedEnd = false;
  window.addEventListener('scroll', () => {
    if (scrollY > innerHeight * 4) hasVisitedEnd = true;
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateNavigation); }
    markActivity();
  }, { passive: true });
  window.addEventListener('resize', updateNavigation, { passive: true });
  updateNavigation();

  // Show a quiet message after 12 seconds without input, excluding hidden tabs.
  const idle = $('idle-message');
  let idleTimer;
  function markActivity() {
    idle.classList.remove('show');
    clearTimeout(idleTimer);
    if (document.visibilityState !== 'visible') return;
    idleTimer = setTimeout(() => {
      if (document.visibilityState === 'visible' && document.activeElement?.tagName !== 'INPUT') {
        idle.classList.add('show');
      }
    }, 12000);
  }
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(ev, markActivity, { passive: true });
  }
  markActivity();
  document.addEventListener('pointermove', e => {
    if (coarsePointer) return;
    document.body.classList.add('pointer-visible');
    $('pointer-light').style.transform = `translate3d(${e.clientX - 140}px,${e.clientY - 140}px,0)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.body.classList.remove('pointer-visible'));

  // Responsive canvas setup: draw in CSS pixel coordinates; bounded DPR prevents huge backing buffers.
  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const dpr = Math.min(devicePixelRatio || 1, coarsePointer ? 1.5 : 2);
    const bw = Math.max(1, Math.round(width * dpr)), bh = Math.max(1, Math.round(height * dpr));
    const changed = canvas.width !== bw || canvas.height !== bh;
    if (changed) { canvas.width = bw; canvas.height = bh; }
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height, changed };
  }

  // Background starfield. No images/fonts/CDNs; deterministic animation pauses on hidden tabs.
  const skyCanvas = $('sky');
  let skyInfo, stars = [];
  const maxStars = coarsePointer ? 100 : 180;
  function resizeSky() {
    skyInfo = sizeCanvas(skyCanvas);
    if (!skyInfo.ctx) return;
    stars = Array.from({ length: Math.min(maxStars, Math.max(65, Math.floor(skyInfo.width * skyInfo.height / 8500))) }, () => ({
      x: Math.random() * skyInfo.width, y: Math.random() * skyInfo.height,
      r: rand(.3, 1.25), base: rand(.12, .6), phase: rand(0, Math.PI * 2), speed: rand(.25, .9)
    }));
  }
  resizeSky();
  let skyMeteor = null;
  function drawSky(now) {
    const { ctx, width, height } = skyInfo;
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const alpha = motionOff ? s.base : s.base * (.76 + .24 * Math.sin(now * .0006 * s.speed + s.phase));
      ctx.fillStyle = `rgba(197,217,234,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI); ctx.fill();
    }
    if (motionOff) return;
    if (!skyMeteor && Math.random() < .001) skyMeteor = { x: rand(0, width*.7), y: rand(0, height*.3), t: 0 };
    if (skyMeteor) {
      skyMeteor.t += 1;
      const p = skyMeteor, x = p.x + p.t*6, y = p.y+p.t*2;
      const fade = Math.max(0, 1 - p.t/40);
      const gradient = ctx.createLinearGradient(x,y,x-85,y-27);
      gradient.addColorStop(0,`rgba(247,224,183,${fade*.6})`);gradient.addColorStop(1,'rgba(247,224,183,0)');
      ctx.strokeStyle = gradient;ctx.lineWidth = 1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-85,y-27);ctx.stroke();
      if (p.t>40||x>width+80) skyMeteor=null;
    }
  }

  // Breathing: 4 s inhale, 6 s exhale. Count a cycle only while visible, playing, and tab active.
  let breathPlaying = false, breathElapsed = 0;
  const BREATH_CYCLE = 10;
  function updateBreathVisual() {
    const phase = breathElapsed % BREATH_CYCLE;
    const inhale = phase < 4;
    let size = inhale ? .65 + .35 * phase/4 : 1 - .35 * ((phase-4)/6);
    if (!breathPlaying) size = .72;
    $('breath-core').style.transform = `scale(${motionOff ? .75 : size.toFixed(4)})`;
    $('breath-phase').textContent = !breathPlaying ? '잠시 머무르기' : inhale ? '들이쉬기' : '내쉬기';
    $('breath-timer').textContent = breathPlaying ? `${Math.ceil(inhale ? 4-phase : 10-phase)}초` : '4초 들숨 · 6초 날숨';
  }
  function toggleBreath() {
    breathPlaying = !breathPlaying;
    $('breath-play').textContent = breathPlaying ? '호흡 일시정지' : '호흡 시작';
    $('breath-play').setAttribute('aria-pressed', String(breathPlaying));
    $('breath-guidance').textContent = breathPlaying ? '안내에 맞춰 편안하게 호흡하세요. 불편하면 언제든 멈추세요.' : '편안한 호흡을 유지하세요. 안내가 불편하면 멈춰도 됩니다.';
    updateBreathVisual();
  }
  $('breath-play').addEventListener('click', toggleBreath);
  $('breath-reset').addEventListener('click', () => {
    breathElapsed = 0; breathPlaying = false;
    $('breath-play').textContent = '호흡 시작';
    $('breath-play').setAttribute('aria-pressed', 'false');
    updateBreathVisual();
    notify('이번 안내를 처음부터 다시 시작할 수 있습니다.');
  });
  updateBreathVisual();
  function tickBreath(dt) {
    if (!breathPlaying || !state.breath) return;
    const before = Math.floor(breathElapsed / BREATH_CYCLE);
    breathElapsed += Math.min(dt, .10);
    const after = Math.floor(breathElapsed / BREATH_CYCLE);
    if (after > before) {
      record.breaths += after - before;
      $('breath-count').textContent = format(record.breaths);
      persist();
    }
    updateBreathVisual();
  }

  // Time: parse a date as LOCAL calendar day, not Date.parse('YYYY-MM-DD') UTC.
  const birthInput = $('birth-date');
  const birthForm = $('birth-form');
  const error = $('birth-error');
  const today = new Date();
  birthInput.max = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  birthInput.min = '1800-01-01';
  let birthDay = null;
  let lastStatsSecond = -1;
  function readBirthDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    const [year, month, day] = m.slice(1).map(Number);
    const date = new Date(year,month-1,day,0,0,0,0);
    if (date.getFullYear() !== year || date.getMonth() !== month-1 || date.getDate() !== day) return null;
    if (year < 1800 || date.getTime() > Date.now()) return null;
    return {year,month,day,date};
  }
  function renderTime() {
    if (!birthDay) return;
    const now = new Date();
    const ageMinutes = Math.max(0,(now - birthDay.date)/60000);
    const dateDays = Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(birthDay.year,birthDay.month-1,birthDay.day))/86400000);
    $('days-lived').textContent = format(dateDays);
    $('heart-est').textContent = `${format(ageMinutes*72)}회`;
    $('breath-est').textContent = `${format(ageMinutes*16)}회`;
    $('orbit-est').textContent = `${(ageMinutes/60/24/365.2425).toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2})}년`;
    $('hour-est').textContent = `${format(ageMinutes/60)}시간`;
  }
  function submitBirth(e) {
    if (e) e.preventDefault();
    error.textContent = '';
    const parsed = readBirthDate(birthInput.value);
    if (!parsed) {
      error.textContent = '오늘 또는 이전의 실제 날짜를 선택해 주세요.';
      birthInput.setAttribute('aria-invalid', 'true');
      birthDay = null;
      $('time-results').hidden = true;
      $('time-placeholder').hidden = false;
      return;
    }
    birthInput.removeAttribute('aria-invalid');
    birthDay = parsed;
    $('time-placeholder').hidden = true;
    $('time-results').hidden = false;
    lastStatsSecond = -1;
    renderTime();
  }
  birthForm.addEventListener('submit', submitBirth);
  birthInput.addEventListener('change', () => { if (birthInput.value) submitBirth(); else error.textContent = ''; });
  $('birth-clear').addEventListener('click', () => {
    birthInput.value = ''; birthDay = null;error.textContent = '';
    birthInput.removeAttribute('aria-invalid');
    $('time-results').hidden = true; $('time-placeholder').hidden = false;
    notify('입력한 날짜를 화면에서 지웠습니다. 저장된 날짜는 없습니다.');
  });

  // Life: each seed is an ephemeral luminous multi-arm spiral with bounded memory.
  const lifeCanvas = $('life-canvas');
  let lifeInfo;
  const sprouts = [];
  const MAX_SPROUTS = coarsePointer ? 11 : 18;
  class Sprout {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.age = 0; this.duration = rand(12, 19);
      this.hue = rand(37, 190);
      this.arms = [];
      const branches = 4 + Math.floor(Math.random()*3);
      const turn = rand(.018,.033) * (Math.random()<.5?1:-1);
      for(let b=0;b<branches;b++) {
        const points = [];
        const base = b*Math.PI*2/branches + rand(-.14,.14);
        for(let i=0;i<=105;i++) {
          const r = 2 + i * rand(.7,.9);
          const theta = base + i*turn + Math.sin(i*.12+b)*.12;
          points.push({x:Math.cos(theta)*r,y:Math.sin(theta)*r});
        }
        this.arms.push(points);
      }
    }
    draw(ctx, dt) {
      this.age += dt;
      const visible = motionOff ? 1 : clamp(this.age/4,0,1);
      const alpha = clamp((this.duration-this.age)/4,0,1);
      const strength = Math.min(visible,alpha);
      const count = Math.floor(105*visible);
      ctx.save(); ctx.translate(this.x,this.y);ctx.globalCompositeOperation='lighter';
      for (const pts of this.arms) {
        ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<=count;i++)ctx.lineTo(pts[i].x,pts[i].y);
        ctx.lineWidth=1.2;ctx.strokeStyle=`hsla(${this.hue},88%,75%,${strength*.62})`;ctx.shadowBlur=12;ctx.shadowColor=`hsla(${this.hue},90%,66%,${strength*.7})`;ctx.stroke();
        if(count>0){ const tip=pts[count]; ctx.beginPath();ctx.arc(tip.x,tip.y,2.6,0,Math.PI*2);ctx.fillStyle=`hsla(${this.hue+12},100%,86%,${strength})`;ctx.fill(); }
      }
      ctx.shadowBlur=0;ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fillStyle=`rgba(250,236,196,${strength})`;ctx.fill();ctx.restore();
      return this.age < this.duration;
    }
  }
  function resizeLife() {
    const old = lifeInfo;
    lifeInfo = sizeCanvas(lifeCanvas);
    if (!lifeInfo.changed || !old) return;
    const sx = lifeInfo.width/old.width, sy = lifeInfo.height/old.height;
    sprouts.forEach(s => { s.x*=sx; s.y*=sy; });
  }
  function plant(x,y) {
    if (!lifeInfo?.ctx) return;
    if (sprouts.length >= MAX_SPROUTS) sprouts.shift();
    sprouts.push(new Sprout(clamp(x,20,lifeInfo.width-20),clamp(y,20,lifeInfo.height-20)));
    record.seeds = Math.min(1000000,record.seeds+1);
    persist();
    $('life-total').textContent=format(record.seeds);
    $('life-alive').textContent=String(sprouts.length);
  }
  function plantCenter() {
    plant(lifeInfo.width*rand(.28,.72),lifeInfo.height*rand(.42,.65));
  }
  lifeCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const r=lifeCanvas.getBoundingClientRect(); plant(e.clientX-r.left,e.clientY-r.top);
  });
  $('plant-button').addEventListener('click', plantCenter);
  $('clear-life').addEventListener('click',()=>{sprouts.length=0;$('life-alive').textContent='0'; if(lifeInfo?.ctx)lifeInfo.ctx.clearRect(0,0,lifeInfo.width,lifeInfo.height);notify('현재 피어난 빛을 지웠습니다.');});
  function drawLife(dt,now) {
    const {ctx,width,height}=lifeInfo;
    ctx.clearRect(0,0,width,height);
    // faint center haze enhances depth without bitmap assets
    const glow=ctx.createRadialGradient(width*.5,height*.53,10,width*.5,height*.53,Math.max(width,height)*.55);
    glow.addColorStop(0,'rgba(89,123,132,.07)');glow.addColorStop(1,'rgba(2,5,15,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    for(let i=sprouts.length-1;i>=0;i--)if(!sprouts[i].draw(ctx,dt))sprouts.splice(i,1);
    $('life-alive').textContent=String(sprouts.length);
  }

  // Cosmos: mask text into points and assign hundreds of independent stars.
  const cosmosCanvas=$('cosmos-canvas'), nameInput=$('cosmos-name');
  let cosmosInfo, particles=[], lastName='', nameDebounce=null;
  let cosmosMouse={x:-99999,y:-99999};
  const MAX_STARS=coarsePointer?900:1450;
  function initializeCosmos() {
    if(!cosmosInfo?.ctx)return;
    const {width:w,height:h}=cosmosInfo;
    const count=Math.min(MAX_STARS,Math.max(420,Math.floor(w*h/750)));
    particles=Array.from({length:count},()=>({x:rand(0,w),y:rand(0,h),homeX:rand(0,w),homeY:rand(0,h),vx:rand(-.12,.12),vy:rand(-.12,.12),r:rand(.35,1.35),phase:rand(0,6.28),hue:rand(35,200),tx:0,ty:0,assigned:false}));
    assignName(lastName);
  }
  function resizeCosmos() {
    cosmosInfo=sizeCanvas(cosmosCanvas);
    if(cosmosInfo.changed||!particles.length)initializeCosmos();
  }
  function assignName(raw) {
    lastName=raw.trim().slice(0,16);
    if(!cosmosInfo?.ctx||!particles.length)return;
    const {width:w,height:h}=cosmosInfo;
    if(!lastName){particles.forEach(p=>{p.assigned=false;p.vx=rand(-.5,.5);p.vy=rand(-.5,.5);});return;}
    const off=document.createElement('canvas');off.width=Math.floor(w);off.height=Math.floor(h);
    const t=off.getContext('2d',{willReadFrequently:true}); if(!t)return;
    const font=Math.max(16,Math.min(h*.21,w/Math.max(1,lastName.length*.89)));
    t.font=`600 ${font}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    t.fillStyle='#fff';t.textAlign='center';t.textBaseline='middle';
    t.fillText(lastName,w/2,h*.53,w*.84);
    const pixels=t.getImageData(0,0,off.width,off.height).data;
    const sample=Math.max(2,Math.floor(Math.min(w,h)/170));
    const positions=[];
    const yStart=Math.max(0,Math.floor(h*.53-font*.85)),yEnd=Math.min(off.height,Math.floor(h*.53+font*.85));
    for(let y=yStart;y<yEnd;y+=sample)for(let x=0;x<off.width;x+=sample){
      if(pixels[(y*off.width+x)*4+3]>90)positions.push({x,y});
    }
    for(let i=positions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
    if(!positions.length){particles.forEach(p=>p.assigned=false);notify('이 글꼴에서는 이름을 그릴 수 없습니다.');return;}
    particles.forEach((p,i)=>{if(i<Math.min(particles.length,positions.length*2)){
      const pos=positions[i%positions.length];p.tx=pos.x+rand(-.7,.7);p.ty=pos.y+rand(-.7,.7);p.assigned=true;
    }else p.assigned=false;});
  }
  function inputName() {clearTimeout(nameDebounce);nameDebounce=setTimeout(()=>assignName(nameInput.value),120);}
  nameInput.addEventListener('input',inputName);
  $('scatter-button').addEventListener('click',()=>{nameInput.value='';clearTimeout(nameDebounce);assignName('');notify('별빛을 다시 흩뜨렸습니다.');});
  $('cosmos-example').addEventListener('click',()=>{nameInput.value='지금 여기';clearTimeout(nameDebounce);assignName(nameInput.value);notify('글자 모양으로 빛을 모으고 있습니다.');});
  cosmosCanvas.addEventListener('pointermove',e=>{const r=cosmosCanvas.getBoundingClientRect();cosmosMouse={x:e.clientX-r.left,y:e.clientY-r.top};},{passive:true});
  cosmosCanvas.addEventListener('pointerleave',()=>{cosmosMouse={x:-99999,y:-99999};});
  function drawCosmos(dt,now) {
    const {ctx,width:w,height:h}=cosmosInfo;
    ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
    const ease=motionOff?1:Math.min(.085,dt*2.7);
    for(const p of particles){
      if(p.assigned){p.x+=(p.tx-p.x)*ease;p.y+=(p.ty-p.y)*ease;}
      else if(!motionOff){p.x+=p.vx*dt*40;p.y+=p.vy*dt*40;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;}
      const d=Math.hypot(p.x-cosmosMouse.x,p.y-cosmosMouse.y);
      const brightness=Math.max(0,1-d/125);
      const twinkle=motionOff?0:Math.sin(now*.0008+p.phase)*.09;
      const alpha=clamp((p.assigned?.52:.17)+brightness*.55+twinkle,.06,1);
      const radius=p.r+(p.assigned?.48:0)+brightness*1.6;
      ctx.beginPath();ctx.fillStyle=`hsla(${p.assigned?40:p.hue},85%,${p.assigned?79:70}%,${alpha})`;
      ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  $('save-cosmos').addEventListener('click',()=>{
    if(!cosmosInfo?.ctx)return;
    const width=Math.min(1600,Math.round(cosmosInfo.width*1.6));
    const height=Math.min(1400,Math.round(cosmosInfo.height*1.6));
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const ctx=out.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,'#0a1020');grad.addColorStop(1,'#050711');ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
    ctx.drawImage(cosmosCanvas,0,0,width,height);
    ctx.fillStyle='rgba(245,229,198,.95)';ctx.textAlign='center';ctx.font=`${Math.round(Math.min(30,width*.035))}px Georgia,serif`;
    ctx.fillText(lastName||'THE COSMOS',width/2,height*.17,width*.85);
    ctx.fillStyle='rgba(194,195,202,.75)';ctx.font=`${Math.round(Math.min(13,width*.014))}px sans-serif`;
    ctx.fillText('PHENOMENON  ·  당신이라는 현상',width/2,height*.94);
    out.toBlob(blob=>{
      if(!blob){notify('이미지 생성에 실패했습니다.');return;}
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='phenomenon-starlight.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
      notify('별빛 이미지를 PNG로 저장했습니다.');
    },'image/png');
  });

  // Optional ambient sound: explicit opt-in, zero network, background suspend.
  const soundButton=$('sound-toggle');
  let audioCtx=null, master=null, oscillators=[], soundOn=false;
  function makeAudio() {
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw new Error('AudioContext unavailable');
    audioCtx=new AC();master=audioCtx.createGain();master.gain.value=0;master.connect(audioCtx.destination);
    [110,146.83,164.81,220].forEach((hz,i)=>{
      const osc=audioCtx.createOscillator(), g=audioCtx.createGain();osc.type='sine';osc.frequency.value=hz;g.gain.value=.02/(1+i*.4);
      osc.connect(g);g.connect(master);osc.start();oscillators.push(osc);
    });
  }
  function setSoundState(on) {
    soundOn=on;
    soundButton.setAttribute('aria-pressed',String(on));
    soundButton.setAttribute('aria-label',on?'앰비언트 소리 끄기':'앰비언트 소리 켜기');
    soundButton.title=on?'소리 끄기':'소리 켜기';
  }
  soundButton.addEventListener('click',async()=>{
    try {
      if(!audioCtx)makeAudio();
      const next=!soundOn;
      await audioCtx.resume();
      master.gain.cancelScheduledValues(audioCtx.currentTime);
      master.gain.setValueAtTime(master.gain.value,audioCtx.currentTime);
      master.gain.linearRampToValueAtTime(next ? .22 : 0,audioCtx.currentTime+.65);
      setSoundState(next);
    } catch (_) { notify('이 브라우저에서는 소리를 사용할 수 없습니다.');setSoundState(false); }
  });
  window.addEventListener('pagehide',()=>{if(audioCtx)audioCtx.suspend().catch(()=>{});});

  // Memory with explicit save/erase, never store name or birthdate.
  $('memory-form').addEventListener('submit',e=>{
    e.preventDefault();const word=$('memory-word').value.trim().replace(/\s+/g,' ').slice(0,24);
    if(!word){notify('남기고 싶은 한 단어를 적어 주세요.');return;}
    record.word=word;persist();renderWord();$('memory-word').value='';
    notify(storageOK?'당신의 단어를 이 브라우저에 남겼습니다.':'저장이 제한되어 현재 화면에만 남겼습니다.');
  });
  $('clear-memory').addEventListener('click',()=>{
    const ok=window.confirm('방문 횟수·호흡 횟수·씨앗 횟수·저장한 단어를 모두 지울까요? 생년월일과 별빛 이름은 저장하지 않습니다.');
    if(!ok)return;
    try{localStorage.removeItem(KEY);localStorage.removeItem('phenomenon.motion.off');}catch(_){/* storage optional */}
    record=blankRecord();record.visits=1;
    motionOff = reducedPreference.matches; applyMotion();
    $('visit-note').textContent='처음 만나는 순간입니다.';$('breath-count').textContent='0';$('life-total').textContent='0';
    renderWord();updateStorageStatus();notify('이 브라우저의 체험 기록을 지웠습니다.');
  });
  $('return-link').addEventListener('click',()=>{
    document.querySelector('.intro-desc').innerHTML='다시, 여기.<br>이전과 같은 장면이지만, 지금의 당신은 다릅니다.';
  });

  // Observe only visible chapters, instead of running all heavy effects offscreen.
  let germinated = false;
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){
      const key=e.target.id;
      if(Object.prototype.hasOwnProperty.call(state,key))state[key]=e.isIntersecting&&e.intersectionRatio>=.10;
      if (key === 'life' && state.life && !germinated && lifeInfo) {
        germinated = true;
        for (let i=0;i<3;i++) {
          const sprout = new Sprout(lifeInfo.width*(.25+i*.25),lifeInfo.height*(.48+Math.sin(i*2)*.13));
          sprout.age = rand(1.8,3.5);
          sprouts.push(sprout);
        }
      }
    }
  },{threshold:[0,.1,.35,.6]});
  ['breath','time','life','cosmos','ending'].forEach(id=>observer.observe($(id)));

  let raf=0, lastFrame=0, lastPaint=0;
  function render(now){
    if(document.visibilityState!=='visible'){raf=0;return;}
    raf=requestAnimationFrame(render);
    const targetFPS=motionOff?12:(coarsePointer?30:45);
    if(now-lastPaint<1000/targetFPS)return;
    const dt=clamp((now-(lastFrame||now))/1000,0,.085);
    lastFrame=now;lastPaint=now;
    if(skyInfo?.ctx)drawSky(now);
    tickBreath(dt);
    if(state.life&&lifeInfo?.ctx)drawLife(dt,now);
    if(state.cosmos&&cosmosInfo?.ctx)drawCosmos(dt,now);
    if(state.time&&birthDay&&Math.floor(now/1000)!==lastStatsSecond){lastStatsSecond=Math.floor(now/1000);renderTime();}
  }
  function startRender(){if(!raf){lastFrame=lastPaint=0;raf=requestAnimationFrame(render);}}
  document.addEventListener('visibilitychange',()=>{
    markActivity();
    if(document.visibilityState==='visible'){
      startRender();
      if(soundOn&&audioCtx)audioCtx.resume().catch(()=>{});
    }else{
      idle.classList.remove('show');
      if(raf){cancelAnimationFrame(raf);raf=0;}
      if(audioCtx)audioCtx.suspend().catch(()=>{});
    }
  });
  resizeLife();resizeCosmos();
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
    for(const entry of entries){if(entry.target===lifeCanvas)resizeLife();if(entry.target===cosmosCanvas)resizeCosmos();}
  }):null;
  if(resizeObserver){resizeObserver.observe(lifeCanvas);resizeObserver.observe(cosmosCanvas);}
  window.addEventListener('resize',()=>{resizeSky();resizeLife();resizeCosmos();},{passive:true});
  // Ensure generated name mask reflects fonts after layout without requiring remote fonts.
  if(document.fonts?.ready)document.fonts.ready.then(()=>{if(nameInput.value)assignName(nameInput.value);});
  startRender();
})();
