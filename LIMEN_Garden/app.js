/*
 * LIMEN — 경계가 사라지는 정원
 * Original generative art: Canvas 2D + native Web Audio. No external libraries,
 * network requests, cookies, trackers, or data transmission.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const app = $('app');
  if (!ctx) {
    $('canvasInstruction').textContent = '이 브라우저는 캔버스 기능을 지원하지 않습니다.';
    return;
  }
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (arr, alpha) => `rgba(${arr[0]},${arr[1]},${arr[2]},${alpha})`;
  const ease = (x) => x * x * (3 - 2 * x);
  const isMobile = () => window.innerWidth <= 760;
  const random = (() => { let s = 20261114; return () => ((s = Math.imul(s, 1664525) + 1013904223 | 0) >>> 0) / 4294967296; })();
  const between = (a, b) => a + (b - a) * random();
  const scenes = {
    breath: {
      number: '01', english: 'THE BREATH', title: '우주가<br><em>숨을 쉰다.</em>',
      description: '당신이 들이쉬는 것은 공기만이 아닙니다.<br>우주가 아주 잠깐 당신의 모습이 되는 순간입니다.',
      reflection: ['“지금 이 순간에도, 존재는 조용히 계속되고 있습니다.”', '“나는 서두르지 않아도, 충분히 살아 있습니다.”', '“별도, 바다도, 나도 한 번에 한 호흡씩 존재합니다.”'],
      ritual: '숨과 나란히 걷기', instruction: '화면을 터치하면 작은 숨이 퍼집니다',
      label: 'THE UNIVERSE INHALES', accent: [148, 204, 222], gold: '#dac2a0',
      footnote: '호흡의 속도를 맞출 필요는 없습니다. 당신의 리듬이 먼저입니다.'
    },
    time: {
      number: '02', english: 'THE TIME', title: '시간은<br><em>흐르지 않는다.</em>',
      description: '어제와 내일을 가르는 선은 어디에 있을까요?<br>지금은 언제나, 우리가 서 있는 자리입니다.',
      reflection: ['“과거는 기억으로, 미래는 가능성으로 이 순간에 머뭅니다.”', '“시간을 붙잡을 수 없지만, 순간을 느낄 수는 있습니다.”', '“당신의 삶은 시계의 속도로만 흐르지 않습니다.”'],
      ritual: '시간의 결을 만져 보기', instruction: '나선의 중심을 터치해 보세요',
      label: 'EVERY MOMENT IS HERE', accent: [228, 177, 119], gold: '#e6c499',
      footnote: '시간 다이얼은 과학적 시뮬레이션이 아닌 사유의 은유입니다.'
    },
    mind: {
      number: '03', english: 'THE MIND', title: '마음에도<br><em>물결이 있다.</em>',
      description: '모든 생각을 해결하지 않아도 괜찮습니다.<br>어떤 마음은 그저 지나가게 두어도 됩니다.',
      reflection: ['“물결은 수면을 흔들어도, 호수의 깊이를 흔들지 못합니다.”', '“떠오른 생각이 언제나 나 자신인 것은 아닙니다.”', '“놓아주는 일도 하나의 다정한 선택입니다.”'],
      ritual: '마음을 물 위에 놓기', instruction: '호수를 터치하면 잔물결이 생깁니다',
      label: 'LET THE THOUGHTS PASS', accent: [160, 171, 229], gold: '#c8c8ec',
      footnote: '입력한 문장은 이 화면에서만 잠시 나타나고 사라집니다.'
    },
    life: {
      number: '04', english: 'THE LIFE', title: '생명은<br><em>끝없이 쓴다.</em>',
      description: '작은 씨앗은 숲 전체의 설계도를 모릅니다.<br>그저 오늘, 닿을 수 있는 곳까지 자랍니다.',
      reflection: ['“성장은 커지는 것만이 아니라, 스스로의 모양을 찾는 일입니다.”', '“살아 있다는 사실은 이미 하나의 놀라운 사건입니다.”', '“작은 시작은 언제나 세계를 바꿀 가능성을 품습니다.”'],
      ritual: '존재 하나를 피워 내기', instruction: '화면을 터치하는 곳에서 생명이 자랍니다',
      label: 'LIFE WRITES ITSELF', accent: [138, 212, 178], gold: '#cde1b5',
      footnote: '나무의 각 가지는 규칙과 우연이 함께 만든 유일한 형상입니다.'
    },
    perception: {
      number: '05', english: 'THE PERCEPTION', title: '보는 순간<br><em>세계가 변한다.</em>',
      description: '사물은 하나의 모습으로만 존재하지 않습니다.<br>시선을 바꾸면 새로운 차원의 문이 열립니다.',
      reflection: ['“세계가 달라졌을까요. 아니면 보는 방식이 달라졌을까요.”', '“확실하다고 믿었던 경계는 질문 하나로 움직입니다.”', '“다르게 보는 것은 다르게 살아갈 가능성입니다.”'],
      ritual: '시선의 방향 바꾸기', instruction: '손가락으로 끌면 관찰자의 위치가 움직입니다',
      label: 'THE OBSERVER IS PART OF IT', accent: [159, 187, 239], gold: '#d6b9dc',
      footnote: '도넛형 곡면과 뫼비우스 띠를 자유롭게 오가는 예술적 변환입니다.'
    },
    infinity: {
      number: '06', english: 'THE INFINITE', title: '끝은 어쩌면<br><em>시작의 안쪽.</em>',
      description: '우주에 아직 없는 별자리가 있습니다.<br>당신의 손끝이 닿기 전에는 존재하지 않던 것입니다.',
      reflection: ['“무한은 먼 곳에 있지 않습니다. 아직 선택하지 않은 길에도 있습니다.”', '“우리는 발견하는 존재이면서, 동시에 창조하는 존재입니다.”', '“이제 이 우주에는 오직 당신만이 만든 연결이 있습니다.”'],
      ritual: '아직 없는 별자리 그리기', instruction: '빈 하늘을 터치해 당신만의 별을 연결하세요',
      label: 'A CONSTELLATION OF YOUR OWN', accent: [199, 161, 228], gold: '#e4c0cf',
      footnote: '그린 별자리는 이미지로 저장할 수 있습니다. 기록은 서버에 남지 않습니다.'
    }
  };
  const order = Object.keys(scenes);
  const starNames = ['여기', '그리움', '한숨', '다정함', '모험', '기억', '가능성', '여백', '용기', '시작', '평안', '미지', '빛', '다음', '자유', '나'];
  const state = {
    active: order.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'breath',
    reflection: {}, sceneStart: performance.now() / 1000,
    width: 0, height: 0, dpr: 1, mouse: { x: 0, y: 0, down: false, lastX: 0, lastY: 0 },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    paused: false, t: 0, lastFrame: 0,
    ripples: [], drops: [], trees: [], starPoints: [],
    breathGuide: false, breathStart: 0,
    timeLens: 50, timeFrozen: false, timeFreezeAt: 0,
    perceptionLens: 25, angleX: -.18, angleY: .17,
    lifeCount: 0, constellationMade: false,
    trace: { breath: 0, time: 0, mind: 0, life: 0, perception: 0, infinity: 0 },
    visits: new Set(['breath'])
  };
  let toastTimer = null;
  let lastFocused = null;
  let sound = null;
  let universeStars = [];
  let breathParticles = [];
  let pollen = [];
  let infiniteDust = [];

  function initParticles() {
    universeStars = Array.from({ length: isMobile() ? 125 : 230 }, () => ({ x: random(), y: random(), r: between(.3, 1.35), phase: between(0, TAU), speed: between(.15, .65), a: between(.18, .78) }));
    breathParticles = Array.from({ length: isMobile() ? 560 : 880 }, (_, i) => {
      const y = 1 - 2 * (i + .5) / (isMobile() ? 560 : 880);
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const shell = between(.78, 1.18);
      return { x: Math.cos(theta) * Math.sqrt(1 - y * y) * shell, y: y * shell, z: Math.sin(theta) * Math.sqrt(1 - y * y) * shell, s: between(.5, 2.15), phase: between(0, TAU) };
    });
    pollen = Array.from({ length: 160 }, () => ({ x: between(-1.3, 1.3), y: between(-1.25, 1.25), z: random(), phase: between(0, TAU), size: between(.5, 1.65) }));
    infiniteDust = Array.from({ length: isMobile() ? 260 : 420 }, () => ({ radius: Math.sqrt(random()), angle: between(0, TAU), t: random(), size: between(.5, 1.6) }));
  }
  function resize() {
    const bounds = app.getBoundingClientRect();
    state.width = Math.round(bounds.width);
    state.height = Math.round(bounds.height);
    state.dpr = Math.min(devicePixelRatio || 1, isMobile() ? 1.65 : 1.8);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    initParticles();
    if (!state.trees.length) resetLife();
    render();
  }
  function frameCenter() {
    const w = state.width, h = state.height;
    if (isMobile()) return { x: w * .52, y: h * .627, r: Math.min(w * .39, h * .185, 170) };
    return { x: w * .647, y: h * .493, r: Math.min(w * .24, h * .335, 320) };
  }
  function drawGlow(x, y, radius, rgb, opacity) {
    if (radius <= 0 || opacity <= 0) return;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, radius);
    grad.addColorStop(0, rgba(rgb, opacity));
    grad.addColorStop(.25, rgba(rgb, opacity * .38));
    grad.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  function circle(x, y, rad, color) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(.2, rad), 0, TAU); ctx.fillStyle = color; ctx.fill();
  }
  function background(t, rgb) {
    const { width: w, height: h } = state;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#070b13'); g.addColorStop(.53, '#0c111b'); g.addColorStop(1, '#080b13');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const c = frameCenter();
    drawGlow(c.x, c.y, c.r * 2.65, rgb, .09);
    drawGlow(w * .96, h * .92, h * .9, [109, 86, 118], .07);
    for (const p of universeStars) {
      const twinkle = state.reducedMotion ? 1 : .8 + Math.sin(t * p.speed + p.phase) * .2;
      circle(p.x * w, p.y * h, p.r, `rgba(229,233,241,${(p.a * twinkle * .62).toFixed(3)})`);
    }
  }
  function drawRipples(t, kind) {
    for (let i = state.ripples.length - 1; i >= 0; i--) {
      const p = state.ripples[i];
      const age = t - p.birth;
      if (age < 0) continue;
      if (age > 3.5) { state.ripples.splice(i, 1); continue; }
      const alpha = Math.pow(1 - age / 3.5, 2) * .52;
      for (let n = 0; n < 3; n++) {
        const radius = age * (kind === 'mind' ? 34 : 57) + n * 19;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(.2, radius), Math.max(.2, kind === 'mind' ? radius * .46 : radius), 0, 0, TAU);
        ctx.strokeStyle = rgba(p.color || scenes[state.active].accent, alpha * (1 - n * .21));
        ctx.lineWidth = n === 0 ? 1.5 : .65;
        ctx.stroke();
      }
    }
  }
  function addRipple(x, y) {
    if (state.ripples.length > 22) state.ripples.shift();
    state.ripples.push({ x, y, birth: state.t, color: [...scenes[state.active].accent] });
    chime(420 + random() * 180, .35);
    render();
  }
  function drawBreath(t) {
    const c = frameCenter();
    const cycle = (t % 10) / 10;
    const pulse = .5 + .5 * Math.cos(TAU * cycle - Math.PI);
    const breathing = .79 + pulse * .13;
    const radius = c.r * breathing;
    drawGlow(c.x, c.y, c.r * 1.5, [86, 170, 218], .15 + pulse * .07);
    drawGlow(c.x - c.r * .13, c.y - c.r * .11, c.r * .92, [225, 165, 191], .11 + pulse * .04);
    for (let i = 0; i < 5; i++) {
      const rd = radius * (1.05 + i * .18 + .025 * Math.sin(t * .4 + i));
      ctx.beginPath(); ctx.arc(c.x, c.y, rd, .2 + t * .05 + i * .6, Math.PI * 1.3 + t * .05 + i * .6);
      ctx.strokeStyle = `rgba(172,208,233,${(.135 - i * .017).toFixed(3)})`;
      ctx.lineWidth = .75; ctx.stroke();
    }
    ctx.save(); ctx.translate(c.x, c.y);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate((i * Math.PI / 4) + t * (i % 2 ? -.032 : .022));
      ctx.scale(1, .25 + i * .11);
      ctx.beginPath(); ctx.ellipse(0, 0, radius * (1.03 + i * .035), radius * (1.03 + i * .035), 0, .16, Math.PI * 1.85);
      ctx.strokeStyle = i % 2 ? 'rgba(224,192,191,.32)' : 'rgba(162,221,240,.25)';
      ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    const rot = t * .07 + state.mouse.x * .24;
    const co = Math.cos(rot), si = Math.sin(rot), tilt = -.21 + state.mouse.y * .16;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of breathParticles) {
      const rx = p.x * co + p.z * si;
      const rz = -p.x * si + p.z * co;
      const ry = p.y * ct - rz * st;
      const z = p.y * st + rz * ct;
      const project = 1 + z * .14;
      const px = c.x + rx * radius * project;
      const py = c.y + ry * radius * project;
      const shimmer = .82 + Math.sin(t * .8 + p.phase) * .18;
      const alpha = (.18 + (z + 1) * .28) * shimmer;
      const color = z > .14 ? [181, 228, 246] : [245, 179, 188];
      circle(px, py, p.s * (.62 + (z + 1) * .24), rgba(color, alpha));
    }
    ctx.globalCompositeOperation = 'source-over';
    drawGlow(c.x + radius * .02, c.y - radius * .05, radius * .48, [211, 238, 239], .22);
    drawGlow(c.x - radius * .15, c.y + radius * .12, radius * .61, [155, 132, 191], .14);
    circle(c.x, c.y, 3, 'rgba(245,241,224,.84)');
    drawRipples(t);
  }
  function drawTime(t) {
    const c = frameCenter(); const r = c.r * .92;
    const shift = (state.timeLens - 50) / 50;
    const clock = state.timeFrozen ? state.timeFreezeAt : t;
    drawGlow(c.x, c.y, c.r * 1.3, [196, 136, 104], .15);
    drawGlow(c.x, c.y, c.r * .87, [95, 146, 218], .13);
    for (let ring = 0; ring < 8; ring++) {
      ctx.beginPath(); ctx.arc(c.x, c.y, r * (.20 + ring * .118), 0, TAU);
      ctx.strokeStyle = `rgba(224,194,163,${.04 + ring * .009})`;
      ctx.lineWidth = .7; ctx.stroke();
    }
    for (let i = 0; i < 96; i++) {
      const angle = i * TAU / 96 + clock * .005;
      const rad = r * 1.095;
      const len = i % 8 === 0 ? 11 : 4;
      ctx.beginPath(); ctx.moveTo(c.x + Math.cos(angle) * rad, c.y + Math.sin(angle) * rad);
      ctx.lineTo(c.x + Math.cos(angle) * (rad + len), c.y + Math.sin(angle) * (rad + len));
      ctx.lineWidth = i % 8 === 0 ? 1.15 : .6;
      ctx.strokeStyle = `rgba(239,206,171,${i % 8 === 0 ? .39 : .16})`; ctx.stroke();
    }
    // The spiral has no beginning: different lenses make different eras luminous.
    for (let lane = 0; lane < 6; lane++) {
      ctx.beginPath();
      for (let j = 0; j <= 290; j++) {
        const u = j / 290;
        const angle = u * TAU * 4.8 + lane * .24 - clock * (.065 + lane * .002);
        const rad = (r * (.075 + u * .925)) * (1 + .018 * Math.sin(u * 80 + clock));
        const x = c.x + Math.cos(angle) * rad;
        const y = c.y + Math.sin(angle) * rad * (.88 + Math.sin(angle * .5) * .07);
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const cold = lane % 2 === 0;
      ctx.strokeStyle = cold ? `rgba(146,195,248,${.19 + Math.max(shift,0) * .19})` : `rgba(246,194,135,${.22 + Math.max(-shift,0) * .22})`;
      ctx.lineWidth = lane % 2 ? 1.15 : .9; ctx.stroke();
    }
    for (let i = 0; i < 130; i++) {
      const u = (i * .618034) % 1;
      const angle = u * TAU * 4.8 - clock * .067 + Math.sin(i * 2.42) * .19;
      const radius = r * (.075 + u * .93);
      const x = c.x + Math.cos(angle) * radius, y = c.y + Math.sin(angle) * radius * .90;
      const a = .2 + (1 - Math.abs(u - (state.timeLens / 100))) * .5;
      circle(x, y, i % 13 === 0 ? 2 : .85, i % 2 ? `rgba(244,198,137,${a})` : `rgba(177,209,242,${a})`);
    }
    const spotAngle = state.timeLens / 100 * TAU * 4.8 - clock * .067;
    const spotR = r * (.075 + state.timeLens / 100 * .925);
    const sx = c.x + Math.cos(spotAngle) * spotR;
    const sy = c.y + Math.sin(spotAngle) * spotR * .9;
    drawGlow(sx, sy, 45, [252, 217, 173], .32);
    circle(sx, sy, 3.1, 'rgba(255,241,213,.96)');
    drawGlow(c.x, c.y, r * .32, [245, 204, 165], .20);
    circle(c.x, c.y, 2.5, '#fff1dd');
    ctx.textAlign = 'center'; ctx.font = '10px Georgia, serif'; ctx.fillStyle = 'rgba(240,223,196,.74)';
    ctx.fillText('N O W', c.x, c.y + 25); ctx.textAlign = 'left';
    drawRipples(t);
  }
  function drawMind(t) {
    const c = frameCenter(); const r = c.r * 1.08;
    const waterY = c.y + c.r * .11;
    drawGlow(c.x, waterY, c.r * 1.5, [107, 112, 200], .16);
    drawGlow(c.x, waterY + 35, c.r * 1.17, [105, 185, 213], .10);
    ctx.save(); ctx.translate(c.x, waterY);
    for (let ring = 33; ring >= 1; ring--) {
      const u = ring / 33;
      ctx.beginPath();
      for (let i = 0; i <= 145; i++) {
        const a = i / 145 * TAU;
        const wave = (state.reducedMotion ? 0 : Math.sin(a * 7 + t * .46 + ring * .16)) * (3 + u * 3);
        const rr = r * u + wave;
        const x = Math.cos(a) * rr * 1.10;
        const y = Math.sin(a) * rr * .44;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = ring % 4 === 0 ? `rgba(191,186,240,${.11 + (1 - u) * .13})` : `rgba(127,191,221,${.07 + (1 - u) * .08})`;
      ctx.lineWidth = ring % 6 === 0 ? 1.25 : .75; ctx.stroke();
    }
    ctx.restore();
    // Fine filaments above the lake are reflections that never quite reach shore.
    for (let i = 0; i < 50; i++) {
      const u = i / 50;
      const x = c.x + (u - .5) * r * 2.1;
      const y = waterY + Math.sin(u * 26 + t * .25) * 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(i * 12) * 5, y - betweenNoise(i) * 7);
      ctx.strokeStyle = `rgba(208,203,243,${.08 + .12 * (1 - Math.abs(u - .5) * 2)})`; ctx.lineWidth = .8; ctx.stroke();
    }
    drawGlow(c.x, waterY - c.r * .2, c.r * .8, [162, 155, 236], .13);
    drawGlow(c.x, waterY - c.r * .28, c.r * .29, [207, 218, 255], .12);
    for (let i = state.drops.length - 1; i >= 0; i--) {
      const d = state.drops[i]; const age = t - d.birth;
      if (age > 11) { state.drops.splice(i, 1); continue; }
      const fade = clamp(1 - age / 10, 0, 1);
      const yy = d.y - age * 15;
      ctx.textAlign = 'center'; ctx.font = `${isMobile() ? 12 : 14}px 'Batang',Georgia,serif`;
      ctx.fillStyle = `rgba(245,234,249,${fade * .83})`;
      ctx.fillText(d.text, d.x + Math.sin(age * .6 + d.seed) * 17, yy, Math.min(r * 1.55, state.width - 40));
      ctx.textAlign = 'left';
      drawGlow(d.x, yy - 7, 36, [187, 172, 235], .09 * fade);
    }
    drawRipples(t, 'mind');
  }
  function betweenNoise(i) { return (.5 + .5 * Math.sin(i * 48.2345)) }
  function createTree(x, y, size, isCore = false) {
    const tree = { x, y, size, birth: state.t, isCore, segments: [], leaves: [], seed: random() * 100 };
    // Branch growth is deterministic per seed, but each tree's form is unique.
    function branch(px, py, angle, len, depth, tier) {
      const a = angle + Math.sin(tier * 1.1 + tree.seed) * .032;
      const ex = px + Math.cos(a) * len;
      const ey = py + Math.sin(a) * len;
      tree.segments.push({ x: px, y: py, ex, ey, tier, width: Math.max(.5, (depth + 1) * .62), birth: tier * .49 + between(0, .22) });
      if (depth === 0) {
        tree.leaves.push({ x: ex, y: ey, angle: a, size: between(2.8, 6.5) * size, birth: (tier + 1) * .49 + between(0, .36) });
        return;
      }
      const spread = between(.31, .53);
      branch(ex, ey, a - spread, len * between(.66, .76), depth - 1, tier + 1);
      branch(ex, ey, a + spread, len * between(.66, .76), depth - 1, tier + 1);
      if (depth === 3 && random() > .52) branch(ex, ey, a + between(-.14, .14), len * .59, depth - 2, tier + 1);
    }
    branch(x, y, -Math.PI / 2 + between(-.11, .11), size * 67, 6, 0);
    return tree;
  }
  function resetLife() {
    const c = frameCenter();
    state.trees = [createTree(c.x, c.y + c.r * .69, Math.max(.6, c.r / 160), true)];
    state.lifeCount = 0;
  }
  function plant(x, y, quiet = false) {
    const c = frameCenter();
    x = clamp(x, 24, state.width - 24); y = clamp(y, 170, state.height - 180);
    state.trees.push(createTree(x, y, Math.max(.35, c.r / 275), false));
    state.lifeCount++;
    state.trace.life++;
    if (state.trees.length > 7) state.trees.splice(1, 1);
    addRipple(x, y);
    if (!quiet) toast('하나의 생명이 새로운 가지를 뻗기 시작합니다.');
    updateLifeStatus();
  }
  function drawLife(t) {
    const c = frameCenter(); const r = c.r;
    drawGlow(c.x, c.y - r * .02, r * 1.28, [56, 148, 111], .17);
    drawGlow(c.x, c.y + r * .55, r * .9, [188, 168, 101], .08);
    for (const p of pollen) {
      const x = c.x + p.x * r + (state.reducedMotion ? 0 : Math.sin(t * .25 + p.phase) * 17);
      const y = c.y + p.y * r + (state.reducedMotion ? 0 : Math.sin(t * .34 + p.phase) * 10);
      circle(x, y, p.size, `rgba(195,244,186,${.12 + p.z * .36})`);
    }
    for (const tree of state.trees) {
      const age = state.reducedMotion ? 20 : Math.max(0, t - tree.birth + (tree.isCore ? 7 : 0));
      for (const b of tree.segments) {
        const grow = ease(clamp((age - b.birth) * 1.7, 0, 1));
        if (grow <= 0) continue;
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.lineTo(lerp(b.x, b.ex, grow), lerp(b.y, b.ey, grow));
        const alpha = .16 + .48 * (7 - b.tier) / 7;
        ctx.strokeStyle = b.tier > 4 ? `rgba(183,236,203,${alpha})` : `rgba(213,201,158,${alpha})`;
        ctx.lineWidth = b.width * (tree.isCore ? 1.2 : .88); ctx.lineCap = 'round'; ctx.stroke();
      }
      for (const l of tree.leaves) {
        const grow = ease(clamp((age - l.birth) * .95, 0, 1));
        if (grow <= 0) continue;
        const sway = state.reducedMotion ? 0 : Math.sin(t * .48 + l.x * .013) * .09;
        ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.angle + sway);
        ctx.scale(grow, grow);
        ctx.beginPath(); ctx.ellipse(0, 0, l.size * 1.8, l.size * .56, .35, 0, TAU);
        ctx.fillStyle = `rgba(148,221,174,${.18 + grow * .28})`; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-l.size, 0); ctx.lineTo(l.size, 0);
        ctx.strokeStyle = `rgba(222,232,170,${.24 + grow * .31})`; ctx.lineWidth = .5; ctx.stroke();
        ctx.restore();
      }
    }
    drawRipples(t);
  }
  function project3d(x, y, z, c, tx, ty) {
    const cy = Math.cos(ty), sy = Math.sin(ty), cx = Math.cos(tx), sx = Math.sin(tx);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    const perspective = 1.15 / (1.15 - z2 / (c.r * 3.5));
    return { x: c.x + x1 * perspective, y: c.y + y1 * perspective, z: z2 };
  }
  function surfacePoint(u, v, c, blend, tx, ty) {
    const a = u * TAU;
    const R = c.r * .62, rr = c.r * .24;
    const ringAngle = v * TAU;
    const xT = (R + rr * Math.cos(ringAngle)) * Math.cos(a);
    const yT = (R + rr * Math.cos(ringAngle)) * Math.sin(a);
    const zT = rr * Math.sin(ringAngle);
    const side = (v * 2 - 1) * c.r * .31;
    const xM = (R + side * Math.cos(a / 2)) * Math.cos(a);
    const yM = (R + side * Math.cos(a / 2)) * Math.sin(a);
    const zM = side * Math.sin(a / 2);
    return project3d(lerp(xT, xM, blend), lerp(yT, yM, blend), lerp(zT, zM, blend), c, tx, ty);
  }
  function drawPerception(t) {
    const c = frameCenter(); const r = c.r;
    const blend = ease(state.perceptionLens / 100);
    const tx = .85 + state.angleX + (state.reducedMotion ? 0 : Math.sin(t * .11) * .1);
    const ty = .4 + state.angleY + (state.reducedMotion ? 0 : t * .085);
    drawGlow(c.x, c.y, r * 1.65, [115, 141, 228], .16);
    drawGlow(c.x + r * .11, c.y - r * .04, r * .8, [230, 165, 204], .13);
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath(); ctx.ellipse(c.x, c.y, r * (1.0 + ring * .15), r * (.39 + ring * .06), ty * .25, 0, TAU);
      ctx.strokeStyle = `rgba(168,170,231,${.11 - ring * .02})`; ctx.lineWidth = .8; ctx.stroke();
    }
    // Mesh lines: not a canned 3D asset, each vertex is recomputed each frame.
    const mesh = [];
    for (let k = 0; k <= 17; k++) {
      const path = []; const v = k / 17;
      for (let j = 0; j <= 126; j++) path.push(surfacePoint(j / 126, v, c, blend, tx, ty));
      mesh.push({ path, front: path.reduce((s,p) => s + p.z, 0) / path.length, type: 'long' });
    }
    for (let k = 0; k < 49; k++) {
      const path = []; const u = k / 49;
      for (let j = 0; j <= 21; j++) path.push(surfacePoint(u, j / 21, c, blend, tx, ty));
      mesh.push({ path, front: path.reduce((s,p) => s + p.z, 0) / path.length, type: 'cross' });
    }
    mesh.sort((a,b) => a.front - b.front);
    for (const row of mesh) {
      ctx.beginPath(); row.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      const a = clamp(.18 + row.front / (r * 2.5), .12, .54);
      ctx.strokeStyle = row.type === 'long' ? `rgba(194,216,255,${a})` : `rgba(234,190,209,${a * .72})`;
      ctx.lineWidth = row.type === 'long' ? .85 : .6; ctx.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const p = surfacePoint(i / 22, .5, c, blend, tx, ty);
      circle(p.x, p.y, i % 5 === 0 ? 2.4 : 1.15, `rgba(247,222,221,${clamp(.3 + p.z / r, .18, .85)})`);
    }
    ctx.textAlign = 'center'; ctx.font = '10px Georgia,serif';
    ctx.fillStyle = 'rgba(233,223,226,.47)';
    ctx.fillText(blend < .5 ? 'T W O   S I D E S' : 'O N E   S I D E', c.x, c.y + r * 1.17);
    ctx.textAlign = 'left';
    drawRipples(t);
  }
  function drawInfinity(t) {
    const c = frameCenter(); const r = c.r;
    drawGlow(c.x, c.y, r * 1.86, [135, 100, 187], .17);
    drawGlow(c.x + r * .16, c.y - r * .17, r * .9, [197, 151, 187], .09);
    // A handwoven nebula: radial harmonics, rather than a static background image.
    for (let strand = 0; strand < 12; strand++) {
      ctx.beginPath();
      for (let j = 0; j <= 200; j++) {
        const u = j / 200;
        const theta = strand * TAU / 12 + u * TAU * 2.18 + (state.reducedMotion ? 0 : t * .033);
        const rad = r * (u * 1.27 + Math.sin(u * 13 + strand) * .045);
        const x = c.x + Math.cos(theta) * rad * (1 + Math.sin(theta * 2) * .095);
        const y = c.y + Math.sin(theta) * rad * .77;
        if (j === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.lineWidth = strand % 3 === 0 ? 1.0 : .5;
      ctx.strokeStyle = strand % 2 ? 'rgba(223,183,228,.15)' : 'rgba(173,189,248,.13)'; ctx.stroke();
    }
    for (let i = 0; i < infiniteDust.length; i++) {
      const p = infiniteDust[i];
      const angle = p.angle + p.radius * 8 + (state.reducedMotion ? 0 : t * (.025 + p.t * .04));
      const rad = r * p.radius * 1.28;
      const x = c.x + Math.cos(angle) * rad;
      const y = c.y + Math.sin(angle) * rad * .82;
      const a = .12 + .48 * p.t;
      circle(x, y, p.size, i % 3 === 0 ? `rgba(240,200,222,${a})` : `rgba(185,201,245,${a})`);
    }
    const stars = state.starPoints;
    for (let i = 1; i < stars.length; i++) {
      const a = stars[i - 1], b = stars[i];
      const gradient = ctx.createLinearGradient(a.x,a.y,b.x,b.y);
      gradient.addColorStop(0,'rgba(217,190,241,.75)'); gradient.addColorStop(1,'rgba(255,225,189,.82)');
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=1.5;ctx.strokeStyle=gradient;ctx.stroke();
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=7;ctx.strokeStyle='rgba(201,158,232,.05)';ctx.stroke();
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]; const hover = state.reducedMotion ? 0 : Math.sin(t * 1.2 + i * 1.7) * 2;
      drawGlow(s.x, s.y, 42, [231, 181, 243], .30);
      circle(s.x,s.y,3.0,'#fff3e5');
      ctx.beginPath();ctx.arc(s.x,s.y,11+hover,0,TAU);ctx.strokeStyle='rgba(232,208,234,.60)';ctx.lineWidth=.8;ctx.stroke();
      ctx.beginPath();ctx.moveTo(s.x-7,s.y);ctx.lineTo(s.x+7,s.y);ctx.moveTo(s.x,s.y-7);ctx.lineTo(s.x,s.y+7);
      ctx.strokeStyle='rgba(249,229,231,.45)';ctx.stroke();
      ctx.font='11px Batang,Georgia,serif';ctx.fillStyle='rgba(250,233,236,.85)';
      ctx.fillText(s.name, s.x+13, s.y-14);
    }
    drawRipples(t);
  }
  function render() {
    if (document.hidden) return;
    const t = state.t || performance.now() / 1000;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    background(t, scenes[state.active].accent);
    switch (state.active) {
      case 'breath': drawBreath(t); break;
      case 'time': drawTime(t); break;
      case 'mind': drawMind(t); break;
      case 'life': drawLife(t); break;
      case 'perception': drawPerception(t); break;
      case 'infinity': drawInfinity(t); break;
    }
  }
  function animate(ms) {
    requestAnimationFrame(animate);
    const delay = isMobile() ? 29 : 20;
    if (ms - state.lastFrame < delay) return;
    state.lastFrame = ms;
    if (state.paused || state.reducedMotion || document.hidden) return;
    state.t = ms / 1000;
    render();
    updateGuidedBreath();
  }
  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('shown'), 2800);
  }
  function renderControls(scene) {
    const content = $('ritualContent');
    if (scene === 'breath') content.innerHTML = `<p class="ritual-intro">급하게 할 것은 없습니다. 잠시 이 빛과 함께 호흡해 보세요.</p><div class="ritual-controls"><button type="button" class="primary-action" id="breathStart">빛과 호흡하기 <span aria-hidden="true">↗</span></button><span class="status-text" id="breathStatus">당신에게 편안한 속도로 숨을 쉬세요.</span></div>`;
    if (scene === 'time') content.innerHTML = `<p class="ritual-intro">같은 순간을, 서로 다른 시간의 빛으로 바라봅니다.</p><div class="ritual-controls"><div class="range-group"><span class="range-ends"><span>기억</span><strong id="timeLensName">지금</strong><span>가능성</span></span><input class="ritual-range" id="timeRange" type="range" min="0" max="100" step="1" value="${state.timeLens}" aria-label="시간의 렌즈, 기억에서 가능성까지"></div><button type="button" class="primary-action" id="timeFreeze">${state.timeFrozen ? '시간 다시 흐르게' : '이 순간 머무르기'}</button></div>`;
    if (scene === 'mind') content.innerHTML = `<p class="ritual-intro">이름 붙일 수 있는 감정이라면, 물 위에 가만히 놓아보세요.</p><div class="ritual-controls"><input class="ritual-input" id="mindEntry" type="text" maxlength="36" autocomplete="off" aria-label="내려놓을 마음" placeholder="지금 떠오르는 마음 한 조각"><button type="button" class="primary-action" id="releaseThought">물 위에 놓기 <span aria-hidden="true">↗</span></button><button type="button" class="secondary-action" id="releaseSilence">말 없는 물결</button></div>`;
    if (scene === 'life') content.innerHTML = `<p class="ritual-intro">다른 씨앗은 다른 모양으로 자랍니다. 어떤 것이든 충분합니다.</p><div class="ritual-controls"><button type="button" class="primary-action" id="seedPlant">새로운 씨앗 심기 <span aria-hidden="true">↗</span></button><button type="button" class="secondary-action" id="resetLife">다시 시작</button><span class="status-text" id="lifeStatus">이 정원에 새로 심은 씨앗 0개</span></div>`;
    if (scene === 'perception') content.innerHTML = `<p class="ritual-intro">두 개의 면이, 어느 순간 하나의 면으로 이어집니다.</p><div class="ritual-controls"><div class="range-group"><span class="range-ends"><span>원환</span><strong id="lensLabel">변화 중</strong><span>뫼비우스</span></span><input class="ritual-range" id="lensRange" type="range" min="0" max="100" value="${state.perceptionLens}" aria-label="도넛형 곡면에서 뫼비우스 띠로 변환"></div><button type="button" class="secondary-action" id="resetLens">시선 되돌리기</button></div>`;
    if (scene === 'infinity') content.innerHTML = `<p class="ritual-intro">하늘에 별을 놓으세요. 연결이 생길 때마다 없던 이야기가 시작됩니다.</p><div class="ritual-controls"><button type="button" class="primary-action" id="finishStars">별자리의 이름 듣기 <span aria-hidden="true">↗</span></button><button type="button" class="secondary-action" id="clearStars">다시 그리기</button><span class="poem-result" id="starPoem">${state.starPoints.length}개의 별이 연결을 기다립니다.</span></div>`;
    $('ritualPanel').dataset.scene = scene;
    $('ritualFootnote').textContent = scenes[scene].footnote;
    const byId = (id, handler, event = 'click') => { const el = $(id); if (el) el.addEventListener(event, handler); };
    if (scene === 'breath') byId('breathStart', toggleBreath);
    if (scene === 'time') {
      byId('timeRange', (e) => { state.timeLens = +e.target.value; state.trace.time++; updateTimeLabel(); render(); }, 'input');
      byId('timeFreeze', () => { state.timeFrozen = !state.timeFrozen; state.timeFreezeAt = state.t; $('timeFreeze').textContent = state.timeFrozen ? '시간 다시 흐르게' : '이 순간 머무르기'; toast(state.timeFrozen ? '당신만의 순간에 잠시 머뭅니다.' : '시간이 다시 움직입니다.'); render(); });
      updateTimeLabel();
    }
    if (scene === 'mind') {
      byId('releaseThought', () => releaseMind());
      byId('releaseSilence', () => releaseMind('고요'));
      byId('mindEntry', (e) => { if (e.key === 'Enter') releaseMind(); }, 'keydown');
    }
    if (scene === 'life') { byId('seedPlant', () => { const c = frameCenter(); plant(c.x + between(-c.r*.68,c.r*.68),c.y + between(-c.r*.12,c.r*.55)); }); byId('resetLife', () => { resetLife(); updateLifeStatus(); toast('새로운 숲을 시작합니다.'); render(); }); }
    if (scene === 'perception') {
      byId('lensRange', (e) => { state.perceptionLens = +e.target.value; state.trace.perception++; updateLensLabel(); render(); }, 'input');
      byId('resetLens', () => { state.perceptionLens = 25; state.angleX = -.18; state.angleY = .17; $('lensRange').value = 25; updateLensLabel(); render(); });
      updateLensLabel();
    }
    if (scene === 'infinity') { byId('finishStars', finishStars); byId('clearStars', () => { state.starPoints=[]; state.constellationMade=false; updateStarStatus(); toast('하늘이 다시 가능성으로 돌아왔습니다.'); render(); }); }
  }
  function updateTimeLabel() {
    const el = $('timeLensName'); if (!el) return;
    el.textContent = state.timeLens < 30 ? '지나온 빛' : state.timeLens > 70 ? '다가올 빛' : '지금';
  }
  function updateLensLabel() {
    const el = $('lensLabel'); if (!el) return;
    el.textContent = state.perceptionLens <= 8 ? '두 면의 세계' : state.perceptionLens >= 92 ? '한 면의 세계' : '변화 중';
  }
  function updateLifeStatus() { const el = $('lifeStatus'); if (el) el.textContent = `이 정원에 새로 심은 씨앗 ${state.lifeCount}개`; }
  function updateStarStatus() { const el = $('starPoem'); if (el) el.textContent = `${state.starPoints.length}개의 별이 연결을 기다립니다.`; }
  function toggleBreath() {
    state.breathGuide = !state.breathGuide;
    state.breathStart = performance.now() / 1000;
    $('breathStart').innerHTML = state.breathGuide ? '호흡 안내 멈추기 <span aria-hidden="true">↗</span>' : '빛과 호흡하기 <span aria-hidden="true">↗</span>';
    if (state.breathGuide) state.trace.breath++;
    if (!state.breathGuide) $('breathStatus').textContent = '당신에게 편안한 속도로 숨을 쉬세요.';
    else toast('화면의 빛을 보며 편안하게 호흡하세요.');
    updateGuidedBreath();
  }
  function updateGuidedBreath() {
    const el = $('breathStatus');
    if (!el || !state.breathGuide || state.active !== 'breath') return;
    const phase = ((performance.now() / 1000 - state.breathStart) % 10 + 10) % 10;
    el.textContent = phase < 5 ? `천천히 들이쉬기 · ${Math.ceil(5 - phase)}초` : `부드럽게 내쉬기 · ${Math.ceil(10 - phase)}초`;
  }
  function releaseMind(text) {
    const el = $('mindEntry'); const word = (text === undefined ? el.value : text).trim().slice(0, 36);
    if (!word) { el.focus(); toast('비어 있어도 괜찮습니다. 한 단어만 놓아도 충분합니다.'); return; }
    const c = frameCenter();
    const x = c.x + between(-c.r*.50,c.r*.50), y = c.y + between(-c.r*.20,c.r*.20);
    state.drops.push({ x, y, text: word, birth: state.t, seed: between(0,TAU) });
    if (state.drops.length > 8) state.drops.shift();
    if (el) el.value = '';
    state.trace.mind++;
    addRipple(x, y);
    toast('그 마음이 물결을 따라 조금씩 멀어집니다.');
  }
  function addStar(x,y) {
    if (state.starPoints.length >= 16) { toast('하나의 우주에는 열여섯 개의 별이면 충분합니다.'); return; }
    const index=state.starPoints.length;
    state.trace.infinity++;
    state.starPoints.push({ x, y, name:starNames[index] });
    state.constellationMade=false;
    updateStarStatus();
    addRipple(x,y);
    if (index === 2) toast('세 개의 별이 만나, 처음으로 하나의 이야기가 되었습니다.');
  }
  function finishStars() {
    if (state.starPoints.length < 2) { toast('별을 두 개 이상 찍으면 이야기가 만들어집니다.'); return; }
    const stars = state.starPoints;
    const beginning = stars[0].name, ending = stars[stars.length-1].name;
    const name = `${beginning}에서 ${ending}까지 이어진 길`;
    $('starPoem').textContent = `「${name}」`;
    state.constellationMade = true;
    openLetter(name);
    chime(660,.65);
  }
  function composeLetter(name) {
    const visited = state.visits.size;
    const water = state.trace.mind > 0
      ? `${state.trace.mind}개의 마음을 조용한 물결에 실어 보냈습니다.`
      : '이름 붙이지 않은 마음에도 머물 자리를 남겨 두었습니다.';
    const forest = state.trace.life > 0
      ? `${state.trace.life}번의 작은 선택으로, 없던 가지들이 자랐습니다.`
      : '씨앗 하나가 얼마나 먼 곳까지 자랄지 묻지 않았습니다.';
    const time = state.timeLens < 30 ? '기억이 쌓인 자리' : state.timeLens > 70 ? '아직 오지 않은 가능성' : '어떤 이름도 필요 없는 지금';
    const vision = state.trace.perception > 0 ? '보는 자리가 달라지자, 세계의 경계도 달라졌습니다.' : '익숙한 경계의 저편에도 또 다른 모습이 있습니다.';
    const opening = visited >= 5 ? '당신은 여러 개의 세계를 건너왔습니다.' : '당신은 하나의 작은 문을 열었습니다.';
    return `${opening}\n이 길에는 정답을 두지 않았습니다.\n\n당신이 바라본 시간은 ${time}.\n${water}\n${forest}\n${vision}\n\n그리고 당신이 직접 이은 별자리,\n「${name}」.\n\n이것은 미리 정해진 운명이 아니라\n당신이 있어서 생겨난 모양입니다.\n\n부디 기억해 주세요.\n세계는 발견해야 할 신비이자,\n당신이 새로 만들 수 있는 가능성입니다.`;
  }
  function openLetter(name) {
    $('letterText').textContent = composeLetter(name);
    lastFocused = document.activeElement;
    $('letterModal').hidden = false;
    $('closeLetter').focus();
    chime(660, .65);
  }
  function closeLetter() {
    $('letterModal').hidden = true;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  async function copyLetter() {
    const text = $('letterText').textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea');
        area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select();
        const ok = document.execCommand('copy'); area.remove();
        if (!ok) throw new Error('copy not supported');
      }
      toast('편지가 복사되었습니다.');
    } catch(e) { toast('복사에 실패했습니다. 편지를 직접 선택해 복사할 수 있습니다.'); }
  }
  function applyScene(scene, opts = {}) {
    if (!scenes[scene]) return;
    state.active = scene;
    state.visits.add(scene);
    state.ripples = [];
    state.sceneStart = performance.now()/1000;
    const meta = scenes[scene];
    document.documentElement.style.setProperty('--accent',rgba(meta.accent,1));
    document.documentElement.style.setProperty('--gold',meta.gold);
    document.documentElement.style.setProperty('--accent-glow',rgba(meta.accent,.2));
    document.documentElement.style.setProperty('--accent-border',rgba(meta.accent,.35));
    $('chapterCounter').textContent = `GARDEN ${meta.number} / 06`;
    $('sceneEnglish').textContent = meta.english;
    $('sceneTitle').innerHTML = meta.title;
    $('sceneDescription').innerHTML = meta.description;
    $('sceneReflection').textContent = meta.reflection[state.reflection[scene] || 0];
    $('ritualEyebrow').textContent = `작은 의식 ${meta.number}`;
    $('ritualName').textContent = meta.ritual;
    $('canvasInstruction').textContent = meta.instruction;
    $('centerLabelText').textContent = meta.label;
    $('sceneNumber').innerHTML = `${meta.number} <span class="slash">/ 06</span>`;
    $('copyTransition').style.animation = 'none';
    void $('copyTransition').offsetWidth;
    $('copyTransition').style.animation = '';
    document.querySelectorAll('.chapter').forEach((button) => {
      const active = button.dataset.scene === scene;
      button.classList.toggle('active',active);
      if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    renderControls(scene);
    if (!opts.skipHash) {
      try { history.replaceState(null, '', `#${scene}`); } catch (e) { location.hash=scene; }
    }
    render();
    if (sound) sound.update(scene);
  }
  function moveScene(dir) {
    const i = order.indexOf(state.active);
    applyScene(order[(i + dir + order.length) % order.length]);
  }
  function getPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const p = getPointer(event);
    state.mouse.down = true; state.mouse.lastX = p.x; state.mouse.lastY = p.y;
    if (state.active === 'perception') {
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* optional */ }
      return;
    }
    if (state.active === 'breath') state.trace.breath++;
    if (state.active === 'life') plant(p.x,p.y);
    else if (state.active === 'mind') { state.drops.push({x:p.x,y:p.y,text:'',birth:state.t,seed:0}); addRipple(p.x,p.y); }
    else if (state.active === 'infinity') addStar(p.x,p.y);
    else addRipple(p.x,p.y);
  }
  function pointerMove(event) {
    const p = getPointer(event);
    state.mouse.x = clamp((p.x / state.width - .5) * 2, -1, 1);
    state.mouse.y = clamp((p.y / state.height - .5) * 2, -1, 1);
    if (state.mouse.down && state.active === 'perception') {
      const dx = p.x - state.mouse.lastX, dy = p.y - state.mouse.lastY;
      state.trace.perception++;
      state.angleY += dx * .008;
      state.angleX = clamp(state.angleX + dy * .008, -1.35, 1.35);
      render();
    }
    state.mouse.lastX=p.x;state.mouse.lastY=p.y;
  }
  function pointerUp() { state.mouse.down=false; canvas.style.cursor='crosshair'; }
  function makeSound() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast('이 브라우저에서는 소리를 만들 수 없습니다.'); return null; }
    try {
      const ac = new AC();
      const master = ac.createGain(); master.gain.value=0;
      const filter = ac.createBiquadFilter(); filter.type='lowpass';filter.frequency.value=950;filter.Q.value=.25;
      filter.connect(master);master.connect(ac.destination);
      const tones=[];
      for (const freq of [110,164.81,220,329.63]) {
        const o=ac.createOscillator();const g=ac.createGain();
        o.type='sine';o.frequency.value=freq;
        g.gain.value=freq<200?.14:.06;
        o.connect(g);g.connect(filter);o.start();tones.push({o,g});
      }
      master.gain.setTargetAtTime(.24,ac.currentTime,.7);
      return { ac,master,tones,update(scene) {
        const offsets={breath:[1,1,1,1],time:[.89,1,1.12,1],mind:[1,1.06,.95,1],life:[1.12,1,1,1.08],perception:[1,.94,1.12,.89],infinity:[1,1.12,1.06,1]};
        const arr=offsets[scene];
        this.tones.forEach(({o},i)=>o.frequency.setTargetAtTime([110,164.81,220,329.63][i]*arr[i],ac.currentTime,1.8));
      },close(){ master.gain.setTargetAtTime(0,ac.currentTime,.16);setTimeout(()=>ac.close().catch(()=>{}),350); }};
    } catch(e) { toast('브라우저에서 소리를 재생할 수 없습니다.'); return null; }
  }
  function toggleSound() {
    if (sound) { sound.close();sound=null; }
    else sound=makeSound();
    $('soundToggle').setAttribute('aria-pressed',String(!!sound));
    $('soundToggle').setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');
    $('soundLabel').textContent=sound?'소리 켬':'소리 끔';
    if(sound) sound.update(state.active);
  }
  function chime(freq=440,duration=.4) {
    if (!sound || sound.ac.state !== 'running') return;
    try {
      const ac=sound.ac;const o=ac.createOscillator();const g=ac.createGain();
      o.type='sine';o.frequency.setValueAtTime(freq,ac.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,ac.currentTime+duration);
      g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.exponentialRampToValueAtTime(.018,ac.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);
      o.connect(g);g.connect(ac.destination);o.start(ac.currentTime);o.stop(ac.currentTime+duration+.02);
    } catch(e) { /* Audio is optional */ }
  }
  function capture() {
    try {
      // Print-ready canvas is drawn separately to preserve the art and add a quiet caption.
      const exported=document.createElement('canvas');
      const scale=2;
      exported.width=1200*scale;exported.height=750*scale;
      const g=exported.getContext('2d');
      const bg=g.createLinearGradient(0,0,1200,750);bg.addColorStop(0,'#070b13');bg.addColorStop(1,'#101728');
      g.scale(scale,scale);g.fillStyle=bg;g.fillRect(0,0,1200,750);
      const sourceRect=canvas.getBoundingClientRect();
      const s=Math.min(1130/sourceRect.width,675/sourceRect.height);
      const drawW=sourceRect.width*s,drawH=sourceRect.height*s;
      g.globalAlpha=.93;g.drawImage(canvas,0,0,canvas.width,canvas.height,(1200-drawW)/2,(750-drawH)/2,drawW,drawH);g.globalAlpha=1;
      const shade=g.createLinearGradient(0,500,0,750);shade.addColorStop(0,'rgba(8,12,20,0)');shade.addColorStop(1,'rgba(8,12,20,.91)');
      g.fillStyle=shade;g.fillRect(0,500,1200,250);
      g.font='22px Georgia,serif';g.fillStyle='#e7d7bc';g.fillText('L I M E N   /   경계가 사라지는 정원',60,68);
      g.font='34px Georgia,serif';g.fillStyle='#f2eae0';
      g.fillText(scenes[state.active].title.replace(/<[^>]*>/g,'').replace(/\s+/g,' '),60,655);
      g.font='16px Georgia,serif';g.fillStyle='rgba(228,217,202,.68)';
      g.fillText(`${scenes[state.active].english}  ·  A MOMENT ONLY YOU SAW`,60,698);
      g.strokeStyle='rgba(234,217,190,.35)';g.beginPath();g.moveTo(60,713);g.lineTo(1140,713);g.stroke();
      const link=document.createElement('a');
      link.download=`LIMEN-${state.active}-${new Date().toISOString().slice(0,10)}.png`;
      link.href=exported.toDataURL('image/png');
      document.body.appendChild(link);link.click();link.remove();
      toast('지금 이 순간의 풍경을 이미지로 담았습니다.');
    } catch(e) { toast('이미지를 저장할 수 없습니다. 브라우저의 저장 권한을 확인해 주세요.'); }
  }
  function showHelp() {
    lastFocused=document.activeElement;
    $('helpModal').hidden=false;
    $('closeHelp').focus();
  }
  function hideHelp() {
    $('helpModal').hidden=true;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function installHandlers() {
    document.querySelectorAll('.chapter').forEach(button => button.addEventListener('click', () => applyScene(button.dataset.scene)));
    $('previousScene').addEventListener('click',()=>moveScene(-1));
    $('nextScene').addEventListener('click',()=>moveScene(1));
    $('soundToggle').addEventListener('click',toggleSound);
    $('capture').addEventListener('click',capture);
    $('openHelp').addEventListener('click',showHelp);
    $('closeHelp').addEventListener('click',hideHelp);
    $('enterGarden').addEventListener('click',hideHelp);
    $('closeLetter').addEventListener('click',closeLetter);
    $('leaveLetter').addEventListener('click',closeLetter);
    $('copyLetter').addEventListener('click',copyLetter);
    $('letterModal').addEventListener('click',(e)=>{if(e.target===$('letterModal'))closeLetter()});
    $('helpModal').addEventListener('click',(e)=>{if(e.target===$('helpModal'))hideHelp()});
    window.addEventListener('keydown',(e)=>{
      if (!$('letterModal').hidden) {
        if (e.key==='Escape') { closeLetter(); e.preventDefault(); }
        if (e.key==='Tab') {
          const inside=Array.from($('letterModal').querySelectorAll('button:not([disabled])'));
          const first=inside[0],last=inside[inside.length-1];
          if(e.shiftKey && document.activeElement===first){last.focus();e.preventDefault()}
          else if(!e.shiftKey && document.activeElement===last){first.focus();e.preventDefault()}
        }
        return;
      }
      if (!$('helpModal').hidden) {
        if (e.key==='Escape') { hideHelp(); e.preventDefault(); }
        if (e.key==='Tab') {
          const inside=Array.from($('helpModal').querySelectorAll('button:not([disabled]),a[href]'));
          const first=inside[0], last=inside[inside.length-1];
          if(e.shiftKey && document.activeElement===first){last.focus();e.preventDefault()}
          else if(!e.shiftKey && document.activeElement===last){first.focus();e.preventDefault()}
        }
        return;
      }
      if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if(e.key==='ArrowRight'){moveScene(1);e.preventDefault()}
      if(e.key==='ArrowLeft'){moveScene(-1);e.preventDefault()}
      if(e.key==='Escape'&&$('toast').classList.contains('shown'))$('toast').classList.remove('shown');
    });
    canvas.addEventListener('pointerdown',pointerDown);
    canvas.addEventListener('pointermove',pointerMove);
    canvas.addEventListener('pointerup',pointerUp);
    canvas.addEventListener('pointercancel',pointerUp);
    window.addEventListener('pointerup',pointerUp);
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('hashchange',()=>{const name=location.hash.slice(1);if(scenes[name]&&state.active!==name)applyScene(name,{skipHash:true})});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(sound && sound.ac.state==='running')sound.ac.suspend().catch(()=>{})}else{if(sound)sound.ac.resume().catch(()=>{});state.t=performance.now()/1000;render()}});
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion=(e)=>{state.reducedMotion=e.matches;if(e.matches){state.t=performance.now()/1000;render()}};
    if(media.addEventListener)media.addEventListener('change',handleMotion);else if(media.addListener)media.addListener(handleMotion);
  }
  function start() {
    state.t = performance.now()/1000;
    installHandlers();
    resize();
    applyScene(state.active,{skipHash:true});
    requestAnimationFrame(animate);
  }
  start();
})();
