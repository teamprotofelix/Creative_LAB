(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'aurora-you-v1'; // Preserves gardens made with the original release.
  const MAX_STARS = 1200;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse)').matches;
  const canvas = $('gl');
  const starsCanvas = $('stars');
  const starCtx = starsCanvas.getContext('2d');
  const loader = $('loader');
  const soundButton = $('audio-toggle');
  const canDrawStars = !!starCtx;
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  let W = 1, H = 1, glScale = 1, starScale = 1;
  let lastTouch = {x: .5, y: .5};
  let lastStarAt = 0, lastStarAtPoint = null;
  let saveTimer = null, toastTimer = null;
  let dirtyStars = true, appVisible = !document.hidden;

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3100);
  }

  function validStar(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const x = Number(item.x), y = Number(item.y), t = Number(item.t), s = Number(item.s);
    if (![x, y, t, s].every(Number.isFinite) || x < 0 || x > 1 || y < 0 || y > 1) return null;
    return {x, y, t: clamp(t, 0, Date.now() + 86400000), s: clamp(s, .5, 3.5)};
  }

  function safeMemory(raw) {
    const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const input = Array.isArray(data.stars) ? data.stars.slice(-MAX_STARS * 2) : [];
    return {
      stars: input.map(validStar).filter(Boolean).slice(-MAX_STARS),
      visits: Number.isSafeInteger(data.visits) ? clamp(data.visits, 0, 999999) : 0,
      firstVisit: Number.isFinite(data.firstVisit) ? clamp(data.firstVisit, 0, Date.now()) : Date.now()
    };
  }

  let memory;
  try { memory = safeMemory(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { memory = safeMemory(null); }
  let stars = memory.stars;
  memory.visits += 1;

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    memory.stars = stars;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); }
    catch { /* Private mode or unavailable storage: experience still works in memory. */ }
  }
  function scheduleSave() {
    if (saveTimer !== null) return;
    saveTimer = setTimeout(persist, 900);
  }
  persist();
  addEventListener('pagehide', persist);

  function updateStats() {
    $('stats').textContent = `당신의 별자리에는 ${stars.length.toLocaleString('ko-KR')}개의 별이 있습니다.\n` +
      `당신은 이 우주를 ${memory.visits.toLocaleString('ko-KR')}번 방문했습니다.`;
    $('stats').style.whiteSpace = 'pre-line';
    $('hud-count').textContent = stars.length.toLocaleString('ko-KR');
  }

  const palettes = [
    { start: 5, end: 11, colors: [[1,.6,.7],[1,.85,.5],[.75,.45,.9]] },
    { start: 11, end: 17, colors: [[.4,.7,1],[1,.95,.55],[.85,.55,1]] },
    { start: 17, end: 22, colors: [[1,.45,.3],[.9,.3,.55],[.5,.15,.5]] }
  ];
  function getPalette() {
    const hour = new Date().getHours();
    return palettes.find(p => hour >= p.start && hour < p.end)?.colors || [[.35,.25,.85],[.6,.4,1],[.15,.08,.35]];
  }

  // WebGL background. Failure never stops constellations or the UI.
  let gl = null, program = null, geometry = null, shaderLocations = {};
  let palette = getPalette();
  let lastPaletteMinute = -1;
  let webglReady = false;
  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;
  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_scroll;
    uniform vec3 u_c1;
    uniform vec3 u_c2;
    uniform vec3 u_c3;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p = rot * p * 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      float mn = min(u_res.x, u_res.y);
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / mn;
      vec2 m = (vec2(u_mouse.x, u_res.y - u_mouse.y) - 0.5 * u_res) / mn;

      vec2 d = uv - m;
      float md = length(d);
      vec2 warp = d * exp(-md * 3.0) * 0.85;

      float t = u_time * 0.12;
      vec2 p = uv + warp + vec2(t * 0.3 + u_scroll * 0.4, -u_scroll * 0.6);

      vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
      vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + t),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) - t)
      );
      float f = fbm(p + 4.0 * r);

      vec3 col = mix(u_c1, u_c2, smoothstep(0.15, 0.85, f));
      col = mix(col, u_c3, smoothstep(0.3, 1.0, length(r)) * 0.7);

      float band = fbm(vec2(uv.x * 2.5 + t, uv.y * 1.2 - t * 0.4));
      band = smoothstep(0.35, 0.95, band);
      col += band * u_c2 * 0.22;

      col += u_c3 * exp(-md * 5.0) * 0.75;

      col *= max(0.12, 1.0 - pow(length(uv) * 0.55, 2.0));
      col = pow(max(col, 0.0), vec3(0.92)) * 0.42;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function fallback() {
    webglReady = false;
    document.body.classList.add('webgl-fallback');
  }
  function compileShader(type, code) {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, code);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('Shader unavailable:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  function initWebGL() {
    try {
      gl = canvas.getContext('webgl', {antialias:false, alpha:false, powerPreference:'low-power'}) ||
           canvas.getContext('experimental-webgl');
      if (!gl) return fallback();
      const vs = compileShader(gl.VERTEX_SHADER, VERT);
      let fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
      if (!fs) fs = compileShader(gl.FRAGMENT_SHADER, FRAG.replace('precision highp float;', 'precision mediump float;'));
      if (!vs || !fs) return fallback();
      program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.warn('WebGL program could not link'); return fallback(); }
      gl.useProgram(program);
      geometry = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, 'a_pos');
      if (pos < 0) return fallback();
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['u_res','u_mouse','u_time','u_scroll','u_c1','u_c2','u_c3']) shaderLocations[n] = gl.getUniformLocation(program, n);
      gl.viewport(0, 0, canvas.width, canvas.height);
      webglReady = true;
      document.body.classList.remove('webgl-fallback');
      updateGLPalette();
    } catch (error) {
      console.warn('Using CSS nebula fallback:', error);
      fallback();
    }
  }
  function updateGLPalette() {
    if (!webglReady) return;
    gl.useProgram(program);
    gl.uniform3fv(shaderLocations.u_c1, palette[0]);
    gl.uniform3fv(shaderLocations.u_c2, palette[1]);
    gl.uniform3fv(shaderLocations.u_c3, palette[2]);
  }
  canvas.addEventListener('webglcontextlost', (event) => {event.preventDefault();fallback();});
  canvas.addEventListener('webglcontextrestored', () => { gl = null; program = null; initWebGL(); });

  function resize() {
    W = Math.max(1, innerWidth);
    H = Math.max(1, innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.1 : 1.5);
    const pixelCap = Math.sqrt(1900000 / (W * H));
    glScale = Math.min(dpr, pixelCap, mobile ? .9 : 1.15);
    starScale = Math.min(dpr, Math.sqrt(2500000 / (W * H)));
    canvas.width = Math.max(1, Math.floor(W * glScale));
    canvas.height = Math.max(1, Math.floor(H * glScale));
    starsCanvas.width = Math.max(1, Math.floor(W * starScale));
    starsCanvas.height = Math.max(1, Math.floor(H * starScale));
    canvas.style.width = starsCanvas.style.width = W + 'px';
    canvas.style.height = starsCanvas.style.height = H + 'px';
    if (canDrawStars) starCtx.setTransform(starScale, 0, 0, starScale, 0, 0);
    if (webglReady) gl.viewport(0, 0, canvas.width, canvas.height);
    dirtyStars = true;
  }

  let pointer = {x: .5, y: .5, smoothX: .5, smoothY: .5};
  let scrollProgress = 0;
  function updateScroll() {
    scrollProgress = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - H), 0, 1);
  }
  addEventListener('scroll', updateScroll, {passive:true});
  addEventListener('resize', () => {resize();updateScroll();}, {passive:true});

  // Star sprite cached once, no per-star/per-frame gradients.
  let starSprite = null;
  if (canDrawStars) {
    starSprite = document.createElement('canvas');
    starSprite.width = starSprite.height = 72;
    const c = starSprite.getContext('2d');
    if (c) {
      const gradient = c.createRadialGradient(36,36,0,36,36,35);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(.08, 'rgba(244,223,255,.96)');
      gradient.addColorStop(.28, 'rgba(200,168,255,.45)');
      gradient.addColorStop(1, 'rgba(186,139,255,0)');
      c.fillStyle = gradient; c.fillRect(0,0,72,72);
    }
  }

  function drawStars(now) {
    if (!canDrawStars) return;
    const c = starCtx;
    c.clearRect(0,0,W,H);
    // Preserve links between nearby stars forever, including after reload.
    c.lineWidth = .75;
    for (let i=1; i<stars.length; i++) {
      const a=stars[i-1], b=stars[i];
      if (b.t - a.t > 15000 || b.t < a.t) continue;
      const dx=(a.x-b.x)*W, dy=(a.y-b.y)*H;
      if (dx*dx+dy*dy > (Math.min(W,H)*.38)**2) continue;
      c.strokeStyle = 'rgba(211,184,255,.26)';
      c.beginPath(); c.moveTo(a.x*W,a.y*H); c.lineTo(b.x*W,b.y*H); c.stroke();
    }
    for (const s of stars) {
      const x=s.x*W, y=s.y*H;
      const recent=clamp(1-(Date.now()-s.t)/3500,0,1);
      const pulse=reduceMotion ? 1 : 1 + .09 * Math.sin(now / 1100 + s.x*13 + s.y*7);
      const size=(8 + s.s*7)*pulse*(1 + recent * .45);
      c.globalAlpha = .62 + recent*.35;
      if (starSprite) c.drawImage(starSprite, x-size, y-size, size*2, size*2);
      else { c.fillStyle='#f8e7ff'; c.beginPath(); c.arc(x,y,s.s,0,Math.PI*2); c.fill(); }
    }
    c.globalAlpha = 1;
    dirtyStars = false;
  }

  function addStar(x,y,forced=false) {
    const now = Date.now();
    const normX=clamp(x / W, 0, 1), normY=clamp(y / H, 0, 1);
    if (!forced) {
      if (now - lastStarAt < 170) return;
      if (lastStarAtPoint && Math.hypot((normX-lastStarAtPoint.x)*W,(normY-lastStarAtPoint.y)*H) < 18) return;
    }
    lastStarAt = now;
    lastStarAtPoint = {x:normX,y:normY};
    const star = {x:normX,y:normY,t:now,s:1+Math.random()*1.6};
    stars.push(star);
    if (stars.length > MAX_STARS) stars.shift();
    memory.stars = stars;
    dirtyStars = true;
    scheduleSave();
    updateStats();
  }

  function interactiveTarget(t) {return t instanceof Element && !!t.closest('button, a, input, textarea, select, label');}
  function handlePointer(event) {
    if (event.isPrimary === false || interactiveTarget(event.target)) return;
    pointer.x = clamp(event.clientX/W, 0, 1);
    pointer.y = clamp(event.clientY/H, 0, 1);
    lastTouch = {x:pointer.x,y:pointer.y};
    if (event.type === 'pointerdown' && event.button !== 0 && event.pointerType === 'mouse') return;
    if (event.type === 'pointermove' && event.pointerType === 'mouse' && event.buttons !== 0 && event.button === 2) return;
    addStar(event.clientX, event.clientY, event.type === 'pointerdown');
  }
  addEventListener('pointermove',handlePointer,{passive:true});
  addEventListener('pointerdown',handlePointer,{passive:true});

  // Audio is optional. Creation takes place only after the sound button is clicked.
  let audioCtx = null, master = null, audioOn = false;
  function createAudio() {
    if (audioCtx) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('AudioContext unavailable');
    audioCtx = new Audio();
    master = audioCtx.createGain(); master.gain.value = 0;
    master.connect(audioCtx.destination);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 420;
    filter.connect(master);
    [110,164.81,220,277.18].forEach((freq,i) => {
      const osc = audioCtx.createOscillator();
      osc.type=i%2===0?'sine':'triangle'; osc.frequency.value=freq;
      const gain=audioCtx.createGain(); gain.gain.value=.045/(1+i*.7);
      osc.connect(gain); gain.connect(filter); osc.start();
    });
    const lfo=audioCtx.createOscillator(); lfo.frequency.value=.08;
    const modulation=audioCtx.createGain(); modulation.gain.value=110;
    lfo.connect(modulation); modulation.connect(filter.frequency); lfo.start();
  }
  soundButton.addEventListener('click', async () => {
    try {
      createAudio();
      if (audioCtx.state==='suspended') await audioCtx.resume();
      audioOn = !audioOn;
      const t=audioCtx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(audioOn ? .28 : 0,t,.27);
      soundButton.classList.toggle('on',audioOn);
      soundButton.setAttribute('aria-pressed',String(audioOn));
      soundButton.setAttribute('aria-label',audioOn?'소리 끄기':'소리 켜기');
      soundButton.querySelector('.sound-state').textContent = audioOn?' ON':' OFF';
    } catch(error) {
      console.warn('Sound unavailable:',error);
      toast('이 브라우저에서는 소리를 재생할 수 없습니다. 시각 효과는 계속됩니다.');
    }
  });

  // Local-only export/import so a garden can be preserved across devices.
  $('plant').addEventListener('click', () => {
    addStar(lastTouch.x*W,lastTouch.y*H,true);
    toast('별 하나가 우주에 남았습니다.');
  });
  $('forget').addEventListener('click', () => {
    if (!confirm('별자리와 방문 기록을 모두 지울까요? 이 작업은 되돌릴 수 없습니다.')) return;
    stars.length=0; memory.stars=stars; memory.visits=1; memory.firstVisit=Date.now();
    lastStarAtPoint=null;
    persist(); dirtyStars=true; updateStats(); toast('이 우주의 기억을 지웠습니다.');
  });
  $('export').addEventListener('click', () => {
    try {
      const data={format:'aurora-you',version:2,exportedAt:new Date().toISOString(),
        stars:stars.map(s=>({...s})),visits:memory.visits,firstVisit:memory.firstVisit};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='aurora-constellation.json';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('별자리 백업 파일을 저장했습니다.');
    } catch {toast('백업 파일 생성에 실패했습니다.');}
  });
  $('import').addEventListener('click', ()=>$('import-file').click());
  $('import-file').addEventListener('change',async(e)=>{
    const input=e.currentTarget, file=input.files?.[0];input.value='';
    if (!file) return;
    if (file.size > 1024*1024) return toast('파일이 너무 큽니다. 1MB 이하의 JSON 파일을 선택하세요.');
    try {
      const parsed=JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.stars) ||
         (parsed.format && parsed.format!=='aurora-you') || parsed.stars.length > 3000) throw new Error('invalid format');
      const clean=safeMemory(parsed);
      if (clean.stars.length!==parsed.stars.length) throw new Error('invalid stars');
      if (!confirm(`별 ${clean.stars.length}개를 가져와 현재 정원을 교체할까요?`)) return;
      memory=clean; memory.visits=Math.max(1,memory.visits);
      stars=memory.stars;lastStarAtPoint=null;
      persist(); dirtyStars=true; updateStats(); toast('별자리를 복원했습니다.');
    } catch {toast('올바른 별자리 JSON 파일이 아닙니다.');}
  });

  const panels=Array.from(document.querySelectorAll('.panel'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if(entry.isIntersecting) entry.target.classList.add('visible');
    },{threshold:.17});
    panels.forEach(p=>observer.observe(p));
  } else panels.forEach(p=>p.classList.add('visible'));

  document.addEventListener('visibilitychange',()=>{appVisible=!document.hidden;});
  let started=performance.now(),lastGL=0,lastStarFrame=0,raf=0;
  function animate(now) {
    if (appVisible) {
      pointer.smoothX+=(pointer.x-pointer.smoothX)*.08;
      pointer.smoothY+=(pointer.y-pointer.smoothY)*.08;
      const minute=Math.floor(Date.now()/60000);
      if (minute!==lastPaletteMinute) {lastPaletteMinute=minute;palette=getPalette();updateGLPalette();}
      const glInterval=reduceMotion?900:mobile?46:32;
      if (webglReady && (now-lastGL>glInterval)) {
        try {
          gl.useProgram(program);
          gl.uniform2f(shaderLocations.u_res, canvas.width,canvas.height);
          gl.uniform2f(shaderLocations.u_mouse,pointer.smoothX*canvas.width,pointer.smoothY*canvas.height);
          gl.uniform1f(shaderLocations.u_time,reduceMotion?0:(now-started)/1000);
          gl.uniform1f(shaderLocations.u_scroll,scrollProgress);
          gl.drawArrays(gl.TRIANGLES,0,6);
          lastGL=now;
        } catch {fallback();}
      }
      if (canDrawStars && (dirtyStars || (!reduceMotion && now-lastStarFrame>110))) {
        drawStars(now);lastStarFrame=now;
      }
    }
    raf=requestAnimationFrame(animate);
  }
  resize();
  initWebGL();
  updateScroll();
  updateStats();
  if (canDrawStars) drawStars(performance.now());
  requestAnimationFrame(animate);
  setTimeout(()=>{
    loader.classList.add('hidden');
    document.body.classList.add('ready');
    if (!reduceMotion) document.body.classList.add('motion-ready');
    panels[0]?.classList.add('visible');
  }, 450);
})();
