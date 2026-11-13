/* 모든 생김새·시·색은 seed에서만 결정됩니다. draw()에서는 난수를 소비하지 않습니다. */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const POEM = {
  adj:['고요한','푸른','붉은','은빛','투명한','잊혀진','작은','깊은','오래된','희미한','빛나는','조용한'],
  place:['정원','노래','기억','별','꿈','바람','새벽','어둠','물결','그늘','숨결','별자리'],
  subj:['별이','달이','바람이','그대가','침묵이','그림자가','기억이','꽃이','시간이','별빛이','안개가','노래가'],
  act1:['내려앉으면','흐르면','머물면','스치면','번지면','피어나면','사라지면','속삭이면','녹아내리면','빛나면','잠기면'],
  subj2:['나는','우리는','당신은','정원은','이 밤은','나의 마음은','이 별은','이 노래는'],
  act2:['그립습니다','잊지 않습니다','기다립니다','노래합니다','꿈꿉니다','빛납니다','잠들었습니다','안녕이라 말합니다','당신을 기억합니다']
};
function generatePoem(seed) {
  const rng = mulberry32(seed >>> 0);
  const pick = values => values[Math.floor(rng() * values.length)];
  return `${pick(POEM.adj)} ${pick(POEM.place)}에서\n${pick(POEM.subj)} ${pick(POEM.act1)}\n${pick(POEM.subj2)} ${pick(POEM.act2)}`;
}
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

