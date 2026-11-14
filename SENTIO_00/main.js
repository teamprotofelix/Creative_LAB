(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const random = (a, b) => a + Math.random() * (b - a);
  const lowMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const keys = { visits: 'sentio_visits_v1', last: 'sentio_last_v1', first: 'sentio_first_v2' };
  const safeRead = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, String(value)); return true; } catch { return false; } };
  const safeRemove = (key) => { try { localStorage.removeItem(key); return true; } catch { return false; } };
  const safeInt = (str, fallback) => { const n = Number(str); return Number.isSafeInteger(n) && n > 0 ? n : fallback; };
  const initAt = Date.now();
  const prevVisits = clamp(safeInt(safeRead(keys.visits), 0), 0, 1e8);
  const prevLast = safeInt(safeRead(keys.last), 0);
  const visits = prevVisits + 1;
  const firstVisit = safeInt(safeRead(keys.first), initAt);
  const memory = { visits, last: prevLast > 0 && prevLast <= initAt ? prevLast : null, first: firstVisit <= initAt ? firstVisit : initAt };
  safeWrite(keys.visits, memory.visits);
  safeWrite(keys.last, initAt);
  safeWrite(keys.first, memory.first);

  const PALETTES = [
    { key: 'dawn', name: '새벽', hue: 218, bg1: '#0a1427', bg2: '#172b45', fg: '#e6efff', accent: '#a4ceff', rgb: [10,20,39] },
    { key: 'morning', name: '아침', hue: 185, bg1: '#0a1921', bg2: '#1b3944', fg: '#e4f9fa', accent: '#9bdfdf', rgb: [10,25,33] },
    { key: 'day', name: '오후', hue: 35, bg1: '#1a1514', bg2: '#38271c', fg: '#ffeddb', accent: '#ffd69c', rgb: [26,21,20] },
    { key: 'evening', name: '저녁', hue: 16, bg1: '#180d15', bg2: '#422321', fg: '#ffe7e2', accent: '#f5baa7', rgb: [24,13,21] },
    { key: 'night', name: '밤', hue: 259, bg1: '#090919', bg2: '#1a1231', fg: '#f1e9ff', accent: '#c5b0ff', rgb: [9,9,25] }
  ];
  let pal = null;
  function getPalette() {
    const h = new Date().getHours();
    return h >= 5 && h < 8 ? PALETTES[0] : h >= 8 && h < 12 ? PALETTES[1] : h >= 12 && h < 17 ? PALETTES[2] : h >= 17 && h < 20 ? PALETTES[3] : PALETTES[4];
  }
  function refreshPalette(force = false) {
    const next = getPalette();
    if (!force && pal?.key === next.key) return;
    pal = next;
    for (const [k, v] of [['--bg1',pal.bg1], ['--bg2',pal.bg2], ['--fg',pal.fg], ['--hue',pal.hue], ['--accent',pal.accent]]) document.documentElement.style.setProperty(k, String(v));
    $('timelabel').textContent = pal.name + ' · ' + new Date().toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit',hour12:false});
  }
  refreshPalette(true);
  setInterval(() => {
    refreshPalette();
    $('timelabel').textContent = pal.name + ' · ' + new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
  }, 30000);

  const formatDate = (ms) => ms ? new Date(ms).toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'}) : '기록 없음';
  function greeting() {
    const v = memory.visits;
    const days = memory.last ? Math.floor(Math.max(0, initAt - memory.last) / 86400000) : 0;
    if (v === 1) return '처음 뵙겠습니다.\n잠시 아무것도 하지 않아도 괜찮습니다.';
    if (v < 5) return `${v}번째 만남입니다.\n이 브라우저는 당신의 발자국을 기억합니다.`;
    if (v < 21) return `${v}번째 방문입니다.${days > 0 ? `\n마지막 방문으로부터 ${days}일이 지났습니다.` : ''}\n익숙한 풍경도 매번 조금씩 다르게 보입니다.`;
    return `${v}번째 만남.\n오늘도 이곳에 새로운 시간이 도착했습니다.`;
  }
  const fragments = [
    '시간은 흐르지 않습니다.\n우리가 시간 속을 걷습니다.',
    '기억은 과거의 방이 아니라,\n지금 새롭게 지어지는 방입니다.',
    '우리가 지나친 고요에도\n작은 변화는 일어나고 있습니다.',
    '보이는 것이 전부일까요.\n보이지 않는 것도 사라지지는 않습니다.',
    '같은 물결은 두 번 돌아오지 않습니다.\n그러나 바다는 여기에 있습니다.',
    '하나의 선택은 다음 풍경의\n가장 작은 시작이 됩니다.',
    '당신의 생각이 잠시 멎어도\n세상의 숨결은 이어집니다.',
    '당신이 바라보는 것과\n당신이 느끼는 것 사이에, 한 세계가 있습니다.',
    '지금 떠오른 마음은\n잠시 뒤 또 다른 형태가 될 것입니다.',
    '멀리 있는 빛도\n누군가에게는 가까운 하루입니다.',
    '당신은 이 순간을 지나고 있습니다.\n그리고 이 순간도 당신을 지나갑니다.',
    '무엇을 느끼고 있나요?\n그 답을 서두르지 않아도 괜찮습니다.'
  ];
  const greetEl = $('greeting');
  const poetryEl = $('poetry');
  const showText = (el, text) => { el.textContent = text; el.classList.add('show'); };
  let currentPoem = -1;
  const pickPoem = () => {
    let index = Math.floor(Math.random() * fragments.length);
    if (index === currentPoem) index = (index + 1) % fragments.length;
    currentPoem = index;
    poetryEl.classList.remove('show');
    setTimeout(() => { poetryEl.textContent = fragments[index]; poetryEl.classList.add('show'); }, lowMotion.matches ? 20 : 750);
  };
  showText(greetEl, greeting());
  setTimeout(() => { greetEl.classList.remove('show'); setTimeout(() => { greetEl.hidden = true; pickPoem(); }, lowMotion.matches ? 40 : 900); }, 7400);
  setInterval(pickPoem, 16000);
  function updateVisitBadge() { $('visit-badge').textContent = String(memory.visits).padStart(2,'0'); }
  updateVisitBadge();

  const pointer = { x: -1e4, y: -1e4, active: false };
  document.addEventListener('pointermove', (ev) => { pointer.x = ev.clientX; pointer.y = ev.clientY; pointer.active = true; }, {passive:true});
  window.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointer.active = false; });
  window.addEventListener('blur', () => pointer.active = false);

  const field = $('field');
  const roomCanvas = $('roomCanvas');
  const fctx = field.getContext('2d', {alpha:false});
  const rctx = roomCanvas.getContext('2d', {alpha:false});
  if (!fctx || !rctx) { document.body.dataset.error = 'canvas'; return; }
  let W = 0, H = 0, DPR = 1;
  let particles = [];
  const newParticle = () => ({x: random(0,W), y: random(0,H), vx:random(-.28,.28),vy:random(-.28,.28), life:random(0,180), maxLife:random(210,440), size:random(.5,1.8), offset:random(-30,30)});
  function resize() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    DPR = Math.min(devicePixelRatio || 1, W * H > 1500000 ? 1.35 : 2);
    for (const [c,ctx] of [[field,fctx],[roomCanvas,rctx]]) {
      c.width = Math.round(W*DPR);c.height = Math.round(H*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    fctx.fillStyle = pal.bg1; fctx.fillRect(0,0,W,H);
    const count = lowMotion.matches ? 115 : clamp(Math.floor(W*H/3200),155,475);
    particles = Array.from({length:count},newParticle);
    room.dirty = true;
    if (room.name === 'life') room.life = makeLife();
  }
  const noise2 = (x,y,t) => Math.sin(x*.004+t*.00016)+Math.cos(y*.003-t*.00019)+Math.sin((x+y)*.0023+t*.00013)*.8+Math.cos((x-y)*.004+t*.00022)*.5;
  function drawBackground(now,dt) {
    const [r,g,b] = pal.rgb;
    fctx.fillStyle = `rgba(${r},${g},${b},${lowMotion.matches ? 1 : .16})`;
    fctx.fillRect(0,0,W,H);
    fctx.save();fctx.globalCompositeOperation = 'lighter';
    const forceR2=180*180;
    for (const p of particles) {
      const a = noise2(p.x,p.y,now)*Math.PI;
      p.vx += Math.cos(a)*.067*dt;p.vy += Math.sin(a)*.067*dt;
      if (pointer.active) {
        const dx=p.x-pointer.x,dy=p.y-pointer.y,d2=dx*dx+dy*dy;
        if (d2<forceR2 && d2>1) {const f=(1-Math.sqrt(d2)/180)*.3*dt;p.vx+=dx*f/Math.sqrt(d2);p.vy+=dy*f/Math.sqrt(d2);}
      }
      p.vx*=Math.pow(.95,dt);p.vy*=Math.pow(.95,dt);
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life+=dt;
      if (p.x< -20||p.x>W+20||p.y< -20||p.y>H+20||p.life>p.maxLife) {Object.assign(p,newParticle());continue;}
      const alpha = Math.max(0, Math.sin(Math.PI*p.life/p.maxLife))*.72;
      fctx.fillStyle=`hsla(${pal.hue+p.offset},78%,72%,${alpha*.72})`;
      fctx.beginPath();fctx.arc(p.x,p.y,p.size,0,TAU);fctx.fill();
    }
    fctx.restore();
  }

  const room = {name:null,trigger:null,dirty:true,started:0,ripples:[],life:null,lifeStep:0,mind:0,perception:[],follow:{x:0,y:0},lastTrace:0};
  const rooms = {
    time: {number:'01',title:'시간',caption:'THE FLOW OF TIME',text:'물결 하나가 태어나고, 이윽고 사라집니다.\n사라졌다고 해서 일어나지 않았던 것은 아닙니다.',hint:'화면을 누르면 하나의 순간이 만들어집니다.'},
    life: {number:'02',title:'생명',caption:'THE RULES OF LIFE',text:'단순한 규칙에서 복잡한 무늬가 태어납니다.\n모든 변화가 목적지를 알고 시작하는 것은 아닙니다.',hint:'화면을 눌러 세포를 더해 보세요.'},
    mind: {number:'03',title:'마음',caption:'THE SHAPE OF THOUGHT',text:'마음은 언제나 같은 모양이 아닙니다.\n아주 작은 움직임이 전체의 무늬를 바꿉니다.',hint:'커서를 움직이거나 화면을 눌러 무늬를 변화시키세요.'},
    perception: {number:'04',title:'인식',caption:'THE DELAYED MIRROR',text:'한 점은 지금의 움직임을, 다른 점은 조금 늦게 뒤따릅니다.\n우리가 느끼는 현재도 계속 변하는 경험입니다.',hint:'화면에서 움직여 보세요. 두 점은 조금 다르게 응답합니다.'}
  };
  const overlay=$('overlay');
  const helpModal=$('memory-panel');
  const focusable='button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  let activeDialog=null;
  let previousFocus=null;
  function trapFocus(e) {
    if(e.key!=='Tab'||!activeDialog) return;
    const els=Array.from(activeDialog.querySelectorAll(focusable)).filter(el=>!el.hidden&&el.getClientRects().length);
    if(!els.length)return;
    const first=els[0],last=els[els.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  }
  function makeLife() {
    const cols=clamp(Math.floor(W/12),42,86);
    const rows=clamp(Math.floor(H/12),30,62);
    const cells=new Uint8Array(cols*rows);
    for(let i=0;i<cells.length;i++) cells[i]=Math.random()<.225?1:0;
    return {cols,rows,cells};
  }
  function addRipple(x,y){room.ripples.push({x,y,age:0});if(room.ripples.length>50)room.ripples.shift();}
  function resetRoom() {
    room.ripples=[];room.life=makeLife();room.lifeStep=0;room.mind=0;room.perception=[];
    room.follow={x:W/2,y:H/2};room.started=performance.now();room.lastTrace=0;
    for(let i=0;i<3;i++)addRipple(W/2,H/2);
    room.dirty=true;
    rctx.fillStyle=pal.bg1;rctx.fillRect(0,0,W,H);
  }
  function openRoom(name,trigger) {
    if (!rooms[name]) return;
    if(!activeDialog){previousFocus=trigger||document.activeElement;}
    room.name=name;room.trigger=trigger||document.activeElement;
    const d=rooms[name];
    $('roomNumber').textContent=d.number;
    $('roomTitle').textContent=d.title;
    $('roomCaption').textContent=d.caption;
    $('roomText').textContent=d.text;
    $('roomHint').textContent=d.hint;
    overlay.hidden=false;helpModal.hidden=true;activeDialog=overlay;
    resetRoom();$('closeRoom').focus();
  }
  function closeRoom() {
    if(!room.name)return;
    room.name=null;overlay.hidden=true;activeDialog=null;
    const target=previousFocus;previousFocus=null;
    if(target?.isConnected)target.focus();
  }
  const memoryEls = {visits:$('mem-visits'),first:$('mem-first'),last:$('mem-last')};
  function showMemory() {
    if(room.name)closeRoom();
    previousFocus=document.activeElement;
    memoryEls.visits.textContent=memory.visits.toLocaleString('ko-KR')+'회';
    memoryEls.first.textContent=formatDate(memory.first);
    memoryEls.last.textContent=formatDate(memory.last);
    $('forget-btn').textContent='기억 지우기';$('cancel-forget').hidden=true;
    $('memory-message').textContent='';helpModal.hidden=false;activeDialog=helpModal;
    $('close-memory').focus();
  }
  function closeMemory() {
    if(helpModal.hidden)return;
    helpModal.hidden=true;activeDialog=null;
    if(previousFocus?.isConnected)previousFocus.focus();
    previousFocus=null;
  }
  $('memory-btn').addEventListener('click',showMemory);
  $('close-memory').addEventListener('click',closeMemory);
  helpModal.addEventListener('pointerdown',e=>{if(e.target===helpModal)closeMemory();});
  $('forget-btn').addEventListener('click',()=>{
    const btn=$('forget-btn');
    if(btn.dataset.confirm!=='true'){
      btn.dataset.confirm='true';btn.textContent='정말 지우기';$('cancel-forget').hidden=false;
      $('memory-message').textContent='다음 선택 시 이 브라우저의 방문 기록을 지웁니다.';
      return;
    }
    const ok=[keys.visits,keys.last,keys.first].map(safeRemove).every(Boolean);
    if(ok){
      memory.visits=1;memory.last=null;memory.first=Date.now();
      safeWrite(keys.visits,1);safeWrite(keys.last,memory.first);safeWrite(keys.first,memory.first);
      updateVisitBadge();
      memoryEls.visits.textContent='1회';memoryEls.first.textContent=formatDate(memory.first);memoryEls.last.textContent='기록 없음';
      greetEl.textContent='새로운 첫 만남입니다.\n당신의 기억은 이곳에서 다시 시작됩니다.';
      $('memory-message').textContent='이전 방문 기록을 삭제했습니다. 현재 방문은 첫 방문으로 기록됩니다.';
    } else $('memory-message').textContent='브라우저가 저장소 삭제를 허용하지 않았습니다. 브라우저 설정을 확인해 주세요.';
    btn.dataset.confirm='false';btn.textContent='기억 지우기';$('cancel-forget').hidden=true;
  });
  $('cancel-forget').addEventListener('click',()=>{$('forget-btn').dataset.confirm='false';$('forget-btn').textContent='기억 지우기';$('cancel-forget').hidden=true;$('memory-message').textContent='취소했습니다.';});
  document.querySelectorAll('#rooms [data-room]').forEach(btn=>btn.addEventListener('click',()=>openRoom(btn.dataset.room,btn)));
  $('closeRoom').addEventListener('click',closeRoom);
  $('roomReset').addEventListener('click',resetRoom);
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape') {if(!helpModal.hidden)closeMemory();else closeRoom();return;}
    trapFocus(e);
    if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('button,input,textarea,select'))return;
    if(!activeDialog && /^[1-4]$/.test(e.key)){
      const names=['time','life','mind','perception'];openRoom(names[Number(e.key)-1],document.querySelector(`[data-room="${names[Number(e.key)-1]}"]`));
    }
  });

  function roomPointer(e) {
    if(!room.name)return;
    const x=e.clientX,y=e.clientY;
    if(room.name==='time'){addRipple(x,y);}
    if(room.name==='life'){
      const grid=room.life,{cols,rows,cells}=grid;
      const ix=Math.floor(x/W*cols),iy=Math.floor(y/H*rows);
      for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
        const xx=(ix+ox+cols)%cols,yy=(iy+oy+rows)%rows;
        if(Math.random()>.2)cells[yy*cols+xx]=1;
      }
      room.dirty=true;
    }
    if(room.name==='mind')room.mind+=.54;
    if(room.name==='perception')room.perception.push({x,y,age:0});
  }
  roomCanvas.addEventListener('pointerdown',(e)=>{roomPointer(e);roomCanvas.setPointerCapture?.(e.pointerId);});
  roomCanvas.addEventListener('pointermove',(e)=>{if(room.name==='life'&&e.buttons)roomPointer(e);});
  function timeFrame(dt,t){
    rctx.fillStyle=`rgba(${pal.rgb.join(',')},${lowMotion.matches?1:.18})`;rctx.fillRect(0,0,W,H);
    if(t-room.started>room.lastTrace+1100){room.lastTrace=t-room.started;addRipple(random(W*.2,W*.8),random(H*.25,H*.75));}
    for(let i=room.ripples.length-1;i>=0;i--){
      const ripple=room.ripples[i];ripple.age+=dt*.85;
      const radius=ripple.age*2.4;const alpha=clamp(1-ripple.age/200,0,1);
      if(alpha<=0){room.ripples.splice(i,1);continue;}
      for(let j=0;j<3;j++){rctx.strokeStyle=`hsla(${pal.hue},68%,74%,${alpha*(.32-j*.07)})`;rctx.lineWidth=j===0?1.2:.6;rctx.beginPath();rctx.arc(ripple.x,ripple.y,Math.max(0,radius-j*17),0,TAU);rctx.stroke();}
    }
  }
  function lifeStep() {
    const {cols,rows,cells}=room.life;const next=new Uint8Array(cells.length);
    let living=0;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      let n=0;
      for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(i||j){const xx=(x+i+cols)%cols,yy=(y+j+rows)%rows;n+=cells[yy*cols+xx];}
      const id=y*cols+x;next[id]=cells[id]?(n===2||n===3?1:0):(n===3?1:0);living+=next[id];
    }
    if(living<15)for(let i=0;i<Math.floor(cols*rows*.12);i++)next[Math.floor(Math.random()*next.length)]=1;
    room.life.cells=next;room.dirty=true;
  }
  function lifeFrame(t) {
    if(t-room.lifeStep>210){lifeStep();room.lifeStep=t;}
    if(!room.dirty)return;
    room.dirty=false;
    const {cols,rows,cells}=room.life;
    rctx.fillStyle=pal.bg1;rctx.fillRect(0,0,W,H);
    const cw=W/cols,ch=H/rows;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(cells[y*cols+x]){
      const hue=pal.hue+(x+y)%13*2;
      rctx.fillStyle=`hsla(${hue},72%,70%,.75)`;
      rctx.fillRect(x*cw+cw*.14,y*ch+ch*.14,cw*.72,ch*.72);
    }
  }
  function mindFrame(t) {
    rctx.fillStyle=pal.bg1;rctx.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2,maxR=Math.min(W,H)*.37;
    const mx=pointer.active?pointer.x/W:.5,my=pointer.active?pointer.y/H:.5;
    const petals=7+Math.round(mx*6);
    for(let ring=0;ring<13;ring++){
      const radius=maxR*(.15+ring*.065);
      rctx.beginPath();
      for(let k=0;k<=240;k++){
        const a=k/240*TAU;
        const ripple=Math.sin(a*petals+t*.00055+ring*.36+room.mind)*(.06+my*.06);
        const rad=radius*(1+ripple);
        const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;
        if(k===0)rctx.moveTo(x,y);else rctx.lineTo(x,y);
      }
      rctx.strokeStyle=`hsla(${pal.hue+ring*4},65%,72%,${.12+ring*.018})`;
      rctx.lineWidth=ring%4===0?1.3:.65;rctx.stroke();
    }
    rctx.fillStyle=`hsla(${pal.hue},85%,80%,.85)`;
    rctx.beginPath();rctx.arc(cx,cy,3+2*Math.sin(t*.002),0,TAU);rctx.fill();
  }
  function perceptionFrame(dt,t) {
    rctx.fillStyle=`rgba(${pal.rgb.join(',')},${lowMotion.matches?1:.25})`;rctx.fillRect(0,0,W,H);
    const goalX=pointer.active?pointer.x:W/2,goalY=pointer.active?pointer.y:H/2;
    room.follow.x=lerp(room.follow.x,goalX,lowMotion.matches?1:clamp(dt*.035,0,1));
    room.follow.y=lerp(room.follow.y,goalY,lowMotion.matches?1:clamp(dt*.035,0,1));
    if(pointer.active && t-room.lastTrace>55){room.lastTrace=t;room.perception.push({x:goalX,y:goalY,age:0});}
    if(room.perception.length>75)room.perception.splice(0,room.perception.length-75);
    for(let i=room.perception.length-1;i>=0;i--){
      const d=room.perception[i];d.age+=dt;
      if(d.age>135){room.perception.splice(i,1);continue;}
      const a=(1-d.age/135)*.35;
      rctx.fillStyle=`hsla(${pal.hue},80%,76%,${a})`;rctx.beginPath();rctx.arc(W-d.x,d.y,2,0,TAU);rctx.fill();
    }
    const reflection={x:W-room.follow.x,y:room.follow.y};
    rctx.lineWidth=1;rctx.strokeStyle=`hsla(${pal.hue},65%,70%,.24)`;
    rctx.beginPath();rctx.moveTo(goalX,goalY);rctx.lineTo(reflection.x,reflection.y);rctx.stroke();
    for(const [x,y,r,alpha] of [[goalX,goalY,5,.93],[reflection.x,reflection.y,9,.75]]){
      const grad=rctx.createRadialGradient(x,y,0,x,y,48);
      grad.addColorStop(0,`hsla(${pal.hue},75%,85%,${alpha*.3})`);grad.addColorStop(1,`hsla(${pal.hue},75%,85%,0)`);
      rctx.fillStyle=grad;rctx.fillRect(x-48,y-48,96,96);
      rctx.fillStyle=`hsla(${pal.hue},85%,88%,${alpha})`;rctx.beginPath();rctx.arc(x,y,r,0,TAU);rctx.fill();
    }
  }

  let audioCtx=null,audioMaster=null,audioOn=false;
  function ensureAudio() {
    if(audioCtx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    try {
      audioCtx=new AC();audioMaster=audioCtx.createGain();audioMaster.gain.value=0;audioMaster.connect(audioCtx.destination);
      for(const [i,f] of [55,82.41,110,164.81].entries()){
        const osc=audioCtx.createOscillator();osc.type=i%2?'sine':'triangle';osc.frequency.value=f;
        const gain=audioCtx.createGain();gain.gain.value=.16/(i+1);
        osc.connect(gain).connect(audioMaster);
        const lfo=audioCtx.createOscillator();lfo.frequency.value=.04+i*.016;
        const lfoGain=audioCtx.createGain();lfoGain.gain.value=1.2;
        lfo.connect(lfoGain).connect(osc.detune);
        osc.start();lfo.start();
      }
      return true;
    } catch { audioCtx=null;audioMaster=null;return false; }
  }
  const soundBtn=$('sound');
  soundBtn.addEventListener('click',async()=>{
    if(!ensureAudio()){
      soundBtn.title='이 브라우저에서는 오디오를 지원하지 않습니다.';
      soundBtn.setAttribute('aria-label','오디오를 지원하지 않습니다.');return;
    }
    try {
      if(audioCtx.state!=='running')await audioCtx.resume();
      audioOn=!audioOn;
      const t=audioCtx.currentTime;
      audioMaster.gain.cancelScheduledValues(t);
      audioMaster.gain.setValueAtTime(audioMaster.gain.value,t);
      audioMaster.gain.setTargetAtTime(audioOn?.11:0,t,.38);
      soundBtn.setAttribute('aria-pressed',String(audioOn));
      soundBtn.setAttribute('aria-label',audioOn?'명상 사운드 끄기':'명상 사운드 켜기');
      soundBtn.title=audioOn?'명상 사운드 끄기':'명상 사운드 켜기';
    } catch { soundBtn.title='오디오를 시작할 수 없습니다.'; }
  });
  document.addEventListener('visibilitychange',()=>{
    if(!audioCtx||!audioMaster)return;
    const t=audioCtx.currentTime;audioMaster.gain.cancelScheduledValues(t);
    audioMaster.gain.setTargetAtTime(document.hidden?0:(audioOn?.11:0),t,.2);
  });

  let raf=0,lastT=0,lastDraw=0;
  function frame(t) {
    raf=requestAnimationFrame(frame);
    if(document.hidden)return;
    const delay=lowMotion.matches?160:32;
    if(t-lastDraw<delay)return;
    const dt=lastT?clamp((t-lastT)/16.67,.1,3):1;
    lastT=t;lastDraw=t;
    if(room.name){
      if(room.name==='time')timeFrame(dt,t);
      else if(room.name==='life')lifeFrame(t);
      else if(room.name==='mind')mindFrame(t);
      else perceptionFrame(dt,t);
      return;
    }
    if(helpModal.hidden)drawBackground(t,dt);
  }
  resize();
  window.addEventListener('resize',resize,{passive:true});
  lowMotion.addEventListener?.('change',()=>{resize();});
  raf=requestAnimationFrame(frame);
  window.addEventListener('pageshow',()=>{lastT=0;});
})();
