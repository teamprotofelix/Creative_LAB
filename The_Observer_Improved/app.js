(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('universe');
  const ctx = canvas.getContext('2d', { alpha: true });
  const archiveCanvas = $('archiveCanvas');
  const archiveCtx = archiveCanvas.getContext('2d');
  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const STORE_KEY = 'the-observer-constellation-v2';
  const PREF_KEY = 'the-observer-remember-v2';
  const LEGACY_KEY = 'observer_constellation';
  const MAX_TRACE = 300;
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const scenes = [
    { title: '관측의 시작', en: 'CHAPTER 01 — THRESHOLD', text: '이 사이트는 당신을 관찰합니다.\n그리고 당신도 이 세계를 관찰하게 될 것입니다.', duration: 8000 },
    { title: '각성', en: 'CHAPTER 02 — AWAKENING', text: '하나의 움직임이 정적을 깨웁니다.\n우주는 당신의 손끝에서 반응하기 시작합니다.', duration: 9000 },
    { title: '출현', en: 'CHAPTER 03 — EMERGENCE', text: '흩어진 가능성이 궤도를 만들고,\n서로의 존재를 느끼기 시작합니다.', duration: 14000 },
    { title: '생명', en: 'CHAPTER 04 — LIFE', text: '단순한 만남이 연결을 이루고,\n연결은 예상하지 못한 질서를 만들어 냅니다.', duration: 14000 },
    { title: '회귀', en: 'CHAPTER 05 — RETURN', text: '모든 움직임이 잠시 멈추는 곳.\n우리는 지나온 자리에서 자신을 발견합니다.', duration: 11000 },
    { title: '계시', en: 'CHAPTER 06 — REVELATION', text: '보이지 않던 시간이 빛으로 되돌아옵니다.\n이것이 당신이 남긴 별자리입니다.', duration: 25000 },
    { title: '소멸과 지속', en: 'CHAPTER 07 — AFTERGLOW', text: '빛은 사라져도 궤적은 남습니다.\n우리는 무엇을 기억할까요?', duration: Infinity },
  ];

  // The old format stored raw screen pixels, without the screen size. Migrate
  // only approximately, then always save normalized [0,1] coordinates.
  function validatedTrace(points) {
    if (!Array.isArray(points)) return [];
    return points.slice(-MAX_TRACE).filter((p) =>
      p && typeof p === 'object' && Number.isFinite(p.x) && Number.isFinite(p.y) &&
      p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
    ).map((p) => ({ x: p.x, y: p.y }));
  }
  function getStorage() {
    try {
      const key = '__observer_storage_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return localStorage;
    } catch (_) { return null; }
  }
  const storage = getStorage();
  let remembers = !!storage && (!storage.getItem(PREF_KEY) || storage.getItem(PREF_KEY) === '1');
  let previousTrace = [];
  let previousSavedAt = null;
  function loadPrevious() {
    if (!storage || !remembers) return;
    try {
      const payload = JSON.parse(storage.getItem(STORE_KEY) || 'null');
      if (payload && payload.version === 2) {
        previousTrace = validatedTrace(payload.points);
        previousSavedAt = Number.isFinite(payload.savedAt) ? payload.savedAt : null;
        return;
      }
    } catch (_) { /* Corrupt saved data must not break rendering. */ }
    try {
      const legacy = JSON.parse(storage.getItem(LEGACY_KEY) || 'null');
      if (Array.isArray(legacy)) {
        previousTrace = validatedTrace(legacy.map((p) => ({
          x: p && Number.isFinite(p.x) ? clamp(p.x / Math.max(innerWidth, 1), 0, 1) : NaN,
          y: p && Number.isFinite(p.y) ? clamp(p.y / Math.max(innerHeight, 1), 0, 1) : NaN,
        })));
      }
    } catch (_) { /* Ignore invalid legacy data. */ }
  }
  loadPrevious();

  const state = {
    started: false, paused: false, reduced: reducedMedia.matches,
    scene: 0, sceneMs: 0, activeMs: 0,
    hasGesture: false, lastInteractionMs: 0,
    trace: [], lastTraceTime: -1000,
    pointer: { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, visible: false },
    particles: [], ripples: [],
    autoSpawnMs: 0, noteUntil: 0, noteText: '',
    stillShown: false, secretShown: false,
    lastFrame: performance.now(), lastRender: -Infinity, lastHud: -Infinity,
  };
  const size = { w: 1, h: 1, dpr: 1 };
  const center = () => ({ x: size.w / 2, y: size.h / 2 });
  const ambientStars = [];

  function makeStars() {
    const count = clamp(Math.round(size.w * size.h / 5600), 80, 340);
    ambientStars.length = 0;
    for (let i = 0; i < count; i++) {
      ambientStars.push({ x: Math.random(), y: Math.random(), r: random(.25, 1.35), opacity: random(.15, .7), phase: random(0, TAU) });
    }
  }
  function resize() {
    const w = Math.max(1, innerWidth);
    const h = Math.max(1, innerHeight);
    const sx = w / size.w;
    const sy = h / size.h;
    if (size.w !== 1 || size.h !== 1) {
      for (const p of state.particles) { p.x *= sx; p.y *= sy; }
      for (const r of state.ripples) { r.x *= sx; r.y *= sy; }
      state.pointer.x *= sx; state.pointer.y *= sy;
    }
    size.w = w; size.h = h;
    size.dpr = Math.min(devicePixelRatio || 1, 2, Math.max(.7, Math.sqrt(4700000 / (w * h))));
    canvas.width = Math.max(1, Math.round(w * size.dpr));
    canvas.height = Math.max(1, Math.round(h * size.dpr));
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    makeStars();
    drawFrame();
  }

  function note(text, duration = 3400) {
    state.noteText = text;
    state.noteUntil = state.activeMs + duration;
    $('centerNote').textContent = text;
    $('centerNote').classList.add('show');
  }
  function saveTrace() {
    if (!storage || !remembers || state.trace.length < 2) return;
    try {
      storage.setItem(STORE_KEY, JSON.stringify({ version: 2, points: state.trace.slice(-MAX_TRACE), savedAt: Date.now() }));
      // Previously stored data included unbounded pixel values.
      storage.removeItem(LEGACY_KEY);
    } catch (_) { $('memoryStatus').textContent = '브라우저 저장 공간을 사용할 수 없습니다'; }
  }
  function switchScene(index) {
    if (index < 0 || index >= scenes.length || index === state.scene) return;
    if (index >= 5 && state.trace.length >= 2) saveTrace();
    state.scene = index;
    state.sceneMs = 0;
    state.autoSpawnMs = 0;
    state.ripples.length = 0;
    state.noteText = '';
    state.noteUntil = 0;
    $('centerNote').classList.remove('show');
    $('chapterSup').textContent = scenes[index].en;
    $('chapterTitle').textContent = scenes[index].title;
    $('chapterText').textContent = scenes[index].text;
    $('chapterHeading').classList.remove('change');
    void $('chapterHeading').offsetWidth;
    $('chapterHeading').classList.add('change');
    $('revelationPanel').hidden = index < 5;
    if (index >= 5) {
      $('revelationQuote').textContent = state.trace.length === 0
        ? '움직이지 않은 시간에도, 당신은 여기에 있었습니다.'
        : '한 번의 움직임도 우주에서는 하나의 사건입니다.';
      updateRevelationText();
    }
    if (index === 5 && !state.reduced) state.ripples.push({ x: size.w / 2, y: size.h / 2, age: 0, max: 1.55, color: 'gold' });
    if (index === 6 && !state.secretShown) note('소멸은 끝이 아니라, 다른 형태의 시작입니다.', 5000);
    updateHud(true);
  }
  function updateRevelationText() {
    const n = state.trace.length;
    $('revelationCaption').textContent = n > 0
      ? `이번 관측의 별 ${n}개 · 이전 기억 ${previousTrace.length ? `${previousTrace.length}개` : '없음'} · 이 기기에서만 보입니다`
      : `아직 움직임이 기록되지 않았습니다. 화면을 클릭하거나 터치해 첫 별을 남겨 보세요.`;
  }
  function begin() {
    if (state.started) return;
    state.started = true;
    state.paused = false;
    $('welcome').hidden = true;
    $('experience').hidden = false;
    $('hud').hidden = false;
    $('startBtn').blur();
    $('chapterSup').textContent = scenes[0].en;
    $('chapterTitle').textContent = scenes[0].title;
    $('chapterText').textContent = scenes[0].text;
    updateHud(true);
  }
  function restart() {
    if (!state.started) return;
    saveTrace();
    // The current session becomes the next session's ghost after a replay.
    if (remembers && state.trace.length >= 2) {
      previousTrace = validatedTrace(state.trace);
      previousSavedAt = Date.now();
    }
    state.scene = 0; state.sceneMs = 0; state.activeMs = 0;
    state.hasGesture = false; state.lastInteractionMs = 0;
    state.trace = []; state.lastTraceTime = -1000;
    state.particles = []; state.ripples = [];
    state.autoSpawnMs = 0; state.stillShown = false; state.secretShown = false;
    state.paused = false; state.lastFrame = performance.now();
    state.pointer.visible = false;
    $('chapterSup').textContent = scenes[0].en;
    $('chapterTitle').textContent = scenes[0].title;
    $('chapterText').textContent = scenes[0].text;
    $('revelationPanel').hidden = true;
    $('centerNote').classList.remove('show');
    $('interactHint').classList.remove('is-quiet');
    $('hintCopy').textContent = '화면을 움직이거나 터치하세요';
    updateHud(true);
  }
  function setPause(force) {
    if (!state.started) return;
    state.paused = typeof force === 'boolean' ? force : !state.paused;
    state.lastFrame = performance.now();
    updateHud(true);
    if (!state.paused) drawFrame();
  }

  function pointPosition(e) {
    const x = clamp(e.clientX, 0, size.w);
    const y = clamp(e.clientY, 0, size.h);
    const p = state.pointer;
    p.vx = x - p.x; p.vy = y - p.y;
    p.x = x; p.y = y; p.visible = true;
    state.lastInteractionMs = state.activeMs;
    state.hasGesture = true;
    return { x, y };
  }
  function addPoint(x, y, force = false) {
    const now = performance.now();
    const previous = state.trace[state.trace.length - 1];
    const nx = clamp(x / size.w, 0, 1);
    const ny = clamp(y / size.h, 0, 1);
    const dist = previous ? Math.hypot((nx - previous.x) * size.w, (ny - previous.y) * size.h) : 999;
    if (!force && (now - state.lastTraceTime < 55 || dist < 7)) return;
    state.trace.push({ x: nx, y: ny });
    if (state.trace.length > MAX_TRACE) state.trace.shift();
    state.lastTraceTime = now;
    if (state.scene >= 5) updateRevelationText();
  }
  function makeParticle(x, y, special = false) {
    const angle = random(0, TAU);
    const speed = random(.25, 2.05) * (special ? 1.65 : 1);
    return {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: random(.55, 2), life: random(3.2, 7.5), age: 0,
      hue: random(204, 247), phase: random(0, TAU),
    };
  }
  function emit(x, y, number = 2, special = false) {
    const limit = size.w < 650 || state.reduced ? 135 : 230;
    for (let i = 0; i < number && state.particles.length < limit; i++) {
      state.particles.push(makeParticle(x + random(-11, 11), y + random(-11, 11), special));
    }
  }
  function interact(e, down) {
    if (!state.started || state.paused) return;
    if (e.pointerType === 'touch' && !down && e.buttons === 0) return;
    if (e.cancelable && e.pointerType === 'touch') e.preventDefault();
    const { x, y } = pointPosition(e);
    addPoint(x, y, down);
    if (state.scene <= 4) emit(x, y, down ? 8 : 2, down);
    if (down && !state.reduced) state.ripples.push({ x, y, age: 0, max: 1.15, color: 'blue' });
    if (state.trace.length === 1) {
      $('interactHint').classList.add('is-quiet');
      $('hintCopy').textContent = '당신의 흔적이 기록되고 있습니다';
      note('첫 번째 별이 태어났습니다.', 2600);
    }
  }
  canvas.addEventListener('pointermove', (e) => interact(e, false), { passive: false });
  canvas.addEventListener('pointerdown', (e) => interact(e, true), { passive: false });
  $('interactHint').addEventListener('click', () => {
    if (!state.started || state.paused) return;
    const x = random(size.w * .32, size.w * .68), y = random(size.h * .43, size.h * .62);
    state.hasGesture = true;
    state.lastInteractionMs = state.activeMs;
    addPoint(x, y, true);
    emit(x, y, 12, true);
    state.ripples.push({ x, y, age: 0, max: 1.2, color: 'blue' });
    $('hintCopy').textContent = '당신의 흔적이 기록되고 있습니다';
    $('interactHint').classList.add('is-quiet');
  });

  function update(now, ms) {
    state.activeMs += ms;
    state.sceneMs += ms;
    const scene = scenes[state.scene];
    if (state.sceneMs >= scene.duration && state.scene < 6) {
      if (state.scene === 0 && !state.hasGesture) {
        state.sceneMs = scene.duration;
        if (state.noteUntil < state.activeMs) note('화면을 움직이거나 터치하면, 다음 우주가 시작됩니다.', 4000);
      } else {
        switchScene(state.scene + 1);
      }
    }
    const seconds = ms / 1000;
    state.pointer.vx *= Math.pow(.85, ms / 16.67);
    state.pointer.vy *= Math.pow(.85, ms / 16.67);
    state.autoSpawnMs += ms;
    if (state.hasGesture && state.scene >= 2 && state.scene <= 4 && state.autoSpawnMs > (state.reduced ? 870 : 250)) {
      state.autoSpawnMs = 0;
      const angle = random(0, TAU), range = Math.min(size.w, size.h) * random(.11, .33);
      emit(size.w / 2 + Math.cos(angle) * range, size.h / 2 + Math.sin(angle) * range, state.scene === 3 ? 3 : 2);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.age += seconds;
      if (p.age >= p.life) { state.particles.splice(i, 1); continue; }
      const dx = size.w / 2 - p.x, dy = size.h / 2 - p.y;
      const distance = Math.max(10, Math.hypot(dx, dy));
      let pull = 0, swirl = 0;
      if (state.scene === 2 || state.scene === 3) { pull = (distance - Math.min(size.w, size.h) * .27) * .00012; swirl = .045; }
      if (state.scene >= 4) pull = -.1;
      p.vx += ((dx / distance) * -pull - (dy / distance) * swirl) * (ms / 16.67);
      p.vy += ((dy / distance) * -pull + (dx / distance) * swirl) * (ms / 16.67);
      const friction = Math.pow(.987, ms / 16.67);
      p.vx *= friction; p.vy *= friction;
      p.x += p.vx * ms / 16.67; p.y += p.vy * ms / 16.67;
    }
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      state.ripples[i].age += seconds;
      if (state.ripples[i].age > state.ripples[i].max) state.ripples.splice(i, 1);
    }
    if (state.scene >= 5 && state.hasGesture && !state.stillShown && state.activeMs - state.lastInteractionMs >= 14000) {
      state.stillShown = true;
      note('고요함 속에서도 당신은 이 우주를 바꾸고 있습니다.', 5800);
    }
    // Only active, visible, unpaused time unlocks the 3-minute epilogue.
    if (!state.secretShown && state.activeMs >= 180000) {
      state.secretShown = true;
      note('비밀: 관찰한다는 것은, 이미 그 세계에 참여한다는 뜻입니다.', 15000);
      if (state.scene >= 5) $('revelationQuote').textContent = '닫아도 사라지지 않는 것은, 당신이 이곳에서 느낀 순간입니다.';
    }
    $('centerNote').classList.toggle('show', !!state.noteText && state.activeMs < state.noteUntil);
    if (now - state.lastHud >= 250) { updateHud(false); state.lastHud = now; }
  }

  function rgba(color, alpha) { return `rgba(${color},${clamp(alpha, 0, 1)})`; }
  function glow(x, y, radius, rgb, alpha) {
    if (radius < .1 || alpha <= 0) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(rgb, alpha));
    gradient.addColorStop(.3, rgba(rgb, alpha * .25));
    gradient.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  function drawStars(t) {
    for (const star of ambientStars) {
      const flicker = state.reduced ? .74 : .65 + .35 * Math.sin(t * .0007 + star.phase);
      const strength = star.opacity * flicker * (state.scene < 1 ? .33 : .7);
      ctx.fillStyle = rgba('173,199,244', strength);
      ctx.beginPath(); ctx.arc(star.x * size.w, star.y * size.h, star.r, 0, TAU); ctx.fill();
    }
  }
  function drawNebula(t) {
    if (state.scene < 2) return;
    const strength = state.scene <= 3 ? 1 : .5;
    glow(size.w * (.25 + Math.sin(t * .00008) * (state.reduced ? 0 : .04)), size.h * .43,
      Math.min(400, size.w * .46), '82,112,220', .08 * strength);
    glow(size.w * .77, size.h * .60,
      Math.min(450, size.w * .5), '152,95,206', .055 * strength);
  }
  function drawCore(t) {
    const c = center();
    const pulse = state.reduced ? 1 : 1 + Math.sin(t * .0018) * .2;
    const phaseFactor = state.scene === 0 ? 1 : state.scene >= 5 ? .62 : 1.3;
    glow(c.x, c.y, Math.min(size.w, size.h) * .17 * pulse * phaseFactor, '108,144,252', .26);
    glow(c.x, c.y, 18 * pulse, '215,239,255', .9);
    ctx.fillStyle = rgba('252,253,255', .96);
    ctx.beginPath(); ctx.arc(c.x, c.y, (state.scene === 0 ? 3.2 : 2.4) * pulse, 0, TAU); ctx.fill();
    if (state.scene < 5) {
      const base = Math.min(size.w, size.h) * (state.scene === 0 ? .11 : .19);
      for (let i = 0; i < (state.scene === 0 ? 2 : 3); i++) {
        ctx.save(); ctx.translate(c.x, c.y);
        ctx.rotate((state.reduced ? .34 : t * .000035) * (i % 2 ? 1 : -1) + i * 1.07);
        ctx.strokeStyle = rgba('142,174,248', .08 + (i === 0 ? .06 : 0));
        ctx.lineWidth = .6;
        ctx.beginPath(); ctx.ellipse(0, 0, base * (1 + i * .5), base * (.35 + i * .11), 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function drawParticles() {
    const particles = state.particles;
    if (state.scene >= 3 && state.scene <= 4) {
      // Squared-distance comparisons avoid an expensive sqrt for most pairs.
      const threshold = state.scene === 3 ? 110 : 72;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const squared = dx * dx + dy * dy;
          if (squared > threshold * threshold) continue;
          const alpha = (1 - Math.sqrt(squared) / threshold) * .19 * Math.min(1 - a.age / a.life, 1 - b.age / b.life);
          ctx.strokeStyle = rgba('166,199,255', alpha);
          ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      const life = clamp(1 - p.age / p.life, 0, 1);
      ctx.fillStyle = `hsla(${p.hue},85%,79%,${life * .8})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.3, p.r * life), 0, TAU); ctx.fill();
    }
  }
  // Normalized traces survive viewport resizes and aspect-ratio changes.
  function drawTraceOn(g, points, w, h, tone, opacity, withDots = true) {
    if (!points.length) return;
    const rgb = tone === 'past' ? '93,133,207' : '239,212,164';
    const threshold = Math.hypot(w, h) * .21;
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      let prev = null;
      for (const p of points) {
        const x = p.x * w, y = p.y * h;
        const linked = prev && Math.hypot(x - prev.x, y - prev.y) <= threshold;
        if (linked) g.lineTo(x, y); else g.moveTo(x, y);
        prev = { x, y };
      }
      g.strokeStyle = `rgba(${rgb},${opacity * (pass ? .72 : .16)})`;
      g.lineWidth = pass ? (tone === 'past' ? .9 : 1.15) : 5;
      g.stroke();
    }
    if (withDots) {
      for (const p of points) {
        const x = p.x * w, y = p.y * h;
        g.fillStyle = `rgba(${rgb},${opacity * .9})`;
        g.beginPath(); g.arc(x, y, tone === 'past' ? 1.0 : 1.45, 0, TAU); g.fill();
      }
    }
  }
  function drawMemory(t) {
    if (state.scene < 5) return;
    const fade = clamp(state.sceneMs / 2000, 0, 1);
    const dissolution = state.scene === 6 ? Math.max(.18, 1 - state.sceneMs / 75000) : 1;
    if (previousTrace.length) drawTraceOn(ctx, previousTrace, size.w, size.h, 'past', .44 * fade * dissolution);
    drawTraceOn(ctx, state.trace, size.w, size.h, 'now', 1.0 * fade * dissolution);
    if (!state.reduced && state.trace.length) {
      const point = state.trace[state.trace.length - 1];
      glow(point.x * size.w, point.y * size.h, 28 + Math.sin(t * .002) * 6, '226,199,144', .2 * fade);
    }
  }
  function drawSecret(t) {
    if (!state.secretShown) return;
    const c = center();
    const radius = Math.min(size.w, size.h) * .20;
    glow(c.x, c.y, radius * 1.5, '221,170,111', .18);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(c.x, c.y);
      ctx.rotate((state.reduced ? .2 : t * .00008) * (i % 2 ? 1 : -1) + i * .73);
      ctx.strokeStyle = rgba('226,195,155', .13 + i * .025);
      ctx.lineWidth = .7; ctx.beginPath();
      ctx.ellipse(0, 0, radius * (1 + i * .38), radius * (.3 + i * .14), 0, 0, TAU);
      ctx.stroke(); ctx.restore();
    }
  }
  function drawRipples() {
    for (const r of state.ripples) {
      const progress = r.age / r.max;
      const radius = progress * Math.min(size.w, size.h) * .65;
      ctx.strokeStyle = rgba(r.color === 'gold' ? '233,199,151' : '143,184,252', (1 - progress) * .45);
      ctx.lineWidth = 1.6 * (1 - progress) + .3;
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, radius), 0, TAU); ctx.stroke();
    }
  }
  function drawPointer() {
    if (!state.pointer.visible || state.reduced) return;
    glow(state.pointer.x, state.pointer.y, 40, '158,199,255', .3);
    ctx.strokeStyle = 'rgba(202,220,250,.5)'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.arc(state.pointer.x, state.pointer.y, 5, 0, TAU); ctx.stroke();
  }
  function drawFrame(t = performance.now()) {
    if (!ctx) return;
    ctx.clearRect(0, 0, size.w, size.h);
    drawStars(t);
    drawNebula(t);
    drawCore(t);
    drawParticles();
    drawMemory(t);
    drawSecret(t);
    drawRipples();
    drawPointer();
  }
  function tick(now) {
    const elapsed = Math.max(0, Math.min(now - state.lastFrame, 50));
    state.lastFrame = now;
    if (state.started && !state.paused && !document.hidden) update(now, elapsed);
    if (!document.hidden && !state.paused && (!state.reduced || now - state.lastRender >= 90)) {
      drawFrame(now);
      state.lastRender = now;
    }
    requestAnimationFrame(tick);
  }

  function formatClock(ms) {
    const total = Math.floor(ms / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function updateHud(force) {
    if (!state.started) return;
    $('sessionClock').textContent = formatClock(state.activeMs);
    $('sessionStatus').textContent = state.paused ? 'PAUSED' : 'OBSERVING';
    document.querySelector('.session-label').classList.toggle('paused', state.paused);
    $('pauseBtn').textContent = state.paused ? '▶ 계속하기' : 'Ⅱ 일시정지';
    $('pauseBtn').setAttribute('aria-pressed', String(state.paused));
    $('traceCount').textContent = `흔적 ${state.trace.length}개`;
    document.querySelectorAll('.scene-step').forEach((btn, i) => {
      btn.classList.toggle('active', i === state.scene);
      btn.classList.toggle('complete', i < state.scene);
      if (i === state.scene) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
      const progress = i < state.scene ? 1 : i === state.scene ? (Number.isFinite(scenes[i].duration) ? clamp(state.sceneMs / scenes[i].duration, 0, 1) : 0.7) : 0;
      btn.style.setProperty('--progress', progress.toFixed(3));
    });
    if (force) $('memoryStatus').textContent = storage && remembers ? '기억은 이 브라우저 안에만 남습니다' : '기억 저장이 꺼져 있습니다';
  }

  function drawArchive() {
    const w = archiveCanvas.width, h = archiveCanvas.height;
    archiveCtx.clearRect(0, 0, w, h);
    const grad = archiveCtx.createRadialGradient(w * .5, h * .5, 10, w * .5, h * .5, w * .65);
    grad.addColorStop(0, '#1e2945'); grad.addColorStop(1, '#050914');
    archiveCtx.fillStyle = grad; archiveCtx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = ((i * 131 + 29) % 727) / 727 * w;
      const y = ((i * 71 + 17) % 263) / 263 * h;
      archiveCtx.fillStyle = `rgba(185,204,255,${.09 + i % 6 * .025})`;
      archiveCtx.beginPath(); archiveCtx.arc(x, y, .6, 0, TAU); archiveCtx.fill();
    }
    drawTraceOn(archiveCtx, previousTrace, w, h, 'past', .75);
    drawTraceOn(archiveCtx, state.trace, w, h, 'now', .9);
    if (!previousTrace.length && !state.trace.length) {
      archiveCtx.fillStyle = '#93a4c5';
      archiveCtx.textAlign = 'center';
      archiveCtx.font = '17px serif';
      archiveCtx.fillText('아직 기록되지 않은 하늘', w / 2, h / 2);
    }
  }
  function updateArchive() {
    $('rememberToggle').checked = !!storage && remembers;
    $('rememberToggle').disabled = !storage;
    $('archiveSummary').textContent = `이전 방문 ${previousTrace.length}개 · 이번 방문 ${state.trace.length}개. ${previousSavedAt ? `마지막 저장: ${new Date(previousSavedAt).toLocaleDateString('ko-KR')}. ` : ''}이곳의 기록은 브라우저 밖으로 전송되지 않습니다.`;
    $('clearMemoryBtn').disabled = !storage || (!previousTrace.length && !storage.getItem(STORE_KEY) && !storage.getItem(LEGACY_KEY));
    $('storageNotice').textContent = !storage
      ? '이 브라우저에서는 로컬 저장을 사용할 수 없습니다. 현재 체험과 이미지 저장은 계속 이용할 수 있습니다.'
      : remembers
        ? '현재 별자리는 계시 장면에 도달하거나 화면을 떠날 때 이 기기에 자동 저장됩니다. 언제든 삭제할 수 있습니다.'
        : '자동 저장을 껐습니다. 이미 저장한 이전 방문의 기록도 삭제됩니다.';
    drawArchive();
  }
  function openDialog(dialog) {
    if (dialog === $('memoryDialog')) updateArchive();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  $('helpBtn').addEventListener('click', () => openDialog($('helpDialog')));
  $('memoryBtn').addEventListener('click', () => openDialog($('memoryDialog')));
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
    const dialog = $(button.getAttribute('data-close'));
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
  }));
  for (const dialog of [$('helpDialog'), $('memoryDialog')]) {
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }
  $('rememberToggle').addEventListener('change', (e) => {
    if (!storage) return;
    remembers = !!e.target.checked;
    try {
      storage.setItem(PREF_KEY, remembers ? '1' : '0');
      if (!remembers) {
        storage.removeItem(STORE_KEY);
        storage.removeItem(LEGACY_KEY);
        previousTrace = []; previousSavedAt = null;
      } else saveTrace();
    } catch (_) { /* Storage denial is not fatal. */ }
    updateArchive(); updateHud(true);
  });
  $('clearMemoryBtn').addEventListener('click', () => {
    if (!storage) return;
    try { storage.removeItem(STORE_KEY); storage.removeItem(LEGACY_KEY); } catch (_) { /* Ignore. */ }
    previousTrace = []; previousSavedAt = null;
    updateArchive();
  });

  function posterCanvas() {
    const poster = document.createElement('canvas');
    poster.width = 1600; poster.height = 1000;
    const g = poster.getContext('2d');
    const w = poster.width, h = poster.height;
    const background = g.createRadialGradient(w / 2, h * .47, 35, w / 2, h * .47, w * .65);
    background.addColorStop(0, '#1b2543'); background.addColorStop(.45, '#0c1224'); background.addColorStop(1, '#02040a');
    g.fillStyle = background; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 340; i++) {
      const x = ((i * 97 + 37) % 1601), y = ((i * 241 + 59) % 1009);
      g.fillStyle = `rgba(215,230,255,${.12 + (i % 8) * .035})`;
      g.beginPath(); g.arc(x, y, i % 7 === 0 ? 1.6 : .75, 0, TAU); g.fill();
    }
    drawTraceOn(g, previousTrace, w, h, 'past', .68);
    drawTraceOn(g, state.trace, w, h, 'now', 1);
    g.textAlign = 'left';
    g.fillStyle = '#d5e1f6'; g.font = '600 22px sans-serif';
    g.fillText('THE OBSERVER', 86, 89);
    g.font = '22px serif'; g.fillStyle = '#e9d5b7';
    g.fillText('당신이 지나간 자리', 86, 130);
    g.strokeStyle = 'rgba(210,224,255,.23)'; g.beginPath(); g.moveTo(86, 158); g.lineTo(w - 86, 158); g.stroke();
    g.font = '19px sans-serif'; g.fillStyle = '#adbbd4';
    g.fillText(`NOW ${state.trace.length} STARS  /  THEN ${previousTrace.length} STARS`, 86, h - 95);
    g.font = '19px serif';
    g.fillText('우주가 자신을 기억하는 방식', w - 420, h - 95);
    return poster;
  }
  function downloadPoster() {
    try {
      const poster = posterCanvas();
      const name = `observer-constellation-${new Date().toISOString().slice(0, 10)}.png`;
      poster.toBlob((blob) => {
        if (!blob) { $('storageNotice').textContent = '이미지 제작에 실패했습니다. 브라우저를 확인해 주세요.'; return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = name;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, 'image/png');
    } catch (_) { $('storageNotice').textContent = '이 브라우저에서는 PNG 저장이 지원되지 않습니다.'; }
  }
  $('exportBtn').addEventListener('click', downloadPoster);
  $('saveImageBtn').addEventListener('click', downloadPoster);

  function toggleReduce() {
    state.reduced = !state.reduced;
    document.body.classList.toggle('motion-reduced', state.reduced);
    $('motionBtn').setAttribute('aria-pressed', String(state.reduced));
    $('motionBtn').setAttribute('aria-label', state.reduced ? '움직임 다시 사용하기' : '움직임 줄이기');
    $('motionBtn').setAttribute('title', state.reduced ? '움직임 다시 사용하기' : '움직임 줄이기');
    drawFrame();
  }
  $('motionBtn').addEventListener('click', toggleReduce);
  $('motionBtn').setAttribute('aria-pressed', String(state.reduced));
  document.body.classList.toggle('motion-reduced', state.reduced);
  $('startBtn').addEventListener('click', begin);
  $('pauseBtn').addEventListener('click', () => setPause());
  $('restartBtn').addEventListener('click', restart);
  $('sceneNav').addEventListener('click', (e) => {
    const button = e.target.closest('[data-scene]');
    if (button && state.started) switchScene(Number(button.dataset.scene));
  });
  document.addEventListener('keydown', (e) => {
    if (!state.started || e.altKey || e.ctrlKey || e.metaKey) return;
    if ($('helpDialog').open || $('memoryDialog').open) return;
    if (e.target.closest('button,input,textarea,select,a,[contenteditable]')) return;
    if (e.code === 'Space') { e.preventDefault(); setPause(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); switchScene(Math.min(6, state.scene + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); switchScene(Math.max(0, state.scene - 1)); }
  });
  window.addEventListener('pagehide', saveTrace);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { state.lastFrame = performance.now(); });
  reducedMedia.addEventListener?.('change', (event) => {
    // React to system preference changes without overwriting manual toggle.
    if (!state.started) {
      state.reduced = event.matches;
      $('motionBtn').setAttribute('aria-pressed', String(state.reduced));
      document.body.classList.toggle('motion-reduced', state.reduced);
    }
  });

  resize();
  requestAnimationFrame(tick);
})();
