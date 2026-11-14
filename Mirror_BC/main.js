/*
 * 거울 · MIRROR — v2.0
 * Original concept preserved: Gray–Scott reaction–diffusion, trace, simulated time,
 * stillness, revelation, local remembrance. No network requests or dependencies.
 */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
  const format = (number) => Math.floor(Math.max(0, number)).toLocaleString('ko-KR');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch (_) { /* private mode */ } }
  };
  const KEY_VISITS = 'mirror.visits.v2';
  const KEY_LEGACY = 'mirror.visits.v1';
  const KEY_TRAIL = 'mirror.saved-trail.v2';
  const KEY_MOTION = 'mirror.reduced-motion.v2';
  const NAMES = ['프롤로그 · 존재', '1막 · 탄생', '2막 · 시간', '3막 · 멈춤', '4막 · 거울', '5막 · 기억', '에필로그 · 귀환'];
  const lifeCanvas = $('#life');
  const traceCanvas = $('#trace');
  const lifeCtx = lifeCanvas.getContext('2d', { alpha: false });
  const traceCtx = traceCanvas.getContext('2d');
  const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storedMotion = storage.get(KEY_MOTION);
  const storedCount = Number(storage.get(KEY_VISITS) ?? storage.get(KEY_LEGACY) ?? 0);
  const countBefore = Number.isSafeInteger(storedCount) && storedCount >= 0 && storedCount < 1000000 ? storedCount : 0;
  const numberOfVisits = countBefore + 1;
  storage.set(KEY_VISITS, String(numberOfVisits));

  let oldTrail = [];
  let savedAt = null;
  function readTrail() {
    const raw = storage.get(KEY_TRAIL);
    if (!raw || raw.length > 50000) return;
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== 2 || !Array.isArray(data.points)) return;
      const points = data.points.slice(0, 1200).filter(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite) && p[0] >= 0 && p[0] <= 1000 && p[1] >= 0 && p[1] <= 1000 && (p[2] === 0 || p[2] === 1));
      oldTrail = points.map(([x, y, connected]) => ({ x: x / 1000, y: y / 1000, connected: Boolean(connected) }));
      savedAt = Number.isFinite(data.savedAt) ? data.savedAt : null;
    } catch (_) { /* damaged local value is ignored */ }
  }
  readTrail();

  const state = {
    act: 0,
    visits: numberOfVisits,
    reduced: storedMotion == null ? mediaReduced.matches : storedMotion === 'true',
    trail: [], distance: 0, seeds: 0,
    pointer: { x: 0, y: 0, valid: false, lastX: 0, lastY: 0 },
    lastInput: performance.now(),
    stillComplete: false,
    sessionElapsed: 0,
    showGhost: false,
    storageAvailable: true
  };
  document.body.classList.toggle('reduce-motion', state.reduced);
  $('#motion-switch').checked = state.reduced;
  $('#visit-chip').textContent = `${state.visits}번째 방문 · 이 브라우저`;

  // Gray–Scott chemistry: a low-resolution texture, expanded by the browser.
  // Reallocate only on resize, preserving the old chemical field through remapping.
  let W = 1, H = 1, LW = 0, LH = 0, dpr = 1;
  let A = null, B = null, A2 = null, B2 = null, pixels = null;
  const FEED = 0.0367, KILL = 0.0649, DIFF_A = 1, DIFF_B = .5;
  function resize() {
    const oldW = LW, oldH = LH, oldA = A, oldB = B;
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1), Math.sqrt(2700000 / (W * H)) || 1);
    if (traceCtx) {
      traceCanvas.width = Math.max(1, Math.round(W * dpr));
      traceCanvas.height = Math.max(1, Math.round(H * dpr));
      traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    LW = clamp(Math.round(134 * W / H), 72, 235);
    LH = 134;
    if (!lifeCtx) return;
    lifeCanvas.width = LW;
    lifeCanvas.height = LH;
    A = new Float32Array(LW * LH);
    B = new Float32Array(LW * LH);
    A2 = new Float32Array(LW * LH);
    B2 = new Float32Array(LW * LH);
    A.fill(1);
    if (oldA && oldB && oldW && oldH) {
      for (let y = 0; y < LH; y++) {
        const sy = Math.min(oldH - 1, Math.floor(y / LH * oldH));
        for (let x = 0; x < LW; x++) {
          const sx = Math.min(oldW - 1, Math.floor(x / LW * oldW));
          const at = y * LW + x, old = sy * oldW + sx;
          A[at] = oldA[old];
          B[at] = oldB[old];
        }
      }
    }
    pixels = lifeCtx.createImageData(LW, LH);
    for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = 255;
    paintChemistry();
    paintTrail();
  }

  function seed(nx, ny, radius = 4) {
    if (!B) return;
    const gx = clamp(Math.round(nx * (LW - 1)), 0, LW - 1);
    const gy = clamp(Math.round(ny * (LH - 1)), 0, LH - 1);
    const rr = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > rr) continue;
        const x = ((gx + dx) % LW + LW) % LW;
        const y = ((gy + dy) % LH + LH) % LH;
        const i = y * LW + x, factor = 1 - d2 / rr;
        A[i] = A[i] * (1 - factor * .9) + .35 * factor * .9;
        B[i] = Math.max(B[i], .92 * factor);
      }
    }
  }
  function advanceChemistry(now) {
    if (!A) return;
    const idle = now - state.lastInput;
    const decay = idle > 6500 ? .9968 : .99995;
    for (let y = 0; y < LH; y++) {
      const yU = y ? y - 1 : LH - 1;
      const yD = y < LH - 1 ? y + 1 : 0;
      const row = y * LW, up = yU * LW, down = yD * LW;
      for (let x = 0; x < LW; x++) {
        const xL = x ? x - 1 : LW - 1;
        const xR = x < LW - 1 ? x + 1 : 0;
        const i = row + x, a = A[i], b = B[i];
        const lapA = .2 * (A[row + xL] + A[row + xR] + A[up + x] + A[down + x])
          + .05 * (A[up + xL] + A[up + xR] + A[down + xL] + A[down + xR]) - a;
        const lapB = .2 * (B[row + xL] + B[row + xR] + B[up + x] + B[down + x])
          + .05 * (B[up + xL] + B[up + xR] + B[down + xL] + B[down + xR]) - b;
        const ab2 = a * b * b;
        A2[i] = clamp(a + DIFF_A * lapA - ab2 + FEED * (1 - a), 0, 1);
        B2[i] = clamp((b + DIFF_B * lapB + ab2 - (KILL + FEED) * b) * decay, 0, 1);
      }
    }
    let swap = A; A = A2; A2 = swap;
    swap = B; B = B2; B2 = swap;
  }
  function paintChemistry() {
    if (!pixels || !lifeCtx) return;
    const data = pixels.data;
    for (let i = 0, at = 0; i < B.length; i++, at += 4) {
      const v = clamp(B[i] * 4.3, 0, 1);
      const e = v * v * (3 - 2 * v);
      data[at] = 5 + e * 135;
      data[at + 1] = 11 + e * 206;
      data[at + 2] = 24 + e * 192;
    }
    lifeCtx.putImageData(pixels, 0, 0);
  }

  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  const glowCtx = glow.getContext('2d');
  if (glowCtx) {
    const rad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, 'rgba(195,255,248,.38)');
    rad.addColorStop(.3, 'rgba(137,235,223,.15)');
    rad.addColorStop(1, 'rgba(114,208,200,0)');
    glowCtx.fillStyle = rad;
    glowCtx.fillRect(0, 0, 128, 128);
  }
  function strokePath(context, items, color, lineWidth, alpha) {
    if (items.length < 2) return;
    context.beginPath();
    for (let i = 0; i < items.length; i++) {
      const p = items[i], x = p.x * W, y = p.y * H;
      if (i === 0 || !p.connected) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = color;
    context.globalAlpha = alpha;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
    context.globalAlpha = 1;
  }
  function paintTrail() {
    if (!traceCtx) return;
    traceCtx.clearRect(0, 0, W, H);
    if (state.showGhost && oldTrail.length > 1) {
      strokePath(traceCtx, oldTrail, '#ffca87', 3, .16);
      strokePath(traceCtx, oldTrail, '#ffe1ae', 1.15, .64);
    }
    const alpha = state.act === 4 ? .8 : state.act === 5 ? .56 : .22;
    strokePath(traceCtx, state.trail, '#48bfb8', state.act === 4 ? 4.4 : 3, alpha * .4);
    strokePath(traceCtx, state.trail, '#c5fff5', state.act === 4 ? 1.65 : 1.15, alpha);
    const recent = state.trail.slice(-65);
    strokePath(traceCtx, recent, '#d8fffa', 1.6, Math.min(.95, alpha + .23));
    const p = state.pointer;
    if (p.valid && !state.reduced && window.matchMedia('(pointer:fine)').matches) {
      traceCtx.drawImage(glow, p.x - 64, p.y - 64);
      traceCtx.fillStyle = '#d5fff5';
      traceCtx.beginPath(); traceCtx.arc(p.x, p.y, 2.3, 0, Math.PI * 2); traceCtx.fill();
    }
  }

  function addPoint(x, y, connected) {
    const last = state.trail[state.trail.length - 1];
    const nx = clamp(x / W, 0, 1), ny = clamp(y / H, 0, 1);
    if (last && connected && Math.hypot((last.x - nx) * W, (last.y - ny) * H) < 5) return;
    state.trail.push({ x: nx, y: ny, connected });
    // Bound memory and line drawing without shifting on each mouse event.
    if (state.trail.length > 1600) state.trail.splice(0, 160);
  }
  function onPointerMove(event) {
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    if (event.target instanceof Element && event.target.closest('button, input, a, #settings-panel')) return;
    const x = clamp(event.clientX, 0, W), y = clamp(event.clientY, 0, H);
    const p = state.pointer;
    if (!p.valid) {
      p.valid = true; p.x = p.lastX = x; p.y = p.lastY = y;
      addPoint(x, y, false);
      return;
    }
    const prevX = p.x, prevY = p.y;
    const distance = Math.hypot(x - prevX, y - prevY);
    p.x = x; p.y = y;
    if (distance < 3) return; // do not restart the stillness clock for trackpad jitter
    state.lastInput = performance.now();
    state.distance += Math.min(130, distance);
    addPoint(x, y, distance < 175);
    if (state.act !== 6 && B) {
      const step = Math.max(1, Math.min(10, Math.ceil(distance / 17)));
      for (let i = 1; i <= step; i++) {
        const t = i / step;
        seed((prevX + (x - prevX) * t) / W, (prevY + (y - prevY) * t) / H, 3);
      }
    }
    $('#distance-stat').textContent = format(state.distance);
  }
  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button, input, a, #settings-panel')) return;
    const x = clamp(event.clientX, 0, W), y = clamp(event.clientY, 0, H);
    state.pointer = { x, y, lastX: x, lastY: y, valid: true };
    state.lastInput = performance.now();
    addPoint(x, y, false);
    plantAt(x, y);
  }
  function plantAt(x, y) {
    seed(x / W, y / H, 7);
    state.seeds++;
    $('#seed-stat').textContent = format(state.seeds);
  }
  function plantCenter() {
    const x = W * (.35 + Math.random() * .3);
    const y = H * (.34 + Math.random() * .32);
    plantAt(x, y);
    addPoint(x, y, false);
    state.lastInput = performance.now();
  }
  function clearField() {
    if (A && B) { A.fill(1); B.fill(0); }
    state.trail = [];
    state.distance = 0;
    state.seeds = 0;
    state.pointer.valid = false;
    $('#distance-stat').textContent = '0';
    $('#seed-stat').textContent = '0';
    paintChemistry(); paintTrail();
  }

  function updateStillness(now) {
    if (state.act !== 3) return;
    const progress = clamp((now - state.lastInput) / 9000, 0, 1);
    $('#still-ring').style.setProperty('--progress', (progress * 100).toFixed(2));
    const remaining = Math.max(0, 9 * (1 - progress));
    $('#still-number').textContent = remaining.toFixed(1);
    $('#still-ring').setAttribute('aria-label', `정지 유지 ${Math.floor(progress * 9)}초 / 9초`);
    if (progress >= 1 && !state.stillComplete) {
      state.stillComplete = true;
      $('#still-ring').classList.add('complete');
      $('#still-message').textContent = '고요가 완성되었습니다. 움직이지 않아도, 당신의 흔적은 남아 있습니다.';
    } else if (progress < 1 && !state.stillComplete) {
      $('#still-message').textContent = progress < .02 ? '움직임을 멈추면 고요가 시작됩니다.' : '고요가 차오르는 중입니다…';
    }
  }
  function updateCounters() {
    const seconds = state.sessionElapsed / 1000;
    $('#heart-value').textContent = format(seconds * 1.2);
    $('#cell-value').textContent = format(seconds * 700000);
    $('#earth-value').textContent = format(seconds * 29.78);
    $('#light-value').textContent = format(seconds * 299792.458);
  }

  let raf = 0, lastFrame = 0, renderAccumulator = 0, lastDisplayTime = 0;
  function frame(now) {
    if (document.hidden) { raf = 0; return; }
    const dt = lastFrame ? clamp(now - lastFrame, 0, 85) : 16;
    lastFrame = now;
    state.sessionElapsed += dt;
    updateStillness(now);
    const cadence = state.reduced ? 160 : 34;
    renderAccumulator += dt;
    if (renderAccumulator >= cadence) {
      renderAccumulator = Math.min(renderAccumulator - cadence, cadence);
      if (state.act !== 6) {
        advanceChemistry(now);
        if (!state.reduced && dt < 50) advanceChemistry(now);
        paintChemistry();
      }
      paintTrail();
    }
    if (now - lastDisplayTime >= 220) {
      updateCounters();
      lastDisplayTime = now;
    }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else {
      lastFrame = 0;
      state.lastInput = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
  });

  function updateMemory() {
    $('#memory-visits').textContent = state.visits ? `${format(state.visits)}번째 방문` : '기억이 비워졌습니다';
    let message = '아직 보관한 흔적이 없습니다. 거울 장면에서 흔적을 저장할 수 있습니다.';
    if (savedAt && oldTrail.length) {
      const date = new Date(savedAt);
      const readable = Number.isNaN(date.getTime()) ? '이전 방문' : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
      message = `${readable} · ${format(oldTrail.length)}개의 좌표를 보관하고 있습니다.`;
    }
    $('#memory-date').textContent = message;
    $('#show-previous').textContent = state.showGhost ? '지난 흔적 감추기' : '지난 흔적 보기';
    $('#restore-ghost').textContent = state.showGhost ? '저장된 흔적 감추기' : '저장된 흔적 불러오기';
  }
  function go(act, focus = false) {
    const index = clamp(Number(act) || 0, 0, 6);
    state.act = index;
    document.body.dataset.act = String(index);
    $$('.scene').forEach(scene => {
      const show = Number(scene.dataset.scene) === index;
      scene.hidden = !show;
      scene.classList.toggle('is-active', show);
    });
    $$('.phase-dot').forEach((button, i) => {
      button.classList.toggle('current', i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#phase-name').textContent = NAMES[index];
    $('#phase-number').textContent = `${String(index + 1).padStart(2, '0')} / 07`;
    $('#previous').disabled = index === 0;
    $('#next').disabled = index === 6;
    if (index === 3) {
      state.lastInput = performance.now();
      state.stillComplete = false;
      $('#still-ring').classList.remove('complete');
      $('#still-ring').style.setProperty('--progress', '0');
      $('#still-number').textContent = '9.0';
      $('#still-message').textContent = '움직임을 멈추면 고요가 시작됩니다.';
    }
    if (index === 5 || index === 4) updateMemory();
    $('#experience').scrollTop = 0;
    closeSettings();
    if (focus) {
      const heading = $(`.scene[data-scene="${index}"] h1, .scene[data-scene="${index}"] h2`);
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
  }
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  function saveTrail() {
    if (state.trail.length < 2) { showToast('먼저 화면에 움직임을 남겨 주세요.'); return; }
    const stride = Math.max(1, Math.ceil(state.trail.length / 1000));
    const compressed = state.trail.filter((_, i) => i % stride === 0 || i === state.trail.length - 1)
      .map(p => [Math.round(p.x * 1000), Math.round(p.y * 1000), p.connected ? 1 : 0]);
    const time = Date.now();
    const payload = JSON.stringify({ version: 2, savedAt: time, points: compressed });
    if (!storage.set(KEY_TRAIL, payload)) { showToast('이 브라우저에서는 기억을 저장할 수 없습니다. PNG 저장은 가능합니다.'); return; }
    savedAt = time;
    // Keep oldTrail unchanged during this visit: it represents the *previous* self.
    updateMemory();
    showToast('현재 흔적을 이 브라우저에 보관했습니다. 다음 방문에서 다시 볼 수 있습니다.');
  }
  function toggleGhost() {
    if (!oldTrail.length) { showToast('이전 방문에서 저장한 흔적이 없습니다.'); return; }
    state.showGhost = !state.showGhost;
    updateMemory(); paintTrail();
    showToast(state.showGhost ? '이전 흔적을 황금빛으로 겹쳐 표시합니다.' : '이전 흔적을 감췄습니다.');
  }
  function exportImage() {
    if (!traceCtx || !lifeCtx) { showToast('이 브라우저는 캔버스 이미지 저장을 지원하지 않습니다.'); return; }
    const out = document.createElement('canvas');
    const ratio = Math.min(2, 2300 / Math.max(W, H));
    out.width = Math.round(W * ratio);
    out.height = Math.round(H * ratio);
    const c = out.getContext('2d');
    if (!c) { showToast('이미지를 생성할 수 없습니다.'); return; }
    c.fillStyle = '#040711'; c.fillRect(0, 0, out.width, out.height);
    c.globalAlpha = .74;
    c.drawImage(lifeCanvas, 0, 0, out.width, out.height);
    c.globalAlpha = 1;
    c.drawImage(traceCanvas, 0, 0, out.width, out.height);
    const g = c.createLinearGradient(0, 0, 0, out.height);
    g.addColorStop(0, 'rgba(3,8,15,.35)'); g.addColorStop(.7, 'rgba(3,8,15,0)'); g.addColorStop(1, 'rgba(3,8,15,.65)');
    c.fillStyle = g; c.fillRect(0, 0, out.width, out.height);
    const px = Math.max(13, Math.round(17 * ratio));
    c.fillStyle = '#def9f4'; c.font = `300 ${px}px Georgia, serif`;
    c.fillText('M I R R O R  /  거 울', Math.round(28 * ratio), Math.round(40 * ratio));
    c.fillStyle = 'rgba(215,238,230,.74)'; c.font = `${Math.max(10, Math.round(11 * ratio))}px Arial, sans-serif`;
    c.fillText(new Date().toLocaleDateString('ko-KR'), Math.round(28 * ratio), out.height - Math.round(25 * ratio));
    function download(blob) {
      if (!blob) { showToast('이미지를 저장할 수 없습니다.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `MIRROR-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast('거울의 현재 장면을 PNG로 저장했습니다.');
    }
    if (out.toBlob) out.toBlob(download, 'image/png');
    else { // older WebViews
      const encoded = out.toDataURL('image/png');
      const a = document.createElement('a'); a.href = encoded; a.download = 'MIRROR.png';
      document.body.appendChild(a); a.click(); a.remove(); showToast('장면을 저장했습니다.');
    }
  }
  function clearMemory() {
    if (!window.confirm('방문 횟수와 저장한 흔적을 이 브라우저에서 지우시겠습니까?\n현재 화면에 그린 흔적은 그대로 둡니다.')) return;
    storage.del(KEY_VISITS); storage.del(KEY_LEGACY); storage.del(KEY_TRAIL);
    oldTrail = []; savedAt = null; state.showGhost = false; state.visits = 0;
    $('#visit-chip').textContent = '기억 없음 · 현재 방문';
    updateMemory(); paintTrail();
    showToast('브라우저에 저장된 방문 기록과 흔적을 지웠습니다.');
    closeSettings();
  }
  function restart() {
    clearField();
    state.sessionElapsed = 0;
    state.lastInput = performance.now();
    go(0, true);
  }
  const settings = $('#settings-panel');
  function closeSettings() {
    settings.hidden = true;
    $('#settings-toggle').setAttribute('aria-expanded', 'false');
    $('#settings-toggle').setAttribute('aria-label', '설정 열기');
  }
  $('#settings-toggle').addEventListener('click', () => {
    const open = settings.hidden;
    settings.hidden = !open;
    $('#settings-toggle').setAttribute('aria-expanded', String(open));
    $('#settings-toggle').setAttribute('aria-label', open ? '설정 닫기' : '설정 열기');
  });
  $('#settings-close').addEventListener('click', closeSettings);
  document.addEventListener('pointerdown', e => {
    if (!settings.hidden && e.target instanceof Element && !e.target.closest('#settings-panel, #settings-toggle')) closeSettings();
  });
  $('#motion-switch').addEventListener('change', e => {
    state.reduced = e.target.checked;
    document.body.classList.toggle('reduce-motion', state.reduced);
    storage.set(KEY_MOTION, String(state.reduced));
  });
  $('#clear-memory-settings').addEventListener('click', clearMemory);
  $('#forget').addEventListener('click', clearMemory);
  $('#previous').addEventListener('click', () => go(state.act - 1, true));
  $('#next').addEventListener('click', () => go(state.act + 1, true));
  $$('.phase-dot').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.go), true)));
  $('#begin').addEventListener('click', () => { go(1, true); plantCenter(); });
  $('#plant').addEventListener('click', () => { plantCenter(); showToast('작은 씨앗이 새로운 반응을 시작했습니다.'); });
  $('#new-life').addEventListener('click', () => { clearField(); plantCenter(); showToast('새로운 생명이 시작되었습니다.'); });
  $('#save-image').addEventListener('click', exportImage);
  $('#save-trail').addEventListener('click', saveTrail);
  $('#show-previous').addEventListener('click', toggleGhost);
  $('#restore-ghost').addEventListener('click', toggleGhost);
  $('#restart').addEventListener('click', restart);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerleave', () => { state.pointer.valid = false; });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeSettings(); return; }
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); go(state.act + 1, true); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(state.act - 1, true); }
    else if ((event.key === ' ' || event.code === 'Space') && !(event.target instanceof Element && event.target.closest('button,a'))) {
      event.preventDefault();
      if (state.act === 1) plantCenter();
    }
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  });
  if (mediaReduced.addEventListener) mediaReduced.addEventListener('change', (event) => {
    if (storage.get(KEY_MOTION) != null) return;
    state.reduced = event.matches;
    $('#motion-switch').checked = state.reduced;
    document.body.classList.toggle('reduce-motion', state.reduced);
  });
  // Initial scene is usable even if canvas rendering is unsupported.
  resize();
  updateMemory();
  updateCounters();
  raf = requestAnimationFrame(frame);
})();
