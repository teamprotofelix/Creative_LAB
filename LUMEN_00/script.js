/* LUMEN — 빛의 기억 | 정적 브라우저 작품 · 외부 전송 없음 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('world');
  const ctx = canvas && canvas.getContext('2d', { alpha: false });
  if (!ctx) { document.body.classList.add('no-canvas'); return; }
  const MAX_LIVES = 60;
  const KEY = 'lumen_garden_v2';
  const OLD_KEY = 'lumen_lives_v1';
  const VISITS_KEY = 'lumen_visits_v2';
  const MOTION_KEY = 'lumen_reduced_motion_v2';
  const MS_DAY = 86400000;
  const START_OF_TIME = Date.UTC(2000, 0, 1);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const random = (a, b) => a + Math.random() * (b - a);
  const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
  const nowMs = () => Date.now();
  let W = 0, H = 0, dpr = 1, renderId = 0, lastFrame = 0;
  let storageOk = true, versionMigrated = false, sessionPlanted = 0;
  let modalWasOpen = false, toastTimer = 0;
  let soundOn = false, audioCtx = null, masterGain = null, suspendTimer = 0;
  const pointer = { x: 0, y: 0, active: false, movedAt: 0 };
  const stars = [];
  const motionPref = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function readStore(key) {
    try { return window.localStorage.getItem(key); }
    catch (_error) { storageOk = false; return null; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, value); storageOk = true; return true; }
    catch (_error) { storageOk = false; return false; }
  }
  function deleteStore(key) {
    try { window.localStorage.removeItem(key); return true; }
    catch (_error) { storageOk = false; return false; }
  }
  function makeSeed() { return Math.floor(Math.random() * 4294967295); }
  function int(n, fallback) { return isFiniteNumber(n) ? Math.floor(n) : fallback; }
  function validated(data, legacy = false) {
    if (!data || typeof data !== 'object') return null;
    const nx = legacy ? Number(data.x) / Math.max(1, window.innerWidth) : data.nx;
    const ny = legacy ? Number(data.y) / Math.max(1, window.innerHeight) : data.ny;
    if (!isFiniteNumber(nx) || !isFiniteNumber(ny)) return null;
    if (!legacy && (nx < 0 || nx > 1 || ny < 0 || ny > 1)) return null;
    const born = isFiniteNumber(data.born) && data.born >= START_OF_TIME && data.born <= nowMs() + MS_DAY
      ? Math.min(data.born, nowMs()) : nowMs();
    const hue = isFiniteNumber(data.hue) ? clamp(data.hue, 0, 360) : 215;
    const seed = isFiniteNumber(data.seed) ? (Math.abs(Math.floor(data.seed * (legacy && data.seed <= 1 ? 4294967295 : 1))) >>> 0) : makeSeed();
    return { nx: clamp(nx, 0.02, 0.98), ny: clamp(ny, 0.06, 0.96), born, hue, seed };
  }
  function parseGarden() {
    const current = readStore(KEY);
    if (current !== null) {
      try {
        const obj = JSON.parse(current);
        if (!obj || obj.version !== 2 || !Array.isArray(obj.lives)) throw Error('형식 오류');
        return obj.lives.slice(-MAX_LIVES).map((r) => validated(r)).filter(Boolean);
      } catch (_error) { return []; }
    }
    const old = readStore(OLD_KEY);
    if (old !== null) {
      try {
        const rows = JSON.parse(old);
        if (Array.isArray(rows)) {
          versionMigrated = true;
          return rows.slice(-MAX_LIVES).map((r) => validated(r, true)).filter(Boolean);
        }
      } catch (_error) { /* 복구할 수 없는 원본은 무시합니다 */ }
    }
    return [];
  }
  const lives = parseGarden();
  let visits = Math.max(0, int(Number(readStore(VISITS_KEY)), 0)) + 1;
  if (visits > 9999999) visits = 1;
  writeStore(VISITS_KEY, String(visits));
  let reduced = (() => {
    const saved = readStore(MOTION_KEY);
    return saved === '1' || (saved === null && !!motionPref?.matches);
  })();
  if (reduced) document.body.classList.add('reduced-motion');

  function timeHue() {
    const d = new Date();
    const hour = d.getHours() + d.getMinutes() / 60;
    return 209 + Math.sin(hour / 24 * Math.PI * 2 - 0.65) * 29;
  }
  const baseHue = timeHue();
  function scenePalette() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return { a:'#0d0b1c', b:'#24243b', c:'#0a1020', nebula:'rgba(154,128,176,.20)' };
    if (hour >= 9 && hour < 17) return { a:'#06121e', b:'#10303b', c:'#061521', nebula:'rgba(95,175,177,.16)' };
    if (hour >= 17 && hour < 20) return { a:'#0c0b1e', b:'#22223c', c:'#0c1022', nebula:'rgba(183,132,179,.16)' };
    return { a:'#040916', b:'#0b1b2f', c:'#050a17', nebula:'rgba(55,99,145,.27)' };
  }
  function seededRand(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeTreeSprite(life) {
    const width = 220, height = 232;
    const sprite = document.createElement('canvas');
    sprite.width = width; sprite.height = height;
    const c = sprite.getContext('2d');
    const rnd = seededRand(life.seed);
    const segments = [], tips = [];
    const grow = (x, y, angle, len, depth) => {
      if (depth <= 0 || len < 2.2 || segments.length > 92) return;
      const nx = x + Math.cos(angle) * len;
      const ny = y + Math.sin(angle) * len;
      segments.push({ x, y, nx, ny, depth });
      if (depth === 1) { tips.push({ x: nx, y: ny, r: rnd() }); return; }
      const spread = 0.35 + rnd() * 0.42;
      const shrink = 0.62 + rnd() * 0.12;
      grow(nx, ny, angle - spread, len * shrink, depth - 1);
      grow(nx, ny, angle + spread * (0.8 + rnd() * 0.42), len * shrink, depth - 1);
      if (depth === 4 && rnd() > .63) grow(nx, ny, angle + (rnd() - .5) * .25, len * .52, 2);
    };
    grow(0, 0, -Math.PI / 2 + (rnd() - .5) * .25, 38 + rnd() * 12, 6);
    c.save(); c.translate(width / 2, height - 22); c.lineCap = 'round';
    for (const b of segments) {
      const a = .20 + b.depth / 6 * .55;
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.nx, b.ny);
      c.lineWidth = .52 + b.depth * .43;
      c.strokeStyle = `hsla(${life.hue + b.depth * 2},85%,${63 + (6 - b.depth) * 3}%,${a})`;
      if (b.depth >= 4) { c.shadowColor = `hsla(${life.hue},95%,75%,.5)`; c.shadowBlur = 9; }
      else c.shadowBlur = 0;
      c.stroke();
    }
    c.shadowBlur = 0;
    for (const p of tips) {
      const radius = 1.5 + p.r * 2.2;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8 + radius);
      g.addColorStop(0, `hsla(${life.hue + 16},98%,93%,.88)`);
      g.addColorStop(.17, `hsla(${life.hue + 15},96%,78%,.53)`);
      g.addColorStop(1, `hsla(${life.hue},90%,67%,0)`);
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, radius + 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = `hsla(${life.hue + 13},98%,90%,.82)`;
      c.beginPath(); c.arc(p.x, p.y, radius * .55, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    return sprite;
  }
  function readyLife(data) { return { ...data, sprite: null, tw: random(0, Math.PI * 2) }; }
  for (let i = 0; i < lives.length; i++) lives[i] = readyLife(lives[i]);

  function saveGarden() {
    const payload = { version: 2, lives: lives.map(({ nx, ny, born, hue, seed }) => ({ nx, ny, born, hue, seed })) };
    return writeStore(KEY, JSON.stringify(payload));
  }
  // 이전 사이트의 pixel 좌표를 현재 화면에서 정규화한 뒤 새 형식으로 저장합니다.
  if (versionMigrated) saveGarden();

  function updateUI() {
    const n = lives.length;
    $('count').innerHTML = `${String(n).padStart(2, '0')} <span>/ ${MAX_LIVES}</span>`;
    $('memoryVisits').textContent = visits.toLocaleString('ko-KR');
    $('memoryCount').textContent = String(n);
    $('memorySession').textContent = String(sessionPlanted);
    $('visitLabel').textContent = visits === 1 ? '첫 번째 방문' : `${visits}번째 방문`;
    const youngest = lives.length ? Math.min(...lives.map(l => nowMs() - l.born)) : Infinity;
    $('phaseLabel').textContent = n === 0 ? '아직 심지 않은 정원' : youngest < 14000 ? '빛이 자라는 순간' : '별이 된 기억';
    $('memoryPoem').textContent = n === 0
      ? '아직 빛 하나 없는 정원에도\n새로운 이야기가 기다립니다.'
      : `여기에 ${n}개의 작은 빛이 남았습니다.\n당신의 손이 지나간 자리에 가지가 뻗고,\n한순간의 선택이 별의 이름을 얻었습니다.\n다시 돌아와도, 이 빛은 기다립니다.`;
    $('storageStatus').textContent = storageOk
      ? '이 기록은 이 브라우저에만 저장되며 서버로 전송되지 않습니다.'
      : '현재 브라우저가 저장을 허용하지 않아 새로고침하면 기록이 사라질 수 있습니다.';
    document.body.classList.toggle('has-lives', n > 0);
  }
  updateUI();

  function resize() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, W * H > 2000000 ? 1.25 : 1.8);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const count = clamp(Math.round((W * H) / 5300), 110, 340);
    for (let i = 0; i < count; i++) {
      stars.push({ nx: Math.random(), ny: Math.random(), r: random(.3, 1.5), tw: random(0, Math.PI * 2), sp: random(.12, .62), alpha: random(.16, .49) });
    }
    renderScene(performance.now());
  }

  function renderScene(ms) {
    const time = ms / 1000;
    const palette = scenePalette();
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, palette.a); bg.addColorStop(.45, palette.b); bg.addColorStop(1, palette.c);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const nebula = ctx.createRadialGradient(W * .52, H * .47, 2, W * .52, H * .47, Math.max(W, H) * .58);
    nebula.addColorStop(0, palette.nebula);
    nebula.addColorStop(.42, 'rgba(31,72,124,.11)');
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, H);

    // 달과 같은 빛의 핵, 가느다란 궤도
    const cx = W * .5, cy = H * .48;
    const orbR = Math.min(W, H) * .21;
    const central = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.2);
    central.addColorStop(0, 'rgba(115,167,221,.11)');
    central.addColorStop(.36, 'rgba(104,149,204,.09)');
    central.addColorStop(.72, 'rgba(48,95,160,.04)');
    central.addColorStop(1, 'rgba(40,80,140,0)');
    ctx.fillStyle = central; ctx.beginPath(); ctx.arc(cx, cy, orbR * 2.2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.3 + i * .58);
      ctx.beginPath(); ctx.ellipse(0, 0, orbR * (1.5 + i * .35), orbR * (.6 + i * .16), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150,193,239,${.085 - i * .014})`; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
    }
    const glowX = cx + Math.cos(time * .23) * orbR * 1.65;
    const glowY = cy + Math.sin(time * .23) * orbR * .8;
    ctx.fillStyle = 'rgba(234,218,191,.6)';
    ctx.beginPath(); ctx.arc(glowX, glowY, 2.6, 0, Math.PI * 2); ctx.fill();

    for (const s of stars) {
      const x = s.nx * W, y = s.ny * H;
      const opacity = s.alpha * (reduced ? .83 : .77 + .22 * Math.sin(time * s.sp + s.tw));
      ctx.fillStyle = `rgba(207,226,252,${opacity})`;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    if (pointer.active && !reduced && ms - pointer.movedAt < 3500) {
      const pr = 180;
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, pr);
      glow.addColorStop(0, 'rgba(163,205,255,.09)'); glow.addColorStop(1, 'rgba(98,173,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(pointer.x - pr, pointer.y - pr, pr * 2, pr * 2);
      for (const s of stars) {
        const x = s.nx * W, y = s.ny * H;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        if (distance < 120) {
          ctx.strokeStyle = `rgba(180,211,249,${(1 - distance / 120) * .15})`;
          ctx.lineWidth = .55; ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(x, y); ctx.stroke();
        }
      }
    }

    // 방문자가 심은 빛. 저장 위치는 정규화되어 화면 크기가 달라도 유지됩니다.
    for (const life of lives) {
      if (!life.sprite) life.sprite = makeTreeSprite(life);
      const x = life.nx * W, y = life.ny * H;
      const age = Math.max(0, (nowMs() - life.born) / 1000);
      const growth = reduced ? 1 : clamp(age / 4.8, 0.03, 1);
      const starphase = clamp((age - 23) / 17, 0, 1);
      const treeOpacity = 1 - starphase * .64;
      ctx.save(); ctx.globalAlpha = treeOpacity;
      if (growth < 1) { ctx.beginPath(); ctx.rect(x - 110, y - 232 * growth, 220, 235 * growth); ctx.clip(); }
      ctx.drawImage(life.sprite, x - 110, y - 210);
      ctx.restore();
      const coreR = (2.5 + starphase * 2.5) * (reduced ? 1 : .88 + .12 * Math.sin(time * 1.5 + life.tw));
      const core = ctx.createRadialGradient(x, y, 0, x, y, 17 + starphase * 20);
      core.addColorStop(0, `rgba(253,236,202,${.85 + starphase * .14})`);
      core.addColorStop(.1, `hsla(${life.hue + 20},95%,83%,.42)`);
      core.addColorStop(1, `hsla(${life.hue},95%,65%,0)`);
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, 17 + starphase * 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsla(${life.hue + 22},100%,91%,${.78 + .2 * starphase})`;
      ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2); ctx.fill();
      if (starphase > .03) {
        ctx.strokeStyle = `rgba(242,230,208,${starphase * .48})`; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(x - 10 * starphase, y); ctx.lineTo(x + 10 * starphase, y);
        ctx.moveTo(x, y - 10 * starphase); ctx.lineTo(x, y + 10 * starphase); ctx.stroke();
      }
    }
    // 최근의 빛 사이를 잇는 사적인 별자리
    const recent = lives.slice(-22);
    for (let i = 1; i < recent.length; i++) {
      const a = recent[i - 1], b = recent[i];
      const ax = a.nx * W, ay = a.ny * H, bx = b.nx * W, by = b.ny * H;
      const dist = Math.hypot(ax - bx, ay - by);
      if (dist < Math.min(W, H) * .48 && dist > 20) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = `rgba(238,212,172,${(1 - dist / (Math.min(W, H) * .48)) * .14})`;
        ctx.lineWidth = .6; ctx.stroke();
      }
    }
  }

  function loop(ts) {
    renderId = 0;
    if (document.hidden || reduced) return;
    if (ts - lastFrame >= 1000 / 36) { lastFrame = ts; renderScene(ts); }
    renderId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (renderId || reduced || document.hidden) return;
    lastFrame = 0;
    renderId = requestAnimationFrame(loop);
  }
  function stopLoop() { if (renderId) cancelAnimationFrame(renderId); renderId = 0; }
  function refresh() { renderScene(performance.now()); startLoop(); }

  function toast(message) {
    const box = $('toast');
    box.textContent = message; box.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 2700);
  }
  const phrases = [
    '한 점의 빛이 시간을 건넙니다.', '작은 선택이 긴 기억을 만듭니다.',
    '당신이 머문 곳에는 조용한 별이 생깁니다.', '마음의 정원은 서두르지 않습니다.',
    '모든 빛에는 다른 시간이 흐릅니다.', '이 순간의 손길을, 이곳에 남겨 둡니다.',
    '시간은 빛을 지우지 않고 모습을 바꿉니다.'
  ];
  let phraseIndex = 0;
  function nextPhrase() {
    $('whisper').textContent = phrases[phraseIndex++ % phrases.length];
  }

  function plant(x, y) {
    if (lives.length >= MAX_LIVES) lives.shift();
    const data = { nx: clamp(x / W, .03, .97), ny: clamp(y / H, .08, .94), born: nowMs(), hue: clamp(baseHue + random(-24, 34), 170, 295), seed: makeSeed() };
    lives.push(readyLife(data));
    sessionPlanted++;
    saveGarden(); updateUI(); nextPhrase(); refresh();
    if (sessionPlanted === 1) toast('첫 번째 빛이 심어졌습니다.');
    else if (sessionPlanted % 10 === 0) toast('빛의 정원이 조금 더 넓어졌습니다.');
    if (soundOn) playChime(data.hue);
  }
  $('firstSeed').addEventListener('click', () => plant(W * .5, H * .7));
  $('plantButton').addEventListener('click', () => plant(random(W * .21, W * .79), random(H * .36, H * .79)));
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary || modalWasOpen) return;
    plant(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!e.isPrimary) return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.movedAt = performance.now(); pointer.active = true;
    if (reduced) refresh();
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; if (reduced) refresh(); });

  function updateMotion() {
    document.body.classList.toggle('reduced-motion', reduced);
    $('motionButton').setAttribute('aria-pressed', String(reduced));
    $('motionButton').setAttribute('aria-label', reduced ? '움직임 다시 켜기' : '움직임 줄이기');
    $('motionButton').title = reduced ? '움직임 다시 켜기' : '움직임 줄이기';
    $('motionButton').querySelector('.tool-label').textContent = reduced ? '움직임 켜기' : '고요 모드';
    if (reduced) { stopLoop(); renderScene(performance.now()); }
    else startLoop();
  }
  $('motionButton').addEventListener('click', () => {
    reduced = !reduced; writeStore(MOTION_KEY, reduced ? '1' : '0'); updateMotion();
    toast(reduced ? '고요 모드: 움직임을 멈췄습니다.' : '움직임이 다시 시작됩니다.');
  });

  async function ensureAudio() {
    if (audioCtx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast('이 브라우저에서는 소리를 지원하지 않습니다.'); return false; }
    try {
      audioCtx = new AC();
      masterGain = audioCtx.createGain(); masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);
      [110, 164.81, 220, 329.63].forEach((hz, i) => {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = hz;
        gain.gain.value = [.17,.055,.05,.025][i];
        osc.connect(gain).connect(masterGain); osc.start();
      });
      return true;
    } catch (_error) { toast('소리를 시작할 수 없습니다.'); return false; }
  }
  function setAudioButton() {
    $('soundButton').setAttribute('aria-pressed', String(soundOn));
    $('soundButton').setAttribute('aria-label', soundOn ? '소리 끄기' : '소리 켜기');
    $('soundButton').querySelector('.tool-label').textContent = soundOn ? '소리 켜짐' : '소리 꺼짐';
  }
  $('soundButton').addEventListener('click', async () => {
    clearTimeout(suspendTimer);
    if (!audioCtx && !(await ensureAudio())) return;
    soundOn = !soundOn; setAudioButton();
    try {
      await audioCtx.resume();
      const t = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(soundOn ? .12 : 0, t + (soundOn ? 1.4 : .5));
      if (!soundOn) suspendTimer = setTimeout(() => { if (!soundOn) audioCtx.suspend().catch(() => {}); }, 650);
    } catch (_error) { soundOn = false; setAudioButton(); toast('소리를 재생할 수 없습니다.'); }
  });
  function playChime(hue) {
    if (!soundOn || !audioCtx || audioCtx.state !== 'running') return;
    const t0 = audioCtx.currentTime;
    const freq = 220 + (hue % 40) * 4;
    for (let i = 0; i < 2; i++) {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq * (i === 0 ? 1 : 1.5);
      gain.gain.setValueAtTime(.0001, t0 + i * .09);
      gain.gain.exponentialRampToValueAtTime(.05 / (i + 1), t0 + i * .09 + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, t0 + i * .09 + 1.35);
      osc.connect(gain).connect(masterGain); osc.start(t0 + i * .09); osc.stop(t0 + i * .09 + 1.4);
    }
  }

  function openMemory() {
    updateUI(); modalWasOpen = true;
    const dlg = $('memoryDialog');
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); }
    else { dlg.setAttribute('open', ''); }
  }
  function closeMemory() {
    const dlg = $('memoryDialog'); if (dlg.open && typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
    modalWasOpen = false;
  }
  $('memoryButton').addEventListener('click', openMemory);
  $('closeDialog').addEventListener('click', closeMemory);
  $('memoryDialog').addEventListener('close', () => { modalWasOpen = false; });
  $('memoryDialog').addEventListener('click', (e) => {
    const rect = $('memoryDialog').getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeMemory();
  });

  function downloadBlob(blob, name) {
    if (!blob) { toast('파일을 생성할 수 없습니다.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function dateTag() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }
  $('saveImageButton').addEventListener('click', () => {
    renderScene(performance.now());
    canvas.toBlob((blob) => {
      if (!blob) return toast('이 브라우저에서 PNG 저장을 사용할 수 없습니다.');
      downloadBlob(blob, `LUMEN_garden_${dateTag()}.png`);
      toast('현재 정원을 PNG 이미지로 저장합니다.');
    }, 'image/png');
  });
  $('exportButton').addEventListener('click', () => {
    const data = { version: 2, exportedAt: new Date().toISOString(), lives: lives.map(({ nx, ny, born, hue, seed }) => ({ nx, ny, born, hue, seed })) };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), `LUMEN_memory_${dateTag()}.json`);
    toast('정원 기억을 JSON 파일로 내보냅니다.');
  });
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 512000) { toast('512KB 이하의 기록만 불러올 수 있습니다.'); return; }
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.version !== 2 || !Array.isArray(data.lives) || data.lives.length > 10000) throw Error('wrong format');
      const next = data.lives.slice(-MAX_LIVES).map((r) => validated(r));
      if (next.some((r) => r === null)) throw Error('invalid records');
      if (!window.confirm(`기존의 ${lives.length}개 빛을 불러오는 ${next.length}개의 빛으로 교체하시겠습니까?`)) return;
      lives.splice(0, lives.length, ...next.map(readyLife));
      sessionPlanted = 0; saveGarden(); updateUI(); refresh();
      toast(`${lives.length}개의 기억을 불러왔습니다.`);
      closeMemory();
    } catch (_error) { toast('유효한 LUMEN v2 기억 파일이 아닙니다.'); }
  });
  $('clearButton').addEventListener('click', () => {
    if (!window.confirm('이 브라우저의 별과 정원, 방문 횟수를 모두 지울까요? 이 작업은 되돌릴 수 없습니다.')) return;
    lives.splice(0); sessionPlanted = 0; visits = 1;
    deleteStore(KEY); deleteStore(OLD_KEY); deleteStore(VISITS_KEY);
    // 기억 삭제 뒤 새 방문 기록을 남기지 않습니다. 다음 방문을 다시 첫 방문으로 표시합니다.
    updateUI(); refresh(); closeMemory(); toast('이 브라우저의 정원 기억을 지웠습니다.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('memoryDialog').open) { closeMemory(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if ($('memoryDialog').open) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT' || e.target?.isContentEditable) return;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); plant(W * .5, H * .68); }
    if (e.key.toLowerCase() === 'm') openMemory();
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); startLoop(); }, 120);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
      if (audioCtx) audioCtx.suspend().catch(() => {});
    } else {
      if (soundOn && audioCtx) audioCtx.resume().catch(() => {});
      refresh();
    }
  });
  setInterval(() => { if (!document.hidden && !$('memoryDialog').open) nextPhrase(); }, 11000);
  setInterval(() => { if (!document.hidden) updateUI(); }, 14000);
  setAudioButton(); updateMotion(); resize(); startLoop();
  if (versionMigrated) toast('이전 LUMEN의 정원 기억을 이어받았습니다.');
})();
