/* LIMEN — six living gardens. No frameworks, trackers, APIs, or remote assets. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('universe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TWO_PI = Math.PI * 2;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, x) => a + (b - a) * x;
  const smooth = (v) => v * v * (3 - 2 * v);
  const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
  const scenes = [
    {
      no:'00', tag:'THE THRESHOLD', eyebrow:'AN INVITATION TO EXIST',
      title:'어쩌면,<br><em>우주는</em><br>당신의 안쪽에.',
      lead:'세상을 이해하려 애쓰지 않아도 되는 곳.\n당신이 숨 쉬고 바라보는 것만으로\n조용히 변하는 여섯 개의 세계.',
      detail:'여기는 정답을 찾는 곳이 아니라, 질문과 함께 잠시 머무는 곳입니다.',
      quote:'존재한다는 건, 아직 끝나지 않았다는 뜻.',
      poem:'당신이 아무것도 하지 않는 순간에도, 삶은 계속 피어납니다.',
      hint:'SCROLL · TOUCH · WONDER', glyph:'✦', name:'THE GARDEN IS LISTENING'
    },
    {
      no:'01', tag:'THE BREATH', nav:'숨', eyebrow:'I · THE RHYTHM OF BEING',
      title:'세상이 아니라<br><em>나의 숨이</em><br>시간을 만듭니다.',
      lead:'숨을 들이쉬면 우주가 가까워지고,\n내쉬면 세상이 조금 더 넓어집니다.',
      detail:'원 안의 느린 진동을 느껴보세요. 동그란 세계가 당신의 속도로 호흡합니다.',
      quote:'나는 지금, 존재하기에 충분하다.',
      poem:'한 번의 들숨 사이에도, 우주는 오래된 이야기를 끝냅니다.',
      hint:'BREATHE WITH THE LIGHT', glyph:'◌', name:'YOUR INNER TIDE'
    },
    {
      no:'02', tag:'THE TIME', nav:'시간', eyebrow:'II · AN OCEAN OF MOMENTS',
      title:'지나간 것은<br><em>사라지는</em><br>것일까요.',
      lead:'과거는 뒤에 있지 않고, 미래는 앞에 있지 않습니다.\n모든 시간은 지금, 이 수면에 닿아 있습니다.',
      detail:'시간의 결을 움직여보세요. 같은 풍경에도 서로 다른 빛이 깃듭니다.',
      quote:'지금은 기억과 가능성이 잠시 악수하는 곳.',
      poem:'시간은 흘러가는 것이 아니라, 우리를 통과하며 빛납니다.',
      hint:'MOVE THROUGH TIME', glyph:'⌛', name:'THE TIME LOOM'
    },
    {
      no:'03', tag:'THE MIND', nav:'마음', eyebrow:'III · THE LAKE WITH NO BOTTOM',
      title:'어떤 마음도<br><em>영원히 같은</em><br>모양은 아닙니다.',
      lead:'마음 하나를 호수에 내려놓아 보세요.\n그것은 가라앉지 않고, 빛의 파문이 됩니다.',
      detail:'무슨 말이든 괜찮습니다. 이곳의 마음은 어디에도 전송되거나 저장되지 않습니다.',
      quote:'물결을 억지로 멈출 필요는 없습니다.',
      poem:'마음이 흔들린다는 건, 아직 무언가를 느낀다는 뜻.',
      hint:'RELEASE A WORD INTO WATER', glyph:'◈', name:'THE LAKE OF UNSAID THINGS'
    },
    {
      no:'04', tag:'THE LIFE', nav:'생명', eyebrow:'IV · THE GRAMMAR OF GROWTH',
      title:'생명은<br>완벽한 계획보다<br><em>작은 우연을</em><br>닮았습니다.',
      lead:'빈 곳을 가볍게 건드려 보세요.\n하나의 가능성이 가지가 되고,\n여러 갈래의 우연이 숲이 됩니다.',
      detail:'같은 방식으로 태어나도, 똑같이 자라는 두 나무는 없습니다.',
      quote:'성장은 서두르는 일이 아니라, 다른 방향을 허락하는 일.',
      poem:'아주 작은 시작이, 아직 없던 방향을 발명합니다.',
      hint:'TOUCH TO PLANT A POSSIBILITY', glyph:'❈', name:'A GARDEN OF ALMOST'
    },
    {
      no:'05', tag:'THE PERCEPTION', nav:'인식', eyebrow:'V · THE ART OF NOT KNOWING',
      title:'보이는 세계가<br><em>세계의 전부는</em><br>아닙니다.',
      lead:'시선이 움직일 때마다\n하나의 현실 속에서 다른 현실이 드러납니다.',
      detail:'빛의 원을 움직여 서로 다른 세계를 겹쳐보세요. 보는 행위는 언제나 선택입니다.',
      quote:'이해할 수 없는 것을, 아름답게 바라볼 수도 있다.',
      poem:'다르게 보인다고 해서, 어느 하나가 거짓인 것은 아닙니다.',
      hint:'MOVE YOUR GAZE TO REVEAL', glyph:'◎', name:'THE SECOND SIGHT'
    },
    {
      no:'06', tag:'THE RELATION', nav:'관계', eyebrow:'VI · THE CONSTELLATION OF US',
      title:'우리는<br><em>홀로 빛나는</em><br>별이 아닙니다.',
      lead:'가까워졌다 멀어지는 모든 존재들이\n서로의 궤도를 조금씩 바꿉니다.',
      detail:'빛 사이를 건드려 보세요. 한 점의 움직임이 수많은 관계를 바꿉니다.',
      quote:'나의 경계는, 어쩌면 당신이 시작되는 곳.',
      poem:'어떤 별은 다른 별의 밤을 지나며, 처음으로 자신을 발견합니다.',
      hint:'TOUCH TO CHANGE THE CHOIR', glyph:'✧', name:'THE LIVING CONSTELLATION'
    },
    {
      no:'∞', tag:'THE STILLNESS', nav:'멈춤', eyebrow:'AN UNWRITTEN EPILOGUE',
      title:'아무것도<br><em>하지 않아도</em><br>괜찮습니다.',
      lead:'삶은 언제나 무언가를 이루어야만\n가치 있는 것은 아닙니다.',
      detail:'조금 머물러도 괜찮습니다. 이 방에는 목표도, 완료 버튼도 없습니다.',
      quote:'멈춘 시간에도, 나는 여기 있다.',
      poem:'고요함은 비어 있음이 아니라, 모든 것이 들어올 수 있는 자리.',
      hint:'THERE IS NOTHING TO DO', glyph:'·', name:'THE SPACE THAT HOLDS YOU'
    }
  ];

  const palette = [
    ['#09131b','#b9ddc4','#d8b59f'],
    ['#07171c','#b7ddce','#dbb39f'],
    ['#081321','#9cbcd7','#f2bf97'],
    ['#081822','#acd9ce','#e4c5aa'],
    ['#091820','#a8d7b6','#efcb96'],
    ['#0d1321','#9ca5df','#e5aeaf'],
    ['#0a111b','#bad9c5','#efbd9c'],
    ['#080f15','#bcc9b9','#dec4a3']
  ];

  let scene = 0, W = 0, H = 0, DPR = 1, t = 0, previous = 0, frame = 0;
  let sceneEntered = performance.now() / 1000;
  let breathGuide = true, breathSeconds = 12, timeValue = 0, lifeSeason = 40, inverted = false;
  let motion = !reducedMotion, soundEnabled = false, soundCtx = null, soundNodes = [], soundMaster = null;
  let lastFocus = null, toastTimer = null, poemTimer = null, finaleAvailable = false;
  let mouse = {x:0.7,y:0.51,active:false,pressed:false};
  let lens = {x:0.7,y:0.51};
  const visited = new Set();
  const history = [];
  const drops = [];
  const thresholdImpulses = [];
  let plants = [];
  let agents = [];
  const beacons = [];
  const stars = Array.from({length:160}, () => ({x:Math.random(),y:Math.random(),r:rnd(1.4,.25),a:rnd(.35,.06),tw:rnd(3,.5)}));
  const pollen = Array.from({length:68}, () => ({x:Math.random(),y:Math.random(),a:rnd(.6,.1),s:rnd(2,.4),r:rnd(1.7,.4)}));
  const scenePoems = [
    ['숨 쉬는 동안은, 언제든 다시 시작할 수 있습니다.','들이쉼과 내쉼 사이에는 아무런 이름도 없는 평화가 있습니다.','지금 여기. 그것이면 충분한 순간.'],
    ['기억은 지나간 시간이 아니라, 아직 빛나는 시간입니다.','내일은 오지 않은 오늘의 다른 이름일지도 모릅니다.','한순간을 오래 바라보면, 그 안에도 계절이 있습니다.'],
    ['어떤 감정은 해결보다 목격을 원합니다.','흔들리는 물에도 하늘은 비칩니다.','당신의 마음은 파문만큼 넓어질 수 있습니다.'],
    ['꽃을 피우지 않아도, 뿌리는 살아 있습니다.','똑같은 시작에서도 전혀 다른 우주가 자랍니다.','우연은 생명이 자신에게 주는 선물입니다.'],
    ['우리가 보는 것은 세계이자 우리의 시선입니다.','확신의 바깥에도 아름다움은 자랍니다.','당신의 눈이 닿는 곳마다 또 하나의 문이 열립니다.'],
    ['관계란 서로를 바꾸면서도 서로로 남는 일.','혼자가 아니기에, 나는 더 나다워집니다.','멀리 떨어져도 빛의 흔적은 남습니다.']
  ];

  function fillNav() {
    $('chapterItems').replaceChildren();
    $('mobileNav').replaceChildren();
    for(let i = 1; i <= 6; i++) {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'chapter-button'; item.dataset.scene = i;
      item.setAttribute('aria-label', `${i}번째 정원, ${scenes[i].nav}`);
      item.innerHTML = `<span class="c-line" aria-hidden="true"></span><span class="c-index">0${i}</span><span class="c-name">${scenes[i].nav}</span>`;
      item.addEventListener('click', () => goTo(i));
      $('chapterItems').appendChild(item);
      const mob = document.createElement('button');
      mob.type='button'; mob.className='mobile-tab'; mob.dataset.scene=i; mob.textContent=scenes[i].nav;
      mob.addEventListener('click', () => goTo(i));
      $('mobileNav').appendChild(mob);
    }
    for(let i=0;i<6;i++) {
      const mark = document.createElement('span'); mark.className='visited-mark';
      mark.setAttribute('aria-hidden','true'); $('visitedMarks').appendChild(mark);
    }
  }

  function escapeHTML(s) {return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setPoem(s) {
    const e=$('poem'); e.classList.add('changed');
    clearTimeout(poemTimer);
    poemTimer = setTimeout(() => { $('poemText').textContent = s; e.classList.remove('changed'); }, 175);
  }
  function spontaneousPoem() {
    if(scene<1 || scene>6)return;
    const lines=scenePoems[scene-1], selected=lines[Math.floor(Math.random()*lines.length)];
    setPoem(selected); history.push({scene, line:selected});
    if(history.length>24) history.shift();
  }
  function updateVisits() {
    document.querySelectorAll('.chapter-button,.mobile-tab').forEach(b => {
      const i=Number(b.dataset.scene);
      b.classList.toggle('active',i===scene);
      b.classList.toggle('visited',visited.has(i));
      if(i===scene) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
    });
    Array.from($('visitedMarks').children).forEach((e,i)=>e.classList.toggle('done',visited.has(i+1)));
    $('visitedCount').textContent = `${String(visited.size).padStart(2,'0')} / 06`;
    if(visited.size===6 && !finaleAvailable){
      finaleAvailable=true;
      $('stillnessButton').innerHTML='나의 문장 보기 <span aria-hidden="true">↗</span>';
      showToast('여섯 개의 세계가 하나의 문장을 남겼습니다.');
    }
  }
  function goTo(n) {
    n=clamp(n,0,7);
    scene=n; sceneEntered=t;
    $('app').dataset.scene=String(n);
    const data=scenes[n];
    $('chapterNo').textContent=data.no;
    $('chapterTag').textContent=data.tag;
    $('eyebrow').textContent=data.eyebrow;
    $('heroTitle').innerHTML=data.title; // HTML is only from trusted, local scene definitions.
    $('lead').textContent=data.lead;
    $('detail').textContent=data.detail;
    $('sideQuote').textContent=`“${data.quote}”`;
    $('interactionGlyph').textContent=data.glyph;
    $('interactionName').textContent=data.name;
    $('interactionNum').textContent=data.no;
    $('gestureHint').textContent=data.hint;
    $('statusText').textContent = n===0?'A QUIET UNIVERSE, ALWAYS UNFOLDING':(n===7?'REST IS A FORM OF BEING':`GARDEN ${data.no} · YOU CHANGE WHAT YOU TOUCH`);
    setPoem(data.poem);
    $('storyActions').innerHTML = n===0 ? '<button type="button" id="enterButton" class="primary-action">정원에 들어가기 <span aria-hidden="true">↗</span></button><span class="action-aside">소요 시간 없음 · 목적지 없음</span>' : '';
    if(n===0) $('enterButton').addEventListener('click',()=>goTo(1));
    if(n>=1 && n<=6)visited.add(n);
    if(n===4 && !plants.length) resetPlants();
    if(n===6 && !agents.length) initializeAgents();
    if(n===5) {lens.x=mouse.x; lens.y=mouse.y;}
    if(n===7) updateAudio(true);
    else updateAudio(false);
    updateVisits(); renderControls();
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search + (n>0 ? '#'+(n===7?'stillness':`garden-${n}`) : '')); } catch (_) { /* Some embedded/offline previews have an opaque origin. */ }
  }
  function renderControls() {
    const parent=$('interactionBody');
    if(scene===0) parent.innerHTML='<p>별을 건드리고, 물에 마음을 놓고,<br>시간의 결을 만져보세요.<br>답은 필요하지 않습니다.</p>';
    else if(scene===1) parent.innerHTML=`<div class="breath-indicator"><strong id="breathPhase">들이쉬기</strong><span id="breathRemaining">천천히, 자연스럽게</span></div><div class="control-row"><button class="small-button" id="breathToggle" type="button">${breathGuide?'호흡 안내 멈춤':'호흡 안내 시작'}</button></div><div style="margin-top:12px"><label class="field-label" for="breathRange">한 호흡의 길이 <output id="breathValue">${breathSeconds}초</output></label><input id="breathRange" class="garden-range" type="range" min="8" max="18" step="1" value="${breathSeconds}"></div>`;
    else if(scene===2) parent.innerHTML=`<label class="field-label" for="timeRange">시간의 방향 <output id="timeLabel">지금 · 현재</output></label><input id="timeRange" class="garden-range" type="range" min="-100" max="100" step="1" value="${timeValue}"><div class="control-row"><button id="resetTime" class="small-button" type="button">지금으로 돌아오기</button><span class="field-help">풍경의 빛도 함께 변합니다.</span></div>`;
    else if(scene===3) parent.innerHTML='<label class="field-label" for="mindInput">지금, 마음에 있는 한마디</label><input id="mindInput" class="garden-input" placeholder="예: 괜찮아, 그리움, 고마움" maxlength="24" autocomplete="off"><div class="control-row"><button id="releaseMind" class="small-button" type="button">호수에 놓기 ↗</button><button id="clearMind" class="soft-button" type="button">물결 비우기</button></div><div class="field-help">이 글은 기기 밖으로 보내지지 않습니다.</div>';
    else if(scene===4) parent.innerHTML=`<label class="field-label" for="seasonRange">생명의 계절 <output id="seasonLabel">${seasonText()}</output></label><input id="seasonRange" class="garden-range" type="range" min="0" max="100" value="${lifeSeason}"><div class="control-row"><button id="newGarden" class="small-button" type="button">다른 우연 만나기 ↗</button></div><div class="field-help">화면의 빈 곳을 터치하면 새 생명이 자랍니다.</div>`;
    else if(scene===5) parent.innerHTML=`<p style="margin:0 0 12px">빛의 원 안과 밖. 어느 쪽이 현실일까요?</p><button id="invertReality" class="small-button" type="button">시점 뒤집기 ↗</button><p class="field-help" id="perceptionLabel">보이는 것 너머에 또 하나의 세계가 있습니다.</p>`;
    else if(scene===6) parent.innerHTML='<p style="margin:0 0 12px">한 존재에게 닿으면, 수많은 궤도가 바뀝니다.</p><div class="control-row"><button id="attractButton" class="small-button" type="button">빛 하나 남기기 ✧</button><button id="clearBeacons" class="soft-button" type="button">빛 놓아주기</button></div><p class="field-help">공간을 터치하거나 마우스를 움직여보세요.</p>';
    else parent.innerHTML='<p>해야 할 일은 없습니다.<br>눈을 감아도, 바라보아도 좋습니다.</p><div class="control-row"><button id="restartButton" class="small-button" type="button">다시 산책하기 ↗</button></div>';
    if(scene===1){
      $('breathToggle').onclick=()=>{breathGuide=!breathGuide; $('breathToggle').textContent=breathGuide?'호흡 안내 멈춤':'호흡 안내 시작'; spontaneousPoem();};
      $('breathRange').oninput=e=>{breathSeconds=Number(e.target.value);$('breathValue').textContent=breathSeconds+'초';};
    } else if(scene===2){
      $('timeRange').oninput=e=>{timeValue=Number(e.target.value);updateTimeLabel();};
      $('resetTime').onclick=()=>{timeValue=0;$('timeRange').value='0';updateTimeLabel();spontaneousPoem();};updateTimeLabel();
    } else if(scene===3){
      $('releaseMind').onclick=()=>releaseMind();
      $('mindInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();releaseMind();}};
      $('clearMind').onclick=()=>{drops.length=0;setPoem('물결이 사라져도, 호수는 그대로 남습니다.');showToast('호수에 다시 여백이 생겼습니다.');};
    } else if(scene===4){
      $('seasonRange').oninput=e=>{lifeSeason=Number(e.target.value);$('seasonLabel').textContent=seasonText();};
      $('newGarden').onclick=()=>{resetPlants();spontaneousPoem();showToast('아직 세상에 없던 숲이 시작됩니다.');};
    } else if(scene===5){
      $('invertReality').onclick=()=>{inverted=!inverted; $('perceptionLabel').textContent=inverted?'방금까지의 안쪽이 이제 바깥이 되었습니다.':'보이는 것 너머에 또 하나의 세계가 있습니다.';spontaneousPoem();};
    } else if(scene===6){
      $('attractButton').onclick=()=>{addBeacon(mouse.x,mouse.y);spontaneousPoem();};
      $('clearBeacons').onclick=()=>{beacons.length=0;showToast('빛은 사라져도, 관계의 흔적은 남습니다.');};
    } else if(scene===7) $('restartButton').onclick=()=>goTo(0);
  }
  function seasonText() {return lifeSeason<26?'봄의 시작':lifeSeason<51?'여름의 숨':lifeSeason<76?'가을의 빛':'겨울의 고요';}
  function updateTimeLabel() {
    const el=$('timeLabel');if(!el)return;
    el.textContent=timeValue< -70?'아주 먼 어제':timeValue < -25?'지나간 시간':timeValue<25?'지금 · 현재':timeValue<70?'아직 오지 않은 시간':'먼 미래의 빛';
  }
  function showToast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
  function releaseMind() {
    const input=$('mindInput');const word=input.value.trim().replace(/\s+/g,' ');
    if(!word){showToast('떠오르는 말이 있다면, 한마디만 남겨주세요.');input.focus();return;}
    drops.push({x:clamp(rnd(.85,.52),.05,.96),y:clamp(rnd(.70,.46),.25,.85),word,at:t,phase:rnd(TWO_PI)});
    if(drops.length>18)drops.shift();
    input.value='';setPoem(`“${word}” — 그 마음도 이곳에 잠시 머물다 지나갑니다.`);
    history.push({scene:3,line:'당신이 내려놓은 마음은 새로운 물결이 되었습니다.'});
    showToast('당신의 마음이 빛의 파문이 되었습니다.');
  }

  function showOverlay(kind='help') {
    lastFocus=document.activeElement;
    const title=$('overlayTitle'),content=$('overlayContent'),num=$('overlayNumber'),cta=$('overlayCTA');
    if(kind==='ending') {
      num.textContent='THE POEM THAT ONLY YOU CAN MAKE';
      title.innerHTML='여섯 번의 문턱을 지나,<br><em>당신에게 남은 한 문장.</em>';
      const distinct = [1,2,3,4,5,6].map(i=>history.findLast?.(h=>h.scene===i)?.line || scenePoems[i-1][i%3]);
      content.replaceChildren();
      const p1=document.createElement('p');p1.textContent='숨을 따라 시간을 건너고, 마음을 물에 내려놓았습니다.';
      const p2=document.createElement('p');p2.textContent=distinct[0]+' '+distinct[2];
      const p3=document.createElement('p');p3.textContent=distinct[3]+' '+distinct[5];
      const p4=document.createElement('p');p4.textContent='그리고 결국, 정원은 당신을 바라보고 있었습니다.';
      [p1,p2,p3,p4].forEach(p=>content.appendChild(p));
      cta.innerHTML='고요의 방으로 <span aria-hidden="true">↗</span>';
      cta.onclick=()=>{closeOverlay();goTo(7);};
    } else {
      num.textContent='A NOTE FOR THE VISITOR';
      title.innerHTML='여기서는<br><em>아무것도 증명하지 않아도</em><br>됩니다.';
      content.replaceChildren();
      const instructions=[
        '여섯 개의 정원은 숨, 시간, 마음, 생명, 인식, 관계를 탐색하는 작은 인터랙티브 작품입니다.',
        '왼쪽 목록이나 화면 아래 이름을 눌러 이동하세요. 각 정원에서는 마우스 또는 손가락으로 풍경을 변화시킬 수 있습니다.',
        '키보드는 1–6으로 정원을 이동하고, ← →로 차례대로 탐험합니다. 오른쪽 위의 소리 버튼은 선택 사항입니다.',
        '모든 체험은 이 브라우저 안에서만 작동합니다. 입력한 감정은 서버로 전송되지 않으며 저장되지 않습니다.'
      ];
      instructions.forEach(s=>{const p=document.createElement('p');p.textContent=s;content.appendChild(p);});
      cta.innerHTML='정원을 거닐기 <span aria-hidden="true">↗</span>';
      cta.onclick=()=>closeOverlay();
    }
    $('overlay').hidden=false;
    $('closeOverlay').focus();
  }
  function closeOverlay(){ $('overlay').hidden=true;lastFocus?.focus?.(); }

  function resize() {
    W=window.innerWidth; H=window.innerHeight;
    DPR=Math.min(window.devicePixelRatio||1, W<650?1.5:1.8);
    canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function center() {
    const mob=W<650;
    return {x: W*(mob?.57:W<920?.67:.69),y:H*(mob?.50:.5),r:Math.min(mob?W*.39:W*.25,mob?H*.26:H*.34,330)};
  }
  function line(points,color,width=1) {
    if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function dot(x,y,r,color,blur=0){ctx.save();if(blur){ctx.shadowColor=color;ctx.shadowBlur=blur;}ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),0,TWO_PI);ctx.fill();ctx.restore();}
  function rgba(hex,a) { const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${clamp(a,0,1)})`; }
  function ell(x,y,rx,ry,rot,stroke,width=1){ctx.beginPath();ctx.ellipse(x,y,Math.max(rx,.01),Math.max(ry,.01),rot,0,TWO_PI);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  function background() {
    const p=palette[scene];ctx.fillStyle=p[0];ctx.fillRect(0,0,W,H);
    const c=center();const g=ctx.createRadialGradient(c.x,c.y,c.r*.08,c.x,c.y,Math.max(W,H)*.85);
    g.addColorStop(0,rgba(p[1],scene===7?.055:.11));g.addColorStop(.34,rgba(p[1],.035));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // A second, barely visible horizon helps create a sense of depth.
    const h=ctx.createLinearGradient(0,H*.20,0,H*.9);h.addColorStop(0,'rgba(255,255,255,0)');h.addColorStop(.56,'rgba(157,183,178,.019)');h.addColorStop(1,'rgba(0,0,0,.12)');ctx.fillStyle=h;ctx.fillRect(0,0,W,H);
    for(const s of stars){
      const flutter=.55+.45*Math.sin(t*s.tw+s.x*10);
      dot(s.x*W,s.y*H,s.r,rgba(p[1],s.a*flutter*(scene===7?.45:1)));
    }
    for(let k=0;k<7;k++){
      const yy=H*(.12+k*.125),xx=W*.4;
      line([[xx,yy],[W*.97,yy]],rgba(p[1],.022),.5);
    }
  }
  function wash(x,y,r,col,intensity=.12){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,intensity));g.addColorStop(.42,rgba(col,intensity*.22));g.addColorStop(1,rgba(col,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function orbitDust(c,count=45,offset=0){
    for(let i=0;i<count;i++) {
      const a=i*2.39996+t*(.025+(i%5)*.003)+offset;
      const rr=c.r*(.24+Math.sqrt((i+.5)/count)*1.07);
      const x=c.x+Math.cos(a)*rr,y=c.y+Math.sin(a)*rr*.8;
      const b=.25+.5*Math.sin(i*.61+t*.45)**2;
      dot(x,y,i%9===0?1.45:.65,rgba(i%3?palette[scene][1]:palette[scene][2],b*.75),i%13===0?8:0);
    }
  }
  function drawThreshold() {
    const c=center(),R=c.r*1.03;wash(c.x,c.y,R*1.56,'#9ccfbc',.18);wash(c.x+R*.3,c.y-R*.25,R*.8,'#d9a99b',.10);
    const turn=t*.055;
    for(let j=0;j<58;j++){
      const lon=j/58*TWO_PI+turn,pts=[];
      for(let k=0;k<=88;k++){
        const lat=-Math.PI/2+k/88*Math.PI;
        const r=R*(1+.05*Math.sin(5*lat+2*lon+t*.25));
        const dep=Math.cos(lat)*Math.cos(lon),persp=1+dep*.11;
        const x=c.x+r*Math.cos(lat)*Math.sin(lon)*persp;
        const y=c.y+r*Math.sin(lat)*(.95+dep*.06)+Math.sin(lon*3+t*.28)*R*.018;
        pts.push([x,y]);
      }
      line(pts,rgba(j%9===0?'#eac9ac':'#a7d8c1',.048+.15*((Math.cos(lon)+1)/2)),j%9===0?1.05:.62);
    }
    for(let q=0;q<17;q++){
      const lat=(q/16-.5)*Math.PI,pts=[];
      for(let j=0;j<=140;j++){
        const lon=j/140*TWO_PI+turn;
        const r=R*(1+.04*Math.sin(6*lat+2*lon+t*.2));
        const dep=Math.cos(lat)*Math.cos(lon);
        pts.push([c.x+r*Math.cos(lat)*Math.sin(lon)*(1+dep*.11),c.y+r*Math.sin(lat)*(.96+dep*.06)]);
      }
      line(pts,rgba('#bcdfcb',.045+(q%4===0?.08:0)),.7);
    }
    // Thin orbital petals, slightly asymmetrical, appear alive rather than mechanical.
    for(let k=0;k<9;k++){
      const pts=[],phase=k*Math.PI/9+turn*.5;
      for(let j=0;j<=160;j++){
        const a=j/160*TWO_PI+phase;
        const rad=R*(.82+.12*Math.cos(a*3+k*.9+t*.12));
        const x=c.x+Math.cos(a)*rad*.96;
        const y=c.y+Math.sin(a)*rad*.44*Math.cos(phase)+Math.cos(a)*rad*.55*Math.sin(phase);
        pts.push([x,y]);
      }
      line(pts,rgba(k%3===0?'#edc7aa':'#b9dec8',.10),.7);
    }
    orbitDust(c,75);
    wash(c.x,c.y,R*.34,'#e8e5cc',.21);dot(c.x,c.y,2.7,'rgba(237,247,230,.83)',12);
    for(let k=0;k<3;k++)ell(c.x,c.y,R*(1.14+k*.21),R*(.96+k*.20),t*.007,rgba('#a3d0bf',.065),.8);
    for(let i=thresholdImpulses.length-1;i>=0;i--){
      const q=thresholdImpulses[i],age=t-q.at;if(age>5){thresholdImpulses.splice(i,1);continue;}
      const rx=q.x*W,ry=q.y*H,alpha=clamp((5-age)/5,0,1);
      for(let k=0;k<4;k++){const radius=(age*70-k*29);if(radius>0)ell(rx,ry,radius,radius*.75,0,rgba('#d4ead8',alpha*(.25-k*.045)),1);}
      dot(rx,ry,1.8,rgba('#f4dbba',alpha),8);
    }
  }

  function breathLevel() {
    const b=breathSeconds;
    if(!breathGuide)return .5+.16*Math.sin(t*.52);
    const phase=((t-sceneEntered)%b+b)%b/b;
    const a=phase<.4?smooth(phase/.4):phase<.50?1:phase<.95?1-smooth((phase-.50)/.45):0;
    const label=$('breathPhase'),remaining=$('breathRemaining');
    if(label&&remaining){
      label.textContent=phase<.4?'들이쉬기':phase<.50?'잠시 머무르기':phase<.95?'내쉬기':'고요히';
      remaining.textContent=phase<.4?'빛이 가까워집니다':phase<.50?'그대로 있어도 괜찮아요':phase<.95?'천천히 놓아주세요':'다음 숨을 기다립니다';
    }
    return a;
  }
  function drawBreath(){
    const c=center(),breath=breathLevel(),R=c.r*(.58+breath*.36);
    wash(c.x,c.y,R*1.9,'#7bceb5',.14+breath*.1);
    wash(c.x,c.y,R*1.1,'#e8c1ae',.10+breath*.08);
    for(let k=23;k>=0;k--){
      const ring=R*(.32+k/23*.95),pts=[];
      for(let j=0;j<=120;j++){
        const a=j/120*TWO_PI;
        const wave=Math.sin(a*7+t*.36+k*.23)*R*.018+Math.sin(a*13-t*.2+k*.3)*R*.009;
        pts.push([c.x+Math.cos(a)*(ring+wave),c.y+Math.sin(a)*(ring+wave)*(.92+.04*Math.sin(t*.12))]);
      }
      line(pts,rgba(k%5===0?'#efcdba':'#b0e4cb',.035+(1-k/25)*.28),k%4===0?1.25:.75);
    }
    for(let k=0;k<12;k++){
      const a=t*.06+k*TWO_PI/12,ring=R*(.55+.14*Math.sin(k+t*.31));
      const x=c.x+Math.cos(a)*ring,y=c.y+Math.sin(a)*ring;
      wash(x,y,R*.22,k%2?'#9ee3d0':'#eac8a8',.08);
      dot(x,y,1.3,rgba('#d8ebd8',.45),7);
    }
    for(let k=0;k<5;k++)ell(c.x,c.y,R*(1.3+k*.18),R*(1.1+k*.16),0,rgba('#a9e5cd',.075),.7);
    dot(c.x,c.y,2,'#e5f1e5',13);orbitDust(c,32,breath);
  }

  function drawTime(){
    const c=center(),s=timeValue/100,phase=(s+1)/2,R=c.r;
    const golden=phase>.48,main=golden?'#f2c7a3':'#a9c5dc';
    wash(c.x,c.y-R*.15,R*1.8,main,.13);
    const horizon=H*.56;
    // Temporal threads recede in perspective toward a horizon.
    for(let k=-24;k<=24;k++) {
      const xx=c.x+(k/24)*R*1.9,points=[];
      for(let j=0;j<=66;j++){
        const p=j/66,y=horizon+(p-.5)*R*1.75;
        const warp=Math.sin(p*9+t*.19+k*.37+s*7)*R*.025*(1+Math.abs(p-.5));
        points.push([xx+warp+(p-.5)*k*R*.017,y]);
      }
      line(points,rgba(k%5===0?'#e8c09f':'#b8d9d1',.035+(1-Math.abs(k)/25)*.12),k%5===0?.95:.58);
    }
    for(let j=0;j<55;j++){
      const depth=j/55;const yy=horizon+R*(depth*1.1-.43);
      const pts=[];
      for(let k=0;k<=90;k++){
        const x=c.x+(k/90-.5)*R*3.8;
        const swell=Math.sin(x*.011+t*.45+depth*6+s*4)*R*.017+Math.sin(x*.022-t*.13+depth*11)*R*.01;
        pts.push([x,yy+swell*(.4+depth)]);
      }
      line(pts,rgba(j%7===0?main:'#aec8c3',.03+depth*.15),j%7===0?1:.6);
    }
    // The present is a luminous vertical opening. It moves as the user scrubs time.
    const centerX=c.x+s*R*.68;
    for(let k=16;k>=0;k--){
      const x=centerX+(k-8)*R*.013;line([[x,horizon-R*.88],[x,horizon+R*.8]],rgba(k%4===0?'#eec3a5':'#bcded0',.035+(1-Math.abs(k-8)/9)*.20),.75);
    }
    const halo=ctx.createRadialGradient(centerX,horizon-R*.08,0,centerX,horizon-R*.08,R*.85);
    halo.addColorStop(0,rgba(main,.23));halo.addColorStop(.4,rgba(main,.035));halo.addColorStop(1,rgba(main,0));ctx.fillStyle=halo;ctx.fillRect(centerX-R,horizon-R,R*2,R*2);
    for(let k=0;k<7;k++)ell(centerX,horizon,R*(.26+k*.135),R*(.52+k*.11),Math.sin(t*.05+k*.7)*.12,rgba(main,.035),.8);
    dot(centerX,horizon-R*.42,3,main,16);orbitDust(c,28,phase);
  }

  function drawLake(){
    const c=center(),R=c.r,horizon=H*.56;
    wash(c.x,horizon-R*.12,R*1.65,'#beded2',.12);
    const reflected=ctx.createLinearGradient(0,horizon-R*.28,0,H);
    reflected.addColorStop(0,'rgba(140,203,194,.055)');reflected.addColorStop(.4,'rgba(80,139,146,.035)');reflected.addColorStop(1,'rgba(0,0,0,.04)');
    ctx.fillStyle=reflected;ctx.fillRect(0,horizon-R*.28,W,H-horizon+R*.28);
    // The floating distant moon is made from imperfect translucent paper contours.
    for(let k=0;k<18;k++){
      const r=R*(.38+k*.022);ell(c.x,horizon-R*.38,r,r,.0,rgba(k%5===0?'#ecccb6':'#b2d9d1',.075-(k/18)*.045),.9);
    }
    wash(c.x,horizon-R*.38,R*.53,'#c4ded0',.11);dot(c.x,horizon-R*.38,2,'#f4dace',10);
    for(let j=0;j<62;j++){
      const depth=j/62,yy=horizon+depth*(H-horizon);
      const pts=[];
      for(let i=0;i<=86;i++){
        const x=i/86*W,amp=2+depth*8;
        pts.push([x,yy+Math.sin(x*.019+t*(.18+depth*.65)+j*.61)*amp+Math.sin(x*.047-t*.35+j*.28)*amp*.21]);
      }
      line(pts,rgba(j%7===0?'#e3c7b4':'#9bd2c7',.023+depth*.095),.7);
    }
    // Each input becomes a ripple. Words appear briefly, then dissolve.
    for(let i=drops.length-1;i>=0;i--){
      const d=drops[i],age=t-d.at;
      if(age>24){drops.splice(i,1);continue;}
      const x=d.x*W,y=d.y*H,fade=clamp(1-age/24,0,1);
      for(let k=0;k<5;k++){
        const rr=Math.max(1,(age*25-k*24));if(rr<=0)continue;
        ell(x,y,rr,rr*.26,0,rgba(k%2?'#dbbaac':'#c3e2d3',fade*(.38-k*.052)),1.2);
      }
      if(age<12){
        const a=Math.min(1,age*.5)*clamp((12-age)/4,0,1);
        ctx.save();ctx.textAlign='center';ctx.font=`${Math.max(12,Math.min(W*.028,17))}px "Noto Serif CJK KR",serif`;ctx.fillStyle=`rgba(238,245,233,${a*.87})`;
        ctx.shadowBlur=12;ctx.shadowColor='rgba(169,228,207,.65)';ctx.fillText(d.word,x,y-24-age*1.7);ctx.restore();
      }
      dot(x,y,1.4,rgba('#f0e8cf',fade*.65),11);
    }
  }

  // An actual generative grammar, different on every visit. Each segment has a birth time.
  function makePlant(x, id=0) {
    const segments=[],leaves=[];
    const rootY=H*(W<650?.76:.83);const height=Math.min(H*.30,W*(W<650?.23:.13))*rnd(1.25,.7);
    const bend=rnd(.25,-.25);
    function branch(px,py,len,angle,depth,level){
      const ex=px+Math.cos(angle)*len,ey=py+Math.sin(angle)*len;
      const birth=level*.13+rnd(.035,0);
      segments.push({x1:px,y1:py,x2:ex,y2:ey,level,birth,width:Math.max(.48,depth*.72)});
      if(depth<=0){leaves.push({x:ex,y:ey,rot:angle,birth:birth+.16,size:rnd(4.7,2.3)});return;}
      const spread=.34+rnd(.44),next=len*rnd(.79,.63);
      branch(ex,ey,next,angle-spread+bend*.3,depth-1,level+1);
      branch(ex,ey,next*rnd(1.1,.75),angle+spread+bend*.3,depth-1,level+1);
      if(depth>4 && Math.random()>.62)branch(ex,ey,next*.77,angle+rnd(.2,-.2),depth-2,level+1);
    }
    branch(x*W,rootY,height*.37,-Math.PI/2+bend,7,0);
    return {x,segments,leaves,born:t+rnd(.8,-.8),tone:id%3};
  }
  function resetPlants(){plants=[makePlant(.54,0),makePlant(.70,1),makePlant(.85,2)];}
  function addPlant(x){plants.push(makePlant(clamp(x,.14,.95),plants.length));if(plants.length>9)plants.shift();spontaneousPoem();}
  function drawLife(){
    const c=center(),season=lifeSeason/100;
    wash(c.x,H*.70,c.r*1.9,season>.75?'#b2cad5':'#87d8af',.08);
    for(let k=0;k<5;k++){
      const y=H*(.79+k*.028);line([[W*.30,y],[W*.99,y]],rgba('#97c6ae',.07-k*.01),.6);
    }
    for(const plant of plants){
      const age=Math.max(0,(t-plant.born)*(.52+season*.09));
      for(const b of plant.segments){
        const progress=clamp((age-b.birth)*2.5,0,1);if(progress<=0)continue;
        const xx=lerp(b.x1,b.x2,smooth(progress)),yy=lerp(b.y1,b.y2,smooth(progress));
        line([[b.x1,b.y1],[xx,yy]],rgba(b.level<3?'#d2c09c':(season>.75?'#b8c3b3':'#a9d9b7'),.16+(1-b.level/10)*.34),b.width);
      }
      for(const l of plant.leaves){
        const growth=clamp((age-l.birth)*2.2,0,1);if(!growth)continue;
        const a=season>.8?.20:.22+growth*.34,scale=(season>.8?.3:1)*growth;
        ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rot+.3);ctx.beginPath();
        ctx.ellipse(0,0,l.size*scale,l.size*.32*scale,0,0,TWO_PI);
        ctx.fillStyle=rgba(season<.3?'#b3e5c4':season<.65?'#b9d8a1':season<.85?'#e2bd91':'#bbced8',a);ctx.fill();ctx.restore();
        if(l.size>4.1 && growth>.8)dot(l.x,l.y,1,rgba('#d5efcb',.23),4);
      }
    }
    for(const m of pollen){
      const x=W*(.38+m.x*.58)+Math.sin(t*.15+m.s*9)*8;
      const y=H*(.83-((m.y+t*.008*m.s)%1)*.63);
      dot(x,y,m.r,rgba(season>.7?'#eac7a5':'#bbdbb0',m.a*.27));
    }
  }

  function drawTopography(c,swap=false){
    for(let i=0;i<29;i++) {
      const ring=c.r*(.22+i*.051),pts=[];
      for(let j=0;j<=140;j++){
        const a=j/140*TWO_PI;
        const distortion=1+.05*Math.sin(a*5+i*.42+t*.15)+.022*Math.sin(a*11-i*.33-t*.12);
        const x=c.x+Math.cos(a)*ring*distortion,y=c.y+Math.sin(a)*ring*distortion*.84;
        pts.push([x,y]);
      }
      line(pts,rgba(swap?'#d6b8e6':'#add5c6',i%5===0?.30:.11),i%5===0?1:.64);
    }
    for(let i=0;i<95;i++){
      const a=i*2.39996+t*.022,rad=c.r*(.16+Math.sqrt(i/95)*1.3);
      dot(c.x+rad*Math.cos(a),c.y+rad*Math.sin(a)*.84,.68,rgba('#c6dfd5',.1));
    }
  }
  function drawHidden(c,swap=false){
    wash(c.x,c.y,c.r*1.12,swap?'#b7d3c6':'#c1b4ed',.15);
    for(let j=0;j<34;j++){
      const k=j/34,pts=[];
      for(let i=0;i<=115;i++){
        const a=i/115*TWO_PI;
        const radial=c.r*(.24+k*1.25)*(1+.19*Math.sin(a*3+j*.9+t*.16));
        const x=c.x+radial*Math.cos(a+t*.015+j*.014),y=c.y+radial*Math.sin(a+t*.015+j*.014)*.82;
        pts.push([x,y]);
      }
      line(pts,rgba(swap?'#afdcc7':'#d0c0ef',j%4===0?.36:.14),j%4===0?1.25:.68);
    }
    for(let i=0;i<85;i++){
      const a=i*2.399963+t*.055,r=c.r*(.3+Math.sqrt(i/85));
      dot(c.x+r*Math.cos(a),c.y+r*Math.sin(a)*.9,i%13===0?2.2:.9,rgba(i%2?'#f0bfb4':'#ddd8fd',.37),i%13===0?8:0);
    }
  }
  function drawPerception(){
    const c=center();lens.x=lerp(lens.x,mouse.x,.06);lens.y=lerp(lens.y,mouse.y,.06);
    const x=lens.x*W,y=lens.y*H,r=Math.min(c.r*.60,W*.22);
    wash(c.x,c.y,c.r*1.65,'#b4b6d9',.10);
    if(inverted)drawHidden(c,true);else drawTopography(c);
    ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TWO_PI);ctx.clip();
    if(inverted)drawTopography(c,true);else drawHidden(c);
    ctx.restore();
    for(let k=0;k<4;k++)ell(x,y,r+k*7,r+k*7,0,rgba(k===0?'#f0d0ba':'#d4caef',k===0?.58:.09),k===0?1.1:.7);
    for(let i=0;i<5;i++){
      const a=t*.15+i*TWO_PI/5;
      dot(x+Math.cos(a)*r,y+Math.sin(a)*r,1.55,rgba('#e8d9de',.64),5);
    }
    dot(x,y,1.4,'rgba(247,238,243,.8)',9);
  }

  function initializeAgents(){
    const count=W<650?68:104,c=center();
    agents=Array.from({length:count},(_,i)=>({x:c.x+rnd(c.r,-c.r),y:c.y+rnd(c.r*.65,-c.r*.65),vx:rnd(1,-1),vy:rnd(1,-1),a:rnd(2,.9),id:i}));
  }
  function addBeacon(x,y){beacons.push({x:clamp(x,.06,.95),y:clamp(y,.07,.91),at:t});if(beacons.length>5)beacons.shift();showToast('새로운 빛이 관계의 궤도에 들어왔습니다.');}
  function drawRelation(dt){
    const c=center();wash(c.x,c.y,c.r*1.65,'#a2d9bf',.10);
    const speed=clamp(dt*60,.2,2);
    for(let i=0;i<agents.length;i++){
      const b=agents[i];let fx=0,fy=0,near=0,avx=0,avy=0,ax=0,ay=0;
      for(let j=0;j<agents.length;j++){
        if(j===i)continue;const n=agents[j],dx=n.x-b.x,dy=n.y-b.y,dd=dx*dx+dy*dy;
        if(dd<5000){near++;avx+=n.vx;avy+=n.vy;ax+=dx;ay+=dy;if(dd<410){fx-=dx*.006;fy-=dy*.006;}}
      }
      if(near){fx+=(avx/near-b.vx)*.018+(ax/near)*.0005;fy+=(avy/near-b.vy)*.018+(ay/near)*.0005;}
      const mx=mouse.x*W,my=mouse.y*H;
      if(mouse.active){let dx=mx-b.x,dy=my-b.y,dist=Math.hypot(dx,dy)+1;if(dist<c.r*1.6){fx+=dx/dist*.018;fy+=dy/dist*.018;}}
      for(const q of beacons){const dx=q.x*W-b.x,dy=q.y*H-b.y,d=Math.hypot(dx,dy)+1;fx+=dx/d*.019;fy+=dy/d*.019;}
      // Every light tries to remain in an orbit around the community.
      fx+=(c.x-b.x)*.0003;fy+=(c.y-b.y)*.0003;
      if(b.x<Math.max(W*.32,60))fx+=.055;
      if(b.x>W*.96)fx-=.055;
      if(b.y<H*.2)fy+=.045;
      if(b.y>H*.85)fy-=.045;
      b.vx=(b.vx+fx)*.994;b.vy=(b.vy+fy)*.994;
      const v=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/v*Math.min(v,1.24);b.vy=b.vy/v*Math.min(v,1.24);
      if(motion){b.x+=b.vx*speed;b.y+=b.vy*speed;}
    }
    // Fine threads emerge and vanish as lights come close.
    ctx.lineWidth=.65;
    for(let i=0;i<agents.length;i++){
      const a=agents[i];
      for(let j=i+1;j<agents.length;j++){
        const b=agents[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
        if(d2<104*104){ctx.strokeStyle=rgba((i+j)%7===0?'#ecc8a7':'#b6d8ce',(.18*(1-d2/(104*104))));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
    }
    for(const b of agents){dot(b.x,b.y,b.a,rgba(b.id%7?'#c4e1d5':'#eacbb2',.48+b.a*.12),b.id%15===0?8:0);}
    for(const q of beacons){const x=q.x*W,y=q.y*H;for(let i=0;i<3;i++)ell(x,y,14+i*17+(t-q.at)%5*2,14+i*17+(t-q.at)%5*2,0,rgba('#f5cfae',.16-i*.035),.75);dot(x,y,3.1,'#f2d8bf',13);}
  }
  function drawStillness(){
    const c=center();wash(c.x,c.y,c.r*1.5,'#b3d1c4',.066);
    const p=Math.sin(t*.16)*.5+.5;
    for(let k=0;k<8;k++)ell(c.x,c.y,c.r*(.17+k*.21+p*.04),c.r*(.17+k*.21+p*.04),0,rgba('#c3d5c9',.055-k*.004),.6);
    dot(c.x,c.y,1.9+p*.6,rgba('#e8e3d3',.80),17);
  }

  function frameLoop(timestamp){
    requestAnimationFrame(frameLoop);
    if(document.hidden)return;
    if(reducedMotion && timestamp-previous<55)return;
    const dt=previous?Math.min((timestamp-previous)/1000,.06):.016;previous=timestamp;t+=motion?dt:dt*.15;
    frame++;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    background();
    try{
      if(scene===0)drawThreshold();else if(scene===1)drawBreath();else if(scene===2)drawTime();else if(scene===3)drawLake();
      else if(scene===4)drawLife();else if(scene===5)drawPerception();else if(scene===6)drawRelation(dt);else drawStillness();
    }catch(e){if(frame%120===0)console.error('LIMEN frame error',e);}
  }
  function insideUIClick(target){return !!target.closest('button,input,nav,header,.interaction,.overlay,.footer,.mobile-nav');}
  function handleCanvasAction(x,y){
    if(scene===0){thresholdImpulses.push({x,y,at:t});if(thresholdImpulses.length>7)thresholdImpulses.shift();setPoem('당신이 닿은 곳에서, 존재의 결이 조용히 퍼져나갑니다.');return;}
    if(scene===1){sceneEntered=t;spontaneousPoem();}
    if(scene===2){timeValue=Math.round(clamp((x-.35)/.6*200-100,-100,100));if($('timeRange'))$('timeRange').value=String(timeValue);updateTimeLabel();spontaneousPoem();}
    if(scene===3){drops.push({x,y,word:'',at:t,phase:0});if(drops.length>18)drops.shift();spontaneousPoem();}
    if(scene===4){addPlant(x);}
    if(scene===5){inverted=!inverted;if($('perceptionLabel'))$('perceptionLabel').textContent=inverted?'방금까지의 안쪽이 이제 바깥이 되었습니다.':'보이는 것 너머에 또 하나의 세계가 있습니다.';spontaneousPoem();}
    if(scene===6){addBeacon(x,y);spontaneousPoem();}
  }
  function onPointerMove(e){if(!$('overlay').hidden)return;mouse.x=clamp(e.clientX/W,0,1);mouse.y=clamp(e.clientY/H,0,1);mouse.active=true;}
  function saveMoment(){
    try{
      const off=document.createElement('canvas');off.width=1600;off.height=900;const o=off.getContext('2d');
      const g=o.createLinearGradient(0,0,0,900);g.addColorStop(0,'#0b131b');g.addColorStop(1,'#0b1017');o.fillStyle=g;o.fillRect(0,0,1600,900);
      const scale=Math.max(1600/W,900/H);const width=W*scale,height=H*scale;
      o.globalAlpha=.93;o.drawImage(canvas,(1600-width)/2,(900-height)/2,width,height);o.globalAlpha=1;
      const v=o.createLinearGradient(0,0,1600,0);v.addColorStop(0,'rgba(4,8,13,.94)');v.addColorStop(.48,'rgba(4,8,13,.58)');v.addColorStop(1,'rgba(4,8,13,.04)');o.fillStyle=v;o.fillRect(0,0,1600,900);
      o.strokeStyle='rgba(192,211,197,.24)';o.strokeRect(40,40,1520,820);
      o.fillStyle='#b6d5c3';o.font='25px Georgia,serif';o.fillText('L I M E N',88,112);
      o.fillStyle='#d3b393';o.font='18px Georgia,serif';o.fillText(`${scenes[scene].no} / THE SIX GARDENS`,88,207);
      o.fillStyle='#f2efe6';o.font='51px "Noto Serif CJK KR",serif';
      const title=($('heroTitle').textContent||'존재의 가장자리').replace(/\s+/g,' ').trim();
      // Wrapping handles long Korean titles on exported artwork.
      const text=title.match(/.{1,13}/g)||[title];text.slice(0,4).forEach((s,i)=>o.fillText(s,88,310+i*75));
      o.fillStyle='#b8d2c3';o.font='23px "Noto Serif CJK KR",serif';
      const quote=$('poemText').textContent||'';const lines=quote.match(/.{1,29}/g)||[];
      lines.slice(0,3).forEach((s,i)=>o.fillText(s,88,695+i*37));
      o.fillStyle='#8ea59b';o.font='15px Georgia,serif';o.fillText('THE UNIVERSE THAT ONLY YOU CAN TOUCH · limen',88,822);
      const a=document.createElement('a');a.href=off.toDataURL('image/png');a.download=`limen-${scene===7?'stillness':`garden-${scene}`}-${new Date().toISOString().slice(0,10)}.png`;document.body.appendChild(a);a.click();a.remove();
      showToast('이 순간을 PNG 이미지로 담았습니다.');
    }catch(e){console.warn(e);showToast('이미지 저장을 완료하지 못했습니다.');}
  }
  function createSound(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){showToast('이 브라우저는 소리 재생을 지원하지 않습니다.');return false;}
    soundCtx=new Audio();soundMaster=soundCtx.createGain();soundMaster.gain.value=0;soundMaster.connect(soundCtx.destination);
    const tones=[110,164.81,220,293.66];
    for(let i=0;i<tones.length;i++){
      const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();
      osc.type=i===1?'triangle':'sine';osc.frequency.value=tones[i];gain.gain.value=[.22,.10,.11,.05][i];
      osc.connect(gain);gain.connect(soundMaster);osc.start();soundNodes.push({osc,gain});
    }
    return true;
  }
  function updateAudio(quiet=false){
    if(!soundCtx||!soundMaster)return;
    const now=soundCtx.currentTime;
    const dest=soundEnabled?(quiet?.012:.038):0;
    soundMaster.gain.cancelScheduledValues(now);soundMaster.gain.setTargetAtTime(dest,now,.55);
    const transpose=[0,0,2,-2,3,5,0,-5][scene];
    soundNodes.forEach((node,i)=>node.osc.frequency.setTargetAtTime([110,164.81,220,293.66][i]*Math.pow(2,transpose/12),now,1.4));
  }
  async function toggleSound(){
    if(!soundCtx&&!createSound())return;
    if(soundCtx.state==='suspended')await soundCtx.resume();
    soundEnabled=!soundEnabled;updateAudio(scene===7);
    $('soundButton').setAttribute('aria-pressed',String(soundEnabled));
    $('soundButton').setAttribute('title',soundEnabled?'소리 끄기':'소리 켜기');
    $('soundText').textContent=soundEnabled?'소리 켬':'소리 끔';
    showToast(soundEnabled?'소리가 켜졌습니다. 언제든 끌 수 있습니다.':'소리를 끄고 고요함으로 돌아왔습니다.');
  }
  function setupEvents(){
    $('homeButton').onclick=()=>goTo(0);
    $('helpButton').onclick=()=>showOverlay('help');
    $('soundButton').onclick=()=>toggleSound();
    $('saveButton').onclick=saveMoment;
    $('stillnessButton').onclick=()=>finaleAvailable?showOverlay('ending'):goTo(7);
    $('closeOverlay').onclick=closeOverlay;
    $('overlayBackdrop').onclick=closeOverlay;
    canvas.addEventListener('pointermove',onPointerMove);
    canvas.addEventListener('pointerdown',e=>{onPointerMove(e);mouse.pressed=true;handleCanvasAction(mouse.x,mouse.y);});
    window.addEventListener('pointerup',()=>mouse.pressed=false);
    window.addEventListener('resize',()=>{resize();if(scene===4)resetPlants();if(scene===6)initializeAgents();},{passive:true});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!$('overlay').hidden){closeOverlay();return;}
      if(!$('overlay').hidden){if(e.key==='Tab'){
        const focusables=Array.from($('overlay').querySelectorAll('button:not([disabled])'));
        if(e.shiftKey&&document.activeElement===focusables[0]){e.preventDefault();focusables.at(-1).focus();}
        else if(!e.shiftKey&&document.activeElement===focusables.at(-1)){e.preventDefault();focusables[0].focus();}
      }return;}
      if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
      if(/^[1-6]$/.test(e.key)){goTo(Number(e.key));return;}
      if(e.key==='ArrowRight'){e.preventDefault();goTo(scene===7?1:scene===6?7:scene+1);}
      if(e.key==='ArrowLeft'){e.preventDefault();goTo(scene<=1?0:scene-1);}
      if(e.key===' '&&scene!==0){e.preventDefault();handleCanvasAction(mouse.x,mouse.y);}
    });
    const initial=window.location.hash.match(/^#garden-([1-6])$/);
    if(initial)goTo(Number(initial[1]));else if(window.location.hash==='#stillness')goTo(7);else goTo(0);
    // Keep the experience available without any network or setup.
  }

  if(!ctx){$('statusText').textContent='이 브라우저에서는 Canvas를 사용할 수 없습니다.';return;}
  fillNav();resize();setupEvents();requestAnimationFrame(frameLoop);
})();
