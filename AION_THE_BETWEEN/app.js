/* AION — The Between. Standalone, dependency-free generative philosophical instrument. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const prefersLessMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
  const ROOMS = [
    {
      name: '관측', english: '01 / THE UNCHOSEN', accent: '#a8ded2',
      title: '당신이 바라보는 순간,\n하나의 세계가 됩니다.',
      description: '모든 갈래를 동시에 따라갈 수는 없습니다. 하나를 선택하면 그것은 당신의 이야기가 되고, 나머지는 조용한 가능성으로 남습니다. 이곳의 나무는 물리학적 사실의 모형이 아니라, 선택을 바라보는 하나의 은유입니다.',
      question: '선택하지 않은 삶은 존재하지 않는 삶일까요?',
      instructions: '나뭇가지 끝의 빛을 눌러 하나의 경로를 밝혀 보세요.', badge: '128 POSSIBLE ENDINGS', gesture: 'TOUCH A STAR',
      controls: '<button type="button" class="control-button" data-action="unchoose">모든 가능성 펼치기 ↗</button><button type="button" class="control-button" data-action="rebranch">다른 우주 생성 ↻</button><div class="control-hint">어두워진 길은 사라지지 않았습니다. 단지 지금의 주목에서 벗어났습니다.</div>'
    },
    {
      name: '시간', english: '02 / THE LIVING PRESENT', accent: '#dcbf9d',
      title: '지금이라는 점에는\n두 개의 그림자가 있습니다.',
      description: '지난 순간은 기억으로 재구성되고, 오지 않은 순간은 예상으로 그려집니다. 우리는 이 두 그림자 사이를 현재라고 부릅니다. 원을 움직이며 시간에 대한 감각이 어떻게 달라지는지 보세요.',
      question: '기억과 기대를 모두 내려놓으면, 지금은 얼마나 길까요?',
      instructions: '시간의 바늘을 움직이거나 자동 흐름을 멈춰 보세요.', badge: 'A PRESENT IN MOTION', gesture: 'DRAG THE MOMENT',
      controls: '<label class="slider-field" for="timeSlider"><span>지금의 위치</span><input id="timeSlider" type="range" min="0" max="100" value="50" data-setting="time"><output id="timeOutput">50</output></label><button type="button" class="control-button is-active" data-action="timeplay" id="timePlay">흐름 잠시 멈추기 Ⅱ</button><div class="control-hint">왼쪽은 기억, 오른쪽은 가능성입니다. 이 원은 시간을 측정하지 않습니다.</div>'
    },
    {
      name: '생명', english: '03 / WHAT REMAINS ALIVE', accent: '#b9d6a2',
      title: '살아 있다는 것은\n계속 달라진다는 뜻.',
      description: '한 알의 씨앗이 가지를 내고, 빛을 받으며, 잎을 잃고, 다시 다른 형상으로 돌아갑니다. 이 식물은 실제 생물학적 생장 예측이 아닌 생성 알고리즘입니다. 그 안의 변화만을 가만히 바라보세요.',
      question: '어제의 나와 오늘의 나가 다르다면, 무엇이 나를 나이게 할까요?',
      instructions: '빛과 변화의 양을 조절하고, 새로운 씨앗을 심어 보세요.', badge: 'GROWTH IS CHANGE', gesture: 'TAP TO PLANT AGAIN',
      controls: '<label class="slider-field" for="sunSlider"><span>빛</span><input id="sunSlider" type="range" min="10" max="100" value="72" data-setting="sun"><output id="sunOutput">72</output></label><label class="slider-field" for="entropySlider"><span>변화</span><input id="entropySlider" type="range" min="0" max="100" value="32" data-setting="entropy"><output id="entropyOutput">32</output></label><button type="button" class="control-button" data-action="newseed">새 씨앗 심기 ✳</button>'
    },
    {
      name: '마음', english: '04 / INNER WEATHER', accent: '#c2b6e8',
      title: '마음은 내가 아니라,\n나를 지나가는 날씨.',
      description: '고요와 불안, 기쁨과 그리움은 영원한 고정값이 아닙니다. 같은 마음의 바다도 어떤 이름으로 부르느냐에 따라 다른 무늬로 움직입니다. 이 방은 감정을 분석하거나 판단하지 않습니다.',
      question: '지나가는 감정에 이름을 붙이면, 그것은 얼마나 오래 머물까요?',
      instructions: '감정의 이름을 바꾸거나 수면에 손을 대보세요.', badge: 'NOTHING TO FIX', gesture: 'TOUCH THE SURFACE',
      controls: '<button type="button" class="control-button is-active" data-action="mood" data-value="calm">고요</button><button type="button" class="control-button" data-action="mood" data-value="longing">그리움</button><button type="button" class="control-button" data-action="mood" data-value="unease">불안</button><button type="button" class="control-button" data-action="mood" data-value="joy">기쁨</button><button type="button" class="control-button" data-action="breathe">느리게 숨 쉬기 ◌</button><div class="control-hint">어떤 감정이든 잘못된 값은 없습니다. 색과 파동은 예술적 표현입니다.</div>'
    },
    {
      name: '인지', english: '05 / THE MEANING MAKER', accent: '#e6bc9f',
      title: '별은 그대로인데,\n별자리는 달라집니다.',
      description: '바뀌는 것은 점이 아닙니다. 점과 점 사이에 우리가 그어 넣는 연결선입니다. 동일한 점들의 배열을 눈, 나무, 나선으로 읽어 보세요. 인간의 지각에 대한 엄밀한 실험이 아니라, 해석의 힘을 느끼는 장치입니다.',
      question: '내가 ‘본 것’ 중 얼마나 많은 부분이 사실이 아닌 해석일까요?',
      instructions: '별의 위치는 고정됩니다. 의미를 선택해 선만 바꿔 보세요.', badge: 'SAME POINTS. NEW STORY.', gesture: 'TAP TO CHANGE THE STORY',
      controls: '<button type="button" class="control-button is-active" data-action="view" data-value="eye">눈</button><button type="button" class="control-button" data-action="view" data-value="tree">나무</button><button type="button" class="control-button" data-action="view" data-value="spiral">나선</button><button type="button" class="control-button" data-action="togglelines" id="linesBtn">연결선 숨기기</button><div class="control-hint">점 하나도 이동하지 않습니다. 바뀌는 것은 그 사이에 그어진 선뿐입니다.</div>'
    },
    {
      name: '관계', english: '06 / THE INVISIBLE THREAD', accent: '#9dcee5',
      title: '나는 나 하나로\n끝나지 않습니다.',
      description: '네트워크의 한 점을 건드리면 가까운 이웃이 흔들리고, 그 이웃이 다른 이웃을 일깨웁니다. 모든 영향은 같은 크기나 속도로 번지지 않습니다. 이 파문은 사회의 실제 작동 방식이 아닌 관계성의 은유입니다.',
      question: '내가 남긴 영향은 어디까지 나의 일부일까요?',
      instructions: '아무 점이나 선택해 파문이 도착하는 순서를 지켜보세요.', badge: 'EVERY TOUCH TRAVELS', gesture: 'TOUCH A NODE',
      controls: '<button type="button" class="control-button" data-action="ripplenet">임의의 별 깨우기 ✳</button><button type="button" class="control-button" data-action="renet">다른 관계 만들기 ↻</button><div class="control-hint">밝은 점은 영향이 도달한 곳입니다. 멀리 있는 점도 때때로 이어져 있습니다.</div>'
    },
    {
      name: '무한', english: '07 / THE EDGE WITHOUT AN END', accent: '#dcbca5',
      title: '끝을 찾으러 갔더니,\n그 안에 또 세계가 있었습니다.',
      description: '한 가지 간단한 규칙 z → z² + c를 반복하면 끝없이 복잡한 경계가 나타납니다. 이것은 실제 망델브로 집합을 계산한 것입니다. 어느 경계든 누르면 그곳으로 더 깊이 들어갑니다.',
      question: '단순한 규칙이 이토록 복잡한 세상을 만든다면, 복잡함의 근원은 무엇일까요?',
      instructions: '형태의 경계를 눌러 확대하세요. 여러 번 들어가 보세요.', badge: 'z → z² + c', gesture: 'CLICK THE EDGE TO ZOOM',
      controls: '<button type="button" class="control-button" data-action="zoomin">더 깊이 ＋</button><button type="button" class="control-button" data-action="zoomout">한 발 뒤로 −</button><button type="button" class="control-button" data-action="zoomreset">처음의 경계 ↺</button><div class="control-hint" id="zoomLabel">확대 배율 1.0× · 경계를 눌러 확대할 수 있습니다.</div>'
    }
  ];

  const roomButtons = Array.from(document.querySelectorAll('[data-room]'));
  const ambient = $('atmosphere');
  const ambientCtx = ambient.getContext('2d', {alpha:true});
  const canvas = $('worldCanvas');
  const ctx = canvas.getContext('2d', {alpha:false});
  const notebookCanvas = $('journalCanvas');
  const notebookCtx = notebookCanvas.getContext('2d');
  const storageKey = 'aion-between-notes-v1';
  const state = {
    page:'landing', room:0, visited:new Set(), t:0, running:!prefersLessMotion, lastFrame:0, lastPaint:0,
    notes:loadNotes(), started:Date.now(), pointer:{x:0,y:0,active:false},
    choice:-1, branchSeed:19, time:50, timePlaying:true,
    sun:72, entropy:32, lifeSeed:17, lifeAge:.1,
    mood:'calm', breathingUntil:0, ripples:[],
    view:'eye', showLines:true,
    netSeed:53, netWave:null,
    fractal:{cx:-.65, cy:0, span:3.2, maxIter:90},
    fractalDirty:true, fractalRow:0, fractalView:null,
    audio:false, audioContext:null, audioNodes:null
  };
  let ambientStars=[], roomStars=[], branches=[], leaves=[], perceptionStars=[], perceptionPaths={}, netNodes=[], netEdges=[], pathSet=new Set();
  let fractalCanvas=document.createElement('canvas'), fractalCtx=fractalCanvas.getContext('2d', {willReadFrequently:true}), fractalPixels=null;
  let stageW=0,stageH=0,ambientW=0,ambientH=0,stageDpr=1;
  let toastHandle=0;

  function loadNotes(){try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.text==='string'&&Number.isInteger(x.room)).slice(-150):[];}catch(e){return [];}}
  function storeNotes(){try{localStorage.setItem(storageKey,JSON.stringify(state.notes));return true;}catch(e){return false;}}
  function clamp(a,min,max){return Math.min(max,Math.max(min,a));}
  function lerp(a,b,t){return a+(b-a)*t;}
  function rand(seed){let a=seed>>>0;return function(){a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function hexRgb(hex){const v=parseInt(hex.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];}
  function rgba(hex,a){const c=hexRgb(hex);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
  function sizeCanvas(el,context,w,h,dpr){const width=Math.max(1,Math.round(w*dpr)),height=Math.max(1,Math.round(h*dpr));if(el.width!==width||el.height!==height){el.width=width;el.height=height;}context.setTransform(dpr,0,0,dpr,0,0);}
  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,isSmall?1.5:1.8);
    ambientW=innerWidth;ambientH=innerHeight;
    if(ambientCtx)sizeCanvas(ambient,ambientCtx,ambientW,ambientH,Math.min(dpr,1.4));
    const rect=canvas.getBoundingClientRect();stageW=rect.width;stageH=rect.height;stageDpr=dpr;
    if(ctx&&stageW>10&&stageH>10)sizeCanvas(canvas,ctx,stageW,stageH,dpr);
    state.fractalDirty=true;makeStars();
    if(state.page==='notebook')paintNotebook();
  }
  function makeStars(){const r=rand(5381),r2=rand(4034);ambientStars=Array.from({length:Math.min(170,Math.floor(ambientW*ambientH/7500))},()=>({x:r()*ambientW,y:r()*ambientH,z:.3+r()*1.2,phase:r()*TAU}));roomStars=Array.from({length:75},()=>({x:(r2()-.5)*640,y:(r2()-.5)*475,z:r2()*.8+.2,phase:r2()*TAU}));}
  function refreshCounts(){$('noteCount').textContent=String(state.notes.length);}
  function setPage(page){state.page=page; $('landing').hidden=page!=='landing';$('experience').hidden=page!=='room';$('notebook').hidden=page!=='notebook';roomButtons.forEach(b=>{b.classList.toggle('active',page==='room'&&Number(b.dataset.room)===state.room);if(page==='room'&&Number(b.dataset.room)===state.room)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    if(page==='room')requestAnimationFrame(resize);if(page==='notebook')requestAnimationFrame(paintNotebook);window.scrollTo({top:0,behavior:prefersLessMotion?'instant':'smooth'});
  }
  function openRoom(i){
    state.room=clamp(i,0,6);state.visited.add(state.room);const r=ROOMS[state.room];document.documentElement.style.setProperty('--scene',r.accent);
    $('roomEnglish').textContent=r.english;$('roomFraction').textContent='/ '+String(state.room+1).padStart(2,'0')+' — 07';$('roomHeading').textContent=r.title;$('roomDescription').textContent=r.description;$('roomQuestion').textContent=r.question;$('sceneControls').innerHTML=r.controls;$('canvasBadge').textContent=r.badge;$('canvasGesture').textContent=r.gesture;$('stageCounter').textContent=String(state.room+1).padStart(2,'0')+' / 07';$('stageMessage').textContent=r.instructions;$('previousBtn').textContent=state.room===0?'← 시작으로':'← 이전의 질문';$('nextBtn').innerHTML=state.room===6?'나의 별자리 <span>↗</span>':'다음 질문 <span>↗</span>';
    $('reflectionText').value='';$('reflectionHint').textContent='이 기록은 이 기기에만 저장됩니다.';
    state.ripples=[];
    if(state.room===0){rebranch(false);}else if(state.room===2){makeLife();}else if(state.room===4){makePerception();}else if(state.room===5){makeNetwork();}else if(state.room===6){state.fractalDirty=true;setZoomLabel();}
    if(state.room===1){$('timeSlider').value=String(Math.round(state.time));$('timeOutput').textContent=String(Math.round(state.time));updateTimeButton();}
    if(state.room===3)updateSelection('mood',state.mood);
    if(state.room===4){updateSelection('view',state.view);updateLineButton();}
    setPage('room');
  }
  function updateSelection(action,value){document.querySelectorAll('[data-action="'+action+'"]').forEach(b=>b.classList.toggle('is-active',b.dataset.value===value));}
  function updateTimeButton(){const b=$('timePlay');if(b){b.classList.toggle('is-active',state.timePlaying);b.textContent=state.timePlaying?'흐름 잠시 멈추기 Ⅱ':'다시 흘려보내기 ▶';}}
  function updateLineButton(){const b=$('linesBtn');if(b)b.textContent=state.showLines?'연결선 숨기기':'연결선 보이기';}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.remove('visible'),3000);}
  function setStatus(msg){$('stageMessage').textContent=msg;}

  function rebranch(announce=true){state.branchSeed+=41;let r=rand(state.branchSeed);branches=[];pathSet=new Set();state.choice=-1;let id=0;
    function grow(x,y,angle,len,depth,parent){const node={id:id++,x,y,depth,parent};branches.push(node);if(depth>=7)return;for(const side of [-1,1]){let a=angle+side*(.31+r()*.18);const nx=x+Math.cos(a)*len,ny=y+Math.sin(a)*len;grow(nx,ny,a,len*(.755+r()*.024),depth+1,node.id);}}
    grow(-248,0,0,108,0,-1);if(announce)setStatus('모든 가능성이 다시 펼쳐졌습니다. 하나의 끝을 선택하세요.');
  }
  function chooseBranch(x,y){if(!branches.length)rebranch(false);const leaves=branches.filter(b=>b.depth>=7);let nearest=null,min=Infinity;for(const n of leaves){const d=(n.x-x)**2+(n.y-y)**2;if(d<min){nearest=n;min=d;}}if(!nearest)return;state.choice=nearest.id;pathSet=new Set();let n=nearest;while(n){pathSet.add(n.id);n=branches[n.parent]||null;}setStatus('당신이 고른 하나의 길. 어두워진 127개의 끝도 여전히 남아 있습니다.');}
  function makeLife(){const r=rand(state.lifeSeed), temp=[];leaves=[];let count=0;
    function stem(x,y,a,len,depth){const nx=x+Math.cos(a)*len,ny=y+Math.sin(a)*len;temp.push({x,y,nx,ny,depth,idx:count++});if(depth===8){leaves.push({x:nx,y:ny,angle:a,rand:r()});return;}for(const side of [-1,1])stem(nx,ny,a+side*(.34+r()*.28)+(r()-.5)*.11,len*(.73+r()*.055),depth+1);}
    stem(0,198,-Math.PI/2,85,0);state.lifeBranches=temp;
  }
  function makePerception(){const r=rand(83265);perceptionStars=[];
    const add=(x,y)=>{perceptionStars.push({x:x+(r()-.5)*3,y:y+(r()-.5)*3,glow:r()})};
    for(let i=0;i<69;i++)add((r()-.5)*530,(r()-.5)*365);
    const eye=[];for(const side of [-1,1]){const path=[];for(let j=0;j<=16;j++){const a=j/16*Math.PI;add(-195+390*j/16,-22+side*Math.sin(a)*78);path.push(perceptionStars.length-1);}eye.push(path);}const iris=[];for(let j=0;j<=15;j++){const a=j/15*TAU;add(Math.cos(a)*48,-22+Math.sin(a)*48);iris.push(perceptionStars.length-1);}eye.push(iris);
    const tree=[];let path=[];for(let j=0;j<=11;j++){add(-4+Math.sin(j*.7)*3,167-j*26);path.push(perceptionStars.length-1);}tree.push(path);for(let a=-1;a<=1;a+=2){for(let n=0;n<4;n++){path=[];const y0=70-n*49;for(let j=0;j<=8;j++){const t=j/8;add(-4+a*t*(120-n*13),y0-t*(80-n*7));path.push(perceptionStars.length-1);}tree.push(path);}}
    const spiral=[];for(let j=0;j<=66;j++){const a=j/66*Math.PI*5.7,radius=8+j*2.8;add(Math.cos(a)*radius,Math.sin(a)*radius);spiral.push(perceptionStars.length-1);}
    perceptionPaths={eye,tree,spiral:[spiral]};
  }
  function makeNetwork(){const r=rand(state.netSeed);netNodes=[];const rings=[[10,66],[23,145],[27,221]];let id=0;
    rings.forEach(([count,rad],ri)=>{for(let j=0;j<count;j++){let a=(j+r()*.55)/count*TAU+(ri*.17);let rr=rad+(r()-.5)*35;netNodes.push({id:id++,x:Math.cos(a)*rr,y:Math.sin(a)*rr*.78,layer:ri,neighbors:[]});}});
    netEdges=[];const used=new Set();function connect(a,b){if(a===b)return;const key=[Math.min(a,b),Math.max(a,b)].join('-');if(used.has(key))return;used.add(key);netEdges.push([a,b]);netNodes[a].neighbors.push(b);netNodes[b].neighbors.push(a);}
    netNodes.forEach((a,i)=>{const nearest=netNodes.map((b,j)=>({j,d:(a.x-b.x)**2+(a.y-b.y)**2})).filter(x=>x.j!==i).sort((x,y)=>x.d-y.d);nearest.slice(0,3).forEach(x=>connect(i,x.j));});
    // A few long bridges make the network's global reach visible.
    for(let j=0;j<9;j++)connect(Math.floor(r()*netNodes.length),Math.floor(r()*netNodes.length));
    state.netWave=null;
  }
  function wakeNetwork(index){const distances=Array(netNodes.length).fill(Infinity);distances[index]=0;let queue=[index];for(let p=0;p<queue.length;p++){const at=queue[p];for(const to of netNodes[at].neighbors){if(distances[to]===Infinity){distances[to]=distances[at]+1;queue.push(to);}}}state.netWave={start:state.t,distances,index};setStatus('한 점에서 시작한 움직임이 '+distances.filter(Number.isFinite).length+'개의 연결된 점을 향해 전해집니다.');}
  function setZoomLabel(){const el=$('zoomLabel');if(el)el.textContent='확대 배율 '+(3.2/state.fractal.span).toLocaleString('ko-KR',{maximumFractionDigits:2})+'× · 경계를 눌러 확대할 수 있습니다.';}
  function changeZoom(factor,x=0,y=0){const f=state.fractal;const ns=clamp(f.span*factor,.000000000005,5.8);if(stageW&&stageH){f.cx+=(x/stageW-.5)*f.span*(1-ns/f.span);f.cy+=(y/stageH-.5)*f.span*(stageH/stageW)*(1-ns/f.span);}f.span=ns;f.maxIter=clamp(Math.floor(90+Math.log2(3.2/ns)*7),90,220);state.fractalDirty=true;setZoomLabel();setStatus('경계 안에서 새로운 경계가 나타납니다. 더 가까이 다가가 보세요.');}
  function zoomAtPoint(x,y,factor){const f=state.fractal;f.cx+=(x/stageW-.5)*f.span;f.cy+=(y/stageH-.5)*f.span*stageH/stageW;f.span=clamp(f.span*factor,.000000000005,5.8);f.maxIter=clamp(Math.floor(90+Math.log2(3.2/f.span)*7),90,220);state.fractalDirty=true;setZoomLabel();setStatus('선택한 위치를 중심으로 새로운 세계를 계산합니다.');}
  function resetStage(){const id=state.room;
    if(id===0)rebranch();if(id===1){state.time=50;state.timePlaying=true;$('timeSlider').value='50';$('timeOutput').textContent='50';updateTimeButton();}if(id===2){state.sun=72;state.entropy=32;state.lifeAge=.1;state.lifeSeed+=7;makeLife();$('sunSlider').value='72';$('sunOutput').textContent='72';$('entropySlider').value='32';$('entropyOutput').textContent='32';}if(id===3){state.mood='calm';state.ripples=[];state.breathingUntil=0;updateSelection('mood','calm');}if(id===4){state.view='eye';state.showLines=true;updateSelection('view','eye');updateLineButton();}if(id===5){state.netSeed+=17;makeNetwork();}if(id===6){state.fractal={cx:-.65,cy:0,span:3.2,maxIter:90};state.fractalDirty=true;setZoomLabel();}
    setStatus(ROOMS[id].instructions);
  }
  function handleAction(action,value){switch(action){
    case 'unchoose':state.choice=-1;pathSet.clear();setStatus('당신의 주목을 거두자 모든 갈래가 다시 보입니다.');break;
    case 'rebranch':rebranch();break;
    case 'timeplay':state.timePlaying=!state.timePlaying;updateTimeButton();break;
    case 'newseed':state.lifeSeed+=11;state.lifeAge=.04;makeLife();setStatus('똑같은 시작에서도 새로운 나무가 자랍니다.');break;
    case 'mood':state.mood=value;state.ripples=[];updateSelection('mood',value);setStatus('같은 표면에 다른 이름이 놓였습니다. 지금 느껴지는 움직임을 살펴보세요.');break;
    case 'breathe':state.breathingUntil=state.t+9;setStatus('9초 동안 파도가 느려집니다. 당신의 호흡을 강요하지 않습니다.');break;
    case 'view':state.view=value;state.showLines=true;updateSelection('view',value);updateLineButton();setStatus('별의 위치는 그대로입니다. 달라진 것은 연결한 방식입니다.');break;
    case 'togglelines':state.showLines=!state.showLines;updateLineButton();setStatus(state.showLines?'연결선을 다시 그었습니다.':'선이 사라지니 오직 점만 남았습니다.');break;
    case 'ripplenet':wakeNetwork(Math.floor(Math.random()*netNodes.length));break;
    case 'renet':state.netSeed+=19;makeNetwork();setStatus('서로 다른 연결들이 또 다른 공동체를 만들었습니다.');break;
    case 'zoomin':changeZoom(.48);break;
    case 'zoomout':changeZoom(2.1);break;
    case 'zoomreset':state.fractal={cx:-.65,cy:0,span:3.2,maxIter:90};state.fractalDirty=true;setZoomLabel();setStatus('시작으로 돌아왔습니다. 경계는 여전히 끝나지 않습니다.');break;
  }}
  $('sceneControls').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handleAction(b.dataset.action,b.dataset.value);});
  $('sceneControls').addEventListener('input',e=>{const el=e.target.closest('[data-setting]');if(!el)return;const v=Number(el.value);switch(el.dataset.setting){case 'time':state.time=v;state.timePlaying=false;updateTimeButton();$('timeOutput').textContent=String(v);break;case 'sun':state.sun=v;$('sunOutput').textContent=String(v);break;case 'entropy':state.entropy=v;$('entropyOutput').textContent=String(v);break;}});

  function pointerToField(e){const rect=canvas.getBoundingClientRect();const x=e.clientX-rect.left,y=e.clientY-rect.top;const factor=Math.min(rect.width/680,rect.height/530)||1;return {pixelX:x,pixelY:y,x:(x-rect.width/2)/factor,y:(y-rect.height/2)/factor};}
  function stageInteract(e){if(state.page!=='room')return;const p=pointerToField(e);
    if(state.room===0){chooseBranch(p.x,p.y);}else if(state.room===1){state.time=clamp(Math.round(p.pixelX/stageW*100),0,100);state.timePlaying=false;const el=$('timeSlider');if(el){el.value=String(state.time);$('timeOutput').textContent=String(state.time);}updateTimeButton();}
    else if(state.room===2){state.lifeSeed+=13;state.lifeAge=.03;makeLife();setStatus('땅에 다른 씨앗을 심었습니다. 나무가 다시 시작합니다.');}
    else if(state.room===3){state.ripples.push({x:p.x,y:p.y,t:state.t});if(state.ripples.length>12)state.ripples.shift();setStatus('손끝의 한 번의 접촉이 마음의 수면을 지나갑니다.');}
    else if(state.room===4){state.view={eye:'tree',tree:'spiral',spiral:'eye'}[state.view];state.showLines=true;updateSelection('view',state.view);updateLineButton();setStatus('같은 점. 다른 이야기. 무엇이 정말로 달라졌을까요?');}
    else if(state.room===5){let nearest=0,best=Infinity;for(const n of netNodes){const d=(n.x-p.x)**2+(n.y-p.y)**2;if(d<best){best=d;nearest=n.id;}}wakeNetwork(nearest);}
    else if(state.room===6){if(stageW&&stageH)zoomAtPoint(p.pixelX,p.pixelY,.5);}
  }
  canvas.addEventListener('pointerdown',stageInteract);
  canvas.addEventListener('pointermove',e=>{if(state.page!=='room')return;const p=pointerToField(e);state.pointer={x:p.x,y:p.y,active:true};});
  canvas.addEventListener('pointerleave',()=>{state.pointer.active=false;});
  canvas.addEventListener('wheel',e=>{if(state.page==='room'&&state.room===6){e.preventDefault();const p=pointerToField(e);zoomAtPoint(p.pixelX,p.pixelY,e.deltaY<0?.8:1.25);}},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stageInteract({clientX:canvas.getBoundingClientRect().left+stageW*.5,clientY:canvas.getBoundingClientRect().top+stageH*.5});}});
  document.addEventListener('keydown',e=>{const target=e.target;if(target&&(target.matches('input,textarea,select')||target.isContentEditable))return;
    if(e.key==='Escape'&&state.page==='notebook')openRoom(state.room);
    if(e.key==='ArrowRight'&&state.page==='room'){e.preventDefault();if(state.room===6)showNotebook();else openRoom(state.room+1);}
    if(e.key==='ArrowLeft'&&state.page==='room'){e.preventDefault();openRoom(Math.max(0,state.room-1));}
    if(/^[1-7]$/.test(e.key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey)openRoom(Number(e.key)-1);
  });

  function drawAmbient(){if(!ambientCtx)return;const c=ambientCtx,w=ambientW,h=ambientH;if(!w||!h)return;c.clearRect(0,0,w,h);
    const active=state.page==='landing',x=active?w*.78:w*.77,y=active?h*.52:h*.4;
    let glow=c.createRadialGradient(x,y,3,x,y,Math.max(w*.45,340));glow.addColorStop(0,active?'rgba(78,112,116,.12)':'rgba(48,75,84,.085)');glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);
    for(const s of ambientStars){const a=.14+.13*Math.sin(state.t*.3+s.phase);c.beginPath();c.arc(s.x,s.y,s.z,0,TAU);c.fillStyle='rgba(209,226,224,'+a+')';c.fill();}
    if(!active)return;
    c.save();c.translate(x,y);const scale=Math.min(w/1300,h/800,1.2);c.scale(scale,scale);c.globalCompositeOperation='screen';
    for(let k=0;k<30;k++){c.beginPath();const off=k*.081;for(let j=0;j<=170;j++){const f=j/170,a=f*TAU*2.2+off+state.t*.035;const spread=130+110*Math.sin(f*Math.PI);const radius=spread*(.65+.26*Math.sin(3*a+k*.27));const xx=Math.cos(a)*(radius+30*Math.sin(f*8+k*.33));const yy=Math.sin(a)*radius*.69+Math.sin(a*2.5+off)*18;if(j===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.strokeStyle=k%4===0?'rgba(224,188,145,.12)':'rgba(142,210,205,.07)';c.lineWidth=k%5===0?1.15:.65;c.stroke();}
    c.restore();
  }
  function paintBase(c,w,h){c.clearRect(0,0,w,h);const bg=c.createRadialGradient(w*.5,h*.47,5,w*.5,h*.52,Math.max(w,h)*.7);bg.addColorStop(0,'#13212c');bg.addColorStop(.56,'#0c1721');bg.addColorStop(1,'#09121a');c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.save();c.translate(w/2,h/2);const scale=Math.min(w/680,h/530);c.scale(scale,scale);
    c.strokeStyle='rgba(205,227,226,.048)';c.lineWidth=.7;for(let i=-300;i<=300;i+=50){c.beginPath();c.moveTo(i,-250);c.lineTo(i,250);c.stroke();}for(let j=-250;j<=250;j+=50){c.beginPath();c.moveTo(-330,j);c.lineTo(330,j);c.stroke();}
    for(const s of roomStars){c.fillStyle='rgba(208,224,222,'+(.10+s.z*.21)+')';c.beginPath();c.arc(s.x,s.y,s.z*.7,0,TAU);c.fill();}c.restore();
  }
  function stageTransform(c,w,h){c.save();c.translate(w/2,h/2);c.scale(Math.min(w/680,h/530),Math.min(w/680,h/530));}
  function paintChoice(c){if(!branches.length)rebranch(false);const accent=ROOMS[0].accent;for(let i=1;i<branches.length;i++){const n=branches[i],p=branches[n.parent];if(!p)continue;const active=state.choice>=0&&pathSet.has(i);const faded=state.choice>=0&&!active;let alpha=faded?.025:active?.95:clamp(.18-n.depth*.013,.055,.19);c.strokeStyle=active?rgba(accent,alpha):'rgba(129,203,195,'+alpha+')';c.lineWidth=active?2.5:Math.max(.55,1.45-n.depth*.11);c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(lerp(p.x,n.x,.5),lerp(p.y,n.y,.5)+(n.y-p.y)*.1,n.x,n.y);c.stroke();}
    for(const n of branches){if(n.depth!==7)continue;const chosen=state.choice===n.id;const unchosen=state.choice>=0&&!chosen;c.beginPath();const r=chosen?3.5:1.7+Math.sin(state.t*1.3+n.id)*.45;c.arc(n.x,n.y,r,0,TAU);c.fillStyle=unchosen?'rgba(147,180,172,.14)':chosen?'#fff4d7':'rgba(157,219,207,.65)';c.fill();if(chosen){const g=c.createRadialGradient(n.x,n.y,0,n.x,n.y,31);g.addColorStop(0,'rgba(230,249,227,.45)');g.addColorStop(1,'rgba(230,249,227,0)');c.fillStyle=g;c.beginPath();c.arc(n.x,n.y,31,0,TAU);c.fill();}}
    c.fillStyle='#e4cdaa';c.beginPath();c.arc(-248,0,3.7,0,TAU);c.fill();c.font='10px Georgia,serif';c.letterSpacing='1px';c.fillStyle='rgba(204,214,205,.5)';c.fillText('ORIGIN',-286,25);
    if(state.choice<0){c.font='11px Georgia,serif';c.fillStyle='rgba(176,213,207,.6)';c.fillText('128',170,178);c.font='9px Georgia,serif';c.fillStyle='rgba(176,213,207,.35)';c.fillText('FUTURES',163,196);}
  }
  function paintTime(c){const v=state.time/100;const t=state.t;const cx=0,cy=0;
    const halo=c.createRadialGradient(0,0,20,0,0,228);halo.addColorStop(0,'rgba(185,154,122,.08)');halo.addColorStop(.65,'rgba(123,147,153,.06)');halo.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=halo;c.beginPath();c.arc(0,0,225,0,TAU);c.fill();
    for(let layer=0;layer<19;layer++){const radius=51+layer*9.1;c.lineWidth=layer%5===0?1.3:.65;c.strokeStyle=layer%3===0?'rgba(222,193,154,.13)':'rgba(178,208,208,.11)';c.beginPath();for(let n=0;n<=140;n++){const a=n/140*TAU+layer*.046+t*.012*(layer%2?1:-1);const r=radius+4*Math.sin(a*5+t*.22+layer*.61);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(n===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
    for(let i=0;i<112;i++){const a=i/112*TAU,outer=214+7*Math.sin(a*7+t*.4);const inner=outer-(i%7===0?19:8);c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.strokeStyle=i/112<v?'rgba(222,187,143,.65)':'rgba(141,192,198,.45)';c.lineWidth=i%7===0?1.6:.8;c.stroke();}
    let theta=-Math.PI/2+v*TAU;c.save();c.rotate(theta);c.beginPath();c.moveTo(-10,0);c.lineTo(194,0);c.strokeStyle='rgba(236,205,164,.8)';c.lineWidth=1.4;c.stroke();c.beginPath();c.arc(194,0,4.5,0,TAU);c.fillStyle='#f2d4af';c.shadowColor='#edc59b';c.shadowBlur=18;c.fill();c.restore();
    c.beginPath();c.arc(0,0,42,0,TAU);c.fillStyle='#111d25';c.fill();c.strokeStyle='rgba(225,190,153,.42)';c.lineWidth=1;c.stroke();c.textAlign='center';c.fillStyle='#ebd7bc';c.font='23px "Noto Serif KR",Georgia,serif';c.fillText('지금',0,8);c.font='10px Georgia,serif';c.fillStyle='rgba(192,210,211,.55)';c.fillText('NOW',0,29);c.font='12px Georgia,serif';c.fillStyle='rgba(235,211,181,.78)';c.fillText('MEMORY',-157,245);c.fillText('POSSIBILITY',158,245);c.textAlign='start';
  }
  function paintLife(c){if(!state.lifeBranches)makeLife();const life=state.lifeAge,energy=state.sun/100,entropy=state.entropy/100,alive=clamp(life*1.48,0,1);const fade=clamp((life-.78)*5,0,1)*(entropy*.85+.16);
    const g=c.createRadialGradient(0,140,0,0,100,240);g.addColorStop(0,'rgba(158,194,121,.12)');g.addColorStop(1,'rgba(158,194,121,0)');c.fillStyle=g;c.beginPath();c.arc(0,80,245,0,TAU);c.fill();
    c.strokeStyle='rgba(192,214,184,.12)';c.beginPath();c.ellipse(0,202,178,19,0,0,TAU);c.stroke();
    c.beginPath();c.moveTo(-255,202);c.lineTo(255,202);c.strokeStyle='rgba(167,187,149,.32)';c.stroke();
    for(const b of state.lifeBranches){const phase=clamp((alive*9.1-b.depth)/1.2,0,1);if(phase<=0)continue;const x=lerp(b.x,b.nx,phase),y=lerp(b.y,b.ny,phase);c.beginPath();c.moveTo(b.x,b.y);c.lineTo(x,y);c.strokeStyle=b.depth<=3?'rgba(198,171,130,.72)':rgba(ROOMS[2].accent,.63-fade*.34);c.lineCap='round';c.lineWidth=Math.max(.7,7.8*Math.pow(.68,b.depth));c.stroke();}
    const leafStrength=clamp((alive-.74)*5,0,1)*(1-fade)*energy;for(const leaf of leaves){if(leafStrength<.04)break;const breeze=Math.sin(state.t*.85+leaf.rand*TAU)*2.2;const x=leaf.x+breeze,y=leaf.y;let alpha=leafStrength*(.4+leaf.rand*.6);c.save();c.translate(x,y);c.rotate(leaf.angle+.9+Math.sin(state.t*.65+leaf.rand*10)*.1);c.fillStyle=leaf.rand>.55?rgba('#d1ddb0',alpha):rgba('#9fcfa2',alpha);c.beginPath();c.ellipse(0,0,3.5+energy*2.5,1.7+energy,0,0,TAU);c.fill();c.restore();}
    const season=Math.round(life*100);c.fillStyle='rgba(201,228,189,.68)';c.textAlign='center';c.font='12px Georgia,serif';c.fillText('LIFE / '+season+'%',0,238);c.textAlign='start';
  }
  const moods={calm:{color:'#c8b8e6',s:.55,amp:7},longing:{color:'#e9b09b',s:.72,amp:12},unease:{color:'#9ac9e6',s:1.8,amp:19},joy:{color:'#e4d18a',s:1.15,amp:13}};
  function paintMind(c){const m=moods[state.mood],t=state.t,speed=t<state.breathingUntil?.15:1;const tt=t*m.s*speed;const accent=m.color;
    const back=c.createRadialGradient(0,0,1,0,0,228);back.addColorStop(0,rgba(accent,.23));back.addColorStop(.43,rgba(accent,.08));back.addColorStop(1,rgba(accent,0));c.fillStyle=back;c.beginPath();c.arc(0,0,235,0,TAU);c.fill();
    for(let j=0;j<46;j++){const base=26+j*3.7;c.beginPath();for(let i=0;i<=152;i++){const a=i/152*TAU;const wave=Math.sin(a*3.0+tt*1.7+j*.21)*m.amp*.47+Math.sin(a*5.0-tt*.9+j*.16)*m.amp*.22+Math.sin(a*9+tt*1.2)*m.amp*.11;const rx=base+wave,ry=(base+wave)*.81;const x=Math.cos(a)*rx,y=Math.sin(a)*ry;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.strokeStyle=rgba(accent,.032+j/46*.125);c.lineWidth=(j%8===0)?1.3:.7;c.stroke();}
    for(let i=0;i<90;i++){const a=i*2.399963+tt*.18;const r=28+(i/90)*193+Math.sin(i*5+tt)*5;const x=Math.cos(a)*r,y=Math.sin(a)*r*.8;c.beginPath();c.arc(x,y,(i%11===0)?2.1:.8,0,TAU);c.fillStyle=rgba(accent,.10+(i%9)/35);c.fill();}
    state.ripples=state.ripples.filter(p=>t-p.t<3.7);for(const ripple of state.ripples){const age=t-ripple.t;const radius=age*73;const a=(1-age/3.7)*.53;c.beginPath();c.ellipse(ripple.x,ripple.y,radius,radius*.8,0,0,TAU);c.strokeStyle=rgba('#f4edec',a);c.lineWidth=1.6;c.stroke();}
    c.textAlign='center';c.fillStyle=rgba(accent,.82);c.font='11px Georgia,serif';c.fillText(state.mood.toUpperCase()+' / NO JUDGMENT',0,241);c.textAlign='start';
  }
  function paintPerception(c){if(!perceptionStars.length)makePerception();const selected=perceptionPaths[state.view]||[];const lit=new Set();for(const path of selected)path.forEach(i=>lit.add(i));
    if(state.showLines){for(const path of selected){c.beginPath();path.forEach((index,k)=>{const p=perceptionStars[index];if(k===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.strokeStyle='rgba(231,189,151,.77)';c.lineWidth=1.85;c.shadowColor='#dfb18d';c.shadowBlur=7;c.stroke();}c.shadowBlur=0;}
    perceptionStars.forEach((p,i)=>{const highlighted=state.showLines&&lit.has(i);c.beginPath();c.arc(p.x,p.y,highlighted?2.5:1.6,0,TAU);c.fillStyle=highlighted?'rgba(255,229,187,.96)':'rgba(170,208,213,.52)';c.fill();});
    c.textAlign='center';c.fillStyle='rgba(185,204,208,.52)';c.font='10px Georgia,serif';c.fillText(''+perceptionStars.length+' UNMOVED POINTS',0,239);c.textAlign='start';
  }
  function paintNetwork(c){if(!netNodes.length)makeNetwork();const wave=state.netWave;const age=wave?state.t-wave.start:999;const step=age/0.30;
    for(const [a,b] of netEdges){const na=netNodes[a],nb=netNodes[b],reached=wave&&(wave.distances[a]<=step||wave.distances[b]<=step);c.beginPath();c.moveTo(na.x,na.y);c.lineTo(nb.x,nb.y);c.strokeStyle=reached?'rgba(139,210,237,.40)':'rgba(142,181,193,.15)';c.lineWidth=reached?1.1:.7;c.stroke();}
    for(const n of netNodes){const distance=wave?wave.distances[n.id]:Infinity,elapsed=step-distance;const pulse=(elapsed>=0&&elapsed<2.7)?Math.exp(-elapsed*.7):0;const reached=elapsed>=0&&Number.isFinite(distance);const radius=2.4+pulse*3.1;c.beginPath();c.arc(n.x,n.y,radius,0,TAU);c.fillStyle=pulse>.1?'rgba(225,244,255,.98)':reached?'rgba(131,202,227,.73)':'rgba(129,170,184,.52)';if(pulse>.1){c.shadowBlur=18;c.shadowColor='#96e3ff';}c.fill();c.shadowBlur=0;if(pulse>.3){c.beginPath();c.arc(n.x,n.y,7+pulse*11,0,TAU);c.strokeStyle='rgba(158,220,239,'+(pulse*.25)+')';c.stroke();}}
    c.textAlign='center';c.fillStyle='rgba(166,201,215,.7)';c.font='10px Georgia,serif';c.fillText(wave?('REACHED '+wave.distances.filter(d=>d<=step).length+' / '+netNodes.length):'ONE TOUCH, MANY CONSEQUENCES',0,239);c.textAlign='start';
  }
  function initFractal(){if(!stageW||!stageH)return;let w=Math.round(Math.min(620,Math.max(240,stageW*.9))),h=Math.round(w*stageH/stageW);if(h>480){w=Math.round(w*(480/h));h=480;}fractalCanvas.width=w;fractalCanvas.height=h;fractalPixels=fractalCtx.createImageData(w,h);state.fractalRow=0;state.fractalView={cx:state.fractal.cx,cy:state.fractal.cy,span:state.fractal.span,maxIter:state.fractal.maxIter};state.fractalDirty=false;}
  function renderFractalChunk(){if(!fractalPixels||!fractalCanvas.width)return;const w=fractalCanvas.width,h=fractalCanvas.height,f=state.fractalView;if(!f)return;
    const data=fractalPixels.data,rows=state.running?10:16;const limit=Math.min(h,state.fractalRow+rows);for(let y=state.fractalRow;y<limit;y++){const cy=f.cy+(y/h-.5)*f.span*h/w;for(let x=0;x<w;x++){const cx=f.cx+(x/w-.5)*f.span;let zx=0,zy=0,k=0,z2=0;while(z2<256&&k<f.maxIter){const temp=zx*zx-zy*zy+cx;zy=2*zx*zy+cy;zx=temp;z2=zx*zx+zy*zy;k++;}const pos=(y*w+x)*4;let r,g,b;if(k===f.maxIter){r=7;g=15;b=22;}else{let smooth=k+1-Math.log2(Math.max(.001,Math.log2(Math.sqrt(z2))));const u=smooth*.035;const light=.5+.5*Math.cos(u*TAU);r=Math.floor(16+180*(.5+.5*Math.cos(TAU*(u+.11)))*Math.pow(light,.26));g=Math.floor(25+145*(.5+.5*Math.cos(TAU*(u+.32))));b=Math.floor(39+165*(.5+.5*Math.cos(TAU*(u+.56))));}data[pos]=r;data[pos+1]=g;data[pos+2]=b;data[pos+3]=255;}}
    fractalCtx.putImageData(fractalPixels,0,0,0,state.fractalRow,w,limit-state.fractalRow);state.fractalRow=limit;
  }
  function paintFractal(c,w,h){if(state.fractalDirty||!fractalPixels)initFractal();if(fractalPixels&&state.fractalRow<fractalCanvas.height)renderFractalChunk();if(fractalCanvas.width){c.save();c.imageSmoothingEnabled=true;c.drawImage(fractalCanvas,0,0,w,h);c.fillStyle='rgba(3,11,16,.36)';c.fillRect(0,0,w,39);c.fillRect(0,h-41,w,41);c.fillStyle='rgba(250,222,181,.8)';c.font='12px Georgia,serif';c.fillText('z → z² + c',22,25);c.textAlign='right';c.font='10px Georgia,serif';c.fillStyle='rgba(210,224,226,.8)';c.fillText((3.2/state.fractal.span).toFixed(Math.min(2,Math.max(0,Math.floor(Math.log10(3.2/state.fractal.span)))))+'×',w-22,25);c.textAlign='left';c.font='10px Georgia,serif';c.fillText('THE EDGE HAS NO SIMPLE END',22,h-17);const progress=Math.round(state.fractalRow/fractalCanvas.height*100);if(progress<100){c.textAlign='right';c.fillText('RENDERING '+progress+'%',w-22,h-17);c.textAlign='left';}c.restore();}}
  function paintStage(){if(!ctx||!stageW||!stageH)return;const w=stageW,h=stageH,c=ctx;paintBase(c,w,h);if(state.room===6){paintFractal(c,w,h);return;}stageTransform(c,w,h);switch(state.room){case 0:paintChoice(c);break;case 1:paintTime(c);break;case 2:paintLife(c);break;case 3:paintMind(c);break;case 4:paintPerception(c);break;case 5:paintNetwork(c);break;}c.restore();}
  function frame(ms){const delta=state.lastFrame?Math.min((ms-state.lastFrame)/1000,.05):.016;state.lastFrame=ms;const shouldAnimate=state.running&&document.visibilityState!=='hidden';if(shouldAnimate){state.t+=delta;if(state.page==='room'&&state.room===1&&state.timePlaying){state.time=(state.time+delta*2.8)%100;const el=$('timeSlider');if(el){el.value=String(Math.round(state.time));$('timeOutput').textContent=String(Math.round(state.time));}}if(state.page==='room'&&state.room===2){state.lifeAge=(state.lifeAge+delta*(.028+state.entropy*.0008))%1;}}
    const elapsed=ms-state.lastPaint;const needsFractal=state.page==='room'&&state.room===6&&(state.fractalDirty||fractalPixels&&state.fractalRow<fractalCanvas.height);if(elapsed>(shouldAnimate?31:needsFractal?22:1000)){state.lastPaint=ms;if(state.page==='room')paintStage();if(state.page==='landing'||shouldAnimate)drawAmbient();}
    requestAnimationFrame(frame);
  }
  function saveNote(){const text=$('reflectionText').value.trim();if(!text){toast('남기고 싶은 단어나 문장을 적어 주세요.');$('reflectionText').focus();return;}if(text.length>600){toast('600자 이내의 문장을 남겨 주세요.');return;}
    state.notes.push({id:String(Date.now())+'-'+Math.random().toString(36).slice(2,8),room:state.room,text,when:new Date().toISOString()});if(state.notes.length>150)state.notes=state.notes.slice(-150);
    if(!storeNotes()){state.notes.pop();toast('브라우저 저장이 허용되지 않아 기록하지 못했습니다.');return;}
    refreshCounts();$('reflectionText').value='';$('reflectionHint').textContent='당신의 별자리에 '+ROOMS[state.room].name+'의 문장이 추가되었습니다.';toast('✧ 한 문장이 당신의 별자리로 남았습니다.');
  }
  function showNotebook(){$('revelation').hidden=state.visited.size<7;setPage('notebook');paintNotebook();}
  function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function paintConstellation(c,w,h,notes){c.clearRect(0,0,w,h);const bg=c.createRadialGradient(w*.5,h*.45,10,w*.5,h*.5,w*.65);bg.addColorStop(0,'#172b35');bg.addColorStop(.6,'#0d1923');bg.addColorStop(1,'#071016');c.fillStyle=bg;c.fillRect(0,0,w,h);
    const r=rand(20261114);for(let i=0;i<290;i++){const x=r()*w,y=r()*h,rad=.25+r()*.95;c.beginPath();c.arc(x,y,rad,0,TAU);c.fillStyle='rgba(193,226,227,'+(.15+r()*.35)+')';c.fill();}
    c.beginPath();c.ellipse(w*.5,h*.5,w*.3,h*.32,-.27,0,TAU);c.strokeStyle='rgba(169,204,197,.13)';c.lineWidth=1;c.stroke();
    const list=notes.slice(-36),n=list.length||7,points=[];for(let i=0;i<n;i++){let seed=list.length?hashString(list[i].text+list[i].room+i):hashString('empty'+i);const rng=rand(seed);const angle=i/n*TAU-Math.PI/2+(rng()-.5)*.35;const rr=.17+rng()*.21;points.push({x:w*.5+Math.cos(angle)*w*rr,y:h*.5+Math.sin(angle)*h*rr*.92,seed,main:!!list.length,text:list.length?list[i].text:''});}
    for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=list.length?'rgba(198,196,164,.34)':'rgba(166,184,180,.15)';c.lineWidth=1.3;c.stroke();if(i>1){const k=points[Math.floor(i/2)];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(k.x,k.y);c.strokeStyle='rgba(133,195,199,.10)';c.stroke();}}
    points.forEach((p,i)=>{const gold=i%3===0;const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,27);glow.addColorStop(0,gold?'rgba(236,199,146,.42)':'rgba(167,220,221,.45)');glow.addColorStop(1,'rgba(205,225,216,0)');c.fillStyle=glow;c.beginPath();c.arc(p.x,p.y,27,0,TAU);c.fill();c.beginPath();c.arc(p.x,p.y,3.2,0,TAU);c.fillStyle=gold?'#f1d5a9':'#d6eeef';c.fill();if(list.length&&i<9){c.fillStyle='rgba(215,225,222,.72)';c.font=Math.round(w/86)+'px sans-serif';c.fillText(p.text.replace(/\s+/g,' ').slice(0,10),p.x+11,p.y-11);}});
    c.fillStyle='#c9b38e';c.font='bold '+Math.round(w/37)+'px Georgia,serif';c.letterSpacing=Math.round(w/380)+'px';c.fillText('AION',w*.07,h*.13);c.letterSpacing='0px';c.font=Math.round(w/84)+'px Georgia,serif';c.fillStyle='rgba(194,210,204,.75)';c.fillText('THE UNIVERSE, AS SEEN BY YOU',w*.07,h*.17);c.textAlign='right';c.fillStyle='rgba(208,206,181,.65)';c.fillText(list.length+' THOUGHTS / ONE CONSTELLATION',w*.94,h*.92);c.textAlign='left';
  }
  function paintNotebook(){if(state.page!=='notebook'||!notebookCtx)return;const width=900,height=610;notebookCanvas.width=width;notebookCanvas.height=height;paintConstellation(notebookCtx,width,height,state.notes);
    $('notesHeadingCount').textContent=String(state.notes.length);$('journalDate').textContent=new Date().toLocaleDateString('ko-KR');const container=$('journalEntries');container.replaceChildren();
    if(!state.notes.length){const div=document.createElement('div');div.className='empty-entries';const strong=document.createElement('strong');strong.textContent='아직 이름 붙이지 않은 별들';div.appendChild(strong);div.append('일곱 개의 방에서 한 문장씩 남겨 보세요. 당신만의 별자리가 이곳에 그려집니다.');container.appendChild(div);return;}
    state.notes.slice().reverse().forEach(note=>{const card=document.createElement('article');card.className='entry-card';const top=document.createElement('div');top.className='entry-top';const tag=document.createElement('span');tag.textContent=String(note.room+1).padStart(2,'0')+' / '+(ROOMS[note.room]?.name||'생각');const date=document.createElement('span');date.className='entry-date';date.textContent=new Date(note.when).toLocaleDateString('ko-KR');top.append(tag,date);const p=document.createElement('p');p.textContent=note.text;const del=document.createElement('button');del.type='button';del.textContent='이 문장 지우기 ×';del.setAttribute('aria-label','이 문장 지우기');del.addEventListener('click',()=>{const before=state.notes.slice();state.notes=state.notes.filter(x=>x.id!==note.id);if(!storeNotes()){state.notes=before;toast('기록을 삭제할 수 없습니다.');return;}refreshCounts();paintNotebook();toast('문장을 삭제했습니다.');});card.append(top,p,del);container.appendChild(card);});
  }
  function downloadFile(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function exportImage(){const c=document.createElement('canvas');c.width=1800;c.height=1220;const context=c.getContext('2d');paintConstellation(context,c.width,c.height,state.notes);c.toBlob(blob=>{if(blob)downloadFile(blob,'AION_나의별자리.png');else toast('이미지를 저장하지 못했습니다.');},'image/png');}
  function exportText(){let md='# AION — 나의 별자리\n\n> 정답이 아니라, 내가 지나온 질문의 흔적.\n\n';md+='기록 수: '+state.notes.length+'\n\n';state.notes.forEach((note,i)=>{md+='## '+String(i+1).padStart(2,'0')+' / '+(ROOMS[note.room]?.name||'생각')+'\n\n'+note.text+'\n\n*'+new Date(note.when).toLocaleString('ko-KR')+'*\n\n---\n\n';});md+='AION — THE BETWEEN\n';downloadFile(new Blob(['\ufeff'+md],{type:'text/markdown;charset=utf-8'}),'AION_나의생각.md');}
  function makeAudio(){const A=window.AudioContext||window.webkitAudioContext;if(!A){toast('이 브라우저에서는 배경음이 지원되지 않습니다.');return false;}try{if(!state.audioContext){const ac=new A(),master=ac.createGain(),filter=ac.createBiquadFilter(),osc1=ac.createOscillator(),osc2=ac.createOscillator(),lfo=ac.createOscillator(),lgain=ac.createGain();master.gain.value=0;filter.type='lowpass';filter.frequency.value=360;osc1.type='sine';osc1.frequency.value=110;osc2.type='sine';osc2.frequency.value=164.81;lfo.type='sine';lfo.frequency.value=.12;lgain.gain.value=18;lfo.connect(lgain);lgain.connect(filter.frequency);osc1.connect(filter);osc2.connect(filter);filter.connect(master);master.connect(ac.destination);osc1.start();osc2.start();lfo.start();state.audioContext=ac;state.audioNodes={master};}state.audioContext.resume();return true;}catch(e){toast('배경음을 시작할 수 없습니다.');return false;}}
  function toggleAudio(){if(!state.audio){if(!makeAudio())return;state.audio=true;state.audioNodes.master.gain.setTargetAtTime(.018,state.audioContext.currentTime,.25);}else{state.audio=false;state.audioNodes.master.gain.setTargetAtTime(0,state.audioContext.currentTime,.18);}const b=$('audioBtn');b.setAttribute('aria-pressed',String(state.audio));b.setAttribute('aria-label',state.audio?'배경음 끄기':'배경음 켜기');b.title=state.audio?'배경음 끄기':'배경음 켜기';}
  function toggleMotion(){state.running=!state.running;const b=$('motionBtn');b.setAttribute('aria-pressed',String(!state.running));b.setAttribute('aria-label',state.running?'움직임 일시정지':'움직임 다시 시작');b.title=state.running?'움직임 일시정지':'움직임 다시 시작';$('motionIcon').setAttribute('d',state.running?'M8 5v14M16 5v14':'M8 5l12 7-12 7V5Z');}

  $('brandBtn').addEventListener('click',()=>setPage('landing'));
  $('enterBtn').addEventListener('click',()=>openRoom(0));
  roomButtons.forEach(b=>b.addEventListener('click',()=>openRoom(Number(b.dataset.room))));
  $('previousBtn').addEventListener('click',()=>state.room===0?setPage('landing'):openRoom(state.room-1));
  $('nextBtn').addEventListener('click',()=>state.room===6?showNotebook():openRoom(state.room+1));
  $('journalBtn').addEventListener('click',showNotebook);
  $('returnRoomsBtn').addEventListener('click',()=>openRoom(state.room));
  $('revisitBtn').addEventListener('click',()=>openRoom(0));
  $('saveThoughtBtn').addEventListener('click',saveNote);
  $('resetStageBtn').addEventListener('click',resetStage);
  $('exportImageBtn').addEventListener('click',exportImage);
  $('exportTextBtn').addEventListener('click',exportText);
  $('clearNotesBtn').addEventListener('click',()=>{if(!state.notes.length){toast('삭제할 기록이 없습니다.');return;}if(!window.confirm('저장한 모든 문장과 별자리를 이 기기에서 삭제할까요?'))return;const old=state.notes;state.notes=[];if(!storeNotes()){state.notes=old;toast('저장소에 접근할 수 없어 삭제하지 못했습니다.');return;}refreshCounts();paintNotebook();toast('모든 기록을 삭제했습니다.');});
  $('audioBtn').addEventListener('click',toggleAudio);
  $('motionBtn').addEventListener('click',toggleMotion);
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(state.audioContext){if(document.visibilityState==='hidden')state.audioContext.suspend();else if(state.audio)state.audioContext.resume();}});
  setInterval(()=>{let sec=Math.floor((Date.now()-state.started)/1000);$('sessionClock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');},1000);
  refreshCounts();$('motionBtn').setAttribute('aria-pressed',String(!state.running));$('motionBtn').setAttribute('aria-label',state.running?'움직임 일시정지':'움직임 다시 시작');$('motionIcon').setAttribute('d',state.running?'M8 5v14M16 5v14':'M8 5l12 7-12 7V5Z');
  resize();requestAnimationFrame(frame);
})();
