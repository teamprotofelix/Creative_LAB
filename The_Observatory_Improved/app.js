(() => {
  'use strict';
  document.documentElement.classList.add('js-ready');

  // The Observatory — no libraries, API requests, cookies, or tracking.
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const canvas = $('#cosmos');
  const ctx = canvas.getContext('2d', { alpha: false });
  const sections = $$('.chapter');
  const modes = sections.map((section) => section.dataset.mode);
  const navLinks = $$('[data-nav]');
  const progressFill = $('#progressFill');
  const status = $('#chapterStatus');
  const motionButton = $('#motionButton');
  const motionIcon = $('#motionIcon');
  const motionLabel = $('#motionLabel');
  const helpButton = $('#helpButton');
  const helpPanel = $('#helpPanel');
  const helpClose = $('#helpClose');
  const prefersReduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  let W = 1;
  let H = 1;
  let cx = 0;
  let cy = 0;
  let dpi = 1;
  let mode = 'threshold';
  let oldMode = 'threshold';
  let transition = 1;
  let moving = !(prefersReduced && prefersReduced.matches);
  let runningTime = 0;
  let lastFrame = 0;
  let frameRequested = 0;
  let scrollUpdateRequested = false;
  let pointer = { x: -9999, y: -9999, movedAt: -100 };
  let shockwaves = [];
  let toastTimer = 0;

  const PI2 = Math.PI * 2;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function seededRandom(seed) {
    let x = seed >>> 0;
    return () => {
      x += 0x6D2B79F5;
      let t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = seededRandom(0x0B5E9A1);
  const randomBetween = (a, b) => a + (b - a) * rand();
  const backgroundStars = Array.from({ length: 175 }, () => ({
    x: rand(), y: rand(), radius: randomBetween(.35, 1.3), brightness: randomBetween(.12, .74), phase: randomBetween(0, PI2)
  }));
  const particles = Array.from({ length: 300 }, () => ({
    x: rand(), y: rand(), vx: randomBetween(-.007, .007), vy: randomBetween(-.009, .009), size: randomBetween(.65, 1.8), phase: randomBetween(0, PI2)
  }));
  const neurons = Array.from({ length: 75 }, () => {
    const a = rand() * PI2;
    const r = Math.sqrt(rand());
    return { x: .5 + Math.cos(a) * r * .42, y: .5 + Math.sin(a) * r * .39,
      vx: randomBetween(-.007, .007), vy: randomBetween(-.007, .007), excitation: 0 };
  });
  const galaxyStars = Array.from({ length: 940 }, (_, i) => {
    const arm = i % 3;
    const r = Math.pow(rand(), .77);
    return {
      r, a: arm * PI2 / 3 + r * 4.9 + randomBetween(-.6, .6),
      width: randomBetween(.35, 1.6), luminance: randomBetween(.35, 1), hue: rand(), phase: rand() * PI2
    };
  });

  // Conway's Game of Life — intentionally a mathematical metaphor, not a model of consciousness.
  const COLS = 68;
  const ROWS = 42;
  let grid = new Uint8Array(COLS * ROWS);
  let generationTime = 0;
  let generation = 0;
  const glider = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  const rPentomino = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
  function cellIndex(x, y) { return ((y + ROWS) % ROWS) * COLS + ((x + COLS) % COLS); }
  function stamp(pattern, x, y) {
    for (const [dx, dy] of pattern) grid[cellIndex(x + dx, y + dy)] = 1;
  }
  function seedLife() {
    grid.fill(0);
    generation = 0;
    generationTime = 0;
    for (let i = 0; i < 28; i++) {
      const x = Math.floor(rand() * COLS);
      const y = Math.floor(rand() * ROWS);
      stamp(i % 3 === 0 ? rPentomino : glider, x, y);
    }
    for (let k = 0; k < 4; k++) {
      const px = Math.floor(rand() * (COLS - 14));
      const py = Math.floor(rand() * (ROWS - 12));
      for (let y = 0; y < 11; y++) for (let x = 0; x < 13; x++) {
        if (rand() < .22) grid[cellIndex(px + x, py + y)] = 1;
      }
    }
  }
  seedLife();
  function stepLife() {
    const next = new Uint8Array(grid.length);
    let population = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx || dy) neighbors += grid[cellIndex(x + dx, y + dy)];
        }
        const idx = y * COLS + x;
        next[idx] = neighbors === 3 || (grid[idx] === 1 && neighbors === 2) ? 1 : 0;
        population += next[idx];
      }
    }
    grid = next;
    generation++;
    if (population < 8 || generation > 600) seedLife();
  }
  function seedAt(px, py) {
    const x = Math.floor(px / W * COLS);
    const y = Math.floor(py / H * ROWS);
    stamp(glider, x - 1, y - 1);
    stamp(rPentomino, x + 3, y - 2);
    generation = 0;
  }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    cx = W / 2;
    cy = H / 2;
    dpi = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(2500000 / (W * H))));
    if (ctx) {
      canvas.width = Math.round(W * dpi);
      canvas.height = Math.round(H * dpi);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    }
    renderSoon();
  }
  function renderSoon() {
    if (ctx && !frameRequested && !document.hidden) frameRequested = requestAnimationFrame(frame);
  }
  function setMoving(next) {
    moving = !!next;
    motionButton.setAttribute('aria-pressed', String(!moving));
    motionIcon.textContent = moving ? 'Ⅱ' : '▶';
    motionLabel.textContent = moving ? '움직임 정지' : '움직임 재생';
    motionButton.setAttribute('title', moving ? '애니메이션 일시정지' : '애니메이션 재생');
    lastFrame = 0;
    if (!moving) transition = 1;
    renderSoon();
  }
  motionButton.addEventListener('click', () => setMoving(!moving));
  if (prefersReduced) {
    const onPreferenceChange = (event) => setMoving(!event.matches);
    if (prefersReduced.addEventListener) prefersReduced.addEventListener('change', onPreferenceChange);
    else if (prefersReduced.addListener) prefersReduced.addListener(onPreferenceChange);
  }
  document.addEventListener('visibilitychange', () => {
    lastFrame = 0;
    if (!document.hidden) renderSoon();
  });
  window.addEventListener('resize', resize, { passive: true });

  function changeMode(nextMode) {
    if (!nextMode || mode === nextMode) return;
    oldMode = mode;
    mode = nextMode;
    transition = moving ? 0 : 1;
    renderSoon();
  }
  function updateScrollState() {
    scrollUpdateRequested = false;
    const at = window.innerHeight * .47;
    let best = sections[0];
    let bestDistance = Infinity;
    for (const section of sections) {
      const r = section.getBoundingClientRect();
      const distance = r.top <= at && r.bottom >= at ? 0 : Math.min(Math.abs(r.top - at), Math.abs(r.bottom - at));
      if (distance < bestDistance) { best = section; bestDistance = distance; }
    }
    const nextMode = best.dataset.mode;
    changeMode(nextMode);
    const index = modes.indexOf(nextMode);
    status.textContent = String(index + 1).padStart(2, '0') + ' / 06';
    navLinks.forEach((link) => {
      if (link.dataset.nav === nextMode) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progressFill.style.transform = 'scaleX(' + clamp(window.scrollY / maxScroll, 0, 1).toFixed(4) + ')';
    if (!('IntersectionObserver' in window)) {
      for (const section of sections) if (section.getBoundingClientRect().top < window.innerHeight * .9) section.classList.add('is-visible');
    }
  }
  function onScroll() {
    if (!scrollUpdateRequested) {
      scrollUpdateRequested = true;
      requestAnimationFrame(updateScrollState);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach((section) => section.classList.add('is-visible'));
  }
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!helpPanel.hidden) return;
    event.preventDefault();
    const index = modes.indexOf(mode);
    const next = clamp(index + (event.key === 'ArrowDown' ? 1 : -1), 0, modes.length - 1);
    sections[next].scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' });
  });

  function toggleHelp(force) {
    const open = typeof force === 'boolean' ? force : helpPanel.hidden;
    helpPanel.hidden = !open;
    helpButton.setAttribute('aria-expanded', String(open));
    if (open) helpClose.focus();
    else helpButton.focus();
  }
  helpButton.addEventListener('click', () => toggleHelp());
  helpClose.addEventListener('click', () => toggleHelp(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !helpPanel.hidden) toggleHelp(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!helpPanel.hidden && !helpPanel.contains(event.target) && !helpButton.contains(event.target)) toggleHelp(false);
  }, { passive: true });

  function addWave(x, y, tone = 'violet') {
    shockwaves.push({ x, y, age: 0, tone });
    if (shockwaves.length > 12) shockwaves.shift();
    renderSoon();
  }
  document.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.movedAt = performance.now() / 1000;
  }, { passive: true });
  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button,a,input,.help-panel')) return;
    const section = event.target.closest('.chapter');
    if (!section) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.movedAt = performance.now() / 1000;
    const active = section.dataset.mode;
    if (active === 'life') seedAt(pointer.x, pointer.y);
    if (active === 'mind') {
      for (const neuron of neurons) {
        const d = Math.hypot(neuron.x * W - pointer.x, neuron.y * H - pointer.y);
        neuron.excitation = Math.max(neuron.excitation, clamp(1 - d / 250, 0, 1));
      }
    }
    addWave(pointer.x, pointer.y, active === 'life' || active === 'question' ? 'mint' : 'violet');
    if (!moving) renderSoon();
  }, { passive: true });
  $('#reseedButton').addEventListener('click', () => {
    seedLife();
    addWave(cx, cy, 'mint');
    showToast('새로운 세포의 시작을 관측합니다.');
  });

  function drawBackdrop() {
    ctx.fillStyle = '#05040c';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(cx, H * .48, 0, cx, H * .48, Math.max(W, H) * .68);
    glow.addColorStop(0, mode === 'life' || mode === 'question' ? 'rgba(11,53,56,.29)' : 'rgba(43,27,78,.29)');
    glow.addColorStop(.65, 'rgba(14,12,31,.15)');
    glow.addColorStop(1, 'rgba(5,4,12,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const flicker = moving ? runningTime : 1;
    ctx.fillStyle = '#b7acdb';
    for (const star of backgroundStars) {
      ctx.globalAlpha = star.brightness * (.69 + .31 * Math.sin(flicker * .6 + star.phase));
      ctx.fillRect(star.x * W, star.y * H, star.radius, star.radius);
    }
    ctx.globalAlpha = 1;
  }
  function circle(x, y, radius, color) {
    if (radius <= 0) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, PI2);
    ctx.fill();
  }
  function halo(x, y, radius, color0, color1) {
    if (radius <= 0) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color0);
    gradient.addColorStop(1, color1);
    circle(x, y, radius, gradient);
  }
  function drawThreshold(alpha) {
    const pulse = 1 + Math.sin(runningTime * 1.1) * .07;
    const radius = Math.min(W, H) * .25 * pulse;
    halo(cx, cy, radius, `rgba(192,153,255,${.38 * alpha})`, 'rgba(97,64,200,0)');
    halo(cx, cy, radius * .45, `rgba(242,231,255,${.32 * alpha})`, 'rgba(182,145,255,0)');
    ctx.strokeStyle = `rgba(189,160,255,${.32 * alpha})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (.5 + i * .28), radius * (.12 + i * .05), runningTime * .04 + i * .9, 0, PI2);
      ctx.stroke();
    }
    circle(cx, cy, 2.7 + Math.sin(runningTime * 1.9) * .5, `rgba(255,255,255,${alpha})`);
  }
  function updateQuantum(dt) {
    for (const p of particles) {
      p.x = (p.x + p.vx * dt + 1) % 1;
      p.y = (p.y + p.vy * dt + 1) % 1;
    }
  }
  function drawQuantum(alpha) {
    const count = W < 600 ? 180 : particles.length;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const x = p.x * W;
      const y = p.y * H;
      const dist = Math.hypot(pointer.x - x, pointer.y - y);
      const near = clamp(1 - dist / 235, 0, 1);
      const drift = Math.sin(runningTime * 1.5 + p.phase) * 3;
      if (near > .08) {
        ctx.strokeStyle = `rgba(177,155,252,${alpha * near * .3})`;
        ctx.lineWidth = .65;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (pointer.x - x) * near * .13, y + (pointer.y - y) * near * .13);
        ctx.stroke();
      }
      circle(x + drift, y, p.size + near * 1.35, `rgba(200,182,255,${alpha * (.26 + near * .58)})`);
    }
  }
  function updateLife(dt) {
    generationTime += dt;
    if (generationTime >= .19) {
      stepLife();
      generationTime %= .19;
    }
  }
  function drawLife(alpha) {
    const cw = W / COLS;
    const ch = H / ROWS;
    ctx.lineWidth = .5;
    ctx.strokeStyle = `rgba(105,209,202,${alpha * .064})`;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) { ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, H); }
    for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * ch); ctx.lineTo(W, y * ch); }
    ctx.stroke();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!grid[y * COLS + x]) continue;
      const px = (x + .5) * cw;
      const py = (y + .5) * ch;
      const near = clamp(1 - Math.hypot(pointer.x - px, pointer.y - py) / 220, 0, 1);
      ctx.fillStyle = `rgba(135,226,222,${alpha * (.34 + near * .57)})`;
      ctx.fillRect(x * cw + .7, y * ch + .7, Math.max(.4, cw - 1.4), Math.max(.4, ch - 1.4));
    }
  }
  function updateMind(dt) {
    for (const n of neurons) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < .08 || n.x > .92) { n.vx *= -1; n.x = clamp(n.x, .08, .92); }
      if (n.y < .08 || n.y > .92) { n.vy *= -1; n.y = clamp(n.y, .08, .92); }
      const distance = Math.hypot(pointer.x - n.x * W, pointer.y - n.y * H);
      if (distance < 190) n.excitation = Math.max(n.excitation, (1 - distance / 190) * .92);
      n.excitation *= Math.exp(-dt * 1.55);
    }
  }
  function drawMind(alpha) {
    const count = W < 620 ? 53 : neurons.length;
    const coords = neurons.slice(0, count).map((n) => [n.x * W, n.y * H]);
    const threshold = W < 620 ? 102 : 145;
    for (let i = 0; i < count; i++) {
      const a = neurons[i];
      for (let j = i + 1; j < count; j++) {
        const b = neurons[j];
        const dx = coords[i][0] - coords[j][0];
        const dy = coords[i][1] - coords[j][1];
        const d2 = dx * dx + dy * dy;
        if (d2 >= threshold * threshold) continue;
        const strength = 1 - Math.sqrt(d2) / threshold;
        const activity = (a.excitation + b.excitation) * .5;
        ctx.lineWidth = .55 + activity * 1.5;
        ctx.strokeStyle = `rgba(162,139,252,${alpha * strength * (.15 + activity * .67)})`;
        ctx.beginPath();
        ctx.moveTo(coords[i][0], coords[i][1]);
        ctx.lineTo(coords[j][0], coords[j][1]);
        ctx.stroke();
      }
    }
    for (let i = 0; i < count; i++) {
      const n = neurons[i];
      const x = coords[i][0];
      const y = coords[i][1];
      if (n.excitation > .15) halo(x, y, 12 + n.excitation * 20,
        `rgba(183,162,255,${alpha * n.excitation * .23})`, 'rgba(183,162,255,0)');
      circle(x, y, 1.45 + n.excitation * 2.65, `rgba(225,211,255,${alpha * (.48 + n.excitation * .5)})`);
    }
  }
  function drawGalaxy(alpha) {
    const R = Math.min(W * .54, H * .5, 440);
    halo(cx, cy, R * .4, `rgba(255,203,151,${alpha * .34})`, 'rgba(227,141,105,0)');
    halo(cx, cy, R * .17, `rgba(255,245,228,${alpha * .56})`, 'rgba(251,186,126,0)');
    const driftX = pointer.x > 0 ? (pointer.x - cx) * .018 : 0;
    const driftY = pointer.y > 0 ? (pointer.y - cy) * .018 : 0;
    const count = W < 620 ? 560 : galaxyStars.length;
    for (let i = 0; i < count; i++) {
      const s = galaxyStars[i];
      const a = s.a + runningTime * (.012 + (1 - s.r) * .012);
      const r = s.r * R;
      const x = cx + Math.cos(a) * r + driftX;
      const y = cy + Math.sin(a) * r * .52 + driftY;
      const twinkle = .69 + .31 * Math.sin(runningTime * .85 + s.phase);
      const bright = s.luminance * twinkle;
      const color = s.hue > .73 ? `rgba(255,210,167,${alpha * bright})` : `rgba(207,200,255,${alpha * bright})`;
      circle(x, y, s.width * (1 + (1 - s.r) * .35), color);
    }
  }
  function drawQuestion(alpha) {
    const limit = Math.min(W, H) * .45;
    halo(cx, cy, limit * .4, `rgba(74,214,198,${alpha * .13})`, 'rgba(60,174,175,0)');
    for (let ring = 0; ring < 5; ring++) {
      const radius = limit * (.24 + ring * .17);
      const count = 26 + ring * 15;
      const turn = runningTime * (ring % 2 === 0 ? .045 : -.038);
      for (let i = 0; i < count; i++) {
        const a = i / count * PI2 + turn;
        const flicker = .4 + .6 * Math.sin(i * .61 + ring + runningTime * .6) ** 2;
        circle(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius,
          1.05 + ring * .05, `rgba(114,228,213,${alpha * flicker * .52})`);
      }
    }
    circle(cx, cy, 3, `rgba(198,255,243,${alpha * .88})`);
  }
  const drawers = { threshold: drawThreshold, quantum: drawQuantum, life: drawLife,
    mind: drawMind, galaxy: drawGalaxy, question: drawQuestion };
  function drawWaves() {
    for (const wave of shockwaves) {
      const t = clamp(wave.age / 1.75, 0, 1);
      const radius = 16 + t * Math.max(W, H) * .47;
      const opacity = Math.pow(1 - t, 1.7);
      const rgb = wave.tone === 'mint' ? '137,233,222' : '195,167,255';
      ctx.strokeStyle = `rgba(${rgb},${opacity * .66})`;
      ctx.lineWidth = 1.8 * (1 - t) + .3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, PI2);
      ctx.stroke();
    }
  }
  function update(dt) {
    runningTime += dt;
    if (transition < 1) transition = Math.min(1, transition + dt / 1.05);
    if (mode === 'quantum' || (transition < 1 && oldMode === 'quantum')) updateQuantum(dt);
    if (mode === 'life' || (transition < 1 && oldMode === 'life')) updateLife(dt);
    if (mode === 'mind' || (transition < 1 && oldMode === 'mind')) updateMind(dt);
    for (const wave of shockwaves) wave.age += dt;
    shockwaves = shockwaves.filter((wave) => wave.age < 1.75);
  }
  function render() {
    if (!ctx) return;
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    ctx.globalAlpha = 1;
    drawBackdrop();
    if (transition < 1 && oldMode !== mode) {
      const t = transition * transition * (3 - 2 * transition);
      drawers[oldMode]?.(1 - t);
      drawers[mode]?.(t);
    } else {
      drawers[mode]?.(1);
    }
    drawWaves();
  }
  function frame(timestamp) {
    frameRequested = 0;
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0;
    lastFrame = timestamp;
    if (moving) update(dt);
    render();
    if (moving && !document.hidden) renderSoon();
  }

  // The reflection engine is deliberately local and rule-based, not an AI model.
  const themes = [
    {
      pattern: /시간|미래|과거|현재|순간|영원|기억|늙|노화|나이/,
      responses: [
        '시계가 측정하는 시간과 마음이 경험하는 시간은 같은 속도로 흐르지 않습니다.\n우리가 오래 기억하는 순간은 반드시 오래 지속된 순간은 아닙니다.',
        '미래는 아직 오지 않았고 과거는 손에 잡히지 않습니다.\n그럼에도 우리는 두 시간을 마음에 품은 채 지금을 선택합니다.',
        '시간을 붙잡을 수는 없지만, 어떤 순간에 머물러 바라볼지는 정할 수 있습니다.\n어쩌면 오래 산다는 것은 더 많은 순간을 소유하는 일이 아닐지도 모릅니다.'
      ],
      prompts: ['오늘의 한 장면을 느리게 바라본다면 무엇이 달라질까요?', '십 년 뒤의 나는 지금 무엇을 기억할까요?', '잃어버린 시간과 충분히 보낸 시간의 차이는 무엇일까요?']
    },
    {
      pattern: /죽음|살아|삶|생명|존재|태어|끝|사라|유한/,
      responses: [
        '끝이 있다는 사실이 시작을 지우지는 않습니다.\n오히려 유한함 때문에 오늘의 작은 선택이 단 한 번뿐인 형태를 얻습니다.',
        '살아 있다는 것은 완성된 상태가 아니라 매 순간 이어지는 과정입니다.\n우리는 변화하면서도 자신을 같은 이름으로 부릅니다.',
        '어떤 것이 사라진 뒤에도 그로 인해 달라진 것들은 남습니다.\n존재의 무게는 지속한 시간만으로 측정되지 않습니다.'
      ],
      prompts: ['오늘 살아 있음을 가장 선명하게 느낀 순간은?', '나의 변화 중에서도 계속 지키고 싶은 것은?', '나는 무엇을 남기기보다 무엇을 건네고 싶을까요?']
    },
    {
      pattern: /마음|의식|생각|인지|기억|나 자신|자아|나란|나는 누구|정체성/,
      responses: [
        '생각을 바라보는 순간, 우리는 생각과 자신 사이에 작은 거리를 만듭니다.\n그 거리에서 선택이 시작될 수도 있습니다.',
        '마음은 한 가지 목소리보다 수많은 기억과 감각의 합주에 가깝습니다.\n불협화음 역시 그 안에 자리를 가질 수 있습니다.',
        '어제의 나와 오늘의 나는 같으면서도 다릅니다.\n정체성은 변하지 않는 돌보다 변화 속에 남는 선율일지도 모릅니다.'
      ],
      prompts: ['지금 내 안에서 가장 조용한 생각은 무엇인가요?', '내가 믿는 ‘나’는 무엇에 의해 달라질까요?', '생각을 판단하지 않고 바라보면 무엇이 보이나요?']
    },
    {
      pattern: /사랑|관계|친구|가족|외로|그리움|함께|믿음|소중/,
      responses: [
        '가까워진다는 것은 서로를 완전히 아는 일이 아닐지도 모릅니다.\n다 알 수 없는 마음 곁에 계속 머물기를 선택하는 일일 수 있습니다.',
        '누군가를 사랑한다는 것은 그를 나의 세계에 넣는 동시에, 그의 세계가 따로 있음을 존중하는 일입니다.',
        '우리가 서로에게 남기는 것은 거창한 약속만이 아닙니다.\n무심히 건넨 작은 친절도 어떤 하루의 방향을 바꿉니다.'
      ],
      prompts: ['지금 고마움을 전하고 싶은 사람은 누구인가요?', '상대의 세계를 온전히 존중하는 방법은 무엇일까요?', '오늘 건넬 수 있는 작은 친절은 무엇일까요?']
    },
    {
      pattern: /선택|자유|운명|결정|가능성|우연|확률|필연|우주/,
      responses: [
        '가능성은 모든 길을 동시에 걷게 해주지 않습니다.\n하나를 선택하기 때문에, 다른 길들이 삶의 주변에서 빛납니다.',
        '모든 것을 통제할 수 없다는 사실과 아무것도 선택할 수 없다는 말은 다릅니다.\n우리는 주어진 조건 속에서도 다음 한 걸음을 고릅니다.',
        '우연과 필연을 명확히 구분하지 못해도 괜찮습니다.\n결과를 모두 알지 못한 채 움직이는 것이 실제의 삶이니까요.'
      ],
      prompts: ['완벽한 확신이 없어도 선택할 수 있는 일은?', '내가 바꿀 수 있는 가장 작은 변수는 무엇일까요?', '선택하지 않은 길을 어떻게 온화하게 바라볼 수 있을까요?']
    },
    {
      pattern: /행복|슬픔|불안|두려|걱정|평안|평화|아픔|상처|희망/,
      responses: [
        '감정은 마음에 남아 있으라는 명령이 아니라, 지금 무언가 중요하다는 신호일 수 있습니다.\n그 신호를 억지로 지우지 않고 바라봐도 됩니다.',
        '평안은 모든 파도가 멈춘 바다만을 뜻하지 않습니다.\n파도가 있어도 나를 잠시 놓아줄 자리를 찾는 일일 수 있습니다.',
        '오늘의 무게를 오늘 안에 모두 해결할 필요는 없습니다.\n어떤 질문은 해답보다 안전한 여백을 먼저 필요로 합니다.'
      ],
      prompts: ['지금 나에게 가장 필요한 작은 여백은 무엇인가요?', '나를 조금 편안하게 하는 감각 하나를 찾아볼까요?', '해결하지 않아도 오늘 잠시 내려놓을 수 있는 것은?']
    },
    {
      pattern: /의미|목적|가치|왜|이유|진실|정답|무엇을 위해/,
      responses: [
        '의미는 발견되기도 하지만, 반복해서 돌보는 동안 만들어지기도 합니다.\n우리가 중요하게 여기는 것은 우리가 시간을 건네는 곳에서 자랍니다.',
        '모든 질문에 단 하나의 답이 필요한 것은 아닙니다.\n어떤 질문은 서로 다른 삶을 비추는 창이 됩니다.',
        '정답을 찾는 일과 더 좋은 질문을 만드는 일은 다릅니다.\n후자는 삶의 방향을 바꾸면서도 답을 강요하지 않습니다.'
      ],
      prompts: ['내가 시간을 들여 돌보고 싶은 것은 무엇인가요?', '이 질문이 다른 사람에게는 어떻게 들릴까요?', '정답을 잠시 내려놓으면 어떤 선택지가 보이나요?']
    },
    {
      pattern: /창의|상상|예술|만들|발명|새로|아름다|꿈/,
      responses: [
        '전혀 없던 것을 만든다고 생각하지만, 창의는 멀리 떨어진 것들을 새롭게 연결하는 순간에도 탄생합니다.',
        '상상은 현실을 부정하는 힘이 아니라, 아직 보이지 않는 다른 배치를 실험하는 힘입니다.\n작은 장난 같은 생각에서 새로운 길이 시작됩니다.',
        '아름다움은 때때로 익숙한 것을 처음 보는 눈에서 나타납니다.\n바깥세상이 바뀌지 않아도 관측의 각도는 달라질 수 있습니다.'
      ],
      prompts: ['서로 관계없어 보이는 두 가지를 연결하면?', '익숙한 물건을 처음 본 존재처럼 바라본다면?', '아직 설명할 수 없지만 계속 끌리는 것은 무엇일까요?']
    }
  ];
  const general = {
    responses: [
      '질문 하나를 오래 품는다는 것은, 그 질문이 우리를 조금씩 바꾸도록 자리를 내어주는 일일지 모릅니다.\n지금은 결론보다 다음 시선을 선택해 보세요.',
      '같은 풍경도 어느 방향에서 바라보느냐에 따라 달라집니다.\n어쩌면 답을 바꾸기 전에 시선을 조금 옮겨 볼 수 있습니다.',
      '아직 이해하지 못한 것이 있다는 사실은 부족함의 증거만은 아닙니다.\n그 자리에 호기심이 머물 수 있다는 뜻이기도 합니다.'
    ],
    prompts: ['이 질문의 반대편에서 보면 무엇이 보일까요?', '이 질문에서 정말 중요한 단어는 무엇인가요?', '지금 필요한 것은 해답인가요, 아니면 새로운 시선인가요?']
  };
  const lenses = [
    '잠시 거리를 바꿔 보세요. 아주 가까이서 본 장면과 우주만큼 멀리서 본 장면이 서로 다른 이야기를 들려줄 수 있습니다.',
    '이 질문을 정답이 아니라 한 편의 지도라고 생각해 보세요. 어디에 도착할지보다 지금 어느 방향을 보고 있는지가 드러납니다.',
    '이 질문을 누군가에게 선물한다면 어떨까요? 서로 다른 대답을 들으며 아직 보이지 않던 길을 발견할 수 있습니다.',
    '답이 즉시 나타나지 않아도 질문의 가치는 사라지지 않습니다. 잠시 침묵을 들여다보는 것도 하나의 관측입니다.',
    '질문 속의 당연한 전제를 하나 바꿔 보세요. 익숙한 문장이 전혀 다른 문이 될 수 있습니다.'
  ];
  function hashQuestion(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  const form = $('#questionForm');
  const field = $('#questionField');
  const charCount = $('#characterCount');
  const answerCard = $('#answerCard');
  const reflectedQuestion = $('#reflectedQuestion');
  const answerText = $('#answerText');
  const answerPrompt = $('#answerPrompt');
  const reflectionNumber = $('#reflectionNumber');
  let latestQuestion = '';
  let perspective = 0;
  let currentReflection = '';
  function showReflection() {
    const category = themes.find((entry) => entry.pattern.test(latestQuestion)) || general;
    const seed = hashQuestion(latestQuestion);
    const primary = category.responses[(seed + perspective) % category.responses.length];
    const lens = lenses[(seed + perspective) % lenses.length];
    const prompt = category.prompts[(seed + perspective) % category.prompts.length];
    reflectionNumber.textContent = String(perspective + 1).padStart(2, '0');
    reflectedQuestion.textContent = '“' + latestQuestion + '”';
    answerText.textContent = primary + '\n\n' + lens;
    answerPrompt.textContent = '다음 질문 · ' + prompt;
    currentReflection = '관측소 · THE OBSERVATORY\n\n질문: ' + latestQuestion + '\n\n' + primary + '\n\n' + lens + '\n\n' + prompt + '\n\n이 텍스트는 기기 안에서 선택된 사유의 제안입니다.';
    answerCard.hidden = false;
    addWave(cx, cy, 'mint');
    // Ensure the answer is reachable on small screens without hijacking keyboard focus.
    if (window.innerWidth < 740) answerCard.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'nearest' });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = field.value.trim();
    if (!value) { field.focus(); return; }
    latestQuestion = value;
    perspective = 0;
    showReflection();
  });
  field.addEventListener('input', () => { charCount.textContent = field.value.length + ' / 180'; });
  $('#anotherButton').addEventListener('click', () => { if (latestQuestion) { perspective++; showReflection(); } });
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2700);
  }
  $('#copyButton').addEventListener('click', async () => {
    if (!currentReflection) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(currentReflection);
      showToast('관측 내용을 복사했습니다.');
    } catch (_) {
      // Needed for some local file:// and older browser environments.
      const temporary = document.createElement('textarea');
      temporary.value = currentReflection;
      temporary.setAttribute('readonly', '');
      temporary.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(temporary);
      temporary.select();
      let success = false;
      try { success = document.execCommand('copy'); } catch (_) { /* unavailable */ }
      temporary.remove();
      showToast(success ? '관측 내용을 복사했습니다.' : '복사할 수 없습니다. 텍스트 저장을 이용해 주세요.');
    }
  });
  $('#saveButton').addEventListener('click', () => {
    if (!currentReflection) return;
    const blob = new Blob(['\uFEFF' + currentReflection], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'observatory-reflection.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    showToast('관측 기록을 텍스트로 저장합니다.');
  });

  // Ephemeral decorative label: not a persistent visitor ID.
  const bytes = new Uint8Array(3);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  $('#visitorId').textContent = '오늘의 관측자 · ' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  setMoving(moving);
  resize();
  updateScrollState();
  // Avoid blank opening screen when JS runs before intersection observer notifications.
  sections[0].classList.add('is-visible');
})();
