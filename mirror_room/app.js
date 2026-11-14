/* MIRROR · 2.0 — no analytics, no APIs, no external dependencies. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const format = (n) => Math.floor(n).toLocaleString('ko-KR');
  const lifeCanvas = $('#life');
  const traceCanvas = $('#trace');
  const lc = lifeCanvas.getContext('2d', {alpha: false});
  const tc = traceCanvas.getContext('2d');
  const el = {
    line: $('#line'), detail: $('#detail'), hint: $('#hint'),
    actIndex: $('#actIndex'), actName: $('#actName'),
    stops: $('#chapterStops'), status: $('#statusText'),
    metrics: $('#metrics'), heart: $('#v-heart'), earth: $('#v-earth'),
    light: $('#v-light'), cells: $('#v-cells'),
    stillCard: $('#stillCard'), stillProgress: $('#stillProgress'),
    stillSeconds: $('#stillSeconds'), progress: $('#progressBar'),
    pause: $('#pauseBtn'), next: $('#nextBtn'), save: $('#saveBtn'),
    restart: $('#restartBtn'), help: $('#helpBtn'),
    dialog: $('#helpDialog'), closeHelp: $('#closeHelp'), doneHelp: $('#doneHelp'),
    erase: $('#eraseBtn'), session: $('#sessionText'),
    visitInfo: $('#visitInfo'), toast: $('#toast')
  };
  if (!lc || !tc) {
    el.line.textContent = '이 브라우저에서는 Canvas 2D를 지원하지 않습니다.';
    el.line.classList.add('on');
    return;
  }

  const ACTS = ['침묵', '씨앗', '시간', '정지', '거울', '소멸'];
  const timeline = [
    {act: 0, text: '…', ms: 1900, note: '잠시 어둠을 바라봐 주세요.'},
    {act: 0, text: '이 방에는 아무것도 없습니다.', ms: 3400},
    {act: 0, text: '아직은.', ms: 2200},
    {act: 1, text: '움직여 보세요.', kind: 'move', note: '마우스 또는 손가락으로 화면을 움직이세요.'},
    {act: 1, text: '당신이 움직였습니다.', ms: 2600},
    {act: 1, text: '그래서 무언가가 태어났습니다.', ms: 3400},
    {act: 1, text: '당신이 지나간 자리에서만,\n생명이 자랍니다.', ms: 3800},
    {act: 1, text: '멈추면, 천천히 사라집니다.', ms: 3500, note: '움직임이 멈추면 화학 패턴의 강도가 점차 약해집니다.'},
    {act: 2, text: '당신이 이 문장을 읽는 동안에도,', ms: 3100},
    {act: 2, text: '당신의 몸에서는\n아무 일도 멈추지 않았습니다.', ms: 3600},
    {act: 2, text: '숫자는 세상을 설명하지만,\n당신 자체를 측정하지는 못합니다.', kind: 'metrics', ms: 11300, note: ''},
    {act: 2, text: '이 모든 일은,\n당신이 아무것도 하지 않아도 일어납니다.', ms: 3900},
    {act: 2, text: '당신이 ‘나’라고 부르는 것은,\n이 모든 것을 바라보고 있습니다.', ms: 4100},
    {act: 3, text: '이제, 멈춰 보세요.', ms: 2400, note: '당신의 움직임이 만든 흔적을 만나게 됩니다.'},
    {act: 3, text: '움직이지 마세요.', kind: 'still', note: '9초 동안 손을 움직이지 않으면 다음 장면이 열립니다.'},
    {act: 3, text: (s) => s.stillOK ? '고요함 속에,\n당신이 남아 있습니다.' : '멈추지 않아도 괜찮습니다.\n움직이는 것 또한 당신이니까요.', ms: 4200},
    {act: 4, text: (s) => s.trail.length > 1 ? '이 선들은, 당신입니다.' : '아직 당신이 남긴 선은 없습니다.', ms: 4000, note: (s) => s.trail.length > 1 ? '지나온 손끝의 경로가 이제 모습을 드러냅니다.' : '화면을 움직이면 지금부터 궤적이 쌓입니다.'},
    {act: 4, text: '지난 몇 분 동안 당신이\n이 화면에 남긴 것.', ms: 3800},
    {act: 4, text: '당신은 자신을 그릴 생각이 없었습니다.', ms: 3800},
    {act: 4, text: '그런데도, 그려졌습니다.', ms: 4000},
    {act: 5, text: '당신이 이 방에 머문 시간은,\n잠깐이었습니다.', ms: 3900},
    {act: 5, text: (s) => s.visitCount === 1 ? '이 브라우저에서 처음 만났습니다.' : `이 브라우저에서의 ${s.visitCount}번째 방문입니다.`, ms: 3900},
    {act: 5, text: '이 방은 당신의 이름을 기억하지 못합니다.', ms: 3700},
    {act: 5, text: '브라우저에 방문 횟수만 남깁니다.', ms: 3800},
    {act: 5, text: '그것으로 충분합니다.', ms: 3700},
    {act: 5, text: '다시 오세요.', kind: 'final', note: '다시 시작하거나 지금의 거울을 이미지로 남길 수 있습니다.'},
  ];
  const firstOfAct = ACTS.map((_, a) => timeline.findIndex((item) => item.act === a));
  const stopNodes = ACTS.map((name, i) => {
    const div = document.createElement('span');
    div.className = 'chapter-stop';
    div.setAttribute('role', 'listitem');
    div.setAttribute('aria-label', `${i + 1}장 ${name}`);
    div.textContent = `${String(i+1).padStart(2,'0')} ${name}`;
    el.stops.append(div);
    return div;
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = matchMedia('(pointer:coarse)').matches;
  const persistKey = 'mirror.visits.v2';
  const oldPersistKey = 'mirror.visits.v1';
  let visitCount = 1;
  let storageWorks = false;
  try {
    const old = localStorage.getItem(persistKey) ?? localStorage.getItem(oldPersistKey);
    const parsed = Number.parseInt(old || '0', 10);
    visitCount = clamp((Number.isFinite(parsed) ? parsed : 0) + 1, 1, 1000000);
    localStorage.setItem(persistKey, String(visitCount));
    storageWorks = true;
  } catch (_) { /* browser can block localStorage; experience still works */ }
  el.visitInfo.textContent = storageWorks ? `이 브라우저의 ${visitCount}번째 방문` : '저장하지 않는 방문';
  el.session.textContent = `SESSION ${String(visitCount).padStart(2,'0')}`;

  const state = {
    stepIndex: -1, stepTime: 0, activeMs: 0, paused: false, dialogWasPaused: false,
    moved: false, pointer: {x: .5, y: .5, set: false, id: null}, trail: [],
    lastTrailMs: 0, lastMoveActive: 0, stillTime: 0, stillOK: false,
    mirror: 0, visitCount, final: false, pendingReset: false
  };
  const MAX_TRAIL = 1800;
  let width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let rw = 160, rh = 112, A, B, A2, B2, pixels;
  const F = .0367, K = .0649, DA = 1, DB = .5;
  const stars = Array.from({length: 180}, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    s: i % 7 === 0 ? 1.5 : .65,
    a: .12 + ((i * 17) % 41) / 180
  }));
  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  const gc = glow.getContext('2d');
  const gg = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  gg.addColorStop(0, 'rgba(198,255,239,.46)');
  gg.addColorStop(.26, 'rgba(127,251,228,.18)');
  gg.addColorStop(1, 'rgba(127,251,228,0)');
  gc.fillStyle = gg;
  gc.fillRect(0, 0, 128, 128);

  function resize() {
    const prevA = A, prevB = B, prevW = rw, prevH = rh;
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    dpr = Math.min(devicePixelRatio || 1, coarsePointer ? 1.6 : 2);
    traceCanvas.width = Math.round(width * dpr);
    traceCanvas.height = Math.round(height * dpr);
    tc.setTransform(dpr, 0, 0, dpr, 0, 0);
    rh = coarsePointer ? 90 : 112;
    rw = clamp(Math.round(rh * width / height), 70, coarsePointer ? 148 : 208);
    lifeCanvas.width = rw;
    lifeCanvas.height = rh;
    A = new Float32Array(rw * rh);
    B = new Float32Array(rw * rh);
    A2 = new Float32Array(rw * rh);
    B2 = new Float32Array(rw * rh);
    if (prevA && prevB) {
      for (let y=0; y<rh; y++) for(let x=0; x<rw; x++) {
        const oy = Math.min(prevH - 1, Math.floor(y * prevH / rh));
        const ox = Math.min(prevW - 1, Math.floor(x * prevW / rw));
        A[y * rw + x] = prevA[oy * prevW + ox];
        B[y * rw + x] = prevB[oy * prevW + ox];
      }
    } else A.fill(1);
    pixels = lc.createImageData(rw, rh);
    for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = 255;
    paintRD();
    paintTrace();
  }

  function seedAt(px, py, radius) {
    const gx = clamp(Math.floor(px * rw), 0, rw - 1);
    const gy = clamp(Math.floor(py * rh), 0, rh - 1);
    const rr = radius * radius;
    for (let dy=-radius; dy<=radius; dy++) for(let dx=-radius; dx<=radius; dx++) {
      const d2 = dx*dx + dy*dy;
      if (d2 > rr) continue;
      const x = (gx + dx + rw) % rw;
      const y = (gy + dy + rh) % rh;
      const i = y * rw + x;
      const f = 1 - d2 / rr;
      A[i] = Math.max(.05, A[i] * (1 - .82 * f));
      B[i] = Math.max(B[i], .9 * f);
    }
  }

  function stepRD() {
    const starving = state.activeMs - state.lastMoveActive > 1500;
    const dissipation = starving ? .975 : .9995;
    for (let y=0;y<rh;y++) {
      const u = y > 0 ? y-1 : rh-1;
      const d = y < rh-1 ? y+1 : 0;
      const c0 = y*rw, u0=u*rw, d0=d*rw;
      for (let x=0;x<rw;x++) {
        const l=x>0?x-1:rw-1, r=x<rw-1?x+1:0;
        const i=c0+x, a=A[i], b=B[i];
        const lapA=.2*(A[c0+l]+A[c0+r]+A[u0+x]+A[d0+x])
          +.05*(A[u0+l]+A[u0+r]+A[d0+l]+A[d0+r])-a;
        const lapB=.2*(B[c0+l]+B[c0+r]+B[u0+x]+B[d0+x])
          +.05*(B[u0+l]+B[u0+r]+B[d0+l]+B[d0+r])-b;
        const reaction=a*b*b;
        A2[i]=clamp(a+DA*lapA-reaction+F*(1-a),0,1);
        B2[i]=clamp((b+DB*lapB+reaction-(K+F)*b)*dissipation,0,1);
      }
    }
    [A,A2]=[A2,A];
    [B,B2]=[B2,B];
  }

  function paintRD() {
    const bytes=pixels.data;
    const energy=state.final ? .43 : 1;
    for (let i=0,p=0;i<B.length;i++,p+=4) {
      const z=clamp(B[i]*4.6*energy,0,1);
      const e=z*z*(3-2*z);
      bytes[p]=5+Math.floor(e*88);
      bytes[p+1]=9+Math.floor(e*190);
      bytes[p+2]=20+Math.floor(e*164);
    }
    lc.putImageData(pixels,0,0);
  }

  function addPoint(nx, ny, isNewStroke) {
    const last=state.trail[state.trail.length-1];
    const gap=last ? Math.hypot((nx-last.x)*width,(ny-last.y)*height) : Infinity;
    if (!last || gap > 5 || isNewStroke) {
      state.trail.push({x:nx,y:ny,break:!!isNewStroke || gap > 160});
      if (state.trail.length > MAX_TRAIL) state.trail.splice(0,state.trail.length - MAX_TRAIL);
    }
  }

  function feedFromPointer(event, start) {
    if (state.paused || document.hidden || el.dialog.open || !A) return;
    if (event.target.closest && event.target.closest('button,.actions,.topbar,dialog')) return;
    const nx=clamp(event.clientX/width,0,1),ny=clamp(event.clientY/height,0,1);
    const p=state.pointer;
    const dist=p.set ? Math.hypot((nx-p.x)*width,(ny-p.y)*height) : Infinity;
    if (!start && dist < 2.8) return;
    p.x=nx; p.y=ny; p.set=true;
    const now=state.activeMs;
    state.lastMoveActive=now;
    if (!state.moved) state.moved=true;
    addPoint(nx,ny,start || (!Number.isFinite(dist)));
    seedAt(nx,ny,start ? 8 : 3);
    if (start) seedAt(nx,ny,5);
    el.hint.textContent='당신의 움직임이 이 방을 바꾸고 있습니다.';
  }

  function paintTrace() {
    tc.clearRect(0,0,width,height);
    for(const star of stars) {
      tc.fillStyle=`rgba(174,205,224,${star.a})`;
      tc.fillRect(star.x*width,star.y*height,star.s,star.s);
    }
    const cx=width*.5, cy=height*.5;
    const baseline=Math.min(width,height)*.22;
    tc.beginPath();tc.arc(cx,cy,baseline,0,Math.PI*2);
    tc.strokeStyle='rgba(120,226,220,.035)';tc.lineWidth=1;tc.stroke();
    tc.beginPath();tc.arc(cx,cy,baseline*1.72,0,Math.PI*2);
    tc.strokeStyle='rgba(120,226,220,.016)';tc.stroke();

    if (state.trail.length > 1) {
      const fullAlpha = .11 + state.mirror*.65;
      tc.beginPath();
      state.trail.forEach((p,i)=>{
        if(i===0 || p.break) tc.moveTo(p.x*width,p.y*height);
        else tc.lineTo(p.x*width,p.y*height);
      });
      tc.strokeStyle=`rgba(107,230,224,${fullAlpha})`;
      tc.lineWidth=1.15 + state.mirror*.65;
      tc.lineJoin='round';tc.lineCap='round';tc.stroke();

      const recentStart=Math.max(0,state.trail.length-175);
      tc.beginPath();
      for(let i=recentStart;i<state.trail.length;i++){
        const p=state.trail[i];
        if(i===recentStart || p.break) tc.moveTo(p.x*width,p.y*height);
        else tc.lineTo(p.x*width,p.y*height);
      }
      tc.strokeStyle=`rgba(200,255,245,${.3+state.mirror*.6})`;
      tc.lineWidth=1.7;tc.stroke();

      if(state.mirror>.3){
        for(let i=0;i<state.trail.length;i+=Math.max(4,Math.floor(state.trail.length/180))){
          const p=state.trail[i];
          tc.beginPath();tc.arc(p.x*width,p.y*height,.6+state.mirror*.9,0,Math.PI*2);
          tc.fillStyle=`rgba(213,255,247,${state.mirror*.65})`;tc.fill();
        }
      }
    }
    if(state.pointer.set && !coarsePointer){
      const x=state.pointer.x*width, y=state.pointer.y*height;
      tc.drawImage(glow,x-58,y-58,116,116);
      tc.beginPath();tc.arc(x,y,2,0,Math.PI*2);
      tc.fillStyle='rgba(217,255,249,.9)';tc.fill();
    }
    if(timeline[state.stepIndex]?.kind==='still'){
      const R=Math.min(width,height)*.205;
      tc.beginPath();tc.arc(cx,cy,R,0,Math.PI*2);
      tc.strokeStyle='rgba(132,235,225,.13)';tc.lineWidth=1;tc.stroke();
      tc.beginPath();tc.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(state.stillTime/9000,0,1));
      tc.strokeStyle='rgba(183,255,235,.8)';tc.lineWidth=2;tc.stroke();
    }
    if(state.final){
      const r=2+Math.sin(state.activeMs*.002)*1.5;
      const g=tc.createRadialGradient(cx,cy,0,cx,cy,100);
      g.addColorStop(0,'rgba(222,255,248,.36)');g.addColorStop(1,'rgba(222,255,248,0)');
      tc.fillStyle=g;tc.fillRect(cx-100,cy-100,200,200);
      tc.beginPath();tc.arc(cx,cy,r,0,2*Math.PI);
      tc.fillStyle='#e7fffc';tc.fill();
    }
  }

  function setLine(s) {
    el.line.classList.remove('on');
    void el.line.offsetWidth;
    el.line.textContent=typeof s === 'function' ? s(state) : s;
    el.line.classList.add('on');
  }

  function updateStops() {
    const step=timeline[state.stepIndex];
    stopNodes.forEach((node,i)=>{
      node.classList.toggle('active',i===step.act);
      node.classList.toggle('done',i<step.act);
    });
    el.actIndex.textContent=String(step.act+1).padStart(2,'0');
    el.actName.textContent=ACTS[step.act];
  }

  function enterStep(index) {
    state.stepIndex=clamp(index,0,timeline.length-1);
    state.stepTime=0;
    const step=timeline[state.stepIndex];
    state.final=step.kind==='final';
    document.body.classList.toggle('is-final',state.final);
    setLine(step.text);
    el.detail.textContent=step.note ? (typeof step.note === 'function' ? step.note(state) : step.note) : '';
    el.stillCard.hidden=step.kind!=='still';
    el.metrics.hidden=step.kind!=='metrics';
    if(step.kind==='still') {
      state.lastMoveActive=state.activeMs;
      state.stillTime=0;
      state.stillOK=false;
    }
    if(step.act>=4) el.hint.textContent='당신이 남긴 자리를 바라봐 주세요.';
    else if(step.kind==='move') el.hint.textContent='화면을 움직여 시작하세요';
    else if(step.kind==='still') el.hint.textContent='9초간 손을 움직이지 마세요';
    else el.hint.textContent=state.moved ? '움직임에 따라 생명 패턴이 변합니다.' : '화면을 움직여 작은 생명을 깨워 주세요';
    if(state.final) {el.hint.textContent='다시 시작하거나 지금의 거울을 저장하세요';}
    updateStops();
    updateProgress();
  }

  function advanceStep() {
    if(state.stepIndex<timeline.length-1) enterStep(state.stepIndex+1);
  }

  function nextChapter() {
    if (el.dialog.open) return;
    const currentAct=timeline[state.stepIndex]?.act ?? 0;
    if(currentAct>=ACTS.length-1){enterStep(timeline.length-1);return;}
    if(timeline[state.stepIndex]?.kind==='still') state.stillOK=false;
    enterStep(firstOfAct[currentAct+1]);
    toast(`${ACTS[currentAct+1]} 장면으로 이동했습니다.`);
  }

  function updateProgress(){
    const step=timeline[state.stepIndex];
    if(!step) return;
    const fraction=step.ms ? clamp(state.stepTime/step.ms,0,1) : 0;
    const percent=(state.stepIndex+fraction) / (timeline.length-1) * 100;
    el.progress.style.width=`${clamp(percent,0,100)}%`;
  }

  function updateStory(dt){
    const step=timeline[state.stepIndex];
    if(!step) return;
    state.stepTime+=dt;
    if(step.kind==='move') {
      if(state.moved && state.stepTime > 300) advanceStep();
    } else if(step.kind==='still') {
      state.stillTime=clamp(state.activeMs-state.lastMoveActive,0,9000);
      const f=state.stillTime/9000;
      el.stillProgress.style.strokeDashoffset=String(320.44*(1-f));
      el.stillSeconds.textContent=String(Math.max(0,Math.ceil((9000-state.stillTime)/1000)));
      if(state.stillTime>=9000){state.stillOK=true;advanceStep();}
      else if(state.stepTime>=50000){state.stillOK=false;advanceStep();}
    } else if(step.kind!=='final' && step.ms && state.stepTime>=step.ms){
      advanceStep();
    }
    const targetMirror=step.act>=4 ? 1 : (step.act===3 && state.stillOK ? .65 : 0);
    state.mirror+=clamp((targetMirror-state.mirror)*dt/1800,-.06,.06);
    updateProgress();
  }

  function updateMetrics() {
    if(el.metrics.hidden) return;
    // These are illustrative calculations, not the user's physiological readings.
    const seconds=state.activeMs/1000;
    el.heart.textContent=format(seconds*72/60);
    el.earth.textContent=format(seconds*29.78);
    el.light.textContent=format(seconds*299792.458);
    el.cells.textContent='측정하지 않음';
  }

  let rafId=null, lastFrame=0, simTime=0, toastTimer=0;
  function run(now) {
    rafId=null;
    if(state.paused || document.hidden) return;
    const dt=clamp(now-lastFrame,0,90);
    lastFrame=now;
    state.activeMs+=dt;
    updateStory(dt);
    simTime+=dt;
    const cadence=reducedMotion ? 100 : (coarsePointer ? 48 : 33);
    if(simTime>=cadence){
      simTime%=cadence;
      if(state.moved){
        stepRD();
        if(!coarsePointer && !reducedMotion) stepRD();
      }
      paintRD();
      paintTrace();
      updateMetrics();
    }
    rafId=requestAnimationFrame(run);
  }
  function startLoop(){
    if(rafId===null && !document.hidden && !state.paused){
      lastFrame=performance.now();
      rafId=requestAnimationFrame(run);
    }
  }
  function stopLoop(){if(rafId!==null){cancelAnimationFrame(rafId);rafId=null;}}
  function setPaused(paused){
    state.paused=!!paused;
    if(state.paused){stopLoop();el.pause.innerHTML='<span aria-hidden="true">▶</span><span class="btn-text">계속하기</span>';el.pause.setAttribute('aria-label','계속하기');el.status.textContent='일시정지';}
    else {el.pause.innerHTML='<span aria-hidden="true">Ⅱ</span><span class="btn-text">일시정지</span>';el.pause.setAttribute('aria-label','일시정지');el.status.textContent='관찰 중';startLoop();}
  }
  function resetExperience() {
    state.activeMs=0;state.moved=false;state.pointer={x:.5,y:.5,set:false,id:null};
    state.trail.length=0;state.lastMoveActive=0;state.stillTime=0;state.stillOK=false;
    state.mirror=0;state.final=false;state.stepTime=0;
    A.fill(1);B.fill(0);A2.fill(0);B2.fill(0);simTime=0;
    enterStep(0);
    paintRD();paintTrace();
    setPaused(false);
    toast('새로운 거울이 열렸습니다.');
  }

  function toast(message) {
    clearTimeout(toastTimer);
    el.toast.textContent=message;
    el.toast.classList.add('on');
    toastTimer=setTimeout(()=>el.toast.classList.remove('on'),3000);
  }

  function showHelp(){
    state.dialogWasPaused=state.paused;
    setPaused(true);
    if(typeof el.dialog.showModal==='function') el.dialog.showModal();
    else el.dialog.setAttribute('open','');
  }
  function closeHelp(){
    if(typeof el.dialog.close==='function') el.dialog.close();
    else el.dialog.removeAttribute('open');
    if(!state.dialogWasPaused) setPaused(false);
    el.help.focus();
  }

  function eraseVisits() {
    let erased=false;
    try {
      localStorage.removeItem(persistKey);
      localStorage.removeItem(oldPersistKey);
      erased=true;
    } catch (_) { /* still usable in private mode */ }
    state.visitCount=1;
    el.visitInfo.textContent=erased ? '방문 기록 삭제됨' : '로컬 저장 불가';
    el.session.textContent='SESSION —';
    toast(erased ? '이 브라우저의 방문 기록을 삭제했습니다.' : '브라우저가 저장소 접근을 허용하지 않습니다.');
  }

  function saveImage(){
    try {
      const ratio=Math.min(2,1600/width,1200/height);
      const image=document.createElement('canvas');
      image.width=Math.round(width*ratio);image.height=Math.round(height*ratio);
      const c=image.getContext('2d');
      if(!c) throw Error('Canvas 2D가 지원되지 않습니다.');
      c.scale(ratio,ratio);
      c.fillStyle='#050812';c.fillRect(0,0,width,height);
      c.imageSmoothingEnabled=true;
      c.drawImage(lifeCanvas,0,0,width,height);
      const g=c.createRadialGradient(width/2,height/2,0,width/2,height/2,Math.max(width,height)*.7);
      g.addColorStop(0,'rgba(1,4,12,.04)');g.addColorStop(1,'rgba(1,4,12,.65)');
      c.fillStyle=g;c.fillRect(0,0,width,height);
      c.drawImage(traceCanvas,0,0,width,height);
      c.fillStyle='rgba(224,255,246,.9)';
      c.font='15px Georgia, serif';c.fillText('M I R R O R  /  거울',25,35);
      c.font='12px Georgia, serif';c.fillStyle='rgba(173,211,210,.7)';
      c.fillText(`ONE MOMENT · ${state.trail.length}개의 움직임 기록점`,25,height-28);
      const name='MIRROR_내가_남긴_궤적.png';
      const downloadBlob=(blob)=>{
        if(!blob) throw Error('PNG 생성에 실패했습니다.');
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=name;
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        toast('현재의 거울을 PNG로 저장했습니다.');
      };
      if(image.toBlob) image.toBlob(blob=>{if(blob) downloadBlob(blob); else toast('이미지 저장에 실패했습니다.');},'image/png');
      else {
        const a=document.createElement('a');a.href=image.toDataURL('image/png');a.download=name;
        document.body.appendChild(a);a.click();a.remove();
        toast('현재의 거울을 PNG로 저장했습니다.');
      }
    } catch(e) {toast(`이미지를 저장할 수 없습니다: ${e.message}`);}
  }

  let resizeId=null;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeId);
    resizeId=setTimeout(resize,170);
  },{passive:true});
  window.addEventListener('pointermove',e=>feedFromPointer(e,false),{passive:true});
  lifeCanvas.addEventListener('pointerdown',e=>feedFromPointer(e,true),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) stopLoop();
    else if(!state.paused) startLoop();
  });
  el.pause.addEventListener('click',()=>setPaused(!state.paused));
  el.next.addEventListener('click',nextChapter);
  el.restart.addEventListener('click',resetExperience);
  el.save.addEventListener('click',saveImage);
  el.help.addEventListener('click',showHelp);
  el.closeHelp.addEventListener('click',closeHelp);
  el.doneHelp.addEventListener('click',closeHelp);
  el.erase.addEventListener('click',eraseVisits);
  el.dialog.addEventListener('click',e=>{if(e.target===el.dialog) closeHelp();});
  el.dialog.addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
  window.addEventListener('keydown',e=>{
    if(el.dialog.open || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(e.target.tagName)) return;
    const key=e.key.toLowerCase();
    if(key===' '){e.preventDefault();setPaused(!state.paused);}
    else if(key==='n'){e.preventDefault();nextChapter();}
    else if(key==='?'){e.preventDefault();showHelp();}
    else if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
      e.preventDefault();
      const p=state.pointer;
      const sx=p.set ? p.x : .5, sy=p.set ? p.y : .5;
      const dx=key==='arrowleft'?-.035:key==='arrowright'?.035:0;
      const dy=key==='arrowup'?-.045:key==='arrowdown'?.045:0;
      feedFromPointer({clientX:clamp(sx+dx,.03,.97)*width,
        clientY:clamp(sy+dy,.03,.97)*height,target:lifeCanvas},!p.set);
    }
  });

  resize();
  enterStep(0);
  startLoop();
})();