class Flower {
  constructor(u,v,seed) {
    this.u = clamp(Number(u),0.035,0.965);
    this.v = clamp(Number(v),0.25,0.96);
    this.seed = seed >>> 0;
    const rng = mulberry32(this.seed);
    this.poem = generatePoem(this.seed);
    this.age = 0;
    this.duration = 3.3 + rng() * 1.3;
    this.height = 82 + rng() * 105;
    this.petals = 5 + Math.floor(rng() * 5);
    this.petalSize = 9 + rng() * 8;
    this.hue = Math.floor((rng() * 310 + 18) % 360);
    this.leaves = 1 + Math.floor(rng() * 3);
    this.curve = (rng() - .5) * 46;
    this.pointed = rng() > .5;
    this.glowSize = .62 + rng() * .5;
    this.phase = rng() * Math.PI * 2;
    this.noteFreq = [261.63,293.66,329.63,392,440,523.25,587.33,659.25][Math.floor(rng()*8)];
    this.petalsData = Array.from({length:this.petals},(_,i)=>({
      angle:i*Math.PI*2/this.petals + (rng()-.5)*.17,
      length:.9+rng()*.3,
      width:.85+rng()*.25
    }));
    this.leafData = Array.from({length:this.leaves},(_,i)=>({
      at:(i+1)/(this.leaves+1),
      side:i%2===0 ? 1 : -1,
      size:7+rng()*7
    }));
    this.fireflies = Array.from({length:2+Math.floor(rng()*2)},()=>({
      angle:rng()*Math.PI*2, radius:23+rng()*42, speed:.36+rng()*.55,
      size:.8+rng()*1.4, phase:rng()*Math.PI*2
    }));
    this.x=0;this.y=0;this.sizeScale=1;
    this.sprite = this.createSprite();
  }
  setViewport(width,height) {
    this.x = this.u*width;
    this.y = this.v*height;
    this.sizeScale = clamp(Math.min(width/850,height/700),.56,1.04);
  }
  get growth() { return clamp(this.age/this.duration,0,1); }
  update(dt) { this.age=Math.min(this.duration,this.age+dt); }
  getHeadPos(time=0,reduced=false) {
    const g=this.growth;
    return {x:this.x+(this.curve*.55*g+(reduced?0:Math.sin(time*1.2+this.phase)*3.7*g))*this.sizeScale,
      y:this.y-this.height*this.sizeScale*g};
  }
  isHovered(x,y,time,reduced) {
    const p=this.getHeadPos(time,reduced);
    return this.growth>.44 && Math.hypot(p.x-x,p.y-y) < 36*this.sizeScale+12;
  }
  createSprite() {
    const size=176,center=size/2;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=size;
    const c=canvas.getContext('2d');
    // 별빛 오라: 픽셀 이미지를 캐시해 CPU를 아낍니다.
    const glow=c.createRadialGradient(center,center,1,center,center,81);
    glow.addColorStop(0,`hsla(${this.hue},95%,75%,.34)`);
    glow.addColorStop(.38,`hsla(${this.hue},86%,57%,.13)`);
    glow.addColorStop(1,`hsla(${this.hue},75%,55%,0)`);
    c.fillStyle=glow;c.fillRect(0,0,size,size);
    c.save();c.translate(center,center);
    c.shadowColor=`hsla(${this.hue},90%,70%,.85)`;c.shadowBlur=12;
    for(const petal of this.petalsData){
      c.save();c.rotate(petal.angle);
      const r=this.petalSize*petal.length;
      c.fillStyle=`hsla(${this.hue},72%,${66+petal.width*6}%,.94)`;
      c.beginPath();
      if(this.pointed){
        c.moveTo(0,0);
        c.bezierCurveTo(r*.24,-r*.82,r*1.25,-r*.4,r*1.7,0);
        c.bezierCurveTo(r*1.25,r*.4,r*.24,r*.82,0,0);
      }else{
        c.ellipse(r*.7,0,r*.88,r*.51*petal.width,0,0,Math.PI*2);
      }
      c.fill();c.restore();
    }
    c.shadowBlur=10;
    c.fillStyle='#fff9dc';c.beginPath();c.arc(0,0,this.petalSize*.3,0,Math.PI*2);c.fill();
    c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(0,0,1.6,0,Math.PI*2);c.fill();
    c.restore();return canvas;
  }
  draw(ctx,time,reduced=false,selected=false){
    const g=this.growth;if(g<.002)return;
    const scale=this.sizeScale;
    const head=this.getHeadPos(time,reduced);
    const ctrlX=this.x+this.curve*scale*.26*g;
    const ctrlY=this.y-this.height*scale*g*.55;
    ctx.strokeStyle=`hsla(${130+this.hue*.06},36%,${39+g*17}%,.84)`;
    ctx.lineWidth=1.5*scale;
    ctx.beginPath();ctx.moveTo(this.x,this.y);
    ctx.quadraticCurveTo(ctrlX,ctrlY,head.x,head.y);ctx.stroke();
    for(const leaf of this.leafData){
      if(g<leaf.at*.8) continue;
      const t=leaf.at;
      const lx=(1-t)*(1-t)*this.x+2*(1-t)*t*ctrlX+t*t*head.x;
      const ly=(1-t)*(1-t)*this.y+2*(1-t)*t*ctrlY+t*t*head.y;
      const sz=leaf.size*scale*clamp((g-leaf.at*.8)*5,0,1);
      ctx.fillStyle='rgba(112,176,146,.65)';ctx.beginPath();
      ctx.moveTo(lx,ly);
      ctx.quadraticCurveTo(lx+leaf.side*sz*1.25,ly-sz*1.6,lx+leaf.side*sz*1.8,ly-sz*.45);
      ctx.quadraticCurveTo(lx+leaf.side*sz*.65,ly+sz*.45,lx,ly);
      ctx.fill();
    }
    if(g>.38){
      const b=clamp((g-.38)/.62,0,1);
      const s=scale*b*(selected?1.1:1);
      ctx.save();ctx.translate(head.x,head.y);
      if(!reduced)ctx.rotate(Math.sin(time*.65+this.phase)*.07);
      ctx.globalAlpha=.9+(selected?.1:0);
      ctx.drawImage(this.sprite,-88*s,-88*s,176*s,176*s);
      ctx.restore();
      if(selected){
        ctx.strokeStyle=`hsla(${this.hue},90%,82%,.75)`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(head.x,head.y,27*scale,0,Math.PI*2);ctx.stroke();
      }
      for(const ff of this.fireflies){
        const a=ff.angle+(reduced?0:time*ff.speed);
        const x=head.x+Math.cos(a)*ff.radius*scale*b;
        const y=head.y+Math.sin(a)*ff.radius*.72*scale*b;
        const alpha=.35+.55*(.5+.5*Math.sin(time*2+ff.phase));
        ctx.save();ctx.fillStyle=`rgba(255,239,172,${alpha*b})`;
        ctx.shadowColor='#fff1ab';ctx.shadowBlur=9*scale;
        ctx.beginPath();ctx.arc(x,y,ff.size*scale,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
  }
  toJSON(){return {u:Math.round(this.u*100000)/100000,v:Math.round(this.v*100000)/100000,seed:this.seed};}
}
