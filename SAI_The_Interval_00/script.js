/* 사이 · THE INTERVAL | GitHub Pages / offline / no tracking */
(() => {
  'use strict';
  const doc = document;
  const $ = id => doc.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const svgNS = 'http://www.w3.org/2000/svg';
  const reduceMotionMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const themeNames = { dawn: 'DAWN', day: 'DAYLIGHT', dusk: 'DUSK', night: 'NIGHT' };
  const CHAPTERS = ['landing', 'breath', 'thought', 'time', 'others', 'self', 'return'];
  const KEYS = {
    pref: 'sai.memory-enabled.v2', visits: 'sai.visits.v2', stars: 'sai.stars.v2',
    oldVisits: 'sai_visits', oldStars: 'sai_stars', oldFirst: 'sai_first'
  };
  const storage = (() => {
    try {
      const probe = '__sai_storage_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch (_) { return null; }
  })();
  let motionEnabled = !reduceMotionMQ.matches;
  let manualMotionPreference = false;
  let theme = 'night';
  let currentChapter = 'landing';
  let lastScroll = window.scrollY || 0;
  let travelPx = 0;
  let raf = 0;
  let frameStart = 0;
  let breathMs = 0;
  let breathPaused = false;
  let breathTick = performance.now();
  let audioCtx = null;
  let masterGain = null;
  let audioOn = false;
  let suspendHandle = null;
  let toastHandle = null;
  let activeMsTotal = 0;
  let activeStart = performance.now();
  let lastPoemText = '';
  let lastSavedPoem = '';
  let lastCompletedStar = null;
  const visibility = () => doc.visibilityState === 'visible';
  const sessionMs = () => activeMsTotal + (visibility() ? Math.max(0, performance.now() - activeStart) : 0);
  const fmtTime = seconds => {
    seconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const secs = seconds % 60;
    return hours ? `${hours}시간 ${minutes}분 ${secs}초` : minutes ? `${minutes}분 ${secs}초` : `${secs}초`;
  };
  const showToast = message => {
    const target = $('toast');
    clearTimeout(toastHandle);
    target.textContent = message;
    target.classList.add('shown');
    toastHandle = setTimeout(() => target.classList.remove('shown'), 3300);
  };

  // Each star is a normalized coordinate; prevent invalid or unbounded old storage from breaking layout.
  const safeStars = source => Array.isArray(source)
    ? source.slice(-60).filter(s => s && Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.y)))
      .map(s => ({ x: clamp(Number(s.x), 6, 94), y: clamp(Number(s.y), 6, 94) }))
    : [];
  const readStars = raw => {
    if (!raw || raw.length > 200000) return [];
    try { return safeStars(JSON.parse(raw)); } catch (_) { return []; }
  };
  function makeStar(index) {
    // Golden-angle distribution: older stars stay fixed while each new visit expands the constellation.
    const angle = index * 2.399963229728653 + 0.48;
    const radius = 13 + (index * 19.3 % 29);
    return {
      x: clamp(50 + Math.cos(angle) * radius, 9, 91),
      y: clamp(50 + Math.sin(angle) * radius, 9, 91)
    };
  }
  let memoryEnabled = Boolean(storage) && storage.getItem(KEYS.pref) !== 'off';
  let visits = 1;
  let stars = [];
  function removeVisitRecords() {
    if (!storage) return;
    [KEYS.visits, KEYS.stars, KEYS.oldVisits, KEYS.oldStars, KEYS.oldFirst].forEach(key => {
      try { storage.removeItem(key); } catch (_) {}
    });
  }
  function saveVisits() {
    if (!storage || !memoryEnabled) return false;
    try {
      storage.setItem(KEYS.visits, String(visits));
      storage.setItem(KEYS.stars, JSON.stringify(stars));
      return true;
    } catch (_) { return false; }
  }
  function initMemory() {
    if (!storage || !memoryEnabled) { visits = 1; stars = [makeStar(1)]; return; }
    const visitsRaw = storage.getItem(KEYS.visits) ?? storage.getItem(KEYS.oldVisits);
    const numericVisits = Number.parseInt(visitsRaw || '0', 10);
    visits = Number.isFinite(numericVisits) ? clamp(numericVisits + 1, 1, 999999) : 1;
    const legacyOrNew = storage.getItem(KEYS.stars) ?? storage.getItem(KEYS.oldStars);
    stars = readStars(legacyOrNew);
    stars.push(makeStar(visits));
    stars = stars.slice(-60);
    lastCompletedStar = stars[stars.length - 1];
    if (!saveVisits()) {
      memoryEnabled = false;
      showToast('브라우저가 기록 저장을 허용하지 않아 이번 방문에만 별이 남습니다.');
    }
  }
  initMemory();

  function refreshVisitDisplay() {
    $('visit-count').textContent = String(visits);
    $('star-count').textContent = String(stars.length);
    $('memory-visits').textContent = String(visits);
    $('memory-stars').textContent = String(stars.length);
    $('remember-toggle').textContent = memoryEnabled ? '앞으로 기억하지 않기' : '이 브라우저에 기록하기';
    const noSave = !storage ? '이 환경에서는 브라우저 저장소를 사용할 수 없습니다. 현재 화면에서만 별이 보입니다.' :
      memoryEnabled ? '별은 이 브라우저에만 보관됩니다. 다른 사람이나 기기로 전송되지 않습니다.' :
      '기억 저장이 꺼져 있습니다. 이번 방문에 만든 별만 화면에 표시됩니다.';
    $('storage-note').textContent = noSave;
    $('memory-status').textContent = noSave;
    $('remember-toggle').disabled = !storage;
    $('memory-reset').disabled = !storage;
    renderConstellation();
  }

  function setMemoryEnabled(enabled) {
    if (!storage) return showToast('현재 브라우저에서는 로컬 저장소를 사용할 수 없습니다.');
    memoryEnabled = enabled;
    try { storage.setItem(KEYS.pref, enabled ? 'on' : 'off'); }
    catch (_) { memoryEnabled = false; }
    if (!enabled) {
      removeVisitRecords();
      visits = 1;
      stars = [makeStar(1)];
      showToast('기존 별자리를 지웠습니다. 앞으로 이 브라우저에 방문 기록을 남기지 않습니다.');
    } else {
      visits = 1;
      stars = [makeStar(1)];
      saveVisits();
      showToast('이번 방문부터 다시 별자리를 기록합니다.');
    }
    refreshVisitDisplay();
  }
  $('remember-toggle').addEventListener('click', () => setMemoryEnabled(!memoryEnabled));
  $('memory-reset').addEventListener('click', () => {
    removeVisitRecords();
    visits = 1;
    stars = [makeStar(1)]; // This session's star is ephemeral until the next actual page visit.
    refreshVisitDisplay();
    showToast('지난 방문 기록을 지웠습니다. 이번 방문의 별만 화면에 남아 있습니다.');
    $('memory-status').textContent = '기록을 지웠습니다. 다음에 페이지를 열면 새 기록이 시작됩니다.';
  });
  const dialog = $('memory-dialog');
  $('memory-open').addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  $('memory-close').addEventListener('click', () => {
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
  });
  dialog.addEventListener('click', e => { if (e.target === dialog && typeof dialog.close === 'function') dialog.close(); });

  // Constellation: the tiny dim field is atmosphere; only bright stars represent stored visits.
  const makeSvg = (tag, attrs) => {
    const el = doc.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  };
  function renderConstellation() {
    const guides = $('guide-stars');
    const lines = $('constellation-lines');
    const points = $('constellation-stars');
    guides.replaceChildren(); lines.replaceChildren(); points.replaceChildren();
    for (let i = 0; i < 34; i++) {
      const a = i * 2.399963 + 0.9;
      const r = 12 + (i * 13.18 % 34);
      guides.appendChild(makeSvg('circle', {
        cx: 50 + Math.cos(a) * r, cy: 50 + Math.sin(a) * r,
        r: i % 5 === 0 ? .37 : .19, class: 'guide-star'
      }));
    }
    stars.forEach((s, i) => {
      if (i > 0) {
        const old = stars[i-1];
        if (Math.hypot(old.x-s.x, old.y-s.y) < 63)
          lines.appendChild(makeSvg('line', {x1:old.x,y1:old.y,x2:s.x,y2:s.y,class:'star-line'}));
      }
      points.appendChild(makeSvg('circle', {cx:s.x, cy:s.y,
        r:i===stars.length-1?1.05:.62, class:i===stars.length-1?'star-point latest':'star-point'}));
    });
    $('constellation').setAttribute('aria-label', `이 브라우저에 남은 방문 별 ${stars.length}개`);
  }
  refreshVisitDisplay();

  // Theme changes by the visitor's local clock. No geolocation or network requests.
  function setTheme() {
    const h = new Date().getHours();
    const selected = h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'dusk' : 'night';
    if (selected === theme) return;
    theme = selected;
    doc.body.classList.remove('dawn','day','dusk','night');
    doc.body.classList.add(theme);
    $('poem-era').textContent = `${themeNames[theme]} · 07`;
  }
  setTheme();
  setInterval(() => { if (visibility()) setTheme(); }, 300000);

  // Background particle field. A single capped frame loop avoids battery-hungry animations.
  const canvas = $('universe');
  const ctx = canvas.getContext('2d', { alpha:true });
  const pointer = {x:-1000,y:-1000};
  const sky = Array.from({length:112}, (_, i) => ({
    x: (Math.sin(i*117.113)*44712.37 % 1 + 1)%1,
    y: (Math.sin(i*86.733+1.7)*47819.17 % 1 + 1)%1,
    r: i%9===0?1.38:.35+(i*13%9)*.085,
    tw: i * 1.618, speed:.14+(i%7)*.071, depth:.38+(i%4)*.16
  }));
  let W = innerWidth, H = innerHeight, dpr = 1;
  function resizeCanvas() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(3600000/(W*H)));
    dpr = Math.max(.65,dpr);
    canvas.width = Math.round(W*dpr);
    canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawSky(performance.now(), false);
  }
  function drawSky(now, animated) {
    if (!ctx) return;
    ctx.clearRect(0,0,W,H);
    const t = animated ? now*.001 : 0;
    const px = pointer.x<0?0:(pointer.x/W-.5)*13;
    const py = pointer.y<0?0:(pointer.y/H-.5)*13;
    for (const s of sky) {
      const x = s.x*W + px*s.depth + Math.sin(t*.16+s.tw)*s.depth*2;
      const y = s.y*H + py*s.depth + Math.cos(t*.13+s.tw)*s.depth*2;
      const a = animated ? .35+.26*Math.sin(t*s.speed+s.tw) : .43;
      ctx.beginPath(); ctx.arc(x,y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(218,226,255,${clamp(a,.09,.71)})`; ctx.fill();
      if (s.r>1.1) {
        const g = ctx.createRadialGradient(x,y,0,x,y,12);
        g.addColorStop(0,'rgba(174,191,255,.14)');g.addColorStop(1,'rgba(174,191,255,0)');
        ctx.fillStyle=g;ctx.fillRect(x-12,y-12,24,24);
      }
    }
    // Floating rings connect the seven sections without covering the text.
    const centerX=W*.5,centerY=H*.48;
    const ringR=Math.min(W,H)*.34;
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(centerX,centerY,ringR*(1+i*.27),ringR*(.25+i*.15),-.32,0,Math.PI*2);
      ctx.strokeStyle=`rgba(157,175,245,${.018+i*.007})`;
      ctx.lineWidth=.8; ctx.stroke();
    }
  }
  function loop(now) {
    raf=0;
    if (!motionEnabled || !visibility()) return;
    if (now-frameStart>=1000/30) {
      frameStart=now;
      drawSky(now,true);
    }
    raf=requestAnimationFrame(loop);
  }
  function scheduleLoop() {
    if (!raf && motionEnabled && visibility()) {
      frameStart=0;
      raf=requestAnimationFrame(loop);
    }
  }
  function setMotion(enabled, userInitiated=false) {
    motionEnabled = enabled;
    if(userInitiated) manualMotionPreference=true;
    doc.body.classList.toggle('motion-on',enabled);
    doc.body.classList.toggle('motion-off',!enabled);
    $('motion-toggle').setAttribute('aria-pressed',String(!enabled));
    $('motion-toggle').setAttribute('aria-label',enabled?'움직임 멈추기':'움직임 다시 시작');
    $('motion-toggle').title=enabled?'별과 장식의 움직임 멈추기':'별과 장식의 움직임 다시 시작하기';
    if (!enabled) {
      cancelAnimationFrame(raf); raf=0; drawSky(0,false);
      doc.querySelectorAll('.thought-word').forEach(w=>w.remove());
      $('breath-orb').style.transform='scale(1)';
    } else scheduleLoop();
    updateBreathDisplay();
  }
  $('motion-toggle').addEventListener('click',()=>setMotion(!motionEnabled,true));
  const onReduceChange = e => { if(!manualMotionPreference) setMotion(!e.matches); };
  if (reduceMotionMQ.addEventListener) reduceMotionMQ.addEventListener('change',onReduceChange);
  window.addEventListener('pointermove',e => {pointer.x=e.clientX;pointer.y=e.clientY;}, {passive:true});
  window.addEventListener('pointerleave',()=>{pointer.x=-1000;pointer.y=-1000;},{passive:true});
  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{resizeCanvas();updateSectionPosition();},110);
  },{passive:true});
  resizeCanvas();
  setMotion(motionEnabled);

  // Reveal content only after JS and IntersectionObserver are known to work.
  if ('IntersectionObserver' in window) {
    doc.documentElement.classList.add('js');
    const seen = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const items = entry.target.querySelectorAll('.reveal');
        items.forEach((el,i) => {
          el.style.transitionDelay = motionEnabled ? `${Math.min(i,9)*90}ms` : '0ms';
          el.classList.add('is-visible');
        });
        seen.unobserve(entry.target);
      });
    }, {threshold:0,rootMargin:'0px 0px -8% 0px'});
    CHAPTERS.forEach(id=>seen.observe($(id)));
  }

  function updateSectionPosition() {
    const viewportCenter=innerHeight*.5;
    let best='landing',bestDist=Infinity;
    for(const id of CHAPTERS) {
      const r=$(id).getBoundingClientRect();
      const distance = r.top<=viewportCenter && r.bottom>=viewportCenter
        ? 0 : Math.min(Math.abs(r.top-viewportCenter),Math.abs(r.bottom-viewportCenter));
      if(distance<bestDist) {bestDist=distance;best=id;}
    }
    if(best!==currentChapter) {
      $(currentChapter).classList.remove('is-current');
      currentChapter=best;
      $(best).classList.add('is-current');
      if(best==='return') updatePoem();
    }
    doc.querySelectorAll('.chapter-nav a').forEach(link=>{
      if(link.dataset.chapter===best) link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
    const root=doc.documentElement;
    const max=Math.max(1,root.scrollHeight-innerHeight);
    $('progress-bar').style.width=`${clamp(window.scrollY/max*100,0,100)}%`;
  }
  let scrollRaf=0;
  window.addEventListener('scroll',()=>{
    const value=window.scrollY;
    travelPx += Math.abs(value-lastScroll);
    lastScroll=value;
    if(!scrollRaf)scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;updateSectionPosition();});
  },{passive:true});
  updateSectionPosition();

  // Thought objects are created only while their chapter is visible and animated.
  const thoughtWords=['기억','그리움','기대','어제','내일','이름','왜','아마도','언젠가','다시','아직','평온','가능성'];
  let thoughtIndex=0;
  setInterval(()=>{
    if (!visibility() || !motionEnabled || currentChapter!=='thought') return;
    const field=$('thought-field');
    if(field.childElementCount>=9) return;
    const word=doc.createElement('span');
    word.className='thought-word';
    word.textContent=thoughtWords[thoughtIndex++%thoughtWords.length];
    const x=thoughtIndex%2 ? 4+Math.random()*19 : 78+Math.random()*17;
    word.style.left=x+'%';
    word.style.top=15+Math.random()*70+'%';
    word.addEventListener('animationend',()=>word.remove(),{once:true});
    field.appendChild(word);
  },1350);

  // Active foreground time, not wall-clock time, so background tabs do not inflate the experience.
  function updateBreathDisplay() {
    const breathing=motionEnabled&&!breathPaused;
    const phaseMs=breathMs%8000;
    $('breath-phase').textContent=!breathing?'안내 정지':phaseMs<4000?'들이쉬기':'내쉬기';
    $('breath-progress').textContent=String(Math.floor(phaseMs/1000)+1).padStart(2,'0')+' / 08';
    $('breath-orb').style.transform=breathing?`scale(${(1+.21*-Math.cos(phaseMs/8000*Math.PI*2)).toFixed(4)})`:'scale(1)';
  }
  $('breath-toggle').addEventListener('click',()=>{
    breathPaused=!breathPaused;
    $('breath-toggle').setAttribute('aria-pressed',String(breathPaused));
    $('breath-toggle').textContent=breathPaused?'호흡 안내 다시 시작':'호흡 안내 잠시 멈추기';
    updateBreathDisplay();
  });
  function metrics() {
    const now=performance.now();
    let delta=Math.max(0,Math.min(400,now-breathTick));
    breathTick=now;
    if(visibility() && !breathPaused && motionEnabled && currentChapter==='breath') breathMs=(breathMs+delta)%8000;
    updateBreathDisplay();
    const seconds=sessionMs()/1000;
    const min=Math.floor(seconds/60), sec=Math.floor(seconds%60);
    $('minutes').textContent=String(min).padStart(2,'0');
    $('seconds').textContent=String(sec).padStart(2,'0');
    $('breath-count').textContent=String(Math.floor(seconds/8));
    $('final-time').textContent=fmtTime(seconds);
    $('final-scroll').textContent=(travelPx/Math.max(1,innerHeight)).toFixed(1);
    if(currentChapter==='return' && Math.floor(seconds)%15===0) updatePoem();
  }
  setInterval(metrics,120);
  metrics();

  function updatePoem() {
    const elapsed=Math.floor(sessionMs()/1000);
    const traveled=travelPx/Math.max(1,innerHeight);
    const firstLine={
      dawn:'아직 이름 붙이지 않은 새벽이 열리고,',
      day:'가장 밝은 시간에도 보이지 않는 별이 있고,',
      dusk:'빛이 물러나는 자리마다 색이 남고,',
      night:'어둠은 사라진 것이 아니라 쉬고 있는 빛이고,'
    }[theme];
    const second=elapsed<90?'잠깐 멈춘 시간에도 세계는 흘렀습니다.':
      elapsed<300?'천천히 머문 시간이 고요를 길게 만들었습니다.':'오래 머문 침묵에도 저마다의 결이 생겼습니다.';
    const third=traveled<2?'어쩌면 움직이지 않아도 건널 수 있는 곳이 있고,':
      traveled<7?'당신은 여러 장의 하늘을 조용히 건넜고,':'당신은 많은 간격을 건너 다시 자신에게 돌아왔고,';
    const fourth=visits===1?'처음 도착한 별 하나가 당신을 기다립니다.':
      `당신이 돌아온 하늘에는 ${stars.length}개의 별이 남아 있습니다.`;
    const lines=[firstLine,second,third,fourth,'그 모든 사이에, 지금의 당신이 있습니다.'];
    lastPoemText=lines.join('\n');
    $('personal-poem').textContent=lastPoemText;
    $('poem-era').textContent=`${themeNames[theme]} · 07`;
  }
  function saveBlob(blob,fileName) {
    const url=URL.createObjectURL(blob);
    const a=doc.createElement('a'); a.href=url; a.download=fileName;
    doc.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  $('download-poem').addEventListener('click',()=>{
    updatePoem();
    const content=`사이 · THE INTERVAL\n\n${lastPoemText}\n\n활성 체험 시간: ${fmtTime(sessionMs()/1000)}\n화면 이동 거리: 약 ${(travelPx/Math.max(1,innerHeight)).toFixed(1)}장\n별자리: ${stars.length}개 (현재 브라우저 기준)\n\n※ 호흡 수는 실제 측정이 아닌 8초 예시 주기 환산치입니다.\n※ 모든 기록은 이 기기의 브라우저에서 처리됩니다.\n`;
    lastSavedPoem=content;
    saveBlob(new Blob(['\ufeff',content],{type:'text/plain;charset=utf-8'}),'sai-my-interval-poem.txt');
    showToast('당신의 시를 텍스트 파일로 저장했습니다.');
  });
  $('download-image').addEventListener('click',()=>{
    try {
      updatePoem();
      const picture=doc.createElement('canvas');picture.width=1600;picture.height=900;
      const p=picture.getContext('2d');
      const gradient=p.createRadialGradient(800,385,80,800,450,930);
      gradient.addColorStop(0,'#1a2345');gradient.addColorStop(.6,'#0d142a');gradient.addColorStop(1,'#060914');
      p.fillStyle=gradient;p.fillRect(0,0,1600,900);
      const font="'Noto Serif CJK KR','Noto Serif KR','Nanum Myeongjo','Malgun Gothic',serif";
      p.save();p.translate(1170,418);p.scale(4.5,4.5);
      p.strokeStyle='rgba(170,195,255,.18)';p.lineWidth=.35;
      p.beginPath();p.arc(0,0,54,0,Math.PI*2);p.stroke();
      p.beginPath();p.arc(0,0,41,0,Math.PI*2);p.stroke();
      for(let i=1;i<stars.length;i++){
        const a=stars[i-1],b=stars[i];
        if(Math.hypot(a.x-b.x,a.y-b.y)>=63)continue;
        p.beginPath();p.moveTo(a.x-50,a.y-50);p.lineTo(b.x-50,b.y-50);p.stroke();
      }
      stars.forEach((s,i)=>{
        p.beginPath();p.arc(s.x-50,s.y-50,i===stars.length-1?1.3:.75,0,Math.PI*2);
        p.fillStyle=i===stars.length-1?'#ffffff':'#b6caff';p.shadowColor='#9db7ff';p.shadowBlur=4;p.fill();
      });p.restore();
      p.fillStyle='#b9c9ff';p.font='600 28px sans-serif';p.fillText('THE INTERVAL',120,115);
      p.strokeStyle='rgba(187,199,255,.28)';p.beginPath();p.moveTo(120,148);p.lineTo(1480,148);p.stroke();
      p.fillStyle='#f1f0fa';p.font=`400 90px ${font}`;p.fillText('사 이',120,277);
      p.fillStyle='#c7cce2';p.font=`400 31px ${font}`;
      lastPoemText.split('\n').forEach((line,i)=>p.fillText(line,120,375+i*73,850));
      p.strokeStyle='rgba(187,199,255,.28)';p.beginPath();p.moveTo(120,790);p.lineTo(1480,790);p.stroke();
      p.fillStyle='#8996b7';p.font='22px sans-serif';
      p.fillText(`${themeNames[theme]} · ${fmtTime(sessionMs()/1000)} · ${stars.length} STAR${stars.length===1?'':'S'}`,120,835);
      picture.toBlob(blob=>{
        if(blob){saveBlob(blob,'sai-constellation.png');showToast('별자리 이미지를 PNG로 저장했습니다.');}
        else showToast('이미지를 저장하지 못했습니다.');
      },'image/png');
    } catch(err) { showToast('이미지 저장이 지원되지 않는 브라우저입니다.'); }
  });
  $('restart').addEventListener('click',()=>{
    window.scrollTo({top:0,behavior:motionEnabled?'smooth':'auto'});
    showToast('첫 장으로 돌아갑니다. 별과 방문 횟수는 그대로입니다.');
  });

  // Gentle original synthesized audio; oscillators are made once and the AudioContext is reused.
  async function setupAudio() {
    const AudioClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioClass)throw new Error('no-web-audio');
    if(audioCtx)return;
    audioCtx=new AudioClass();
    masterGain=audioCtx.createGain();
    masterGain.gain.value=0;
    masterGain.connect(audioCtx.destination);
    [110,164.81,220].forEach((frequency,i)=>{
      const osc=audioCtx.createOscillator();osc.type='sine';osc.frequency.value=frequency;
      const gain=audioCtx.createGain();gain.gain.value=[.35,.25,.21][i];
      osc.connect(gain);gain.connect(masterGain);osc.start();
    });
    const lfo=audioCtx.createOscillator();lfo.type='sine';lfo.frequency.value=.12;
    const depth=audioCtx.createGain();depth.gain.value=.006;
    lfo.connect(depth);depth.connect(masterGain.gain);lfo.start();
  }
  async function setAudio(enabled) {
    if(suspendHandle){clearTimeout(suspendHandle);suspendHandle=null;}
    try {
      if(enabled) {
        await setupAudio();
        await audioCtx.resume();
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setTargetAtTime(.036,audioCtx.currentTime,.24);
      } else if(audioCtx) {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setTargetAtTime(0,audioCtx.currentTime,.14);
        suspendHandle=setTimeout(()=>{if(!audioOn&&audioCtx)audioCtx.suspend().catch(()=>{});},530);
      }
      audioOn=enabled;
    } catch(_) {
      audioOn=false;
      showToast('이 환경에서는 소리 재생을 시작할 수 없습니다.');
    }
    $('sound-toggle').setAttribute('aria-pressed',String(audioOn));
    $('sound-toggle').setAttribute('aria-label',audioOn?'소리 끄기':'소리 켜기');
    $('sound-toggle').title=audioOn?'앰비언트 소리 끄기':'앰비언트 소리 켜기';
  }
  $('sound-toggle').addEventListener('click',()=>{setAudio(!audioOn);});
  doc.addEventListener('visibilitychange',()=>{
    if(!visibility()) {
      activeMsTotal+=Math.max(0,performance.now()-activeStart);
      cancelAnimationFrame(raf);raf=0;
      if(audioCtx)audioCtx.suspend().catch(()=>{});
    } else {
      activeStart=performance.now(); breathTick=activeStart;
      scheduleLoop();
      if(audioOn&&audioCtx)audioCtx.resume().catch(()=>{});
    }
  });
  window.addEventListener('pagehide',()=>{
    if(audioCtx)audioCtx.suspend().catch(()=>{});
  });
})();
