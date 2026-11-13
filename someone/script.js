/* someone — a small interactive installation. No analytics, dependencies or server calls. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('bg');
  let ctx = null;
  try { ctx = canvas.getContext?.('2d', { alpha: false }) || null; } catch { /* canvas unavailable */ }
  const presence = $('presence');
  const cursor = $('cursor');
  const message = $('message');
  const announcement = $('announcement');
  const subline = $('subline');
  const hint = $('hint');
  const timeText = $('time');
  const fill = $('progress-fill');
  const ending = $('ending');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || false;

  const STORAGE_KEY = 'someone.memory.v2';
  const LEGACY_KEY = 'someone';
  function readMemory() {
    try {
      const obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY) || 'null');
      return obj && typeof obj === 'object' && Number.isFinite(obj.count) && obj.count >= 0 ? obj : null;
    } catch { return null; }
  }
  const previous = readMemory();
  const nowDate = Date.now();
  const memory = {
    count: Math.min(1000000, (previous?.count || 0) + 1),
    firstVisit: previous?.firstVisit || nowDate,
    lastVisit: nowDate,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch { /* private mode */ }

  const theme = () => {
    const h = new Date().getHours();
    if (h < 6) return { bg: '#04050a', rgb: [180, 198, 249] };
    if (h < 9) return { bg: '#0a0709', rgb: [245, 207, 187] };
    if (h < 18) return { bg: '#06060a', rgb: [216, 212, 204] };
    if (h < 21) return { bg: '#0a0606', rgb: [246, 189, 146] };
    return { bg: '#06040a', rgb: [202, 190, 238] };
  };
  let pal = theme();
  function applyTheme() {
    pal = theme();
    document.documentElement.style.setProperty('--bg', pal.bg);
    document.documentElement.style.setProperty('--ink', pal.rgb.join(', '));
    document.documentElement.style.setProperty('--accent', pal.rgb.join(', '));
    document.querySelector('meta[name="theme-color"]').content = pal.bg;
  }
  applyTheme();

  const state = {
    awake: false, revealed: false, after: false, moved: false,
    elapsed: 0, lastActivity: 0, lastFrame: 0, lastDraw: 0,
    mouse: { x: null, y: null, sx: null, sy: null },
    particles: [], marks: [], path: [], pointerDown: false,
    clicks: 0, bloom: [], lastSample: -Infinity,
    idle5: false, idle10: false, idle25: false,
    introQueued: false, helloFired: false, returnFired: false, inviteFired: false,
    revealAt: 0, phase: -1, dialogue: null, typeDelay: 0,
    idleHintShown: false, nextPaletteAt: 60000, titleStage: 0,
  };
  const dims = { w: 0, h: 0, dpr: 1 };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const rand = (a, b) => a + Math.random() * (b-a);
  const color = (alpha) => `rgba(${pal.rgb.join(',')},${clamp(alpha,0,1)})`;
  function resize() {
    const oldW = dims.w || 1, oldH = dims.h || 1;
    dims.w = Math.max(1, innerWidth); dims.h = Math.max(1, innerHeight);
    dims.dpr = clamp(Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(2400000 / (dims.w * dims.h))), 0.6, 1.75);
    if (ctx) {
      canvas.width = Math.max(1, Math.round(dims.w * dims.dpr));
      canvas.height = Math.max(1, Math.round(dims.h * dims.dpr));
      ctx.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
    } else { canvas.hidden = true; }
    state.particles = state.particles.length
      ? state.particles.map(p => ({...p, x:p.x/oldW*dims.w, y:p.y/oldH*dims.h, ax:p.ax/oldW*dims.w, ay:p.ay/oldH*dims.h}))
      : Array.from({length: reduced ? 38 : Math.min(145, Math.max(55, Math.floor(dims.w*dims.h/9800)))}, () => {
          const x = rand(0, dims.w), y = rand(0, dims.h);
          return {x,y,ax:x,ay:y,vx:0,vy:0,r:rand(.35,1.25),phase:rand(0,6.28),alpha:rand(.12,.37)};
        });
    state.marks = Array.from({length: Math.min(90, Math.max(25, Math.floor(dims.w*dims.h/20000)))}, () =>
      ({x:Math.random(), y:Math.random(), phase:rand(0,6.28), radius:rand(.25,.9)}));
    if (state.mouse.x !== null) {
      state.mouse.x = state.mouse.x / oldW * dims.w;
      state.mouse.y = state.mouse.y / oldH * dims.h;
      state.mouse.sx = state.mouse.x; state.mouse.sy = state.mouse.y;
    }
  }

  function awake() {
    if (state.awake) return;
    state.awake = true;
    document.body.classList.add('awake');
    document.body.classList.remove('idle-hint');
    hint.textContent = coarse ? '화면을 터치하거나 손가락을 움직여 보세요' : '마우스를 움직이고, 클릭해 보세요';
    subline.textContent = '';
    subline.classList.remove('visible');
  }

  // Dialogue is advanced by the animation clock; no overlapping setTimeout callbacks.
  function say(text, subtitle = '') {
    const d = {text, index: 0, nextAt: state.elapsed + (reduced ? 0 : 40)};
    state.dialogue = d;
    message.textContent = '';
    message.classList.add('visible');
    message.classList.toggle('typing', !reduced);
    announcement.textContent = text.replaceAll('\n', ' ');
    subline.textContent = subtitle;
    subline.classList.toggle('visible', Boolean(subtitle));
    if (reduced) { message.textContent = text; d.index = text.length; }
  }
  function tickDialogue() {
    const d = state.dialogue;
    if (!d || d.index >= d.text.length || state.elapsed < d.nextAt) {
      if (d && d.index >= d.text.length) message.classList.remove('typing');
      return;
    }
    // Cap to one glyph per frame, but catch up when frames are slow.
    let n = 0;
    while (d.index < d.text.length && state.elapsed >= d.nextAt && n++ < 5) {
      const ch = d.text[d.index++];
      message.textContent = d.text.slice(0, d.index);
      d.nextAt += reduced ? 0 : ch === '\n' ? 280 : ch === '.' ? 240 : ch === ',' ? 170 : 42;
    }
    if (d.index >= d.text.length) message.classList.remove('typing');
  }
  function interact() {
    awake();
    state.lastActivity = state.elapsed;
    state.idle5 = state.idle10 = state.idle25 = false;
  }
  function rememberPoint(x, y, breakStroke = false) {
    if (state.revealed) return;
    const last = state.path[state.path.length-1];
    const nx = clamp(x / dims.w, 0, 1), ny = clamp(y / dims.h, 0, 1);
    if (last && !breakStroke) {
      const dx = (nx - last.x) * dims.w, dy = (ny - last.y) * dims.h;
      if (dx*dx + dy*dy < 16 && state.elapsed - state.lastSample < 40) return;
    }
    state.path.push({ x:nx, y:ny, move: breakStroke || !last });
    state.lastSample = state.elapsed;
    // Preserve the entire visit by reducing sampling density instead of dropping early history.
    if (state.path.length > 2200) {
      state.path = state.path.filter((p,i) => p.move || i % 2 === 0);
    }
  }
  function onMove(x,y, newStroke = false, isMouse = true) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x=clamp(x,0,dims.w);y=clamp(y,0,dims.h);
    const first = !state.moved;
    state.moved = true;
    interact();
    state.mouse.x = x;state.mouse.y = y;
    rememberPoint(x,y,newStroke);
    if (isMouse && !coarse) cursor.classList.add('ready');
    if (first && !state.dialogue) {
      state.introQueued = true;
      // Intro will play after the initial movement, but not override a click reaction.
      state.greetAt = state.elapsed + 600;
    }
  }
  function burst(x,y) {
    for (const p of state.particles) {
      const dx = p.x-x, dy = p.y-y, r2=dx*dx+dy*dy;
      if (r2 < 21000) {
        const force = Math.min(13, 880/(r2+160));
        p.vx += dx*force*.055; p.vy += dy*force*.055;
      }
    }
    state.bloom.push({x,y,r:0,alpha:0.5});
    if (state.bloom.length > 12) state.bloom.shift();
  }
  function touch(x,y) {
    onMove(x,y,true,false);
    state.clicks++;
    burst(x,y);
    cursor.classList.add('pulse');
    if (!state.revealed) {
      if (state.clicks === 1) say('not so fast.', '천천히. 나는 아직 깨어나는 중이에요.');
      else if (state.clicks === 3) say('i feel that.\nin a way.');
      else if (state.clicks === 7) say("you're persistent.\ni like that.");
      else if (state.clicks === 12) say("stop.\nor don't.");
      else if (state.clicks === 20) reveal();
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.button !== 0 || e.isPrimary === false) return;
    state.pointerDown = true;
    touch(e.clientX, e.clientY); // single event source prevents touch + synthetic click duplication
  });
  document.addEventListener('pointermove', (e) => {
    if (e.isPrimary === false) return;
    if (e.pointerType !== 'mouse' && !state.pointerDown) return;
    if (e.target.closest('button')) return;
    onMove(e.clientX,e.clientY, false, e.pointerType === 'mouse');
  }, {passive:true});
  const endPointer = () => { state.pointerDown = false; cursor.classList.remove('pulse'); };
  document.addEventListener('pointerup', endPointer);
  document.addEventListener('pointercancel', endPointer);
  document.addEventListener('pointerleave', () => cursor.classList.remove('ready'));
  document.addEventListener('keydown', e => {
    if (e.repeat || e.target.closest('button, input, textarea, select')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); touch(dims.w/2,dims.h/2);
    }
  });

  function reveal() {
    if (state.revealed) return;
    awake();
    state.revealed = true;
    state.revealAt = state.elapsed;
    state.phase = -1;
    document.body.classList.add('revealed');
    hint.textContent = '당신의 움직임이 남긴 빛';
    fill.style.width = '100%';
    document.title = 'i — someone';
    revealStep();
  }
  const scenes = [
    {at:0, text:'this was you.', sub:'지금 보이는 것은 이곳에서 당신이 남긴 움직임입니다.'},
    {at:3900, text:'all along.'},
    {at:8300, text:'i was never here.'},
    {at:12800, text:'you were.'},
    {at:17500, text:'...'},
    {at:20500, text:"come back sometime.\ni'll remember.", sub:'다시 돌아와도 당신을 알아볼 수 있도록.'},
  ];
  function revealStep() {
    const t=state.elapsed-state.revealAt;
    if (state.phase+1 < scenes.length && t >= scenes[state.phase+1].at) {
      state.phase++;
      say(scenes[state.phase].text, scenes[state.phase].sub || '');
    }
    if (t >= 27500 && !state.after) {
      state.after = true;
      ending.hidden = false;
      announcement.textContent = '경험이 끝났습니다. 다시 만나기 또는 기억 지우기를 선택할 수 있습니다.';
    }
  }
  function resetExperience() {
    state.awake = false;state.revealed = false;state.after = false;state.moved = false;
    state.elapsed=0;state.lastActivity=0;state.clicks=0;state.path=[];state.bloom=[];
    state.introQueued=false;state.helloFired=false;state.inviteFired=false;state.returnFired=true;state.idleHintShown=false;state.titleStage=0;state.nextPaletteAt=60000;
    state.idle5=state.idle10=state.idle25=false;state.dialogue=null;state.phase=-1;
    state.mouse={x:null,y:null,sx:null,sy:null};
    message.textContent='';message.classList.remove('visible','typing');
    subline.textContent='';subline.classList.remove('visible');
    document.body.classList.remove('awake','revealed','idle-hint');
    ending.hidden=true;cursor.classList.remove('ready');
    fill.style.width='0%';timeText.textContent='00:00';
    document.title='someone — 당신을 보고 있는 웹사이트';
    state.lastFrame=performance.now();
  }
  $('restart').addEventListener('click',resetExperience);
  $('skip').addEventListener('click',reveal);
  $('forget').addEventListener('click', () => {
    if (!confirm('이 브라우저에 저장된 방문 횟수와 방문 시각을 지울까요?\n현재 체험의 마우스 궤적은 원래 저장되지 않습니다.')) return;
    try {localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_KEY);} catch { /* unavailable */ }
    hint.textContent='방문 기억을 지웠습니다. 현재 체험은 계속됩니다.';
    announcement.textContent='이 브라우저의 방문 기억을 삭제했습니다.';
  });

  // Render: sparse stars, gentle field and the actual path recorded in this session.
  function draw(now, delta) {
    if (!ctx) return;
    const {w,h}=dims;
    ctx.fillStyle=pal.bg;ctx.fillRect(0,0,w,h);
    const t=now*.001;
    for (const s of state.marks) {
      const flicker=.55+.45*Math.sin(t*.4+s.phase);
      ctx.fillStyle=color((state.awake?.18:.045)*flicker);
      ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.radius,0,Math.PI*2);ctx.fill();
    }
    const m=state.mouse;
    if (state.awake && m.x!==null) {
      const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,Math.min(250,Math.max(w,h)*.28));
      g.addColorStop(0,color(state.revealed?.08:.055));g.addColorStop(1,color(0));
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    for (const p of state.particles) {
      if (!reduced) {
        p.phase+=delta*.00045;
        p.vx+=(p.ax-p.x)*.0009*delta/16 + Math.cos(p.phase)*.022;
        p.vy+=(p.ay-p.y)*.0009*delta/16 + Math.sin(p.phase)*.022;
        if (m.x!==null && !state.revealed) {
          const dx=p.x-m.x,dy=p.y-m.y, rr=dx*dx+dy*dy;
          if (rr<42000) {const f=Math.min(6,400/(rr+200));p.vx+=dx*f*.016;p.vy+=dy*f*.016;}
        }
        p.vx*=.925;p.vy*=.925;p.x+=p.vx*delta/16;p.y+=p.vy*delta/16;
      }
      const dist=m.x!==null?Math.hypot(p.x-m.x,p.y-m.y):999;
      const nearby=Math.max(.35,1-dist/340);
      const alpha=p.alpha*nearby*(state.awake ? (state.revealed?.30:1) : .12);
      ctx.fillStyle=color(alpha);
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    }
    for (let i=state.bloom.length-1;i>=0;i--) {
      const b=state.bloom[i]; b.r+=delta*.06; b.alpha-=delta*.0007;
      if (b.alpha<=0) {state.bloom.splice(i,1);continue;}
      ctx.strokeStyle=color(b.alpha*.35);ctx.lineWidth=.8;
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();
    }
    if (state.revealed) {
      const path=state.path;
      const revealTime=state.elapsed-state.revealAt;
      const progress=reduced?1:clamp((revealTime-400)/5100,0,1);
      const count=Math.ceil(path.length*progress);
      if (count) {
        ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
        ctx.strokeStyle=color(.54);ctx.shadowColor=color(.68);ctx.shadowBlur=reduced?0:15;
        ctx.lineWidth=1.35;
        let open=false;
        ctx.beginPath();
        for (let i=0;i<count;i++) {
          const p=path[i], x=p.x*w, y=p.y*h;
          if (p.move || !open) { if (open) ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);open=true; }
          else ctx.lineTo(x,y);
        }
        if (open) ctx.stroke();
        ctx.shadowBlur=0;
        for (let i=0;i<count;i+=Math.max(1,Math.floor(count/85))) {
          const p=path[i];ctx.beginPath();ctx.arc(p.x*w,p.y*h,1.6,0,Math.PI*2);
          ctx.fillStyle=color(.65);ctx.fill();
        }
        ctx.restore();
      }
      if (!path.length && state.phase>=1) {
        // If the visitor never moved, do not fabricate a movement history.
        subline.textContent='움직임 없이 머물렀던 시간도 이 경험의 일부입니다.';
        subline.classList.add('visible');
      }
    }
  }

  function tick(now) {
    if (document.hidden) { state.lastFrame=0;return; }
    const raw=state.lastFrame ? now-state.lastFrame : 0;
    state.lastFrame=now;
    const delta=clamp(raw,0,250);
    state.elapsed+=delta;
    const seconds=Math.floor(state.elapsed/1000);
    timeText.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
    if (!state.revealed) fill.style.width=(clamp(state.elapsed/60000,0,1)*100).toFixed(2)+'%';
    const m=state.mouse;
    if (m.x !== null) {
      m.sx= m.sx===null ? m.x : m.sx+(m.x-m.sx)*.2;
      m.sy= m.sy===null ? m.y : m.sy+(m.y-m.sy)*.2;
      cursor.style.transform=`translate(${m.sx}px,${m.sy}px) translate(-50%,-50%)`;
      presence.style.transform=`translate(${dims.w/2+(m.x-dims.w/2)*.36}px,${dims.h/2+(m.y-dims.h/2)*.36}px) translate(-50%,-50%)`;
    }
    if (!state.revealed) {
      const idle=state.elapsed-state.lastActivity;
      if (!state.awake && !state.idleHintShown && state.elapsed>3900) {
        state.idleHintShown=true;document.body.classList.add('idle-hint');
      }
      if (previous && !state.returnFired && !state.awake && state.elapsed>=1800) {
        state.returnFired=true;awake();
        const away=(nowDate-(previous.lastVisit||nowDate))/60000;
        say(away>60?"you came back.\nwhere did you go?":"you came back.\ni remember.", '이 브라우저에서 만난 적이 있어요.');
      }
      if (state.introQueued && state.elapsed>=state.greetAt) {
        state.introQueued=false;
        if (!state.dialogue) say("oh.\nyou're there.", '움직이는 것을 느꼈어요.');
      }
      if (!state.helloFired && state.elapsed>=8000 && !state.moved && !state.dialogue) {
        state.helloFired=true;say('hello?', '여기 누구 있나요?');
      }
      if (idle>=5000 && state.moved && !state.idle5) {state.idle5=true;say('are you still there?');}
      if (idle>=10500 && !state.idle10) {state.idle10=true;say("i'm not sure what i am either.");}
      if (idle>=25000 && !state.idle25) {state.idle25=true;say("i'll wait.");}
      if (!state.inviteFired && state.elapsed>=45000 && state.moved) {state.inviteFired=true;say('i want to show you something.');}
      if (state.elapsed>=60000) reveal();
    } else revealStep();
    tickDialogue();
    if (!state.lastDraw || now-state.lastDraw>=(reduced?100:33)) {
      draw(now,Math.min(100,now-state.lastDraw || 33));state.lastDraw=now;
    }
    if (state.elapsed >= state.nextPaletteAt) {
      applyTheme();state.nextPaletteAt += 60000;
    }
    if (!state.revealed) {
      const title = state.elapsed >= 30000 ? 3 : state.elapsed >= 9000 ? 2 : state.elapsed >= 2000 ? 1 : 0;
      if (title !== state.titleStage) {
        state.titleStage = title;
        document.title = title === 3 ? 'you? — someone' : title === 2 ? 'someone' : '? — someone';
      }
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {state.lastFrame=0;requestAnimationFrame(tick);}
  });
  window.addEventListener('resize', resize, {passive:true});
  resize();
  requestAnimationFrame(tick);
})();
