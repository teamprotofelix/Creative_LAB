(() => {
  'use strict';

  const canvas = document.getElementById('universeCanvas');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  const dom = {
    intro: document.getElementById('intro'),
    message: document.getElementById('message'),
    gestureHint: document.getElementById('gestureHint'),
    gestureText: document.getElementById('gestureText'),
    shapeCaption: document.getElementById('shapeCaption'),
    sound: document.getElementById('soundButton'),
    motion: document.getElementById('motionButton'),
    reseed: document.getElementById('reseedButton'),
    status: document.getElementById('systemStatus'),
    statusLabel: document.getElementById('statusLabel'),
    modes: [...document.querySelectorAll('[data-mode]')],
  };

  if (!ctx) {
    dom.status.textContent = '그래픽을 시작할 수 없습니다. Canvas 2D를 지원하는 브라우저가 필요합니다.';
    dom.gestureText.textContent = 'Canvas를 사용할 수 없는 브라우저입니다.';
    return;
  }

  const TAU = Math.PI * 2;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const FIXED_DT = 1 / 60;
  const PENTATONIC = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  const COLORS = [
    [103, 228, 255], [167, 147, 255], [134, 182, 255], [255, 212, 145],
  ];
  const MODES = {
    sphere: { name: '숨 쉬는 우주', subtitle: 'BREATHING UNIVERSE', index: '01 / 03', intro: '모든 빛은 하나의 중심을 향합니다.' },
    bloom: { name: '빛의 개화', subtitle: 'THE LUMINOUS BLOOM', index: '02 / 03', intro: '아무것도 아닌 곳에서 꽃이 피어납니다.' },
    orbit: { name: '영원의 궤도', subtitle: 'ORBIT OF ETERNITY', index: '03 / 03', intro: '우리는 서로의 중력 속에 있습니다.' },
  };
  const MESSAGES = [
    '당신이 여기 있군요', '우리는 모두 연결되어 있어요', '빛은 당신에게서 시작됩니다',
    '어둠에도 고유한 언어가 있어요', '모든 것이 천천히 숨을 쉽니다',
    '우주는 당신의 존재를 기억합니다', '작은 움직임이 세계를 바꿉니다',
    'the universe is listening', 'everything is connected', 'you are made of starlight',
  ];

  const isCompact = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hardwareThreads = navigator.hardwareConcurrency || 4;
  const count = reducedMotion ? (isCompact ? 350 : 760)
    : isCompact ? (hardwareThreads <= 4 ? 480 : 680) : (hardwareThreads <= 4 ? 880 : 1200);
  const targetFPS = isCompact ? 30 : 60;
  const sprites = COLORS.map(makeSprite);
  const pointer = { x: -10000, y: -10000, active: false, id: null };
  const particles = [];
  const shockwaves = [];
  const stars = [];

  let width = 1;
  let height = 1;
  let dpr = 1;
  let time = 0;
  let lastFrame = 0;
  let accumulator = 0;
  let raf = null;
  let isPaused = reducedMotion;
  let audioEnabled = false;
  let audioContext = null;
  let audioNote = 0;
  let hasInteracted = false;
  let idleSeconds = 0;
  let messageSeconds = 0;
  let currentMode = 'sphere';
  let lastTapAt = -9999;
  let lastTapX = -9999;
  let lastTapY = -9999;
  let introTimer = null;

  function makeSprite([r, g, b]) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 72;
    const gctx = sprite.getContext('2d');
    const gradient = gctx.createRadialGradient(36, 36, 0, 36, 36, 36);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(.10, `rgba(${r},${g},${b},.91)`);
    gradient.addColorStop(.23, `rgba(${r},${g},${b},.44)`);
    gradient.addColorStop(.54, `rgba(${r},${g},${b},.09)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    gctx.fillStyle = gradient;
    gctx.fillRect(0, 0, 72, 72);
    return sprite;
  }

  function radius() { return Math.min(width * (isCompact ? .43 : .34), height * .32); }

  function homeFor(p, mode, out) {
    const R = radius();
    if (mode === 'sphere') {
      out[0] = p.ux * R; out[1] = p.uy * R; out[2] = p.uz * R;
    } else if (mode === 'bloom') {
      const a = Math.atan2(p.uy, p.ux);
      const ring = Math.sqrt(Math.max(0, 1 - p.uz * p.uz));
      const petals = 1 + .34 * Math.cos(a * 7) * ring * ring;
      out[0] = p.ux * R * petals;
      out[1] = p.uy * R * petals;
      out[2] = p.uz * R * .82 + Math.sin(a * 7) * R * .095 * ring;
    } else {
      const u = p.orbitU, v = p.orbitV;
      const big = R * .72, small = R * .265;
      out[0] = (big + small * Math.cos(v)) * Math.cos(u);
      out[1] = (big + small * Math.cos(v)) * Math.sin(u);
      out[2] = small * Math.sin(v);
    }
  }

  function seedParticles(explode = true) {
    const fromCenter = explode || particles.length === 0;
    particles.length = 0;
    const out = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const uz = 1 - 2 * (i + .5) / count;
      const band = Math.sqrt(1 - uz * uz);
      const theta = i * GOLDEN;
      const p = {
        ux: Math.cos(theta) * band, uy: Math.sin(theta) * band, uz,
        orbitU: theta, orbitV: i * 2.5387,
        hx: 0, hy: 0, hz: 0, destX: 0, destY: 0, destZ: 0,
        x: width * .5, y: height * .5, vx: 0, vy: 0,
        prevX: width * .5, prevY: height * .5,
        phase: Math.random() * TAU,
        size: .7 + Math.random() * .65,
        color: Math.random() < .046 ? 3 : Math.floor(Math.random() * 3),
      };
      homeFor(p, currentMode, out);
      p.hx = p.destX = out[0];
      p.hy = p.destY = out[1];
      p.hz = p.destZ = out[2];
      if (fromCenter && !reducedMotion) {
        const dir = Math.atan2(out[1], out[0]) + (Math.random() - .5) * .7;
        const kick = 1.4 + Math.random() * 3.8;
        p.vx = Math.cos(dir) * kick;
        p.vy = Math.sin(dir) * kick;
      } else {
        p.x += out[0]; p.y += out[1];
        p.prevX = p.x; p.prevY = p.y;
      }
      particles.push(p);
    }
  }

  function resize() {
    const oldW = width, oldH = height;
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    const nativeDpr = Math.min(window.devicePixelRatio || 1, 1.75);
    dpr = Math.max(.65, Math.min(nativeDpr, Math.sqrt(3200000 / (width * height))));
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (particles.length) {
      const out = [0, 0, 0];
      for (const p of particles) {
        p.x = (p.x / oldW) * width;
        p.y = (p.y / oldH) * height;
        p.prevX = p.x;
        p.prevY = p.y;
        homeFor(p, currentMode, out);
        p.destX = p.hx = out[0];
        p.destY = p.hy = out[1];
        p.destZ = p.hz = out[2];
      }
      shockwaves.length = 0;
    }
    stars.length = 0;
    for (let i = 0; i < (isCompact ? 90 : 160); i++) {
      stars.push({ x: Math.random() * width, y: Math.random() * height,
        r: Math.random() * 1.1 + .2, phase: Math.random() * TAU, a: .15 + Math.random() * .30 });
    }
    if (isPaused || document.hidden) render();
  }

  function changeMode(mode) {
    if (!(mode in MODES)) return;
    currentMode = mode;
    const data = MODES[mode];
    dom.shapeCaption.querySelector('.caption-index').textContent = data.index;
    dom.shapeCaption.querySelector('.caption-title').textContent = data.name;
    dom.shapeCaption.querySelector('.caption-desc').textContent = data.subtitle;
    dom.statusLabel.textContent = `LIVING SYSTEM · ${data.index.slice(0, 2)}`;
    dom.modes.forEach(btn => {
      const selected = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    const out = [0, 0, 0];
    for (const p of particles) {
      homeFor(p, mode, out);
      p.destX = out[0]; p.destY = out[1]; p.destZ = out[2];
    }
    awaken();
    showMessage(data.intro, 3.2);
    dom.status.textContent = `형태 변경: ${data.name}`;
    if (isPaused) render();
  }

  function shock(x, y, multiplier = 1) {
    if (shockwaves.length >= 22) shockwaves.shift();
    shockwaves.push({ x, y, r: 0, life: 1, strength: multiplier, maxR: Math.min(width, height) * .8 });
  }

  function awaken() {
    if (!hasInteracted) {
      hasInteracted = true;
      dom.gestureHint.classList.add('is-hidden');
    }
    dom.intro.classList.add('is-gone');
    document.body.classList.add('has-begun');
    if (introTimer !== null) { clearTimeout(introTimer); introTimer = null; }
  }

  function showMessage(text, seconds = 3) {
    dom.message.textContent = text;
    dom.message.classList.add('is-visible');
    messageSeconds = seconds;
  }

  function setSound(enabled) {
    audioEnabled = enabled;
    document.body.classList.toggle('sound-enabled', enabled);
    dom.sound.setAttribute('aria-pressed', String(enabled));
    dom.sound.setAttribute('aria-label', enabled ? '사운드 끄기' : '사운드 켜기');
    dom.sound.title = enabled ? '사운드 끄기 (M)' : '사운드 켜기 (M)';
    if (enabled) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) throw new Error('Web Audio unavailable');
        if (!audioContext) audioContext = new Ctor();
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            if (audioEnabled) tone();
          }).catch(() => {
            audioEnabled = false;
            document.body.classList.remove('sound-enabled');
            dom.sound.setAttribute('aria-pressed', 'false');
            dom.sound.setAttribute('aria-label', '사운드 사용 불가');
            dom.status.textContent = '오디오 재생이 브라우저에 의해 제한되었습니다.';
          });
        } else {
          tone();
        }
      } catch (_) {
        audioEnabled = false;
        document.body.classList.remove('sound-enabled');
        dom.sound.setAttribute('aria-pressed', 'false');
        dom.sound.setAttribute('aria-label', '사운드 사용 불가');
        dom.status.textContent = '이 브라우저에서 오디오를 사용할 수 없습니다.';
        return;
      }
    }
    dom.status.textContent = audioEnabled ? '사운드를 켰습니다.' : '사운드를 껐습니다.';
  }

  function tone(scale = 1) {
    if (!audioEnabled || !audioContext || audioContext.state !== 'running') return;
    try {
      const t = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(PENTATONIC[audioNote++ % PENTATONIC.length] * scale, t);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.05, t + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, t + 1.1);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(t); oscillator.stop(t + 1.13);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch (_) { /* Visual interaction remains available if audio is blocked. */ }
  }

  function supernova(x, y) {
    shock(x, y, 2.3);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + time * .6;
      shock(x + Math.cos(a) * 50, y + Math.sin(a) * 50, 1.5);
    }
    for (const p of particles) {
      const dx = p.x - x, dy = p.y - y;
      const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
      const kick = 10 * Math.min(1, 250 / dist);
      p.vx += dx / dist * kick;
      p.vy += dy / dist * kick;
    }
    tone(1.5);
    showMessage('별의 탄생은 언제나 작은 떨림에서 시작됩니다', 3.6);
  }

  function interact(x, y) {
    awaken();
    idleSeconds = 0;
    const now = performance.now();
    const double = now - lastTapAt <= 360 && Math.hypot(x - lastTapX, y - lastTapY) < 70;
    lastTapAt = now; lastTapX = x; lastTapY = y;
    if (double) {
      lastTapAt = -9999;
      supernova(x, y);
    } else {
      shock(x, y);
      tone();
      showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)], 2.8);
    }
    if (isPaused) render();
  }

  function setPaused(paused) {
    isPaused = paused;
    document.body.classList.toggle('is-paused', paused);
    dom.motion.setAttribute('aria-pressed', String(paused));
    dom.motion.setAttribute('aria-label', paused ? '움직임 재개' : '움직임 일시정지');
    dom.motion.title = paused ? '움직임 재개 (P)' : '움직임 일시정지 (P)';
    dom.status.textContent = paused ? '움직임을 일시정지했습니다.' : '움직임을 재개했습니다.';
    if (paused) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      render();
    } else if (!document.hidden) {
      lastFrame = 0;
      accumulator = 0;
      requestNext();
    }
  }

  function requestNext() {
    if (raf === null && !isPaused && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function step() {
    time += FIXED_DT;
    idleSeconds += FIXED_DT;
    if (messageSeconds > 0) {
      messageSeconds -= FIXED_DT;
      if (messageSeconds <= 0) dom.message.classList.remove('is-visible');
    }
    if (hasInteracted && idleSeconds > 17 && messageSeconds <= 0) {
      showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)], 4.0);
      idleSeconds = 10;
    }

    const R = radius();
    const breath = currentMode === 'orbit' ? 1 + Math.sin(time * 1.15) * .025 : 1 + Math.sin(time * .85) * .065;
    const rx = currentMode === 'orbit' ? .72 + Math.sin(time * .2) * .20 : Math.sin(time * .14) * .27;
    const ry = time * (currentMode === 'bloom' ? .14 : .22);
    const sx = Math.sin(rx), cx = Math.cos(rx);
    const sy = Math.sin(ry), cy = Math.cos(ry);
    const centerX = width / 2 + Math.sin(time * .31) * (isCompact ? 8 : 22);
    const centerY = height / 2 + Math.cos(time * .25) * (isCompact ? 8 : 16);
    const perspective = Math.max(400, R * 3.1);

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.r += 14.5;
      sw.life -= .018;
      if (sw.life <= 0 || sw.r > sw.maxR) shockwaves.splice(i, 1);
    }

    for (const p of particles) {
      p.hx += (p.destX - p.hx) * .048;
      p.hy += (p.destY - p.hy) * .048;
      p.hz += (p.destZ - p.hz) * .048;
      const x = p.hx * breath, y = p.hy * breath, z = p.hz * breath;
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y1 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;
      const depth = perspective / (perspective + z2);
      const tx = centerX + x1 * depth;
      const ty = centerY + y1 * depth;
      p.depth = depth;
      p.prevX = p.x; p.prevY = p.y;
      p.vx += (tx - p.x) * .022;
      p.vy += (ty - p.y) * .022;

      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        const reach = isCompact ? 115 : 175;
        if (dist2 > 1 && dist2 < reach * reach) {
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / reach) * 2.8;
          p.vx += dx / dist * force;
          p.vy += dy / dist * force;
        }
      }

      for (const sw of shockwaves) {
        const dx = p.x - sw.x, dy = p.y - sw.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) continue;
        const delta = Math.abs(distance - sw.r);
        if (delta < 68) {
          const force = (1 - delta / 68) * sw.life * 6.7 * sw.strength;
          p.vx += dx / distance * force;
          p.vy += dy / distance * force;
        }
      }
      p.vx *= .91; p.vy *= .91;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(-width * 1.5, Math.min(width * 2.5, p.x));
      p.y = Math.max(-height * 1.5, Math.min(height * 2.5, p.y));
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Faint stationary starfield: no external images, fonts, or network requests.
    ctx.globalCompositeOperation = 'source-over';
    for (const star of stars) {
      const twinkle = .6 + .4 * Math.sin(time * .4 + star.phase);
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = '#c5d8ff';
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }

    if (currentMode === 'orbit') {
      const R = radius();
      ctx.save(); ctx.translate(width / 2, height / 2);
      ctx.rotate(Math.sin(time * .13) * .2);
      ctx.strokeStyle = 'rgba(147,185,250,.09)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(0, 0, R * (1.12 + i * .095), R * (.38 + i * .047), time * .14 + i * .17, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const twinkle = .76 + Math.sin(time * 1.8 + p.phase) * .24;
      const depth = Math.max(.48, Math.min(1.7, p.depth || 1));
      const glowSize = p.size * (isCompact ? 5.0 : 5.7) * depth * twinkle;
      if (p.x < -glowSize || p.x > width + glowSize || p.y < -glowSize || p.y > height + glowSize) continue;
      ctx.globalAlpha = Math.min(1, depth * twinkle * .86);
      ctx.drawImage(sprites[p.color], p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const sw of shockwaves) {
      ctx.lineWidth = 1.5 * sw.life;
      ctx.strokeStyle = `rgba(138, 211, 255, ${sw.life * .38})`;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, TAU); ctx.stroke();
      ctx.lineWidth = .8 * sw.life;
      ctx.strokeStyle = `rgba(184, 150, 255, ${sw.life * .23})`;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, Math.max(0, sw.r - 15), 0, TAU); ctx.stroke();
    }
    if (pointer.active && !isCompact) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .21;
      ctx.drawImage(sprites[0], pointer.x - 50, pointer.y - 50, 100, 100);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = null;
    if (isPaused || document.hidden) return;
    if (!lastFrame) lastFrame = now;
    const elapsedMs = now - lastFrame;
    if (elapsedMs < 1000 / targetFPS - 1) { requestNext(); return; }
    lastFrame = now;
    accumulator += Math.min(elapsedMs / 1000, .05);
    let iterations = 0;
    while (accumulator >= FIXED_DT && iterations < 3) {
      step();
      accumulator -= FIXED_DT;
      iterations++;
    }
    render();
    requestNext();
  }

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && pointer.id !== e.pointerId) return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.active = true;
    idleSeconds = 0;
    awaken();
    if (isPaused) render();
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointer.id = e.pointerId;
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.active = true;
    if (e.pointerType !== 'mouse') canvas.setPointerCapture?.(e.pointerId);
    interact(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse' && e.pointerId === pointer.id) { pointer.active = false; pointer.id = null; }
  });
  canvas.addEventListener('pointercancel', () => { pointer.active = false; pointer.id = null; });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointer.active = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  dom.modes.forEach(btn => btn.addEventListener('click', () => changeMode(btn.dataset.mode)));
  dom.sound.addEventListener('click', () => setSound(!audioEnabled));
  dom.motion.addEventListener('click', () => setPaused(!isPaused));
  dom.reseed.addEventListener('click', () => {
    seedParticles(true); awaken(); showMessage('다시, 빛이 태어납니다', 3); tone(1.5);
    if (isPaused) render();
  });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.target instanceof HTMLElement && /^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3') changeMode(['sphere', 'bloom', 'orbit'][Number(key) - 1]);
    else if (key === 'm') setSound(!audioEnabled);
    else if (key === 'p') setPaused(!isPaused);
    else if (key === 'r') dom.reseed.click();
    else if (e.code === 'Space') { e.preventDefault(); interact(width / 2, height / 2); }
  });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    } else if (!isPaused) {
      lastFrame = 0; accumulator = 0;
      requestNext();
    }
  });

  resize();
  seedParticles(!reducedMotion);
  render();
  setPaused(isPaused);
  if (isCompact) dom.gestureText.textContent = '터치하면 공명 · 두 번 탭하면 초신성';
  introTimer = window.setTimeout(() => {
    dom.intro.classList.add('is-gone');
    document.body.classList.add('has-begun');
    introTimer = null;
  }, reducedMotion ? 1200 : 4600);
  requestNext();
})();
