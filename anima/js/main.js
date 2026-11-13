
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });

const graphCanvas = document.getElementById('graph');
const gctx = graphCanvas.getContext('2d');

const elGen  = document.getElementById('s-gen');
const elPop  = document.getElementById('s-pop');
const elFood = document.getElementById('s-food');
const elTime = document.getElementById('s-time');
const toast  = document.getElementById('toast');
const intro  = document.getElementById('intro');

const sound = new Sound();

// Audio is optional: never let unavailable/suspended audio block the simulation.
function startSoundSafely() {
  try {
    const pending = sound.start();
    if (pending && typeof pending.catch === 'function') {
      pending.catch(error => console.warn('ANIMA: 오디오 없이 계속 실행합니다.', error));
    }
  } catch (error) {
    console.warn('ANIMA: 오디오 없이 계속 실행합니다.', error);
  }
}
const world = new World(window.innerWidth, window.innerHeight);

let running = false;
let last = performance.now();
let hudAccum = 0;
let toastTimer = 0;
const firedMilestones = new Set();

const MILESTONES = {
  10: '세대 10 — 무언가 달라지기 시작합니다',
  25: '세대 25 — 기억이 유전되고 있습니다',
  50: '세대 50 — 당신은 그들의 환경입니다',
  100: '세대 100 — 이제 그들은 당신의 것입니다'
};

// ---------- 리사이즈 ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.w = w;
  world.h = h;
  ctx.fillStyle = '#04050c';
  ctx.fillRect(0, 0, w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------- 이벤트 ----------
world.onEvent = (type, c) => {
  if (type === 'birth') sound.note(sound.noteFor(c.hue), 0.09, 1.9);
  else if (type === 'sing') sound.note(sound.noteFor(c.hue), 0.05, 1.3);
};

function setPointer(e) {
  world.pointer.x = e.clientX;
  world.pointer.y = e.clientY;
  world.pointer.active = true;
}

window.addEventListener('pointermove', setPointer, { passive: true });
window.addEventListener('pointerdown', e => {
  setPointer(e);
  world.pointer.feeding = true;
  startSoundSafely();
});
window.addEventListener('pointerup', () => { world.pointer.feeding = false; });
window.addEventListener('pointercancel', () => { world.pointer.feeding = false; });
window.addEventListener('blur', () => { world.pointer.feeding = false; });

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); running = !running; last = performance.now(); }
  if (e.key === 's' || e.key === 'S') sound.toggle();
  if (e.key === 'r' || e.key === 'R') {
    world.reset();
    firedMilestones.clear();
    ctx.fillStyle = '#04050c';
    ctx.fillRect(0, 0, world.w, world.h);
  }
});

// ---------- 인트로 ----------
document.getElementById('awaken').addEventListener('click', () => {
  intro.classList.add('gone');
  document.body.classList.add('awake');
  running = true;
  last = performance.now();
  startSoundSafely();
});

// ---------- HUD ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 5200);
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function updateHud() {
  elGen.textContent  = world.maxGen;
  elPop.textContent  = world.creatures.length;
  elFood.textContent = world.food.length;
  elTime.textContent = fmtTime(world.time);
  drawGraph(gctx, world.history, graphCanvas.width, graphCanvas.height);

  for (const k in MILESTONES) {
    const n = Number(k);
    if (world.maxGen >= n && !firedMilestones.has(n)) {
      firedMilestones.add(n);
      showToast(MILESTONES[k]);
    }
  }
}

// ---------- 루프 ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (!running) return;

  world.step(dt);
  draw(ctx, world);

  hudAccum += dt;
  if (hudAccum > 0.18) {
    hudAccum = 0;
    updateHud();
  }
}
requestAnimationFrame(frame);