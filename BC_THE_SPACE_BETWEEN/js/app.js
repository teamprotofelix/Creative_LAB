/* THE SPACE BETWEEN — a self-contained, no-backend contemplative instrument.
   No analytics, remote APIs, trackers or runtime libraries. */
(() => {
  'use strict';
  const IDS = ['threshold','breath','time','life','perception','connection','echo'];
  const CHAPTERS = {
    threshold:{index:'PROLOGUE / 00',en:'BEFORE THE BEGINNING',eyebrow:'AN INVITATION TO SIMPLY EXIST',
      headline:'잠시,<br><em>존재해도</em> 괜찮습니다.',description:'수많은 생각이 당신을 지나가지만,<br>당신은 그 생각들보다 넓은 존재입니다.',thought:'지금 이 순간, 무엇이 나를 살아 있게 하나요?',side:'EVERYTHING BEGINS WITH ATTENTION',dock:'시작하기 전에',hint:'빛의 중심으로 천천히 시선을 옮겨 보세요'},
    breath:{index:'CHAPTER / 01',en:'THE UNCOUNTED BREATH',eyebrow:'01 / BREATH · 숨',
      headline:'우주는 매 순간<br><em>숨을 쉽니다.</em>',description:'별은 태어나고 사라지며, 바다는 밀려왔다 돌아갑니다.<br>당신의 숨도 그 거대한 리듬의 한 부분입니다.',thought:'숨을 잘 쉬려고 애쓰지 않아도 됩니다. 그저 이미 쉬고 있는 숨을 느껴보세요.',side:'NOTHING NEEDS TO BE FORCED',dock:'숨의 리듬',hint:'중심의 빛이 조용히 커졌다 작아집니다'},
    time:{index:'CHAPTER / 02',en:'THE SHAPE OF NOW',eyebrow:'02 / TIME · 시간',
      headline:'시간은 흐를까요,<br><em>우리가 흐를까요.</em>',description:'어제는 기억이 되었고, 내일은 아직 가능성입니다.<br>우리가 직접 만질 수 있는 시간은 오직 이 순간.',thought:'시간을 붙잡지 않아도, 지금은 충분히 당신의 것입니다.',side:'THE PRESENT HAS NO EDGES',dock:'시간의 방향',hint:'막대를 움직여 생각의 시선을 옮겨 보세요'},
    life:{index:'CHAPTER / 03',en:'A TINY BEGINNING',eyebrow:'03 / LIFE · 생명',
      headline:'작은 시작은<br><em>어디까지 자랄까요.</em>',description:'생명은 완벽한 설계도보다 한 번의 시작을 택합니다.<br>당신의 손끝에서 아무 이름 없는 정원이 깨어납니다.',thought:'꽃은 피어야 할 이유를 묻지 않습니다.',side:'GROWING IS A FORM OF TRUST',dock:'씨앗의 정원',hint:'어두운 하늘을 눌러 씨앗을 하나 심을 수 있습니다'},
    perception:{index:'CHAPTER / 04',en:'THE OTHER SIDE OF SEEING',eyebrow:'04 / PERCEPTION · 인식',
      headline:'보이는 것이<br><em>전부는 아닙니다.</em>',description:'하나의 빛에도 수많은 그림자가 생깁니다.<br>눈앞의 세계와 마음속의 세계는 언제나 함께 그려집니다.',thought:'확신을 잠시 느슨하게 놓으면, 이전에 없던 문이 보입니다.',side:'A NEW VIEW CHANGES EVERYTHING',dock:'인식의 렌즈',hint:'시선을 움직여 서로 다른 형태가 겹치는 모습을 보세요'},
    connection:{index:'CHAPTER / 05',en:'INVISIBLE GRAVITY',eyebrow:'05 / CONNECTION · 관계',
      headline:'우리는 서로의<br><em>중력이 됩니다.</em>',description:'어쩌면 삶을 바꾸는 것은 거창한 사건이 아니라<br>한 사람, 한 문장, 한 번의 다정한 눈길입니다.',thought:'내 마음에 오래 남은 단어 하나를 별로 만들어 주세요.',side:'NOTHING EXISTS ENTIRELY ALONE',dock:'마음의 별자리',hint:'하늘을 누르거나 단어를 입력해 별을 남겨 보세요'},
    echo:{index:'EPILOGUE / 06',en:'WHAT REMAINS',eyebrow:'06 / AFTERGLOW · 여운',
      headline:'우주는 여전히<br><em>당신 안에 있습니다.</em>',description:'당신이 지나온 장면들은 사라지지 않고<br>이 순간의 작은 이야기로 남았습니다.',thought:'당신은 알아차린 만큼 세상을 넓힙니다.',side:'YOU WERE HERE, AND THAT WAS ENOUGH',dock:'당신에게 남기는 문장',hint:'이 여행의 문장을 복사하거나 기록으로 남길 수 있습니다'}
  };
  const QUESTIONS = {
    threshold:['지금 이 순간, 무엇이 나를 살아 있게 하나요?','당신이 생각을 바라볼 수 있다면, 당신은 그 생각 자체일까요?','내가 나라고 부르는 것은 기억일까요, 알아차림일까요?','존재는 설명되기 전에 이미 일어나고 있습니다.'],
    breath:['숨을 잘 쉬려고 애쓰지 않아도 됩니다. 그저 이미 쉬고 있는 숨을 느껴보세요.','내가 숨을 쉬고 있을까요, 숨이 나를 살아 있게 할까요?','모든 들숨 뒤에는 날숨이 옵니다. 놓아주는 것도 살아가는 일입니다.','숨 사이의 작은 쉼은, 비어 있는 시간이 아닙니다.'],
    time:['시간을 붙잡지 않아도, 지금은 충분히 당신의 것입니다.','지금을 측정하는 사이, 그 순간은 이미 기억이 됩니다.','내일의 당신이 오늘을 돌아본다면, 무엇을 다정하게 기억할까요?','과거는 고칠 수 없어도, 과거를 바라보는 눈길은 달라질 수 있습니다.'],
    life:['꽃은 피어야 할 이유를 묻지 않습니다.','씨앗에는 나무가 보이지 않아도, 자랄 가능성은 존재합니다.','계속 변화하는데도 우리는 왜 같은 이름으로 자신을 부를까요?','성장은 곧게 나아가는 일이 아니라, 빛을 향해 여러 번 방향을 바꾸는 일입니다.'],
    perception:['확신을 잠시 느슨하게 놓으면, 이전에 없던 문이 보입니다.','같은 하늘을 보면서도 서로 다른 세계에 사는 이유는 무엇일까요?','눈은 빛을 받고, 마음은 그 안에 의미를 만듭니다.','다른 관점은 이전 관점을 지우지 않고, 세계의 깊이를 더합니다.'],
    connection:['내 마음에 오래 남은 단어 하나를 별로 만들어 주세요.','나를 만든 것은 나만의 선택일까요, 스쳐 간 사람들일까요?','어떤 인연은 멀어져도 우리 안에서 계속 중력이 됩니다.','서로에게 다정함을 건네는 순간, 서로의 우주는 조금 달라집니다.'],
    echo:['당신은 알아차린 만큼 세상을 넓힙니다.','결론을 내리지 않아도 됩니다. 이 순간을 느낀 것만으로 충분합니다.','흔적이 없어도 그 순간은 분명 존재했을까요?','다시 시작할 때의 당신은, 조금 전의 당신과 같을까요?']
  };
  const questionIndexes = Object.create(null);
  const PALETTE = {
    threshold:['#c7acd5','#dbb6ab','#95c6d4'], breath:['#b0e6dd','#8eb2cc','#b2d0e8'],
    time:['#ffd0ab','#afafe4','#d6a4b6'], life:['#c9e8b4','#e3c19e','#b2d5be'],
    perception:['#d1bbfa','#a3c8e0','#ecc3e8'], connection:['#ffc5c1','#b3cafa','#ebc8ce'],
    echo:['#f0deaf','#d6b8e1','#bdd8d8']
  };
  const $ = (id) => document.getElementById(id);
  const canvas = $('cosmos'), ctx = canvas.getContext('2d', { alpha:false });
  const prefersReduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const storageKey = 'space-between-v1';
  const defaults = () => ({visits:[],breaths:0,nowMarks:0,timeShift:0,sprouts:[],lens:0,invert:false,stars:[],journal:'',revisions:0,reduceMotion:prefersReduced});
  const safeNumber = (v, min, max, def=0) => Number.isFinite(Number(v)) ? Math.min(max,Math.max(min,Number(v))) : def;
  function loadState(){
    const d=defaults();
    try {
      const raw=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(!raw || typeof raw!=='object') return d;
      d.visits=Array.isArray(raw.visits)?raw.visits.filter(v=>IDS.includes(v)).slice(0,7):[];
      d.breaths=safeNumber(raw.breaths,0,999,0);d.nowMarks=safeNumber(raw.nowMarks,0,999,0);
      d.timeShift=safeNumber(raw.timeShift,-100,100);d.lens=safeNumber(raw.lens,-100,100);
      d.sprouts=Array.isArray(raw.sprouts)?raw.sprouts.slice(-12).map(s=>({x:safeNumber(s.x,-1,1),born:safeNumber(s.born,0,9e15,Date.now()),seed:safeNumber(s.seed,0,1e8)})):[];
      d.stars=Array.isArray(raw.stars)?raw.stars.slice(-14).map(s=>({label:String(s.label||'별').slice(0,18),x:safeNumber(s.x,.06,.94,.7),y:safeNumber(s.y,.16,.83,.48)})):[];
      d.invert=!!raw.invert;d.journal=String(raw.journal||'').slice(0,400);d.revisions=safeNumber(raw.revisions,0,9999);
      d.reduceMotion=!!raw.reduceMotion || prefersReduced;
    }catch(err){/* local storage may be disabled; the experience still runs */}
    return d;
  }
  let state=loadState();
  let scene='threshold', sceneStart=performance.now(), startTime=Date.now();
  let W=window.innerWidth,H=window.innerHeight,dpr=1,lastFrame=0,raf=0;
  let pointer={x:-999,y:-999,down:false},sound=null,breathGuide=true,toastTimer=0;
  let selectedWord='';
  let twinkles=[],ambientSparks=[];
  const mobile=()=>window.innerWidth<=800;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rnd=(seed)=>{let x=Math.sin(seed*127.1+78.233)*43758.5453;return x-Math.floor(x)};
  const ease=(v)=>v*v*(3-2*v);
  const rgba=(hex,opacity)=>{const x=hex.replace('#','');return `rgba(${parseInt(x.slice(0,2),16)},${parseInt(x.slice(2,4),16)},${parseInt(x.slice(4,6),16)},${opacity})`};
  const safeHtml=(str)=>String(str).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(err){/* private browsing / storage blocked */}}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
  function resize(){
    W=window.innerWidth;H=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.65);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    twinkles=Array.from({length:W<700?65:150},(_,i)=>({x:rnd(i+11)*W,y:rnd(i*2.1+45)*H,r:rnd(i+15)*1.2+.15,phase:rnd(i+77)*6.28,speed:.25+rnd(i+4)*.5}));
    ambientSparks=Array.from({length:50},(_,i)=>({x:rnd(i+90),y:rnd(i+120),phase:rnd(i+9)*6.283}));
  }
  function updateDuration(){const sec=Math.floor((Date.now()-startTime)/1000),m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');$('elapsed').textContent=`${m}:${s}`}
  function setScene(next,initial=false){
    if(!IDS.includes(next))return;
    scene=next;sceneStart=performance.now();document.body.dataset.scene=scene;
    const c=CHAPTERS[scene];
    $('chapterIndex').textContent=c.index;$('chapterEnglish').textContent=c.en;
    $('eyebrow').textContent=c.eyebrow;$('headline').innerHTML=c.headline;
    $('description').innerHTML=c.description;$('thoughtText').textContent=QUESTIONS[scene][questionIndexes[scene]||0];
    $('sideWord').textContent=c.side;$('dockLabel').textContent=c.dock;
    $('worldHintText').textContent=c.hint;
    document.querySelectorAll('.nav-item').forEach(b=>{const active=b.dataset.go===scene;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
    const i=IDS.indexOf(scene);$('prevBtn').disabled=i===0;$('prevBtn').style.opacity=i===0?'.35':'1';
    $('nextBtn').textContent=i===IDS.length-1?'처음으로 ↗':'다음 세계 →';
    $('nextBtn').setAttribute('aria-label',i===IDS.length-1?'시작 화면으로':'다음 공간');
    if(!state.visits.includes(scene)){state.visits.push(scene);save()}
    $('breathGuide').hidden=scene!=='breath'||!breathGuide;
    $('timeGuide').hidden=scene!=='time';
    controls(); updateTrace();
    if(!initial && location.hash!=='#'+scene) history.replaceState(null,'','#'+scene);
    if(mobile() && !initial)window.scrollTo({top:0,behavior:state.reduceMotion?'instant':'smooth'});
  }
  function go(delta){const i=IDS.indexOf(scene);setScene(IDS[(i+delta+IDS.length)%IDS.length])}
  function updateTrace(){
    const t={threshold:'서두르지 않아도 됩니다',breath:`기억한 숨 ${state.breaths}번`,time:`머물렀던 지금 ${state.nowMarks}번`,life:`자라나는 씨앗 ${state.sprouts.length}개`,perception:state.invert?'안과 밖이 자리를 바꾸었습니다':'보는 방식을 바꿔 보세요',connection:`마음의 별 ${state.stars.length}개`,echo:`지나온 세계 ${state.visits.filter(v=>v!=='threshold').length}개`};
    $('traceStatus').textContent=t[scene];
  }
  function makeButton(label,action,kind=''){return `<button class="action ${kind}" data-action="${action}">${label}</button>`}
  function controls(){
    const box=$('controls');
    if(scene==='threshold')box.innerHTML=`${makeButton('여행 시작하기 <span aria-hidden="true">↗</span>','begin','primary')}${makeButton('어느 세계로든 떠나기','wander')}<span class="mini-note">준비가 되면, 하나의 문을 열어주세요.</span>`;
    if(scene==='breath')box.innerHTML=`${makeButton('한 호흡 기억하기 <span aria-hidden="true">✳</span>','breathe','primary')}${makeButton(breathGuide?'호흡 안내 숨기기':'호흡 안내 보기','guide')}<span class="mini-note">숫자에 맞추려 애쓰지 마세요. 편안한 숨이 먼저입니다.</span>`;
    if(scene==='time')box.innerHTML=`<div class="ctl-stack"><div class="range-row"><label for="timeRange">생각의 방향</label><span>과거</span><input id="timeRange" type="range" min="-100" max="100" value="${state.timeShift}" aria-label="생각의 시점을 과거부터 미래까지 이동"><span>미래</span></div><div class="ctl-row">${makeButton('이 순간에 머물기 <span aria-hidden="true">✳</span>','now','primary')}<span class="mini-note" id="timeText">${timeLabel()}</span></div></div>`;
    if(scene==='life')box.innerHTML=`${makeButton('씨앗 하나 놓기 <span aria-hidden="true">✳</span>','plant','primary')}${makeButton('마지막 씨앗 되돌리기','unplant')}<span class="mini-note">하늘을 직접 눌러도 자라납니다. 최대 12개의 씨앗.</span>`;
    if(scene==='perception')box.innerHTML=`<div class="ctl-stack"><div class="range-row"><label for="lensRange">사물을 보는 각도</label><input id="lensRange" type="range" min="-100" max="100" value="${state.lens}" aria-label="인식의 렌즈 각도 변경"><span class="range-value" id="lensValue">${state.lens}°</span></div><div class="ctl-row">${makeButton(state.invert?'빛과 그림자 다시 바꾸기':'빛과 그림자 바꾸기','invert','primary')}<span class="mini-note" id="lensText">${lensLabel()}</span></div></div>`;
    if(scene==='connection')box.innerHTML=`<div class="ctl-stack"><div class="chips" aria-label="추천 단어">${['고마움','그리움','용기','사랑','나','우연'].map(w=>`<button class="chip" data-word="${w}" type="button">${w}</button>`).join('')}</div><form id="starForm" class="ctl-row"><label for="wordInput" class="visually-hidden">별이 될 단어</label><input id="wordInput" class="text-entry" maxlength="18" autocomplete="off" placeholder="마음에 남은 단어 하나"><button class="action primary" type="submit">별로 남기기 ↗</button><button class="action" type="button" data-action="unstar" aria-label="가장 최근 별 제거">↶</button></form></div>`;
    if(scene==='echo')box.innerHTML=`<div class="ctl-stack"><div class="letter-layout"><h2>당신만의 작은 우주에서 온 편지</h2><p id="poemView">${safeHtml(poem())}</p><span class="epilogue-note">이 글은 당신이 남긴 흔적을 바탕으로 기기 안에서 만들어집니다.</span></div><label for="journal" class="visually-hidden">나에게 남기는 한 줄</label><textarea id="journal" class="text-entry journal" maxlength="400" placeholder="오늘의 나에게 해주고 싶은 말을 적어주세요."></textarea><div class="letter-actions">${makeButton('문장 복사','copy','primary')}${makeButton('텍스트 저장 ↓','download')}${makeButton('새로운 문장 보기','revise')}${makeButton('흔적 비우기','clear')}</div></div>`;
    if(scene==='echo'){$('journal').value=state.journal}
  }
  function timeLabel(){return state.timeShift<-24?'기억 속으로 향하고 있습니다':state.timeShift>24?'아직 오지 않은 일을 바라보고 있습니다':'여기, 바로 지금에 머물고 있습니다'}
  function lensLabel(){return state.lens<-25?'하나의 모양이 드러나는 중':state.lens>25?'다른 모양이 나타나는 중':'두 개의 가능성이 겹치는 곳'}
  function plant(x=null){
    if(state.sprouts.length>=12){toast('정원이 가득 찼습니다. 마지막 씨앗을 되돌리면 다시 심을 수 있어요.');return}
    const n=state.sprouts.length;
    const pos=x===null?(mobile()?.2+rnd(n*37+Date.now()%1000)*.56:clamp((rnd(n*37+Date.now()%1000)*1.7-.85),-.95,.95)):clamp(x,-.95,.95);
    state.sprouts.push({x:pos,born:Date.now(),seed:Math.floor(Math.random()*1e7)});save();updateTrace();toast('작은 시작 하나가 태어났습니다.');
  }
  function addStar(label,x=null,y=null){
    label=String(label||'').trim().replace(/\s+/g,' ').slice(0,18);
    if(!label){toast('별이 될 단어를 하나 적어주세요.');return}
    if(state.stars.length>=14){toast('하늘에 별이 가득 찼어요. 마지막 별을 하나 지워주세요.');return}
    const n=state.stars.length;
    state.stars.push({label,x:x===null?clamp(.53+.33*rnd(n*11+Date.now()%999),.1,.94):clamp(x,.08,.94),y:y===null?clamp(.24+.45*rnd(n*23+Date.now()%999),.16,.8):clamp(y,.16,.82)});
    save();updateTrace();if($('wordInput'))$('wordInput').value='';selectedWord='';toast(`‘${label}’이라는 별이 빛나기 시작합니다.`);
  }
  function poem(){
    const a=state.revisions%3;
    const intro=['오늘, 당신은 자신의 안쪽에 작은 우주를 열었습니다.','별빛이 멀리서만 오는 것은 아닙니다.','가장 조용한 곳에서도 우주는 움직입니다.'][a];
    const breathe=state.breaths>0?`${state.breaths}번의 숨을 알아차렸고, 그 사이에는 이름 없는 쉼표가 있었습니다.`:'세지 않은 숨들도 당신을 지나며 조용히 살아 있었습니다.';
    const time=state.nowMarks?`${state.nowMarks}번, 지나간 어제와 오지 않은 내일 사이에 머물렀습니다.`:'어제와 내일 사이에, 지금이라는 작은 문이 열려 있습니다.';
    const life=state.sprouts.length?`${state.sprouts.length}개의 씨앗이 증명했습니다. 시작은 언제나 작아도 된다는 것을.`:'아직 심지 않은 씨앗에도 봄의 가능성이 있습니다.';
    const star=state.stars.length?`그리고 ‘${state.stars[state.stars.length-1].label}’이라는 별이 당신의 하늘에 남았습니다.`:'아직 부르지 않은 이름도 누군가의 별이 될 수 있습니다.';
    const ending=['무엇을 이루지 않아도, 존재하는 것으로 충분합니다.','오늘의 당신이 오늘의 당신을 조금 더 다정하게 바라보기를.','답이 없어도 괜찮습니다. 질문과 함께 살아갈 수 있으니까요.'][a];
    return [intro,breathe,time,life,star,'',ending].join('\n');
  }
  async function copyText(content){
    try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(content)}else{const ta=document.createElement('textarea');ta.value=content;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();if(!document.execCommand('copy'))throw Error('copy');ta.remove()}toast('문장을 복사했습니다.')}catch(err){toast('복사할 수 없었습니다. 텍스트 저장 기능을 이용해 주세요.')}
  }
  function download(){
    const content=`여백의 우주 — THE SPACE BETWEEN\n\n${poem()}${state.journal?'\n\n나에게 남긴 한 줄\n'+state.journal:''}\n\n※ 이 글은 방문자의 기기에서 생성되었습니다.`;
    const blob=new Blob(['\ufeff',content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='여백의_우주_나에게_남기는_문장.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('텍스트 파일을 저장했습니다.');
  }
  function action(name){
    if(name==='begin')setScene('breath');
    if(name==='wander')setScene(IDS[1+Math.floor(Math.random()*5)]);
    if(name==='breathe'){state.breaths=Math.min(999,state.breaths+1);save();updateTrace();toast('하나의 숨이 우주에 남았습니다.');}
    if(name==='guide'){breathGuide=!breathGuide;$('breathGuide').hidden=!breathGuide;controls();}
    if(name==='now'){state.nowMarks=Math.min(999,state.nowMarks+1);state.timeShift=0;save();controls();updateTrace();toast('바로 이 순간을 기억합니다.');}
    if(name==='plant')plant();
    if(name==='unplant'){if(state.sprouts.length){state.sprouts.pop();save();updateTrace();toast('씨앗 하나가 흙으로 돌아갔습니다.')}else toast('되돌릴 씨앗이 없습니다.');}
    if(name==='invert'){state.invert=!state.invert;save();controls();updateTrace();}
    if(name==='unstar'){if(state.stars.length){state.stars.pop();save();updateTrace();toast('별 하나가 고요히 사라졌습니다.')}else toast('아직 별이 없습니다.');}
    if(name==='copy')copyText(`여백의 우주 — THE SPACE BETWEEN\n\n${poem()}${state.journal?'\n\n'+state.journal:''}`);
    if(name==='download')download();
    if(name==='revise'){state.revisions++;save();controls();toast('같은 우주를 다른 문장으로 바라봅니다.');}
    if(name==='clear'){
      if(window.confirm('이 기기에 저장된 씨앗, 별, 메모와 여행의 흔적을 모두 지울까요?')){
        state=defaults();save();setScene('threshold');toast('흔적을 비웠습니다. 새로운 시작을 환영합니다.');
      }
    }
  }
  $('controls').addEventListener('click',e=>{
    const btn=e.target.closest('[data-action], [data-word]');if(!btn)return;
    if(btn.dataset.action){e.preventDefault();action(btn.dataset.action)}
    if(btn.dataset.word){selectedWord=btn.dataset.word;addStar(selectedWord)}
  });
  $('controls').addEventListener('submit',e=>{if(e.target.id==='starForm'){e.preventDefault();addStar($('wordInput').value)}});
  $('controls').addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='timeRange'){state.timeShift=safeNumber(t.value,-100,100);$('timeText').textContent=timeLabel();save()}
    if(t.id==='lensRange'){state.lens=safeNumber(t.value,-100,100);$('lensValue').textContent=state.lens+'°';$('lensText').textContent=lensLabel();save()}
    if(t.id==='journal'){state.journal=t.value.slice(0,400);save()}
  });
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.go)));
  $('thought').addEventListener('click',()=>{questionIndexes[scene]=((questionIndexes[scene]||0)+1)%QUESTIONS[scene].length;$('thoughtText').textContent=QUESTIONS[scene][questionIndexes[scene]]});
  $('prevBtn').addEventListener('click',()=>go(-1));$('nextBtn').addEventListener('click',()=>go(1));$('brand').addEventListener('click',()=>setScene('threshold'));
  $('motionBtn').addEventListener('click',()=>{state.reduceMotion=!state.reduceMotion;save();updateButtons();toast(state.reduceMotion?'움직임을 줄였습니다.':'움직임을 다시 켰습니다.')});
  function updateButtons(){const b=$('motionBtn');b.setAttribute('aria-pressed',String(state.reduceMotion));b.setAttribute('aria-label',state.reduceMotion?'움직임 다시 켜기':'움직임 줄이기');b.title=b.getAttribute('aria-label')}
  function updateSoundButton(){const active=!!sound;const b=$('soundBtn');b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',active?'앰비언트 소리 끄기':'앰비언트 소리 켜기');b.title=b.getAttribute('aria-label')}
  async function toggleSound(){
    if(sound){const prev=sound;sound=null;try{const at=prev.context.currentTime;prev.master.gain.setTargetAtTime(.00001,at,.09);setTimeout(()=>prev.context.close().catch(()=>{}),350)}catch(e){}updateSoundButton();return}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC){toast('이 브라우저에서는 소리 기능을 지원하지 않습니다.');return}
    try{
      const ac=new AC();await ac.resume();const master=ac.createGain();master.gain.setValueAtTime(.00001,ac.currentTime);master.gain.setTargetAtTime(.09,ac.currentTime,.8);master.connect(ac.destination);
      const notes=[110,164.81,220,261.63,329.63];const voices=[];
      notes.forEach((freq,i)=>{const osc=ac.createOscillator(),gain=ac.createGain(),lfo=ac.createOscillator(),lfoGain=ac.createGain();osc.type=i%2?'triangle':'sine';osc.frequency.value=freq;gain.gain.value=[.13,.07,.045,.03,.02][i];lfo.type='sine';lfo.frequency.value=.024+i*.009;lfoGain.gain.value=freq*.002; lfo.connect(lfoGain);lfoGain.connect(osc.frequency);osc.connect(gain);gain.connect(master);osc.start();lfo.start();voices.push([osc,lfo])});
      sound={context:ac,master,voices};updateSoundButton();toast('잔잔한 소리를 켰습니다. 언제든 끌 수 있습니다.');
    }catch(err){sound=null;updateSoundButton();toast('오디오를 시작할 수 없습니다. 기기 설정을 확인해 주세요.')}
  }
  $('soundBtn').addEventListener('click',toggleSound);
  window.addEventListener('hashchange',()=>{const hash=location.hash.slice(1);if(IDS.includes(hash)&&hash!==scene)setScene(hash,true)});
  window.addEventListener('keydown',e=>{
    const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);if(typing)return;
    if(e.key==='ArrowRight'){e.preventDefault();go(1)}
    if(e.key==='ArrowLeft'){e.preventDefault();if(IDS.indexOf(scene)>0)go(-1)}
    if(/^[0-6]$/.test(e.key)){setScene(IDS[Number(e.key)])}
    if(e.code==='Space'&&scene==='breath'){e.preventDefault();action('breathe')}
  });
  const coords=(e)=>({x:e.clientX,y:e.clientY});
  canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY},{passive:true});
  canvas.addEventListener('pointerleave',()=>{pointer.x=-999;pointer.y=-999});
  canvas.addEventListener('pointerdown',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.down=true},{passive:true});
  window.addEventListener('pointerup',()=>{pointer.down=false},{passive:true});
  canvas.addEventListener('click',e=>{
    if(scene==='life'){const cx=center().x;plant((e.clientX-cx)/Math.min(W*.25,260));}
    if(scene==='connection'){addStar(selectedWord||'여기',e.clientX/W,e.clientY/H)}
  });
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&sound){sound.context.suspend().catch(()=>{})}else if(sound){sound.context.resume().catch(()=>{})}});
  // -------------------- Canvas art engine --------------------
  const center=()=>({x:W*(mobile()?.7:.705),y:H*(mobile()?.45:.46),R:Math.min(W,H)*(mobile()?.35:.32)});
  function background(t){
    const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#070b15');g.addColorStop(.5,'#0c1120');g.addColorStop(1,'#10101e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const {x,y,R}=center(),colors=PALETTE[scene];
    const aura=ctx.createRadialGradient(x,y,R*.08,x,y,R*2.8);aura.addColorStop(0,rgba(colors[1],.11));aura.addColorStop(.34,rgba(colors[2],.085));aura.addColorStop(.72,rgba(colors[0],.025));aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.fillRect(0,0,W,H);
    // An extremely faint illumination follows attention.
    if(pointer.x>=0){const a=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,180);a.addColorStop(0,rgba(colors[0],.045));a.addColorStop(1,'transparent');ctx.fillStyle=a;ctx.fillRect(0,0,W,H)}
    for(let i=0;i<twinkles.length;i++){
      const s=twinkles[i],a=(.12+.28*(.5+.5*Math.sin(t*s.speed+s.phase)));
      ctx.fillStyle=`rgba(233,236,250,${a})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    }
    // Sparse drifting points imply a vast space outside the visible field.
    for(let i=0;i<ambientSparks.length;i++){
      const s=ambientSparks[i],x=((s.x*W+t*(.8+i%3))%(W+60))-30,y=s.y*H+Math.sin(t*.2+s.phase)*13;
      ctx.fillStyle=rgba(colors[i%3],.11);ctx.fillRect(x,y,1.5,1.5);
    }
  }
  function glow(x,y,r,color,alpha=.5){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.26,rgba(color,alpha*.38));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  function arcLine(x,y,rx,ry,ang,color,opacity,width=1){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle=rgba(color,opacity);ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawThreshold(t){
    const {x,y,R}=center(),cols=PALETTE.threshold,dx=clamp((pointer.x-x)/W,-.4,.4),dy=clamp((pointer.y-y)/H,-.3,.3);
    glow(x,y,R*.94,cols[1],.13);glow(x,y,R*.32,cols[0],.17);
    for(let k=0;k<9;k++){
      const z=k/9,rx=R*(.27+z*.66),ry=R*(.93-z*.37),ang=t*(k%2?-.026:.03)+k*.41+dx*.9;
      arcLine(x+dx*35,y+dy*15,rx,ry,ang,cols[k%3],.13+.10*Math.sin(t*.3+k)**2,k%3===0?1.3:.6);
    }
    // A folded membrane: the inner universe is not a sphere, but a moving boundary.
    for(let j=0;j<5;j++){
      ctx.beginPath();ctx.lineWidth=j===2?1.8:1.05;ctx.strokeStyle=rgba(cols[j%3],.38-j*.028);
      for(let i=0;i<=290;i++){
        const q=i/290*Math.PI*2,lat=Math.sin(q*3+j*1.7+t*.22),rad=R*(.62+.2*lat),xx=x+Math.cos(q+t*.028+j*.7)*rad*(.6+j*.07)+dx*36,yy=y+Math.sin(q*1.1+j*.7)*R*.51+Math.cos(q*2.1+t*.28+j)*R*.12;
        if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
      }ctx.stroke();
    }
    for(let i=0;i<165;i++){
      const a=i*2.39996+t*(.007+i%7*.0008),z=(i+.5)/165,r=R*(.16+.82*Math.sqrt(z)),xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.83,shift=pointer.x>0?Math.exp(-((xx-pointer.x)**2+(yy-pointer.y)**2)/17000):0;
      ctx.fillStyle=rgba(cols[i%3],(.18+.45*(1-z))*(1+shift*.6));ctx.beginPath();ctx.arc(xx,yy,(i%19===0?1.7:.62)+shift,0,6.28);ctx.fill();
    }
    glow(x,y,28,cols[1],.36);ctx.fillStyle='#f2e5dc';ctx.beginPath();ctx.arc(x,y,1.8,0,6.28);ctx.fill();
  }
  function breathPhase(t){const p=(t%11)/11;return p<.43?ease(p/.43):1-ease((p-.43)/.57)}
  function drawBreath(t){
    const {x,y,R}=center(),c=PALETTE.breath,p=breathPhase(t),rr=R*(.60+.22*p);
    glow(x,y,rr*1.5,c[0],.075+p*.06);glow(x,y,rr*.8,c[2],.11);
    for(let i=0;i<15;i++){arcLine(x,y,rr*(.65+i*.032),rr*(.68+i*.030),t*.009+i*.06,c[i%3],.028+p*.01,.6)}
    for(let i=0;i<340;i++){
      const u=(i+.5)/340,z=1-2*u,a=i*2.39996323+t*.029,s=Math.sqrt(1-z*z),f=rr*(.75+.12*Math.sin(a*3+t*.24));
      const xx=x+Math.cos(a)*s*f,yy=y+z*f*.88+Math.sin(a+t*.4)*2;
      const near=(Math.sin(a)*s+1)/2;
      ctx.fillStyle=rgba(c[i%3],(.13+near*.52)*(i%23===0?1.6:1));ctx.beginPath();ctx.arc(xx,yy,(i%37===0?1.75:.8)*(near*.6+.65),0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<6;i++){
      ctx.beginPath();ctx.strokeStyle=rgba(c[i%3],.12);ctx.lineWidth=.7;const r=rr*(.7+.07*i);
      for(let j=0;j<=140;j++){const a=j/140*Math.PI*2,dist=r*(.92+.055*Math.sin(5*a+t*.35+i));const xx=x+Math.cos(a)*dist,yy=y+Math.sin(a)*dist;
        j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.stroke();
    }
    glow(x,y,rr*.36,c[0],.22);ctx.beginPath();ctx.fillStyle=rgba(c[0],.9);ctx.arc(x,y,1.5,0,6.28);ctx.fill();
    const pnum=(t%11);const inward=pnum<4.73;$('breathVerb').textContent=inward?'들이쉬기':'내쉬기';$('breathCount').textContent=Math.ceil(inward?4.73-pnum:11-pnum);
  }
  function drawTime(t){
    const {x,y,R}=center(),c=PALETTE.time,shift=state.timeShift/100;
    glow(x,y,R*.9,c[0],.13);
    for(let i=-32;i<=32;i++){
      const f=i/32,xx=x+f*R*1.22,delta=Math.abs(f),h=R*(.82+.18*Math.sin(i*3.4));
      ctx.beginPath();ctx.lineWidth=(i===0?1.7:.65);ctx.strokeStyle=rgba(i<0?c[1]:c[0],(i===0?.65:.08+(.08*(1-delta))));
      ctx.moveTo(xx,y-h);ctx.bezierCurveTo(xx+Math.sin(t*.13+i)*23,y-h*.35,xx-30*Math.cos(t*.2+i*.2),y+h*.38,xx,y+h);ctx.stroke();
    }
    for(let k=0;k<29;k++){
      const dir=k%2?-1:1,phase=k*.21+t*(.07+.02*(k%4)),r=R*(.2+(k/29)*1.03),side=Math.sin(phase*2.7+shift*2)*R*.2;
      ctx.beginPath();ctx.lineWidth=.6+((k%5===0)?.8:0);ctx.strokeStyle=rgba(c[k%3],.08+.11*(1-k/29));
      const start=x-r*(1+shift*.13),end=x+r*(1-shift*.13);
      ctx.moveTo(start,y+side);ctx.bezierCurveTo(x-r*.43,y+Math.cos(phase+dir)*R*.7,x+r*.52,y+Math.sin(phase-dir)*R*.8,end,y-side);ctx.stroke();
    }
    for(let i=0;i<150;i++){
      const speed=(i%7+2)*.016,p=((rnd(i*3+12)+t*speed*(state.reduceMotion?.22:1))%1),xx=x+(p-.5)*R*2.3+shift*R*.3,yy=y+Math.sin(i*9.8+p*5)*R*.72;
      ctx.fillStyle=rgba(xx<x?c[1]:c[0],.09+Math.sin(p*3.14)*.34);ctx.beginPath();ctx.arc(xx,yy,i%17===0?1.8:.7,0,6.28);ctx.fill();
    }
    const line=ctx.createLinearGradient(x,y-R,x,y+R);line.addColorStop(0,'transparent');line.addColorStop(.5,rgba(c[0],.8));line.addColorStop(1,'transparent');ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y-R);ctx.lineTo(x,y+R);ctx.stroke();glow(x,y,36,c[0],.45);
  }
  function growBranch(x,y,length,angle,depth,seed,progress,thickness,color){
    if(progress<=0)return;
    const d=depth,portion=clamp(progress*6-d*.20,0,1);
    if(portion<=0)return;
    const ex=x+Math.sin(angle)*length*portion,ey=y-Math.cos(angle)*length*portion;
    ctx.lineWidth=thickness;ctx.lineCap='round';ctx.strokeStyle=rgba(color,.34+.4*portion);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
    if(depth<=0){glow(ex,ey,6,color,.2);ctx.beginPath();ctx.fillStyle=rgba(color,.38+.33*portion);ctx.ellipse(ex,ey,2.7+3*portion,1.1+portion,angle-.7,0,Math.PI*2);ctx.fill();return}
    const nr=seed*8.1+depth*7.9,angleL=angle-(.34+.29*rnd(nr)),angleR=angle+(.36+.29*rnd(nr+1));
    growBranch(ex,ey,length*(.69+.045*rnd(nr+5)),angleL,depth-1,seed,progress,thickness*.71,color);
    growBranch(ex,ey,length*(.70+.045*rnd(nr+9)),angleR,depth-1,seed,progress,thickness*.71,color);
  }
  function drawLife(t){
    const {x,y,R}=center(),c=PALETTE.life,ground=mobile()?H*.59:H*.78;
    const g=ctx.createLinearGradient(0,ground-50,0,H);g.addColorStop(0,'transparent');g.addColorStop(1,rgba(c[0],.06));ctx.fillStyle=g;ctx.fillRect(0,ground-50,W,H-ground+50);
    ctx.beginPath();ctx.strokeStyle=rgba(c[0],.21);ctx.lineWidth=.7;ctx.moveTo(x-R*1.4,ground);ctx.quadraticCurveTo(x,ground-20,x+R*1.4,ground);ctx.stroke();
    for(let i=0;i<90;i++){const xx=x+(rnd(i*7+2)-.5)*R*2.7,yy=ground+(rnd(i*3+8)-.5)*13;ctx.fillStyle=rgba(c[i%3],rnd(i+3)*.23);ctx.fillRect(xx,yy,1,1)}
    state.sprouts.forEach((sp,i)=>{
      const baseX=x+sp.x*Math.min(W*.25,260),growth=Math.min(1,(Date.now()-sp.born)/4400+.27),len=22+R*.16+rnd(sp.seed)*R*.12;
      ctx.save();ctx.shadowBlur=7;ctx.shadowColor=rgba(c[i%3],.24);growBranch(baseX,ground,len,(rnd(sp.seed+9)-.5)*.3,5,sp.seed,growth,2.3,c[i%3]);ctx.restore();
      glow(baseX,ground,11,c[0],.19);
      const bright=1+(Math.sin(t*.38+i)*.4);ctx.fillStyle=rgba(c[i%3],.5);ctx.beginPath();ctx.arc(baseX,ground,1.7*bright,0,6.28);ctx.fill();
    });
    for(let i=0;i<40;i++){
      const px=x+(rnd(i*23+12)-.5)*R*2.4,py=ground-rnd(i*99+7)*R*1.8+Math.sin(t*.35+i)*7;
      ctx.fillStyle=rgba(c[i%3],.09+.16*rnd(i*34));ctx.beginPath();ctx.arc(px,py,rnd(i+22)*1.6,0,6.28);ctx.fill();
    }
    if(!state.sprouts.length){glow(x,ground-90,90,c[0],.13);ctx.fillStyle=rgba(c[0],.7);ctx.font='300 12px "Noto Serif KR",serif';ctx.textAlign='center';ctx.fillText('모든 숲은 한 번의 시작에서',x,ground-90)}
  }
  function drawPerception(t){
    const {x,y,R}=center(),c=PALETTE.perception,lens=state.lens/100,inv=state.invert?1:-1,px=clamp((pointer.x-x)/W,-.3,.3);
    glow(x,y,R*1.3,c[0],.08);
    ctx.save();ctx.translate(x,y);ctx.rotate(lens*.44+t*.014);ctx.globalCompositeOperation=state.invert?'screen':'source-over';
    for(let layer=0;layer<3;layer++){
      ctx.save();ctx.rotate(layer*1.047+px*.8);ctx.scale(1,.66+.12*layer);
      for(let j=0;j<22;j++){
        const r=R*(.24+j*.031),ang=t*.08*inv+j*.025;
        ctx.beginPath();ctx.lineWidth=.67;ctx.strokeStyle=rgba(c[(layer+j)%3],.045+j*.005);
        ctx.ellipse(0,0,r,r*.95,ang,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }
    const lensA=R*(.58+.1*lens),lensB=R*(.65-.1*lens);
    for(let k=0;k<2;k++){
      ctx.beginPath();ctx.lineWidth=1.2;ctx.strokeStyle=rgba(c[k],.48);const dx=(k?1:-1)*R*.17+lens*R*.17;
      ctx.ellipse(dx,0,lensA,lensB,Math.PI/3*(k?1:-1),0,Math.PI*2);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';ctx.restore();
    const cx=x+lens*R*.14;glow(cx,y,Math.max(18,R*.3),state.invert?c[0]:c[1],state.invert?.30:.18);
    ctx.save();ctx.translate(cx,y);ctx.rotate(t*.025);ctx.strokeStyle=rgba(state.invert?c[0]:c[2],.67);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-R*.14,0);ctx.quadraticCurveTo(0,-R*.18,R*.14,0);ctx.quadraticCurveTo(0,R*.18,-R*.14,0);ctx.stroke();ctx.fillStyle=state.invert?'#f2d7f5':'#b3c9e4';ctx.beginPath();ctx.arc(0,0,2.4,0,6.28);ctx.fill();ctx.restore();
  }
  function drawConnection(t){
    const {x,y,R}=center(),c=PALETTE.connection;glow(x,y,R*1.1,c[1],.08);
    // An invisible network exists even before the first word is given.
    for(let i=0;i<42;i++){
      const ang=i*2.3999632+t*.012,rr=Math.sqrt((i+.5)/42)*R*.9,xx=x+Math.cos(ang)*rr,yy=y+Math.sin(ang)*rr*.74;
      ctx.fillStyle=rgba(c[i%3],.09+.14*Math.sin(i+t*.1)**2);ctx.beginPath();ctx.arc(xx,yy,i%7===0?1.3:.6,0,6.28);ctx.fill();
    }
    const nodes=state.stars.map((s,i)=>({x:s.x*W,y:s.y*H,label:s.label,i}));
    nodes.forEach((a,i)=>{
      nodes.slice(i+1).forEach(b=>{
        const dist=Math.hypot(a.x-b.x,a.y-b.y),alpha=clamp((R*1.3-dist)/(R*1.4),0,.37);if(alpha<.025)return;
        ctx.beginPath();ctx.strokeStyle=rgba(c[(i+b.i)%3],alpha);ctx.lineWidth=.7;ctx.moveTo(a.x,a.y);
        ctx.quadraticCurveTo((a.x+b.x)/2+(a.y-b.y)*.08,(a.y+b.y)/2-(a.x-b.x)*.08,b.x,b.y);ctx.stroke();
      });
    });
    nodes.forEach(({x:px,y:py,label,i})=>{
      glow(px,py,33,c[i%3],.19+.04*Math.sin(t+i));ctx.beginPath();ctx.fillStyle=rgba(c[i%3],.85);ctx.arc(px,py,2.1+(Math.sin(t*.65+i)+1)*.6,0,6.28);ctx.fill();
      ctx.beginPath();ctx.strokeStyle=rgba(c[i%3],.24);ctx.lineWidth=.7;ctx.arc(px,py,9+Math.sin(t*.5+i),0,6.28);ctx.stroke();
      ctx.font='400 11px "Noto Sans KR",sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(244,234,236,.82)';ctx.fillText(label,px,py-17);
    });
    if(!nodes.length){ctx.save();ctx.textAlign='center';ctx.font='300 12px "Noto Serif KR",serif';ctx.fillStyle=rgba(c[0],.7);ctx.fillText('당신의 말이 별빛이 되는 곳',x,y);ctx.restore()}
  }
  function drawEcho(t){
    const {x,y,R}=center(),c=PALETTE.echo;
    glow(x,y,R*1.4,c[0],.075);let n=180;
    for(let k=0;k<3;k++){
      ctx.beginPath();ctx.strokeStyle=rgba(c[k],.18+k*.04);ctx.lineWidth=.7+k*.2;
      for(let i=0;i<=n;i++){
        const v=i/n,phase=v*11*Math.PI+t*.095+k*2.1,xx=x+Math.sin(phase)*R*(.23+.24*Math.sin(v*Math.PI)),yy=y+(v-.5)*R*2.1;
        if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
      }ctx.stroke();
    }
    const count=11+state.sprouts.length+state.stars.length+state.breaths%18;
    for(let i=0;i<count;i++){
      const a=i*2.39996+t*.018,dist=Math.sqrt((i+.5)/count)*R*.95,xx=x+Math.cos(a)*dist,yy=y+Math.sin(a)*dist*.92;
      glow(xx,yy,7+(i%4)*2,c[i%3],.10);ctx.fillStyle=rgba(c[i%3],.5);ctx.beginPath();ctx.arc(xx,yy,i%5===0?1.6:.7,0,6.28);ctx.fill();
    }
    glow(x,y,R*.19,c[0],.26);
  }
  function render(ms){
    raf=requestAnimationFrame(render);
    if(document.hidden)return;
    const targetInterval=state.reduceMotion?130:24;
    if(ms-lastFrame<targetInterval)return;lastFrame=ms;
    const t=state.reduceMotion?sceneStart/1000:(ms/1000);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    background(t);
    if(scene==='threshold')drawThreshold(t);
    if(scene==='breath')drawBreath(t);
    if(scene==='time')drawTime(t);
    if(scene==='life')drawLife(t);
    if(scene==='perception')drawPerception(t);
    if(scene==='connection')drawConnection(t);
    if(scene==='echo')drawEcho(t);
  }
  resize();updateButtons();updateSoundButton();updateDuration();setInterval(updateDuration,1000);
  const initialScene=IDS.includes(location.hash.slice(1))?location.hash.slice(1):'threshold';
  setScene(initialScene,true);raf=requestAnimationFrame(render);
})();
