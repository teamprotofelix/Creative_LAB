/* UNWRITTEN — UI, explorations, archive, poster export and audio.
   All user creations remain inside the browser unless the user explicitly shares the URL. */
(() => {
  'use strict';
  const SCENES = [
    {num:'01',category:'THE FIRST THRESHOLD',heading:['아직 존재하지','않는 곳.'],description:'불가능하다고 생각했던 풍경이 지금 이 화면에서 태어납니다.\n마우스를 움직여 보세요. 세계가 당신을 알아봅니다.',name:'사건의 지평선',code:'THRESHOLD',note:'중심으로 다가가면 빛이 휘어집니다.',colors:['#182258','#6255af','#98e5ff'],glow:'rgba(154,194,255,.4)'},
    {num:'02',category:'AN EXPERIMENT IN LIFE',heading:['빛이 꽃으로','피어나는 밤.'],description:'꽃잎은 어느 화가도 그리지 않았습니다.\n수학적 규칙이 매 순간 새로운 생명체를 피워냅니다.',name:'형광 정원',code:'GARDEN',note:'다른 문장을 입력하면 꽃의 배열이 바뀝니다.',colors:['#082a34','#136c63','#83ffc7'],glow:'rgba(90,255,195,.38)'},
    {num:'03',category:'THE MEMORY OF WATER',heading:['바다는 모든','순간을 기억한다.'],description:'물결과 물결이 만나 한 번도 반복되지 않는 무늬가 됩니다.\n화면 위에 손끝으로 작은 파문을 남겨 보세요.',name:'기억의 바다',code:'OCEAN',note:'터치한 자리에서 새로운 파문이 번집니다.',colors:['#031b3e','#12607b','#b7f5ff'],glow:'rgba(110,210,255,.4)'},
    {num:'04',category:'ARCHITECTURE OF WHAT IF',heading:['내일이 먼저','도착한 도시.'],description:'어디에도 없는 도시의 불빛이 켜집니다.\n매번 다른 건물, 다른 밤, 다른 미래가 당신을 기다립니다.',name:'가능성의 도시',code:'CITY',note:'새로운 문장마다 도시의 스카이라인이 달라집니다.',colors:['#200d39','#8b284f','#ffb48e'],glow:'rgba(255,100,147,.45)'},
    {num:'05',category:'A WINDOW INTO INFINITY',heading:['무한에도','가장자리가 있을까.'],description:'작은 공식을 수십 번 반복하면 우주처럼 복잡한 풍경이 태어납니다.\n마우스 휠로 끝없이 깊은 무늬 속을 탐험하세요.',name:'무한의 단면',code:'FRACTAL',note:'이 차원에서는 마우스 휠로 확대·축소할 수 있습니다.',colors:['#14144a','#564eac','#f58cd5'],glow:'rgba(188,135,255,.43)'},
    {num:'06',category:'LETTERS FROM THE LIGHT',heading:['밤하늘이 보내온','읽을 수 없는 편지.'],description:'별과 빛의 커튼은 당신이 바라보는 동안에도 계속 바뀝니다.\n한 장면을 저장하면 그 순간만 영원히 남습니다.',name:'빛의 편지',code:'AURORA',note:'마음에 드는 순간을 PNG 작품으로 저장하세요.',colors:['#071f3d','#1c806e','#a589ff'],glow:'rgba(96,244,213,.43)'}
  ];
  const $ = id => document.getElementById(id);
  const engine = new window.UniverseEngine($('universe'));
  const particleCanvas=$('particles'),ctx=particleCanvas.getContext('2d');
  const state={scene:0,seed:172.8,wish:'',tour:null,modal:null,archive:[],sound:false,toastTimer:null,drag:false,lastTime:0,prevTouch:null};
  const sparks=[],ripples=[],strokes=[];
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  const isTypingTarget = el => !!(el&&el.closest('input,textarea,[contenteditable="true"]'));
  const isUITarget = el => !!(el&&el.closest('button,input,.dock,.topbar,.world-list,.mobile-worlds,.modal,.overlay'));
  const numSeed=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%9800+100;};
  const rand=()=>{if(window.crypto?.getRandomValues){const x=new Uint32Array(1);window.crypto.getRandomValues(x);return x[0]%9800+100;}return Math.floor(Math.random()*9800)+100;};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const fromHash=()=>{const parts=new URLSearchParams(location.hash.replace(/^#/,''));const s=Number(parts.get('s'));const scene=Number(parts.get('w'));return {scene:Number.isInteger(scene)?clamp(scene,0,5):0,seed:Number.isFinite(s)&&s>0?clamp(s,1,99999):172.8,wish:(parts.get('q')||'').slice(0,72)};};
  const setHash=()=>{const p=new URLSearchParams();p.set('w',String(state.scene));p.set('s',String(Math.round(state.seed)));if(state.wish)p.set('q',state.wish);try{history.replaceState(null,'',location.pathname+location.search+'#'+p.toString());}catch{/* restricted about:blank/file sandbox */}};
  const escapeCanvasText=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;

  class AmbientAudio{
    constructor(){this.context=null;this.master=null;this.nodes=[];}
    async start(){
      if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext unsupported');this.context=new AC();this.master=this.context.createGain();this.master.gain.value=0;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=760;this.master.connect(filter);filter.connect(this.context.destination);const freqs=[55,82.41,110,164.81];freqs.forEach((f,i)=>{const osc=this.context.createOscillator();const gain=this.context.createGain();osc.type=i===0?'sine':'triangle';osc.frequency.value=f;gain.gain.value=[.37,.12,.08,.045][i];osc.connect(gain);gain.connect(this.master);osc.start();this.nodes.push(osc);});}
      await this.context.resume();this.master.gain.setTargetAtTime(.13,this.context.currentTime,.75);
    }
    stop(){if(this.context&&this.master)this.master.gain.setTargetAtTime(0,this.context.currentTime,.2);}
    chime(scene){if(!state.sound||!this.context)return;const t=this.context.currentTime;const notes=[196,246.94,293.66,349.23,392,440];[1,1.5,2].forEach((mul,i)=>{const osc=this.context.createOscillator(),gain=this.context.createGain();osc.type='sine';osc.frequency.setValueAtTime(notes[scene]*mul,t+i*.065);gain.gain.setValueAtTime(.0001,t+i*.065);gain.gain.exponentialRampToValueAtTime(.022/(i+1),t+i*.065+.03);gain.gain.exponentialRampToValueAtTime(.0001,t+.8+i*.20);osc.connect(gain);gain.connect(this.context.destination);osc.start(t+i*.065);osc.stop(t+1.1+i*.2);});}
  }
  const audio=new AmbientAudio();

  function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);particleCanvas.width=Math.round(innerWidth*dpr);particleCanvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);engine.resize();}
  window.addEventListener('resize',resize,{passive:true});resize();
  function note(text){const el=$('toast');el.textContent=text;el.classList.add('visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
  function drawCursor(x,y,count=10){if(reduceMotion)count=Math.min(count,4);for(let i=0;i<count;i++){const angle=(Math.PI*2*i/count)+(Math.random()-.5)*.6;const speed=20+Math.random()*115;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:1+Math.random()*2.4,life:.35+Math.random()*.8,max:1,hue:state.scene});}if(sparks.length>260)sparks.splice(0,sparks.length-260);}
  function rippleAt(x,y){ripples.push({x,y,r:0,life:1,color:SCENES[state.scene].colors[2]});if(ripples.length>12)ripples.shift();engine.pulse=Math.max(engine.pulse,.7);}
  function frameFx(now){
    const dt=state.lastTime?clamp((now-state.lastTime)/1000,0,.06):.016;state.lastTime=now;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.life-=dt*.75;r.r+=dt*150;if(r.life<=0){ripples.splice(i,1);continue;}ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.strokeStyle=`rgba(180,229,255,${r.life*.20})`;ctx.lineWidth=1.7;ctx.stroke();ctx.beginPath();ctx.arc(r.x,r.y,r.r*.53,0,Math.PI*2);ctx.strokeStyle=`rgba(208,197,255,${r.life*.11})`;ctx.stroke();}
    for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.98;s.vy*=.98;if(s.life<=0){sparks.splice(i,1);continue;}const a=clamp(s.life*1.1,0,1);ctx.beginPath();ctx.arc(s.x,s.y,s.r*a,0,Math.PI*2);ctx.fillStyle=s.hue===1?`rgba(145,255,198,${a*.75})`:s.hue===3?`rgba(255,164,191,${a*.8})`:`rgba(202,235,255,${a*.77})`;ctx.shadowColor=SCENES[s.hue].colors[2];ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;}
    if(strokes.length>1){ctx.beginPath();strokes.forEach((v,i)=>{if(i===0)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y);});ctx.strokeStyle='rgba(182,234,255,.49)';ctx.lineWidth=1.25;ctx.shadowColor='#83d6ff';ctx.shadowBlur=10;ctx.stroke();ctx.shadowBlur=0;for(const v of strokes){ctx.beginPath();ctx.arc(v.x,v.y,2.3,0,Math.PI*2);ctx.fillStyle='rgba(239,249,255,.74)';ctx.fill();}}
    ctx.restore();
  }
  function render(now){requestAnimationFrame(render);if(document.hidden)return;const fps=(innerWidth<700||state.scene===4)?30:45;if(render.last&&now-render.last<1000/fps)return;render.last=now;engine.frame(now);frameFx(now);}
  requestAnimationFrame(render);

  function switchScene(index,{quiet=false}={}){
    const newIdx=((index%6)+6)%6;if(newIdx===state.scene&&!quiet)return;
    state.scene=newIdx;engine.setScene(newIdx);document.querySelector('.app').dataset.world=String(newIdx);
    const scene=SCENES[newIdx];const hero=document.querySelector('.hero');hero.classList.add('is-changing');
    clearTimeout(switchScene._timer);
    switchScene._timer=setTimeout(()=>{
      $('worldIndex').textContent=`EXHIBIT ${scene.num} / 06`;
      $('worldCategory').textContent=scene.category;
      const h=$('worldHeading');h.querySelector('.title-top').textContent=scene.heading[0];h.querySelector('.title-bottom').textContent=scene.heading[1];
      $('worldDescription').textContent=scene.description;
      $('sceneNote').textContent=scene.note;
      $('fragmentText').textContent=`00${newIdx+1}.∞`;
      document.querySelectorAll('.world-item').forEach((b,i)=>{b.classList.toggle('active',i===newIdx);if(i===newIdx)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
      document.querySelectorAll('.mobile-world-btn').forEach((b,i)=>{b.classList.toggle('active',i===newIdx);b.setAttribute('aria-pressed',String(i===newIdx));});
      document.querySelector(':root').style.setProperty('--accent',scene.colors[2]);
      document.querySelector(':root').style.setProperty('--accent2',scene.colors[1]);
      hero.classList.remove('is-changing');
    },230);
    audio.chime(newIdx);updateBookmarkState();setHash();
  }
  function setWorld(seed,wish){state.seed=seed;state.wish=wish||'';engine.setSeed(seed);$('wishInput').value=state.wish;updateBookmarkState();setHash();}
  function generate(){const phrase=$('wishInput').value.trim();const wish=phrase||['바다가 하늘 위에 떠 있는 세계','나무가 별을 피우는 밤','빛으로 만들어진 두 번째 지구','시간이 반대로 흐르는 정원','달에게 쓰는 비밀 편지','꿈이 실제가 되는 도시'][Math.floor(Math.random()*6)];setWorld(numSeed(wish),wish);rippleAt(innerWidth*.62,innerHeight*.46);drawCursor(innerWidth*.62,innerHeight*.46,26);note(`새로운 현실 생성 완료 · 「${wish.slice(0,24)}${wish.length>24?'…':''}」`);audio.chime(state.scene);}
  function randomize(){setWorld(rand(),['우연이 열어 준 새로운 문','빛이 다른 길을 선택한 순간','모든 가능성이 동시에 피어나는 곳','우주가 다시 쓴 첫 문장'][Math.floor(Math.random()*4)]);rippleAt(innerWidth*.61,innerHeight*.50);note('우연의 문이 열렸습니다. 이전과 다른 세계입니다.');audio.chime(state.scene);}
  function stopTour(){if(state.tour){clearInterval(state.tour);state.tour=null;$('tourBtnText').textContent='자동 탐험 시작';$('tourBtn').querySelector('.play-ring').textContent='▶';}}
  function toggleTour(){if(state.tour){stopTour();note('자동 탐험을 종료했습니다.');return;}switchScene((state.scene+1)%6);state.tour=setInterval(()=>{if(document.hidden)return;switchScene((state.scene+1)%6);},9500);$('tourBtnText').textContent='탐험 중지';$('tourBtn').querySelector('.play-ring').textContent='Ⅱ';note('자동 탐험을 시작했습니다. 9.5초마다 차원이 이동합니다.');}

  const STORAGE_KEY='unwritten-atlas-worlds-v1';
  function loadArchive(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(data)?data.filter(x=>x&&Number.isInteger(x.scene)&&x.scene>=0&&x.scene<6&&Number.isFinite(Number(x.seed))).slice(0,12):[];}catch{return [];}}
  function persistArchive(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.archive));return true;}catch{note('브라우저 저장소에 접근할 수 없습니다.');return false;}}
  function getKey(x){return `${x.scene}_${Math.round(Number(x.seed))}_${x.wish||''}`;}
  function currentEntry(){return {scene:state.scene,seed:Math.round(state.seed),wish:state.wish,at:Date.now()};}
  function updateArchiveUI(){const el=$('galleryCount');el.textContent=String(state.archive.length);updateBookmarkState();}
  function updateBookmarkState(){if(!$('bookmarkBtn'))return;const yes=state.archive.some(x=>getKey(x)===getKey(currentEntry()));$('bookmarkBtn').classList.toggle('is-saved',yes);$('bookmarkBtn').setAttribute('aria-pressed',String(yes));$('bookmarkBtn').title=yes?'이미 보관한 세계':'이 세계 보관';}
  function bookmark(){const curr=currentEntry();if(state.archive.some(x=>getKey(x)===getKey(curr))){note('이미 보관한 세계입니다.');return;}state.archive.unshift(curr);if(state.archive.length>12)state.archive.length=12;if(persistArchive()){updateArchiveUI();note('세계가 보관함에 저장되었습니다. (이 브라우저에만 보관)');}}

  function makeHelpBody(){const root=document.createElement('div');root.innerHTML=`
    <div class="manual-grid">
      <div class="manual-item"><div class="manual-number">01 · EXPLORE</div><div class="manual-title">여섯 개의 차원</div><div class="manual-desc">오른쪽 목록 또는 아래 차원 버튼으로 서로 다른 세계를 이동합니다.</div></div>
      <div class="manual-item"><div class="manual-number">02 · CREATE</div><div class="manual-title">말로 만드는 세계</div><div class="manual-desc">문장을 입력하면 그 문장이 고유한 수학적 씨앗이 되어 형태와 빛을 바꿉니다.</div></div>
      <div class="manual-item"><div class="manual-number">03 · TOUCH</div><div class="manual-title">손끝으로 남기는 별</div><div class="manual-desc">빈 화면을 클릭하거나 드래그해 파문과 별자리를 만듭니다.</div></div>
      <div class="manual-item"><div class="manual-number">04 · COLLECT</div><div class="manual-title">작품과 세계 보관</div><div class="manual-desc">PNG로 저장하거나 현재 세계를 이 브라우저의 보관함에 남깁니다.</div></div>
      <div class="manual-item"><div class="manual-number">05 · LISTEN</div><div class="manual-title">우주의 저주파</div><div class="manual-desc">스피커를 켜면 직접 합성한 앰비언트 소리가 재생됩니다. 기본은 무음입니다.</div></div>
      <div class="manual-item"><div class="manual-number">06 · GO DEEPER</div><div class="manual-title">무한의 단면 확대</div><div class="manual-desc">다섯 번째 차원에서 마우스 휠이나 터치 제스처로 프랙털을 확대합니다.</div></div>
    </div>
    <div class="manual-divider"></div>
    <div class="modal-kicker">KEYBOARD SHORTCUTS</div>
    <div class="manual-shortcuts">
      <div class="shortcut"><kbd>1–6</kbd> 차원 바로가기</div><div class="shortcut"><kbd>Space</kbd> 다음 차원</div>
      <div class="shortcut"><kbd>R</kbd> 우연의 세계</div><div class="shortcut"><kbd>S</kbd> PNG 저장</div>
      <div class="shortcut"><kbd>G</kbd> 보관함</div><div class="shortcut"><kbd>M</kbd> 소리 켜기 / 끄기</div>
      <div class="shortcut"><kbd>H</kbd> 사용 설명서</div><div class="shortcut"><kbd>Esc</kbd> 창 닫기</div>
    </div>
    <p class="modal-note">모든 장면은 화면에서 실시간 계산됩니다. 외부 API·계정·추적 쿠키는 사용하지 않습니다. 단어의 의미를 이해하는 AI가 아니라 문자를 숫자로 변환해 시각적 변주를 만드는 창작 엔진입니다.</p>`;
    return root;
  }
  function makeGalleryBody(){
    const root=document.createElement('div');const head=document.createElement('div');head.className='gallery-header';head.textContent=`SAVED UNIVERSES · ${state.archive.length} / 12`;root.append(head);
    if(!state.archive.length){const p=document.createElement('div');p.className='gallery-empty';p.innerHTML='<span>◇</span>아직 보관된 세계가 없습니다.<br>좋아하는 차원에서 「보관」을 눌러 첫 세계를 남겨보세요.';root.append(p);return root;}
    const grid=document.createElement('div');grid.className='gallery-grid';
    state.archive.forEach((entry,index)=>{
      const scene=SCENES[entry.scene],card=document.createElement('button');card.className='gallery-card';card.type='button';card.title=`${scene.name} 열기`;
      const preview=document.createElement('div');preview.className='gallery-preview';preview.style.setProperty('--card-gradient',`radial-gradient(ellipse at 60% 45%,${scene.colors[2]}66,${scene.colors[1]}a8 31%,${scene.colors[0]} 88%)`);preview.style.setProperty('--card-glow',scene.glow);
      const info=document.createElement('div');info.className='gallery-info';const title=document.createElement('div');title.className='gallery-title';title.textContent=`${scene.num} · ${scene.name}`;const wish=document.createElement('div');wish.className='gallery-wish';wish.textContent=entry.wish||`UNIVERSE #${entry.seed}`;info.append(title,wish);card.append(preview,info);
      card.addEventListener('click',()=>{stopTour();setWorld(Number(entry.seed),entry.wish);switchScene(entry.scene,{quiet:true});closeModal();note('보관된 세계로 돌아왔습니다.');});
      const del=document.createElement('button');del.type='button';del.className='gallery-delete';del.textContent='✕';del.title='이 세계 삭제';del.setAttribute('aria-label',`${scene.name} 삭제`);del.addEventListener('click',e=>{e.stopPropagation();state.archive.splice(index,1);persistArchive();updateArchiveUI();openGallery();note('보관함에서 삭제했습니다.');});
      // Do not nest interactive buttons: delete control lives alongside the visit button.
      const wrap=document.createElement('div');wrap.style.position='relative';wrap.append(card,del);grid.append(wrap);
    });
    root.append(grid);const noteP=document.createElement('p');noteP.className='modal-note';noteP.textContent='세계 보관은 현재 브라우저의 로컬 저장소를 이용합니다. 다른 기기에서 열려면 「링크」로 주소를 공유하세요. 비공개 모드 또는 브라우저 데이터 삭제 시 보관함이 지워질 수 있습니다.';root.append(noteP);return root;
  }
  function openModal(type){state.modal=type;$('modalOverlay').hidden=false;document.body.style.overflow='hidden';const help=type==='help';$('modalKicker').textContent=help?'THE FIELD MANUAL':'A POCKET FULL OF UNIVERSES';$('modalTitle').textContent=help?'가능성의 사용 설명서':'당신이 발견한 우주들';$('modalLead').textContent=help?'이곳은 이미지 갤러리가 아닙니다. 매 순간 화면에서 태어나는 수학의 풍경입니다.':'당신의 상상을 간직하는 개인 전시관입니다. 별도의 계정은 필요하지 않습니다.';const body=$('modalBody');body.replaceChildren(help?makeHelpBody():makeGalleryBody());$('closeModal').focus();}
  function openGallery(){openModal('gallery');}
  function closeModal(){if(!state.modal)return;state.modal=null;$('modalOverlay').hidden=true;document.body.style.overflow='';$('helpBtn').focus({preventScroll:true});}

  function exportPoster(){
    try{
      const out=document.createElement('canvas');out.width=1600;out.height=900;const c=out.getContext('2d');const w=out.width,h=out.height;
      c.fillStyle='#080b1d';c.fillRect(0,0,w,h);
      // Cover the poster using the exact currently rendered universe without including UI.
      const src=engine.ready?engine.canvas:null;
      if(src){const scale=Math.max(w/src.width,h/src.height),sw=src.width*scale,sh=src.height*scale;c.drawImage(src,(w-sw)/2,(h-sh)/2,sw,sh);}
      else{const grad=c.createRadialGradient(900,440,40,800,450,800);grad.addColorStop(0,SCENES[state.scene].colors[1]);grad.addColorStop(1,'#050712');c.fillStyle=grad;c.fillRect(0,0,w,h);}
      const shade=c.createLinearGradient(0,0,1600,0);shade.addColorStop(0,'rgba(1,3,13,.72)');shade.addColorStop(.51,'rgba(1,3,13,.07)');shade.addColorStop(1,'rgba(1,3,13,.20)');c.fillStyle=shade;c.fillRect(0,0,w,h);
      c.strokeStyle='rgba(240,248,255,.35)';c.lineWidth=1;c.strokeRect(64,57,1472,786);
      c.fillStyle='rgba(230,245,255,.72)';c.font='600 19px Georgia, serif';c.fillText('U N W R I T T E N .',99,115);
      c.font='18px Consolas, monospace';c.fillStyle='rgba(219,237,255,.62)';c.fillText(`EXHIBIT ${SCENES[state.scene].num} / 06     •     ${SCENES[state.scene].code}`,102,656);
      c.fillStyle='#f4f9ff';c.font='bold 60px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';c.fillText(SCENES[state.scene].name,100,731);
      c.font='22px "Malgun Gothic", sans-serif';c.fillStyle='rgba(228,238,255,.80)';c.fillText(escapeCanvasText(state.wish||'아직 쓰이지 않은 세계',42),102,776);
      c.font='15px Consolas, monospace';c.fillStyle='rgba(225,241,255,.65)';c.textAlign='right';c.fillText(`UNIVERSE #${Math.round(state.seed)}  •  GENERATED LIVE`,1498,797);c.textAlign='left';
      out.toBlob(blob=>{if(!blob){note('이미지 저장을 지원하지 않는 브라우저입니다.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`UNWRITTEN_${SCENES[state.scene].code}_${Math.round(state.seed)}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);note('현재 순간을 PNG 작품으로 저장했습니다.');},'image/png');
    }catch(err){console.error(err);note('저장에 실패했습니다. 브라우저의 다운로드 설정을 확인하세요.');}
  }
  async function share(){setHash();const url=location.href;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);note('이 세계로 돌아오는 링크를 복사했습니다.');}else{const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const okay=document.execCommand('copy');input.remove();if(okay)note('이 세계의 주소를 복사했습니다.');else throw new Error('copy failed');}}catch{note('주소창의 URL을 복사하면 현재 세계를 공유할 수 있습니다.');}}
  async function toggleSound(){try{if(state.sound){state.sound=false;audio.stop();$('soundBtn').setAttribute('aria-pressed','false');$('soundBtn').setAttribute('aria-label','소리 켜기');$('soundWave').setAttribute('d','m16 9 5 6m0-6-5 6');note('사운드 OFF');}else{await audio.start();state.sound=true;$('soundBtn').setAttribute('aria-pressed','true');$('soundBtn').setAttribute('aria-label','소리 끄기');$('soundWave').setAttribute('d','M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14');audio.chime(state.scene);note('사운드 ON · 소리가 너무 크면 기기 음량을 조절하세요.');}}catch(err){console.warn(err);note('이 브라우저에서는 소리 기능을 사용할 수 없습니다.');}}

  // Set up navigation; mobile controls are native buttons, not merely decorative.
  const mobile=$('mobileWorlds');SCENES.forEach((s,i)=>{const b=document.createElement('button');b.className='mobile-world-btn'+(i===0?' active':'');b.innerHTML=`<span>${s.num}</span>`;b.append(document.createTextNode(s.name));b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>{stopTour();switchScene(i);});mobile.append(b);});
  document.querySelectorAll('.world-item').forEach(b=>b.addEventListener('click',()=>{stopTour();switchScene(Number(b.dataset.scene));}));
  $('brandHome').addEventListener('click',e=>{e.preventDefault();stopTour();switchScene(0);});
  $('nextBtn').addEventListener('click',()=>{stopTour();switchScene(state.scene+1);});
  $('tourBtn').addEventListener('click',toggleTour);
  $('wishForm').addEventListener('submit',e=>{e.preventDefault();stopTour();generate();$('wishInput').blur();});
  $('randomBtn').addEventListener('click',()=>{stopTour();randomize();});
  $('saveBtn').addEventListener('click',exportPoster);
  $('bookmarkBtn').addEventListener('click',bookmark);
  $('galleryBtn').addEventListener('click',openGallery);
  $('helpBtn').addEventListener('click',()=>openModal('help'));
  $('shareBtn').addEventListener('click',share);
  $('soundBtn').addEventListener('click',toggleSound);
  $('modalBackdrop').addEventListener('click',closeModal);
  $('closeModal').addEventListener('click',closeModal);
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(state.modal){e.preventDefault();closeModal();}else if(state.tour)stopTour();return;}
    if(state.modal||isTypingTarget(document.activeElement)||e.ctrlKey||e.altKey||e.metaKey)return;
    const key=e.key.toLowerCase();
    if(/^[1-6]$/.test(key)){stopTour();switchScene(Number(key)-1);}
    else if(e.code==='Space'){e.preventDefault();stopTour();switchScene(state.scene+1);}
    else if(key==='r'){stopTour();randomize();}
    else if(key==='s'){exportPoster();}
    else if(key==='g'){openGallery();}
    else if(key==='h'||key==='?'){openModal('help');}
    else if(key==='m'){toggleSound();}
  });
  window.addEventListener('pointermove',e=>{
    engine.setMouse(e.clientX/innerWidth,e.clientY/innerHeight);
    $('coordinatesText').textContent=`X ${(e.clientX/innerWidth).toFixed(3)}   Y ${(e.clientY/innerHeight).toFixed(3)}`;
    if(state.drag&&!isUITarget(e.target)){
      const last=strokes[strokes.length-1];if(!last||Math.hypot(e.clientX-last.x,e.clientY-last.y)>11){strokes.push({x:e.clientX,y:e.clientY});if(strokes.length>72)strokes.shift();if(Math.random()<.5)drawCursor(e.clientX,e.clientY,2);}
    }
  },{passive:true});
  window.addEventListener('pointerdown',e=>{if(state.modal||isUITarget(e.target)||e.button!==0)return;state.drag=true;strokes.length=0;strokes.push({x:e.clientX,y:e.clientY});rippleAt(e.clientX,e.clientY);drawCursor(e.clientX,e.clientY,14);});
  window.addEventListener('pointerup',()=>{state.drag=false;setTimeout(()=>{if(!state.drag)strokes.length=0;},1600);});
  window.addEventListener('pointercancel',()=>{state.drag=false;strokes.length=0;});
  window.addEventListener('wheel',e=>{if(state.scene!==4||state.modal||isUITarget(e.target))return;e.preventDefault();engine.zoom=clamp(engine.zoom*Math.exp(-e.deltaY*.0012),.55,11);},{passive:false});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){engine._last=0;state.lastTime=0;}else{engine._last=0;state.lastTime=0;}});
  window.addEventListener('hashchange',()=>{const data=fromHash();stopTour();setWorld(data.seed,data.wish);switchScene(data.scene,{quiet:true});});
  setInterval(()=>{$('clockValue').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});},1000);

  const initial=fromHash();state.archive=loadArchive();setWorld(initial.seed,initial.wish);switchScene(initial.scene,{quiet:true});engine.setSeed(initial.seed);updateArchiveUI();
  if(engine.fallback){$('statusLabel').textContent='CANVAS MODE';}else if(!engine.ready){$('statusLabel').textContent='FALLBACK MODE';note('그래픽 기능이 제한되어 기본 배경으로 표시됩니다.');}
  console.info('%c UNWRITTEN ', 'color:#091021;background:#a7eaff;padding:5px 12px;font-weight:bold', 'An impossible atlas, born from equations. Shortcut H for help.');
})();
