/* 당신이라는 현상 · PHENOMENON
   GitHub Pages / local file compatible; no network requests or user-data persistence. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const fmt = (n) => Math.floor(Math.max(0, n)).toLocaleString('ko-KR');
  const status = (message) => { $('#status-line').textContent = message; };
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOn = !motionQuery.matches;
  let visiblePage = !document.hidden;
  let raf = 0, dirty = true, lastFrame = performance.now();
  let viewportW = 1, viewportH = 1;
  const dpr = () => Math.min(1.7, window.devicePixelRatio || 1);
  const motionToggle = $('#motion-toggle');
  const motionState = $('#motion-state');
  const starCanvas = $('#starfield');
  const starCtx = starCanvas.getContext('2d');
  const lifeCanvas = $('#life-canvas');
  const lifeCtx = lifeCanvas.getContext('2d');
  const cosmosCanvas = $('#cosmos-canvas');
  const cosmosCtx = cosmosCanvas.getContext('2d');
  const canvasOK = !!(starCtx && lifeCtx && cosmosCtx);
  const chapterIds = ['ch-intro', 'ch-breath', 'ch-time', 'ch-life', 'ch-cosmos', 'ch-ending'];

  function schedule() {
    dirty = true;
    if (!raf && visiblePage && canvasOK) raf = requestAnimationFrame(frame);
  }
  function setMotionUi() {
    motionState.textContent = motionOn ? '켜짐' : '꺼짐';
    motionToggle.setAttribute('aria-pressed', String(!motionOn));
    motionToggle.setAttribute('aria-label', motionOn ? '움직임 줄이기' : '움직임 다시 켜기');
    document.body.classList.toggle('reduced-motion', !motionOn);
    if (!motionOn) $('#breath-label').textContent = '고요하게';
  }
  motionToggle.addEventListener('click', () => {
    motionOn = !motionOn;
    setMotionUi();
    status(motionOn ? '움직임을 켰습니다.' : '움직임을 줄였습니다. 다른 기능은 계속 이용할 수 있습니다.');
    schedule();
  });
  setMotionUi();

  // Header, scroll map, section activity.
  const chapters = chapterIds.map((id) => document.getElementById(id));
  const navLinks = $$('[data-chapter]');
  let activeChapter = 'ch-intro';
  let introReturned = false;
  let sawBeyondIntro = false;
  let progressPending = false;
  function updateScrollUi() {
    progressPending = false;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    $('#scroll-progress').style.width = `${clamp(window.scrollY / scrollable, 0, 1) * 100}%`;
    const center = window.innerHeight * 0.5;
    let nearest = chapters[0], smallest = Infinity;
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      const gap = rect.top <= center && rect.bottom >= center
        ? 0 : Math.min(Math.abs(rect.top - center), Math.abs(rect.bottom - center));
      if (gap < smallest) { nearest = chapter; smallest = gap; }
    }
    if (activeChapter !== nearest.id) {
      activeChapter = nearest.id;
      navLinks.forEach((link) => {
        if (link.dataset.chapter === activeChapter) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      document.body.classList.toggle('at-ending', activeChapter === 'ch-ending');
      schedule();
    }
    if (window.scrollY > window.innerHeight * 2) sawBeyondIntro = true;
    if (sawBeyondIntro && !introReturned && window.scrollY < 60) {
      introReturned = true;
      $('#intro-lead').textContent = '다시, 여기.';
      $('#intro-sub').textContent = '돌아온 것을 환영합니다.\n같은 곳에 와도, 당신의 시간은 조금 달라졌습니다.';
      $('#intro-sub').style.whiteSpace = 'pre-line';
    }
  }
  window.addEventListener('scroll', () => {
    if (!progressPending) { progressPending = true; requestAnimationFrame(updateScrollUi); }
    resetIdle();
  }, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(updateScrollUi, 80));
  $('#return-btn').addEventListener('click', () => {
    document.getElementById('ch-intro').scrollIntoView({behavior: motionOn ? 'smooth' : 'auto'});
  });

  // The ambient visual cursor does not replace the system pointer.
  let pointerX = -1000, pointerY = -1000;
  let smoothX = -1000, smoothY = -1000;
  let pointerAvailable = false;
  const glow = $('#cursor-glow');
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  function handlePointer(e) {
    pointerX = e.clientX; pointerY = e.clientY;
    if (!pointerAvailable && finePointer) {
      pointerAvailable = true; smoothX = pointerX; smoothY = pointerY;
      document.body.classList.add('cursor-active');
    }
    if (!motionOn && finePointer) {
      glow.style.transform = `translate(${pointerX - 45}px,${pointerY - 45}px)`;
    }
    schedule();
  }
  if (finePointer) {
    window.addEventListener('pointermove', handlePointer, { passive: true });
    document.addEventListener('pointerleave', () => document.body.classList.remove('cursor-active'));
    document.addEventListener('pointerenter', () => { if (pointerAvailable) document.body.classList.add('cursor-active'); });
  }
  window.addEventListener('pointerdown', (e) => {
    if (!motionOn || e.target.closest('button, input, a')) return;
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.cssText = `position:fixed;z-index:29;left:${e.clientX}px;top:${e.clientY}px;width:10px;height:10px;border:1px solid rgba(252,210,149,.7);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);transition:width 1.15s ease-out,height 1.15s ease-out,opacity 1.15s ease-out;opacity:1`;
    document.body.appendChild(ripple);
    requestAnimationFrame(() => { ripple.style.width = '200px'; ripple.style.height = '200px'; ripple.style.opacity = '0'; });
    setTimeout(() => ripple.remove(), 1300);
  }, {passive:true});

  // Idle invitation: never appears over input or in an inactive tab.
  const idleEl = $('#idle-notice');
  let idleTimer = 0, idleHideTimer = 0;
  function resetIdle() {
    clearTimeout(idleTimer); clearTimeout(idleHideTimer);
    idleEl.classList.remove('show');
    if (!visiblePage) return;
    idleTimer = window.setTimeout(() => {
      if (document.activeElement && document.activeElement.matches('input')) return;
      idleEl.classList.add('show');
      idleHideTimer = window.setTimeout(() => idleEl.classList.remove('show'), 6000);
    }, 12000);
  }
  ['pointermove','pointerdown','keydown','touchstart','focusin'].forEach(type => {
    window.addEventListener(type, resetIdle, {passive:true});
  });
  resetIdle();

  // Canvases are sized to their CSS rectangles. Keep artwork on resize.
  let lifeW = 1, lifeH = 1, cosmosW = 1, cosmosH = 1;
  function sizeCanvas(canvas, context, width, height) {
    const scale = dpr();
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }
  const stars = [];
  let meteor = null;
  function buildStars() {
    stars.length = 0;
    const count = clamp(Math.floor(viewportW * viewportH / 5400), 65, 255);
    for (let i = 0; i < count; i++) stars.push({x:Math.random()*viewportW,y:Math.random()*viewportH,r:.3+Math.random()*1.15,a:.22+Math.random()*.48,p:Math.random()*TAU,speed:.1+Math.random()*.55});
  }
  function resizeAll() {
    const oldW = lifeW, oldH = lifeH;
    viewportW = Math.max(1, innerWidth); viewportH = Math.max(1, innerHeight);
    if (!canvasOK) return;
    sizeCanvas(starCanvas,starCtx,viewportW,viewportH);
    buildStars();
    const lifeRect = lifeCanvas.getBoundingClientRect();
    lifeW = Math.max(1,lifeRect.width); lifeH = Math.max(1,lifeRect.height);
    sizeCanvas(lifeCanvas,lifeCtx,lifeW,lifeH);
    if (oldW > 1 && oldH > 1) {
      const sx = lifeW / oldW, sy = lifeH / oldH;
      sprouts.forEach(s => s.points.forEach(p => {p.x *= sx;p.y *= sy;}));
    }
    const cosmosRect = cosmosCanvas.getBoundingClientRect();
    cosmosW = Math.max(1,cosmosRect.width); cosmosH = Math.max(1,cosmosRect.height);
    sizeCanvas(cosmosCanvas,cosmosCtx,cosmosW,cosmosH);
    buildCosmos();
    schedule();
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeAll, 140);
  }, {passive: true});

  function drawStars(now, dt) {
    starCtx.clearRect(0, 0, viewportW, viewportH);
    for (const s of stars) {
      if (motionOn) s.p += dt * s.speed;
      const alpha = s.a * (.78 + .22*Math.sin(s.p));
      starCtx.fillStyle = `rgba(228,229,255,${alpha.toFixed(3)})`;
      starCtx.beginPath(); starCtx.arc(s.x,s.y,s.r,0,TAU); starCtx.fill();
    }
    if (motionOn && !meteor && Math.random() < dt * .035) meteor = {x:Math.random()*viewportW*.7,y:Math.random()*viewportH*.35,t:0};
    if (meteor) {
      if (motionOn) meteor.t += dt;
      const x = meteor.x + meteor.t*230, y = meteor.y + meteor.t*90;
      const a = Math.max(0,1-meteor.t/.9);
      if (a <= 0) meteor = null;
      else {
        const grad = starCtx.createLinearGradient(x,y,x-75,y-30);
        grad.addColorStop(0,`rgba(255,226,188,${.7*a})`);grad.addColorStop(1,'rgba(255,226,188,0)');
        starCtx.strokeStyle=grad;starCtx.lineWidth=1.3;
        starCtx.beginPath();starCtx.moveTo(x,y);starCtx.lineTo(x-75,y-30);starCtx.stroke();
      }
    }
  }

  // Guided breathing, counted only while the chapter is actually visible.
  let breathVisible = false, breathPaused = false, breathT = 0, breathCount = 0;
  const breathCircle = $('#breath-circle');
  $('#breath-toggle').addEventListener('click', () => {
    breathPaused = !breathPaused;
    $('#breath-toggle').textContent = breathPaused ? '호흡 계속하기' : '호흡 일시정지';
    $('#breath-toggle').setAttribute('aria-pressed', String(breathPaused));
    schedule();
  });
  function drawBreath(dt) {
    if (breathVisible && !breathPaused && motionOn) {
      breathT += dt;
      while (breathT >= 10) { breathT -= 10; breathCount++; $('#breath-count').textContent = String(breathCount); }
    }
    const inhale = breathT < 4;
    const phase = inhale ? breathT/4 : (breathT-4)/6;
    const smooth = phase*phase*(3-2*phase);
    const scale = inhale ? .58 + .42*smooth : 1 - .42*smooth;
    breathCircle.style.transform = `scale(${scale.toFixed(3)})`;
    breathCircle.style.opacity = (.65 + .34*scale).toFixed(3);
    const label = !motionOn ? '고요하게' : breathPaused ? '잠시 멈춤' : inhale ? '들이쉬세요' : '내쉬세요';
    const el = $('#breath-label');
    if (el.textContent !== label) el.textContent = label;
  }

  // Time calculations: illustrative rates only, not personal measurements.
  let birthTimestamp = null;
  const birthInput = $('#birth-input');
  const birthError = $('#birth-error');
  function dateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  birthInput.max = dateString(new Date());
  function parseBirth(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const y=Number(match[1]), m=Number(match[2]), d=Number(match[3]);
    if (y < 1 || y > 9999) return null;
    const date = new Date(0);date.setFullYear(y,m-1,d);date.setHours(0,0,0,0);
    if (date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d || date.getTime() > Date.now()) return null;
    return date.getTime();
  }
  $('#birth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = parseBirth(birthInput.value);
    if (d == null) {
      birthError.hidden = false;birthError.textContent = '오늘 또는 이전의 올바른 날짜를 선택해 주세요.';
      birthInput.setAttribute('aria-invalid','true');birthInput.focus();return;
    }
    birthError.hidden = true;birthInput.removeAttribute('aria-invalid');
    birthTimestamp = d;
    $('#time-facts').hidden = false;$('#facts-note').hidden = false;
    renderFacts();
    if (window.innerWidth < 650) {
      setTimeout(() => $('#time-facts').scrollIntoView({behavior:motionOn ? 'smooth' : 'auto', block:'center'}), 160);
    }
    status('시간의 추정치가 표시되었습니다. 의료 측정값이 아닌 참고 수치입니다.');
  });
  birthInput.addEventListener('change', () => { if (!birthError.hidden) { birthError.hidden = true;birthInput.removeAttribute('aria-invalid'); } });
  function renderFacts() {
    if (birthTimestamp == null) return;
    const seconds = Math.max(0,(Date.now() - birthTimestamp)/1000);
    const minutes = seconds/60, days = seconds/86400;
    $('#fact-days').textContent=fmt(days);
    $('#fact-heart').textContent=fmt(minutes*72);
    $('#fact-breath').textContent=fmt(minutes*16);
    $('#fact-earth').textContent=(days/365.2422).toLocaleString('ko-KR',{maximumFractionDigits:2,minimumFractionDigits:2});
    $('#fact-moon').textContent=(days/27.3217).toLocaleString('ko-KR',{maximumFractionDigits:1,minimumFractionDigits:1});
    $('#fact-blink').textContent=fmt(minutes*15);
  }
  setInterval(() => { if (!document.hidden && activeChapter==='ch-time' && birthTimestamp !== null) renderFacts(); }, 1000);

  // Life: light sprouts respond to direct pointer and keyboard/button interaction.
  const sprouts = [];
  let lifeVisible = false;
  class Sprout {
    constructor(x,y) {
      this.points=[{x,y}];this.angle=Math.random()*TAU;
      this.curl=(Math.random()<.5?-1:1)*(.022+Math.random()*.029);
      this.step=1.3+Math.random()*1.6;this.maxPoints=150+Math.floor(Math.random()*155);
      this.hue=28+Math.random()*48;this.growth=15+Math.random()*22;
      this.acc=0;this.fadeTime=0;this.fadeDuration=14+Math.random()*13;this.alpha=1;
    }
    update(dt) {
      if (this.points.length < this.maxPoints) {
        this.acc+=dt*this.growth;
        let turns=0;
        while (this.acc>=1 && this.points.length<this.maxPoints && turns++<24) {
          this.acc--;
          const p=this.points[this.points.length-1];
          this.angle+=this.curl*(1+this.points.length/160)+(Math.random()-.5)*.018;
          this.points.push({x:p.x+Math.cos(this.angle)*this.step,y:p.y+Math.sin(this.angle)*this.step});
        }
      } else { this.fadeTime+=dt;this.alpha=Math.max(0,1-this.fadeTime/this.fadeDuration); }
    }
    draw() {
      if (this.points.length<2 || this.alpha<=0) return;
      const pts=this.points, tip=pts[pts.length-1];
      lifeCtx.lineJoin='round';lifeCtx.lineCap='round';
      lifeCtx.beginPath();lifeCtx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++) lifeCtx.lineTo(pts[i].x,pts[i].y);
      lifeCtx.strokeStyle=`hsla(${this.hue},96%,65%,${.18*this.alpha})`;
      lifeCtx.lineWidth=4;lifeCtx.stroke();
      lifeCtx.strokeStyle=`hsla(${this.hue},96%,77%,${.7*this.alpha})`;
      lifeCtx.lineWidth=.9;lifeCtx.stroke();
      const g=lifeCtx.createRadialGradient(tip.x,tip.y,0,tip.x,tip.y,26);
      g.addColorStop(0,`hsla(${this.hue},100%,87%,${.53*this.alpha})`);
      g.addColorStop(1,'rgba(255,204,140,0)');
      lifeCtx.fillStyle=g;lifeCtx.fillRect(tip.x-26,tip.y-26,52,52);
    }
  }
  function plant(x,y) {
    if (!canvasOK) {status('이 브라우저는 캔버스 기능을 지원하지 않습니다.');return;}
    if (sprouts.length>=22) sprouts.shift();
    sprouts.push(new Sprout(clamp(x,0,lifeW),clamp(y,0,lifeH)));
    $('#life-count').textContent=String(sprouts.length);
    schedule();
  }
  lifeCanvas.addEventListener('pointerdown', (e) => {
    const r=lifeCanvas.getBoundingClientRect();plant(e.clientX-r.left,e.clientY-r.top);
  }, {passive:true});
  // The section itself also receives taps on gaps, but controls do not plant.
  $('#ch-life').addEventListener('pointerdown', (e) => {
    if (e.target === lifeCanvas || e.target.closest('button,a')) return;
    const r=lifeCanvas.getBoundingClientRect();plant(e.clientX-r.left,e.clientY-r.top);
  }, {passive:true});
  $('#plant-button').addEventListener('click', () => {plant(lifeW*(.35+Math.random()*.3),lifeH*(.35+Math.random()*.28));status('정원에 빛 하나를 심었습니다.');});
  $('#clear-life').addEventListener('click', () => {sprouts.length=0;$('#life-count').textContent='0';status('정원을 비웠습니다.');schedule();});
  function drawLife(dt) {
    lifeCtx.clearRect(0,0,lifeW,lifeH);
    if (!lifeVisible) return;
    lifeCtx.save();lifeCtx.globalCompositeOperation='lighter';
    for(let i=sprouts.length-1;i>=0;i--) {
      const s=sprouts[i];if(motionOn)s.update(dt);s.draw();
      if(s.alpha<=0) sprouts.splice(i,1);
    }
    lifeCtx.restore();
    $('#life-count').textContent=String(sprouts.length);
  }

  // Cosmos: off-screen text sampling, Korean IME-aware input, no text storage.
  let cosmosVisible=false, cosmosParticles=[], selectedName='', nameFontSize=72;
  let cosmosPointer={x:-5000,y:-5000};
  const nameInput=$('#cosmos-name-input');
  const nameForm=$('#name-form');
  let nameTimer=0;
  function buildCosmos() {
    const count=clamp(Math.round(cosmosW*cosmosH/750),380,1050);
    cosmosParticles=Array.from({length:count},()=>({
      x:Math.random()*cosmosW,y:Math.random()*cosmosH,
      vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,
      r:.5+Math.random()*1.35,phase:Math.random()*TAU,frequency:.3+Math.random()*1.4,
      hue:31+Math.random()*30,tx:0,ty:0,assigned:false,glow:0
    }));
    assignName(selectedName);
  }
  function assignName(text) {
    selectedName=Array.from(text.trim()).slice(0,12).join('');
    if(!selectedName) {cosmosParticles.forEach(p=>p.assigned=false);schedule();return;}
    const off=document.createElement('canvas');off.width=Math.max(1,Math.floor(cosmosW));off.height=Math.max(1,Math.floor(cosmosH));
    const ctx=off.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    const family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    let fontSize=Math.min(cosmosH*.25,cosmosW*.36,180);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    for(let i=0;i<18;i++) {
      ctx.font=`700 ${fontSize}px ${family}`;
      if(ctx.measureText(selectedName).width<cosmosW*.77)break;
      fontSize*=.87;
    }
    nameFontSize=fontSize;
    const baseline=cosmosH*.51;
    ctx.fillText(selectedName,cosmosW*.5,baseline);
    const data=ctx.getImageData(0,0,off.width,off.height).data;
    const points=[];
    const step=3;
    const minY=Math.max(0,Math.floor(baseline-fontSize));
    const maxY=Math.min(off.height,Math.ceil(baseline+fontSize));
    for(let y=minY;y<maxY;y+=step)for(let x=0;x<off.width;x+=step){
      if(data[(y*off.width+x)*4+3]>120) points.push({x,y});
    }
    for(let i=points.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
    const n=Math.min(points.length,cosmosParticles.length);
    cosmosParticles.forEach((p,i)=>{
      p.assigned=i<n;
      if(p.assigned){p.tx=points[i].x;p.ty=points[i].y; if(!motionOn){p.x=p.tx;p.y=p.ty;}}
    });
    schedule();
  }
  function applyName() {
    if(!nameInput.value.trim()) {assignName('');status('빛이 다시 우주로 흩어집니다.');return;}
    assignName(nameInput.value);
    status('입력한 이름이 별빛으로 표현됩니다.');
  }
  nameForm.addEventListener('submit',(e)=>{e.preventDefault();clearTimeout(nameTimer);applyName();});
  nameInput.addEventListener('input',(e)=>{
    if(e.isComposing) return;
    clearTimeout(nameTimer);nameTimer=setTimeout(applyName,210);
  });
  nameInput.addEventListener('compositionend',()=>{
    clearTimeout(nameTimer);nameTimer=setTimeout(applyName,70);
  });
  $('#clear-name').addEventListener('click',()=>{clearTimeout(nameTimer);nameInput.value='';assignName('');status('별빛을 흩뜨렸습니다.');});
  cosmosCanvas.addEventListener('pointermove',(e)=>{
    const r=cosmosCanvas.getBoundingClientRect();cosmosPointer.x=e.clientX-r.left;cosmosPointer.y=e.clientY-r.top;
    if(!motionOn)schedule();
  },{passive:true});
  cosmosCanvas.addEventListener('pointerleave',()=>{cosmosPointer.x=-5000;cosmosPointer.y=-5000;});
  function drawCosmos(dt) {
    cosmosCtx.clearRect(0,0,cosmosW,cosmosH);
    if(!cosmosVisible)return;
    cosmosCtx.save();cosmosCtx.globalCompositeOperation='lighter';
    // Faint diffuse letterform reinforces readability without replacing the stars.
    if(selectedName) {
      cosmosCtx.textAlign='center';cosmosCtx.textBaseline='middle';
      cosmosCtx.font=`700 ${nameFontSize}px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif`;
      cosmosCtx.shadowColor='rgba(247,197,119,.16)';cosmosCtx.shadowBlur=20;
      cosmosCtx.fillStyle='rgba(240,185,115,.042)';
      cosmosCtx.fillText(selectedName,cosmosW*.5,cosmosH*.51);
      cosmosCtx.shadowBlur=0;
    }
    for(const p of cosmosParticles) {
      if(motionOn) {
        if(p.assigned){const k=1-Math.exp(-dt*2.8);p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k;}
        else {p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<0)p.x+=cosmosW;if(p.x>cosmosW)p.x-=cosmosW;if(p.y<0)p.y+=cosmosH;if(p.y>cosmosH)p.y-=cosmosH;}
        p.phase+=p.frequency*dt;
      }
      const dx=p.x-cosmosPointer.x,dy=p.y-cosmosPointer.y;
      const near=Math.max(0,1-Math.hypot(dx,dy)/170);
      p.glow+=((near)-p.glow)*Math.min(1,dt*4.5);
      const r=p.r+(p.assigned?.35:0)+p.glow*1.5;
      const alpha=clamp(.25+.18*Math.sin(p.phase)+(p.assigned?.55:0)+p.glow*.36,.09,.98);
      cosmosCtx.fillStyle=`hsla(${p.hue},85%,${Math.round(70+p.glow*14)}%,${alpha})`;
      cosmosCtx.beginPath();cosmosCtx.arc(p.x,p.y,r,0,TAU);cosmosCtx.fill();
      if(p.glow>.24) {
        const g=cosmosCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*8);
        g.addColorStop(0,`rgba(253,223,176,${.27*p.glow})`);g.addColorStop(1,'rgba(253,223,176,0)');
        cosmosCtx.fillStyle=g;cosmosCtx.fillRect(p.x-r*8,p.y-r*8,r*16,r*16);
      }
    }
    cosmosCtx.restore();
  }

  // Section-specific work only when viewed.
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        const on=entry.isIntersecting && entry.intersectionRatio>.14;
        if(entry.target.id==='ch-breath')breathVisible=on;
        if(entry.target.id==='ch-life')lifeVisible=on;
        if(entry.target.id==='ch-cosmos')cosmosVisible=on;
        if(entry.target.id==='ch-ending' && on)revealEnding();
      });
      schedule();
    },{threshold:[0,.15,.4,.7]});
    ['ch-breath','ch-life','ch-cosmos','ch-ending'].forEach(id=>observer.observe(document.getElementById(id)));
  } else {breathVisible=lifeVisible=cosmosVisible=true;revealEnding();}
  let endingStarted=false;
  function revealEnding() {
    if(endingStarted)return;
    endingStarted=true;
    $$('.ending-lines p').forEach((p,i)=>{
      if(!motionOn)p.classList.add('show');
      else setTimeout(()=>p.classList.add('show'),450+i*1050);
    });
  }

  function frame(now) {
    raf=0;
    if(!visiblePage||!canvasOK)return;
    const dt=clamp((now-lastFrame)/1000,0,.05);
    lastFrame=now;
    const needs=dirty;
    dirty=false;
    if(motionOn||needs){
      drawStars(now,dt);
      drawBreath(dt);
      drawLife(dt);
      drawCosmos(dt);
      if(finePointer&&pointerAvailable&&motionOn){
        smoothX+=(pointerX-smoothX)*.22;smoothY+=(pointerY-smoothY)*.22;
        glow.style.transform=`translate(${(smoothX-45).toFixed(1)}px,${(smoothY-45).toFixed(1)}px)`;
      }
    }
    if(motionOn)raf=requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{
    visiblePage=!document.hidden;
    if(!visiblePage){if(raf){cancelAnimationFrame(raf);raf=0;}clearTimeout(idleTimer);idleEl.classList.remove('show');
      if(audioCtx && audioCtx.state==='running')audioCtx.suspend().catch(()=>{});
    } else {lastFrame=performance.now();resetIdle();schedule();if(soundOn&&audioCtx)audioCtx.resume().catch(()=>{});}
  });

  // Non-melodic ambient texture synthesized locally; created on click.
  const soundButton=$('#sound-toggle'), soundState=$('#sound-state');
  let audioCtx=null, masterGain=null, soundOn=false, soundSerial=0;
  function buildAudio() {
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    audioCtx=new AC();masterGain=audioCtx.createGain();masterGain.gain.value=0;
    masterGain.connect(audioCtx.destination);
    const base=[82.4,124.8,185.2];
    base.forEach((hz,i)=>{
      const osc=audioCtx.createOscillator();const g=audioCtx.createGain();
      osc.type='sine';osc.frequency.value=hz;g.gain.value=.11/(i+1.2);
      osc.connect(g);g.connect(masterGain);osc.start();
      const lfo=audioCtx.createOscillator();const lfoGain=audioCtx.createGain();
      lfo.type='sine';lfo.frequency.value=.065+i*.019;lfoGain.gain.value=.014/(i+1);
      lfo.connect(lfoGain);lfoGain.connect(g.gain);lfo.start();
    });
    return true;
  }
  soundButton.addEventListener('click',async()=>{
    try {
      if(!audioCtx && !buildAudio()){status('이 브라우저는 오디오 재생을 지원하지 않습니다.');return;}
      soundOn=!soundOn;const serial=++soundSerial;
      if(soundOn){await audioCtx.resume();if(serial!==soundSerial)return;}
      const t=audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value,t);
      masterGain.gain.linearRampToValueAtTime(soundOn?.23:0,t+(soundOn?1.5:.7));
      soundButton.setAttribute('aria-pressed',String(soundOn));
      soundState.textContent=soundOn?'소리 켬':'소리 끔';
      soundButton.setAttribute('aria-label',soundOn?'앰비언트 소리 끄기':'앰비언트 소리 켜기');
      if(!soundOn)setTimeout(()=>{if(!soundOn&&serial===soundSerial&&audioCtx?.state==='running')audioCtx.suspend().catch(()=>{});},900);
      status(soundOn?'앰비언트 소리를 켰습니다.':'앰비언트 소리를 껐습니다.');
    } catch(err) {soundOn=false;soundButton.setAttribute('aria-pressed','false');soundState.textContent='소리 끔';status('소리를 재생할 수 없습니다. 브라우저 설정을 확인해 주세요.');}
  });
  window.addEventListener('pagehide',()=>{if(audioCtx)audioCtx.close().catch(()=>{});});

  // Download an original visual reflection without remote image services.
  $('#save-moment').addEventListener('click',()=>{
    const btn=$('#save-moment');
    try {
      const c=document.createElement('canvas');c.width=1600;c.height=900;
      const ctx=c.getContext('2d');
      if(!ctx)throw Error('canvas unavailable');
      const bg=ctx.createRadialGradient(800,420,70,800,450,1050);
      bg.addColorStop(0,'#27202b');bg.addColorStop(.45,'#100f1b');bg.addColorStop(1,'#05070c');
      ctx.fillStyle=bg;ctx.fillRect(0,0,1600,900);
      // Fixed seed, so download is reproducible for this button press.
      let seed=20261114;
      const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
      for(let i=0;i<360;i++){
        const x=random()*1600,y=random()*900,r=.4+random()*1.8;
        ctx.fillStyle=`rgba(238,221,200,${(.12+random()*.7).toFixed(2)})`;
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      }
      const g=ctx.createRadialGradient(800,430,15,800,430,220);
      g.addColorStop(0,'rgba(255,238,202,.9)');g.addColorStop(.2,'rgba(242,192,128,.38)');g.addColorStop(1,'rgba(239,163,99,0)');
      ctx.fillStyle=g;ctx.fillRect(580,210,440,440);
      ctx.strokeStyle='rgba(244,207,159,.25)';ctx.lineWidth=1;
      [148,193,240].forEach(r=>{ctx.beginPath();ctx.ellipse(800,430,r,r*.66,-.4,0,TAU);ctx.stroke();});
      ctx.textAlign='center';ctx.fillStyle='#f9e4c0';
      ctx.font="48px 'Malgun Gothic','Apple SD Gothic Neo',serif";
      ctx.fillText(selectedName||'당신이라는 현상',800,688,1350);
      ctx.fillStyle='#c6b3a2';ctx.font="24px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
      ctx.fillText('이 순간을 느낀 것은, 분명 당신입니다.',800,746);
      ctx.font='16px sans-serif';ctx.fillStyle='#b09c87';
      ctx.fillText('PHENOMENON  ·  '+dateString(new Date()),800,814);
      const filename=`phenomenon_${dateString(new Date())}.png`;
      const download=(url)=>{const a=document.createElement('a');a.download=filename;a.href=url;document.body.appendChild(a);a.click();a.remove();};
      if(c.toBlob)c.toBlob(blob=>{if(!blob){status('이미지 저장에 실패했습니다.');return;}const u=URL.createObjectURL(blob);download(u);setTimeout(()=>URL.revokeObjectURL(u),20000);status('이 순간을 PNG 이미지로 저장했습니다.');},'image/png');
      else {download(c.toDataURL('image/png'));status('이 순간을 PNG 이미지로 저장했습니다.');}
    } catch(e){status('이미지 저장을 지원하지 않는 환경입니다.');}
  });

  if(!canvasOK) {
    document.body.classList.add('canvas-unavailable');
    status('이 브라우저에서는 캔버스 애니메이션을 표시할 수 없습니다. 글과 입력 기능은 사용할 수 있습니다.');
  } else {
    resizeAll();updateScrollUi();lastFrame=performance.now();schedule();
  }
})();
