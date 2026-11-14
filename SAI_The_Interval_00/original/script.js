// ============================================================
// 사이 · THE INTERVAL
// ============================================================

// ---------- Time-of-day color ----------
(function setTimeTheme() {
  const h = new Date().getHours();
  let theme = 'night';
  if (h >= 5 && h < 9) theme = 'dawn';
  else if (h >= 9 && h < 17) theme = 'day';
  else if (h >= 17 && h < 21) theme = 'dusk';
  document.body.classList.add(theme);
})();

// ---------- Trackers ----------
const sessionStart = Date.now();
let scrollCount = 0;
let lastScrollY = window.scrollY;

// ---------- Particles canvas ----------
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const mouse = { x: -9999, y: -9999 };

function resizeCanvas() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function initParticles() {
  particles = [];
  const count = Math.min(70, Math.floor(window.innerWidth / 22));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.35 + 0.15
    });
  }
}

function drawParticles() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;

    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const d2 = dx * dx + dy * dy;
    let alpha = p.a;

    if (d2 < 150 * 150) {
      const d = Math.sqrt(d2) || 0.001;
      alpha = p.a + (1 - d / 150) * 0.5;
      p.x += (dx / d) * 0.4;
      p.y += (dy / d) * 0.4;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
    ctx.fill();
  }

  // connection lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 110 * 110) {
        const d = Math.sqrt(d2);
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(180, 200, 255, ${(1 - d / 110) * 0.08})`;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
});
resizeCanvas();
initParticles();
drawParticles();

// ---------- Chapter reveal ----------
const chapters = document.querySelectorAll('.chapter');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      if (entry.target.id === 'time') startClock();
      if (entry.target.id === 'others') growConstellation();
      if (entry.target.id === 'return') finalize();
      if (entry.target.id === 'thought') spawnThoughts();
    }
  });
}, { threshold: 0.35 });

chapters.forEach((c) => observer.observe(c));

// ---------- Scroll counter ----------
window.addEventListener('scroll', () => {
  if (Math.abs(window.scrollY - lastScrollY) > 5) {
    scrollCount++;
    lastScrollY = window.scrollY;
  }
}, { passive: true });

// ---------- Clock ----------
let clockStarted = false;
function startClock() {
  if (clockStarted) return;
  clockStarted = true;
  const minEl = document.getElementById('minutes');
  const secEl = document.getElementById('seconds');
  const breathEl = document.getElementById('breath-count');

  function tick() {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    minEl.textContent = m;
    secEl.textContent = String(s).padStart(2, '0');
    breathEl.textContent = Math.floor(elapsed / 4); // ~15 breaths/min
  }
  tick();
  setInterval(tick, 1000);
}

// ---------- Thoughts ----------
const thoughtWords = [
  '기억', '후회', '기대', '두려움', '설렘',
  '그리움', '이름', '어제', '내일', '왜',
  '만약', '아마도', '언젠가', '다시', '아직'
];

let thoughtsSpawned = false;
function spawnThoughts() {
  if (thoughtsSpawned) return;
  thoughtsSpawned = true;
  const field = document.querySelector('.thought-field');
  if (!field) return;

  function spawn() {
    const w = document.createElement('span');
    w.className = 'thought-word';
    w.textContent = thoughtWords[Math.floor(Math.random() * thoughtWords.length)];
    w.style.left = (10 + Math.random() * 80) + '%';
    w.style.top = (30 + Math.random() * 50) + '%';
    w.style.fontSize = (0.75 + Math.random() * 0.6) + 'rem';
    w.style.animationDelay = '0s';
    field.appendChild(w);
    setTimeout(() => w.remove(), 8000);
    setTimeout(spawn, 900 + Math.random() * 1200);
  }
  spawn();
}

// ---------- Visits & Constellation ----------
const VISIT_KEY = 'sai_visits';
const FIRST_KEY = 'sai_first';
const STARS_KEY = 'sai_stars';

let visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
const firstVisit = localStorage.getItem(FIRST_KEY) || new Date().toISOString();
localStorage.setItem(FIRST_KEY, firstVisit);

visits += 1;
localStorage.setItem(VISIT_KEY, visits);

// Each visit adds a star to the personal constellation
let stars = [];
try {
  stars = JSON.parse(localStorage.getItem(STARS_KEY) || '[]');
} catch (_) { stars = []; }

// Add new star for this visit at organic position
stars.push({
  x: 15 + Math.random() * 70,
  y: 15 + Math.random() * 70,
  born: Date.now()
});
// Cap at 60 to keep it elegant
if (stars.length > 60) stars = stars.slice(-60);
localStorage.setItem(STARS_KEY, JSON.stringify(stars));

document.getElementById('visit-count').textContent = visits;

let constellationGrown = false;
function growConstellation() {
  if (constellationGrown) return;
  constellationGrown = true;
  const container = document.getElementById('constellation');
  if (!container) return;

  stars.forEach((s, i) => {
    const star = document.createElement('div');
    star.className = 'star';
    if (i === stars.length - 1) star.classList.add('new');
    star.style.left = s.x + '%';
    star.style.top = s.y + '%';
    star.style.animationDelay = (Math.random() * 3) + 's';
    star.style.transform = `translate(-50%,-50%) scale(${0.7 + Math.random() * 0.8})`;
    container.appendChild(star);
  });
}

// ---------- Final ----------
let finalized = false;
function finalize() {
  if (finalized) return;
  finalized = true;
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById('final-time').textContent =
    m > 0 ? `${m}분 ${s}초` : `${s}초`;
  document.getElementById('final-scroll').textContent = scrollCount;
}

// ---------- Restart ----------
document.getElementById('restart').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => location.reload(), 1200);
});

// ---------- Ambient sound ----------
let audioCtx = null;
let soundOn = false;
const soundBtn = document.getElementById('sound-toggle');

soundBtn.addEventListener('click', () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (!soundOn) {
    // Create three detuned sine waves — a "breathing chord"
    const master = audioCtx.createGain();
    master.gain.value = 0.03;
    master.connect(audioCtx.destination);

    const freqs = [110, 165, 220]; // A2, E3, A3
    freqs.forEach((f, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f + (Math.random() * 0.5 - 0.25);

      const gain = audioCtx.createGain();
      gain.gain.value = 0.4;

      // Slow LFO for breathing modulation
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.125 + idx * 0.03; // 8s cycle
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(master);
      osc.start();
      lfo.start();
    });

    soundBtn.textContent = '●';
    soundBtn.classList.add('on');
    soundOn = true;
  } else {
    audioCtx.close();
    audioCtx = null;
    soundBtn.textContent = '◦';
    soundBtn.classList.remove('on');
    soundOn = false;
  }
});
