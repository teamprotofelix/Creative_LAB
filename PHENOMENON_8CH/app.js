/* PHENOMENON / Eight chapters. Offline-first, no third-party requests. */
(() => {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cosmos = $('#cosmos');
  const context = cosmos.getContext('2d', { alpha: false });
  const status = $('#live-announcement');
  const motionButton = $('#motion-toggle');
  const audioButton = $('#audio-toggle');
  const breathButton = $('#breath-toggle');
  const breathVisual = $('#breath-visual');
  const breathText = $('#breath-text');
  const breathCount = $('#breath-count');
  const timeDisplay = $('#time-display');
  const progress = $('#reading-fill');
  const chapters = $$('.chapter');
  const navLinks = $$('.chapter-navigation a');
  const lightField = $('#light-field');
  const lightPrompt = $('#light-prompt');
  const lightCount = $('#light-count');
  const eye = $('#eye');
  const iris = $('.eye-iris');
  const glow = $('#cursor-glow');
  const mediaMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let reduced = mediaMotion.matches;
  let currentChapter = 1;
  let visitElapsed = 0;
  let breathElapsed = 0;
  let breathPaused = false;
  let lastTimestamp = performance.now();
  let drawTimestamp = 0;
  let uiTimestamp = 0;
  let running = false;
  let rafId = 0;
  let w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), dpr = 1;
  let lightTotal = 0, lastLightStamp = -Infinity;
  let lastLightPoint = null;
  const mouse = { x: 0.5, y: 0.5 };
  const particles = [];
  const stars = [];
  const mobile = matchMedia('(max-width: 700px)');
  const maxParticles = () => mobile.matches ? 110 : 250;

  const memoryTexts = [
    '처음 걷던 날의 두려움',
    '한 번도 말하지 못한 고백',
    '비 오는 창가의 고요',
    '어머니의 손을 처음 잡았던 온기',
    '잊었다고 생각했던 그 이름',
    '끝나지 않을 것 같던 그 밤',
    '처음으로 죽음을 의식한 순간',
    '이름 모를 새소리에 멈춰 섰던 아침'
  ];

  function announce(message) {
    status.textContent = message;
  }

  function applyMotion(value) {
    reduced = value;
    document.body.classList.toggle('reduced-motion', reduced);
    motionButton.setAttribute('aria-pressed', String(reduced));
    motionButton.querySelector('.tool-label').textContent = reduced ? '움직임 켜기' : '움직임 줄이기';
    motionButton.setAttribute('title', reduced ? '움직임 켜기' : '움직임 줄이기');
    motionButton.setAttribute('aria-label', reduced ? '움직임 켜기' : '움직임 줄이기');
    if (reduced) {
      particles.length = 0;
      $$('.light-spark').forEach(el => el.remove());
      breathVisual.style.transform = 'scale(.85)';
    }
    renderBreath();
    renderCosmos(performance.now());
  }
  motionButton.addEventListener('click', () => {
    applyMotion(!reduced);
    announce(reduced ? '움직임이 줄어들었습니다.' : '움직임이 켜졌습니다.');
  });
  if (mediaMotion.addEventListener) {
    mediaMotion.addEventListener('change', e => applyMotion(e.matches));
  }

  // Precompute stable stars in normalized coordinates. Resizing retains the same star map.
  function initStars() {
    for (let i = 0; i < 290; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        r: .35 + Math.random() * 1.1,
        depth: .15 + Math.random() * .85,
        phase: Math.random() * Math.PI * 2,
        twinkle: .35 + Math.random() * .85
      });
    }
  }
  function resize() {
    w = Math.max(1, innerWidth);
    h = Math.max(1, innerHeight);
    dpr = Math.min(devicePixelRatio || 1, mobile.matches ? 1.35 : 1.75);
    if (context) {
      cosmos.width = Math.max(1, Math.floor(w * dpr));
      cosmos.height = Math.max(1, Math.floor(h * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderCosmos(performance.now());
    }
    updateNavigation();
  }

  function createParticle(x, y, velocity = 1) {
    const capacity = maxParticles();
    if (particles.length >= capacity) particles.splice(0, particles.length - capacity + 1);
    particles.push({ x, y,
      vx: (Math.random() - .5) * 1.8 * velocity,
      vy: (Math.random() - .5) * 1.8 * velocity - .28,
      ttl: .7 + Math.random() * .55,
      age: 0,
      size: .7 + Math.random() * 1.9
    });
  }
  function renderCosmos(now) {
    if (!context) return;
    context.fillStyle = '#05070d';
    context.fillRect(0, 0, w, h);
    const time = now / 1000;
    const xShift = reduced ? 0 : (mouse.x - .5) * 28;
    const yShift = reduced ? 0 : (mouse.y - .5) * 20;
    const sectionTint = currentChapter === 6 ? 8 : currentChapter === 7 ? 22 : 0;
    const nebula = context.createRadialGradient(w*.5,h*.49,0,w*.5,h*.49,Math.max(w,h)*.72);
    nebula.addColorStop(0, currentChapter === 2 ? 'rgba(44,37,46,.20)' : 'rgba(25,33,60,.27)');
    nebula.addColorStop(.75, 'rgba(7,8,18,.05)');
    nebula.addColorStop(1, 'rgba(2,4,9,.2)');
    context.fillStyle = nebula;
    context.fillRect(0, 0, w, h);
    const count = mobile.matches ? 140 : 250;
    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const x = (star.x * w + xShift * star.depth + w) % w;
      const y = (star.y * h + yShift * star.depth + h) % h;
      const tw = reduced ? .55 : .55 + .45 * Math.sin(time * star.twinkle + star.phase);
      context.fillStyle = `rgba(${200+sectionTint},${205+sectionTint},240,${(.17 + .52*tw) * star.depth})`;
      context.beginPath();
      context.arc(x, y, star.r, 0, Math.PI*2);
      context.fill();
    }
    if (particles.length) {
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const alpha = Math.max(0, 1 - p.age / p.ttl);
        const rad = p.size * (0.5 + alpha);
        context.fillStyle = `rgba(241,193,132,${alpha*.8})`;
        context.beginPath();context.arc(p.x, p.y, rad, 0, Math.PI*2);context.fill();
      }
      context.restore();
    }
  }
  function updateParticles(delta) {
    if (reduced) return;
    const factor = clamp(delta / 16.67, 0, 2);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.vx *= Math.pow(.98,factor);
      p.vy *= Math.pow(.98,factor);
      p.age += delta / 1000;
      if (p.age > p.ttl) particles.splice(i, 1);
    }
  }

  // Both circle motion and text use the same elapsed-time phase (no drifting timeout chain).
  const phaseNames = ['들이쉬세요', '머무르세요', '내쉬세요', '머무르세요'];
  function renderBreath() {
    if (reduced) {
      breathText.textContent = '편안하게 호흡하세요';
      breathCount.textContent = '—';
      breathVisual.style.transform = 'scale(.85)';
      return;
    }
    const cycle = breathElapsed % 16000;
    const phase = Math.floor(cycle / 4000);
    const p = (cycle % 4000) / 4000;
    const scale = phase === 0 ? .7 + .42*p : phase === 1 ? 1.12 : phase === 2 ? 1.12 - .42*p : .7;
    breathVisual.style.transform = `scale(${scale.toFixed(3)})`;
    breathText.textContent = breathPaused ? '잠시 쉬어도 좋습니다' : phaseNames[phase];
    breathCount.textContent = breathPaused ? '일시정지' : String(4 - Math.floor((cycle%4000)/1000));
  }
  breathButton.addEventListener('click', () => {
    breathPaused = !breathPaused;
    breathButton.setAttribute('aria-pressed', String(breathPaused));
    breathButton.textContent = breathPaused ? '호흡 가이드 다시 시작' : '호흡 가이드 일시정지';
    renderBreath();
    announce(breathPaused ? '호흡 가이드가 일시정지되었습니다.' : '호흡 가이드가 다시 시작되었습니다.');
  });

  function updateClock() {
    const total = Math.floor(visitElapsed / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    const next = `${mm}:${ss}`;
    if (timeDisplay.textContent !== next) timeDisplay.textContent = next;
  }
  function frame(timestamp) {
    running = true;
    const delta = clamp(timestamp - lastTimestamp, 0, 65);
    lastTimestamp = timestamp;
    visitElapsed += delta;
    if (currentChapter === 5 && !breathPaused) breathElapsed += delta;
    if (timestamp - uiTimestamp > 140) {
      updateClock();
      if (currentChapter === 5) renderBreath();
      uiTimestamp = timestamp;
    }
    const targetMs = reduced ? 900 : mobile.matches ? 1000/28 : 1000/45;
    if (timestamp - drawTimestamp >= targetMs) {
      updateParticles(reduced ? 0 : Math.min(60, timestamp - drawTimestamp));
      renderCosmos(timestamp);
      drawTimestamp = timestamp;
    }
    rafId = requestAnimationFrame(frame);
  }
  function suspendVisuals() {
    if (!running) return;
    cancelAnimationFrame(rafId);
    running = false;
  }
  function resumeVisuals() {
    lastTimestamp = performance.now();
    drawTimestamp = 0;
    if (running || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  // A single pointer pipeline supports mouse, stylus, touch, and mobile taps.
  function sparkle(event, force = false) {
    if (!force && event.pointerType === 'touch' && event.buttons === 0) return;
    const now = performance.now();
    if (!force && now - lastLightStamp < 27) return;
    lastLightStamp = now;
    const rect = lightField.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    if (x < 1 || y < 1 || x > rect.width - 1 || y > rect.height - 1) return;
    lightTotal++;
    lightCount.textContent = `${lightTotal.toLocaleString('ko-KR')}개의 빛`;
    lightPrompt.style.opacity = '.24';
    if (!reduced) {
      const spark = document.createElement('span');
      spark.className = 'light-spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--dx', `${(Math.random()-.5)*90}px`);
      spark.style.setProperty('--dy', `${(Math.random()-.5)*90}px`);
      lightField.appendChild(spark);
      if (lightField.querySelectorAll('.light-spark').length > 35) lightField.querySelector('.light-spark').remove();
      spark.addEventListener('animationend', () => spark.remove(), {once: true});
    }
    const count = reduced ? 2 : (force ? 12 : 4);
    for(let i=0; i<count; i++) createParticle(event.clientX,event.clientY,force ? 1.5 : 1);
    lastLightPoint = { x, y };
  }
  lightField.addEventListener('pointerdown', e => { sparkle(e, true); });
  lightField.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen' || (e.pointerType === 'touch' && e.buttons)) sparkle(e);
  }, {passive:true});
  lightField.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const r = lightField.getBoundingClientRect();
      sparkle({ clientX: r.left+r.width*.5, clientY: r.top+r.height*.5, pointerType: 'keyboard' }, true);
    }
  });

  // Each memory is a real focusable button, not a hover-only decorative div.
  const memoryButtons = $$('.memory-star');
  memoryButtons.forEach(btn => {
    btn.setAttribute('aria-pressed','false');
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.memory);
      memoryButtons.forEach(b => {b.classList.remove('active');b.setAttribute('aria-pressed','false');});
      btn.classList.add('active');
      btn.setAttribute('aria-pressed','true');
      $('#memory-detail').textContent = memoryTexts[index];
    });
  });

  // Observer's pupil tracks the visitor while the relevant chapter is active.
  addEventListener('pointermove', e => {
    mouse.x = clamp(e.clientX / Math.max(w,1),0,1);
    mouse.y = clamp(e.clientY / Math.max(h,1),0,1);
    if (!reduced && e.pointerType === 'mouse') {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }
    if (currentChapter !== 6 || reduced) return;
    const rect = eye.getBoundingClientRect();
    const dx = e.clientX - (rect.left+rect.width/2);
    const dy = e.clientY - (rect.top+rect.height/2);
    const distance = Math.hypot(dx,dy) || 1;
    const radius = rect.width * .13;
    const amount = Math.min(distance,radius) / distance;
    iris.style.transform = `translate(${(dx*amount).toFixed(1)}px, ${(dy*amount).toFixed(1)}px)`;
  }, {passive:true});

  function updateNavigation() {
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.width = `${clamp(scrollY / scrollRange,0,1)*100}%`;
    let selected = 1;
    let bestDistance = Infinity;
    for (let i=0; i<chapters.length; i++) {
      const rect = chapters[i].getBoundingClientRect();
      const center = (rect.top + rect.bottom) / 2;
      const dist = Math.abs(center - innerHeight*.5);
      if (dist < bestDistance){bestDistance=dist; selected=i+1;}
    }
    if (selected !== currentChapter) {
      currentChapter = selected;
      if (selected !== 6) iris.style.transform = '';
    }
    navLinks.forEach(link => {
      if (Number(link.dataset.nav) === selected) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  let scrollQueued = false;
  addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; updateNavigation(); });
  }, {passive:true});
  addEventListener('resize', resize, {passive:true});

  // Do not hide readable content when IntersectionObserver is unsupported or JS fails to initialize.
  function setupReveals() {
    if (!('IntersectionObserver' in window)) return;
    const elements = $$('.reveal');
    const watcher = new IntersectionObserver(entries => {
      for (const entry of entries) if(entry.isIntersecting){
        entry.target.classList.add('visible');
        watcher.unobserve(entry.target);
      }
    }, { threshold: .05, rootMargin: '0px 0px -4% 0px' });
    elements.forEach(el => watcher.observe(el));
    document.documentElement.classList.add('js');
    // Prevent content on the first screen from disappearing on slow observer callbacks.
    $$('#chapter-1 .reveal').forEach(el => el.classList.add('visible'));
  }

  // Single WebAudio graph; repeated toggles do not accumulate oscillators.
  let audioContext = null;
  let audioGain = null;
  let audioRequested = false;
  let audioVersion = 0;
  let soundReady = true;
  function initAudio() {
    if (audioContext) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { soundReady = false; return false; }
    audioContext = new AC();
    audioGain = audioContext.createGain();
    audioGain.gain.value = 0;
    audioGain.connect(audioContext.destination);
    const notes = [110,164.81,220,329.63];
    const weights = [.38,.18,.11,.05];
    notes.forEach((frequency,i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = weights[i];
      osc.connect(gain); gain.connect(audioGain);
      osc.start();
    });
    return true;
  }
  function displayAudioState() {
    audioButton.setAttribute('aria-pressed',String(audioRequested));
    audioButton.querySelector('.tool-label').textContent = audioRequested ? '소리 끄기' : '소리 켜기';
    audioButton.title = audioRequested ? '소리 끄기' : '소리 켜기';
    audioButton.setAttribute('aria-label',audioRequested ? '소리 끄기' : '소리 켜기');
  }
  async function setAudio(value) {
    audioRequested = value;
    const version = ++audioVersion;
    displayAudioState();
    if (!initAudio()) {
      audioRequested = false; displayAudioState();
      announce('이 브라우저에서는 오디오 기능을 지원하지 않습니다.');
      return;
    }
    try {
      if (value && document.visibilityState === 'visible') await audioContext.resume();
      if (version !== audioVersion) return;
      const now = audioContext.currentTime;
      audioGain.gain.cancelScheduledValues(now);
      audioGain.gain.setTargetAtTime(value ? .13 : 0, now, value ? .55 : .18);
      if (!value) {
        setTimeout(async () => {
          if (version !== audioVersion || audioRequested || !audioContext || audioContext.state !== 'running') return;
          try { await audioContext.suspend(); } catch (_) {}
        }, 800);
      }
      announce(value ? '잔잔한 소리를 켰습니다.' : '소리를 껐습니다.');
    } catch (_) {
      audioRequested = false; displayAudioState();
      announce('오디오를 시작할 수 없습니다. 브라우저 설정을 확인해 주세요.');
    }
  }
  audioButton.addEventListener('click', () => {void setAudio(!audioRequested);});

  function onVisibility() {
    if (document.hidden) {
      suspendVisuals();
      if (audioContext && audioContext.state === 'running') void audioContext.suspend();
    } else {
      resumeVisuals();
      if (audioRequested && audioContext) void audioContext.resume();
    }
  }
  document.addEventListener('visibilitychange',onVisibility);
  addEventListener('pagehide', () => {
    suspendVisuals();
    if (audioContext && audioContext.state === 'running') void audioContext.suspend();
  });
  addEventListener('pageshow', () => {
    if (!document.hidden) { resumeVisuals(); if(audioRequested && audioContext) void audioContext.resume(); }
  });

  // The moment card is drawn entirely on-device. No screenshot libraries/network calls.
  function saveMoment() {
    try {
      const width = 1600, height = 900;
      const output = document.createElement('canvas');
      output.width = width; output.height = height;
      const g = output.getContext('2d');
      if (!g) throw new Error('canvas unsupported');
      const gradient = g.createRadialGradient(width*.5,height*.43,10,width*.5,height*.5,950);
      gradient.addColorStop(0,'#161a29'); gradient.addColorStop(.52,'#0a0d16'); gradient.addColorStop(1,'#030409');
      g.fillStyle = gradient; g.fillRect(0,0,width,height);
      for (const star of stars){
        const x=star.x*width, y=star.y*height;
        g.beginPath();g.arc(x,y,star.r*1.5,0,Math.PI*2);
        g.fillStyle=`rgba(219,224,248,${.2+star.depth*.5})`;g.fill();
      }
      const halo = g.createRadialGradient(width/2,340,1,width/2,340,200);
      halo.addColorStop(0,'rgba(251,218,166,.45)');halo.addColorStop(.15,'rgba(251,218,166,.08)');halo.addColorStop(1,'rgba(251,218,166,0)');
      g.fillStyle=halo;g.fillRect(width/2-200,140,400,400);
      g.fillStyle='#f7e6c5';g.beginPath();g.arc(width/2,340,6,0,Math.PI*2);g.fill();
      g.textAlign='center';
      g.fillStyle='#d2b88e';g.font='18px Georgia, serif';g.fillText('A  P H E N O M E N O N  C A L L E D  Y O U',width/2,125);
      g.fillStyle='#f6f0ec';g.font='56px "Batang", "Malgun Gothic", serif';g.fillText('당신은 지금,',width/2,545);
      g.fillStyle='#f0cf9a';g.font='bold 78px "Batang", "Malgun Gothic", serif';g.fillText('살아 있습니다.',width/2,655);
      g.fillStyle='#a3a8b5';g.font='23px "Batang", "Malgun Gothic", serif';g.fillText('이것으로 충분합니다.',width/2,715);
      const seconds=Math.floor(visitElapsed/1000);
      const text=`이곳에서 머문 시간  ${Math.floor(seconds/60)}분 ${seconds%60}초`;
      g.fillStyle='#8f96a9';g.font='18px "Malgun Gothic", sans-serif';g.fillText(text,width/2,812);
      const anchor = document.createElement('a');
      anchor.download = 'phenomenon-moment.png';
      anchor.href = output.toDataURL('image/png');
      document.body.appendChild(anchor); anchor.click();anchor.remove();
      $('#save-feedback').textContent = '1600 × 900 PNG 이미지가 생성되었습니다.';
      announce('이미지를 저장했습니다.');
    } catch (_) {
      $('#save-feedback').textContent = '이미지를 저장하지 못했습니다. 브라우저의 다운로드 허용 여부를 확인해 주세요.';
    }
  }
  $('#save-moment').addEventListener('click',saveMoment);

  initStars();
  setupReveals();
  applyMotion(reduced);
  renderBreath();
  resize();
  resumeVisuals();
})();
