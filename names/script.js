/* Universe of Names — self-contained, deterministic, GitHub Pages / file:// safe. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const els = {
    canvas: $('universe'), entry: $('entry'), ui: $('ui'), form: $('nameForm'),
    input: $('nameInput'), title: $('universeTitle'), slider: $('timeSlider'),
    poem: $('poem'), chapter: $('chapter'), time: $('timeReadout'), seed: $('seedInfo'),
    sound: $('soundBtn'), bang: $('bounceBtn'), share: $('shareBtn'), reset: $('resetBtn'),
    toast: $('toast'), hint: $('centerHint')
  };
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PI2 = Math.PI * 2;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

  // Name identity: NFC avoids different universes for canonically equivalent Korean/Unicode text.
  function canonicalName(input) {
    const normalized = String(input || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
    let units;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      units = [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(normalized)].map(e => e.segment);
    } else {
      units = Array.from(normalized);
    }
    return units.slice(0, 16).join('');
  }
  function letters(name) {
    return (typeof Intl !== 'undefined' && Intl.Segmenter)
      ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(name)].map(e => e.segment)
      : Array.from(name);
  }
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CHAPTERS = [
    { n: 0,  label: 'CHAPTER I · 태초', text: '빅뱅. 아무것도 없던 곳에서 당신의 이름이 첫 번째 빛이 되었다.' },
    { n: 15, label: 'CHAPTER II · 연결', text: '별들이 서로를 알아보기 시작했다. 이름의 각 글자가 별이 되어 서로를 이어주었다.' },
    { n: 35, label: 'CHAPTER III · 은하', text: '은하가 피어났다. 당신의 이름은 우주의 중심에서 아주 천천히 회전하고 있다.' },
    { n: 55, label: 'CHAPTER IV · 응시', text: '지금 이 우주는 당신을 관찰하고 있다. 그리고 당신도 이 우주를 바라보고 있다.' },
    { n: 75, label: 'CHAPTER V · 저녁', text: '가장 밝았던 별들이 하나둘 저마다의 이야기를 마쳤다. 이름의 윤곽이 흐려진다.' },
    { n: 95, label: 'CHAPTER VI · 귀환', text: '그러나 우주는 완전히 사라지지 않는다. 형태를 바꿀 뿐이다. 언젠가 다시, 빅뱅.' }
  ];

  let toastTimeout = null;
  function notify(message) {
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => els.toast.classList.remove('visible'), 2100);
  }

  class SoundEngine {
    constructor() { this.ctx = null; this.enabled = false; }
    async toggle() {
      if (this.enabled) {
        this.enabled = false;
        return false;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('Web Audio 미지원');
      if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (this.ctx.state !== 'running') throw new Error('오디오 재생이 차단되었습니다');
      this.enabled = true;
      return true;
    }
    note(freq, duration = 1.75, volume = .12) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const g2 = this.ctx.createGain();
        o1.type = 'sine'; o1.frequency.setValueAtTime(freq, now);
        o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * 2, now);
        g2.gain.value = .17;
        g.gain.setValueAtTime(.0001, now);
        g.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + .04);
        g.gain.exponentialRampToValueAtTime(.0001, now + duration);
        o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.ctx.destination);
        o1.start(now); o2.start(now);
        o1.stop(now + duration + .03); o2.stop(now + duration + .03);
      } catch (error) { console.warn('Audio note skipped:', error); }
    }
    bigBang() {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(86, now);
        o.frequency.exponentialRampToValueAtTime(34, now + 2.0);
        g.gain.setValueAtTime(.16, now);
        g.gain.exponentialRampToValueAtTime(.0001, now + 2.1);
        o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + 2.15);
      } catch (error) { console.warn('Audio big bang skipped:', error); }
    }
  }
  const audio = new SoundEngine();

  class Universe {
    constructor(canvas, name) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.name = name;
      this.seed = hashString(name);
      this.active = true;
      this.raf = 0;
      this.w = 1; this.h = 1;
      this.rotation = 0;
      this.currentTime = 50; this.targetTime = 50;
      this.birthProgress = prefersReducedMotion ? 1 : 0;
      this.mouse = { x: -1000, y: -1000, fx: 0, fy: 0 };
      this.bursts = [];
      this.selected = -1;
      this.age = 0;
      this.lastFrame = null;
      this.lastPaint = 0;
      this.frameMs = prefersReducedMotion ? 70 : (innerWidth < 700 ? 33 : 22);
      this.generate();
      this.resize();
      this.onResize = () => this.resize();
      this.onPointerMove = e => this.pointerMove(e);
      this.onPointerLeave = () => { this.mouse.x = -1000; this.mouse.y = -1000; this.canvas.style.cursor = 'default'; };
      this.onPointerDown = e => this.pointerDown(e);
      this.onKeydown = e => this.keydown(e);
      this.onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(this.raf); this.raf = 0; this.lastFrame = null;
        } else { this.start(); }
      };
      this.frame = now => this.tick(now);
      window.addEventListener('resize', this.onResize);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerleave', this.onPointerLeave);
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('keydown', this.onKeydown);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.start();
    }
    generate() {
      const r = mulberry32(this.seed);
      this.stars = Array.from({ length: 510 }, () => ({
        x: r(), y: r(), size: .3 + r() * 1.5,
        phase: r() * PI2, speed: .22 + r() * 1.2, depth: .5 + r() * .5,
        hue: r() * 55 - 15
      }));
      this.nebulae = Array.from({ length: 4 }, () => ({
        x: .19 + r() * .62, y: .17 + r() * .6,
        radius: .23 + r() * .16,
        hue: 198 + r() * 140, drift: r() * PI2
      }));
      const chars = letters(this.name);
      const baseAngle = r() * PI2;
      const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
      this.constellation = chars.map((char, i) => {
        const angle = baseAngle + i * 2.399963229728653 + (r() - .5) * .21;
        const radial = chars.length === 1 ? 0 : .25 + .68 * Math.sqrt((i + .7) / chars.length);
        const stretch = .78 + r() * .18;
        return { char, x: Math.cos(angle) * radial * stretch, y: Math.sin(angle) * radial * stretch,
          phase: r() * PI2, note: scale[(this.seed + i * 3) % scale.length] };
      });
    }
    resize() {
      this.w = Math.max(1, window.innerWidth);
      this.h = Math.max(1, window.innerHeight);
      if (!this.ctx) return;
      const mobile = this.w < 700;
      this.frameMs = prefersReducedMotion ? 70 : (mobile ? 33 : 22);
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 1.8);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.prerenderNebulae();
    }
    prerenderNebulae() {
      // Capped offscreen textures prevent very large allocations on wide / high-DPR screens.
      const size = clamp(Math.round(Math.min(this.w, this.h) * .8), 230, 650);
      this.sprites = this.nebulae.map(n => {
        const c = document.createElement('canvas'); c.width = size; c.height = size;
        const gctx = c.getContext('2d');
        if (!gctx) return { canvas: null, nebula: n };
        const grad = gctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, `hsla(${n.hue}, 80%, 63%, .34)`);
        grad.addColorStop(.42, `hsla(${n.hue}, 62%, 47%, .115)`);
        grad.addColorStop(1, `hsla(${n.hue}, 50%, 34%, 0)`);
        gctx.fillStyle = grad; gctx.fillRect(0, 0, size, size);
        return { canvas: c, nebula: n };
      });
    }
    start() {
      if (this.active && !document.hidden && !this.raf) {
        this.lastFrame = null;
        this.lastPaint = 0;
        this.raf = requestAnimationFrame(this.frame);
      }
    }
    tick(now) {
      this.raf = 0;
      if (!this.active || document.hidden) return;
      if (this.lastPaint && now - this.lastPaint < this.frameMs) {
        this.raf = requestAnimationFrame(this.frame);
        return;
      }
      const dt = this.lastFrame === null ? .0167 : clamp((now - this.lastFrame) / 1000, 0, .06);
      this.lastFrame = now; this.lastPaint = now;
      this.age += dt;
      const smoothing = 1 - Math.exp(-dt * 8);
      this.currentTime += (this.targetTime - this.currentTime) * smoothing;
      if (Math.abs(this.currentTime - this.targetTime) < .03) this.currentTime = this.targetTime;
      if (!prefersReducedMotion) {
        this.rotation += dt * (.026 + this.currentTime * .00012);
        this.birthProgress = Math.min(1, this.birthProgress + dt * .47);
      }
      for (let i = this.bursts.length - 1; i >= 0; i--) {
        const p = this.bursts[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt * 1.15;
        if (p.life <= 0) this.bursts.splice(i, 1);
      }
      this.draw();
      this.raf = requestAnimationFrame(this.frame);
    }
    birth() {
      this.birthProgress = prefersReducedMotion ? 1 : 0;
      this.age = 0;
      this.bursts.length = 0;
      audio.bigBang();
    }
    setTime(value) { this.targetTime = clamp(finite(Number(value), 50), 0, 100); }
    getPoints() {
      const t = clamp(this.currentTime / 100, 0, 1);
      const evolution = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .32);
      const scale = (.20 + .80 * evolution) * (1 - Math.pow(1 - this.birthProgress, 3));
      const rad = Math.min(this.w * .38, this.h * .31, 320) * scale;
      const centerX = this.w / 2;
      const centerY = this.h * (this.w < 650 ? .46 : .47);
      const cs = Math.cos(this.rotation), sn = Math.sin(this.rotation);
      return this.constellation.map(p => ({
        x: centerX + (p.x * cs - p.y * sn) * rad,
        y: centerY + (p.x * sn + p.y * cs) * rad,
        p
      }));
    }
    pointerMove(event) {
      if (!this.active) return;
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - r.left;
      this.mouse.y = event.clientY - r.top;
      this.mouse.fx = this.mouse.x / Math.max(1, r.width) - .5;
      this.mouse.fy = this.mouse.y / Math.max(1, r.height) - .5;
      const radius = event.pointerType === 'touch' ? 42 : 35;
      this.canvas.style.cursor = this.getPoints().some(v => Math.hypot(v.x - this.mouse.x, v.y - this.mouse.y) < radius) ? 'pointer' : 'default';
    }
    pointerDown(event) {
      if (!this.active) return;
      const r = this.canvas.getBoundingClientRect();
      const x = event.clientX - r.left, y = event.clientY - r.top;
      const radius = event.pointerType === 'touch' ? 48 : 38;
      const pts = this.getPoints();
      let closest = -1, min = radius;
      pts.forEach((v, i) => { const d = Math.hypot(v.x - x, v.y - y); if (d < min) { min = d; closest = i; } });
      if (closest >= 0) this.chooseStar(closest);
      else this.spawnBurst(x, y, 9, .45);
    }
    keydown(event) {
      if (!this.active) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        this.selected = (this.selected + (event.key === 'ArrowRight' ? 1 : -1) + this.constellation.length) % this.constellation.length;
        notify(`선택한 별: ${this.constellation[this.selected].char}`);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.chooseStar(Math.max(0, this.selected));
      }
    }
    chooseStar(index) {
      const point = this.getPoints()[index];
      if (!point) return;
      this.selected = index;
      this.spawnBurst(point.x, point.y, 24, 1);
      audio.note(point.p.note);
      notify(`「${point.p.char}」 별이 응답했습니다${audio.enabled ? ' ♪' : ' ✦'}`);
    }
    spawnBurst(x, y, count = 20, force = 1) {
      const r = mulberry32((this.seed ^ Math.round(x * 59) ^ (Math.round(y * 71) << 1) ^ Math.floor(this.age * 1000)) >>> 0);
      for (let i = 0; i < count; i++) {
        const a = r() * PI2;
        const v = (45 + r() * 160) * force;
        this.bursts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          hue: 32 + r() * 55, life: .7 + r() * .3 });
      }
      if (this.bursts.length > 140) this.bursts.splice(0, this.bursts.length - 140);
    }
    draw() {
      const ctx = this.ctx; if (!ctx) return;
      const w = this.w, h = this.h;
      const t = clamp(this.currentTime / 100, 0, 1);
      const life = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .7);
      ctx.fillStyle = `hsl(${251 - t * 34}, 48%, ${2.5 + life * 1.5}%)`;
      ctx.fillRect(0, 0, w, h);
      const centerX = w / 2, centerY = h * .47;
      // A hot singularity at birth, a fading memory at extinction.
      const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * (.12 + life * .45));
      core.addColorStop(0, `rgba(${t > .7 ? '155,130,220' : '244,205,170'}, ${(.07 + .14 * (1 - t)) * this.birthProgress})`);
      core.addColorStop(1, 'rgba(6,5,15,0)');
      ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const s of this.sprites) {
        if (!s.canvas) continue;
        const n = s.nebula;
        const x = w * n.x + Math.sin(this.rotation + n.drift) * 15 + this.mouse.fx * -16;
        const y = h * n.y + Math.cos(this.rotation + n.drift) * 15 + this.mouse.fy * -16;
        const size = Math.min(Math.max(w, h) * n.radius * 2.1, 1000);
        ctx.globalAlpha = (.06 + .44 * life) * this.birthProgress;
        ctx.drawImage(s.canvas, x - size / 2, y - size / 2, size, size);
      }
      ctx.restore();
      const starCount = Math.floor((12 + (this.stars.length - 12) * Math.pow(life, 1.18)) * this.birthProgress);
      const spread = (.10 + .93 * Math.pow(life, .45)) * (1 - Math.pow(1 - this.birthProgress, 3));
      const starHue = 205 - t * 150;
      for (let i = 0; i < starCount; i++) {
        const s = this.stars[i];
        const wave = prefersReducedMotion ? .75 : .5 + .5 * Math.sin(this.age * s.speed * 1.3 + s.phase);
        const x = centerX + (s.x - .5) * w * spread + this.mouse.fx * 7 * s.depth;
        const y = centerY + (s.y - .47) * h * spread + this.mouse.fy * 7 * s.depth;
        ctx.fillStyle = `hsla(${starHue + s.hue}, ${62 + wave * 26}%, ${67 + wave * 27}%, ${(.34 + wave * .63) * (.25 + life * .75)})`;
        ctx.beginPath(); ctx.arc(x, y, s.size * (.62 + wave * .5), 0, PI2); ctx.fill();
      }
      const pts = this.getPoints();
      const pointOpacity = clamp((.22 + .78 * life) * this.birthProgress, 0, 1);
      if (pts.length > 1 && this.birthProgress > .65) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = `rgba(244,210,167,${pointOpacity * .31})`;
        ctx.lineWidth = .8; ctx.stroke();
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; const selected = i === this.selected;
        const hover = selected || Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y) < 34;
        const pulse = prefersReducedMotion ? .92 : .75 + .25 * Math.sin(this.age * 1.2 + p.p.phase);
        const radius = hover ? 37 : 29;
        const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gl.addColorStop(0, `rgba(255,231,182,${(.44 + (hover ? .30 : 0)) * pulse * pointOpacity})`);
        gl.addColorStop(.42, `rgba(245,171,130,${.13 * pulse * pointOpacity})`);
        gl.addColorStop(1, 'rgba(225,165,125,0)');
        ctx.fillStyle = gl; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
        ctx.fillStyle = `rgba(255,245,219,${pointOpacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, (hover ? 3.6 : 2.8) * pulse, 0, PI2); ctx.fill();
        ctx.save();
        ctx.font = `${hover ? 600 : 400} ${w < 700 ? 13 : 15}px ui-sans-serif,system-ui,"Malgun Gothic",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255,231,195,${pointOpacity * .90})`;
        ctx.shadowBlur = hover ? 17 : 8; ctx.shadowColor = 'rgba(255,198,121,.85)';
        ctx.fillText(p.p.char, p.x, p.y + (w < 700 ? 21 : 25));
        ctx.restore();
      }
      for (const p of this.bursts) {
        ctx.fillStyle = `hsla(${p.hue},85%,70%,${p.life})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.2, p.life * 2.2), 0, PI2); ctx.fill();
      }
    }
    destroy() {
      if (!this.active) return;
      this.active = false;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      window.removeEventListener('resize', this.onResize);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.sprites = [];
      this.bursts.length = 0;
      this.canvas.style.cursor = 'default';
    }
  }

  let universe = null;
  let currentName = '';
  let hintTimer = null;
  function setView(inside) {
    els.entry.classList.toggle('active', !inside);
    els.entry.setAttribute('aria-hidden', String(inside));
    if ('inert' in els.entry) els.entry.inert = inside;
    els.ui.classList.toggle('active', inside);
    els.ui.setAttribute('aria-hidden', String(!inside));
    if ('inert' in els.ui) els.ui.inert = !inside;
    els.canvas.tabIndex = inside ? 0 : -1;
    els.canvas.style.pointerEvents = inside ? 'auto' : 'none';
  }
  function updateVerse(number) {
    const t = clamp(Number(number) || 0, 0, 100);
    let chosen = CHAPTERS[0];
    for (const chapter of CHAPTERS) { if (t >= chapter.n) chosen = chapter; else break; }
    els.chapter.textContent = chosen.label;
    els.poem.textContent = chosen.text;
    els.time.textContent = `${String(Math.round(t)).padStart(2, '0')} / 100`;
    els.slider.setAttribute('aria-valuetext', `우주 시간 ${Math.round(t)}. ${chosen.label}`);
  }
  function setNameInUrl(name) {
    try {
      const url = new URL(window.location.href);
      if (name) url.searchParams.set('name', name);
      else url.searchParams.delete('name');
      history.replaceState(null, '', url.toString());
    } catch (error) { console.warn('URL could not be updated:', error); }
  }
  function saveLastName(name) {
    try { localStorage.setItem('universe_name', name); } catch (_) { /* Storage may be disabled. */ }
  }
  function enterUniverse(rawName, { updateUrl = true, save = true } = {}) {
    const name = canonicalName(rawName);
    if (!name) { notify('이름을 입력해 주세요.'); els.input.focus(); return; }
    // Destroy before creating to guarantee exactly one render loop and one set of handlers.
    if (universe) { universe.destroy(); universe = null; }
    currentName = name;
    els.input.value = name;
    els.slider.value = '50'; updateVerse(50);
    els.title.textContent = name + '의 우주';
    const seedHex = hashString(name).toString(16).toUpperCase().padStart(8, '0');
    els.seed.textContent = 'UNIVERSE · ' + seedHex + '  /  LINK ↗';
    setView(true);
    universe = new Universe(els.canvas, name);
    if (!universe.ctx) notify('이 브라우저에서는 캔버스 효과가 제한됩니다.');
    if (updateUrl) setNameInUrl(name);
    if (save) saveLastName(name);
    clearTimeout(hintTimer);
    els.hint.classList.add('visible');
    hintTimer = setTimeout(() => els.hint.classList.remove('visible'), prefersReducedMotion ? 1600 : 5000);
  }
  function leaveUniverse() {
    if (universe) { universe.destroy(); universe = null; }
    currentName = '';
    clearTimeout(hintTimer);
    els.hint.classList.remove('visible');
    setView(false);
    setNameInUrl('');
    els.input.focus();
  }
  async function copyLink() {
    if (!currentName) return;
    const link = new URL(window.location.href);
    link.searchParams.set('name', currentName);
    const text = link.toString();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Works in many browsers when opened as file://, too.
        const area = document.createElement('textarea');
        area.value = text; area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(area);
        area.select();
        const success = document.execCommand && document.execCommand('copy');
        area.remove();
        if (!success) throw new Error('clipboard unavailable');
      }
      notify('우주 주소를 복사했습니다 ✦');
    } catch (_) {
      notify('복사가 차단됐습니다. 주소창에서 복사해 주세요.');
    }
  }
  function updateSoundUI(on) {
    els.sound.setAttribute('aria-pressed', String(on));
    els.sound.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
    els.sound.title = on ? '소리 끄기' : '소리 켜기';
    els.sound.innerHTML = `♪<span class="sound-label"> ${on ? 'ON' : 'OFF'}</span>`;
  }
  function init() {
    // All handlers are installed BEFORE the shared-link route is processed.
    setView(false);
    els.form.addEventListener('submit', event => {
      event.preventDefault(); enterUniverse(els.input.value);
    });
    els.slider.addEventListener('input', event => {
      const time = clamp(Number(event.target.value), 0, 100);
      if (universe) universe.setTime(time);
      updateVerse(time);
    });
    els.bang.addEventListener('click', () => { if (universe) { universe.birth(); notify('다시, 최초의 빛이 켜집니다.'); } });
    els.reset.addEventListener('click', leaveUniverse);
    els.share.addEventListener('click', copyLink);
    els.seed.addEventListener('click', copyLink);
    els.sound.addEventListener('click', async () => {
      try {
        const on = await audio.toggle();
        updateSoundUI(on);
        notify(on ? '별자리의 소리가 켜졌습니다 ♪' : '조용한 우주로 돌아왔습니다.');
        if (on) audio.note(392, 1, .07);
      } catch (error) { updateSoundUI(false); notify(error.message || '소리를 시작할 수 없습니다.'); }
    });
    window.addEventListener('popstate', () => {
      let name = '';
      try { name = canonicalName(new URLSearchParams(location.search).get('name')); } catch (_) { /* ignore */ }
      if (name) enterUniverse(name, { updateUrl: false, save: false });
      else if (universe) leaveUniverse();
    });
    try {
      const stored = localStorage.getItem('universe_name');
      if (stored) els.input.value = canonicalName(stored);
    } catch (_) { /* browser may disable storage */ }
    let routeName = '';
    try { routeName = canonicalName(new URLSearchParams(location.search).get('name')); } catch (_) { /* malformed url */ }
    if (routeName) enterUniverse(routeName, { updateUrl: false, save: false });
    updateSoundUI(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
