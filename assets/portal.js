(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const worlds = JSON.parse($('worldData').textContent);
  const CATEGORIES = {all:'전체 세계',perception:'인지 · 감각',life:'생명 · 진화',memory:'기억 · 흔적',creation:'발상 · 창조',cosmos:'우주 · 차원'};
  const cards = [...document.querySelectorAll('.world-card')];
  let selected = worlds.findIndex(w => w.slug === 'mindscape');
  let category = 'all';
  const two = n => String(n+1).padStart(2,'0');
  const announce = msg => { $('announce').textContent = ''; requestAnimationFrame(() => { $('announce').textContent = msg; }); };
  const hrefFor = w => './' + w.slug + '/index.html';
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

  function selectWorld(index, read = true) {
    selected = (index + worlds.length) % worlds.length;
    const w = worlds[selected];
    $('featureIndex').textContent = two(selected);
    $('featureCount').textContent = two(selected) + ' / ' + worlds.length;
    $('featureCategory').textContent = CATEGORIES[w.category];
    $('featureTitle').textContent = w.title;
    $('featureKo').textContent = w.ko;
    $('featureDescription').textContent = w.desc;
    $('featureEnter').href = hrefFor(w);
    $('featureEnter').setAttribute('aria-label',w.title + ' 작품으로 입장');
    $('featureTitle').style.textShadow = '0 0 32px ' + w.color + '25';
    document.querySelector('.featured').style.setProperty('--accent',w.color);
    if(read) announce(w.title + ', ' + w.ko + ' 선택. 입장 링크가 준비되었습니다.');
  }
  function randomWorld() {
    const arr=worlds.filter((_,i) => i!==selected);
    const w=arr[Math.floor(Math.random()*arr.length)];
    window.location.assign(hrefFor(w));
  }
  $('prevWorld').addEventListener('click',() => selectWorld(selected-1));
  $('nextWorld').addEventListener('click',() => selectWorld(selected+1));
  $('randomBtn').addEventListener('click',randomWorld);
  $('randomBottom').addEventListener('click',randomWorld);
  selectWorld(selected,false);

  function applyFilters() {
    const query = $('searchInput').value.trim().toLocaleLowerCase();
    let count=0;
    cards.forEach(card => {
      const matches=(category==='all'||card.dataset.category===category)&&(!query||card.dataset.search.includes(query));
      card.hidden=!matches;
      if(matches) count++;
    });
    $('resultCount').textContent = count + ' / ' + worlds.length + ' WORLDS';
    $('emptyState').hidden = count!==0;
  }
  document.querySelectorAll('.filter-chip').forEach(btn => btn.addEventListener('click',() => {
    category=btn.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(chip => {
      const active=chip===btn;
      chip.classList.toggle('active',active);
      chip.setAttribute('aria-pressed',String(active));
    });
    applyFilters();
  }));
  $('searchInput').addEventListener('input',applyFilters);
  $('resetFilter').addEventListener('click',() => {
    category='all'; $('searchInput').value='';
    const btn=document.querySelector('.filter-chip[data-filter="all"]');
    if(btn) btn.click();
  });
  applyFilters();

  let audio=null, master=null, soundEnabled=false;
  const soundBtn=$('soundBtn');
  async function setSound(on) {
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(on && !AudioCtor) {announce('이 브라우저는 Web Audio를 지원하지 않습니다.');return;}
    try {
      if(on) {
        if(!audio) {
          audio=new AudioCtor();master=audio.createGain();master.gain.value=0;master.connect(audio.destination);
          for(const [freq,kind,level] of [[110,'sine',.38],[164.81,'sine',.21],[220,'triangle',.055]]) {
            const osc=audio.createOscillator();const gain=audio.createGain();
            osc.type=kind;osc.frequency.value=freq;gain.gain.value=level;
            osc.connect(gain);gain.connect(master);osc.start();
          }
        }
        await audio.resume();
        master.gain.setTargetAtTime(.025,audio.currentTime,.25);
        soundEnabled=true;
      } else {
        if(audio && master) master.gain.setTargetAtTime(0,audio.currentTime,.1);
        soundEnabled=false;
      }
      soundBtn.setAttribute('aria-pressed',String(soundEnabled));
      soundBtn.setAttribute('aria-label',soundEnabled?'사운드 끄기':'사운드 켜기');
      soundBtn.title=soundEnabled?'앰비언트 사운드 끄기':'앰비언트 사운드 켜기';
    } catch (err) {
      soundEnabled=false; soundBtn.setAttribute('aria-pressed','false');
      announce('오디오 사용이 제한되어 있습니다. 시각 경험은 계속됩니다.');
    }
  }
  soundBtn.addEventListener('click',()=>setSound(!soundEnabled));
  function chime(freq=390) {
    if(!soundEnabled || !audio) return;
    try {
      const osc=audio.createOscillator(), gain=audio.createGain(),now=audio.currentTime;
      osc.type='sine';osc.frequency.setValueAtTime(freq,now);
      osc.frequency.exponentialRampToValueAtTime(freq*1.21,now+.5);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.024,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.8);
      osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.82);
      osc.onended=() => {osc.disconnect();gain.disconnect();};
    } catch (_) { /* audio is optional */ }
  }
  const canvas=$('cosmos');
  const ctx=canvas.getContext('2d',{alpha:false});
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small=window.matchMedia('(max-width:760px)').matches;
  const TOTAL=small?620:1550;
  const TWOPI=Math.PI*2;
  const step=1/60;
  let W=0,H=0,DPR=1,CX=0,CY=0,R=0,particles=[],targets=[];
  let t=0,idle=0,phase='sphere',phaseAge=0,activeText='NOEMA';
  let animating=!reduceMotion,visible=true,raf=0,lastTs=0,acc=0;
  let screenStars=[],sprites=[],markers=[],hoverNode=-1,shocks=[];
  let hoverPos={x:-999,y:-999,active:false,age:100};
  const textC=document.createElement('canvas');textC.width=1024;textC.height=340;
  const textX=textC.getContext('2d',{willReadFrequently:true});
  function rand(a,b) {return a+Math.random()*(b-a);}
  function colorRGB(hex) {return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));}
  function seeded(n) {return () => {n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function makeSprite(color) {
    const el=document.createElement('canvas');el.width=el.height=56;
    const c=el.getContext('2d');if(!c)return el;
    const [r,g,b]=colorRGB(color),grad=c.createRadialGradient(28,28,1,28,28,28);
    grad.addColorStop(0,'rgba(255,255,255,1)');
    grad.addColorStop(.1,`rgba(${r},${g},${b},.9)`);
    grad.addColorStop(.26,`rgba(${r},${g},${b},.45)`);
    grad.addColorStop(.62,`rgba(${r},${g},${b},.08)`);
    grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
    c.fillStyle=grad;c.fillRect(0,0,56,56);return el;
  }
  function initSprites() {sprites=['#9bf0df','#8dd9ff','#ddc0ff','#f8d3b6'].map(makeSprite);}
  function addParticles() {
    particles=[];
    for(let i=0;i<TOTAL;i++) {
      const z=1-2*(i+.5)/TOTAL,phi=i*Math.PI*(3-Math.sqrt(5)),q=Math.sqrt(Math.max(0,1-z*z));
      const nx=q*Math.cos(phi),ny=q*Math.sin(phi),nz=z;
      particles.push({nx,ny,nz,spin:rand(0,TWOPI),size:rand(.70,1.65),color:i%4,
        x:nx*R+rand(-45,45),y:ny*R+rand(-45,45),z:nz*R+rand(-45,45),vx:0,vy:0,vz:0});
    }
  }
  function sphereTarget(p) {
    const a=t*.12,co=Math.cos(a),si=Math.sin(a);
    const tilt=.31+Math.sin(t*.18)*.15,ct=Math.cos(tilt),st=Math.sin(tilt);
    const breath=R*(1+.035*Math.sin(t*.9+p.spin));
    const x=p.nx*breath,y=p.ny*breath,z=p.nz*breath;
    const xx=x*co-z*si,zz=x*si+z*co;
    return {x:xx,y:y*ct-zz*st,z:y*st+zz*ct};
  }
  function sampleText(word) {
    if(!textX)return Array.from({length:TOTAL},()=>({x:0,y:0,z:0}));
    const tw=textC.width,th=textC.height;
    textX.clearRect(0,0,tw,th);textX.fillStyle='#fff';
    let font=250;
    const family='"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif';
    while(font>35) {textX.font=`800 ${font}px ${family}`;if(textX.measureText(word).width<tw*.88)break;font-=5;}
    textX.textAlign='center';textX.textBaseline='middle';textX.fillText(word,tw/2,th/2);
    let pix;
    try {pix=textX.getImageData(0,0,tw,th).data;}catch(_) {return Array.from({length:TOTAL},()=>({x:0,y:0,z:0}));}
    const pts=[];
    for(let y=8;y<th-8;y+=3) for(let x=8;x<tw-8;x+=3) if(pix[(y*tw+x)*4+3]>110) pts.push([x,y]);
    for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
    const maxW=Math.min(W*(small?.53:.40),590),maxH=Math.min(H*(small?.13:.20),220);
    return Array.from({length:TOTAL},(_,i) => {
      const xy=pts.length?pts[i%pts.length]:[tw/2,th/2];
      return {x:(xy[0]-tw/2)/tw*maxW,y:(xy[1]-th/2)/th*maxH,z:rand(-15,15)};
    });
  }
  function setText(word) {
    activeText=word;phase='text';phaseAge=0;idle=0;
    targets=sampleText(word);
    $('phaseLabel').textContent='PARTICLES / ' + word.toLocaleUpperCase();
    if(reduceMotion) {snapTargets();render();}
  }
  function setSphere() {
    phase='sphere';phaseAge=0;idle=0;
    $('phaseLabel').textContent='PARTICLES / BREATHING';
    if(reduceMotion) {snapTargets();render();}
  }
  function snapTargets() {
    particles.forEach((p,i)=>{const q=phase==='text'?targets[i]:sphereTarget(p);Object.assign(p,{x:q.x,y:q.y,z:q.z,vx:0,vy:0,vz:0});});
  }
  function resize() {
    if(!ctx)return;
    const rect=canvas.getBoundingClientRect();
    const oldR=R;
    W=Math.max(1,rect.width);H=Math.max(1,rect.height);
    DPR=Math.min(window.devicePixelRatio||1,small?1.55:1.75);
    const maxPixels=small?1_400_000:2_700_000;
    DPR=Math.min(DPR,Math.sqrt(maxPixels/(W*H)));
    canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    CX=W*.5;CY=H*(small?.50:.52);
    R=Math.min(W*(small?.252:.19),H*(small?.16:.265),235);
    if(particles.length===0)addParticles();
    else if(oldR>0) for(const p of particles) {p.x*=R/oldR;p.y*=R/oldR;p.z*=R/oldR;}
    if(phase==='text')targets=sampleText(activeText);
    if(reduceMotion)snapTargets();
    const rng=seeded(0x91a021);screenStars=[];
    for(let i=0;i<Math.min(240,Math.ceil(W*H/5000));i++)screenStars.push({x:rng()*W,y:rng()*H,r:.3+rng()*.8,a:.08+rng()*.34});
    render();
  }
  function pulse(x=CX,y=CY) {
    if(!ctx)return;
    if(phase==='text')setSphere();
    idle=0;
    if(!reduceMotion)shocks.push({x:x-CX,y:y-CY,r:1,alpha:1});
    if(shocks.length>6)shocks.shift();
    chime(300+Math.random()*150);
    if(reduceMotion)render();
  }
  function update() {
    t+=step;idle+=step;phaseAge+=step;hoverPos.age+=step;
    if(phase==='sphere' && idle>13) setText('NOEMA');
    else if(phase==='text' && phaseAge>7) setSphere();
    for(let j=shocks.length-1;j>=0;j--){shocks[j].r+=9;shocks[j].alpha-=.018;if(shocks[j].alpha<=0)shocks.splice(j,1);}
    const influence=hoverPos.active?clamp((2-hoverPos.age)/1.1,0,1):0;
    const spring=phase==='text'?.034:.014,drag=phase==='text'?.86:.91;
    const ang=t*.12,co=Math.cos(ang),si=Math.sin(ang),tilt=.31+Math.sin(t*.18)*.15,ct=Math.cos(tilt),st=Math.sin(tilt);
    for(let i=0;i<particles.length;i++) {
      const p=particles[i];let tx,ty,tz;
      if(phase==='text'){const v=targets[i];tx=v.x;ty=v.y;tz=v.z;}
      else {
        const b=R*(1+.035*Math.sin(t*.9+p.spin)),x=p.nx*b,y=p.ny*b,z=p.nz*b,xx=x*co-z*si,zz=x*si+z*co;
        tx=xx;ty=y*ct-zz*st;tz=y*st+zz*ct;
      }
      p.vx+=(tx-p.x)*spring;p.vy+=(ty-p.y)*spring;p.vz+=(tz-p.z)*spring;
      if(influence>0) {
        const dx=p.x-(hoverPos.x-CX),dy=p.y-(hoverPos.y-CY),dz=p.z*.9,dist=dx*dx+dy*dy+dz*dz;
        if(dist<145*145 && dist>.001){const f=(1-Math.sqrt(dist)/145)*8*influence/Math.sqrt(dist);p.vx+=dx*f;p.vy+=dy*f;p.vz+=dz*f;}
      }
      for(const shock of shocks) {
        const dx=p.x-shock.x,dy=p.y-shock.y,dz=p.z*.7,dist=Math.hypot(dx,dy,dz)+.01;
        const band=Math.abs(dist-shock.r);
        if(band<33){const f=(1-band/33)*9*shock.alpha/dist;p.vx+=dx*f;p.vy+=dy*f;p.vz+=dz*f;}
      }
      p.vx=clamp(p.vx*drag,-30,30);p.vy=clamp(p.vy*drag,-30,30);p.vz=clamp(p.vz*drag,-30,30);
      p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;
    }
  }
  // Distribute every world across adaptive concentric orbits, rather than
  // hard-coding two 8-node rings (which would overlap after expansion).
  const ORBITS = worlds.length > 24 ? 3 : worlds.length > 12 ? 2 : 1;
  function orbitalPoints() {
    const out=[];
    const countPerRing=Array.from({length:ORBITS},(_,ring)=>
      Math.floor(worlds.length/ORBITS)+(ring<worlds.length%ORBITS?1:0));
    let worldIndex=0;
    for(let ring=0;ring<ORBITS;ring++) {
      const total=countPerRing[ring];
      const rad=R*([1.12,1.42,1.72][ring]||1.5);
      const flatten=[.72,.72,.72][ring]||.7;
      for(let slot=0;slot<total;slot++) {
        const i=worldIndex++;
        const theta=TWOPI*(slot+.33*ring)/total-.75+t*.014*(ring%2?-1:1);
        out.push({x:CX+Math.cos(theta)*rad,y:CY+Math.sin(theta)*rad*flatten,ring,theta,i});
      }
    }
    return out;
  }
  function render() {
    if(!ctx||!W||!H)return;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.fillStyle='#030813';ctx.fillRect(0,0,W,H);
    const base=ctx.createRadialGradient(CX,CY,10,CX,CY,Math.max(W,H)*.82);
    base.addColorStop(0,'#102137');base.addColorStop(.22,'#0a162a');base.addColorStop(.62,'#050c1a');base.addColorStop(1,'#030711');
    ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
    // The background is rendered procedurally. Nothing is fetched or uploaded.
    for(const s of screenStars) {ctx.beginPath();ctx.fillStyle=`rgba(198,225,249,${s.a})`;ctx.arc(s.x,s.y,s.r,0,TWOPI);ctx.fill();}
    const aurora=ctx.createRadialGradient(CX,CY,R*.2,CX,CY,R*2.1);
    aurora.addColorStop(0,'rgba(87,142,218,.10)');aurora.addColorStop(.58,'rgba(88,106,218,.035)');aurora.addColorStop(1,'rgba(88,106,218,0)');
    ctx.fillStyle=aurora;ctx.fillRect(CX-R*2.2,CY-R*2.2,R*4.4,R*4.4);
    // Orbital guides follow the same geometry as the selectable nodes.
    ctx.save();ctx.translate(CX,CY);ctx.setLineDash([2,10]);
    [1.12,1.42,1.72].slice(0,ORBITS).forEach((radius,ring)=>{
      ctx.strokeStyle=ring%2?'rgba(168,156,236,.16)':'rgba(136,195,221,.16)';
      ctx.lineWidth=.7;ctx.beginPath();
      ctx.ellipse(0,0,R*radius,R*radius*[.72,.72,.72][ring],0,0,TWOPI);ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.strokeStyle='rgba(166,205,230,.065)';ctx.beginPath();ctx.arc(0,0,R*1.1,0,TWOPI);ctx.stroke();
    ctx.restore();
    // Text and a three-dimensional particle sphere are the same particles.
    ctx.globalCompositeOperation='lighter';
    const camera=Math.max(560,Math.min(W,H)*1.35);
    for(const p of particles) {
      const sc=clamp(camera/(camera+p.z),.56,1.72);
      const x=CX+p.x*sc,y=CY+p.y*sc;
      if(x<-20||x>W+20||y<-20||y>H+20)continue;
      const radius=clamp(p.size*sc*5.0,2,15);
      ctx.globalAlpha=clamp(.52-p.z/Math.max(R,1)*.18,.22,.92);
      ctx.drawImage(sprites[p.color],x-radius,y-radius,radius*2,radius*2);
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    // Interactions ripple outwards instead of interrupting navigation.
    for(const s of shocks) {
      ctx.strokeStyle=`rgba(162,251,221,${s.alpha*.36})`;ctx.lineWidth=s.alpha*1.2;
      ctx.beginPath();ctx.arc(CX+s.x,CY+s.y,s.r,0,TWOPI);ctx.stroke();
    }
    markers=orbitalPoints();
    markers.forEach(({x,y,i,ring})=>{
      const active=i===selected,hot=i===hoverNode;
      const color=worlds[i].color;
      if(active||hot){
        ctx.beginPath();ctx.strokeStyle=color;ctx.globalAlpha=active?.42:.28;
        ctx.lineWidth=.8;ctx.arc(x,y,active?16:13,0,TWOPI);ctx.stroke();ctx.globalAlpha=1;
        const h=ctx.createRadialGradient(x,y,0,x,y,29);h.addColorStop(0,color+'66');h.addColorStop(1,color+'00');
        ctx.fillStyle=h;ctx.fillRect(x-29,y-29,58,58);
      }
      ctx.beginPath();ctx.fillStyle=color;ctx.shadowBlur=active?16:8;ctx.shadowColor=color;
      ctx.arc(x,y,active?4.2:hot?3.5:2.5,0,TWOPI);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle=active?'#dcfff2':'rgba(180,208,229,.6)';
      ctx.font='9px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      if(!small || active || hot) ctx.fillText(two(i),x,y+(ring%2?19:-18));
    });
    // Quiet axis and central singularity give the scene a scientific-instrument feel.
    ctx.beginPath();ctx.arc(CX,CY,1.8,0,TWOPI);ctx.fillStyle='#f3fff7';ctx.fill();
  }
  function nearestMarker(x,y) {
    let best=-1,dist=22;
    for(const m of markers) {const d=Math.hypot(m.x-x,m.y-y);if(d<dist){best=m.i;dist=d;}}
    return best;
  }
  const tip=$('nodeTip');
  function showTip(i,x,y) {
    if(i<0){tip.classList.remove('visible');return;}
    tip.querySelector('.tip-index').textContent=two(i);
    tip.querySelector('.tip-title').textContent=worlds[i].title;
    tip.style.left=clamp(x,70,W-75)+'px';tip.style.top=clamp(y,85,H-50)+'px';tip.classList.add('visible');
  }
  function frame(now) {
    raf=0;
    if(!ctx||!animating||!visible||document.hidden)return;
    if(!lastTs)lastTs=now;
    const dt=Math.min((now-lastTs)/1000,.07);lastTs=now;
    acc=Math.min(acc+dt,.09);
    for(let k=0;k<4 && acc>=step;k++){update();acc-=step;}
    render();
    raf=requestAnimationFrame(frame);
  }
  function start() {if(ctx&&animating&&visible&&!document.hidden&&!raf){lastTs=0;acc=0;raf=requestAnimationFrame(frame);}}
  function stop() {if(raf){cancelAnimationFrame(raf);raf=0;}lastTs=0;}
  function setPaused(paused) {
    animating=!paused;
    const button=$('pauseBtn');
    button.innerHTML=paused?'재생 <span aria-hidden="true">▶</span>':'정지 <span aria-hidden="true">Ⅱ</span>';
    button.setAttribute('aria-pressed',String(paused));
    if(paused){stop();render();}else start();
    announce(paused?'입자 우주 정지':'입자 우주 재생');
  }
  $('pauseBtn').addEventListener('click',()=>setPaused(animating));
  $('pulseBtn').addEventListener('click',()=>pulse());
  $('thoughtForm').addEventListener('submit',e=>{
    e.preventDefault();
    const input=$('thoughtInput');
    const word=Array.from(input.value.trim().replace(/\s+/g,' ')).slice(0,12).join('');
    if(!word){input.focus();return;}
    if(!ctx){announce('이 브라우저는 Canvas를 지원하지 않습니다.');return;}
    setText(word); chime(510);
    input.blur();announce('입자들이 '+word+'라는 단어를 만듭니다.');
    if(!animating)render();
  });
  if(ctx) {
    initSprites();resize();
    if(reduceMotion) {setPaused(true);}
    else start();
    canvas.addEventListener('pointermove',e=>{
      const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
      hoverNode=nearestMarker(x,y);
      showTip(hoverNode,x,y);
      canvas.style.cursor=hoverNode>=0?'pointer':'crosshair';
      hoverPos={x,y,active:true,age:0};
      if(phase==='text' && hoverNode<0 && (e.pointerType==='mouse'||e.buttons))setSphere();
      idle=0;
      if(reduceMotion)render();
    },{passive:true});
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
      const node=nearestMarker(x,y);
      if(node>=0){selectWorld(node);chime(320+node*15);}
      else pulse(x,y);
      idle=0;if(reduceMotion)render();
    },{passive:true});
    canvas.addEventListener('pointerleave',()=>{hoverNode=-1;tip.classList.remove('visible');hoverPos.active=false;canvas.style.cursor='crosshair';if(reduceMotion)render();});
    window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){stop();if(audio&&master)master.gain.setTargetAtTime(0,audio.currentTime,.1);}
      else {start();if(soundEnabled&&audio&&master)master.gain.setTargetAtTime(.025,audio.currentTime,.4);}
    });
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        visible=entries[0].isIntersecting;
        if(visible)start();else stop();
      },{threshold:0.01});observer.observe(document.querySelector('.hero'));
    }
  } else {
    $('phaseLabel').textContent='STATIC VIEW / CANVAS UNAVAILABLE';
    $('pulseBtn').disabled=true;$('pauseBtn').disabled=true;
  }
  window.addEventListener('keydown',e=>{
    const tag=(document.activeElement&&document.activeElement.tagName)||'';
    const typing=['INPUT','TEXTAREA','SELECT'].includes(tag);
    if(typing)return;
    if(e.key==='/' && !e.ctrlKey&&!e.metaKey) {e.preventDefault();$('searchInput').focus();}
    else if(!['BUTTON','A'].includes(tag) && window.scrollY<window.innerHeight*.6 && (e.key==='ArrowRight'||e.key==='ArrowLeft')){
      e.preventDefault();selectWorld(selected+(e.key==='ArrowRight'?1:-1));chime(320+selected*15);if(ctx&&!animating)render();
    }
    else if(!['BUTTON','A'].includes(tag) && (e.key==='b'||e.key==='B'))pulse();
  });
})();
