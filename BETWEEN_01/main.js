/* 사이 / BETWEEN v2 — 순수 브라우저 구현. 외부 요청/의존성 없음. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const rand = (a, b) => a + Math.random() * (b - a);
  const opts = { cycle: 480, maxTrees: 7, maxMemories: 40, storage: 'between-memories-v2' };
  const canvas = $('world');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { $('toast').textContent = '이 브라우저는 Canvas 2D를 지원하지 않습니다.'; $('toast').classList.add('show'); return; }
  const reducePref = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = { reduced: reducePref.matches };
  let W = 1, H = 1, dpr = 1;
  let particles = [], stars = [], trees = [], memories = [], storageAvailable = true;
  const mouse = { x: 0, y: 0, active: false, isTouch: false };
  const clock = { phase: 0.05, seconds: 0, paused: false, dragging: false, wheelUntil: 0 };
  let entered = false, lastMessage = -1, msgTimeout = 0, toastTimeout = 0;
  let frameId = 0, lastFrame = performance.now(), lastDraw = 0, uiLast = 0;
  const phases = [
    { name:'새벽', caption:'새벽의 숨', hue:225, top:[5,10,28], bottom:[24,27,54] },
    { name:'아침', caption:'빛의 태어남', hue:33, top:[34,33,60], bottom:[112,72,92] },
    { name:'낮', caption:'깨어 있는 세계', hue:194, top:[24,64,99], bottom:[76,112,140] },
    { name:'황혼', caption:'시간의 가장자리', hue:21, top:[68,41,73], bottom:[132,65,75] },
    { name:'밤', caption:'흩어진 별의 기억', hue:250, top:[9,11,34], bottom:[18,18,48] },
    { name:'심야', caption:'다시 돌아오는 고요', hue:210, top:[3,6,17], bottom:[8,13,30] }
  ];
  const lines = [
    '우리가 닿은 자리에\n작은 우주가 남습니다.',
    '오늘의 빛이\n내일의 기억이 됩니다.',
    '세상이 나를 바라보는 순간을\n상상해 봅니다.',
    '서두르지 않아도 괜찮습니다.\n하루는 천천히 되돌아옵니다.',
    '잠시 머물렀던 자리에도\n아름다움이 남습니다.',
    '사라지는 나무와\n사라지지 않는 빛 사이.',
    '당신이 만든 별은\n이 기기의 밤에 머뭅니다.',
    '관찰은 질문이고,\n창조는 질문에 대한 또 다른 질문입니다.',
    '서로 멀리 있는 빛도\n잠시 연결될 수 있습니다.',
    '당신은 지금\n어떤 시간 속에 있나요?',
    '시간을 거꾸로 돌려도\n방금 심은 빛은 남습니다.'
  ];
  const HUES = [224, 36, 194, 24, 252, 220];

  function phaseData() {
    const q = ((clock.phase % 1) + 1) % 1 * phases.length;
    const i = Math.floor(q), f = q - i;
    const a = phases[i], b = phases[(i + 1) % phases.length];
    let delta = b.hue - a.hue;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return {
      name: f < .5 ? a.name : b.name, caption: f < .5 ? a.caption : b.caption,
      hue: (a.hue + delta * f + 360) % 360,
      top: a.top.map((v,j)=>lerp(v,b.top[j],f)),
      bottom: a.bottom.map((v,j)=>lerp(v,b.bottom[j],f))
    };
  }
  function rgb(x) { return `rgb(${x.map(v=>Math.round(v)).join(',')})`; }
  function hsla(h, s, l, a) { return `hsla(${Math.round(h)},${s}%,${l}%,${clamp(a,0,1).toFixed(3)})`; }
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 2700);
  }
  function whisper(text) {
    const el = $('whisper'); el.textContent = text;
    el.classList.add('show'); clearTimeout(msgTimeout);
    msgTimeout = setTimeout(() => el.classList.remove('show'), 5300);
  }
  function nextWhisper() {
    let idx = Math.floor(Math.random()*lines.length);
    if (idx === lastMessage) idx = (idx + 1) % lines.length;
    lastMessage = idx; whisper(lines[idx]);
  }
  function enter() {
    if (entered) return;
    entered = true;
    $('intro').classList.add('hidden');
    setTimeout(()=>{ $('intro').hidden = true; $('pointer-hint').classList.add('show'); }, 1600);
    setTimeout(()=>{ $('pointer-hint').classList.remove('show'); }, 6200);
    setTimeout(()=>whisper('당신의 손끝에서\n빛이 번져 나옵니다.'), 1500);
  }

  // 현재 세션은 정규화된 위치에 별을 저장하므로 화면 크기가 달라져도 보존됩니다.
  function validatedMemory(x, normalized=true) {
    if (!x || typeof x !== 'object') return null;
    let nx = Number(x.x), ny = Number(x.y), hue = Number(x.hue), t = Number(x.t);
    if (![nx,ny,hue,t].every(Number.isFinite)) return null;
    if (!normalized) { nx /= W; ny /= H; }
    return { x:clamp(nx,0,1), y:clamp(ny,0,1), hue:((hue%360)+360)%360, t:clamp(t,0,Date.now()+60000) };
  }
  function saveMemories() {
    try { localStorage.setItem(opts.storage, JSON.stringify(memories)); }
    catch (_e) { storageAvailable = false; }
    updateCount();
  }
  function loadMemories() {
    try {
      const raw = localStorage.getItem(opts.storage);
      if (raw !== null) {
        const arr = JSON.parse(raw); if (!Array.isArray(arr)) throw Error('기억 데이터 형식 오류');
        memories = arr.slice(-opts.maxMemories).map(v=>validatedMemory(v,true)).filter(Boolean);
      } else {
        // 구 버전은 절대 픽셀 위치였으므로 현재 화면 크기를 기준으로 대략적으로 옮깁니다.
        const oldRaw = localStorage.getItem('between-memories-v1');
        if (oldRaw) {
          const old = JSON.parse(oldRaw);
          if (Array.isArray(old)) memories = old.slice(-opts.maxMemories).map(v=>validatedMemory(v,false)).filter(Boolean);
          if (memories.length) saveMemories();
        }
      }
    } catch (_e) { storageAvailable = false; memories = []; }
    updateCount();
  }
  function updateCount() { $('memory-count').textContent = String(memories.length); }

  function newParticle() {
    const depth = rand(.55,1);
    return { x:rand(0,W), y:rand(0,H), vx:rand(-5,5),vy:rand(-5,5), size:rand(.3,1.25), a:rand(.13,.55), depth, seed:rand(0,TAU) };
  }
  function seedParticles() {
    const count = clamp(Math.round(W*H/2350), 210, W<700?380:710);
    particles = Array.from({length:count}, newParticle);
    stars = Array.from({length:Math.max(55,Math.floor(count*.42))}, ()=>({x:Math.random(),y:Math.random(),r:rand(.2,1.2),a:rand(.06,.38),t:rand(0,TAU)}));
  }
  function resize() {
    const oldW=W, oldH=H;
    W = Math.max(1,innerWidth); H = Math.max(1,innerHeight);
    dpr = Math.min(devicePixelRatio||1, W<700?1.4:1.65);
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (particles.length) particles.forEach(p=>{p.x=p.x/oldW*W;p.y=p.y/oldH*H;});
    if (oldW===1 && oldH===1) mouse.x=W/2,mouse.y=H/2;
    if (particles.length===0) seedParticles();
    else if (W<640 && particles.length>400) particles=particles.slice(0,380);
  }
  resize();
  loadMemories();

  class Tree {
    constructor(x,y,hue) {
      this.x=clamp(x/W,0,1); this.y=clamp(y/H,0,1); this.hue=hue;
      this.age=0; this.life=47; this.branches=[];
      const max= W<650 ? 6 : 7;
      const base=rand(26,40) * (W<650?.7:1);
      const grow=(x1,y1,angle,len,depth,delay)=>{
        if(depth<1 || len<2.2)return;
        const x2=x1+Math.cos(angle)*len, y2=y1+Math.sin(angle)*len;
        this.branches.push({x1,y1,x2,y2,depth,delay});
        const spread=rand(.33,.56),scale=rand(.67,.77);
        grow(x2,y2,angle-spread+rand(-.08,.08),len*scale,depth-1,delay+.23);
        grow(x2,y2,angle+spread+rand(-.08,.08),len*scale,depth-1,delay+.23);
      };
      grow(0,0,-Math.PI/2+rand(-.2,.2),base,max,0);
    }
    draw() {
      const fade=clamp((this.life-this.age)/7,0,1);
      if(fade<=0)return;
      const scale=clamp(Math.min(W,H)/650,.6,1.16);
      const cx=this.x*W, cy=this.y*H;
      ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.lineCap='round';
      for(const b of this.branches) {
        const progress=clamp((this.age - b.delay)/.9,0,1);
        if(progress<=0)continue;
        const p=1-(1-progress)**3;
        ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(lerp(b.x1,b.x2,p),lerp(b.y1,b.y2,p));
        ctx.strokeStyle=hsla(this.hue+(b.depth>3?5:29),72,b.depth>3?67:81,fade*(.5+.5*p));
        ctx.lineWidth=Math.max(.55,b.depth*.31);ctx.stroke();
        if(b.depth===1 && progress>=.98) {
          const twinkle=.7+.3*Math.sin(this.age*2+b.x2*.1);
          ctx.fillStyle=hsla(this.hue+25,89,82,fade*twinkle);
          ctx.beginPath();ctx.arc(b.x2,b.y2,1.3+twinkle,0,TAU);ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // Web Audio는 사용자 동작 후 생성되며, 드론과 차임 모두 동일한 master gain을 거칩니다.
  const sound = {
    context:null, gain:null, enabled:false, supported:!!(window.AudioContext||window.webkitAudioContext),
    async ensure() {
      if(!this.supported) { toast('이 브라우저는 오디오를 지원하지 않습니다.');return false; }
      if(!this.context) {
        try {
          this.context=new (window.AudioContext||window.webkitAudioContext)();
          this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);
          const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;
          filter.connect(this.gain);
          [55,82.41,110,164.81].forEach((freq,i)=>{
            const o=this.context.createOscillator(),g=this.context.createGain();
            o.type='sine';o.frequency.value=freq;g.gain.value=.24/(i+1);
            o.connect(g);g.connect(filter);o.start();
          });
        } catch (_e) { this.supported=false;toast('오디오를 시작할 수 없습니다.');return false; }
      }
      try { if(this.context.state==='suspended') await this.context.resume(); }
      catch (_e) {toast('브라우저에서 오디오 재생을 허용해주세요.');return false;}
      return true;
    },
    async toggle() {
      if(!this.enabled && !(await this.ensure()))return;
      this.enabled=!this.enabled;
      const now=this.context.currentTime;
      const g=this.gain.gain;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);
      g.linearRampToValueAtTime(this.enabled ? .23 : 0,now+.6);
      const btn=$('sound-toggle');btn.setAttribute('aria-pressed',String(this.enabled));
      btn.setAttribute('aria-label',this.enabled?'소리 끄기':'소리 켜기');btn.title=btn.getAttribute('aria-label');
      if(this.enabled)this.chime();
    },
    chime() {
      if(!this.enabled||!this.context||this.context.state!=='running')return;
      const freqs=[220,261.63,293.66,329.63,392,440,523.25,587.33]; // A/C/D/E/G 펜타토닉
      const base=freqs[Math.floor(Math.random()*freqs.length)];
      const now=this.context.currentTime;
      [1,2,3].forEach((mul,i)=>{
        const o=this.context.createOscillator(),g=this.context.createGain();
        o.type='sine';o.frequency.value=base*mul;
        const level=.2/(i+1);
        g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(level,now+.025);
        g.gain.exponentialRampToValueAtTime(.0001,now+2+i*.5);
        o.connect(g);g.connect(this.gain);o.start(now);o.stop(now+2.6+i*.5);
        o.onended=()=>{o.disconnect();g.disconnect();};
      });
    }
  };
  function create(x,y) {
    enter();
    x=clamp(x,6,W-6); y=clamp(y,12,H-12);
    const hue=(phaseData().hue+rand(-23,23)+360)%360;
    if(trees.length>=opts.maxTrees)trees.shift();
    trees.push(new Tree(x,y,hue));
    memories.push({x:x/W,y:y/H,hue,t:Date.now()});
    if(memories.length>opts.maxMemories)memories=memories.slice(-opts.maxMemories);
    saveMemories();sound.chime();nextWhisper();
    particles.forEach(p=>{
      const dx=p.x-x,dy=p.y-y,d2=dx*dx+dy*dy;
      if(d2>1 && d2<52000){const f=(1-Math.sqrt(d2)/228)*120/Math.sqrt(d2);p.vx+=dx*f;p.vy+=dy*f;}
    });
    $('cursor').classList.add('pulse');
    setTimeout(()=>$('cursor').classList.remove('pulse'),400);
  }

  // 전역 클릭 대신 캔버스의 pointerdown만 사용하여 모바일 mouse 이벤트 중복 생성을 방지.
  canvas.addEventListener('pointermove',(e)=>{
    if(e.pointerType==='touch'&&e.buttons===0)return;
    mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;mouse.isTouch=e.pointerType==='touch';
    if(e.pointerType!=='touch') {
      const cursor=$('cursor');cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';cursor.style.opacity='1';
      if(!entered)enter();
    }
  },{passive:true});
  canvas.addEventListener('pointerdown',(e)=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;mouse.isTouch=e.pointerType==='touch';
    create(e.clientX,e.clientY);
  });
  canvas.addEventListener('pointerup',(e)=>{if(e.pointerType==='touch')mouse.active=false;});
  canvas.addEventListener('pointercancel',()=>{mouse.active=false;});
  canvas.addEventListener('pointerleave',()=>{mouse.active=false;$('cursor').style.opacity='0';});
  $('enter-button').addEventListener('click',()=>{ enter();mouse.active=true;mouse.x=W/2;mouse.y=H*.53; });
  window.addEventListener('blur',()=>{ mouse.active=false; $('cursor').style.opacity='0'; });

  let wheelTimer=0;
  addEventListener('wheel',(e)=>{
    if(!$('help-panel').hidden)return;
    clock.phase=((clock.phase+e.deltaY*.00032)%1+1)%1;
    clock.wheelUntil=performance.now()+5000;
    clearTimeout(wheelTimer);
    updateUI();
  },{passive:true});
  const slider=$('time-slider');
  slider.addEventListener('input',()=>{
    clock.phase=Number(slider.value)/1000;clock.wheelUntil=performance.now()+8000;
    updateUI();enter();
  });
  slider.addEventListener('pointerdown',()=>{clock.dragging=true;});
  addEventListener('pointerup',()=>{clock.dragging=false;});
  $('play-toggle').addEventListener('click',()=>{
    clock.paused=!clock.paused;
    const b=$('play-toggle');b.setAttribute('aria-pressed',String(clock.paused));
    b.querySelector('span').textContent=clock.paused?'▷':'Ⅱ';
    { const label=clock.paused?'시간 흐름 재개':'시간 흐름 멈추기'; b.title=label; b.setAttribute('aria-label',label); }
    toast(clock.paused?'시간이 멈췄습니다.':'시간이 다시 흐릅니다.');
  });
  $('sound-toggle').addEventListener('click',()=>{void sound.toggle();});
  function updateMotion() {
    const b=$('motion-toggle');b.setAttribute('aria-pressed',String(motion.reduced));
    { const label=motion.reduced?'움직임 늘리기':'움직임 줄이기'; b.title=label; b.setAttribute('aria-label',label); }
    document.body.classList.toggle('reduced-motion',motion.reduced);
  }
  $('motion-toggle').addEventListener('click',()=>{
    motion.reduced=!motion.reduced;updateMotion();toast(motion.reduced?'움직임을 줄였습니다.':'움직임을 다시 늘렸습니다.');
  });
  if(reducePref.addEventListener)reducePref.addEventListener('change',e=>{motion.reduced=e.matches;updateMotion();});
  updateMotion();
  $('clear-button').addEventListener('click',()=>{
    if(!memories.length){toast('삭제할 기억의 별이 없습니다.');return;}
    if(!confirm(`이 브라우저에 저장된 기억의 별 ${memories.length}개를 지울까요?`))return;
    memories=[];saveMemories();
    // 구 버전 자동 재가져오기를 막기 위해 v2에 빈 배열을 기록합니다.
    toast('이 브라우저의 기억을 비웠습니다.');
  });
  const help=$('help-panel');
  function setHelp(open) {
    help.hidden=!open;$('help-button').setAttribute('aria-expanded',String(open));
    if(open)$('help-close').focus();else $('help-button').focus();
  }
  $('help-button').addEventListener('click',()=>setHelp(help.hidden));
  $('help-close').addEventListener('click',()=>setHelp(false));
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'&&!help.hidden){setHelp(false);return;}
    if(!help.hidden||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(document.activeElement?.tagName||''))return;
    const key=e.key.toLowerCase();
    if(e.code==='Space'){e.preventDefault();create(W/2,H*.58);}
    else if(key==='arrowleft'||key==='arrowright'){e.preventDefault();clock.phase=(clock.phase+(key==='arrowright'?.02:-.02)+1)%1;clock.wheelUntil=performance.now()+6000;updateUI();}
    else if(key==='m'){void sound.toggle();}
    else if(key==='p'){$('play-toggle').click();}
  });

  // 파일 저장은 클릭 시점의 Canvas 픽셀과 제목만 합성; 서버로 보내지 않습니다.
  $('capture-button').addEventListener('click',()=>{
    try {
      const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;
      const g=out.getContext('2d');g.drawImage(canvas,0,0);
      const sc=dpr;
      g.fillStyle='rgba(5,8,18,.55)';g.fillRect(0,out.height-96*sc,out.width,96*sc);
      g.fillStyle='#f3e8d3';g.textBaseline='middle';g.font=`${Math.round(26*sc)}px Georgia, serif`;
      g.fillText('사이 · BETWEEN',32*sc,out.height-54*sc);
      g.font=`${Math.round(12*sc)}px Arial, sans-serif`;g.fillStyle='#c5cde2';
      g.fillText(`기억의 별 ${memories.length}개 · ${phaseData().name}`,32*sc,out.height-22*sc);
      const download=(blob)=>{
        if(!blob){toast('이미지를 저장할 수 없습니다.');return;}
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='BETWEEN_나의_우주.png';document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);toast('이 순간의 우주를 PNG로 저장했습니다.');
      };
      out.toBlob(download,'image/png');
    }catch(_e){toast('이미지 저장을 지원하지 않는 브라우저입니다.');}
  });

  function updateUI() {
    const pd=phaseData();
    $('phase-name').textContent=pd.name;
    $('day-caption').textContent=pd.caption;
    const secs=Math.floor((clock.phase%1)*opts.cycle);
    $('time-value').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
    slider.setAttribute('aria-valuetext',pd.name+' · '+$('time-value').textContent);
    if(!clock.dragging)slider.value=Math.round(clock.phase*1000);
  }
  updateUI();

  // 캔버스 렌더링은 단일 애니메이션 루프에서 수행하고, 비활성 탭에서는 중단합니다.
  function renderSky(pd, t) {
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,rgb(pd.top));grad.addColorStop(1,rgb(pd.bottom));
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // 호흡하는 성운 (외부 이미지 없이 모든 픽셀 생성)
    for(let i=0;i<3;i++) {
      const x=W*(.23+i*.3)+Math.sin(t*.04+i*3)*W*.07;
      const y=H*(.36+i*.09)+Math.cos(t*.03+i)*H*.05;
      const r=Math.max(W,H)*(.32+i*.035);
      const glow=ctx.createRadialGradient(x,y,10,x,y,r);
      const base=(motion.reduced?.065:.11)*(i===1?1.2:1);
      glow.addColorStop(0,hsla(pd.hue+(i-1)*24,85,76,base));
      glow.addColorStop(.44,hsla(pd.hue+(i-1)*24,77,51,base*.55));
      glow.addColorStop(1,hsla(pd.hue,60,30,0));
      ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // 연속적 시간의 상징인 행성/빛의 원
    const a=clock.phase*TAU-1.65;
    const cx=W*.5+Math.cos(a)*Math.min(W*.26,210);
    const cy=H*.51+Math.sin(a)*Math.min(H*.24,155);
    const orbit=ctx.createRadialGradient(cx,cy,1,cx,cy,W<700?86:135);
    orbit.addColorStop(0,hsla(pd.hue+8,78,87,.17));orbit.addColorStop(1,hsla(pd.hue+8,78,67,0));
    ctx.fillStyle=orbit;ctx.fillRect(cx-145,cy-145,290,290);
    ctx.beginPath();ctx.arc(cx,cy,2.5,0,TAU);ctx.fillStyle=hsla(pd.hue+10,70,87,.85);ctx.fill();
    // 멀리 있는 항성
    for(const s of stars) {
      const tw=motion.reduced?.75:.7+.3*Math.sin(t*.6+s.t);
      ctx.fillStyle=`rgba(232,237,255,${(s.a*tw).toFixed(3)})`;
      ctx.fillRect(s.x*W,s.y*H,s.r,s.r);
    }
  }
  function renderMemories(t) {
    for(const m of memories) {
      const x=m.x*W,y=m.y*H;
      const p=motion.reduced?1:(.76+.24*Math.sin(t*1.5+x*.018));
      const halo=ctx.createRadialGradient(x,y,0,x,y,18);
      halo.addColorStop(0,hsla(m.hue,82,89,.5*p));
      halo.addColorStop(1,hsla(m.hue,82,75,0));
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,18,0,TAU);ctx.fill();
      ctx.strokeStyle=hsla(m.hue,75,87,.53*p);ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,1.6,0,TAU);ctx.fillStyle=hsla(m.hue,85,90,.93);ctx.fill();
    }
  }
  function updateAndDrawParticles(pd, dt, t) {
    ctx.globalCompositeOperation='lighter';
    const reduced=motion.reduced;
    for(const p of particles) {
      if(!reduced) {
        const ang=Math.sin(p.x*.005+t*.08+p.seed)*3+Math.cos(p.y*.004-t*.065);
        p.vx+=Math.cos(ang)*10*dt;
        p.vy+=Math.sin(ang)*10*dt;
        if(mouse.active){
          const dx=p.x-mouse.x,dy=p.y-mouse.y,d2=dx*dx+dy*dy;
          if(d2<44000&&d2>9) { const d=Math.sqrt(d2),acc=(1-d/210)*170*dt/d;p.vx+=dx*acc;p.vy+=dy*acc; }
        }
        const damping=Math.exp(-.65*dt);p.vx*=damping;p.vy*=damping;
        const velocity=Math.hypot(p.vx,p.vy);
        if(velocity>66){p.vx=p.vx/velocity*66;p.vy=p.vy/velocity*66;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.x<0)p.x+=W;if(p.x>=W)p.x-=W;
        if(p.y<0)p.y+=H;if(p.y>=H)p.y-=H;
      }
      const alpha=p.a*(reduced?1:(.77+.23*Math.sin(t*.8+p.seed)));
      ctx.fillStyle=hsla(pd.hue+p.seed*6,70,83,alpha);
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.depth*(W<600?1.1:1.5),0,TAU);ctx.fill();
    }
    if(mouse.active) {
      const near=[];
      for(const p of particles){
        const dx=p.x-mouse.x,dy=p.y-mouse.y;
        if(dx*dx+dy*dy<200*200)near.push(p);
      }
      // 격자 분할: 주변 셀 9개만 탐색하여 큰 화면의 불필요한 전체 쌍 비교 제거.
      const cell=82,grid=new Map();
      for(const p of near){const ix=Math.floor(p.x/cell),iy=Math.floor(p.y/cell),k=ix+','+iy; if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);}
      ctx.lineWidth=.7;
      for(const p of near){
        const ix=Math.floor(p.x/cell),iy=Math.floor(p.y/cell);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
          const list=grid.get((ix+ox)+','+(iy+oy));if(!list)continue;
          for(const q of list){if(q===p||q._i<=p._i)continue;
            const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy;
            if(d2>=82*82)continue;
            const dist=Math.sqrt(d2);
            ctx.strokeStyle=hsla(pd.hue,80,89,(1-dist/82)*.26);
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }
      const glow=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,190);
      glow.addColorStop(0,hsla(pd.hue,82,87,.07));glow.addColorStop(1,hsla(pd.hue,82,87,0));
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(mouse.x,mouse.y,190,0,TAU);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  function render(now) {
    frameId=0;
    const fps=motion.reduced?12:(W<700?36:48);
    if(now-lastDraw<1000/fps){frameId=requestAnimationFrame(render);return;}
    const dt=clamp((now-lastFrame)/1000,0,.07);lastFrame=now;lastDraw=now;
    clock.seconds+=dt;
    if(!clock.paused&&!clock.dragging&&now>clock.wheelUntil){clock.phase=(clock.phase+dt/opts.cycle)%1;}
    const pd=phaseData();
    renderSky(pd,clock.seconds);
    renderMemories(clock.seconds);
    particles.forEach((p,i)=>{p._i=i;});
    updateAndDrawParticles(pd,dt,clock.seconds);
    trees=trees.filter(tree=>tree.age<tree.life);
    for(const tree of trees) {
      tree.age+=dt;
      tree.draw();
    }
    if(now-uiLast>250){updateUI();uiLast=now;}
    frameId=requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(frameId){cancelAnimationFrame(frameId);frameId=0;} if(sound.context&&sound.context.state==='running')sound.context.suspend().catch(()=>{});}
    else {lastFrame=performance.now();lastDraw=0;if(!frameId)frameId=requestAnimationFrame(render);if(sound.enabled&&sound.context)sound.context.resume().catch(()=>{});}
  });
  addEventListener('resize',()=>{ resize(); lastDraw=0; },{passive:true});
  // 모바일 제스처가 빠졌을 때도 이용 가능하도록 진입 버튼을 유지하고, 10초 자동 진행 제공.
  setTimeout(()=>{if(!entered)enter();},10000);
  frameId=requestAnimationFrame(render);
  // 테스트/디버그를 위한 읽기 전용 페이지 진단값 (브라우저에서만 사용).
  Object.defineProperty(window,'__BETWEEN_DIAGNOSTICS',{configurable:false,get:()=>Object.freeze({
    memories:memories.length,trees:trees.length,particles:particles.length,phase:clock.phase,
    paused:clock.paused,soundOn:sound.enabled,motionReduced:motion.reduced,storageAvailable
  })});
})();
