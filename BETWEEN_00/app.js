/* BETWEEN — 시간의 정원. Local, zero-dependency, GitHub Pages compatible. */
'use strict';
const $ = id => document.getElementById(id);
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIMITS = {seeds:120, visits:200, answers:100, backupBytes:450000};
const MILESTONES = [
  {time:0, label:'씨앗'},
  {time:20, label:'새싹'},
  {time:300, label:'어린 빛'},
  {time:3600, label:'자라는 빛'},
  {time:21600, label:'꽃'},
  {time:259200, label:'고요한 빛'},
  {time:604800, label:'오래된 별'}
];
const nowMs = () => Date.now();
function stageFor(seed, now=nowMs()) {
  const age = Math.max(0, (now-seed.plantedAt)/1000);
  for(let i=MILESTONES.length-1;i>=0;i--) if(age>=MILESTONES[i].time) return i;
  return 0;
}
function prettyDuration(ms){
  let sec=Math.max(0,Math.floor(ms/1000));
  if(sec<60) return sec+'초';
  if(sec<3600) return Math.floor(sec/60)+'분 '+sec%60+'초';
  if(sec<86400) return Math.floor(sec/3600)+'시간 '+Math.floor(sec%3600/60)+'분';
  return Math.floor(sec/86400)+'일 '+Math.floor(sec%86400/3600)+'시간';
}
const Store = {
 KEY:'sai_garden_v1', operational:true, readOnly:false,
 fresh(){return {version:2,firstVisit:nowMs(),lastVisit:null,visits:[],seeds:[],answers:[]};},
 normalize(raw){
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.seeds)) throw Error('기록 구조가 올바르지 않습니다.');
   const validDate=(t)=>Number.isFinite(Number(t))&&Number(t)>946684800000&&Number(t)<nowMs()+300000;
   const seedList=raw.seeds;
   if(seedList.length>LIMITS.seeds) throw Error(`씨앗이 ${LIMITS.seeds}개를 초과합니다. 기록을 먼저 백업하세요.`);
   const seeds=[];
   for(const [i,s] of seedList.entries()){
     if(!s||typeof s!=='object'||!validDate(s.plantedAt)) continue;
     const u=Number.isFinite(Number(s.u))?Number(s.u):(Number(s.x)/Math.max(1,window.innerWidth));
     const v=Number.isFinite(Number(s.v))?Number(s.v):(Number(s.y)/Math.max(1,window.innerHeight));
     if(!Number.isFinite(u)||!Number.isFinite(v)) continue;
     const hue=clamp(Number(s.hue)||35,0,360);
     const size=clamp(Number(s.size)||2.3,1.3,5);
     const tendrils=Array.isArray(s.tendrils)?s.tendrils.slice(0,9).filter(t=>t&&Number.isFinite(t.angle)&&Number.isFinite(t.length)&&Number.isFinite(t.phase)&&Number.isFinite(t.speed)).map(t=>({angle:t.angle,length:clamp(t.length,.1,2),phase:t.phase,speed:clamp(t.speed,.0001,.01)})):[];
     while(tendrils.length<6){const k=tendrils.length;tendrils.push({angle:k*Math.PI/3,length:.8,phase:k,speed:.0006});}
     const seed={id:String(s.id||'legacy_'+i).slice(0,65),u:clamp(u,0,1),v:clamp(v,0,1),plantedAt:Number(s.plantedAt),hue,size,lastStage:clamp(Math.floor(Number(s.lastStage)||0),0,6),tendrils};
     seed.x=seed.u*innerWidth;seed.y=seed.v*innerHeight;
     seeds.push(seed);
   }
   const visits=(Array.isArray(raw.visits)?raw.visits:[]).filter(validDate).map(Number).slice(-LIMITS.visits);
   const answers=(Array.isArray(raw.answers)?raw.answers:[]).filter(a=>a&&validDate(a.t)&&typeof a.q==='string'&&typeof a.a==='string').slice(-LIMITS.answers).map(a=>({t:Number(a.t),q:a.q.slice(0,120),a:a.a.slice(0,120)}));
   return {version:2,firstVisit:validDate(raw.firstVisit)?Number(raw.firstVisit):nowMs(),lastVisit:validDate(raw.lastVisit)?Number(raw.lastVisit):null,visits,seeds,answers};
 },
 load(){try{const raw=localStorage.getItem(this.KEY);if(!raw)return this.fresh();return this.normalize(JSON.parse(raw));}catch(e){this.operational=false;this.readOnly=true;this.readIssue=e.message||'저장 기록을 읽을 수 없습니다.';return this.fresh();}},
 save(data){if(this.readOnly)return false;try{localStorage.setItem(this.KEY,JSON.stringify(data));this.operational=true;return true;}catch(e){this.operational=false;return false;}},
 clear(){try{localStorage.removeItem(this.KEY);this.readOnly=false;return true;}catch{return false;}}
};
class AmbientAudio {
 constructor(){this.ctx=null;this.master=null;this.enabled=false;this.chimeTimer=null;this.busy=false;}
 async init(){
   if(this.ctx)return true;
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return false;
   try {
     this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
     [55,82.41,110,164.81].forEach((f,i)=>{const osc=this.ctx.createOscillator();const gain=this.ctx.createGain();osc.type='sine';osc.frequency.value=f;gain.gain.value=.045/(i+1);osc.connect(gain).connect(this.master);osc.start();});
     return true;
   } catch {this.ctx=null;return false;}
 }
 note(freq=523,duration=2,volume=.09){
   if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
   const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
   o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.1);
 }
 plink(){this.note(392+[0,98,131,196,262][Math.floor(Math.random()*5)],1.3,.14);}
 bloom(){[392,493.88,587.33].forEach((f,i)=>setTimeout(()=>this.note(f,2.4,.09),i*120));}
 scheduleChime(){clearTimeout(this.chimeTimer);if(!this.enabled)return;this.chimeTimer=setTimeout(()=>{if(!document.hidden)this.note([440,523.25,587.33,659.25,783.99][Math.floor(Math.random()*5)],3,.055);this.scheduleChime();},8000+Math.random()*12000);}
 async toggle(){if(this.busy)return this.enabled;this.busy=true;try{
   if(!this.enabled){if(!await this.init())return false;await this.ctx.resume();this.enabled=true;this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(.46,this.ctx.currentTime,.7);this.scheduleChime();}
   else {this.enabled=false;clearTimeout(this.chimeTimer);this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.35);}
   return this.enabled;
 }catch{return this.enabled;}finally{this.busy=false;}}
 pauseOnHidden(){if(!this.ctx||!this.enabled)return;if(document.hidden){clearTimeout(this.chimeTimer);this.ctx.suspend().catch(()=>{});}else{this.ctx.resume().then(()=>this.scheduleChime()).catch(()=>{});}}
}

