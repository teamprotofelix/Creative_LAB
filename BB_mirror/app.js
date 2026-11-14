/* MIRROR OF COGNITION · An offline-first, accessible 8-act experience.
   No external data collection. All optional memories remain in this browser. */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const canvas = $('#universe');
  const ctx = canvas && canvas.getContext('2d');
  const chapters = $$('.chapter');
  const chapterNames = ['관찰', '흔적', '호흡', '시간', '질문', '기억', '소멸', '귀환'];
  const KEY = 'mirror-of-cognition.v2';
  const QUESTIONS = [
    { title: '당신이 가장 두려워하는 것은?', options: [
      { value: 'forgotten', label: '잊혀지는 것', line: '사라지는 이름을 붙들려는 마음으로,' },
      { value: 'eternity', label: '영원한 것', line: '끝나지 않는 시간을 바라보며,' },
      { value: 'nothing', label: '아무것도 두렵지 않다', line: '두려움마저 조용히 지나보내며,' },
      { value: 'fear', label: '두려움 그 자체', line: '두려움의 윤곽을 헤아리며,' }
    ] },
    { title: '시간이란 무엇입니까?', options: [
      { value: 'flowing', label: '흐르는 것', line: '시간을 흐르는 강이라고 부릅니다.' },
      { value: 'accumulating', label: '쌓이는 것', line: '시간을 겹겹의 퇴적이라고 부릅니다.' },
      { value: 'felt', label: '느껴지는 것', line: '시간을 마음의 온기라고 부릅니다.' },
      { value: 'none', label: '없는 것', line: '시간이 없을지도 모른다고 속삭입니다.' }
    ] },
    { title: '마음은 어디에 있습니까?', options: [
      { value: 'head', label: '머릿속', line: '생각이 피어나는 그곳에서,' },
      { value: 'between', label: '당신과 나 사이', line: '우리 사이의 작은 거리에서,' },
      { value: 'screen', label: '이 화면 안', line: '빛이 머무는 유리의 안쪽에서,' },
      { value: 'nowhere', label: '어디에도 없다', line: '어디에도 붙잡히지 않은 채,' }
    ] }
  ];
  const reducedMedia = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let storageAvailable = true;
  let memory = readMemory();
  const previousVisit = Number.isFinite(memory.lastVisit) ? memory.lastVisit : null;
  memory.visits = Math.max(0, Number(memory.visits) || 0) + 1;
  memory.lastVisit = Date.now();
  persist();

  const state = {
    act: 0,
    startedAt: Date.now(),
    totalDistance: 0,
    touches: 0,
    subjectiveMs: 0,
    lastInteraction: performance.now(),
    lastClockTick: performance.now(),
    pointer: null,
    lastPointerSample: 0,
    trails: [],
    ripples: [],
    draftSeed: 0x42e19ab1,
    isDrafting: false,
    lastSigilRender: 0,
    question: 0,
    answers: validAnswers(memory.answers),
    breathing: false,
    breathStartedAt: 0,
    dissolved: false,
    motion: !reducedMedia.matches,
    sound: false,
    audio: null,
    raf: 0,
    toastTimer: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: 1,
    stars: []
  };
  if (Number.isInteger(memory.sigilSeed)) state.draftSeed = memory.sigilSeed >>> 0;

  function readMemory() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        // Preserve visits and the rune from the user's original single-file version.
        const oldVisits = parseInt(localStorage.getItem('moc_visits') || '0', 10) || 0;
        const oldLastVisit = Number(localStorage.getItem('moc_last_visit')) || null;
        const oldRune = localStorage.getItem('moc_symbol');
        if (!oldVisits && !oldRune) return {};
        const migrated = { visits: Math.max(0, oldVisits), lastVisit: oldLastVisit };
        if (oldRune && oldRune.length <= 8) {
          let seed = 2166136261;
          for (const character of oldRune) seed = Math.imul(seed ^ character.codePointAt(0), 16777619) >>> 0;
          migrated.sigilSeed = seed >>> 0;
          migrated.sigilCode = seed.toString(16).toUpperCase().padStart(8, '0');
          migrated.legacyRune = oldRune;
        }
        return migrated;
      }
      const data = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (_) {
      storageAvailable = false;
      return {};
    }
  }
  function persist() {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
      return true;
    } catch (_) {
      storageAvailable = false;
      return false;
    }
  }
  function validAnswers(candidate) {
    const result = {};
    if (!candidate || typeof candidate !== 'object') return result;
    QUESTIONS.forEach((question, i) => {
      const key = 'q' + i;
      if (question.options.some((o) => o.value === candidate[key])) result[key] = candidate[key];
    });
    return result;
  }
  function toast(message) {
    const el = $('#liveToast');
    window.clearTimeout(state.toastTimer);
    el.textContent = message;
    el.classList.add('visible');
    state.toastTimer = window.setTimeout(() => el.classList.remove('visible'), 3200);
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function fmt(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(seconds / 3600);
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return hours ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // Chapter navigation is never gated behind mouse motion, long timers, or questions.
  function goTo(index, { focus = true } = {}) {
    const next = clamp(index, 0, chapters.length - 1);
    if (state.breathing && next !== 2) stopBreathing();
    state.act = next;
    chapters.forEach((chapter, i) => {
      const active = i === next;
      chapter.hidden = !active;
      chapter.classList.toggle('is-active', active);
    });
    $$('#chapterNav [data-go]').forEach((button, i) => {
      if (i === next) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#topStatus').textContent = `OBSERVATION / ${String(next + 1).padStart(2, '0')}`;
    $('#footerLabel').innerHTML = `${String(next + 1).padStart(2, '0')} / 08 <span>${chapterNames[next]}</span>`;
    $('#bottomProgress').setAttribute('aria-label', `전체 8막 중 ${next + 1}막`);
    $('#bottomProgress span').style.width = `${(next + 1) * 12.5}%`;
    $('#prevButton').disabled = next === 0;
    $('#nextButton').disabled = next === 7;
    $('#nextButton').innerHTML = (next === 6 ? '마지막 장면 ' : '다음 장면 ') + '<span aria-hidden="true">→</span>';
    if (next === 1) drawSigil();
    if (next === 4) renderQuestion();
    if (next === 5) renderArchive();
    if (next === 6) renderDissolution();
    updateCounters();
    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const heading = chapters[next].querySelector('h1, h2');
      if (heading) heading.focus({ preventScroll: true });
    }
    if (!state.motion) drawCanvas(performance.now());
  }
  $$('#chapterNav [data-go]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));
  $('#brandHome').addEventListener('click', (e) => { e.preventDefault(); goTo(0); });
  $('#startButton').addEventListener('click', () => goTo(1));
  $('#prevButton').addEventListener('click', () => goTo(state.act - 1));
  $('#nextButton').addEventListener('click', () => goTo(state.act + 1));
  $('#returnButton').addEventListener('click', () => {
    state.startedAt = Date.now();
    state.subjectiveMs = 0;
    state.lastClockTick = performance.now();
    state.totalDistance = 0;
    state.touches = 0;
    state.pointer = null;
    state.trails.length = 0;
    state.ripples.length = 0;
    state.answers = {};
    state.question = 0;
    state.isDrafting = false;
    state.draftSeed = Number.isInteger(memory.sigilSeed) ? memory.sigilSeed >>> 0 : randomSeed();
    state.dissolved = false;
    goTo(0);
    toast('새로운 관찰이 시작되었습니다. 보관된 기억은 그대로입니다.');
  });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (event.key === 'ArrowRight' && document.activeElement === document.body) goTo(state.act + 1);
    if (event.key === 'ArrowLeft' && document.activeElement === document.body) goTo(state.act - 1);
  });

  // A compact reproducible geometric seal; not an identity or psychological diagnosis.
  function randomSeed() {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint32Array(1);
        window.crypto.getRandomValues(bytes);
        return bytes[0] >>> 0;
      }
    } catch (_) { /* fallback below */ }
    return (Math.random() * 0xffffffff) >>> 0;
  }
  function mix(seed, value) {
    let v = Math.imul(seed ^ value, 0x45d9f3b) >>> 0;
    v ^= v >>> 16;
    v = Math.imul(v, 0x45d9f3b) >>> 0;
    return (v ^ (v >>> 16)) >>> 0;
  }
  function drawSigil() {
    const seed = state.draftSeed >>> 0;
    const code = seed.toString(16).toUpperCase().padStart(8, '0');
    const hashRand = (() => {
      let s = seed || 1;
      return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    })();
    const r = hashRand;
    const n = 7 + Math.floor(r() * 3);
    const cx = 150, cy = 150;
    const line = [];
    const nodes = [];
    const pt = (radius, angle) => ({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    const pString = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + Math.PI * 2 * i / n;
      const near = pt(43 + r() * 16, a);
      const far = pt(98 + r() * 16, a + (r() - .5) * .16);
      nodes.push(far);
      line.push(`<path d="M ${pString(near)} L ${pString(far)}"/>`);
      const jewel = pt(80 + r() * 26, a);
      line.push(`<circle cx="${jewel.x.toFixed(1)}" cy="${jewel.y.toFixed(1)}" r="${(1.1 + r() * 2).toFixed(1)}" fill="#e7cba1" stroke="none"/>`);
    }
    const polygon = nodes.map((p, i) => `${i ? 'L' : 'M'} ${pString(p)}`).join(' ') + ' Z';
    const inside = nodes.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'} ${pString(p)}`).join(' ') + ' Z';
    const markup = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="#d6b88d" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="150" cy="150" r="123" stroke-opacity=".34" stroke-dasharray="2 9"/><circle cx="150" cy="150" r="69" stroke-opacity=".2"/><circle cx="150" cy="150" r="24" stroke-opacity=".45"/><path d="${polygon}" stroke-opacity=".65"/><path d="${inside}" stroke-opacity=".38"/>${line.join('')}<path d="M 150 116 L 184 150 L 150 184 L 116 150 Z" stroke-opacity=".45"/><circle cx="150" cy="150" r="4.5" fill="#e9d5b3" stroke="none"/></g></svg>`;
    $('#sigilSvg').innerHTML = markup;
    const saved = !state.isDrafting && Number.isInteger(memory.sigilSeed) && memory.sigilSeed === seed;
    $('#sigilCode').textContent = `· ${code}${saved ? ' / SAVED' : ' / DRAFT'}`;
  }
  $('#sealButton').addEventListener('click', () => {
    if (state.draftSeed === 0) state.draftSeed = randomSeed();
    memory.sigilSeed = state.draftSeed >>> 0;
    delete memory.legacyRune;
    memory.sigilCode = memory.sigilSeed.toString(16).toUpperCase().padStart(8, '0');
    state.isDrafting = false;
    persist();
    drawSigil();
    $('#sigilFeedback').textContent = storageAvailable ? '문양이 이 브라우저에 보관되었습니다.' : '문양을 만들었습니다. 현재 브라우저에서는 영구 저장할 수 없습니다.';
    toast(storageAvailable ? '문양을 보관했습니다.' : '문양 생성 완료. 브라우저 저장소 사용이 제한됩니다.');
  });
  $('#newSigilButton').addEventListener('click', () => {
    state.draftSeed = randomSeed();
    state.isDrafting = true;
    drawSigil();
    $('#sigilFeedback').textContent = '새로운 문양을 구상했습니다. ‘간직하기’를 누르면 이전 문양을 덮어씁니다.';
  });

  // One pointer-event family for mouse, pen and touch — never count touch + synthesized click twice.
  function pointDown(e) {
    if (e.isPrimary === false) return;
    state.touches++;
    state.lastInteraction = performance.now();
    state.ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    if (state.ripples.length > 15) state.ripples.shift();
    if (state.act === 1) updateCounters();
  }
  function pointerMove(e) {
    if (e.isPrimary === false) return;
    const now = performance.now();
    const p = { x: e.clientX, y: e.clientY };
    const last = state.pointer;
    state.pointer = p;
    if (last) {
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const raw = Math.hypot(dx, dy);
      if (raw > 2 && raw < 220) {
        state.totalDistance += Math.min(raw, 80);
        state.lastInteraction = now;
        if (now - state.lastPointerSample > 18) {
          state.lastPointerSample = now;
          state.trails.push({ x: p.x, y: p.y, born: now });
          if (state.trails.length > 95) state.trails.shift();
          if (state.act === 1 && (!Number.isInteger(memory.sigilSeed) || state.isDrafting)) {
            state.draftSeed = mix(state.draftSeed, ((Math.round(p.x) << 16) ^ Math.round(p.y) ^ Math.round(raw * 100)) >>> 0);
            if (now - state.lastSigilRender > 180) { state.lastSigilRender = now; drawSigil(); }
          }
        }
        if (state.act === 1) updateCounters();
      }
    }
    if (state.act === 0) {
      const center = $('#eyeCenter');
      const offsetX = (p.x / Math.max(1, window.innerWidth) - .5) * 15;
      const offsetY = (p.y / Math.max(1, window.innerHeight) - .5) * 15;
      center.style.transform = `translate(${offsetX.toFixed(1)}px,${offsetY.toFixed(1)}px)`;
    }
  }
  window.addEventListener('pointerdown', pointDown, { passive: true });
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('pointercancel', () => { state.pointer = null; }, { passive: true });
  window.addEventListener('pointerleave', () => { state.pointer = null; }, { passive: true });

  // Breathing is opt-in. No forced interaction, no medical promises.
  function updateBreath(now = performance.now()) {
    if (!state.breathing) return;
    const elapsed = (now - state.breathStartedAt) % 10000;
    const inhale = elapsed < 4000;
    const remaining = inhale ? 4000 - elapsed : 10000 - elapsed;
    $('#breathCount').textContent = String(Math.ceil(remaining / 1000));
    $('#breathPhase').textContent = inhale ? '천천히 들이쉬기' : '편안하게 내쉬기';
    // In reduced-motion mode only the accessible numeric cue changes.
    if (!state.motion) $('#breathOrb .breath-halo').style.transform = '';
  }
  function stopBreathing() {
    state.breathing = false;
    $('#breathOrb').classList.remove('is-breathing');
    $('#breathCount').textContent = '—';
    $('#breathPhase').textContent = '고요하게 머무르기';
    $('#breatheButton').innerHTML = '호흡 시작 <span aria-hidden="true">↗</span>';
    $('#breatheButton').setAttribute('aria-pressed', 'false');
    $('#breathOrb .breath-halo').style.transform = '';
  }
  $('#breatheButton').addEventListener('click', () => {
    if (state.breathing) { stopBreathing(); return; }
    state.breathStartedAt = performance.now();
    state.breathing = true;
    $('#breathOrb').classList.toggle('is-breathing', state.motion);
    $('#breatheButton').innerHTML = '호흡 멈추기 <span aria-hidden="true">Ⅱ</span>';
    $('#breatheButton').setAttribute('aria-pressed', 'true');
    updateBreath();
  });
  $('#breathReset').addEventListener('click', () => {
    state.breathStartedAt = performance.now();
    if (state.breathing) updateBreath();
    else { $('#breathCount').textContent = '—'; $('#breathPhase').textContent = '고요하게 머무르기'; }
    toast('호흡 주기를 처음부터 시작할 수 있습니다.');
  });

  function updateCounters() {
    $('#distanceValue').textContent = Math.floor(state.totalDistance).toLocaleString('ko-KR');
    $('#touchValue').textContent = state.touches.toLocaleString('ko-KR');
    $('#realClock').textContent = fmt(Date.now() - state.startedAt);
    $('#subjectiveClock').textContent = fmt(state.subjectiveMs);
    const realTurns = ((Date.now() - state.startedAt) / 60000) * 360;
    const feltTurns = (state.subjectiveMs / 60000) * 360;
    $('#timeHandReal').style.transform = `rotate(${realTurns.toFixed(1)}deg)`;
    $('#timeHandFelt').style.transform = `rotate(${feltTurns.toFixed(1)}deg)`;
  }
  function tickClocks() {
    const now = performance.now();
    const dt = clamp(now - state.lastClockTick, 0, 1000);
    state.lastClockTick = now;
    if (!document.hidden) {
      state.subjectiveMs += dt * (now - state.lastInteraction < 2200 ? 1.8 : .52);
      if (state.breathing && state.act === 2) updateBreath(now);
    }
    if (state.act === 3) updateCounters();
  }
  window.setInterval(tickClocks, 250);

  function composePoem() {
    const get = (i) => QUESTIONS[i].options.find((o) => o.value === state.answers['q' + i]);
    const a = get(0), b = get(1), c = get(2);
    return [
      a ? a.line : '아직 이름 붙이지 않은 마음으로,',
      b ? b.line : '시간의 모양을 잠시 바라봅니다.',
      '',
      c ? c.line : '정해지지 않은 자리에서,',
      '당신은 지금, 여기에 있습니다.'
    ].join('\n');
  }
  function saveAnswers() {
    memory.answers = { ...state.answers };
    memory.poem = composePoem();
    persist();
  }
  function renderQuestion() {
    const card = $('#questionCard');
    const options = $('#questionOptions');
    options.replaceChildren();
    const complete = state.question >= QUESTIONS.length;
    card.classList.toggle('question-complete', complete);
    if (complete) {
      saveAnswers();
      $('#questionStep').textContent = 'YOUR POEM / COMPOSED';
      $('#questionTitle').textContent = '당신의 답이 한 편의 시가 되었습니다.';
      const poem = document.createElement('blockquote');
      poem.textContent = memory.poem;
      options.appendChild(poem);
      $('#questionProgress').textContent = '● ● ●';
      $('#questionSkip').textContent = '다시 답하기';
    } else {
      const q = QUESTIONS[state.question];
      $('#questionStep').textContent = `QUESTION ${String(state.question + 1).padStart(2, '0')} / 03`;
      $('#questionTitle').textContent = q.title;
      q.options.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'answer-option';
        button.textContent = choice.label;
        button.setAttribute('aria-pressed', state.answers['q' + state.question] === choice.value ? 'true' : 'false');
        button.addEventListener('click', () => {
          const step = state.question;
          state.answers['q' + step] = choice.value;
          saveAnswers();
          state.question = Math.min(QUESTIONS.length, step + 1);
          renderQuestion();
          const nextTarget = options.querySelector('button') || $('#questionTitle');
          if (nextTarget === $('#questionTitle')) nextTarget.tabIndex = -1;
          nextTarget.focus({ preventScroll: true });
        });
        options.appendChild(button);
      });
      $('#questionProgress').textContent = QUESTIONS.map((_, i) => i === state.question ? '●' : '○').join(' ');
      $('#questionSkip').textContent = '건너뛰기';
    }
    $('#questionBack').disabled = state.question === 0;
  }
  $('#questionBack').addEventListener('click', () => { state.question = Math.max(0, state.question - 1); renderQuestion(); });
  $('#questionSkip').addEventListener('click', () => { state.question = state.question >= 3 ? 0 : state.question + 1; renderQuestion(); });

  function howLongAgo(then) {
    if (!Number.isFinite(then) || then <= 0) return '처음 만남';
    const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (minutes < 1) return '조금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
    return `${Math.floor(minutes / 1440)}일 전`;
  }
  function renderArchive() {
    $('#poemOutput').textContent = typeof memory.poem === 'string' && memory.poem.trim() ? memory.poem : '아직 시를 만들지 않았습니다.\n질문에서 답을 고르면 이 자리에 나타납니다.';
    $('#visitNumber').innerHTML = `${String(memory.visits || 1).padStart(2, '0')}<small>번째 관찰</small>`;
    $('#lastVisitValue').textContent = howLongAgo(previousVisit);
    $('#archiveSigil').textContent = typeof memory.sigilCode === 'string' ? `${memory.sigilCode}${memory.legacyRune ? ' · ' + memory.legacyRune : ''}` : '아직 남기지 않음';
    $('#archivePoemStatus').textContent = memory.poem ? '한 편 보관 중' : '아직 기록 없음';
    $('#archiveStatus').textContent = storageAvailable ? '저장 위치: 이 브라우저의 localStorage · 외부 전송 없음' : '브라우저 저장이 제한되어 이 방문 중에만 유지됩니다.';
  }
  $('#exportButton').addEventListener('click', () => {
    const lines = [
      '인지의 거울 — MIRROR OF COGNITION',
      '관찰 일시: ' + new Date().toLocaleString('ko-KR'),
      '이 브라우저 방문 횟수: ' + (memory.visits || 1),
      '문양 코드: ' + (memory.sigilCode || '없음'),
      '움직임: ' + Math.floor(state.totalDistance) + 'px',
      '접촉: ' + state.touches + '회',
      '', '당신의 시', memory.poem || composePoem(), '',
      '이 기록은 예술적 상호작용의 결과이며 심리·인지 진단이 아닙니다.'
    ];
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mirror-of-cognition-record.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('기록 TXT 파일을 내려받았습니다.');
    } catch (_) { toast('파일 저장을 시작하지 못했습니다. 브라우저 다운로드 권한을 확인해 주세요.'); }
  });
  $('#eraseButton').addEventListener('click', () => {
    if (!window.confirm('이 브라우저에 저장된 방문 횟수, 문양, 답과 시를 모두 지우고 처음부터 시작할까요?')) return;
    try {
      [KEY, 'moc_visits', 'moc_last_visit', 'moc_symbol'].forEach((key) => localStorage.removeItem(key));
    } catch (_) { /* private mode */ }
    window.location.reload();
  });
  function renderDissolution() {
    $('#dissolveOrbit').classList.toggle('is-dissolved', state.dissolved);
    $('#dissolveNote').textContent = state.dissolved
      ? '빛은 옅어졌지만 기억은 남아 있습니다. 언제든 다시 피울 수 있습니다.'
      : '사라지는 것은 화면의 빛입니다. 당신의 기억은 지워지지 않습니다.';
  }
  $('#dissolveButton').addEventListener('click', () => { state.dissolved = true; renderDissolution(); });
  $('#restoreButton').addEventListener('click', () => { state.dissolved = false; renderDissolution(); });

  // Sound starts ONLY upon explicit opt-in; leaving the tab suspends it.
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  async function turnSoundOn() {
    if (!AudioCtor) { toast('이 브라우저는 Web Audio를 지원하지 않습니다.'); return; }
    try {
      if (!state.audio) {
        const ac = new AudioCtor();
        const gain = ac.createGain();
        gain.gain.value = 0;
        gain.connect(ac.destination);
        const voices = [55, 82.4069, 110].map((freq, i) => {
          const osc = ac.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const attenuator = ac.createGain();
          attenuator.gain.value = i === 0 ? 1 : .42;
          osc.connect(attenuator).connect(gain);
          osc.start();
          return osc;
        });
        state.audio = { ac, gain, voices };
      }
      await state.audio.ac.resume();
      state.audio.gain.gain.setTargetAtTime(.009, state.audio.ac.currentTime, .22);
      state.sound = true;
      $('#soundText').textContent = '켜짐';
      $('#soundToggle').setAttribute('aria-pressed', 'true');
    } catch (_) { toast('소리를 켤 수 없습니다. 브라우저의 오디오 설정을 확인해 주세요.'); }
  }
  function turnSoundOff() {
    state.sound = false;
    $('#soundText').textContent = '꺼짐';
    $('#soundToggle').setAttribute('aria-pressed', 'false');
    if (state.audio) state.audio.gain.gain.setTargetAtTime(0, state.audio.ac.currentTime, .12);
  }
  $('#soundToggle').addEventListener('click', () => { if (state.sound) turnSoundOff(); else turnSoundOn(); });
  $('#motionToggle').addEventListener('click', () => {
    state.motion = !state.motion;
    document.body.classList.toggle('motion-off', !state.motion);
    document.body.classList.toggle('user-motion-on', state.motion && reducedMedia.matches);
    $('#motionText').textContent = state.motion ? '켜짐' : '꺼짐';
    $('#motionToggle').setAttribute('aria-pressed', state.motion ? 'true' : 'false');
    $('#breathOrb').classList.toggle('is-breathing', state.motion && state.breathing);
    updateAnimationState();
    toast(state.motion ? '움직임 효과를 켰습니다.' : '움직임 효과를 줄였습니다. 모든 장면은 계속 이용할 수 있습니다.');
  });
  document.addEventListener('visibilitychange', () => {
    state.lastClockTick = performance.now();
    if (state.audio) {
      if (document.hidden) state.audio.ac.suspend().catch(() => {});
      else if (state.sound) state.audio.ac.resume().catch(() => {});
    }
    updateAnimationState();
  });
  window.addEventListener('pagehide', () => {
    if (state.audio) state.audio.ac.close().catch(() => {});
  }, { once: true });

  // Canvas: modest star count, bounded trail/ripple lists, DPR capped, RAF paused offscreen.
  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (ctx) {
      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }
    const count = Math.min(76, Math.max(28, Math.round(state.width * state.height / 14500)));
    state.stars = Array.from({ length: count }, (_, i) => {
      const seed = mix(0x14391a11, i + 1);
      return {
        x: (seed % 10000) / 10000 * state.width,
        y: (mix(seed, 71) % 10000) / 10000 * state.height,
        size: .45 + (seed % 7) / 12,
        phase: (seed % 628) / 100
      };
    });
    if (!state.motion) drawCanvas(performance.now());
  }
  function drawCanvas(now) {
    if (!ctx) return;
    const w = state.width, h = state.height;
    ctx.clearRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * .72, h * .46, 10, w * .72, h * .46, Math.max(w, h) * .8);
    glow.addColorStop(0, 'rgba(23,51,68,.31)');
    glow.addColorStop(.45, 'rgba(9,20,32,.2)');
    glow.addColorStop(1, 'rgba(7,12,19,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    state.stars.forEach((star) => {
      const wave = state.motion ? (.7 + .3 * Math.sin(now / 1700 + star.phase)) : .75;
      ctx.beginPath();
      ctx.fillStyle = `rgba(200,218,228,${(.17 * wave).toFixed(3)})`;
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    const trailWindow = state.motion ? 1700 : 6000;
    state.trails = state.trails.filter((p) => now - p.born < trailWindow);
    for (let i = 0; i < state.trails.length; i++) {
      const p = state.trails[i];
      const age = 1 - (now - p.born) / trailWindow;
      if (age <= 0) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 + 1.4 * age, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(217,191,150,${(.47 * age).toFixed(3)})`;
      ctx.fill();
      if (i > 0 && (state.act === 1 || state.act === 0)) {
        const prev = state.trails[i - 1];
        if (Math.hypot(prev.x - p.x, prev.y - p.y) < 110) {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(213,186,143,${(.18 * age).toFixed(3)})`;
          ctx.lineWidth = .8;
          ctx.stroke();
        }
      }
    }
    state.ripples = state.ripples.filter((p) => now - p.born < 920);
    state.ripples.forEach((p) => {
      const t = clamp((now - p.born) / 920, 0, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 + t * 65, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(214,184,141,${((1 - t) * .38).toFixed(3)})`;
      ctx.stroke();
    });
  }
  function frame(now) {
    state.raf = 0;
    if (document.hidden || !state.motion) return;
    drawCanvas(now);
    state.raf = requestAnimationFrame(frame);
  }
  function updateAnimationState() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (!document.hidden && state.motion && ctx) state.raf = requestAnimationFrame(frame);
    else if (!document.hidden) drawCanvas(performance.now());
  }
  window.addEventListener('resize', resize, { passive: true });

  // Boot, including reduced-motion defaults and a visible first screen before any interaction.
  document.body.classList.toggle('motion-off', !state.motion);
  $('#motionText').textContent = state.motion ? '켜짐' : '꺼짐';
  $('#motionToggle').setAttribute('aria-pressed', state.motion ? 'true' : 'false');
  state.draftSeed = Number.isInteger(memory.sigilSeed) ? memory.sigilSeed >>> 0 : randomSeed();
  resize();
  drawSigil();
  goTo(0, { focus: false });
  updateCounters();
  updateAnimationState();
})();
