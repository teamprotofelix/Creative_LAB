/* OBSERVER — 관찰자 | 순수 HTML/CSS/JS, 네트워크 요청 없음 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('cosmos');
  const ctx = canvas.getContext('2d', { alpha: true });
  const layerIds = ['layer-dot', 'layer-title', 'layer-thought', 'layer-signature', 'layer-final'];
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = window.matchMedia('(pointer: fine) and (hover: hover)');
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = (value) => String(value).padStart(2, '0');

  const REFLECTIONS = [
    '우주는 아주 오래되었습니다. 그런데 지금 이 순간은 처음입니다.',
    '시간이 흐른다고 느끼는 순간, 무엇이 그 흐름을 알아차리고 있습니까?',
    '당신이 보는 별빛은 오래된 소식입니다. 지금 당신의 생각은 어떤 소식입니까?',
    '어떤 장면을 기억한다는 것은, 그 장면을 다시 만드는 일일까요?',
    '우리는 세계를 보는 걸까요, 아니면 세계에 대한 하나의 해석을 보는 걸까요?',
    '손을 움직이면 별이 반응합니다. 그렇다면 마음은 무엇에 반응할까요?',
    '새로운 것을 알아차리는 순간, 원래 있던 것은 달라진 걸까요?',
    '생각을 잠시 멈추면 생각을 바라보는 존재도 사라질까요?',
    '빛이 어둠을 밀어내는 것이 아니라, 어둠에 모양을 그리는 것일지도 모릅니다.',
    '한순간은 짧지만, 그 순간을 느끼는 깊이는 누구도 재어볼 수 없습니다.',
    '당신은 생각을 만들고 있습니까? 아니면 떠오르는 생각을 만나고 있습니까?',
    '시간은 시계 안에 있을까요, 아니면 변화를 알아차리는 마음 안에 있을까요?',
    '우주의 끝을 상상하는 바로 그곳에서, 상상은 어디까지 이어질까요?',
    '별 하나를 만들기 위해 필요한 것은, 여기서는 단 한 번의 선택입니다.',
    '어제를 떠올릴 때마다 어제는 같은 모습으로 돌아옵니까?',
    '지금 보고 있는 색은 화면의 것입니까, 아니면 경험의 것입니까?',
    '아무것도 하지 않는 동안에도, 당신 안에서는 어떤 변화가 일어납니까?',
    '끝이 있다는 것은 지금 이 순간을 더 소중하게 만들까요?',
    '인간은 별의 물질로 이루어져 있습니다. 하지만 별은 당신의 질문을 알까요?',
    '나를 바라보는 내가 있다면, 그 나를 바라보는 것은 누구일까요?',
    '우리는 세상을 있는 그대로 보지 못하더라도, 진심으로 느낄 수 있습니다.',
    '모든 답이 정해진 세계라면, 질문은 어디에서 생겨날까요?',
    '기억은 지나간 시간을 붙잡는 대신, 지금의 당신을 새롭게 만들기도 합니다.',
    '이 화면에 없는 수많은 별도, 지금 당신의 상상 안에는 들어올 수 있습니다.',
    '당신이 지나온 모든 순간이 지금 여기에 조용히 겹쳐 있을지도 모릅니다.',
    '침묵도 하나의 언어라면, 이 우주는 지금 무엇을 말하고 있을까요?'
  ];

  const SYMBOLS = ['◐', '◑', '◒', '◓', '◇', '◆', '△', '▽', '○', '●', '✦', '✧', '◈', '◉', '⬡', '⬢'];
  let W = 0;
  let H = 0;
  let dpr = 1;
  let lastFrame = performance.now();
  let simAccumulator = 0;
  let hudAccumulator = 0;
  let toastTimer = 0;
  let audioCtx = null;
  let audioGain = null;
  let audioOn = false;
  let motionReduced = reduceQuery.matches;
  let systemMotion = reduceQuery.matches;
  let state;

  function randomGenerator(seed) {
    let x = seed | 0;
    return () => {
      x = (x + 0x6D2B79F5) | 0;
      let y = Math.imul(x ^ (x >>> 15), 1 | x);
      y = (y + Math.imul(y ^ (y >>> 7), 61 | y)) ^ y;
      return ((y ^ (y >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newState() {
    return {
      elapsed: 0,
      phase: 'void',
      introDone: false,
      signatureShown: false,
      signatureActive: false,
      signature: '',
      finalShown: false,
      finalPending: false,
      clicks: 0,
      thoughtEpoch: 0,
      thoughtIndex: 0,
      layerToken: 0,
      previousThought: -1,
      mouse: { x: W / 2, y: H / 2, active: false, hasPosition: false, totalDistance: 0 },
      particles: [], anchors: [], waves: [], dust: [],
      tasks: []
    };
  }

  function resize() {
    const prevW = W;
    const prevH = H;
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, W < 740 ? 1.5 : 2);
    if (ctx) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (state && prevW && prevH) {
      const sx = W / prevW;
      const sy = H / prevH;
      for (const p of state.particles) { p.x *= sx; p.y *= sy; }
      for (const a of state.anchors) { a.x *= sx; a.y *= sy; }
      for (const wave of state.waves) { wave.x *= sx; wave.y *= sy; }
      state.mouse.x *= sx;
      state.mouse.y *= sy;
    }
  }

  function schedule(at, fn, group = '') {
    state.tasks.push({ at, fn, group });
  }
  function scheduleAfter(seconds, fn, group = '') { schedule(state.elapsed + seconds, fn, group); }
  function runTimeline() {
    for (let i = 0; i < state.tasks.length;) {
      const task = state.tasks[i];
      if (state.elapsed >= task.at) {
        state.tasks.splice(i, 1);
        task.fn();
      } else { i++; }
    }
  }

  function setLayer(id, instant = false) {
    const previous = layerIds.find((layerId) => $(layerId).classList.contains('active'));
    if (previous === id) return;
    const token = ++state.layerToken;
    for (const layerId of layerIds) {
      $(layerId).classList.remove('active');
      $(layerId).setAttribute('aria-hidden', 'true');
    }
    const show = () => {
      if (token !== state.layerToken) return;
      $(id).classList.add('active');
      $(id).setAttribute('aria-hidden', 'false');
    };
    // 두 개의 텍스트 화면이 서로 겹치지 않도록 짧은 어두운 전환 구간을 둡니다.
    if (previous && !instant && !motionReduced) scheduleAfter(.7, show);
    else show();
  }

  function announce(message) { $('status').textContent = message; }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    toast.setAttribute('aria-hidden', 'false');
    announce(message);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 2400);
  }

  function initDust() {
    const number = motionReduced ? 65 : (W < 740 ? 100 : 160);
    const rng = randomGenerator(194286);
    state.dust = Array.from({ length: number }, () => ({
      x: rng(), y: rng(), r: .3 + rng() * 1.25,
      a: .10 + rng() * .45, phase: rng() * TAU
    }));
  }

  function spawnParticles(count, x, y, speed) {
    const max = motionReduced ? 240 : (W < 740 ? 350 : 560);
    const available = Math.max(0, max - state.particles.length);
    count = Math.min(count, available);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const velocity = (Math.random() * .85 + .25) * speed;
      state.particles.push({
        x, y, vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: .45 + Math.random() * 1.2,
        hue: Math.random() < .13 ? 39 + Math.random() * 10 : 176 + Math.random() * 55,
        alpha: .26 + Math.random() * .6,
        drift: Math.random() * TAU
      });
    }
  }

  function beginCosmos() {
    if (state.phase !== 'void') return;
    state.phase = 'live';
    spawnParticles(motionReduced ? 115 : (W < 740 ? 210 : 280), W / 2, H / 2, motionReduced ? 45 : 175);
    state.waves.push({ x: W / 2, y: H / 2, radius: 1, life: 1.4, maxLife: 1.4 });
    announce('하나의 점에서 작은 우주가 펼쳐졌습니다.');
  }

  function showThought() {
    if (state.finalShown || state.signatureActive || !state.introDone) return;
    setLayer('layer-thought');
    state.thoughtEpoch++;
    const epoch = state.thoughtEpoch;
    let index = Math.floor(Math.random() * REFLECTIONS.length);
    if (index === state.previousThought) index = (index + 1) % REFLECTIONS.length;
    state.previousThought = index;
    state.thoughtIndex++;
    $('thought-text').textContent = REFLECTIONS[index];
    $('thought-number').textContent = pad(state.thoughtIndex);
    $('thought-text').classList.remove('fade');
    scheduleAfter(6.2, () => {
      if (state.thoughtEpoch === epoch && !state.finalShown && !state.signatureActive) $('thought-text').classList.add('fade');
    });
    scheduleAfter(8.5, () => {
      if (state.thoughtEpoch === epoch && !state.finalShown && !state.signatureActive) showThought();
    });
  }

  function enterThoughts() {
    if (state.introDone || state.finalShown) return;
    beginCosmos();
    state.introDone = true;
    $('skip-intro').hidden = true;
    if (!state.signatureActive) showThought();
  }

  function revealHUD() {
    $('hud').classList.add('visible');
    $('hint').classList.add('visible');
  }

  function skipIntro() {
    if (state.introDone) return;
    state.tasks = state.tasks.filter((task) => task.group !== 'intro');
    enterThoughts();
    revealHUD();
  }

  function createSignature() {
    let seed = (Date.now() ^ Math.imul(state.clicks + 1, 7919) ^ (state.mouse.totalDistance | 0)) | 0;
    if (window.crypto && window.crypto.getRandomValues) {
      const entropy = new Uint32Array(1);
      window.crypto.getRandomValues(entropy);
      seed ^= entropy[0];
    }
    const rng = randomGenerator(seed);
    return Array.from({ length: 6 }, () => SYMBOLS[Math.floor(rng() * SYMBOLS.length)]).join(' ');
  }

  function showSignature() {
    if (state.signatureShown || state.finalShown || !state.introDone) return;
    state.signatureShown = true;
    state.signatureActive = true;
    state.thoughtEpoch++; // 이전 사유 타이머 무효화
    state.signature = createSignature();
    $('signature').textContent = state.signature;
    setLayer('layer-signature');
    announce('이번 방문의 우주 서명이 나타났습니다. ' + state.signature);
    scheduleAfter(6.8, () => {
      if (state.finalShown) return;
      state.signatureActive = false;
      showThought();
    });
  }

  function formatElapsed(seconds) {
    const sec = Math.floor(seconds);
    if (sec < 60) return `${sec}초`;
    const min = Math.floor(sec / 60);
    return (sec % 60) ? `${min}분 ${sec % 60}초` : `${min}분`;
  }

  function showFinal() {
    if (state.finalShown) return;
    state.finalShown = true;
    state.phase = 'final';
    state.signatureActive = false;
    state.thoughtEpoch++;
    if (!state.signature) state.signature = createSignature();
    $('final-time').textContent = formatElapsed(state.elapsed);
    $('final-clicks').textContent = String(state.clicks);
    $('final-distance').textContent = Math.round(state.mouse.totalDistance).toLocaleString('ko-KR');
    $('final-signature').textContent = state.signature;
    $('skip-intro').hidden = true;
    $('hint').classList.remove('visible');
    $('progress-fill').style.width = '100%';
    document.body.classList.add('is-final');
    setLayer('layer-final');
    announce('최종 장면입니다. 다시 태어나기, 그림으로 저장, 서명 복사 버튼을 사용할 수 있습니다.');
  }

  function reset() {
    state = newState();
    initDust();
    simAccumulator = 0;
    hudAccumulator = 0;
    document.body.classList.remove('is-final');
    $('skip-intro').hidden = false;
    $('hud').classList.remove('visible');
    $('hint').classList.remove('visible');
    $('thought-text').classList.remove('fade');
    $('progress-fill').style.width = '0%';
    $('session-time').textContent = '00:00.0';
    $('click-count').textContent = '0';
    $('move-distance').textContent = '0 px';
    $('status').textContent = '';
    setLayer('layer-dot', true);
    schedule(2.5, beginCosmos, 'intro');
    schedule(4.5, () => { if (!state.finalShown) setLayer('layer-title'); }, 'intro');
    schedule(9.5, enterThoughts, 'intro');
    schedule(10, revealHUD, 'intro');
    schedule(22, showSignature);
    schedule(60, showFinal); // 클릭 수와 관계없이 최종 장면 표시
    announce('관찰자 경험이 시작됩니다. 시작 장면 건너뛰기 버튼을 사용할 수 있습니다.');
  }

  function updateParticles(dt) {
    const pointer = state.mouse;
    const friction = Math.exp(-.38 * dt);
    const maxVelocity = 240;
    const repelRadius = 143;
    for (const p of state.particles) {
      if (pointer.active && !motionReduced) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < repelRadius * repelRadius && d2 > 4) {
          const d = Math.sqrt(d2);
          const force = Math.pow(1 - d / repelRadius, 1.5) * 620 * dt;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      if (!motionReduced) {
        p.vx += Math.sin(state.elapsed * .27 + p.drift) * dt * 3;
        p.vy += Math.cos(state.elapsed * .31 + p.drift) * dt * 3;
      }
      p.vx *= friction;
      p.vy *= friction;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > maxVelocity) { p.vx *= maxVelocity / speed; p.vy *= maxVelocity / speed; }
      const factor = motionReduced ? .13 : 1;
      p.x += p.vx * dt * factor;
      p.y += p.vy * dt * factor;
      if (p.x < -25) p.x = W + 25;
      if (p.x > W + 25) p.x = -25;
      if (p.y < -25) p.y = H + 25;
      if (p.y > H + 25) p.y = -25;
    }
    state.waves = state.waves.filter((wave) => wave.life > 0);
    for (const wave of state.waves) {
      wave.radius += dt * (motionReduced ? 120 : 260);
      wave.life -= dt;
    }
  }

  function drawDust() {
    const dx = state.mouse.active ? (state.mouse.x - W / 2) * -.008 : 0;
    const dy = state.mouse.active ? (state.mouse.y - H / 2) * -.008 : 0;
    for (const star of state.dust) {
      const shimmer = motionReduced ? 1 : .84 + .16 * Math.sin(state.elapsed * .6 + star.phase);
      ctx.globalAlpha = star.a * shimmer;
      ctx.fillStyle = '#c3dde4';
      ctx.beginPath();
      ctx.arc(star.x * W + dx, star.y * H + dy, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 한 입자당 주변 9개 셀만 조사: 원본의 O(n²) 전수 조사 제거.
  function drawConnections() {
    const particles = state.particles;
    const cellSize = 105;
    const cells = new Map();
    const coords = new Array(particles.length);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      coords[i] = [cx, cy];
      const key = cx + ':' + cy;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(i);
    }
    ctx.lineWidth = .55;
    const maxEdges = W < 740 ? 165 : 385;
    let edges = 0;
    for (let i = 0; i < particles.length && edges < maxEdges; i++) {
      const p = particles[i];
      const [cx, cy] = coords[i];
      let local = 0;
      for (let gx = cx - 1; gx <= cx + 1 && local < 3 && edges < maxEdges; gx++) {
        for (let gy = cy - 1; gy <= cy + 1 && local < 3 && edges < maxEdges; gy++) {
          const neighbors = cells.get(gx + ':' + gy);
          if (!neighbors) continue;
          for (const j of neighbors) {
            if (j <= i) continue;
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 105 * 105 || d2 < 2) continue;
            const alpha = clamp((1 - d2 / (105 * 105)) * .14, 0, .14);
            ctx.strokeStyle = `rgba(116,199,216,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
            local++;
            edges++;
            if (local >= 3 || edges >= maxEdges) break;
          }
        }
      }
    }
  }

  function drawScene() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (state.phase === 'void') return;
    drawDust();

    if (!motionReduced) {
      const breath = 56 + Math.sin(state.elapsed * .53) * 9;
      ctx.strokeStyle = 'rgba(108,178,200,.035)';
      ctx.lineWidth = .7;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, breath * (2.6 + r * 1.8), 0, TAU);
        ctx.stroke();
      }
      drawConnections();
    }

    for (const p of state.particles) {
      ctx.fillStyle = `hsla(${p.hue.toFixed(0)},83%,78%,${p.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();
    }
    for (const anchor of state.anchors) {
      ctx.strokeStyle = 'rgba(224,199,146,.55)';
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(anchor.x - 5, anchor.y); ctx.lineTo(anchor.x + 5, anchor.y);
      ctx.moveTo(anchor.x, anchor.y - 5); ctx.lineTo(anchor.x, anchor.y + 5);
      ctx.stroke();
      ctx.fillStyle = '#f2e1bf';
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 1.6, 0, TAU); ctx.fill();
    }
    for (const wave of state.waves) {
      ctx.strokeStyle = `rgba(179,220,224,${clamp(wave.life / wave.maxLife * .35, 0, .35).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, TAU); ctx.stroke();
    }
  }

  function updateHud() {
    const tenths = Math.floor(state.elapsed * 10) % 10;
    const seconds = Math.floor(state.elapsed);
    $('session-time').textContent = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}.${tenths}`;
    $('click-count').textContent = String(state.clicks);
    $('move-distance').textContent = `${Math.round(state.mouse.totalDistance).toLocaleString('ko-KR')} px`;
    if (!state.finalShown) $('progress-fill').style.width = `${clamp(state.elapsed / 60 * 100, 0, 100)}%`;
  }

  function observeAt(x, y) {
    if (state.phase !== 'live' || state.finalShown) return;
    x = clamp(x, 0, W); y = clamp(y, 0, H);
    state.clicks++;
    spawnParticles(motionReduced ? 7 : 18, x, y, motionReduced ? 48 : 180);
    state.anchors.push({ x, y });
    if (state.anchors.length > 36) state.anchors.shift();
    state.waves.push({ x, y, radius: 3, life: motionReduced ? .35 : 1.05, maxLife: motionReduced ? .35 : 1.05 });
    if (state.waves.length > 16) state.waves.shift();
    if (!motionReduced) {
      $('cursor').classList.add('pulse');
      clearTimeout(observeAt.cursorTimer);
      observeAt.cursorTimer = window.setTimeout(() => $('cursor').classList.remove('pulse'), 280);
    }
    if (state.clicks === 1 && !state.signatureShown) {
      scheduleAfter(3.5, showSignature);
    }
    if (state.clicks >= 15 && !state.finalPending) {
      state.finalPending = true;
      scheduleAfter(1.8, showFinal);
    }
    updateHud();
  }

  function setMousePosition(x, y, type) {
    const mouse = state.mouse;
    if (mouse.hasPosition) {
      const distance = Math.hypot(x - mouse.x, y - mouse.y);
      // 큰 불연속 이동(모바일 화면 전환 등)은 거리에서 제외.
      if (distance < Math.max(W, H) * .65) mouse.totalDistance += distance;
    }
    mouse.x = x; mouse.y = y;
    mouse.hasPosition = true;
    mouse.active = true;
    if (type === 'mouse' && pointerFine.matches) {
      document.body.classList.add('cursor-active');
      $('cursor').style.left = x + 'px';
      $('cursor').style.top = y + 'px';
    }
  }

  async function ensureAudio() {
    if (audioCtx) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error('이 브라우저는 Web Audio를 지원하지 않습니다.');
    audioCtx = new AudioCtor();
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 460;
    audioGain = audioCtx.createGain();
    audioGain.gain.value = 0;
    [55, 82.41, 110, 164.81].forEach((frequency, index) => {
      const oscillator = audioCtx.createOscillator();
      oscillator.type = index === 3 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(lowpass);
      oscillator.start();
    });
    lowpass.connect(audioGain);
    audioGain.connect(audioCtx.destination);
  }

  function renderSoundState() {
    $('sound-toggle').setAttribute('aria-pressed', String(audioOn));
    $('sound-toggle').setAttribute('aria-label', audioOn ? '소리 끄기' : '소리 켜기');
    $('sound-toggle').title = audioOn ? '소리 끄기' : '소리 켜기';
    $('sound-label').textContent = audioOn ? 'SOUND ON' : 'SOUND OFF';
  }
  async function toggleAudio() {
    try {
      await ensureAudio();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioOn = !audioOn;
      const now = audioCtx.currentTime;
      audioGain.gain.cancelScheduledValues(now);
      audioGain.gain.setTargetAtTime(audioOn ? .018 : 0, now, .4);
      renderSoundState();
    } catch (error) {
      audioOn = false;
      renderSoundState();
      showToast('이 브라우저에서 소리를 재생하지 못했습니다.');
      console.warn('OBSERVER audio:', error);
    }
  }

  function renderMotionState() {
    document.body.classList.toggle('manual-reduced', motionReduced);
    $('motion-toggle').setAttribute('aria-pressed', String(motionReduced));
    $('motion-toggle').setAttribute('aria-label', motionReduced ? '일반 움직임 사용' : '움직임 줄이기');
    $('motion-toggle').title = motionReduced ? '일반 움직임 사용' : '움직임 줄이기';
    $('motion-toggle').querySelector('.utility-label').textContent = motionReduced ? 'MOTION LOW' : 'MOTION ON';
  }
  function toggleMotion() {
    motionReduced = !motionReduced;
    initDust();
    renderMotionState();
    showToast(motionReduced ? '움직임을 줄였습니다.' : '기본 움직임으로 전환했습니다.');
  }

  function copyFallback(value) {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(field);
    field.select();
    const successful = document.execCommand('copy');
    field.remove();
    return successful;
  }
  async function copySignature() {
    const value = state.signature || createSignature();
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else if (!copyFallback(value)) throw new Error('copy failed');
      showToast('우주 서명을 복사했습니다.');
    } catch (_) {
      try {
        if (copyFallback(value)) { showToast('우주 서명을 복사했습니다.'); return; }
      } catch (__) { /* clipboard denied */ }
      showToast('복사 권한이 없어 서명을 선택해 복사해야 합니다.');
    }
  }

  function savePostcard() {
    try {
      const image = document.createElement('canvas');
      image.width = 1600;
      image.height = 900;
      const pen = image.getContext('2d');
      if (!pen) throw new Error('canvas unavailable');
      const gradient = pen.createRadialGradient(800, 450, 50, 800, 450, 940);
      gradient.addColorStop(0, '#11283b');
      gradient.addColorStop(.62, '#0a1327');
      gradient.addColorStop(1, '#040711');
      pen.fillStyle = gradient;
      pen.fillRect(0, 0, 1600, 900);
      const seed = Array.from(state.signature).reduce((total, char) => ((total * 31 + char.charCodeAt(0)) | 0), state.clicks + 1);
      const rng = randomGenerator(seed);
      for (let i = 0; i < 330; i++) {
        pen.globalAlpha = .15 + rng() * .45;
        pen.fillStyle = '#c5dde4';
        pen.beginPath();
        pen.arc(rng() * 1600, rng() * 900, .35 + rng() * 1.8, 0, TAU);
        pen.fill();
      }
      pen.globalAlpha = 1;
      pen.strokeStyle = 'rgba(168,208,216,.32)';
      pen.lineWidth = 1;
      pen.beginPath(); pen.arc(800, 450, 280, 0, TAU); pen.stroke();
      pen.beginPath(); pen.arc(800, 450, 205, 0, TAU); pen.stroke();
      pen.fillStyle = '#f4eee1';
      pen.textAlign = 'center';
      pen.font = '42px Georgia,serif';
      pen.fillText('O B S E R V E R', 800, 197);
      pen.font = '29px serif';
      pen.fillText('당신의 관찰이 머물렀던 순간', 800, 268);
      pen.fillStyle = '#e5c993';
      pen.font = '56px Georgia,serif';
      pen.fillText(state.signature, 800, 484);
      pen.fillStyle = '#bbd8dc';
      pen.font = '23px sans-serif';
      pen.fillText(`머무른 시간 ${formatElapsed(state.elapsed)}   /   만든 별 ${state.clicks}   /   포인터 이동 ${Math.round(state.mouse.totalDistance).toLocaleString('ko-KR')} px`, 800, 608);
      pen.fillStyle = 'rgba(245,240,230,.55)';
      pen.font = '18px Georgia,serif';
      pen.fillText('THIS MOMENT WAS NEVER EXACTLY THE SAME AS ANOTHER.', 800, 745);
      pen.font = '16px Georgia,serif';
      pen.fillText('OBSERVER · AN INTERACTIVE MEDITATION', 800, 790);
      image.toBlob((blob) => {
        if (!blob) { showToast('이미지 생성에 실패했습니다.'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'OBSERVER-나의-우주-서명.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast('이 순간의 그림을 저장했습니다.');
      }, 'image/png');
    } catch (error) {
      console.warn('OBSERVER export:', error);
      showToast('이 브라우저에서는 이미지 저장이 지원되지 않습니다.');
    }
  }

  function bindEvents() {
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      if (event.target.closest('button, a, .final-content')) {
        state.mouse.active = false;
        return;
      }
      setMousePosition(event.clientX, event.clientY, event.pointerType);
    }, { passive: true });
    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('button, a, .final-content')) return;
      setMousePosition(event.clientX, event.clientY, event.pointerType);
      observeAt(event.clientX, event.clientY);
    });
    window.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') state.mouse.active = false; });
    window.addEventListener('pointercancel', () => { state.mouse.active = false; });
    document.addEventListener('pointerleave', () => { state.mouse.active = false; });
    window.addEventListener('keydown', (event) => {
      if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const target = event.target;
        if (target.closest('button, a, input, textarea, select, .final-content')) return;
        if (state.phase !== 'live') return;
        event.preventDefault();
        observeAt(W * (.38 + Math.random() * .24), H * (.36 + Math.random() * .27));
      }
    });
    $('skip-intro').addEventListener('click', skipIntro);
    $('restart-button').addEventListener('click', () => { reset(); showToast('새로운 우주를 시작합니다.'); });
    $('save-button').addEventListener('click', savePostcard);
    $('copy-button').addEventListener('click', copySignature);
    $('sound-toggle').addEventListener('click', toggleAudio);
    $('motion-toggle').addEventListener('click', toggleMotion);
    document.addEventListener('visibilitychange', () => {
      // 배경 탭에 있을 때 경험 시간/물리 계산을 멈추고 오디오도 잠시 정지.
      lastFrame = performance.now();
      if (!audioCtx) return;
      if (document.hidden) { if (audioCtx.state === 'running') audioCtx.suspend().catch(() => {}); }
      else if (audioOn) { audioCtx.resume().catch(() => {}); }
    });
    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', (event) => {
        // 사용자가 별도로 변경하지 않은 동안만 시스템 설정을 따릅니다.
        if (motionReduced === systemMotion) {
          motionReduced = event.matches;
          initDust();
          renderMotionState();
        }
        systemMotion = event.matches;
      });
    }
  }

  function frame(now) {
    const dt = clamp((now - lastFrame) / 1000, 0, .1);
    lastFrame = now;
    if (!document.hidden) {
      state.elapsed += dt;
      runTimeline();
      simAccumulator += dt;
      hudAccumulator += dt;
      const paintInterval = motionReduced ? 1 / 16 : (W < 740 ? 1 / 35 : 1 / 55);
      if (simAccumulator >= paintInterval) {
        updateParticles(simAccumulator);
        drawScene();
        simAccumulator = 0;
      }
      if (hudAccumulator >= .12) {
        updateHud();
        hudAccumulator = 0;
      }
    }
    window.requestAnimationFrame(frame);
  }

  function init() {
    resize();
    renderMotionState();
    renderSoundState();
    reset();
    bindEvents();
    if (!ctx) showToast('이 브라우저에서는 입자 그래픽 대신 텍스트 경험만 표시됩니다.');
    window.requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