const Poems = {
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  firstVisit() {
    return `당신은 처음 이곳에 왔습니다.\n\n빈 공간은\n아직 쓰이지 않은 마음입니다.\n\n빛을 하나 심어보세요.`;
  },
  returningShort() {
    return this.pick([
      `다시 오셨네요.\n\n이곳은 당신을\n기억하고 있었습니다.`,
      `잠시 다녀가셨네요.\n\n빛은 조금 더\n자라 있었습니다.`,
      `돌아오는 길은\n언제나 짧습니다.\n\n여기는 그대로입니다.`,
    ]);
  },
  returningHours(h) {
    return this.pick([
      `${h}시간이 흘렀습니다.\n\n당신이 없는 동안\n빛들은 서로를\n알아가고 있었습니다.`,
      `${h}시간 동안의\n침묵은\n낭비가 아니었습니다.\n\n무언가는 자랐습니다.`,
      `당신이 없는 사이\n${h}번의 숨이\n이곳을 지나갔습니다.`,
    ]);
  },
  returningDays(d) {
    return this.pick([
      `${d}일이 흘렀습니다.\n\n계절은 바뀌지 않았지만\n빛은 자랐습니다.\n\n당신도 그랬기를.`,
      `${d}일 만이네요.\n\n이 정원은\n당신이 없는 시간을\n버티지 않고, 살았습니다.`,
      `긴 시간이었습니다.\n${d}일.\n\n여기의 빛은\n더 깊어졌습니다.`,
    ]);
  },
  idle() {
    return this.pick([
      `빛은 기억하지 않습니다.\n그저 빛날 뿐입니다.`,
      `시간은 흐르지 않습니다.\n우리가 흐릅니다.`,
      `당신이 보는 것은\n당신이 만든 것입니다.`,
      `빈 공간이\n빛을 담습니다.`,
      `느리게 가는 것은\n때로 가장 빠른 길입니다.`,
      `당신이 잊어도\n이곳은 기억합니다.`,
      `숨을 쉬세요.\n이곳의 시간은\n당신의 것입니다.`,
      `고요함은\n비어있음이 아닙니다.`,
      `당신의 마음도\n하나의 정원입니다.`,
      `지금 이 순간이\n당신이 가진 전부입니다.`,
    ]);
  },
};

