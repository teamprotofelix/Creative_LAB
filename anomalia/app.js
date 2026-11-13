(() => {
  'use strict';

  // ANOMALIA is completely self-contained. No API calls, analytics, assets or libraries.
  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const canvas = $('universe');
  const geometry = $('geometry');
  const gctx = geometry.getContext('2d');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [
    { title:'사건의<br><em>안쪽</em>', label:'사건의 안쪽', kind:'THE EVENT', color:'#e6b47c', rgb:'230,180,124', copy:'빛이 태어나기 전부터<br>무언가 당신을 바라보고 있었습니다.', instruction:'중심을 눌러, 존재하지 않는 중력을 만드세요.', quotes:['빛이 사라진 곳에서 우주는 비로소 자신의 얼굴을 보았다.','모든 시작에는, 시작 이전의 침묵이 있었다.','이곳에서 어둠은 빛의 반대가 아니라 빛의 기원이다.','별들이 사라진 것이 아니다. 당신이 그 안에 들어온 것이다.'] },
    { title:'미래의<br><em>정원</em>', label:'미래의 정원', kind:'POST-HUMAN BLOOM', color:'#9cf8bf', rgb:'156,248,191', copy:'진화한 적 없는 꽃들이 피어납니다.<br>아직 태어나지 않은 계절을 향해서.', instruction:'커서로 빛의 방향을 옮겨 꽃의 결을 바꿔보세요.', quotes:['아직 태어나지 않은 생명도 봄을 기억하고 있었다.','자연은 인간이 이해할 수 없는 방식으로 아름다워진다.','여기서는 식물이 미래의 햇빛을 먹고 자란다.','이 정원의 꽃말은 어느 언어에도 번역되지 않는다.'] },
    { title:'네 번째<br><em>방향</em>', label:'네 번째 방향', kind:'FOURTH DIRECTION', color:'#88e5ff', rgb:'136,229,255', copy:'앞도 뒤도, 위도 아래도 아닌 곳.<br>우리가 잃어버린 공간의 문법.', instruction:'커서를 움직여 사차원 그림자를 뒤틀어보세요.', quotes:['이 문은 열리지 않는다. 보는 사람이 접힌다.','평면 위의 그림자가 입체의 고향을 그리워했다.','우주에는 우리가 아직 이름 붙이지 않은 방향이 있다.','거리를 재려고 했더니 차원 하나가 사라졌다.'] },
    { title:'발생하지 않은<br><em>기억</em>', label:'발생하지 않은 기억', kind:'PRE-MEMORY', color:'#cfadff', rgb:'207,173,255', copy:'기억은 언제나 과거에서 오는 걸까요?<br>이 바다는 내일의 파도를 기억합니다.', instruction:'화면을 눌러 시간의 수면에 파문을 남겨보세요.', quotes:['아직 일어나지 않은 일이 가장 선명하게 기억났다.','기억이란 시간을 통과하는 빛의 늦은 대답이다.','누군가 당신을 기억한다. 아직 만나지도 않았는데.','바다는 자신이 한 번도 가진 적 없는 해안을 그리워했다.'] },
    { title:'시간의<br><em>성당</em>', label:'시간의 성당', kind:'CHRONO CATHEDRAL', color:'#ffb6ac', rgb:'255,182,172', copy:'여기에서는 시간이 흐르지 않습니다.<br>무한히 많은 순간이 동시에 숨을 쉽니다.', instruction:'중앙을 바라본 채 움직여 보세요. 끝은 시작을 향합니다.', quotes:['시계가 멈춘 순간, 시간이 처음으로 움직였다.','영원이란 무한히 긴 시간이 아니라, 길이가 없는 순간이다.','성당의 문을 열었더니 들어오기 전의 자신이 서 있었다.','모든 길은 같은 순간으로 돌아오지만, 도착한 이는 달라진다.'] },
    { title:'관측자의<br><em>부재</em>', label:'관측자의 부재', kind:'THE UNWRITTEN', color:'#f5f1ff', rgb:'245,241,255', copy:'이 세계가 당신을 보고 있다면,<br>진짜 관측자는 누구일까요?', instruction:'이곳의 형태는 좌표와 관측에 따라 끝없이 달라집니다.', quotes:['당신이 우주를 보고 있다고 생각하는 동안, 우주는 당신을 완성하고 있었다.','관측을 멈춘 뒤에도, 세계는 잠시 당신의 모양으로 남아 있었다.','마지막 문에는 문고리가 없다. 문 너머에서 누군가가 열어준다.','이것은 끝이 아니다. 다만 관측자가 바뀌었다.'] }
  ];

  const vertexShader = `#version 300 es
  in vec2 a_position;
  void main(){ gl_Position=vec4(a_position,0.,1.); }`;

  const fragmentShader = `#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_seed;
  uniform float u_mix;
  uniform float u_pulse;
  uniform float u_motion;
  uniform int u_from;
  uniform int u_to;
  #define PI 3.14159265359

  float hash11(float x){return fract(sin(x*127.1)*43758.5453123);}
  float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  vec2 hash22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453123);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=p*2.07+vec2(17.1,8.3);a*=.5;}return f;}
  mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
  float band(float x,float w){return exp(-pow(x/max(w,.0001),2.));}
  vec3 pal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
  float stars(vec2 p,float scale,float seed){
    vec2 x=p*scale;vec2 id=floor(x),f=fract(x)-.5;
    vec2 jitter=(hash22(id+seed)-.5)*.6;
    float h=hash21(id+seed*2.7);
    float s=1.-smoothstep(.016,.11,length(f-jitter));
    return s*step(.984,h)*(.4+.6*sin(u_time*.8+h*22.)*sin(u_time*.8+h*22.));
  }
  vec3 sky(vec2 p){
    float n=fbm(p*vec2(2.,3.)+vec2(u_seed*.00013,.7));
    vec3 c=vec3(.003,.006,.014)+vec3(.014,.014,.029)*pow(n,3.)*2.;
    float st=stars(p,94.,5.)+stars(p,175.,13.)*.52+stars(p,285.,31.)*.24;
    return c+st*vec3(.61,.75,.96);
  }
  vec3 sceneEvent(vec2 uv,float t){
    vec2 p=uv-vec2(.19,.015)-u_pointer*.045;
    p*=rot(.15*sin(t*.10));
    float r=length(p)+.0001;
    float a=atan(p.y,p.x);
    vec2 bend=p+vec2(cos(a+2.2/(r+.12)),sin(a+2.2/(r+.12)))*(.035/(r+.14));
    vec3 col=sky(bend);
    float neb=fbm(p*4.7+vec2(t*.03,u_seed*.001));
    col+=vec3(.018,.008,.009)*pow(neb,2.);
    float diskR=length(vec2(p.x,p.y*1.95));
    float swirl=sin(14.*a-23.*diskR+t*1.25+fbm(p*17.+t*.1)*3.);
    float grain=noise(vec2(a*10.-t*.4,diskR*37.)+u_seed*.0003);
    float disk=band(diskR-.315-.013*swirl,.058)*(.55+.45*grain);
    float inner=band(diskR-.275,.021);
    float outer=band(diskR-.42,.11);
    float ring=band(r-.178,.012);
    vec3 fire=mix(vec3(.32,.065,.023),vec3(1.4,.70,.27),smoothstep(-.8,.9,sin(a-.65)));
    col+=fire*disk*(1.4+.65*swirl);
    col+=vec3(.23,.09,.045)*outer*(.35+.5*swirl);
    col+=vec3(1.8,1.17,.57)*inner*.85;
    col+=vec3(.64,.83,1.5)*band(r-.200,.030)*.48;
    col+=vec3(1.7,.82,.44)*ring*.85;
    float voidMask=1.-smoothstep(.120,.167,r);
    col=mix(col,vec3(.00035,.0005,.002),voidMask);
    col+=vec3(.48,.85,1.1)*band(r-.152,.007)*.8;
    float arms=band(sin(a*3.4+t*.1+log(r+.05)*4.),.08)*smoothstep(.37,.64,r)*.14;
    col+=vec3(.20,.31,.64)*arms;
    col+=vec3(1.4,.74,.45)*band(r-(.22+(1.-u_pulse)*.8),.012)*u_pulse*.55;
    return col;
  }
  vec3 sceneGarden(vec2 uv,float t){
    vec2 p=uv-vec2(.17,.005)-u_pointer*.08;
    float r=length(p)+.001,a=atan(p.y,p.x);
    float n=fbm(p*3.6+vec2(t*.07,u_seed*.001));
    vec3 col=sky(p*1.3)*vec3(.40,.75,.66)+vec3(.007,.04,.033)*pow(n,3.)*2.;
    float petals=9.+floor(mod(u_seed,4.));
    float ripple=sin(a*petals+sin(a*3.-t*.19)*.8+t*.17);
    float outer=.29+.105*ripple+.026*sin(a*petals*3.-t*.2);
    float dist=r-outer;
    float body=1.-smoothstep(-.09,.028,dist);
    body*=smoothstep(.05,.17,r);
    float veins=pow(.5+.5*sin(a*petals*2.+r*35.-t*.35+fbm(p*7.)*2.),9.);
    vec3 irid=pal(a/6.283+r*.35+t*.006,vec3(.28,.42,.42),vec3(.27,.34,.35),vec3(1.,.8,.7),vec3(.02,.16,.43));
    col+=body*irid*(.6+veins*1.2);
    float contours=band(dist,.008)+.45*band(dist+.043,.007)+.27*band(dist+.075,.006);
    col+=contours*vec3(.7,1.8,1.10)*(1.+.25*sin(a*petals));
    for(int i=0;i<8;i++){
      float k=float(i);
      float phi=k*PI*.25+t*.025;
      float branch=band(sin(a-phi+.22*sin(r*15.+k)),.035+max(0.,r-.3)*.03);
      branch*=smoothstep(.10,.23,r)*(1.-smoothstep(.46,.72,r));
      col+=vec3(.18,.81,.49)*branch*(.3+.7*sin(r*34.+k));
    }
    float heart=band(r-.09,.09);
    col+=heart*vec3(.23,.67,.48)*(.8+.3*sin(t*.8));
    col+=band(r-.038,.019)*vec3(1.0,2.0,1.42);
    float spores=stars(p+vec2(t*.006,-t*.004),90.,u_seed*.01)*1.8;
    col+=vec3(.35,.94,.73)*spores;
    col+=vec3(.35,.7,.57)*band(r-(.23+(1.-u_pulse)*.7),.008)*u_pulse;
    return col;
  }
  vec3 sceneFold(vec2 uv,float t){
    vec2 p=uv-vec2(.17,.005)-u_pointer*.035;
    float r=length(p)+.0008,a=atan(p.y,p.x);
    float depth=-log(r);
    float wave=sin(7.*a+depth*2.7-t*.23);
    float lattice=pow(1.-abs(sin(depth*4.4-t*.28+wave*.17)),29.);
    float radial=pow(1.-abs(sin(a*12.+sin(depth*.9+t*.12)*.6)),42.);
    float facet=pow(1.-abs(sin(a*6.+depth*2.1-t*.17)),35.);
    float twist=fbm(vec2(a*2.,depth*.8)+vec2(t*.04,u_seed*.0003));
    vec3 col=sky(p*1.5)*vec3(.2,.6,1.);
    col+=vec3(.018,.037,.10)*twist;
    float fog=1.-smoothstep(.07,.73,r);
    col+=vec3(.12,.40,.63)*lattice*(.8+.6*wave)*fog;
    col+=vec3(.11,.68,.86)*radial*(.3+.5*lattice)*fog;
    col+=vec3(.14,.2,.45)*facet*fog;
    col+=vec3(.04,.21,.4)*band(r-.25,.2);
    col+=vec3(.12,.62,1.1)*band(r-.025,.025)*.7;
    col+=vec3(.54,.88,1.5)*band(r-(.16+(1.-u_pulse)*.65),.008)*u_pulse*.7;
    return col;
  }
  vec3 sceneMemory(vec2 uv,float t){
    vec2 p=uv-vec2(.13,0.);
    p*=rot(-.28);
    p+=u_pointer*.065;
    float n=fbm(p*2.3+vec2(t*.09,u_seed*.001));
    vec2 q=p+vec2(n-.5,fbm(p*3.8-vec2(t*.12,0.))-.5)*.40;
    float f=fbm(q*4.4+vec2(-t*.065,t*.09));
    float v=sin(p.y*16.+f*11.+sin(p.x*8.-t*.17)*2.);
    float ribbon=pow(1.-abs(v),19.);
    float ribbon2=pow(1.-abs(sin(p.x*12.+p.y*8.+f*15.-t*.16)),25.);
    float density=sin(p.y*23.+f*9.-p.x*7.+t*.31);
    vec3 col=vec3(.008,.009,.034)+vec3(.028,.018,.09)*n*3.;
    col+=pal(.32+f*.65+p.y*.17,vec3(.15,.12,.26),vec3(.14,.22,.32),vec3(1.,1.,1.),vec3(.22,.46,.59))*smoothstep(-.5,.7,density)*.95;
    col+=vec3(.46,.30,.96)*ribbon*.8;
    col+=vec3(.32,1.05,1.3)*ribbon2*.54;
    col+=vec3(.25,.09,.47)*band(p.y+.06,.3)*2.;
    float sparkle=stars(p+vec2(t*.003,-t*.005),124.,18.)*.9;
    col+=vec3(.69,.73,1.3)*sparkle;
    float radius=length(p*vec2(1.,1.3));
    col+=vec3(.8,.43,1.0)*band(radius-(.18+(1.-u_pulse)*.75),.008)*u_pulse*.65;
    return col;
  }
  vec3 sceneCathedral(vec2 uv,float t){
    vec2 p=uv-vec2(.18,0.)-u_pointer*.035;
    p*=rot(.02*sin(t*.06));
    float r=length(p)+.002,a=atan(p.y,p.x);
    float z=-log(r);
    float w=a+z*.22+.19*sin(z*2.-t*.18);
    float columns=pow(1.-abs(sin(w*9.)),32.);
    float vaults=pow(1.-abs(sin(z*5.6-t*.25+.23*sin(w*7.))),34.);
    float tracery=pow(1.-abs(sin(w*18.+z*3.6)),65.);
    float aisle=pow(1.-abs(sin(w*4.5+sin(z+t*.1))),24.);
    float glass=fbm(vec2(w*3.,z*3.)+vec2(t*.024,u_seed*.003));
    float layer=1.-smoothstep(.04,.77,r);
    vec3 col=vec3(.009,.006,.019)+sky(p)*vec3(.35,.18,.37);
    col+=pal(glass+w*.19,vec3(.12,.045,.09),vec3(.19,.12,.22),vec3(1.2,.8,.8),vec3(.05,.48,.56))*layer*1.4;
    col+=vec3(.7,.30,.31)*columns*layer*.75;
    col+=vec3(1.2,.67,.46)*vaults*layer*.8;
    col+=vec3(.75,.29,.5)*tracery*layer*.6;
    col+=vec3(.18,.11,.3)*aisle;
    col+=vec3(1.4,.9,.65)*band(r-.027,.035);
    col+=vec3(.57,.21,.44)*band(r-(.15+(1.-u_pulse)*.76),.012)*u_pulse*.9;
    return col;
  }
  vec3 sceneUnwritten(vec2 uv,float t){
    vec2 z=(uv-vec2(.13,0.)-u_pointer*.1)*2.45;
    z*=rot(.03*sin(t*.1));
    vec2 c=vec2(-.745,.18)+vec2(sin(u_seed*.017)*.065,cos(u_seed*.023)*.047);
    c+=vec2(sin(t*.085),cos(t*.069))*.013;
    float trap=100.,mag=0.,stripe=0.;
    int iter=0;
    for(int i=0;i<64;i++){
      z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;
      float d=dot(z,z);
      trap=min(trap,abs(length(z)-.77));
      stripe+=exp(-abs(z.y)*12.)*.025;
      if(d>64.){mag=d;iter=i;break;}
      iter=i;
    }
    float n=float(iter)/64.;
    float tone=n+log(max(1.,mag))*.007;
    vec3 col=pal(tone*2.2+u_seed*.0001,vec3(.18,.23,.28),vec3(.22,.33,.31),vec3(1.,1.1,.8),vec3(.13,.39,.63));
    col*=.2+smoothstep(.06,.84,n)*1.7;
    col+=vec3(.9,.75,1.1)*exp(-trap*26.)*(.35+n);
    col+=vec3(.23,.61,.7)*stripe*2.;
    col+=sky(uv)*.13;
    col+=vec3(.5,.55,1.)*band(length(uv)-(.19+(1.-u_pulse)*.72),.006)*u_pulse;
    return col;
  }
  vec3 getScene(int scene,vec2 uv,float t){
    if(scene==0)return sceneEvent(uv,t);
    if(scene==1)return sceneGarden(uv,t);
    if(scene==2)return sceneFold(uv,t);
    if(scene==3)return sceneMemory(uv,t);
    if(scene==4)return sceneCathedral(uv,t);
    return sceneUnwritten(uv,t);
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy-u_resolution*.5)/min(u_resolution.x,u_resolution.y);
    float t=u_time*u_motion;
    vec3 col=getScene(u_to,uv,t);
    if(u_mix<.999){vec3 previous=getScene(u_from,uv,t);col=mix(previous,col,smoothstep(0.,1.,u_mix));}
    float v=length(uv*.81);
    col*=1.-.20*smoothstep(.2,1.1,v);
    col=col/(vec3(.83)+col*.52);
    col=pow(max(col,vec3(0.)),vec3(.94));
    float grain=hash21(gl_FragCoord.xy+floor(t*24.))-.5;
    col+=grain*.012;
    outColor=vec4(clamp(col,0.,1.),1.);
  }`;

  let gl=null, glProgram=null, uniforms=null, glAvailable=false;
  let fallbackCtx=null;
  let current=0, previous=0, transitionStart=0, changing=false;
  let seed=readSeed(), visited=readVisited(), secretUnlocked=false;
  let entered=false, reducedMotion=motionPreference.matches, animationFrame=0;
  let startAt=performance.now(), lastNow=startAt, renderTime=0, lastReadout=0, lastFallback=0;
  let pulseStart=-10000, toastTimer, audio=null;
  let pointer={x:0,y:0,tx:0,ty:0}, downPoint=null;
  let worldQuotes=readJournal();
  let width=innerWidth,height=innerHeight,dpr=1;

  function parseParam(name){try{return new URLSearchParams(location.search).get(name);}catch{return null;}}
  function readSeed(){const s=Number(parseParam('seed'));return s>0&&s<1000000&&Number.isInteger(s)?s:Math.floor(Math.random()*899999)+100000;}
  function readVisited(){try{const a=JSON.parse(sessionStorage.getItem('anomalia_visited')||'[]');return new Set(Array.isArray(a)?a.filter(x=>Number.isInteger(x)&&x>=0&&x<5):[]);}catch{return new Set();}}
  function readJournal(){try{const a=JSON.parse(localStorage.getItem('anomalia_journal')||'[]');return Array.isArray(a)?a.slice(0,24).filter(x=>x&&typeof x.text==='string'&&typeof x.label==='string'):[];}catch{return [];}}
  function updateURL(){try{const url=new URL(location.href);url.searchParams.set('seed',String(seed));url.searchParams.set('world',String(current+1));history.replaceState(null,'',url.pathname+url.search+url.hash);}catch{/* file:// and restricted browsing still work */}}
  function storeVisited(){try{sessionStorage.setItem('anomalia_visited',JSON.stringify(Array.from(visited)));}catch{}}
  function storeJournal(){try{localStorage.setItem('anomalia_journal',JSON.stringify(worldQuotes));}catch{}}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2900);}
  function compile(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(info);}return sh;}
  function initGL(){
    try{
      gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      if(!gl)throw new Error('WebGL2 unavailable');
      const vs=compile(gl.VERTEX_SHADER,vertexShader),fs=compile(gl.FRAGMENT_SHADER,fragmentShader);
      glProgram=gl.createProgram();gl.attachShader(glProgram,vs);gl.attachShader(glProgram,fs);gl.linkProgram(glProgram);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(glProgram,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(glProgram));
      gl.useProgram(glProgram);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(glProgram,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      uniforms={resolution:gl.getUniformLocation(glProgram,'u_resolution'),pointer:gl.getUniformLocation(glProgram,'u_pointer'),time:gl.getUniformLocation(glProgram,'u_time'),seed:gl.getUniformLocation(glProgram,'u_seed'),mix:gl.getUniformLocation(glProgram,'u_mix'),pulse:gl.getUniformLocation(glProgram,'u_pulse'),motion:gl.getUniformLocation(glProgram,'u_motion'),from:gl.getUniformLocation(glProgram,'u_from'),to:gl.getUniformLocation(glProgram,'u_to')};
      glAvailable=true;
    }catch(err){console.warn('ANOMALIA: switching to 2D fallback',err);glAvailable=false;gl=null;fallbackCtx=canvas.getContext('2d');}
  }

  function resize(){
    width=innerWidth;height=innerHeight;
    const maxDpr=width<700?1.25:1.55;
    dpr=Math.min(devicePixelRatio||1,maxDpr);
    if(!glAvailable)dpr=Math.min(dpr,.8);
    // Limit extremely large GPU work surfaces while respecting display dimensions.
    const limit=Math.sqrt(2800000/(width*height));dpr=Math.max(.72,Math.min(dpr,limit));
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    geometry.width=Math.round(width*Math.min(devicePixelRatio||1,1.7));geometry.height=Math.round(height*Math.min(devicePixelRatio||1,1.7));
    geometry.style.width=width+'px';geometry.style.height=height+'px';
    if(glAvailable)gl.viewport(0,0,canvas.width,canvas.height);
    fallbackStars=createFallbackStars();
  }
  let fallbackStars=[];
  function createFallbackStars(){return Array.from({length:width<700?85:220},(_,i)=>{const r=randomUnit(seed+i*67);return {x:r[0]*width,y:r[1]*height,r:.3+r[2]*1.4,a:.1+r[3]*.65};});}
  function randomUnit(n){return [0,1,2,3].map(k=>{let x=Math.sin(n*128.17+k*311.7)*43758.5453;return x-Math.floor(x);});}
  // Rich Canvas 2D fallback for WebGL-disabled browsers. The content remains
  // interactive, navigable, and visually distinct without third-party assets.
  const fractalCache=new Map();
  function juliaFallbackImage(){
    if(fractalCache.has(seed))return fractalCache.get(seed);
    const w=500,h=280,off=document.createElement('canvas');off.width=w;off.height=h;
    const ctx=off.getContext('2d'),im=ctx.createImageData(w,h),data=im.data;
    const cr=-.745+Math.sin(seed*.017)*.065,ci=.18+Math.cos(seed*.023)*.047;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let zr=((x/w)-.55)*4.5,zi=((y/h)-.5)*2.65,trap=9,n=0;
      for(;n<54;n++){const real=zr*zr-zi*zi+cr;zi=2*zr*zi+ci;zr=real;trap=Math.min(trap,Math.abs(Math.hypot(zr,zi)-.77));if(zr*zr+zi*zi>70)break;}
      const a=(x+y*w)*4,v=Math.pow(n/54,.6),edge=Math.exp(-trap*15);
      data[a]=Math.min(255,15+edge*120+v*110);data[a+1]=Math.min(255,20+edge*65+v*155);data[a+2]=Math.min(255,29+edge*200+v*177);data[a+3]=255;
    }
    ctx.putImageData(im,0,0);fractalCache.clear();fractalCache.set(seed,off);return off;
  }
  function drawFallback(now){
    if(!fallbackCtx||now-lastFallback<85)return;lastFallback=now;
    const c=fallbackCtx,w=canvas.width,h=canvas.height;
    c.setTransform(w/width,0,0,h/height,0,0);c.clearRect(0,0,width,height);
    const colors=['#091019','#07160f','#061022','#120b28','#1b0c24','#10101c'];
    const grad=c.createRadialGradient(width*.66,height*.48,4,width*.63,height*.5,Math.max(width,height)*.69);
    grad.addColorStop(0,colors[current]);grad.addColorStop(1,'#010309');c.fillStyle=grad;c.fillRect(0,0,width,height);
    for(const p of fallbackStars){c.fillStyle=`rgba(204,222,255,${p.a*(.75+.25*Math.sin(now*.001+p.x))})`;c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill();}
    const cx=width*(width<700?.64:.65)+pointer.x*width*.035,cy=height*.48-pointer.y*height*.04;
    const R=Math.min(width,height)*(width<700?.245:.29),t=reducedMotion?0:now*.0002;
    c.save();c.translate(cx,cy);c.globalCompositeOperation='screen';
    if(current===0){
      c.rotate(-.21);
      let glow=c.createRadialGradient(0,0,R*.22,0,0,R*1.75);
      glow.addColorStop(0,'rgba(5,17,26,0)');glow.addColorStop(.37,'rgba(251,127,43,.13)');glow.addColorStop(.65,'rgba(199,74,34,.07)');glow.addColorStop(1,'rgba(15,12,30,0)');c.fillStyle=glow;
      c.beginPath();c.arc(0,0,R*1.75,0,Math.PI*2);c.fill();
      for(let i=0;i<27;i++){
        const r=R*(.78+i*.021),hue=18+(i%8)*3;
        c.beginPath();c.ellipse(0,0,r,r*.40+.1*i,.04,Math.sin(i*2.1+t*.3),Math.sin(i*2.1+t*.3)+Math.PI*(1.15+(i%4)*.12));
        c.strokeStyle=`hsla(${hue} 100% ${55+(i%6)*5}% / ${.10+(27-i)*.014})`;
        c.lineWidth=.8+(i%5)*.32;c.shadowBlur=5;c.shadowColor='#ff8e4a';c.stroke();
      }
      c.shadowBlur=27;c.shadowColor='#ffa861';c.strokeStyle='rgba(255,193,125,.92)';c.lineWidth=2.5;
      c.beginPath();c.ellipse(0,0,R*.88,R*.43,0,0,Math.PI*2);c.stroke();
      c.globalCompositeOperation='source-over';c.shadowBlur=0;c.fillStyle='#020408';c.beginPath();c.arc(0,0,R*.52,0,Math.PI*2);c.fill();
      c.shadowBlur=16;c.shadowColor='#70d9ff';c.strokeStyle='rgba(126,217,255,.8)';c.lineWidth=2;c.stroke();
    }else if(current===1){
      const petals=10+seed%4;
      c.rotate(t*.17);
      for(let i=0;i<petals;i++){
        c.save();c.rotate(i*Math.PI*2/petals);
        const length=R*1.35;
        c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-R*.58,-R*.45,-R*.57,-R*.99,0,-length);c.bezierCurveTo(R*.51,-R*.95,R*.63,-R*.46,0,0);c.closePath();
        const g=c.createLinearGradient(0,0,0,-length);
        g.addColorStop(0,'rgba(44,238,148,.4)');g.addColorStop(.6,i%2?'rgba(58,167,251,.22)':'rgba(153,94,242,.18)');g.addColorStop(1,'rgba(175,255,212,.1)');
        c.fillStyle=g;c.fill();c.shadowColor='#87fbd9';c.shadowBlur=13;c.strokeStyle='rgba(152,252,211,.72)';c.lineWidth=1.4;c.stroke();
        c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-R*.15,-R*.6,0,-length);c.lineWidth=.65;c.strokeStyle='rgba(203,252,242,.42)';c.stroke();c.restore();
      }
      const g=c.createRadialGradient(0,0,0,0,0,R*.35);g.addColorStop(0,'rgba(227,255,240,.9)');g.addColorStop(.24,'rgba(103,251,172,.56)');g.addColorStop(1,'rgba(77,245,155,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,R*.35,0,Math.PI*2);c.fill();
    }else if(current===2){
      c.rotate(t*.15);
      for(let i=0;i<25;i++){
        const r=R*(.23+i*.047);c.beginPath();c.ellipse(0,0,r,r*(.56+.3*Math.sin(i*.6+t*.08)),i*.07,0,Math.PI*2);
        c.strokeStyle=`rgba(79,194,250,${.18+(25-i)*.013})`;c.lineWidth=.8;c.shadowBlur=8;c.shadowColor='#40b6ef';c.stroke();
      }
    }else if(current===3){
      c.rotate(-.2);
      for(let i=0;i<26;i++){
        c.beginPath();
        const y=-R*1.6+i*R*.128;
        for(let x=-R*2.2;x<=R*2.2;x+=11){let yy=y+Math.sin(x/R*3.8+i*.25+t*.45)*R*.11+Math.sin(x/R*7-i*.4-t*.7)*R*.038;c.lineTo(x,yy);}
        const hue=244+(i%9)*8;
        c.shadowColor=`hsl(${hue} 94% 63%)`;c.shadowBlur=8;c.strokeStyle=`hsla(${hue} 93% 70% / ${.17+(i%4)*.075})`;c.lineWidth=.7+i%3;c.stroke();
      }
      const g=c.createRadialGradient(0,0,R*.05,0,0,R*1.7);g.addColorStop(0,'rgba(174,86,255,.24)');g.addColorStop(1,'rgba(80,30,181,0)');c.fillStyle=g;c.fillRect(-R*2,-R*2,R*4,R*4);
    }else if(current===4){
      c.rotate(-t*.18);
      for(let i=0;i<29;i++){
        const r=R*(.12+i*.057);
        c.beginPath();
        for(let j=0;j<=210;j++){
          const a=j/210*Math.PI*2,rr=r*(1+.075*Math.sin(a*7+i*.3+t*.27));
          const x=Math.cos(a+Math.sin(i*.09)*.2)*rr,y=Math.sin(a+Math.sin(i*.09)*.2)*rr;
          if(!j)c.moveTo(x,y);else c.lineTo(x,y);
        }
        c.closePath();c.strokeStyle=`hsla(${i%2?14:282} 94% 71% / ${.09+(29-i)*.009})`;c.lineWidth=i%6===0?1.9:.65;c.shadowBlur=6;c.shadowColor='#ffb29b';c.stroke();
      }
      const g=c.createRadialGradient(0,0,0,0,0,R*.6);g.addColorStop(0,'rgba(255,233,191,.85)');g.addColorStop(.24,'rgba(245,137,143,.16)');g.addColorStop(1,'rgba(180,89,192,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,R*.6,0,Math.PI*2);c.fill();
    }else if(current===5){
      c.restore();c.drawImage(juliaFallbackImage(),0,0,width,height);c.save();
    }
    c.restore();
  }

  // A real 4D tesseract: rotate in six 4D planes, perspective-project to 3D,
  // then project again to the viewer's 2D screen. No image files involved.
  const vertices4D=[];const edges4D=[];
  for(let i=0;i<16;i++)vertices4D.push([i&1?1:-1,i&2?1:-1,i&4?1:-1,i&8?1:-1]);
  for(let i=0;i<16;i++)for(let axis=0;axis<4;axis++){const j=i^(1<<axis);if(i<j)edges4D.push([i,j]);}
  function rotate4D(v,i,j,a){const c=Math.cos(a),s=Math.sin(a);const x=v[i],y=v[j];v[i]=x*c-y*s;v[j]=x*s+y*c;}
  function drawTesseract(now,mix=1){
    const c=gctx;if(!c)return;
    const scale=geometry.width/width;c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,width,height);
    let visible=current===2?1:0;if(changing){if(previous===2)visible=1-mix;else if(current===2)visible=mix;}
    if(visible<.003)return;
    const motion=reducedMotion?0.015:1;
    const tt=now*.00017*motion;
    const angles=[tt*.87+pointer.x*.5,tt*.53+pointer.y*.65,tt*.26,tt*.79+pointer.x*.35,tt*.39+pointer.y*.5,tt*.31];
    const projected=vertices4D.map(v0=>{
      const v=[...v0];const pairs=[[0,3],[1,3],[2,3],[0,1],[0,2],[1,2]];
      for(let k=0;k<6;k++)rotate4D(v,pairs[k][0],pairs[k][1],angles[k]);
      const perspective4=3.6/(3.6-v[3]);
      let x=v[0]*perspective4,y=v[1]*perspective4,z=v[2]*perspective4;
      const perspective3=4.3/(4.3-z);
      const factor=Math.min(width,height)*.145;
      return {x:width*(width<700?.60:.63)+x*perspective3*factor,y:height*.48+y*perspective3*factor,z,depth:v[3]};
    });
    c.save();c.globalAlpha=visible*.92;c.globalCompositeOperation='screen';
    for(const [i,j] of edges4D){
      const a=projected[i],b=projected[j],brightness=Math.max(0,Math.min(1,1+(a.z+b.z)*.13));
      const gradient=c.createLinearGradient(a.x,a.y,b.x,b.y);
      gradient.addColorStop(0,`rgba(63,217,255,${.4*brightness})`);
      gradient.addColorStop(1,`rgba(212,163,255,${.7*brightness})`);
      c.strokeStyle=gradient;c.lineWidth=1.1;c.shadowBlur=15;c.shadowColor='#3cdeff';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
      c.lineWidth=4;c.globalAlpha=visible*.09;c.stroke();c.globalAlpha=visible*.92;
    }
    for(const p of projected){
      c.shadowColor='#c0f6ff';c.shadowBlur=22;c.fillStyle=`rgba(225,250,255,${.72+p.z*.08})`;
      c.beginPath();c.arc(p.x,p.y,2.1,0,Math.PI*2);c.fill();
    }
    c.shadowBlur=0;c.globalCompositeOperation='source-over';
    c.strokeStyle='rgba(120,210,235,.28)';c.lineWidth=.7;
    const cx=width*(width<700?.60:.63),cy=height*.48,R=Math.min(width,height)*.32;
    c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.setLineDash([2,7]);c.stroke();c.setLineDash([]);
    c.font='10px Consolas,monospace';c.fillStyle='rgba(172,225,240,.62)';
    c.fillText('x₄',cx+R+12,cy+4);c.fillText('W = UNKNOWN',cx-R,cy-R-14);
    c.restore();
  }

  function updateAudio(){if(!audio)return;const root=[54,66,82,49,58,41][current];const now=audio.ctx.currentTime;audio.osc.forEach((o,i)=>{o.frequency.setTargetAtTime(root*[1,1.498,2.006][i],now,.75);});audio.filter.frequency.setTargetAtTime([240,490,720,440,340,800][current],now,1.2);}
  async function toggleAudio(){
    if(audio){audio.ctx.close().catch(()=>{});audio=null;$('soundToggle').classList.remove('is-on');$('soundToggle').setAttribute('aria-label','소리 켜기');$('soundToggle').querySelector('.header-button-caption').textContent='SOUND OFF';toast('생성형 사운드를 껐습니다.');return;}
    const AudioClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioClass){toast('이 브라우저는 Web Audio를 지원하지 않습니다.');return;}
    try{
      const ctx=new AudioClass();await ctx.resume();
      const master=ctx.createGain();master.gain.value=.0001;master.connect(ctx.destination);
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;filter.Q.value=.28;filter.connect(master);
      const osc=[];
      for(let i=0;i<3;i++){
        const o=ctx.createOscillator(),g=ctx.createGain();o.type=i===1?'triangle':'sine';o.frequency.value=55*(i+1);g.gain.value=[.043,.025,.016][i];o.connect(g);g.connect(filter);o.start();osc.push(o);
      }
      const lfo=ctx.createOscillator(),lfoGain=ctx.createGain();lfo.type='sine';lfo.frequency.value=.12;lfoGain.gain.value=.015;lfo.connect(lfoGain);lfoGain.connect(master.gain);lfo.start();
      master.gain.setTargetAtTime(.072,ctx.currentTime,1.2);
      audio={ctx,master,filter,osc,lfo};updateAudio();
      $('soundToggle').classList.add('is-on');$('soundToggle').setAttribute('aria-label','소리 끄기');$('soundToggle').querySelector('.header-button-caption').textContent='SOUND ON';toast('생성형 사운드 활성화 · 소리 크기는 작게 설정되어 있습니다.');
    }catch(e){console.warn(e);toast('소리를 켤 수 없습니다.');}
  }

  function setScene(index,{initial=false}={}){
    if(index<0||index>5||index===5&&!secretUnlocked)return;
    if(index===current&&!initial)return;
    previous=current;current=index;
    if(!initial){transitionStart=performance.now();changing=true;$('sceneTitle').classList.remove('is-revealed');}
    const s=scenes[current];
    app.dataset.scene=String(current);app.style.setProperty('--accent',s.color);app.style.setProperty('--accent-rgb',s.rgb);
    $('figureNumber').textContent=String(current+1).padStart(3,'0');
    $('sceneOrdinal').textContent=`UNIVERSE ${String(current+1).padStart(2,'0')} / ${secretUnlocked?'06':'05'}`;
    $('sceneKind').textContent=s.kind;$('sceneTitle').innerHTML=s.title;
    $('sceneDescription').innerHTML=s.copy;$('sceneInstruction').textContent=s.instruction;
    $('pageIndicator').textContent=`${String(current+1).padStart(2,'0')} — ${secretUnlocked?'06':'05'}`;
    [...document.querySelectorAll('.world-link')].forEach(btn=>{const active=Number(btn.dataset.world)===current;btn.classList.toggle('is-active',active);if(active)btn.setAttribute('aria-current','true');else btn.removeAttribute('aria-current');});
    if(index<5){visited.add(index);storeVisited();}
    checkUnlock();updateQuote();updateAudio();updateURL();
  }
  function checkUnlock(){
    if(visited.size<5)return;
    if(secretUnlocked)return;
    secretUnlocked=true;$('secretWorld').hidden=false;$('worldCount').textContent='06 / ∞';
    $('navWhisper').textContent='여섯 번째 문이 열렸습니다. 그곳에 당신이 있습니다.';
    if(entered)setTimeout(()=>toast('관측되지 않은 여섯 번째 세계가 발견되었습니다. Ø'),800);
  }
  function nextScene(dir){const n=secretUnlocked?6:5;setScene((current+dir+n)%n);}
  function remix(){
    seed=Math.floor(Math.random()*899999)+100000;
    $('seedDisplay').textContent=String(seed).padStart(6,'0');
    pulse();updateQuote();updateURL();toast('우주의 상수가 다시 쓰였습니다.');
  }
  function pulse(){pulseStart=performance.now();const flash=$('flash');flash.style.setProperty('--flash-x',(50+pointer.x*50)+'%');flash.style.setProperty('--flash-y',(50+pointer.y*50)+'%');flash.classList.remove('is-flashing');void flash.offsetWidth;flash.classList.add('is-flashing');if(audio){audio.filter.frequency.setTargetAtTime(850,audio.ctx.currentTime,.07);setTimeout(updateAudio,260);}}
  function updateQuote(){const qs=scenes[current].quotes;const idx=(Math.floor(seed/7)+current*3)%qs.length;$('generatedQuote').textContent=qs[idx];$('quoteLabel').textContent=`TRANSMISSION ${String(current+1).padStart(3,'0')}.${idx+1}`;}
  function collectQuote(){
    const text=$('generatedQuote').textContent;
    if(worldQuotes.some(q=>q.text===text&&q.seed===seed)){toast('이미 이 문장을 관측 일지에 기록했습니다.');return;}
    worldQuotes.unshift({text,label:scenes[current].label,seed,date:new Date().toLocaleDateString('ko-KR')});worldQuotes=worldQuotes.slice(0,24);storeJournal();renderJournal();toast('문장이 관측 일지에 보관되었습니다.');
  }
  function renderJournal(){
    $('archiveCount').textContent=String(worldQuotes.length).padStart(2,'0');$('journalCount').hidden=!worldQuotes.length;$('journalCount').textContent=worldQuotes.length;
    const dest=$('journalItems');dest.replaceChildren();
    if(!worldQuotes.length){const div=document.createElement('div');div.className='empty-journal';div.textContent='아직 기록된 우주가 없습니다.';dest.append(div);return;}
    for(const [index,item] of worldQuotes.entries()){
      const article=document.createElement('article');article.className='journal-item';
      const small=document.createElement('small');small.textContent=`${item.label} / ${item.seed} / ${item.date||''}`;
      const p=document.createElement('p');p.textContent=item.text;
      const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','기록 삭제');button.addEventListener('click',()=>{worldQuotes.splice(index,1);storeJournal();renderJournal();});
      article.append(small,p,button);dest.append(article);
    }
  }
  function showOverlay(id){$(id).hidden=false;$(id).querySelector('.panel-close').focus();if(id==='journalOverlay'){updateQuote();renderJournal();}}
  function closeOverlay(id){$(id).hidden=true;}
  function anyOverlay(){return !$('helpOverlay').hidden||!$('journalOverlay').hidden;}
  function enter(){if(entered)return;entered=true;$('entry').classList.add('is-gone');app.classList.remove('pre-entry');setTimeout(()=>{if(!anyOverlay())toast('세계는 당신이 바라보는 방향으로 다시 쓰입니다.');},1500);}
  async function copyWorld(){const link=new URL(location.href);link.searchParams.set('seed',String(seed));link.searchParams.set('world',String(current+1));try{await navigator.clipboard.writeText(link.href);toast('현재 우주로 돌아오는 좌표를 복사했습니다.');}catch{window.prompt('우주 좌표를 복사하세요:',link.href);}}
  async function capture(){
    try{
      const w=1600,h=900,output=document.createElement('canvas');output.width=w;output.height=h;
      const c=output.getContext('2d');c.fillStyle='#05080c';c.fillRect(0,0,w,h);
      // Preserve full composition even for portrait/mobile screenshots.
      const scale=Math.max(w/canvas.width,h/canvas.height),dw=canvas.width*scale,dh=canvas.height*scale;
      c.drawImage(canvas,(w-dw)/2,(h-dh)/2,dw,dh);
      if(current===2){c.drawImage(geometry,(w-dw)/2,(h-dh)/2,dw,dh);}
      const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(1,3,7,.44)');grad.addColorStop(.55,'rgba(1,3,7,0)');grad.addColorStop(1,'rgba(1,3,7,.65)');c.fillStyle=grad;c.fillRect(0,0,w,h);
      c.fillStyle='#f5efe8';c.font='bold 28px Georgia';c.fillText('A N O M A L I A',90,105);
      c.fillStyle=scenes[current].color;c.fillRect(90,125,77,2);
      c.font='21px sans-serif';c.fillStyle='#eae8e5';c.fillText(scenes[current].label,90,788);
      c.font='15px Consolas, monospace';c.fillStyle='#a7a9af';c.fillText(`UNIVERSE ${String(current+1).padStart(2,'0')}  /  SEED ${seed}`,90,828);
      c.textAlign='right';c.fillText('AN ATLAS OF THE UNIMAGINED',1510,828);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Capture unsupported');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ANOMALIA_${String(current+1).padStart(2,'0')}_${seed}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('현재 관측 장면을 PNG로 채집했습니다.');
    }catch(e){console.error(e);toast('이 브라우저에서 장면을 저장하지 못했습니다.');}
  }

  function frame(now){
    animationFrame=requestAnimationFrame(frame);
    const delta=Math.min(.05,(now-lastNow)/1000);lastNow=now;
    if(!reducedMotion)renderTime+=delta;
    pointer.x+=(pointer.tx-pointer.x)*.045;pointer.y+=(pointer.ty-pointer.y)*.045;
    let mix=1;
    if(changing){mix=Math.min(1,(now-transitionStart)/1350);if(mix>=1){changing=false;previous=current;}}
    const wave=Math.max(0,1-(now-pulseStart)/1950);const pulseStrength=wave*wave;
    if(glAvailable){
      gl.useProgram(glProgram);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform2f(uniforms.pointer,pointer.x,pointer.y);
      gl.uniform1f(uniforms.time,renderTime);gl.uniform1f(uniforms.seed,seed);
      gl.uniform1f(uniforms.mix,mix);gl.uniform1f(uniforms.pulse,pulseStrength);
      gl.uniform1f(uniforms.motion,1);gl.uniform1i(uniforms.from,previous);gl.uniform1i(uniforms.to,current);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }else{drawFallback(now);}
    drawTesseract(reducedMotion?startAt:now,mix);
    if(now-lastReadout>95){
      lastReadout=now;
      $('coordinates').textContent=`${pointer.x.toFixed(3)} / ${pointer.y.toFixed(3)}`;
      const v=(.382+.11*Math.sin(renderTime*.37+seed*.001)+Math.abs(pointer.x*.12)+pulseStrength*.31)%1;
      $('entropyValue').textContent=v.toFixed(3);
    }
  }

  function bind(){
    $('enterButton').addEventListener('click',enter);
    $('brandLink').addEventListener('click',(e)=>{e.preventDefault();setScene(0);});
    document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{enter();setScene(Number(b.dataset.world));}));
    $('prevScene').addEventListener('click',()=>nextScene(-1));$('nextScene').addEventListener('click',()=>nextScene(1));
    $('remixButton').addEventListener('click',remix);$('captureButton').addEventListener('click',capture);
    $('journalButton').addEventListener('click',()=>showOverlay('journalOverlay'));
    $('helpToggle').addEventListener('click',()=>showOverlay('helpOverlay'));
    $('soundToggle').addEventListener('click',toggleAudio);
    $('collectQuote').addEventListener('click',collectQuote);$('shareWorld').addEventListener('click',copyWorld);
    $('clearJournal').addEventListener('click',()=>{if(!worldQuotes.length)return;if(confirm('저장된 모든 관측 문장을 지울까요?')){worldQuotes=[];storeJournal();renderJournal();toast('관측 기록을 지웠습니다.');}});
    document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeOverlay(el.dataset.close)));
    for(const id of ['helpOverlay','journalOverlay'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeOverlay(id);});
    window.addEventListener('keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
      if(e.key==='Escape'){$('helpOverlay').hidden=true;$('journalOverlay').hidden=true;return;}
      if(anyOverlay()){if(e.key.toLowerCase()==='h')closeOverlay('helpOverlay');else if(e.key.toLowerCase()==='j')closeOverlay('journalOverlay');return;}
      if(e.code==='Space'){e.preventDefault();enter();pulse();return;}
      const key=e.key.toLowerCase();
      if(key==='arrowright'){enter();nextScene(1);}else if(key==='arrowleft'){enter();nextScene(-1);}
      else if(/^[1-6]$/.test(key)){enter();setScene(Number(key)-1);}
      else if(key==='r'){enter();remix();}else if(key==='s'){enter();capture();}
      else if(key==='m'){toggleAudio();}else if(key==='j'){showOverlay('journalOverlay');}
      else if(key==='h'){showOverlay('helpOverlay');}
    });
    window.addEventListener('pointermove',e=>{
      pointer.tx=((e.clientX/innerWidth)-.5)*2;
      pointer.ty=-((e.clientY/innerHeight)-.5)*2;
      if(downPoint&&Math.hypot(e.clientX-downPoint.x,e.clientY-downPoint.y)>10)downPoint.moved=true;
      const halo=$('pointerHalo');halo.style.left=e.clientX+'px';halo.style.top=e.clientY+'px';
    },{passive:true});
    canvas.parentElement.addEventListener('pointerdown',e=>{if(e.target===app||e.target===canvas||e.target===geometry||e.target.classList.contains('vignette'))downPoint={x:e.clientX,y:e.clientY,moved:false};});
    window.addEventListener('pointerup',e=>{if(downPoint&&!downPoint.moved&&entered&&!anyOverlay())pulse();downPoint=null;});
    window.addEventListener('resize',resize,{passive:true});
    // Scenes can be navigated by two-finger-free wheel/swipe, with throttling.
    let lastWheel=0;
    window.addEventListener('wheel',e=>{if(!entered||anyOverlay()||Math.abs(e.deltaY)<10)return;const now=performance.now();if(now-lastWheel<800)return;lastWheel=now;nextScene(e.deltaY>0?1:-1);},{passive:true});
    let touchStart=null;
    window.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    window.addEventListener('touchend',e=>{if(!touchStart||!entered||anyOverlay())return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.6)nextScene(dx<0?1:-1);touchStart=null;},{passive:true});
    $('motionToggle').addEventListener('click',()=>{reducedMotion=!reducedMotion;$('motionToggle').setAttribute('aria-pressed',String(reducedMotion));toast(reducedMotion?'움직임을 최소화했습니다.':'움직임을 다시 활성화했습니다.');});
    motionPreference.addEventListener?.('change',e=>{reducedMotion=e.matches;});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();glAvailable=false;toast('그래픽 장치 연결이 끊어졌습니다. 새로고침하면 복구됩니다.');});
    window.addEventListener('pagehide',()=>{if(audio)audio.ctx.close().catch(()=>{});});
  }

  function boot(){
    initGL();resize();bind();
    const worldParam=Number(parseParam('world'));
    // Bookmark the hidden scene only if the visitor has already unlocked it.
    checkUnlock();
    if(Number.isInteger(worldParam)&&worldParam>=1&&worldParam<=5)current=worldParam-1;
    else if(worldParam===6&&secretUnlocked)current=5;
    setScene(current,{initial:true});
    $('seedDisplay').textContent=String(seed).padStart(6,'0');renderJournal();
    animationFrame=requestAnimationFrame(frame);
    if(!glAvailable)console.info('ANOMALIA: graceful 2D fallback active.');
  }
  boot();
})();
