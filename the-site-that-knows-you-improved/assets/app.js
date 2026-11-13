(() => {
  'use strict';

  // All session data remains in this tab. No network requests or persistent storage.
  const $ = (selector) => document.querySelector(selector);
  const els = {
    canvas: $('#sky'), surface: $('#surface'), intro: $('#intro'), watch: $('#watch'),
    ending: $('#ending'), start: $('#startBtn'), reveal: $('#revealBtn'),
    restart: $('#restart'), sound: $('#soundBtn'), lang: $('#langBtn'),
    phaseTag: $('#phaseTag'), watchPoem: $('#watchPoem'), watchTime: $('#watchTime'),
    progress: $('#progressBar'), distance: $('#distanceMetric'), zones: $('#zonesMetric'),
    clicks: $('#clicksMetric'), host: $('#portraitHost'), serial: $('#portraitSerial'),
    resultTitle: $('#resultTitle'), resultSubtitle: $('#archetypeKo'),
    resultDescription: $('#resultDescription'), resultNote: $('#resultNote'),
    finalTime: $('#finalTime'), finalTravel: $('#finalTravel'),
    finalClicks: $('#finalClicks'), svg: $('#downloadSvg'), png: $('#downloadPng'),
    announcement: $('#announcement')
  };
  const ctx = els.canvas.getContext('2d', { alpha: true });
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const OBSERVATION_MS = 30000;
  const MAX_PARTICLES = coarsePointer.matches ? 150 : 320;
  const TWO_PI = Math.PI * 2;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const tr = {
    ko: {
      phaseBefore: '아직 시작하지 않은 우주', phaseObserving: '관찰 중 · 당신의 우주', phaseEnd: '완성된 별자리',
      soundOff: '소리 꺼짐', soundOn: '소리 켜짐', eyebrow: 'A SMALL EXPERIMENT IN PRESENCE',
      introLine1: '우리는 아직', introLine2: '만난 적이 없어요.',
      introCopy: '하지만 당신이 남길 아주 작은 움직임으로, 이 순간에만 존재하는 별자리를 그릴 수 있어요.',
      start: '나의 우주 시작하기', introHint: '움직여도, 가만히 있어도 괜찮아요 · 약 30초',
      watchEyebrow: 'THE MOMENT IS UNFOLDING', watchTitle: '당신의 움직임이\n하나의 우주가 됩니다.',
      poem0: '빛은 흔적을 남기고, 고요함은 형태를 만듭니다.',
      poem1: '당신의 작은 선택들이 멀리서 이어지고 있어요.',
      poem2: '움직임도 멈춤도 이 별자리의 일부예요.',
      poem3: '이제 곧, 이 순간의 모양을 보여드릴게요.',
      poemStill: '당신의 고요함도 아름다운 신호예요.',
      observing: 'OBSERVING / 관찰 중', metricTravel: '궤적', metricZones: '탐색', metricClicks: '빛의 파동',
      reveal: '내 별자리 보기', watchHint: '화면을 움직이거나 누르세요. 키보드의 스페이스바도 사용할 수 있어요.',
      portraitLabel: 'A CONSTELLATION OF ONE MOMENT', revealed: 'YOU LEFT A PATTERN IN THE DARK', youAre: '이 순간, 당신은',
      resultTime: '함께 머문 시간', resultPath: '움직인 거리', resultLight: '남긴 파동',
      downloadSVG: 'SVG로 간직하기', downloadPNG: 'PNG 저장', restart: '다시 만날까요?',
      disclaimer: '이 결과는 움직임에서 영감을 얻은 예술적 해석이며, 실제 성격 진단이 아닙니다.',
      privacy: 'PRIVATE BY DESIGN · 서버 전송 없음 · 저장 없음',
      stillNote: '당신이 움직이지 않은 자리에도 하나의 우주가 태어났습니다.',
      note: '같은 움직임이라도 이 순간의 별빛은 다시 만들어지지 않습니다.',
      soundFailed: '이 브라우저에서는 사운드를 재생할 수 없습니다.',
      downloadFailed: 'PNG 생성에 실패했습니다. SVG 저장을 이용해주세요.',
      downloadReady: '파일 다운로드가 시작되었습니다.',
      surfaceLabel: '관찰 영역: 마우스, 터치 또는 스페이스바로 빛을 남깁니다.'
    },
    en: {
      phaseBefore: 'A universe not yet begun', phaseObserving: 'Observing · your universe', phaseEnd: 'A constellation, complete',
      soundOff: 'Sound off', soundOn: 'Sound on', eyebrow: 'A SMALL EXPERIMENT IN PRESENCE',
      introLine1: 'We have never', introLine2: 'met before.',
      introCopy: 'Yet the smallest movements you leave behind can become a constellation that exists only in this moment.',
      start: 'Begin your universe', introHint: 'Move, or remain perfectly still · about 30 seconds',
      watchEyebrow: 'THE MOMENT IS UNFOLDING', watchTitle: 'Your movements are\nbecoming a universe.',
      poem0: 'Light leaves traces. Stillness gives them shape.',
      poem1: 'Your smallest choices are connecting in the dark.',
      poem2: 'Motion and stillness both belong to this sky.',
      poem3: 'Soon, I will show you the shape of this moment.',
      poemStill: 'Your stillness is a beautiful signal, too.',
      observing: 'OBSERVING / LIVE', metricTravel: 'TRAIL', metricZones: 'REGIONS', metricClicks: 'RIPPLES',
      reveal: 'Reveal my sky', watchHint: 'Move or tap the screen. You can also use the Space key.',
      portraitLabel: 'A CONSTELLATION OF ONE MOMENT', revealed: 'YOU LEFT A PATTERN IN THE DARK', youAre: 'In this moment, you are',
      resultTime: 'TIME SHARED', resultPath: 'DISTANCE TRACED', resultLight: 'RIPPLES LEFT',
      downloadSVG: 'Keep as SVG', downloadPNG: 'Save PNG', restart: 'Meet again?',
      disclaimer: 'This is an artistic interpretation of movement, not a scientific personality assessment.',
      privacy: 'PRIVATE BY DESIGN · NO UPLOADS · NO STORAGE',
      stillNote: 'An entire universe was born where you chose not to move.',
      note: 'Even if you retrace your steps, this exact starlight will never return.',
      soundFailed: 'This browser could not play the ambient sound.',
      downloadFailed: 'Could not export PNG. Please try saving the SVG instead.',
      downloadReady: 'Your download has started.',
      surfaceLabel: 'Observation area: move, touch or press Space to leave light behind.'
    }
  };
  const ARCHETYPES = {
    stillness: { en: 'The Stillness', ko: '고요한 우주', color: '#b9d7f2',
      koText: '당신은 공간을 가득 채우기 위해 움직일 필요가 없었어요. 아무런 궤적도 남기지 않았기에, 이 별들은 당신을 중심으로 조용히 모였습니다.',
      enText: 'You did not need to move to fill the space. You left no trail, so the stars gathered quietly around you.' },
    minimalist: { en: 'The Minimalist', ko: '단 하나의 선택', color: '#e1c9ad',
      koText: '단 한 번의 접촉. 그 작은 선언을 중심으로 우주가 다시 배열되었습니다. 적게 남긴 흔적도 깊은 이야기가 됩니다.',
      enText: 'One touch. One small declaration that rearranged the universe. Even the lightest trace can tell a long story.' },
    player: { en: 'The Player', ko: '빛을 깨우는 사람', color: '#f6b9a7',
      koText: '당신은 세상을 여러 번 두드렸어요. 그때마다 파동은 새로운 궤도로 퍼졌고, 이 우주는 조금씩 더 밝아졌습니다.',
      enText: 'You kept knocking on the universe. Each ripple opened another orbit, and the darkness grew brighter.' },
    seeker: { en: 'The Seeker', ko: '경계를 넓히는 사람', color: '#a5e3de',
      koText: '당신은 화면의 여러 곳을 지나왔어요. 떨어진 빛점들이 먼 길을 건너 서로를 찾듯, 당신의 움직임은 낯선 별을 연결했습니다.',
      enText: 'You crossed many regions of this sky. Distant points found one another through the path you chose.' },
    dreamer: { en: 'The Dreamer', ko: '파동의 몽상가', color: '#c2b2f9',
      koText: '당신의 움직임은 직선보다 파동에 가까웠어요. 빠르게 다가갔다 멈추고, 다시 떠오르는 리듬이 별들 사이에 남았습니다.',
      enText: 'Your movements were more wave than line. Rushing forward, resting, and rising again, you left a rhythm among the stars.' },
    philosopher: { en: 'The Philosopher', ko: '천천히 머무는 사람', color: '#cad6f4',
      koText: '당신은 서두르지 않았어요. 이동한 거리보다 머물렀던 순간들이 깊이를 만들고, 그 사이로 별들이 차분하게 정렬되었습니다.',
      enText: 'You did not hurry. The space between movements gave your sky its depth, and the stars aligned softly.' },
    runner: { en: 'The Runner', ko: '빛보다 빠른 걸음', color: '#e7c38f',
      koText: '당신은 망설임보다 움직임을 선택했어요. 짧은 순간에 남긴 긴 궤적이 유성처럼 하늘을 가르고 지나갑니다.',
      enText: 'You chose movement over hesitation. Your long trail carved through a short moment like a meteor.' },
    observer: { en: 'The Observer', ko: '틈을 읽는 사람', color: '#9fcbd8',
      koText: '당신은 여러 번 멈췄어요. 움직임 사이의 쉼표들이 작은 별처럼 남아, 이 초상화에 고유한 박자를 만들었습니다.',
      enText: 'You paused again and again. Those commas between movements became stars, giving this portrait its own rhythm.' },
    homebody: { en: 'The Homebody', ko: '한곳의 별을 지키는 사람', color: '#ded0ba',
      koText: '당신은 멀리 떠나지 않았어요. 익숙한 작은 공간을 여러 번 바라보는 일도 하나의 거대한 궤도를 완성합니다.',
      enText: 'You stayed close to your beginning. Returning to a small familiar place can form an orbit of its own.' },
    witness: { en: 'The Witness', ko: '빛을 지켜본 사람', color: '#c7e2f3',
      koText: '당신은 세상을 누르지 않고 바라보았어요. 손대지 않은 것들 사이에서도 연결은 생겨나고, 관찰은 조용한 흔적이 됩니다.',
      enText: 'You watched without pressing into the world. Even untouched things can connect, and witnessing leaves a quiet trace.' },
    wanderer: { en: 'The Wanderer', ko: '길 없는 여행자', color: '#b0bdf3',
      koText: '당신은 정해진 모양을 따라가지 않았어요. 어디로 향하든 작은 움직임들이 만나 이 순간만의 별자리가 되었습니다.',
      enText: 'You followed no prescribed shape. Wherever you went, small movements met to form a constellation of this moment.' }
  };

  let language = 'ko';
  let reduced = prefersReduced.matches;
  let W = 1, H = 1, dpr = 1;
  let stars = [];
  const particles = [];
  const glowCache = new Map();
  let frameId = 0, lastFrame = 0, lastRender = 0;
  let portraitSvg = null, finalResult = null;
  let audio = null, soundEnabled = false;
  let currentPoem = '';
  let phase = 'intro';
  let elapsedMs = 0;
  let sessionSeed = newSeed();
  let session = freshSession();

  function newSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      const words = new Uint32Array(1);
      window.crypto.getRandomValues(words);
      return words[0] || 1;
    }
    return (Math.random() * 4294967295) >>> 0 || 1;
  }
  function freshSession() {
    return {
      clicks: 0, trail: 0, zones: new Set(), path: [], speeds: [],
      directionChanges: 0, lastAngle: null, previous: null, lastPathAt: -10000,
      lastMoveAt: null, pauseStart: null, pauses: [], lastEmission: 0,
      pointerX: .5, pointerY: .5, moved: false
    };
  }
  function t(key) { return tr[language][key]; }
  function announce(message) { els.announcement.textContent = message; }
  function updateLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (tr[language][key] !== undefined) node.textContent = tr[language][key];
    });
    els.lang.textContent = language === 'ko' ? 'EN' : '한국어';
    els.lang.setAttribute('aria-label', language === 'ko' ? 'Switch language to English' : '언어를 한국어로 바꾸기');
    els.sound.dataset.i18n = soundEnabled ? 'soundOn' : 'soundOff';
    els.sound.textContent = t(soundEnabled ? 'soundOn' : 'soundOff');
    els.sound.setAttribute('aria-label', t(soundEnabled ? 'soundOff' : 'soundOn'));
    els.sound.setAttribute('aria-pressed', String(soundEnabled));
    els.surface.setAttribute('aria-label', t('surfaceLabel'));
    updatePhaseTag();
    if (phase === 'observing') updatePoem(true);
    if (phase === 'ending' && finalResult) renderResultCopy(finalResult);
  }
  function updatePhaseTag() {
    els.phaseTag.querySelector('[data-i18n]').textContent = t(phase === 'intro' ? 'phaseBefore' : phase === 'observing' ? 'phaseObserving' : 'phaseEnd');
  }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.5 : 1.75);
    els.canvas.width = Math.max(1, Math.round(W * dpr));
    els.canvas.height = Math.max(1, Math.round(H * dpr));
    els.canvas.style.width = `${W}px`;
    els.canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(coarsePointer.matches ? 110 : 200, Math.floor(W * H / 9000) + 40);
    stars = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), r: .28 + Math.random() * 1.15,
      phase: Math.random() * TWO_PI, speed: .18 + Math.random() * .6,
      base: .12 + Math.random() * .46, tint: Math.random() < .12 ? 'warm' : 'cold'
    }));
  }
  function sprite(kind) {
    if (glowCache.has(kind)) return glowCache.get(kind);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const colors = { blue: [191, 225, 255], gold: [255, 212, 171], violet: [205, 180, 255] };
    const [r, gr, b] = colors[kind] || colors.blue;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    grad.addColorStop(.14, `rgba(${r},${gr},${b},.62)`);
    grad.addColorStop(.4, `rgba(${r},${gr},${b},.14)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    glowCache.set(kind, c);
    return c;
  }
  function glow(kind, x, y, size, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite(kind), x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }
  function emit(x, y, burst = false) {
    const amount = burst ? (coarsePointer.matches ? 15 : 25) : (coarsePointer.matches ? 1 : 2);
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * TWO_PI;
      const velocity = burst ? 55 + Math.random() * 135 : 12 + Math.random() * 35;
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        size: burst ? 19 + Math.random() * 18 : 10 + Math.random() * 13,
        kind: burst ? (Math.random() > .28 ? 'gold' : 'violet') : 'blue',
        life: 1, ttl: burst ? .8 + Math.random() * .65 : .45 + Math.random() * .3 });
    }
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
  }
  function draw(now, dt) {
    ctx.clearRect(0, 0, W, H);
    const clock = reduced ? 0 : now * .001;
    const ox = W / 2, oy = H / 2;
    const centerR = clamp(Math.min(W, H) * .18, 60, 190);
    ctx.strokeStyle = 'rgba(163,191,244,.085)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, oy, centerR * 1.35, 0, TWO_PI); ctx.stroke();
    if (phase === 'observing') {
      ctx.strokeStyle = 'rgba(172,197,242,.14)';
      ctx.setLineDash([2, 10]);
      ctx.beginPath(); ctx.arc(ox, oy, centerR * 1.72, clock * .05, clock * .05 + TWO_PI); ctx.stroke();
      ctx.setLineDash([]);
      glow('blue', ox, oy, 170 + Math.sin(clock * .75) * 14, .22);
    } else if (phase === 'intro') {
      glow('blue', ox, oy, 180 + Math.sin(clock * .5) * 13, .12);
    }
    for (const s of stars) {
      const alpha = s.base * (reduced ? .85 : .64 + .36 * Math.sin(clock * s.speed + s.phase));
      ctx.fillStyle = s.tint === 'warm' ? `rgba(244,215,190,${alpha})` : `rgba(203,221,249,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TWO_PI); ctx.fill();
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!reduced) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.92, dt * 60); p.vy *= Math.pow(.92, dt * 60); }
      p.life -= dt / p.ttl;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      glow(p.kind, p.x, p.y, p.size * (.6 + p.life * .8), Math.pow(p.life, 1.3) * .86);
    }
    if (phase === 'observing' && session.previous && !reduced) {
      glow('blue', session.pointerX * W, session.pointerY * H, 95, .3);
    }
  }
  function animationLoop(now) {
    frameId = requestAnimationFrame(animationLoop);
    const interval = reduced ? 125 : coarsePointer.matches ? 33 : 16;
    if (now - lastRender < interval) return;
    const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0, .20) : 0;
    lastFrame = now; lastRender = now;
    if (phase === 'observing') {
      elapsedMs += dt * 1000;
      checkPause();
      updateHUD();
      updatePoem();
      if (elapsedMs >= OBSERVATION_MS) reveal();
    }
    draw(now, dt);
  }
  function resumeAnimation() {
    if (frameId || document.hidden) return;
    lastFrame = 0; lastRender = 0;
    frameId = requestAnimationFrame(animationLoop);
  }
  function stopAnimation() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0; lastFrame = 0;
  }

  function recordPoint(x, y, fromMove) {
    if (phase !== 'observing') return;
    const nx = clamp(x / W, 0, 1), ny = clamp(y / H, 0, 1);
    const px = nx * W, py = ny * H;
    const zone = `${Math.min(4, Math.floor(nx * 5))},${Math.min(3, Math.floor(ny * 4))}`;
    session.zones.add(zone);
    session.pointerX = nx; session.pointerY = ny;
    const prev = session.previous;
    if (prev && fromMove) {
      const dx = px - prev.x, dy = py - prev.y;
      const delta = Math.hypot(dx, dy);
      const normalized = Math.hypot(dx / W, dy / H);
      if (delta > 2.3 && normalized < .7) {
        session.trail += normalized;
        session.moved = true;
        const dtMs = elapsedMs - prev.t;
        if (dtMs >= 12 && dtMs < 550) {
          session.speeds.push(normalized / (dtMs / 1000));
          if (session.speeds.length > 150) session.speeds.shift();
        }
        const angle = Math.atan2(dy, dx);
        if (session.lastAngle !== null) {
          let diff = Math.abs(angle - session.lastAngle);
          diff = Math.min(diff, TWO_PI - diff);
          if (diff > 1.05) session.directionChanges++;
        }
        session.lastAngle = angle;
        if (session.pauseStart !== null) closePause();
        session.lastMoveAt = elapsedMs;
        if (!reduced && elapsedMs - session.lastEmission > 26) {
          emit(px, py, false); session.lastEmission = elapsedMs;
        }
      }
    }
    session.previous = { x: px, y: py, t: elapsedMs };
    if (elapsedMs - session.lastPathAt >= 105 || !session.path.length) {
      session.path.push({ x: nx, y: ny });
      if (session.path.length > 210) session.path.shift();
      session.lastPathAt = elapsedMs;
    }
  }
  function checkPause() {
    if (session.lastMoveAt === null || session.pauseStart !== null) return;
    if (elapsedMs - session.lastMoveAt >= 1000) session.pauseStart = session.lastMoveAt;
  }
  function closePause() {
    if (session.pauseStart === null) return;
    const duration = elapsedMs - session.pauseStart;
    if (duration > 1550) session.pauses.push(duration);
    session.pauseStart = null;
  }
  function markRipple(x, y) {
    if (phase !== 'observing') return;
    recordPoint(x, y, false);
    session.clicks++;
    emit(x, y, true);
    playNote();
  }
  function getSnapshot() {
    closePause();
    const totalSpeed = session.speeds.reduce((sum, n) => sum + n, 0);
    return {
      duration: elapsedMs / 1000, clicks: session.clicks, trail: session.trail,
      zones: session.zones.size, pauses: session.pauses.length,
      avgSpeed: session.speeds.length ? totalSpeed / session.speeds.length : 0,
      directionChanges: session.directionChanges,
      path: session.path.map(({ x, y }) => ({ x, y }))
    };
  }
  function classify(m) {
    if (m.clicks === 0 && m.trail < .015 && m.zones < 2) return 'stillness';
    if (m.clicks === 1) return 'minimalist';
    if (m.clicks >= 7) return 'player';
    if (m.zones >= 11 && m.trail >= 1.1) return 'seeker';
    if (m.directionChanges >= 9 && m.pauses >= 2) return 'dreamer';
    if (m.pauses >= 2 && m.duration >= 15 && m.avgSpeed < .5) return 'philosopher';
    if (m.avgSpeed >= .85 && m.zones >= 5 && m.duration < 18) return 'runner';
    if (m.pauses >= 3) return 'observer';
    if (m.clicks === 0) return 'witness';
    if (m.zones <= 3 && m.trail < .55) return 'homebody';
    return 'wanderer';
  }
  function updateHUD() {
    const seconds = Math.min(30, Math.floor(elapsedMs / 1000));
    els.watchTime.textContent = `00:${String(seconds).padStart(2, '0')} / 00:30`;
    els.progress.style.width = `${clamp((elapsedMs / OBSERVATION_MS) * 100, 0, 100)}%`;
    els.distance.textContent = Math.round(session.trail * 100);
    els.zones.textContent = session.zones.size;
    els.clicks.textContent = session.clicks;
  }
  function updatePoem(force = false) {
    let key = elapsedMs < 7500 ? 'poem0' : elapsedMs < 15000 ? 'poem1' : elapsedMs < 22500 ? 'poem2' : 'poem3';
    if (elapsedMs > 12500 && session.trail < .015 && session.clicks === 0) key = 'poemStill';
    if (force || key !== currentPoem) { currentPoem = key; els.watchPoem.textContent = t(key); }
  }
  function begin() {
    if (phase !== 'intro') return;
    phase = 'observing';
    elapsedMs = 0;
    session = freshSession();
    particles.length = 0;
    currentPoem = '';
    els.intro.hidden = true;
    els.ending.hidden = true;
    els.watch.hidden = false;
    document.body.classList.add('observing');
    els.surface.tabIndex = 0;
    els.surface.focus({ preventScroll: true });
    updatePhaseTag();
    updateHUD();
    updatePoem(true);
  }
  function reveal() {
    if (phase !== 'observing') return;
    const metrics = getSnapshot();
    const archetype = classify(metrics);
    finalResult = { metrics, archetype };
    phase = 'ending';
    document.body.classList.remove('observing');
    els.surface.tabIndex = -1;
    els.watch.hidden = true;
    els.ending.hidden = false;
    portraitSvg = makePortrait(metrics, archetype);
    els.host.replaceChildren(portraitSvg);
    renderResultCopy(finalResult);
    updatePhaseTag();
    els.svg.focus({ preventScroll: true });
  }
  function renderResultCopy({ metrics: m, archetype }) {
    const a = ARCHETYPES[archetype];
    els.resultTitle.textContent = a.en;
    els.resultSubtitle.textContent = a.ko;
    els.resultDescription.textContent = language === 'ko' ? a.koText : a.enText;
    els.resultNote.textContent = t(archetype === 'stillness' ? 'stillNote' : 'note');
    els.finalTime.textContent = `${Math.round(m.duration)}s`;
    els.finalTravel.textContent = `${Math.round(m.trail * 100)}`;
    els.finalClicks.textContent = String(m.clicks);
    if (portraitSvg) {
      portraitSvg.setAttribute('aria-label', `${a.en} — ${language === 'ko' ? a.ko : a.en}`);
      const title = portraitSvg.querySelector('title');
      if (title) title.textContent = `${a.en} — your constellation`;
    }
  }
  function reset() {
    sessionSeed = newSeed();
    session = freshSession();
    elapsedMs = 0;
    phase = 'intro';
    portraitSvg = null; finalResult = null;
    particles.length = 0;
    currentPoem = '';
    els.host.replaceChildren();
    els.intro.hidden = false; els.watch.hidden = true; els.ending.hidden = true;
    document.body.classList.remove('observing');
    els.surface.tabIndex = -1;
    updatePhaseTag();
    els.start.focus({ preventScroll: true });
  }

  // The artwork includes actual normalized pointer samples; all random variation is local to the current visit.
  const NS = 'http://www.w3.org/2000/svg';
  function svgNode(name, attrs = {}, text = null) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== null) node.textContent = String(text);
    return node;
  }
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }
  function makePortrait(m, archetype) {
    const color = ARCHETYPES[archetype].color;
    const signature = (sessionSeed ^ Math.imul(Math.round(m.trail * 10000), 2654435761) ^ (m.clicks * 7919) ^ (m.zones * 4099)) >>> 0;
    const random = seeded(signature);
    els.serial.textContent = signature.toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
    const svg = svgNode('svg', { xmlns: NS, viewBox: '0 0 600 600', width: 1200, height: 1200,
      role: 'img', 'aria-label': 'Constellation portrait' });
    svg.append(svgNode('title', {}, `${ARCHETYPES[archetype].en} — your constellation`));
    svg.append(svgNode('desc', {}, 'A unique star map made from this session\'s cursor or touch movements.'));
    const defs = svgNode('defs');
    const mist = svgNode('radialGradient', { id: 'mist' });
    mist.append(svgNode('stop', { offset: '0%', 'stop-color': '#121b30' }),
      svgNode('stop', { offset: '64%', 'stop-color': '#050913' }),
      svgNode('stop', { offset: '100%', 'stop-color': '#02050b' }));
    const beam = svgNode('linearGradient', { id: 'beam', x1: '0%', y1: '0%', x2: '100%', y2: '90%' });
    beam.append(svgNode('stop', { offset: '0%', 'stop-color': '#8bb5d9' }),
      svgNode('stop', { offset: '48%', 'stop-color': color }),
      svgNode('stop', { offset: '100%', 'stop-color': '#f4d8ae' }));
    const aura = svgNode('radialGradient', { id: 'aura' });
    aura.append(svgNode('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '.96' }),
      svgNode('stop', { offset: '28%', 'stop-color': color, 'stop-opacity': '.65' }),
      svgNode('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    const soft = svgNode('filter', { id: 'blur', x: '-100%', y: '-100%', width: '300%', height: '300%' });
    soft.append(svgNode('feGaussianBlur', { stdDeviation: '5' }));
    defs.append(mist, beam, aura, soft);
    svg.append(defs, svgNode('rect', { width: 600, height: 600, rx: 26, fill: 'url(#mist)' }));
    const grid = svgNode('g', { fill: 'none', stroke: '#b6c8ed', 'stroke-width': '.6' });
    const ringCount = 3 + Math.min(5, m.pauses);
    for (let i = 0; i < ringCount; i++) {
      grid.append(svgNode('circle', { cx: 300, cy: 285, r: 73 + i * 33,
        opacity: (.16 - i * .013).toFixed(3), 'stroke-dasharray': i % 2 ? '3 9' : 'none' }));
    }
    grid.append(svgNode('ellipse', { cx: 300, cy: 285, rx: 235, ry: 93,
      transform: 'rotate(-28 300 285)', opacity: '.23' }));
    grid.append(svgNode('ellipse', { cx: 300, cy: 285, rx: 235, ry: 93,
      transform: 'rotate(53 300 285)', opacity: '.13' }));
    svg.append(grid);
    const backgroundStars = svgNode('g');
    for (let i = 0; i < 118; i++) {
      const x = 36 + random() * 528, y = 35 + random() * 528;
      const radius = random() > .88 ? 1.5 : .2 + random() * .85;
      backgroundStars.append(svgNode('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: radius.toFixed(2),
        fill: random() > .83 ? '#e9c8a9' : '#cfdef5', opacity: (.18 + random() * .53).toFixed(2) }));
    }
    svg.append(backgroundStars);
    // A unique filigree frequency curve responds to exploration, ripple count and pauses.
    const contour = svgNode('g', { fill: 'none', 'stroke-linejoin': 'round' });
    const petals = 3 + (m.clicks % 7);
    const waviness = 7 + Math.min(29, m.trail * 13);
    const samples = [];
    for (let i = 0; i <= 180; i++) {
      const a = TWO_PI * i / 180;
      const r = 147 + waviness * Math.sin(petals * a + signature / 100000) + 15 * Math.cos(9 * a + signature / 200000);
      samples.push(`${(300 + r * Math.cos(a)).toFixed(2)},${(285 + r * Math.sin(a)).toFixed(2)}`);
    }
    const curve = `M ${samples.join(' L ')} Z`;
    contour.append(svgNode('path', { d: curve, stroke: color, 'stroke-width': '2.5', opacity: '.15', filter: 'url(#blur)' }));
    contour.append(svgNode('path', { d: curve, stroke: 'url(#beam)', 'stroke-width': '.9', opacity: '.66' }));
    svg.append(contour);
    const filaments = svgNode('g', { stroke: 'url(#beam)', 'stroke-width': '.75', opacity: '.48' });
    const strandCount = 32 + Math.min(40, Math.round(m.trail * 15) + m.clicks * 2);
    for (let i = 0; i < strandCount; i++) {
      const a = TWO_PI * i / strandCount;
      const inner = 34 + random() * 80;
      const outer = 157 + random() * 89;
      filaments.append(svgNode('line', {
        x1: (300 + inner * Math.cos(a)).toFixed(2), y1: (285 + inner * Math.sin(a)).toFixed(2),
        x2: (300 + outer * Math.cos(a + (random() - .5) * .1)).toFixed(2),
        y2: (285 + outer * Math.sin(a + (random() - .5) * .1)).toFixed(2)
      }));
    }
    svg.append(filaments);
    const pathLayer = svgNode('g');
    if (m.path.length >= 2) {
      const step = Math.max(1, Math.floor(m.path.length / 42));
      const selected = m.path.filter((_, i) => i % step === 0);
      const last = m.path[m.path.length - 1];
      if (selected[selected.length - 1] !== last) selected.push(last);
      const points = selected.map((p) => ({ x: 143 + p.x * 314, y: 128 + p.y * 314 }));
      const d = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      pathLayer.append(svgNode('path', { d, fill: 'none', stroke: color, 'stroke-width': '6', opacity: '.38', filter: 'url(#blur)' }));
      pathLayer.append(svgNode('path', { d, fill: 'none', stroke: '#f3d6b8', 'stroke-width': '1.55', opacity: '.86', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i % 2 && i !== points.length - 1) continue;
        pathLayer.append(svgNode('circle', { cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: i === 0 || i === points.length - 1 ? 3 : 1.45,
          fill: i === points.length - 1 ? '#fff' : '#f2d9bc', opacity: '.94' }));
      }
    } else if (m.path.length === 1) {
      const p = m.path[0];
      pathLayer.append(svgNode('circle', { cx: 143 + p.x * 314, cy: 128 + p.y * 314, r: 4.5, fill: '#f1d5ae' }));
    } else {
      for (let i = 0; i < 8; i++) {
        const a = TWO_PI * i / 8;
        pathLayer.append(svgNode('circle', { cx: 300 + 105 * Math.cos(a), cy: 285 + 105 * Math.sin(a),
          r: i % 3 === 0 ? 3.5 : 1.7, fill: color, opacity: '.8' }));
      }
    }
    svg.append(pathLayer);
    svg.append(svgNode('circle', { cx: 300, cy: 285, r: 36 + Math.min(19, m.clicks * 2), fill: 'url(#aura)', opacity: '.62' }));
    svg.append(svgNode('circle', { cx: 300, cy: 285, r: 2.3, fill: '#fff' }));
    svg.append(svgNode('line', { x1: 77, x2: 523, y1: 535, y2: 535, stroke: '#a4b9d9', opacity: '.27', 'stroke-width': '.7' }));
    svg.append(svgNode('text', { x: 300, y: 560, 'text-anchor': 'middle', fill: '#dce1f0',
      'font-size': 15, 'font-family': 'Georgia, serif', 'letter-spacing': '2.2' }, ARCHETYPES[archetype].en.toUpperCase()));
    svg.append(svgNode('text', { x: 300, y: 580, 'text-anchor': 'middle', fill: '#9eaac4',
      'font-size': 8, 'font-family': 'monospace', 'letter-spacing': '3.2' }, 'THE SITE THAT KNOWS YOU'));
    return svg;
  }

  function saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 12000);
    announce(t('downloadReady'));
  }
  function serializePortrait() {
    if (!portraitSvg) return null;
    return new XMLSerializer().serializeToString(portraitSvg);
  }
  function saveSVG() {
    const xml = serializePortrait();
    if (!xml) return;
    saveBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), 'my-one-moment-constellation.svg');
  }
  function savePNG() {
    const xml = serializePortrait();
    if (!xml) return;
    els.png.disabled = true;
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    const cleanup = () => { els.png.disabled = false; URL.revokeObjectURL(url); };
    img.onload = () => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportCanvas.height = 1600;
        const g = exportCanvas.getContext('2d');
        g.drawImage(img, 0, 0, 1600, 1600);
        exportCanvas.toBlob((blob) => {
          if (blob) saveBlob(blob, 'my-one-moment-constellation.png');
          else announce(t('downloadFailed'));
          cleanup();
        }, 'image/png');
      } catch (e) { cleanup(); announce(t('downloadFailed')); }
    };
    img.onerror = () => { cleanup(); announce(t('downloadFailed')); };
    img.src = url;
  }

  function makeAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = .0;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 320;
    filter.connect(master); master.connect(context.destination);
    const nodes = [];
    [55, 82.41, 110, 164.81].forEach((freq, i) => {
      const o = context.createOscillator();
      const g = context.createGain();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = freq;
      g.gain.value = i === 0 ? .52 : .16 / i;
      o.connect(g); g.connect(filter); o.start();
      nodes.push(o);
    });
    return { context, master, nodes };
  }
  async function toggleSound() {
    if (soundEnabled) {
      soundEnabled = false;
      if (audio) {
        audio.master.gain.setTargetAtTime(0, audio.context.currentTime, .07);
        window.setTimeout(() => { if (audio && !soundEnabled) audio.context.suspend().catch(() => {}); }, 320);
      }
    } else {
      try {
        if (!audio) audio = makeAudio();
        if (!audio) throw Error('No Web Audio');
        await audio.context.resume();
        audio.master.gain.setTargetAtTime(.025, audio.context.currentTime, .15);
        soundEnabled = true;
      } catch (e) { soundEnabled = false; announce(t('soundFailed')); }
    }
    updateLanguage();
  }
  function playNote() {
    if (!soundEnabled || !audio || audio.context.state !== 'running') return;
    const context = audio.context;
    const o = context.createOscillator(), g = context.createGain();
    const steps = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const now = context.currentTime;
    o.type = 'sine';
    o.frequency.value = steps[(session.clicks - 1) % steps.length];
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(.048, now + .035);
    g.gain.exponentialRampToValueAtTime(.0001, now + 1.2);
    o.connect(g); g.connect(context.destination);
    o.start(); o.stop(now + 1.22);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  els.start.addEventListener('click', begin);
  els.reveal.addEventListener('click', reveal);
  els.restart.addEventListener('click', reset);
  els.lang.addEventListener('click', () => { language = language === 'ko' ? 'en' : 'ko'; updateLanguage(); });
  els.sound.addEventListener('click', toggleSound);
  els.svg.addEventListener('click', saveSVG);
  els.png.addEventListener('click', savePNG);
  els.surface.addEventListener('pointermove', (e) => {
    if (phase !== 'observing') return;
    recordPoint(e.clientX, e.clientY, true);
  }, { passive: true });
  els.surface.addEventListener('pointerdown', (e) => {
    if (phase !== 'observing' || e.button !== 0) return;
    markRipple(e.clientX, e.clientY);
  }, { passive: true });
  els.surface.addEventListener('keydown', (e) => {
    if (phase !== 'observing' || (e.code !== 'Space' && e.code !== 'Enter')) return;
    e.preventDefault();
    markRipple(session.pointerX * W, session.pointerY * H);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
      if (audio && audio.context.state === 'running') audio.context.suspend().catch(() => {});
    } else {
      resumeAnimation();
      if (soundEnabled && audio) audio.context.resume().catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => {
    stopAnimation();
    if (audio) {
      audio.nodes.forEach((node) => { try { node.stop(); } catch (_) { /* already stopped */ } });
      audio.context.close().catch(() => {});
      audio = null;
      soundEnabled = false;
    }
  });
  window.addEventListener('pageshow', resumeAnimation);
  window.addEventListener('resize', resize, { passive: true });
  if (prefersReduced.addEventListener) prefersReduced.addEventListener('change', (e) => { reduced = e.matches; });
  resize();
  updateLanguage();
  resumeAnimation();
})();