// ============================================
// Prompts
// ============================================
const Prompts = {
  list: [
    { q: "지금, 당신의 마음은 어디에 있나요?", choices: ["과거에", "지금 여기에", "미래에", "어디에도 없이"] },
    { q: "당신이 놓치고 있는 것은 무엇인가요?", choices: ["숨소리", "햇살", "누군가의 눈빛", "아무것도 놓치지 않았다"] },
    { q: "당신은 지금 어떤 빛인가요?", choices: ["따뜻한 등불", "푸른 새벽", "흐릿한 달빛", "아직 꺼지지 않은 불꽃"] },
    { q: "당신이 오늘 붙잡고 있는 것은?", choices: ["기억", "기대", "두려움", "아무것도 붙잡지 않았다"] },
    { q: "당신에게 시간은 무엇인가요?", choices: ["흐르는 강", "쌓이는 돌", "숨쉬는 공기", "아직 모르겠다"] },
    { q: "누군가를 기다린 적 있나요?", choices: ["오래, 자주", "가끔", "지금도", "기다림을 그만두었다"] },
    { q: "당신은 무엇으로 만들어졌나요?", choices: ["빛과 그림자", "기억과 망각", "숨과 침묵", "아직 만들어지는 중"] },
  ],
  acknowledgments: [
    `고맙습니다.\n\n당신의 대답은\n작은 빛이 되었습니다.`,
    `당신의 마음이\n이곳에 머물렀습니다.\n\n그것으로 충분합니다.`,
    `대답은\n정답이 아닙니다.\n\n그저 한 번의\n숨입니다.`,
    `당신이 무엇을 말하든\n이곳은 당신을\n받아들입니다.`,
  ],
  pick() { return this.list[Math.floor(Math.random() * this.list.length)]; },
  acknowledge() { return this.acknowledgments[Math.floor(Math.random() * this.acknowledgments.length)]; },
};


class Garden {
  constructor(canvas, state, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.seeds = state.seeds;
    this.onBloom = callbacks.onBloom || (() => {});
    this.onPlant = callbacks.onPlant || (() => {});

    this.particles = [];
    this.bursts = [];
    this.time = 0;
    this.presence = { x: 0, y: 0, alpha: this.seeds.length > 0 ? 0 : 1 };

    this.mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000 };
    this.cursorActive = false;

    this.resize();
    this._initParticles();
    this._bindEvents();

