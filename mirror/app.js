/* MIRROR — a self-contained experience, no external scripts or analytics. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const formatNumber = n => Math.round(n).toLocaleString('ko-KR');
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const sections = Array.from(document.querySelectorAll('main > section.chapter'));
  const navLinks = Array.from(document.querySelectorAll('#chapter-nav a'));
  const profile = { start: Date.now(), scrollDist: 0, mouseDist: 0, clicks: 0, longestPause: 0, tabHides: 0 };
  let lastScrollY = window.scrollY;
  let lastScrollAt = performance.now();
  let lastPointer = null;
  let pointer = { x: window.innerWidth * .6, y: window.innerHeight * .45 };
  let activeChapter = 0;
  let portraitVisible = false;
  let currentScrollY = window.scrollY;
  let lastUiUpdate = 0;

  function formattedTime(ms, decimals = 0) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(total / 60);
    const seconds = total % 60;
    const decimalsText = decimals ? '.' + String(Math.floor((ms % 1000) / 100)).padStart(1, '0') : '';
    return String(min).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + decimalsText;
  }
  function duration(ms) {
    const s = Math.floor(Math.max(0, ms) / 1000);
    return s < 60 ? s + '초' : Math.floor(s / 60) + '분 ' + (s % 60) + '초';
  }
  function distance(px) { return formatNumber(px) + ' px'; }
  function updateScrollUI() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const pct = clamp(window.scrollY / max * 100, 0, 100);
    $('progress-bar').style.width = pct.toFixed(2) + '%';
    $('progress-track').setAttribute('aria-valuenow', Math.round(pct));
    const mark = innerHeight * .43;
    let index = 0;
    sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= mark) index = i; });
    if (window.scrollY >= max - 4) index = 7;
    if (index !== activeChapter) {
      activeChapter = index;
      $('chapter-counter').innerHTML = String(index).padStart(2, '0') + ' <span>/</span> 07';
      navLinks.forEach((link, i) => {
        if (i === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }
  function recordScroll() {
    const y = window.scrollY;
    profile.scrollDist += Math.abs(y - lastScrollY);
    lastScrollY = y;
    currentScrollY = y;
    const now = performance.now();
    if (!document.hidden) profile.longestPause = Math.max(profile.longestPause, now - lastScrollAt);
    lastScrollAt = now;
    if (!silenceComplete && silenceInView) {
      silenceElapsed = 0;
      silenceLastFrame = now;
      $('silence-progress').firstElementChild.style.width = '0%';
    }
    if (breathRunning && Math.abs(y - breathStartScroll) > 8) resetBreath('움직임이 감지됐습니다. 5초를 다시 셉니다.');
    updateScrollUI();
  }
  addEventListener('scroll', recordScroll, { passive: true });
  addEventListener('resize', updateScrollUI, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      profile.tabHides++;
      profile.longestPause = Math.max(profile.longestPause, performance.now() - lastScrollAt);
      silenceElapsed = 0;
      if (breathRunning) resetBreath('탭을 벗어나 측정을 다시 시작합니다.');
      silenceLastFrame = performance.now();
      if (audioCtx && audioGain && audioOn) audioGain.gain.setTargetAtTime(0, audioCtx.currentTime, .15);
    } else {
      lastScrollAt = performance.now();
      silenceLastFrame = performance.now();
      if (audioCtx && audioGain && audioOn) audioGain.gain.setTargetAtTime(.022, audioCtx.currentTime, .6);
    }
  });
  document.addEventListener('click', () => { profile.clicks++; }, { passive: true });
  document.addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      if (lastPointer) {
        const delta = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
        if (delta < Math.hypot(innerWidth, innerHeight) * .8) profile.mouseDist += delta;
      }
      lastPointer = { x: e.clientX, y: e.clientY };
      if (finePointer && !reducedMotion) document.body.classList.add('has-mouse');
      if (breathRunning && Math.hypot(pointer.x - breathStartPointer.x, pointer.y - breathStartPointer.y) > 25) resetBreath('움직임이 감지됐습니다. 5초를 다시 셉니다.');
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { lastPointer = null; document.body.classList.remove('has-mouse'); });

  // Reveals enhance the text but never prevent access if observers are unavailable.
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: .06, rootMargin: '0px 0px -12px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else revealEls.forEach(el => el.classList.add('visible'));

  // Persistent word fading: only an index array lives in localStorage.
  const storageKey = 'mirror-consumed-v2';
  const sac = $('sacrifice');
  const words = sac.textContent.trim().split(/\s+/u);
  const wordEls = [];
  const readStoredIndices = () => {
    try {
      const current = localStorage.getItem(storageKey);
      const old = localStorage.getItem('mirror-consumed');
      const parsed = JSON.parse(current === null ? (old || '[]') : current);
      return Array.isArray(parsed) ? parsed.filter(x => Number.isInteger(x) && x >= 0 && x < words.length) : [];
    } catch { return []; }
  };
  const consumed = new Set(readStoredIndices());
  sac.replaceChildren();
  words.forEach((word, i) => {
    const el = document.createElement('span');
    el.className = 'word' + (consumed.has(i) ? ' consumed' : '');
    el.textContent = word;
    el.dataset.index = String(i);
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', word + ' — 선택하면 흐려집니다');
    el.setAttribute('aria-pressed', String(consumed.has(i)));
    sac.appendChild(el);
    if (i !== words.length - 1) sac.appendChild(document.createTextNode(' '));
    wordEls.push(el);
  });
  const consumedCounter = $('consumed-counter');
  function updateConsumedCounter() { consumedCounter.textContent = '사라진 단어 ' + consumed.size + ' / ' + words.length; }
  updateConsumedCounter();
  function consumeWord(index) {
    if (consumed.has(index)) return;
    consumed.add(index);
    wordEls[index].classList.add('consumed');
    wordEls[index].setAttribute('aria-pressed', 'true');
    updateConsumedCounter();
    try { localStorage.setItem(storageKey, JSON.stringify([...consumed].sort((a,b) => a - b))); } catch { /* private mode: this session still works */ }
    playTick();
  }
  function consumeTarget(target) {
    if (!(target instanceof Element)) return;
    const el = target.closest('.word');
    if (el && sac.contains(el)) consumeWord(Number(el.dataset.index));
  }
  sac.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') consumeTarget(e.target); });
  sac.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') consumeTarget(e.target); }, { passive: true });
  sac.addEventListener('click', e => consumeTarget(e.target));
  sac.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); consumeTarget(e.target); } });
  $('reset-words').addEventListener('click', () => {
    if (!window.confirm('이 브라우저에 남은 단어의 흔적을 모두 지울까요?')) return;
    consumed.clear();
    wordEls.forEach(el => { el.classList.remove('consumed'); el.setAttribute('aria-pressed', 'false'); });
    try { localStorage.removeItem(storageKey); localStorage.removeItem('mirror-consumed'); } catch { /* storage may be blocked */ }
    updateConsumedCounter();
  });

  // Five seconds of consciously remaining still.
  let breathRunning = false;
  let breathStartAt = 0;
  let breathStartScroll = 0;
  let breathStartPointer = { x: 0, y: 0 };
  function resetBreath(message) {
    if (!breathRunning) return;
    breathStartAt = performance.now();
    breathStartScroll = window.scrollY;
    breathStartPointer = { ...pointer };
    $('breath-num').textContent = '05';
    $('breath-result').textContent = message;
  }
  $('breath-start').addEventListener('click', () => {
    breathRunning = true;
    breathStartAt = performance.now();
    breathStartScroll = window.scrollY;
    breathStartPointer = { ...pointer };
    $('breath-start').disabled = true;
    $('breath-5').classList.add('active');
    $('breath-num').textContent = '05';
    $('breath-result').textContent = '지금 이 순간에 머물러 보세요.';
  });
  document.addEventListener('keydown', e => {
    if (!breathRunning) return;
    if (['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key)) resetBreath('키 입력이 감지됐습니다. 다시 시작합니다.');
  });
  document.addEventListener('touchmove', () => { if (breathRunning) resetBreath('손가락 움직임이 감지됐습니다. 다시 시작합니다.'); }, { passive: true });
  const totalLifeSeconds = Math.round(80 * 365.25 * 24 * 3600);
  function updateTime() {
    const ms = Date.now() - profile.start;
    $('elapsed').textContent = formattedTime(ms, 1);
    $('remaining').textContent = formatNumber(Math.max(0, totalLifeSeconds - Math.floor(ms / 1000)));
  }

  // Waiting experiment starts when the section becomes visible. Pauses when unseen.
  let attentionInView = false, attentionStarted = false, attentionComplete = false;
  let attentionElapsed = 0;
  const WAIT_MS = 4700;
  function startWait() {
    attentionStarted = true; attentionComplete = false; attentionElapsed = 0;
    $('loading-stage').hidden = false;
    $('loading-result').hidden = true;
    $('loading-progress').style.width = '0%';
    $('attention-note').textContent = '실제 네트워크 요청 없이 시간만 흐르고 있습니다.';
  }
  function finishWait() {
    attentionComplete = true;
    $('loading-stage').hidden = true;
    $('loading-result').hidden = false;
    $('loading-seconds').textContent = (attentionElapsed / 1000).toFixed(1) + '초';
    $('attention-note').textContent = '당신이 기다린 시간만 계산했습니다.';
  }
  $('replay-wait').addEventListener('click', startWait);
  // Silence is measured only when its chapter is visible and scrolling has stopped.
  let silenceInView = false, silenceElapsed = 0, silenceLastFrame = performance.now(), silenceComplete = false;
  const SILENCE_MS = 15000;
  function silenceStatus(message) { if ($('silence-status').textContent !== message) $('silence-status').textContent = message; }
  function updateSilence(dt, now) {
    if (silenceComplete || !silenceInView || document.hidden) return;
    if (now - lastScrollAt < 700) { silenceStatus('스크롤을 멈추면 침묵이 시작됩니다.'); return; }
    silenceElapsed = Math.min(SILENCE_MS, silenceElapsed + dt);
    $('silence-progress').firstElementChild.style.width = (silenceElapsed / SILENCE_MS * 100).toFixed(1) + '%';
    if (silenceElapsed >= SILENCE_MS) {
      silenceComplete = true;
      $('silence-ring').classList.add('complete');
      $('silence-text').hidden = false;
      silenceStatus('15초의 침묵을 완성했습니다.');
      return;
    }
    silenceStatus('침묵의 시간 · ' + Math.ceil((SILENCE_MS - silenceElapsed) / 1000) + '초');
  }
  if ('IntersectionObserver' in window) {
    const stageObserver = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (target.id === 'ch3') { attentionInView = isIntersecting; if (isIntersecting && !attentionStarted) startWait(); }
        if (target.id === 'ch5') {
          silenceInView = isIntersecting;
          silenceLastFrame = performance.now();
          if (!isIntersecting && !silenceComplete) {
            silenceElapsed = 0;
            $('silence-progress').firstElementChild.style.width = '0%';
            silenceStatus('여기에 잠시 머물러 주세요.');
          }
        }
        if (target.id === 'ch6') portraitVisible = isIntersecting;
      });
    }, { threshold: .42 });
    ['ch3','ch5','ch6'].forEach(id => stageObserver.observe($(id)));
  } else {
    attentionInView = true; startWait(); portraitVisible = true;
    silenceInView = false; // content remains legible on older browsers
    $('silence-text').hidden = false;
  }

  // Five choice ritual, accessible to pointer, touch and keyboard.
  const questions = [
    '당신이 이 버튼을 누른 순간, 무엇을 기대했나요?',
    '기대가 생긴 순간을 정확히 기억할 수 있나요?',
    '생각을 바라보는 사람과 그 생각은 같은 존재일까요?',
    '선택이 단순한 반응이라면, 망설임은 무엇일까요?',
    '정답은 없습니다. 방금 이 질문 앞에 머문 당신이 있습니다.'
  ];
  let clickStep = 0;
  $('ritual-button').addEventListener('click', () => {
    if (clickStep >= questions.length) return;
    const p = document.createElement('p');
    p.className = 'click-line';
    p.textContent = questions[clickStep];
    $('click-lines').appendChild(p);
    clickStep++;
    $('click-indicator').textContent = Array.from({ length: 5 }, (_, i) => i < clickStep ? '●' : '○').join(' ');
    $('click-indicator').setAttribute('aria-label', `다섯 번 중 ${clickStep}번 완료`);
    if (clickStep === 5) {
      $('ritual-button').disabled = true;
      $('ritual-button').textContent = '다섯 번의 선택이 남았습니다';
    }
  });

  // Optional, quiet audio. No audio plays until the visitor activates it.
  let audioCtx = null, audioGain = null, audioFilter = null, audioOn = false;
  const audioBtn = $('audio-toggle');
  function initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API is unavailable');
    if (audioCtx) return;
    audioCtx = new AC();
    audioGain = audioCtx.createGain();
    audioGain.gain.value = 0;
    audioFilter = audioCtx.createBiquadFilter();
    audioFilter.type = 'lowpass';
    audioFilter.frequency.value = 260;
    [55, 82.41, 110].forEach((hz, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = hz;
      gain.gain.value = index === 1 ? .24 : .1;
      osc.connect(gain); gain.connect(audioFilter); osc.start();
    });
    audioFilter.connect(audioGain); audioGain.connect(audioCtx.destination);
  }
  function setAudioStatus(on) {
    audioBtn.setAttribute('aria-pressed', String(on));
    audioBtn.setAttribute('title', on ? '명상음 끄기' : '명상음 켜기');
    audioBtn.querySelector('.audio-label').textContent = on ? '소리 켬' : '소리 끔';
  }
  audioBtn.addEventListener('click', async () => {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioOn = !audioOn;
      audioGain.gain.cancelScheduledValues(audioCtx.currentTime);
      audioGain.gain.setTargetAtTime(audioOn ? .022 : 0, audioCtx.currentTime, .32);
      setAudioStatus(audioOn);
    } catch { audioOn = false; setAudioStatus(false); audioBtn.title = '이 브라우저에서는 사운드를 사용할 수 없습니다'; }
  });
  let lastTickAt = 0;
  function playTick() {
    if (!audioOn || !audioCtx || document.hidden || performance.now() - lastTickAt < 100) return;
    lastTickAt = performance.now();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 420;
    gain.gain.setValueAtTime(.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.004, audioCtx.currentTime + .016);
    gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + .15);
    oscillator.connect(gain); gain.connect(audioCtx.destination);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + .16);
  }

  // A reproducible generative image based on this session's temporary measurements.
  const portraitCanvas = $('portrait-canvas');
  const portraitCtx = portraitCanvas.getContext('2d');
  function dataSnapshot() {
    const now = performance.now();
    return {
      time: Math.max(0, Date.now() - profile.start), scroll: profile.scrollDist,
      mouse: profile.mouseDist, clicks: profile.clicks,
      pause: Math.max(profile.longestPause, document.hidden ? 0 : now - lastScrollAt), hidden: profile.tabHides
    };
  }
  function sessionCode(d) {
    let x = (Math.floor(d.scroll) * 31 + Math.floor(d.mouse) * 13 + d.clicks * 997 + Math.floor(d.time / 1000)) >>> 0;
    x = Math.imul(x ^ x >>> 16, 2246822507) >>> 0;
    return x.toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
  }
  function portraitText(d) {
    return [
      'MIRROR · 나의 초상화',
      '머문 시간: ' + duration(d.time), '스크롤한 거리: ' + distance(d.scroll),
      '커서가 움직인 거리: ' + distance(d.mouse), '화면 클릭: ' + d.clicks + '회',
      '가장 길었던 스크롤 멈춤: ' + duration(d.pause), '탭을 벗어난 횟수: ' + d.hidden + '회',
      '이 기록은 현재 브라우저 세션에서 계산되었습니다.'
    ].join('\n');
  }
  function drawPortraitLines(ctx, x, y, w, h, d) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    const seed = Math.floor(d.scroll + d.mouse / 3 + d.clicks * 33);
    const paths = 62;
    const scale = Math.min(w / 620, h / 210);
    ctx.scale(scale, scale);
    for (let i = 0; i < paths; i++) {
      const t = i / (paths - 1);
      const theta = t * Math.PI * 2;
      ctx.beginPath();
      for (let j = 0; j <= 220; j++) {
        const a = j / 220 * Math.PI * 2;
        const r = 35 + i * .75 + Math.sin(a * (3 + d.clicks % 6) + t * 6) * (12 + d.scroll % 24) + Math.sin(a * 7 - seed * .002) * 7;
        const xx = Math.cos(a + theta * .2) * r * 1.9;
        const yy = Math.sin(a + theta * .2) * r * .72;
        if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = `rgba(223,185,136,${.03 + t * .13})`;
      ctx.lineWidth = .8;
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,224,193,.85)'; ctx.fill();
    ctx.restore();
  }
  function updatePortrait() {
    const d = dataSnapshot();
    $('p-time').textContent = duration(d.time);
    $('p-scroll').textContent = distance(d.scroll);
    $('p-mouse').textContent = distance(d.mouse);
    $('p-clicks').textContent = d.clicks + '회';
    $('p-pause').textContent = duration(d.pause);
    $('p-hidden').textContent = d.hidden + '회';
    $('portrait-seed').textContent = sessionCode(d);
    if (!portraitCtx) return;
    const rect = portraitCanvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const pw = Math.round(rect.width * pixelRatio), ph = Math.round(rect.height * pixelRatio);
    if (portraitCanvas.width !== pw || portraitCanvas.height !== ph) { portraitCanvas.width = pw; portraitCanvas.height = ph; }
    portraitCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    portraitCtx.clearRect(0, 0, rect.width, rect.height);
    drawPortraitLines(portraitCtx, 0, 0, rect.width, rect.height, d);
  }
  function downloadCanvas(c, filename) {
    function complete(blob) {
      if (!blob) { $('portrait-action-status').textContent = '이미지 저장을 지원하지 않는 브라우저입니다.'; return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.download = filename; a.href = url;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      $('portrait-action-status').textContent = '초상화 이미지를 준비했습니다.';
    }
    if (c.toBlob) c.toBlob(complete, 'image/png');
    else { try { const a = document.createElement('a'); a.download = filename; a.href = c.toDataURL('image/png'); a.click(); } catch { $('portrait-action-status').textContent = '이미지 저장을 지원하지 않는 브라우저입니다.'; } }
  }
  $('save-portrait').addEventListener('click', () => {
    const d = dataSnapshot();
    const c = document.createElement('canvas'); c.width = 1200; c.height = 950;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1200, 950); g.addColorStop(0, '#121717'); g.addColorStop(1, '#050708');
    x.fillStyle = g; x.fillRect(0, 0, 1200, 950);
    x.strokeStyle = 'rgba(223,185,136,.25)'; x.lineWidth = 2; x.strokeRect(54, 54, 1092, 842);
    x.fillStyle = '#dfb988'; x.font = '22px monospace'; x.fillText('◈  M I R R O R   /   SESSION PORTRAIT', 99, 116);
    x.fillStyle = '#eee9e0'; x.font = '48px sans-serif'; x.fillText('당신이 남긴 순간들', 99, 194);
    drawPortraitLines(x, 105, 215, 990, 280, d);
    const rows = [ ['머문 시간', duration(d.time)], ['스크롤한 거리', distance(d.scroll)], ['커서가 움직인 거리', distance(d.mouse)], ['화면 클릭', d.clicks + '회'], ['가장 길었던 스크롤 멈춤', duration(d.pause)], ['탭을 벗어난 횟수', d.hidden + '회'] ];
    rows.forEach(([label, value], i) => {
      const yy = 535 + i * 47;
      x.strokeStyle = 'rgba(223,185,136,.12)'; x.beginPath(); x.moveTo(100, yy + 13); x.lineTo(1100, yy + 13); x.stroke();
      x.fillStyle = '#aaa7a1'; x.font = '20px sans-serif'; x.textAlign = 'left'; x.fillText(label, 100, yy);
      x.fillStyle = '#dfb988'; x.font = '21px sans-serif'; x.textAlign = 'right'; x.fillText(value, 1090, yy);
    });
    x.textAlign = 'left'; x.fillStyle = '#897d6f'; x.font = '17px sans-serif';
    x.fillText('이 순간의 기록은 브라우저 안에서 만들어졌습니다.', 100, 864);
    downloadCanvas(c, 'MIRROR_초상화_' + new Date().toISOString().slice(0,10) + '.png');
  });
  $('copy-portrait').addEventListener('click', async () => {
    const text = portraitText(dataSnapshot());
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      $('portrait-action-status').textContent = '초상화의 글자 기록을 복사했습니다.';
    } catch {
      const el = document.createElement('textarea'); el.value = text;
      el.setAttribute('readonly', ''); el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      let success = false;
      try { success = document.execCommand('copy'); } catch { /* unsupported */ }
      el.remove();
      $('portrait-action-status').textContent = success ? '초상화의 글자 기록을 복사했습니다.' : '자동 복사가 지원되지 않습니다. 화면의 수치를 직접 선택해 주세요.';
    }
  });

  // Ending does not pretend that a normal page can close its browser tab.
  const curtain = $('end-curtain');
  function closeCurtain() {
    curtain.classList.remove('open'); curtain.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    $('finish-btn').focus({ preventScroll: true });
  }
  $('finish-btn').addEventListener('click', () => {
    $('final-message').textContent = '끝은 화면 밖에서 시작됩니다.';
    curtain.classList.add('open'); curtain.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('curtain-return').focus({ preventScroll: true });
  });
  $('curtain-return').addEventListener('click', closeCurtain);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && curtain.classList.contains('open')) closeCurtain(); });

  // Low-cost ambient background, capped at 25fps. Foreground text is independent.
  const backgroundCanvas = $('bg');
  const bgCtx = backgroundCanvas.getContext('2d', { alpha: false });
  let bgW = 1, bgH = 1, bgPixelRatio = 1;
  let stars = [];
  function resizeBg() {
    if (!bgCtx) return;
    bgW = innerWidth; bgH = innerHeight;
    bgPixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    backgroundCanvas.width = Math.round(bgW * bgPixelRatio);
    backgroundCanvas.height = Math.round(bgH * bgPixelRatio);
    stars = Array.from({ length: Math.min(90, Math.floor(bgW * bgH / 14500)) }, (_, i) => {
      const fract = v => v - Math.floor(v);
      return { x: fract(Math.sin(i * 91.7 + 4.2) * 49141.8), y: fract(Math.cos(i * 77.2 + 3.4) * 34521.1), a: .09 + fract(i * .618) * .26 };
    });
  }
  resizeBg(); addEventListener('resize', resizeBg, { passive: true });
  function drawBg(t) {
    if (!bgCtx) return;
    const ctx = bgCtx;
    ctx.setTransform(bgPixelRatio, 0, 0, bgPixelRatio, 0, 0);
    ctx.fillStyle = '#090b0c'; ctx.fillRect(0, 0, bgW, bgH);
    const rect = [[.28,.28,.5,86,58,78],[.79,.74,.46,54,71,71]];
    rect.forEach(([cx, cy, rr, r, g, b], i) => {
      const x = bgW * (cx + Math.sin(t * .00012 + i * 2) * .04);
      const y = bgH * (cy + Math.cos(t * .0001 + i) * .055);
      const rad = Math.max(bgW, bgH) * rr;
      const gr = ctx.createRadialGradient(x,y,0,x,y,rad);
      gr.addColorStop(0, `rgba(${r},${g},${b},.085)`); gr.addColorStop(1,'rgba(9,11,12,0)');
      ctx.fillStyle = gr; ctx.fillRect(0,0,bgW,bgH);
    });
    if (finePointer && document.body.classList.contains('has-mouse')) {
      const gr = ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,Math.min(270,bgW/2));
      gr.addColorStop(0,'rgba(223,185,136,.048)'); gr.addColorStop(1,'rgba(9,11,12,0)');
      ctx.fillStyle = gr; ctx.fillRect(0,0,bgW,bgH);
    }
    stars.forEach(s => { ctx.fillStyle = `rgba(230,205,168,${s.a})`; ctx.fillRect(s.x*bgW, s.y*bgH, .7, .7); });
  }

  // Delayed cursor: the circle follows the actual pointer more slowly than the dot.
  let ringX = pointer.x, ringY = pointer.y;
  let dotX = pointer.x, dotY = pointer.y;
  function drawCursor(dt) {
    if (!finePointer || !document.body.classList.contains('has-mouse') || reducedMotion) return;
    const ringFactor = 1 - Math.pow(.87, dt / 16.7);
    const dotFactor = 1 - Math.pow(.5, dt / 16.7);
    ringX += (pointer.x - ringX) * ringFactor; ringY += (pointer.y - ringY) * ringFactor;
    dotX += (pointer.x - dotX) * dotFactor; dotY += (pointer.y - dotY) * dotFactor;
    $('cursor-ring').style.left = ringX + 'px'; $('cursor-ring').style.top = ringY + 'px';
    $('cursor-dot').style.left = dotX + 'px'; $('cursor-dot').style.top = dotY + 'px';
  }
  let lastFrame = performance.now(), lastBgDraw = 0;
  function frame(now) {
    const dt = Math.max(0, Math.min(120, now - lastFrame));
    lastFrame = now;
    if (!document.hidden) {
      drawCursor(dt);
      if (now - lastBgDraw >= (reducedMotion ? 8000 : 40)) { drawBg(now); lastBgDraw = now; }
      if (breathRunning) {
        const remain = Math.max(0, 5000 - (now - breathStartAt));
        $('breath-num').textContent = String(Math.ceil(remain / 1000)).padStart(2, '0');
        if (remain <= 0) {
          breathRunning = false;
          $('breath-num').textContent = '✳';
          $('breath-5').classList.remove('active');
          $('breath-start').disabled = false;
          $('breath-start').textContent = '다시 경험하기 ↺';
          $('breath-result').textContent = '5초가 지났습니다. 그 시간은 어떻게 느껴졌나요?';
        }
      }
      if (attentionInView && attentionStarted && !attentionComplete) {
        attentionElapsed = Math.min(WAIT_MS, attentionElapsed + dt);
        $('loading-progress').style.width = (attentionElapsed / WAIT_MS * 100).toFixed(1) + '%';
        if (attentionElapsed >= WAIT_MS) finishWait();
      }
      updateSilence(dt, now);
      if (now - lastUiUpdate > 180) {
        updateTime();
        if (portraitVisible) updatePortrait();
        if (audioOn && audioCtx && audioFilter) {
          audioFilter.frequency.setTargetAtTime(175 + 230 * Math.min(1, profile.scrollDist / 35000), audioCtx.currentTime, .8);
        }
        lastUiUpdate = now;
      }
    }
    requestAnimationFrame(frame);
  }
  updateScrollUI(); updateTime(); drawBg(0);
  requestAnimationFrame(frame);
  console.log('%c◈  MIRROR', 'color:#dfb988;font-size:24px;letter-spacing:6px;font-family:Georgia,serif');
  console.log('%c당신은 콘솔을 열었습니다. 이것 또한 하나의 관찰입니다.', 'color:#c4afa0;font-size:13px');
  console.log('%c이 페이지는 추적 서버나 분석 도구에 연결되지 않습니다.', 'color:#8c8f89;font-size:11px');
})();
