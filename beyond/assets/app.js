/* BEYOND — creative interaction layer. No network requests, API keys or dependencies. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const $$=(q)=>[...document.querySelectorAll(q)];
 const visual=()=>window.BeyondVisual;
 const lensNames={reverse:'REVERSE / 01',subtract:'SUBTRACT / 02',amplify:'AMPLIFY / 03',morph:'MORPH / 04',future:'FUTURECAST / 05'};
 const lensSymbols={reverse:'↔',subtract:'−',amplify:'×',morph:'⌁',future:'∞'};
 const lensIndexes={reverse:0,subtract:1,amplify:2,morph:3,future:4};
 const lensNotes={reverse:'원래의 목적을 거꾸로 놓으면 새로운 기준이 나타납니다.',subtract:'필수처럼 보였던 것을 없앨 때 구조의 본질이 드러납니다.',amplify:'극단으로 밀어붙이면 숨어 있던 가능성과 모순이 동시에 보입니다.',morph:'닿을 일 없던 두 분야의 규칙이 만나 새로운 문법이 됩니다.',future:'아직 오지 않은 미래를 출발점으로 현재를 다시 바라봅니다.'};
 const domains=[
  {id:'forest',name:'숲',idea:'서로 영향을 주며 스스로 자라나는'},
  {id:'memory',name:'기억',idea:'지워지고 다시 쓰이는'},
  {id:'gravity',name:'중력',idea:'보이지 않지만 모두를 연결하는'},
  {id:'music',name:'음악',idea:'반복과 침묵으로 감정을 만드는'},
  {id:'cells',name:'세포',idea:'작은 단위가 협력해 살아 움직이는'},
  {id:'city',name:'도시',idea:'낯선 존재들이 함께 질서를 만드는'},
  {id:'ocean',name:'심해',idea:'아직 알려지지 않은 곳에 적응하는'},
  {id:'language',name:'언어',idea:'의미를 바꾸고 세계를 이름 붙이는'},
  {id:'dream',name:'꿈',idea:'논리를 초월한 규칙으로 연결되는'},
  {id:'game',name:'놀이',idea:'실패를 두려움 대신 탐색으로 바꾸는'}
 ];
 const storageKey='beyond-questions-v1';
 let notes=[];let lens='reverse',counter=1,lastTemplate=-1,currentQuestion='';let pair=[],pairCounter=0,currentPairQuestion='';let currentTheme='acid';let toastTimer=0;let audioOn=false,audioContext=null;
 const random=n=>Math.floor(Math.random()*n);
 const particles={object:['을','를'],subject:['이','가'],topic:['은','는'],with:['과','와']};
 const particle=(s,kind)=>{const last=Array.from(s.trim()).at(-1)||'';const code=last.charCodeAt(0);const batchim=code>=0xAC00&&code<=0xD7A3?(code-0xAC00)%28!==0:false;return s+(particles[kind]?.[batchim?0:1]||'');};
 const templatize=(str,topic)=>str.replaceAll('{S}',topic).replaceAll('{O}',particle(topic,'object')).replaceAll('{T}',particle(topic,'topic')).replaceAll('{G}',particle(topic,'subject')).replaceAll('{W}',particle(topic,'with'));
 const dict={
  reverse:[
   '만약 {S}의 목표가 더 많이 만드는 것이 아니라, 더 이상 필요 없게 만드는 것이라면?',
   '우리가 {O} 지금과 정반대로 설계한다면, 무엇을 가장 먼저 바꿔야 할까요?',
   '만약 {G} 사람을 바꾸는 것이 아니라 사람이 {O} 바꾸도록 만들어졌다면?',
   '모두가 {S}에 대해 틀렸다고 가정하면, 지금까지의 어떤 성공이 실패가 될까요?',
   '만약 {O} 가장 잘 이해하는 사람이 아무것도 모르는 어린이라면?',
   '경쟁 대신 협력이 {S}의 유일한 규칙이라면 어떤 일이 벌어질까요?',
   '만약 {S}의 가장 큰 문제점이 사실 가장 중요한 장점이라면?',
   '사람들이 {O} 소유하지 않고 잠시 빌려 쓰는 것이 기본이라면?'
  ],
  subtract:[
   '{S}에서 돈이라는 개념을 완전히 없애면, 남는 가치는 무엇일까요?',
   '{S}에서 설명서와 전문가를 없애도 누구나 시작할 수 있을까요?',
   '만약 {S}에 시간 제한이 존재하지 않는다면, 무엇을 더 이상 하지 않을까요?',
   '{S}에서 가장 오래된 관습 하나를 지운다면, 무엇이 새로 가능해질까요?',
   '만약 {S}에 건물도 화면도 필요 없다면, 어떤 형태를 갖게 될까요?',
   '아무도 {O} 평가할 수 없다면, 사람들은 무엇을 위해 움직일까요?',
   '{S}에서 단계를 절반으로 줄이는 게 아니라 단 하나만 남겨야 한다면?',
   '만약 {S}에 중앙의 통제자가 사라진다면, 어떻게 서로 조율할까요?'
  ],
  amplify:[
   '{S}의 속도가 지금보다 100배 빨라진다면 무엇이 먼저 무너질까요?',
   '누구나 {O} 1초 만에 배울 수 있다면, 진짜 실력의 의미는 어떻게 바뀔까요?',
   '{S}의 비용이 100분의 1이 된다면, 새로운 사용자는 누구일까요?',
   '{S}의 규모가 손톱만큼 작아져도 작동한다면 어떤 일상이 생길까요?',
   '만약 {O} 100년 동안 지속해야 한다면, 무엇부터 다르게 설계할까요?',
   '{S}의 실패가 100배 더 많이 허용된다면 사람들은 무엇을 실험할까요?',
   '지구상의 모든 사람이 {O} 동시에 사용한다면 어떤 새로운 규칙이 필요할까요?',
   '{S}에 쓰는 에너지가 0이 된다면 우리가 상상하지 못한 활용법은?'
  ],
  morph:[
   '만약 {O} 살아 있는 숲처럼 스스로 회복하도록 설계한다면?',
   '{S}에 재즈의 즉흥성과 리듬을 적용하면 어떤 질서가 탄생할까요?',
   '만약 {G} 게임처럼 실패할수록 새로운 길을 열어준다면?',
   '{S}의 규칙을 문어의 신경계에서 배운다면 중앙 통제가 필요할까요?',
   '{O} 하나의 생명체처럼 성장하게 한다면 누가 성장 방향을 결정할까요?',
   '만약 {S}의 사용법이 책이 아니라 춤으로 전해진다면?',
   '{S}에 꿈의 물리법칙을 단 하루 적용할 수 있다면?',
   '만약 {G} 언어가 되어 서로 대화할 수 있다면, 첫마디는 무엇일까요?'
  ],
  future:[
   '2084년에는 {G} 완전히 당연한 무언가가 됩니다. 우리는 오늘 무엇을 발명해야 할까요?',
   '100년 뒤의 아이가 지금의 {O} 보고 가장 이상하게 여길 부분은?',
   '미래의 박물관에서 {S}의 현재 모습을 전시한다면 안내문에는 뭐라고 적힐까요?',
   '2049년에 {S}의 모든 문제가 해결됐다면, 마지막으로 사라진 문제는 무엇일까요?',
   '50년 뒤 {G} 전혀 다른 이름으로 불린다면, 그 이름은 무엇일까요?',
   '미래에서 온 사람이 {O} 다시 발명하라고 한다면 무엇부터 시작할까요?',
   '아직 태어나지 않은 세대가 {O} 설계한다면 우리에게 무엇을 그만하라고 할까요?',
   '100년 후 {S}의 역사를 쓰는 사람이 2026년을 전환점으로 기록한다면, 무슨 일이 있었을까요?'
  ]
 };
 const toast=(s)=>{const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2900);};
 function tone(f=440,type='sine',duration=.20,volume=.024,offset=0){if(!audioOn)return;try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime+offset;o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*.82,now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(audioContext.destination);o.start(now);o.stop(now+duration+.02);}catch{audioOn=false;$('soundToggle').setAttribute('aria-pressed','false');$('soundText').textContent='SOUND OFF';}}
 function chime(){tone(440,'sine',.28,.015);tone(659,'sine',.25,.012,.06);tone(880,'triangle',.38,.008,.13);}
 function generate(manual=false){let topic=$('topicInput').value.trim()||'당연한 일상';let arr=dict[lens],idx=random(arr.length);if(idx===lastTemplate&&arr.length>1)idx=(idx+1+random(arr.length-1))%arr.length;lastTemplate=idx;currentQuestion=templatize(arr[idx],topic);counter++;$('resultQuestion').textContent=currentQuestion;$('resultKicker').textContent=lensNames[lens];$('resultNote').textContent=lensNotes[lens];$('resultSymbol').textContent=lensSymbols[lens];$('resultIndex').textContent=String(counter).padStart(3,'0')+' / ∞';if(manual){visual()?.burst();tone(349,'triangle',.22,.018)};}
 function setLens(next){lens=next;$$('.lens-item').forEach(b=>{let active=b.dataset.lens===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});visual()?.setPalette(lensIndexes[next]);generate();tone(330+80*lensIndexes[next],'sine',.16,.012);}
 function choosePair(ids){pair=ids.slice(0,2);$$('.star-node').forEach(btn=>{const i=pair.indexOf(btn.dataset.node);btn.classList.toggle('selected',i>=0&&pair.length===2);btn.classList.toggle('pending',i===0&&pair.length===1);btn.setAttribute('aria-pressed',String(i>=0));});visual()?.setPair(pair);if(pair.length===0){$('pairA').textContent='?';$('pairB').textContent='?';$('pairTitle').textContent='아직 만나지 않은 두 개의 세계';$('pairDescription').textContent='왼쪽 별자리에서 두 개의 단어를 차례로 선택하면, 한 번도 던지지 않은 질문이 생깁니다.';$('savePair').disabled=true;$('pairToPoster').disabled=true;}else if(pair.length===1){const a=domains.find(d=>d.id===pair[0]);$('pairA').textContent=a.name;$('pairB').textContent='?';$('pairTitle').textContent='첫 번째 세계: '+a.name;$('pairDescription').textContent='이제 두 번째 별을 선택하세요. 어울리지 않을수록 더 좋습니다.';$('savePair').disabled=true;$('pairToPoster').disabled=true;}else if(pair.length===2){const [a,b]=pair.map(id=>domains.find(d=>d.id===id));const qa=particle(a.name,'topic'),qb=particle(b.name,'object');const patterns=[`만약 ${b.name}의 문제를 ${a.name}의 방식으로 해결한다면? ${a.idea} 시스템은 무엇을 바꿀까요?`,`만약 ${a.name}과 ${b.name} 사이에 번역기가 있다면, 이 둘은 처음으로 무엇을 이야기할까요?`,`${qa} ${a.idea} 원리를 ${qb} 만드는 데 사용할 수 있을까요?`,`당신이 ${a.name}의 설계자로서 ${b.name}을 발명해야 한다면, 무엇을 가장 먼저 실험할까요?`,`${a.name}의 세계에서 ${b.name}이 발견된다면, 그곳의 상식은 어떻게 변할까요?`,`두 세계의 경계에서 새로 태어난 존재는 ${a.name}과 ${b.name} 중 어느 쪽의 법칙을 따를까요?`];currentPairQuestion=patterns[random(patterns.length)];pairCounter++;$('pairA').textContent=a.name;$('pairB').textContent=b.name;$('pairTitle').textContent=a.name+' × '+b.name;$('pairDescription').textContent=currentPairQuestion;$('pairNo').textContent='NO. '+String(pairCounter).padStart(3,'0');$('savePair').disabled=false;$('pairToPoster').disabled=false;chime();}}
 function randomPair(){let i=random(domains.length),j=random(domains.length-1);if(j>=i)j++;choosePair([domains[i].id,domains[j].id]);}
 function save(text,kind){if(!text||!text.trim()){toast('저장할 문장을 먼저 입력해주세요.');return;}if(notes.some(n=>n.text===text)){toast('이미 노트에 담긴 질문입니다.');return;}notes.unshift({id:Date.now()+'-'+random(100000),text:text.trim(),kind,created:new Date().toISOString()});notes=notes.slice(0,100);persist();renderNotes();toast('질문을 개인 노트에 담았습니다 ✳');tone(570,'sine',.18,.018);}
 function load(){try{let raw=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(raw))notes=raw.filter(n=>n&&typeof n.text==='string'&&typeof n.id==='string').slice(0,100);}catch{notes=[];}}
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(notes));}catch{toast('브라우저 저장 공간을 사용할 수 없어 이 세션에서만 보관됩니다.');}}
 function renderNotes(){let host=$('noteList');host.replaceChildren();$('notesCount').textContent=String(notes.length).padStart(2,'0');$('notesCounter').textContent='('+String(notes.length).padStart(2,'0')+')';if(!notes.length){let p=document.createElement('p');p.className='notes-empty';p.textContent='아직 저장된 질문이 없습니다. 어떤 작은 의문도 시작이 될 수 있습니다. ✳';host.append(p);return;}for(let i=0;i<notes.length;i++){const n=notes[i],row=document.createElement('div');row.className='note-item';let id=document.createElement('span');id.className='note-id';id.textContent=String(notes.length-i).padStart(2,'0');let btn=document.createElement('button');btn.className='note-content';btn.type='button';btn.style.cssText='text-align:left;background:none;border:0;color:inherit;padding:0;cursor:pointer';btn.textContent=n.text;btn.title='이 문장으로 포스터 만들기';btn.addEventListener('click',()=>{setPosterText(n.text);$('artifact').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});toast('선택한 문장을 포스터로 가져왔습니다.');});let typ=document.createElement('span');typ.className='note-type';typ.textContent=n.kind.toUpperCase();let remove=document.createElement('button');remove.className='note-remove';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','질문 삭제');remove.addEventListener('click',()=>{notes=notes.filter(k=>k.id!==n.id);persist();renderNotes();toast('질문을 삭제했습니다.');});row.append(id,btn,typ,remove);host.append(row);}}
 function setPosterText(text){$('posterInput').value=text.slice(0,160);updatePoster();}
 function updatePoster(){$('posterText').textContent=$('posterInput').value.trim()||'여기에 당신의 질문이 나타납니다.';$('charCount').textContent=Array.from($('posterInput').value).length+' / 160';}
 function setTheme(next){currentTheme=next;$('posterPreview').dataset.theme=next;$$('.theme-swatch').forEach(btn=>{const selected=btn.dataset.theme===next;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));});tone(next==='acid'?440:next==='violet'?523:392,'sine',.18,.014);}
 function escapeXml(str){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
 function wrapText(text,maxUnits){let lines=[],line='',units=0;for(let ch of Array.from(text)){if(ch==='\n'){lines.push(line.trim());line='';units=0;continue;}let w=/[\x00-\x7F]/.test(ch)?.52:1;if(units+w>maxUnits&&line){lines.push(line.trim());line='';units=0;}line+=ch;units+=w;}if(line.trim())lines.push(line.trim());return lines.length?lines:['무엇이 가능할까요?'];}
 function createSVG(){let raw=$('posterInput').value.trim()||'무엇이 가능할까요?';const theme={acid:{bg:'#d1ff63',ink:'#101d11',inner:'#707a8c',sun:'#fffdeb'},violet:{bg:'#8b86f7',ink:'#f8ffbd',inner:'#242562',sun:'#f98e8a'},paper:{bg:'#eee8db',ink:'#292b3c',inner:'#f87851',sun:'#e4b642'}}[currentTheme];let fs=raw.length>106?52:raw.length>68?63:raw.length>38?73:88;let width=Math.floor((920/fs)*(raw.length>100?1.05:1));let lines=wrapText(raw,width);while(lines.length>6&&fs>38){fs-=4;width=Math.floor(910/fs);lines=wrapText(raw,width)}lines=lines.slice(0,7);let lh=fs*1.3;let firstY=Math.max(810,1185-(lines.length-1)*lh);const grid=[...Array(12)].map((_,i)=>`<path d="M${i*100} 0V1350" stroke="${theme.ink}" stroke-opacity=".10"/>`).join('')+[...Array(14)].map((_,i)=>`<path d="M0 ${i*100}H1080" stroke="${theme.ink}" stroke-opacity=".10"/>`).join('');const text=lines.map((line,i)=>`<tspan x="70" dy="${i===0?0:lh}">${escapeXml(line)}</tspan>`).join('');let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><title>BEYOND — POSSIBILITY RECORD</title><rect width="1080" height="1350" fill="${theme.bg}"/><g>${grid}</g><g transform="translate(540 510)"><ellipse rx="330" ry="215" transform="rotate(-39)" fill="none" stroke="${theme.ink}" stroke-width="105" opacity=".93"/><ellipse rx="330" ry="160" transform="rotate(48)" fill="none" stroke="${theme.inner}" stroke-width="98" opacity=".75"/><circle r="74" fill="${theme.sun}"/><circle r="103" fill="none" stroke="${theme.sun}" stroke-opacity=".19" stroke-width="26"/></g><g fill="${theme.ink}"><text x="70" y="80" font-family="Arial,sans-serif" font-weight="800" font-size="23" letter-spacing="3">BEYOND / POSSIBILITY RECORD</text><text x="1008" y="80" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="28">✳ 001</text><path d="M70 ${firstY-74}H1010" stroke="${theme.ink}" stroke-width="5"/><text x="70" y="${firstY-42}" font-family="Arial,sans-serif" font-weight="800" font-size="20" letter-spacing="3">ONE QUESTION CAN CHANGE EVERYTHING</text><text x="70" y="${firstY+fs*.9}" font-size="${fs}" font-weight="800" letter-spacing="-3" font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif">${text}</text><path d="M70 1270H1010" stroke="${theme.ink}" stroke-width="2"/><text x="70" y="1305" font-family="Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="2">THE FUTURE IS AN UNFINISHED SENTENCE.</text><text x="1010" y="1305" text-anchor="end" font-family="Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="2">MAKE A CRACK.</text></g></svg>`;return svg;}
 function downloadBlob(blob,filename){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function downloadSVG(){let svg=createSVG();downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'beyond-possibility.svg');toast('편집 가능한 SVG 포스터를 저장했습니다.');tone(700,'triangle',.24,.017);}
 async function downloadPNG(){const svg=createSVG(),blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);const img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});let c=document.createElement('canvas');c.width=1080;c.height=1350;let ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.drawImage(img,0,0,c.width,c.height);let png=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG encode failed');downloadBlob(png,'beyond-possibility.png');toast('1080 × 1350 PNG 포스터를 저장했습니다.');chime();}catch(e){console.warn('PNG export failed',e);toast('PNG 저장에 실패했습니다. SVG 원본 저장을 이용해주세요.');}finally{URL.revokeObjectURL(url);}}
 const nextTopic=()=>['도시','학교','시간','인간관계','일하는 방식','예술','병원','실패','교통','미래','기억'];
 function surprise(){let all=nextTopic(),choice=all[random(all.length)],lensKeys=Object.keys(dict),next=lensKeys[random(lensKeys.length)];$('topicInput').value=choice;setLens(next);visual()?.burst();$('lab').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});toast('예상하지 못한 질문 하나를 선물했습니다.');}
 function bind(){$$('.lens-item').forEach(btn=>btn.addEventListener('click',()=>setLens(btn.dataset.lens)));let typeTimer;$('topicInput').addEventListener('input',()=>{clearTimeout(typeTimer);typeTimer=setTimeout(()=>generate(),280)});$('topicInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(typeTimer);generate(true)}});$('topicClear').addEventListener('click',()=>{$('topicInput').value='';$('topicInput').focus();generate()});$$('[data-sample]').forEach(b=>b.addEventListener('click',()=>{$('topicInput').value=b.dataset.sample;generate(true)}));$('regenerate').addEventListener('click',()=>generate(true));$('saveQuestion').addEventListener('click',()=>save(currentQuestion,lens));$('sendToPoster').addEventListener('click',()=>{setPosterText(currentQuestion);$('artifact').scrollIntoView({behavior:'smooth'});toast('이 질문을 포스터로 가져왔습니다.');});$('heroSurprise').addEventListener('click',surprise);$('breakButton').addEventListener('click',()=>{visual()?.setPalette(random(5));chime();toast('현실의 좌표가 조금 어긋났습니다.');});$$('.star-node').forEach(btn=>{btn.setAttribute('aria-pressed','false');btn.addEventListener('click',()=>{const id=btn.dataset.node;if(pair.length!==1)choosePair([id]);else if(pair[0]===id)choosePair([]);else choosePair([pair[0],id]);tone(315+random(5)*65,'sine',.17,.017);});});$('randomPair').addEventListener('click',randomPair);$('savePair').addEventListener('click',()=>save(currentPairQuestion,'collision'));$('pairToPoster').addEventListener('click',()=>{setPosterText(currentPairQuestion);$('artifact').scrollIntoView({behavior:'smooth'});toast('충돌에서 태어난 질문을 포스터로 가져왔습니다.');});$('posterInput').addEventListener('input',updatePoster);$$('.theme-swatch').forEach(btn=>btn.addEventListener('click',()=>setTheme(btn.dataset.theme)));$('downloadSVG').addEventListener('click',downloadSVG);$('downloadPNG').addEventListener('click',downloadPNG);$('exportNotes').addEventListener('click',()=>{if(!notes.length){toast('내보낼 질문이 없습니다.');return;}downloadBlob(new Blob([JSON.stringify({title:'BEYOND — PRIVATE FIELD NOTES',exportedAt:new Date().toISOString(),questions:notes},null,2)],{type:'application/json;charset=utf-8'}),'beyond-field-notes.json');toast('저장한 질문을 JSON 파일로 내보냈습니다.');});$('clearNotes').addEventListener('click',()=>{if(!notes.length){toast('삭제할 질문이 없습니다.');return;}if(window.confirm('이 브라우저에 저장한 모든 질문을 삭제할까요?')){notes=[];persist();renderNotes();toast('저장된 질문을 모두 삭제했습니다.');}});$('soundToggle').addEventListener('click',()=>{audioOn=!audioOn;$('soundToggle').setAttribute('aria-pressed',String(audioOn));$('soundToggle').setAttribute('aria-label',audioOn?'소리 끄기':'소리 켜기');$('soundText').textContent=audioOn?'SOUND ON':'SOUND OFF';if(audioOn)chime();});let help=$('helpDialog');function openHelp(){if(!help.open)help.showModal();}function closeHelp(){if(help.open)help.close();}$('helpButton').addEventListener('click',openHelp);$('closeHelp').addEventListener('click',closeHelp);$('dialogConfirm').addEventListener('click',closeHelp);help.addEventListener('click',e=>{if(e.target===help)closeHelp();});document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||help.open||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='?'||e.key==='/'){e.preventDefault();openHelp();}else if(e.key.toLowerCase()==='b'){visual()?.setPalette(random(5));chime();toast('BREAK MODE ACTIVATED ✳');}});let scrollRaf=false;window.addEventListener('scroll',()=>{if(scrollRaf)return;scrollRaf=true;requestAnimationFrame(()=>{let p=window.scrollY/Math.max(1,document.documentElement.scrollHeight-window.innerHeight);$('readProgress').style.width=(p*100).toFixed(2)+'%';scrollRaf=false;});},{passive:true});}
 function init(){load();renderNotes();bind();currentQuestion=templatize(dict.reverse[0],$('topicInput').value);$('resultQuestion').textContent=currentQuestion;$('resultIndex').textContent='001 / ∞';updatePoster();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}
 init();
})();