    this._loop = this._loop.bind(this);
    this.lastFrame = 0;
    requestAnimationFrame(this._loop);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.presence.x = this.w / 2;
    this.presence.y = this.h / 2;
    for (const seed of this.seeds) {
      seed.x = seed.u * this.w;
      seed.y = seed.v * this.h;
    }
    this._initParticles();
  }

  _initParticles() {
    this.particles = [];
    const count = Math.min(135, Math.max(30, Math.floor((this.w * this.h) / 15000)));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.5 + Math.random() * 1.2,
        hue: 30 + Math.random() * 30,
        sat: 50 + Math.random() * 30,
        light: 60 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
    const setMouse = (x, y) => {
      this.mouse.tx = x;
      this.mouse.ty = y;
      if (!this.cursorActive) {
        this.mouse.x = x;
        this.mouse.y = y;
        this.cursorActive = true;
      }
    };
    window.addEventListener('pointermove', e => setMouse(e.clientX, e.clientY), {passive:true});
    window.addEventListener('pointerleave', () => {this.cursorActive = false;});
  }

  plant(x, y) {
    const seed = {
      id: 'seed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      plantedAt: Date.now(),
      hue: 25 + Math.random() * 35,
      size: 1.8 + Math.random() * 1.5,
      lastStage: 0,
      tendrils: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({
        angle: Math.random() * Math.PI * 2,
        length: 0.6 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.001,
      })),
    };
    if (this.seeds.length >= LIMITS.seeds) return null;
    seed.u = clamp(x / Math.max(1, this.w), 0, 1);
    seed.v = clamp(y / Math.max(1, this.h), 0, 1);
    seed.x = seed.u * this.w;
    seed.y = seed.v * this.h;
    this.seeds.push(seed);
    this.state.seeds = this.seeds;
    Store.save(this.state);
    this._burst(seed.x, seed.y, seed.hue, 12, 0.5);
    this.onPlant(seed);
    return seed;
  }

  _burst(x, y, hue, count, power) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random()) * power;
      this.bursts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.005 + Math.random() * 0.01,
        hue,
        r: 0.8 + Math.random() * 1.5,
      });
    }
  }

  stageOf(seed) {
    return stageFor(seed);
  }

  _loop(now) {
    if (this.lastFrame && now - this.lastFrame < (reducedMotion ? 100 : 28)) {
      requestAnimationFrame(this._loop);
      return;
    }
    this.lastFrame = now;
    if (document.hidden) { requestAnimationFrame(this._loop); return; }
    this.time = reducedMotion ? 0 : now;
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.08;

    let needsSave = false;
    for (const seed of this.seeds) {
      const stage = this.stageOf(seed);
      if (seed.lastStage === undefined) {
        seed.lastStage = stage;
      } else if (stage > seed.lastStage) {
        if (this.bursts.length < 200) this._burst(seed.x, seed.y, seed.hue, 20, 0.8);
        this.onBloom(seed, stage);
        seed.lastStage = stage;
        needsSave = true;
      }
    }
    if (needsSave) Store.save(this.state);

    this._draw();
    requestAnimationFrame(this._loop);
  }

  _draw() {
    const { ctx, w, h } = this;
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.9);
    bg.addColorStop(0, '#0a0e1c');
    bg.addColorStop(0.5, '#050810');
    bg.addColorStop(1, '#020308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const breath = 0.88 + 0.12 * Math.sin(this.time / 4000);

    if (this.presence.alpha > 0) {
      const p = this.presence;
      const pulse = 0.7 + 0.3 * Math.sin(this.time / 2000);
      const r = 40 * pulse;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      glow.addColorStop(0, `rgba(255, 220, 180, ${0.35 * p.alpha})`);
      glow.addColorStop(0.5, `rgba(255, 200, 140, ${0.1 * p.alpha})`);
      glow.addColorStop(1, 'rgba(255, 200, 140, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
      ctx.fill();

      const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 0.5);
      core.addColorStop(0, `rgba(255, 240, 220, ${p.alpha})`);
      core.addColorStop(1, `rgba(255, 200, 140, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      if (this.seeds.length > 0) {
        p.alpha = Math.max(0, p.alpha - 0.02);
      }
      // Cursor pull
      if (this.cursorActive) {
        p.x += (this.mouse.x - p.x) * 0.0008;
        p.y += (this.mouse.y - p.y) * 0.0008;
      }
    }

    this._drawConnections(breath);
    for (const seed of this.seeds) this._drawSeed(seed, breath);
    this._drawBursts();
    this._drawParticles(breath);
    if (this.cursorActive) this._drawCursor();
  }

  _drawConnections(breath) {
    const { ctx } = this;
    const seeds = this.seeds;
    ctx.save();
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const a = seeds[i], b = seeds[j];
        const sA = this.stageOf(a), sB = this.stageOf(b);
        if (sA < 2 || sB < 2) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 260) continue;
        const alpha = (1 - dist / 260) * 0.12 * Math.min(1, (sA + sB) / 8) * breath;
        const mx = (a.x + b.x) / 2 + Math.sin(this.time / 3000 + i + j) * 12;
        const my = (a.y + b.y) / 2 + Math.cos(this.time / 3000 + i + j) * 12;
        ctx.strokeStyle = `hsla(35, 80%, 70%, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawSeed(seed, breath) {
    const { ctx } = this;
    const stage = this.stageOf(seed);
    const pulse = 0.85 + 0.15 * Math.sin(this.time / 900 + seed.plantedAt * 0.001);
    const baseR = seed.size * (1 + stage * 0.4) * pulse * breath;
    const hueDrift = Math.sin((Date.now() - seed.plantedAt) / 86400000) * 12;
    const hue = seed.hue + hueDrift;
    const sat = 70 + stage * 3;
    const light = 65 + stage * 2;

    const glowR = baseR * (6 + stage * 2);
    const glow = ctx.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, glowR);
    glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${0.5 - stage * 0.04})`);
    glow.addColorStop(0.3, `hsla(${hue}, ${sat}%, ${light - 15}%, 0.15)`);
    glow.addColorStop(1, `hsla(${hue}, ${sat}%, 30%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(seed.x, seed.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    if (stage >= 1) {
      const tendrilCount = Math.min(seed.tendrils.length, 3 + stage * 2);
      for (let k = 0; k < tendrilCount; k++) {
        const t = seed.tendrils[k % seed.tendrils.length];
        const wobble = Math.sin(this.time * t.speed + t.phase) * 0.3;
        const angle = t.angle + wobble;
        const len = baseR * (2 + stage * 1.2) * t.length;
        const ex = seed.x + Math.cos(angle) * len;
        const ey = seed.y + Math.sin(angle) * len;
        const mx = seed.x + Math.cos(angle + 0.2) * len * 0.5;
        const my = seed.y + Math.sin(angle + 0.2) * len * 0.5;
        const grad = ctx.createLinearGradient(seed.x, seed.y, ex, ey);
        grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 0.5)`);
        grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(seed.x, seed.y);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
      }
    }

    const core = ctx.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, baseR);
    core.addColorStop(0, `hsla(${hue}, 100%, 96%, 1)`);
    core.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${light}%, 0.9)`);
    core.addColorStop(1, `hsla(${hue}, ${sat}%, ${light - 20}%, 0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(seed.x, seed.y, baseR, 0, Math.PI * 2);
    ctx.fill();

    if (stage >= 4) {
      const petals = 6 + (stage - 4) * 3;
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2 + this.time / 8000;
        const pr = baseR * (3 + Math.sin(this.time / 1200 + k * 0.7) * 0.4);
        const px = seed.x + Math.cos(a) * pr;
        const py = seed.y + Math.sin(a) * pr;
        const petalR = 1.2 + stage * 0.3;
        const pAlpha = 0.25 + 0.15 * Math.sin(this.time / 1000 + k);
        ctx.fillStyle = `hsla(${hue + 8}, 90%, 78%, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, petalR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (stage >= 5) {
      const ringR = baseR * 8;
      ctx.strokeStyle = `hsla(${hue}, 60%, 70%, 0.08)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawBursts() {
    const { ctx } = this;
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.96;
      b.vy *= 0.96;
      b.life -= b.decay;
      if (b.life <= 0) { this.bursts.splice(i, 1); continue; }
      ctx.fillStyle = `hsla(${b.hue}, 90%, 75%, ${b.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * b.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawParticles(breath) {
    const { ctx, w, h, mouse } = this;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (this.cursorActive) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 30000) {
          const force = 0.02 * (1 - Math.sqrt(d2) / 173);
          p.vx += dx * force * 0.02;
          p.vy += dy * force * 0.02;
        }
      }
      p.vx *= 0.99;
      p.vy *= 0.99;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
      const alpha = (0.25 + 0.35 * Math.sin(this.time / 1500 + p.phase)) * breath;
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCursor() {
    const { ctx, mouse } = this;
    const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
    glow.addColorStop(0, 'rgba(255, 220, 180, 0.1)');
    glow.addColorStop(0.5, 'rgba(255, 200, 150, 0.03)');
    glow.addColorStop(1, 'rgba(255, 200, 150, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
    ctx.fill();
  }
}


class App {
 constructor(){
   this.state=Store.load();this.audio=new AmbientAudio();this.canvas=$('garden');this.garden=null;this.entered=false;
   this.promptTimer=null;this.promptDeadline=null;this.poemTimer=null;this.poemFadeTimer=null;this.toastTimer=null;this.idleTimer=null;this.promptRound=0;this.modalReturn=null;
   if(this.state.visits.length){document.querySelector('.lede').textContent='다시 오셨네요. 기다리고 있었습니다.';$('enter-btn').firstChild.textContent='정원으로 돌아가기 ';}
   for(const m of MILESTONES){const row=document.createElement('div');row.className='timeline-item';const t=document.createElement('span');const desc=document.createElement('span');t.textContent=m.time===0?'처음':prettyDuration(m.time*1000)+' 후';desc.textContent=m.label;row.append(t,desc);$('about-timeline').append(row);}
   this.bind();this.setOverlay('about',false);this.setOverlay('records',false);$('hud').inert=true;
 }
 bind(){
   $('enter-btn').addEventListener('click',()=>this.enter());
   $('about-btn').addEventListener('click',()=>this.setOverlay('about',true));
   $('records-btn').addEventListener('click',()=>this.setOverlay('records',true));
   $('close-about').addEventListener('click',()=>this.setOverlay('about',false));
   $('about-garden-btn').addEventListener('click',()=>this.setOverlay('about',false));
   $('close-records').addEventListener('click',()=>this.setOverlay('records',false));
   $('sound-btn').addEventListener('click',()=>this.toggleAudio());
   $('snapshot-btn').addEventListener('click',()=>this.saveImage());
   $('export-btn').addEventListener('click',()=>this.exportData());
   $('import-btn').addEventListener('click',()=>$('import-file').click());
   $('import-file').addEventListener('change',e=>this.importData(e));
   $('reset-btn').addEventListener('click',()=>this.resetData());
   $('prompt-skip').addEventListener('click',()=>this.closePrompt(true));
   this.canvas.addEventListener('pointerdown',e=>{if(!this.entered||!e.isPrimary||e.button!==0)return;this.plant(e.clientX,e.clientY);});
   this.canvas.addEventListener('keydown',e=>{if(!this.entered)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();this.plant(innerWidth*.5,innerHeight*.53);}});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){for(const id of ['about','records'])if(!$(id).classList.contains('hidden')){this.setOverlay(id,false);break;}if(!$('prompt').classList.contains('hidden'))this.closePrompt(true);}if(e.key==='Tab')this.trapFocus(e);});
   for(const id of ['about','records']) $(id).addEventListener('pointerdown',e=>{if(e.target===$(id))this.setOverlay(id,false);});
   document.addEventListener('visibilitychange',()=>this.onVisibility());
   window.addEventListener('pagehide',()=>this.onExit());
 }
 trapFocus(e){
   const open=['about','records'].find(id=>!$(id).classList.contains('hidden'));
   if(!open)return;const root=$(open);const all=[...root.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(el=>el.offsetParent!==null);
   if(!all.length)return;const first=all[0],last=all[all.length-1];
   if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
 }
 setOverlay(id,open){
   const el=$(id);if(!el)return;
   if(open){
     const other=id==='about'?'records':'about';if(!$(other).classList.contains('hidden'))this.setOverlay(other,false);
     this.modalReturn=document.activeElement;el.classList.remove('hidden');el.setAttribute('aria-hidden','false');el.inert=false;el.querySelector('.close-btn').focus();
     if(id==='records')this.updateRecords();
     this.closePrompt(false);
   }else{
     if(el.classList.contains('hidden')){el.inert=true;el.setAttribute('aria-hidden','true');return;}
     el.classList.add('hidden');el.setAttribute('aria-hidden','true');el.inert=true;
     if(this.modalReturn&&this.modalReturn.isConnected)this.modalReturn.focus();
     this.modalReturn=null;
   }
 }
 enter(){
   if(this.entered)return;
   this.entered=true;const at=nowMs();const was=this.state.lastVisit;const away=was&&was<=at?at-was:null;
   let grown=0;
   for(const s of this.state.seeds){const current=stageFor(s,at);if(current>s.lastStage)grown++;s.lastStage=current;}
   this.state.visits.push(at);this.state.visits=this.state.visits.slice(-LIMITS.visits);this.state.lastVisit=at;Store.save(this.state);
   $('intro').classList.add('hidden');$('intro').setAttribute('aria-hidden','true');$('intro').inert=true;
   $('hud').classList.remove('hidden');$('hud').removeAttribute('aria-hidden');$('hud').inert=false;
   this.garden=new Garden(this.canvas,this.state,{onBloom:(s,stage)=>this.onBloom(s,stage),onPlant:()=>this.onPlant()});
   this.canvas.focus({preventScroll:true});this.updateMeta();
   const count=this.state.visits.length;
   $('visit-info').textContent=(away!==null?`돌아오셨네요 · ${prettyDuration(away)} 만의 방문`:'처음 만나 반갑습니다')+` · 이 브라우저의 ${count}번째 방문`;
   setTimeout(()=>this.poem(away===null?Poems.firstVisit():away>=86400000?Poems.returningDays(Math.floor(away/86400000)):away>=3600000?Poems.returningHours(Math.floor(away/3600000)):Poems.returningShort()),700);
   if(grown>0)setTimeout(()=>this.poem(`${grown}개의 빛이
당신이 없는 사이에
다음 모습으로 자랐습니다.`),8500);
   if(this.state.seeds.length===0){setTimeout(()=>{$('hint-plant').classList.remove('hidden');setTimeout(()=>$('hint-plant').classList.add('hidden'),10000);},2200);}
   this.idle();if(this.state.seeds.length)this.schedulePrompt(50000);
   this.metaTimer=setInterval(()=>this.updateMeta(),1000);
   if(!Store.operational)this.toast('브라우저 저장소를 사용할 수 없습니다. 내보내기로 기록을 보관하세요.');
 }
 plant(x,y){
   if(!this.garden)return;
   if(this.state.seeds.length>=LIMITS.seeds){this.toast(`이 정원에는 최대 ${LIMITS.seeds}개의 씨앗을 심을 수 있습니다. 기록을 백업한 뒤 정리해 주세요.`);return;}
   this.garden.plant(clamp(x,0,innerWidth),clamp(y,0,innerHeight));$('hint-plant').classList.add('hidden');this.updateMeta();
 }
 onPlant(){this.audio.plink();if(this.state.seeds.length===1)this.poem(`첫 번째 빛이 심어졌습니다.

서둘러 자라라고 말하지 않아도
시간은 조용히 제 몫을 합니다.`);if(this.state.seeds.length===1)this.schedulePrompt(50000);if(!Store.operational)this.toast('기억을 저장할 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.');}
 onBloom(seed,stage){this.audio.bloom();if(stage>=4)this.poem(`하나의 빛이
${MILESTONES[stage].label}(으)로 자랐습니다.`);this.updateMeta();}
 poem(text){
   if(!this.entered)return;clearTimeout(this.poemTimer);clearTimeout(this.poemFadeTimer);$('poem').style.opacity='0';
   this.poemFadeTimer=setTimeout(()=>{$('poem').textContent=String(text);$('poem').style.opacity='1';this.poemTimer=setTimeout(()=>{$('poem').style.opacity='0';},10000);},250);
 }
 idle(){clearTimeout(this.idleTimer);this.idleTimer=setTimeout(()=>{if(this.entered&&!document.hidden&&['about','records'].every(id=>$(id).classList.contains('hidden')))this.poem(Poems.idle());this.idle();},65000+Math.random()*35000);}
 updateMeta(){
   const ss=this.state.seeds;$('seed-count').textContent=`${ss.length}개의 빛`;
   if(!ss.length){$('next-growth').textContent='첫 씨앗을 기다립니다';return;}
   const now=nowMs();let best=Infinity,stage=-1;
   for(const s of ss){const next=stageFor(s,now)+1;if(next>=MILESTONES.length)continue;const remaining=s.plantedAt+MILESTONES[next].time*1000-now;if(remaining<best){best=remaining;stage=next;}}
   $('next-growth').textContent=stage===-1?'모든 빛이 오래된 별이 되었습니다':`다음 성장 · ${MILESTONES[stage].label}까지 ${prettyDuration(best)}`;
   if(!$('records').classList.contains('hidden'))this.updateRecords();
 }
 updateRecords(){
   const ss=this.state.seeds,now=nowMs();$('stat-seeds').textContent=ss.length;$('stat-flowers').textContent=ss.filter(s=>stageFor(s,now)>=4).length;$('stat-visits').textContent=this.state.visits.length;
   const oldest=[...ss].sort((a,b)=>a.plantedAt-b.plantedAt)[0];$('record-oldest').textContent=oldest?`가장 오래된 빛 · ${prettyDuration(now-oldest.plantedAt)} 동안 자라는 중 (${MILESTONES[stageFor(oldest,now)].label})`:'아직 심은 씨앗이 없습니다.';
   $('record-next').textContent=$('next-growth').textContent;$('storage-status').textContent=Store.operational?'기록은 이 브라우저에 저장됩니다. JSON 백업으로 다른 기기에 옮길 수 있습니다.':'현재 저장소에 접근할 수 없습니다. 새 기록은 새로고침하면 사라질 수 있습니다. JSON으로 백업하세요.';
 }
 async toggleAudio(){const on=await this.audio.toggle();$('sound-btn').classList.toggle('on',on);$('sound-btn').setAttribute('aria-pressed',String(on));$('sound-btn').setAttribute('aria-label',on?'소리 끄기':'소리 켜기');$('sound-btn').title=on?'소리 끄기':'소리 켜기';if(!this.audio.ctx)this.toast('이 브라우저는 Web Audio를 지원하지 않습니다.');}
 saveImage(){
   if(!this.entered)return;
   const download=(blob)=>{if(!blob){this.toast('이미지 저장에 실패했습니다.');return;}this.download(blob,'사이-시간의정원.png');this.toast('정원 이미지를 저장했습니다.');};
   if(this.canvas.toBlob)this.canvas.toBlob(download,'image/png');else{try{const a=document.createElement('a');a.href=this.canvas.toDataURL('image/png');a.download='사이-시간의정원.png';a.click();}catch{this.toast('이미지 저장에 실패했습니다.');}}
 }
 download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 exportData(){const backup={format:'between-garden-backup',exportedAt:new Date().toISOString(),data:this.state};this.download(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),'사이-정원기록.json');this.toast('JSON 백업 파일을 저장했습니다.');}
 async importData(e){
   const file=e.target.files?.[0];e.target.value='';if(!file)return;
   if(file.size>LIMITS.backupBytes){this.toast('파일이 너무 큽니다(450KB 이하만 지원).');return;}
   try{const raw=JSON.parse(await file.text());if(raw.format&&raw.format!=='between-garden-backup')throw Error('다른 형식의 파일입니다.');const imported=Store.normalize(raw.data||raw);if(!confirm(`현재 정원 기록을 새 기록(${imported.seeds.length}개 씨앗)으로 교체할까요? 기존 기록은 복구할 수 없습니다.`))return;
     this.state=imported;Store.readOnly=false;if(!Store.save(this.state))this.toast('저장소에 접근할 수 없어 가져오기를 완료할 수 없습니다.');else location.reload();
   }catch(err){this.toast(`가져오기 실패: ${err.message}`);}
 }
 resetData(){if(!confirm('정원의 씨앗과 방문 기록, 답변을 모두 지울까요? 이 작업은 되돌릴 수 없습니다.'))return;if(!Store.clear()){this.toast('기록을 지울 수 없습니다.');return;}location.reload();}
 toast(message){clearTimeout(this.toastTimer);$('toast').textContent=message;$('toast').classList.add('show');this.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
 schedulePrompt(ms){clearTimeout(this.promptTimer);this.promptTimer=setTimeout(()=>{if(this.entered&&!document.hidden&&['about','records'].every(id=>$(id).classList.contains('hidden')))this.showPrompt();else this.schedulePrompt(45000);},ms);}
 showPrompt(){
   const q=Prompts.pick();$('prompt-q').textContent=q.q;$('prompt-choices').replaceChildren();
   for(const answer of q.choices){const btn=document.createElement('button');btn.className='choice';btn.type='button';btn.textContent=answer;btn.addEventListener('click',()=>{
     this.state.answers.push({t:nowMs(),q:q.q,a:answer});this.state.answers=this.state.answers.slice(-LIMITS.answers);Store.save(this.state);
     this.closePrompt(true);this.poem(Prompts.acknowledge());const x=innerWidth/2+(Math.random()-.5)*Math.min(160,innerWidth*.3),y=innerHeight*.53+(Math.random()-.5)*Math.min(140,innerHeight*.2);this.plant(x,y);
   });$('prompt-choices').append(btn);}
   $('prompt').classList.remove('hidden');$('prompt').setAttribute('aria-hidden','false');$('prompt').querySelector('.choice')?.focus();
   clearTimeout(this.promptDeadline);this.promptDeadline=setTimeout(()=>this.closePrompt(true),30000);
 }
 closePrompt(reschedule){
   clearTimeout(this.promptDeadline);$('prompt').classList.add('hidden');$('prompt').setAttribute('aria-hidden','true');if(this.entered&&document.activeElement?.closest('#prompt'))this.canvas.focus({preventScroll:true});if(reschedule)this.schedulePrompt(180000+Math.random()*90000);
 }
 onVisibility(){if(document.hidden){Store.save(this.state);this.audio.pauseOnHidden();}else{this.audio.pauseOnHidden();this.updateMeta();}}
 onExit(){if(!this.entered)return;this.state.lastVisit=nowMs();Store.save(this.state);}
}
window.addEventListener('DOMContentLoaded',()=>{window.__sai=new App();});
