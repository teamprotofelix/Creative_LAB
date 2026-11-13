/* THE THRESHOLD — zero-dependency interactive art experience.
   File:// and GitHub Pages compatible; audio is strictly opt-in. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const glCanvas = $('#gl');
  const fxCanvas = $('#fx');
  const fx = fxCanvas.getContext('2d');
  const signal = $('#signal');
  const railFill = $('#rail-fill');
  const clock = $('#clock');
  const soundButton = $('#sound-btn');
  const soundStatus = $('#sound-status');
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  const flash = $('.flash');
  const status = $('#status');
  const scenes = $$('.scene');
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches && !prefersReducedMotion;
  if (finePointer) document.body.classList.add('has-custom-cursor');

  let width = innerWidth;
  let height = innerHeight;
  let fxDpr = 1;
  let renderDpr = 1;
  let progress = 0;
  let impactEnergy = 0;
  let visible = true;
  let previous = performance.now();
  let lastRender = 0;
  let hasFlashed = false;
  let impactCount = 0;
  let pointer = { x: width / 2, y: height / 2 };
  let ringX = pointer.x;
  let ringY = pointer.y;
  const particles = [];
  const impactMarks = [];
  let fractureLines = [];

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // WebGL is optional. Failures cannot interrupt scroll, particles, or page content.
  let pipeline = null;
  let fallback2D = null;
  const VERTEX = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const FRAGMENT = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_progress;
    uniform float u_fracture;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
                 mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);
    }
    float fbm(vec2 p) {
      float total = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        total += amp * noise(p);
        p = p * 2.08 + vec2(3.7, 1.2);
        amp *= 0.5;
      }
      return total;
    }
    void main() {
      vec2 uv = v_uv;
      vec2 delta = uv - u_pointer;
      float t = u_time * 0.045;
      float fieldA = fbm(uv * 2.1 + vec2(t, -t * 0.3));
      float fieldB = fbm(uv * 3.3 + vec2(3.1, 8.2) + fieldA * 1.8 - t * 0.7);
      float m = fbm(uv * 4.0 + fieldB * 2.5 + vec2(t * 0.4, -t));

      vec3 night = vec3(0.024,0.027,0.057);
      vec3 cobalt = vec3(0.075,0.10,0.19);
      vec3 violet = vec3(0.21,0.13,0.24);
      vec3 amber = vec3(0.53,0.29,0.14);
      vec3 col = mix(night, cobalt, smoothstep(0.15,0.88,m));
      col = mix(col,violet,smoothstep(0.37,0.84,fieldB)*0.52);
      col = mix(col,amber,smoothstep(0.38,0.90,m) * u_progress * .78);

      float mouseGlow = exp(-length(delta) * 7.5) * (0.08 + u_progress * 0.2);
      col += vec3(0.24,0.18,0.13) * mouseGlow;

      // A narrow fault line opens as the user advances. This was missing in v1.
      float fault = 0.5 + sin(uv.y * 16.0 + fieldA * 2.0) * 0.012
                        + sin(uv.y * 43.0 + fieldB * 3.0) * 0.004;
      float dist = abs(uv.x - fault);
      float opening = smoothstep(0.20,0.90,u_progress);
      float rift = max(opening, u_fracture * 0.58);
      float coreWidth = mix(0.001,0.038,opening * opening);
      float glowWidth = mix(0.016,0.20,opening);
      float core = 1.0 - smoothstep(0.0,coreWidth + 0.002,dist);
      float halo = exp(-dist / max(0.006,glowWidth)) * rift;
      col += vec3(0.76,0.40,0.13) * halo * (0.23 + opening * .5);
      col += vec3(1.0,0.88,0.61) * core * rift * (0.3 + opening * .55);

      float beyond = smoothstep(0.65,0.96,u_progress);
      col += vec3(0.23,0.14,0.08) * beyond * exp(-length((uv-vec2(.5,.5))*vec2(1.0,.72)) * 4.0);
      float vignette = 1.0 - smoothstep(.27,.88,length((uv-.5)*vec2(1.05,.86)));
      col *= vignette * .72 + .28;
      gl_FragColor = vec4(col,1.0);
    }
  `;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader) || 'Unknown shader compilation failure';
      gl.deleteShader(shader);
      throw new Error(reason);
    }
    return shader;
  }

  function makePipeline() {
    let gl;
    try {
      gl = glCanvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false }) ||
           glCanvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL unsupported');
      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      const program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate program');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
      }
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1, -1, 1,
        -1,  1,  1, -1,  1, 1
      ]), gl.STATIC_DRAW);
      const aPosition = gl.getAttribLocation(program, 'a_position');
      if (aPosition < 0) throw new Error('Position attribute missing');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      return {
        gl, program,
        pointer: gl.getUniformLocation(program, 'u_pointer'),
        time: gl.getUniformLocation(program, 'u_time'),
        progress: gl.getUniformLocation(program, 'u_progress'),
        fracture: gl.getUniformLocation(program, 'u_fracture')
      };
    } catch (error) {
      console.warn('[THE THRESHOLD] WebGL unavailable, switching to Canvas/CSS fallback:', error.message);
      return null;
    }
  }

  pipeline = makePipeline();
  if (!pipeline) {
    // 2D context may be unavailable if a partial WebGL context was obtained.
    try { fallback2D = glCanvas.getContext('2d'); } catch (_) { /* CSS still renders. */ }
    if (!fallback2D) glCanvas.style.display = 'none';
  }
  glCanvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    pipeline = null;
    glCanvas.style.display = 'none';
    console.warn('[THE THRESHOLD] Graphics context lost; CSS background remains visible.');
  });
  glCanvas.addEventListener('webglcontextrestored', () => {
    pipeline = makePipeline();
    glCanvas.style.display = pipeline ? 'block' : 'none';
    resize();
  });

  // Tiny seeded generator: the main rupture looks stable rather than jumping each frame.
  function seeded(seed) {
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function rebuildFractures() {
    fractureLines = [];
    const random = seeded(7719);
    function branch(x, y, angle, length, level) {
      if (level > 3 || length < 12) return;
      const points = [[x,y]];
      const segments = 10;
      let xx = x, yy = y, heading = angle;
      for (let i = 0; i < segments; i++) {
        heading += (random() - .5) * (.23 + level * .16);
        const distance = length / segments;
        xx += Math.cos(heading) * distance;
        yy += Math.sin(heading) * distance;
        points.push([xx,yy]);
        if (i === 4 && level < 3) {
          const side = random() > .5 ? 1 : -1;
          branch(xx, yy, heading + side * (0.6 + random() * .6), length * (.33 + random() * .25), level + 1);
        }
      }
      fractureLines.push({ points, level });
    }
    branch(width * .5,height * .52,-Math.PI / 2,height * .69,0);
    branch(width * .5,height * .52,Math.PI / 2,height * .65,0);
    branch(width * .5,height * .52,0,height * .28,1);
    branch(width * .5,height * .52,Math.PI,height * .26,1);
  }

  function resize() {
    width = Math.max(1,innerWidth);
    height = Math.max(1,innerHeight);
    const pixelCount = width * height;
    renderDpr = Math.max(.5, Math.min(devicePixelRatio || 1, 1.45, Math.sqrt(1700000 / pixelCount)));
    fxDpr = Math.max(.5,Math.min(devicePixelRatio || 1,1.5));
    glCanvas.width = Math.round(width * renderDpr);
    glCanvas.height = Math.round(height * renderDpr);
    fxCanvas.width = Math.round(width * fxDpr);
    fxCanvas.height = Math.round(height * fxDpr);
    if (pipeline) pipeline.gl.viewport(0,0,glCanvas.width,glCanvas.height);
    if (fx) fx.setTransform(fxDpr,0,0,fxDpr,0,0);
    rebuildFractures();
    syncScroll();
  }

  function syncScroll() {
    const max = Math.max(0,document.documentElement.scrollHeight - innerHeight);
    progress = max > 0 ? clamp(scrollY / max) : 0;
    signal.textContent = String(Math.floor(progress * 100)).padStart(2,'0');
    railFill.style.height = (progress * 100).toFixed(2) + '%';
    // Avoid writing `style.transform`, which cancels the reveal transition.
    scenes.forEach((scene) => {
      if (!scene.classList.contains('is-visible')) return;
      const rect = scene.getBoundingClientRect();
      const displacement = clamp((rect.top + rect.height / 2 - height / 2) / height, -1, 1) * -11;
      const content = scene.querySelector('.content');
      if (content) content.style.setProperty('--float-y', displacement.toFixed(1) + 'px');
    });
  }

  function updateClock() {
    const d = new Date();
    clock.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  updateClock();
  setInterval(updateClock,30000);

  function onArrival() {
    if (hasFlashed || prefersReducedMotion) return;
    hasFlashed = true;
    flash.classList.remove('active');
    // Force reflow so repeated CSS animations work when manually restarting.
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 1250);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => burst(width * (.35 + Math.random() * .3),height * (.35 + Math.random() * .3),26,3.8), i * 110);
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({target,isIntersecting}) => {
        if (!isIntersecting) return;
        target.classList.add('is-visible');
        if (target.id === 'arrival') onArrival();
      });
    },{ threshold:.16 });
    scenes.forEach(scene => observer.observe(scene));
  } else {
    scenes.forEach(scene => scene.classList.add('is-visible'));
  }

  class Particle {
    constructor(x,y,vx,vy,life,hue,size) {
      this.x=x; this.y=y; this.vx=vx; this.vy=vy;
      this.life=life; this.total=life; this.hue=hue; this.size=size;
    }
    step(dt) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= Math.pow(.982,dt); this.vy *= Math.pow(.982,dt);
      this.vy += .009 * dt; this.life -= dt;
    }
    draw() {
      if (!fx) return;
      const alpha = clamp(this.life / this.total);
      fx.fillStyle = `hsla(${this.hue},96%,79%,${(alpha * .85).toFixed(3)})`;
      fx.beginPath(); fx.arc(this.x,this.y,this.size,0,Math.PI * 2); fx.fill();
    }
  }

  function burst(x,y,count=35,spread=4) {
    if (prefersReducedMotion || !fx) return;
    for (let i=0; i<count; i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = (Math.random()*.85 + .15)*spread;
      particles.push(new Particle(x,y,Math.cos(angle)*speed,Math.sin(angle)*speed,
        38 + Math.random()*64,27+Math.random()*25,.5+Math.random()*1.8));
    }
    if (particles.length > 450) particles.splice(0,particles.length-450);
  }

  function addImpact(x,y,scale=1) {
    if (!fx) return;
    const random = seeded(Math.floor(x*31+y*13+impactCount*17));
    const rays = [];
    for (let i=0;i<9;i++) {
      const a = Math.PI*2*i/9 + (random()-.5)*.5;
      const points = [[x,y]];
      let xx=x,yy=y, angle=a;
      const len=(24+random()*65)*scale;
      for (let step=0;step<5;step++) {
        angle += (random()-.5)*.55;
        xx += Math.cos(angle)*len/5; yy += Math.sin(angle)*len/5;
        points.push([xx,yy]);
      }
      rays.push(points);
    }
    impactMarks.push({rays,life:750,total:750});
    if (impactMarks.length > 12) impactMarks.shift();
  }

  function impactAt(x,y,scale=1) {
    impactCount++;
    impactEnergy = clamp(impactEnergy + .22,0,1);
    addImpact(x,y,scale);
    burst(x,y,Math.round(35*scale),5.4*scale);
    if (impactCount % 3 === 0) status.textContent = `벽에 ${impactCount}번의 흔적을 남겼습니다.`;
  }

  $('#fracture-btn').addEventListener('click', (event) => {
    event.stopPropagation();
    impactAt(width/2,height/2,2.2);
    const messages = ['금이 가기 시작했습니다.','작은 틈으로 빛이 스며듭니다.','벽은 생각보다 얇았습니다.','당신은 방향을 찾았습니다.'];
    $('#impact-note').textContent = messages[Math.min(impactCount-1, messages.length-1)];
  });
  addEventListener('click',(event) => {
    if (event.target.closest('a,button')) return;
    impactAt(event.clientX,event.clientY);
  });
  addEventListener('pointermove',(event) => {
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (finePointer) dot.style.transform = `translate3d(${pointer.x-3}px,${pointer.y-3}px,0)`;
  },{passive:true});
  addEventListener('pointerdown',() => ring.classList.add('pulse'),{passive:true});
  addEventListener('pointerup',() => ring.classList.remove('pulse'),{passive:true});
  addEventListener('pointercancel',() => ring.classList.remove('pulse'),{passive:true});

  let typed = '';
  addEventListener('keydown',(event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    typed = (typed + event.key.toLowerCase()).slice(-5);
    if (typed !== 'break') return;
    typed = '';
    for (let i=0;i<8;i++) {
      setTimeout(() => impactAt(Math.random()*width,Math.random()*height,1.35),i*75);
    }
    document.body.classList.remove('broken');
    void document.body.offsetWidth;
    document.body.classList.add('broken');
    setTimeout(() => document.body.classList.remove('broken'),1050);
    status.textContent = '숨겨진 균열이 발견되었습니다.';
  });
  $('#restart-btn').addEventListener('click', () => {
    hasFlashed = false;
    impactCount = 0;
    impactEnergy = 0;
    impactMarks.length = 0;
    $('#impact-note').textContent = '';
  });

  // User-gesture audio: safe to fail and completely separate from the visual loop.
  let audioContext = null;
  let audioSetup = false;
  function configureAudio(context) {
    const master = context.createGain();
    master.gain.value = .11;
    master.connect(context.destination);
    const frequencies = [55,82.41,110,164.81];
    frequencies.forEach((frequency,index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.value = .16 / (index+1);
      oscillator.connect(gain); gain.connect(master); oscillator.start();
      const lfo = context.createOscillator();
      lfo.frequency.value = .035 + index*.021;
      const lfoGain = context.createGain();
      lfoGain.gain.value = .035;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain); lfo.start();
    });
    audioSetup = true;
  }
  function updateSoundUI(on) {
    soundStatus.textContent = on ? 'ON' : 'OFF';
    soundButton.setAttribute('aria-pressed',String(on));
    soundButton.setAttribute('aria-label',on ? '배경음 끄기' : '배경음 켜기');
  }
  if (!(window.AudioContext || window.webkitAudioContext)) {
    soundButton.disabled = true;
    soundButton.title = '이 브라우저는 Web Audio를 지원하지 않습니다.';
  }
  soundButton.addEventListener('click',async () => {
    if (soundButton.disabled) return;
    soundButton.disabled = true;
    try {
      if (!audioContext) {
        const AudioConstructor = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioConstructor();
      }
      const firstActivation = !audioSetup;
      if (firstActivation) configureAudio(audioContext);
      if (firstActivation || audioContext.state !== 'running') await audioContext.resume();
      else await audioContext.suspend();
      updateSoundUI(audioContext.state === 'running');
    } catch (error) {
      console.warn('[THE THRESHOLD] Audio unavailable:',error);
      updateSoundUI(false);
      status.textContent = '오디오를 사용할 수 없지만, 시각 효과는 계속 작동합니다.';
    } finally {
      soundButton.disabled = false;
    }
  });

  function drawBackdrop(t) {
    if (pipeline) {
      const {gl} = pipeline;
      gl.useProgram(pipeline.program);
      gl.uniform2f(pipeline.pointer, clamp(pointer.x/width),1-clamp(pointer.y/height));
      gl.uniform1f(pipeline.time,t);
      gl.uniform1f(pipeline.progress,progress);
      gl.uniform1f(pipeline.fracture,impactEnergy);
      gl.drawArrays(gl.TRIANGLES,0,6);
    } else if (fallback2D) {
      fallback2D.setTransform(1,0,0,1,0,0);
      const w=glCanvas.width,h=glCanvas.height;
      const radial=fallback2D.createRadialGradient(w*.5,h*.52,w*.02,w*.5,h*.5,w*.75);
      radial.addColorStop(0,progress>.4?'#754d43':'#302b48');
      radial.addColorStop(.45,progress>.4?'#332438':'#14182a');
      radial.addColorStop(1,'#07090e');
      fallback2D.fillStyle=radial; fallback2D.fillRect(0,0,w,h);
      const opening = clamp((progress-.2)*1.5);
      if (opening>0) {
        // Smooth translucent glow, not an opaque stripe through the captions.
        const center=w*.5;
        const radius=(17 + opening*92)*renderDpr;
        const slit=fallback2D.createLinearGradient(center-radius,0,center+radius,0);
        slit.addColorStop(0,'rgba(230,141,81,0)');
        slit.addColorStop(.42,`rgba(239,168,101,${(opening*.13).toFixed(3)})`);
        slit.addColorStop(.49,`rgba(255,221,177,${(opening*.34).toFixed(3)})`);
        slit.addColorStop(.5,`rgba(255,242,208,${(opening*.43).toFixed(3)})`);
        slit.addColorStop(.51,`rgba(255,221,177,${(opening*.34).toFixed(3)})`);
        slit.addColorStop(.58,`rgba(239,168,101,${(opening*.13).toFixed(3)})`);
        slit.addColorStop(1,'rgba(230,141,81,0)');
        fallback2D.fillStyle=slit;
        fallback2D.fillRect(center-radius,h*.04,radius*2,h*.92);
      }
    }
  }

  function strokePartial(points,fraction) {
    if (!fx || fraction<=0 || points.length<2) return;
    const maxSegments=points.length-1;
    const position=clamp(fraction)*maxSegments;
    const segments=Math.floor(position);
    fx.beginPath();fx.moveTo(points[0][0],points[0][1]);
    for (let i=1;i<=segments;i++) fx.lineTo(points[i][0],points[i][1]);
    if (segments<maxSegments) {
      const a=points[segments],b=points[segments+1];
      fx.lineTo(lerp(a[0],b[0],position-segments),lerp(a[1],b[1],position-segments));
    }
    fx.stroke();
  }

  function drawCracks(dt) {
    if (!fx) return;
    const fracture=clamp((progress-.16)*1.7 + impactEnergy*.3);
    if (fracture > 0) {
      fx.save(); fx.globalCompositeOperation='screen';
      fractureLines.forEach(({points,level}) => {
        const reveal=clamp((fracture - level*.1)*1.35);
        if (reveal<=0) return;
        fx.lineCap='round';fx.lineJoin='round';
        fx.lineWidth=level===0?1.8:level===1?1.1:.65;
        fx.strokeStyle=`rgba(255,211,160,${(.46-level*.09)*reveal})`;
        fx.shadowBlur=level===0?19:8;
        fx.shadowColor='#ffb75e';
        strokePartial(points,reveal);
      });
      fx.restore();
    }
    for (let i=impactMarks.length-1;i>=0;i--) {
      const mark=impactMarks[i];
      mark.life-=dt;
      if (mark.life<=0) {impactMarks.splice(i,1);continue;}
      const alpha=clamp(mark.life/mark.total);
      fx.save();fx.lineWidth=1;fx.strokeStyle=`rgba(255,210,163,${alpha*.76})`;
      fx.shadowBlur=8;fx.shadowColor='#ffb97c';
      mark.rays.forEach(points => strokePartial(points,1));
      fx.restore();
    }
  }

  function drawParticles(dt) {
    if (!fx) return;
    if (!prefersReducedMotion && Math.random()<.26 && particles.length<180) {
      particles.push(new Particle(Math.random()*width,height+5,(Math.random()-.5)*.4,
        -.35-Math.random()*.7,130+Math.random()*160,29+Math.random()*21,.4+Math.random()*1.1));
    }
    for (let i=particles.length-1;i>=0;i--) {
      const particle=particles[i];particle.step(dt);particle.draw();
      if (particle.life<=0) particles.splice(i,1);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) {previous=now;return;}
    const interval=prefersReducedMotion?200:33;
    if (now-lastRender<interval) return;
    const dt=clamp((now-previous)/16.667,.01,3);
    previous=now;lastRender=now;
    impactEnergy=Math.max(0,impactEnergy-.0016*dt);
    if (finePointer) {
      const easing=clamp(.15*dt);
      ringX=lerp(ringX,pointer.x,easing);
      ringY=lerp(ringY,pointer.y,easing);
      ring.style.transform=`translate3d(${ringX-16}px,${ringY-16}px,0)`;
    }
    drawBackdrop(now*.001);
    if (fx) {
      fx.clearRect(0,0,width,height);
      drawCracks(dt);
      drawParticles(dt);
    }
  }

  addEventListener('resize',resize,{passive:true});
  addEventListener('scroll',syncScroll,{passive:true});
  document.addEventListener('visibilitychange',() => {
    visible=!document.hidden;
    if (visible) previous=performance.now();
  });
  resize();
  requestAnimationFrame(frame);
  // Test-friendly status, does not affect rendering.
  document.body.dataset.ready='true';
})();
