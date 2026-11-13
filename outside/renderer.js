/* THE OUTSIDE — a dependency-free GPU universe.
   All worlds are synthesized in real time, with WebGL 2.0 + a Canvas 2D fallback. */
(function () {
'use strict';
const VERT = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}`;
const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec2 u_drag;
uniform float u_time;
uniform float u_scene;
uniform float u_seed;
uniform float u_rupture;
uniform float u_energy;
uniform float u_reduced;
#define PI 3.14159265359
#define TAU 6.28318530718
float hash11(float p){return fract(sin(p*127.1+78.233)*43758.5453123);}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec2 hash22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.04+vec2(3.2,7.1);a*=.5;}return v;}
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(TAU*(c*t+d));}
vec3 tonemap(vec3 c){return 1.-exp(-c);}
float stars(vec2 p,float t){vec2 g=p*vec2(210.,150.);vec2 id=floor(g);vec2 f=fract(g)-.5;vec2 r=hash22(id)-.5;float dist=length(f-r*.7);float intensity=step(.995,hash21(id+5.72));float twinkle=.78+.22*sin(t*2.+hash21(id)*10.);return intensity*twinkle*.012/(dist*dist+.008);}
vec3 cosmos(vec2 uv,float t,vec3 tint){vec2 p=uv;float n=fbm(p*2.2+vec2(.21*t,.11*t)+u_seed*.1);float cloud=pow(smoothstep(.35,.77,n),2.);vec3 c=mix(vec3(.003,.004,.014),tint*.52,cloud*.26);c+=tint*.1*pow(max(0.,fbm(p*5.5)-.55),2.);c+=vec3(.76,.85,1.)*stars(uv,t)*.52; c+=vec3(.5,.6,1.)*stars(uv*1.9+3.6,t)*.18;return c;}
float sdTorus(vec3 p,vec2 t){return length(vec2(length(p.xy)-t.x,p.z))-t.y;}
float sdSphere(vec3 p,float r){return length(p)-r;}
vec2 mapOrigin(vec3 p,float t){
   vec3 q=p;
   q.xy*=rot(.13*t + .28*u_drag.x);
   q.xz*=rot(.23+.15*t + .21*u_drag.y);
   float ring1=sdTorus(q,vec2(2.05,.055+.016*sin(q.x*9.+t)));
   vec3 r=p;r.xz*=rot(.96+.17*t);r.yz*=rot(.31*t+.28);float ring2=sdTorus(r,vec2(1.6,.045));
   vec3 s=p;s.yz*=rot(-.5+.11*t);s.xy*=rot(.79+.15*t);float ring3=sdTorus(s,vec2(2.56,.025));
   float core=sdSphere(p,.68+.026*sin(t*1.4));
   core+=.025*sin(p.x*15.+t)*sin(p.y*14.-t);
   vec2 res=vec2(core,1.);
   if(ring1<res.x)res=vec2(ring1,2.);
   if(ring2<res.x)res=vec2(ring2,3.);
   if(ring3<res.x)res=vec2(ring3,4.);
   return res;
}
vec3 normalOrigin(vec3 p,float t){float h=.003;return normalize(vec3(mapOrigin(p+vec3(h,0,0),t).x-mapOrigin(p-vec3(h,0,0),t).x,mapOrigin(p+vec3(0,h,0),t).x-mapOrigin(p-vec3(0,h,0),t).x,mapOrigin(p+vec3(0,0,h),t).x-mapOrigin(p-vec3(0,0,h),t).x));}
vec3 sceneOrigin(vec2 uv,float t){
    vec2 off=u_mouse*.11;
    vec3 ro=vec3(off*.8,-8.1),rd=normalize(vec3(uv+off*.28,1.5));
    rd.xz*=rot(u_drag.x*.18);rd.yz*=rot(u_drag.y*.15);
    float total=0.,hit=0.,mat=0.,glow=0.;vec3 pos=ro;
    for(int i=0;i<65;i++){
        pos=ro+rd*total;
        vec2 o=mapOrigin(pos,t);float d=o.x;
        glow+=.0065*exp(-abs(d)*5.3)*(1.+.3*sin(total*2.+t));
        if(d<.004){hit=1.;mat=o.y;break;}
        if(total>18.)break;
        total+=clamp(d*.71,.017,.43);
    }
    vec3 bg=cosmos(uv*.85,t,vec3(.28,.12,.50));
    float radius=length(uv-u_mouse*.045);
    bg+=vec3(.20,.08,.35)*.027/(radius*radius+.015);
    vec3 color=bg+glow*vec3(.55,.3,1.3);
    if(hit>.5){
        vec3 n=normalOrigin(pos,t);
        vec3 light=normalize(vec3(-.4,.8,-.7));
        float diff=max(dot(n,light),0.);
        float rim=pow(1.-max(dot(n,-rd),0.),2.5);
        if(mat<1.5){
           vec3 c=palette(length(pos.xy)*.34+pos.z*.22+t*.035+u_seed*.14,vec3(.35,.21,.40),vec3(.36,.22,.37),vec3(1.,1.,1.),vec3(.05,.32,.65));
           color=c*(.25+diff*1.8)+rim*vec3(.9,.44,1.5)*1.7;
           color+=vec3(.4,.16,.72)*pow(max(0.,fbm(pos.xy*6.+t*.2)-.3),2.)*2.;
        } else {
           vec3 ringColor=mat<2.5?vec3(.95,.37,1.2):mat<3.5?vec3(.26,.9,1.5):vec3(1.2,.65,.35);
           color=ringColor*(.55+diff*1.15+rim*2.1);
        }
    }
    float a=atan(uv.y,uv.x);
    float r=length(uv);
    color+=vec3(.4,.19,.55)*.008/(abs(r-(.72+.03*sin(3.*a+t*.3)))+.04);
    return color;
}
vec3 sceneFold(vec2 uv,float t){
    vec2 p=uv-u_mouse*.095;float r=length(p)+.0001;float a=atan(p.y,p.x)+u_drag.x*.55;
    float k=8.+floor(u_seed*5.);
    a=abs(mod(a,TAU/k)*2.-TAU/k);
    vec2 q=vec2(cos(a),sin(a));
    float depth=0.,spark=0.;vec3 c=vec3(.003,.006,.015);
    for(int i=0;i<16;i++){
        float z=float(i)/16.;
        float scale=exp(4.5*z-.1);
        vec2 tile=q*r*scale;
        tile*=rot(z*2.8+t*.09+u_drag.y);
        float shape=max(abs(tile.x),abs(tile.y)*1.18);
        float line=exp(-56.*abs(fract(shape*.5+z*4.8-t*.075)-.5));
        float lines=exp(-43.*abs(fract((tile.x+tile.y)*.38)-.5));
        float layer=(line*.75+lines*.34)/(1.+z*5.);
        float pulse=.55+.45*sin(z*30.-t*.72);
        vec3 h=palette(z*.7+u_seed*.2,vec3(.24,.15,.23),vec3(.22,.21,.35),vec3(1.),vec3(.55,.2,.71));
        c+=h*layer*pulse*.55;
        depth+=layer;
    }
    float vanishing=.025/(r*r+.012);
    c+=vec3(.58,.26,1.)*vanishing;
    c+=vec3(.36,.6,1.)*exp(-8.*r);
    float beams=pow(max(0.,sin(a*k*.5)),18.);
    c+=vec3(.65,.23,.45)*beams*exp(-r*2.)*.8;
    c+=cosmos(uv*1.2,t,vec3(.08,.17,.39))*.3;
    return c;
}
vec3 sceneMemory(vec2 uv,float t){
    vec2 p=uv*.88-u_mouse*.08;
    vec3 c=cosmos(uv,t,vec3(.04,.35,.28));
    float r=length(p);float a=atan(p.y,p.x);
    float seed=u_seed*6.28;
    vec2 v=p;
    for(int j=0;j<5;j++){
      float fj=float(j);
      v+=.11*sin(vec2(v.y*3.1+fj*1.8,v.x*3.6-fj*2.1)+t*.15+seed);
    }
    float neb=fbm(v*3.6+vec2(.02*t,seed));
    float filament=exp(-40.*abs(neb-.51))*.44;
    float filament2=exp(-65.*abs(fbm(v*5.8+4.)-.5))*.25;
    float halo=exp(-1.8*r*r);
    c+=vec3(.05,.6,.7)*filament*halo*1.4;
    c+=vec3(.38,.22,.83)*filament2*halo;
    float iris=exp(-40.*abs(r-(.34+.1*sin(a*6.+t*.14+neb*3.))));
    c+=vec3(.31,.45,.99)*iris*.18;
    for(int i=0;i<12;i++){
      float fi=float(i);float ang=fi*2.39996+seed+t*.04;
      vec2 pos=vec2(cos(ang),sin(ang))*sqrt((fi+.5)/12.)*.87;
      pos+=.045*sin(vec2(t*.3+fi,t*.26-fi*1.2));
      float d=length(p-pos);
      vec3 b=palette(fi*.08+u_seed*.2,vec3(.38,.54,.48),vec3(.19,.2,.33),vec3(1.),vec3(.48,.22,.1));
      c+=b*.003/(d*d+.0015);
    }
    float heart= .15/(r*r+.08)*(.6+.4*sin(t*.6));
    c+=vec3(.04,.24,.30)*heart;
    return c;
}
vec3 sceneRecursive(vec2 uv,float t){
    vec2 p=uv*.92-u_mouse*.12;float r=length(p);
    vec3 c=cosmos(uv,t,vec3(.31,.13,.14))*.7;
    vec2 z=p*1.42;
    z*=rot(t*.035+u_drag.x*.36);
    vec2 cc=vec2(-.745+.14*sin(u_seed*3.14+t*.045),.186+.16*cos(t*.055+u_seed*2.));
    float iter=0.;float trap=100.;float m=0.;
    for(int i=0;i<49;i++){
      z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+cc;
      float l=dot(z,z);
      trap=min(trap,abs(length(z)-.8));
      if(l>60.)break;
      iter+=1.;m=l;
    }
    float smoothIter=iter;
    if(iter<49.) smoothIter=iter+1.-log2(max(.01,log2(max(1.0001,length(z)))));
    float pattern=smoothIter*.038+u_seed*.2;
    vec3 color=palette(pattern,vec3(.48,.33,.38),vec3(.43,.27,.37),vec3(1.),vec3(.63,.15,.35));
    float boundary=smoothstep(.0,18.,iter);
    float inner=step(48.5,iter);
    c+=color*boundary*(1.-inner)*1.22;
    c+=vec3(.19,.06,.28)*inner*.25;
    c+=vec3(1.1,.31,.19)*exp(-trap*40.)*min(1.,iter/20.)*.2;
    float rays=pow(max(0.,sin(atan(p.y,p.x)*9.+t*.12)),32.)/(r*.7+.4);
    c+=vec3(.23,.08,.09)*rays*.3;
    return c;
}
vec3 sceneHorizon(vec2 uv,float t){
    vec2 p=uv-u_mouse*.08;float r=length(p),a=atan(p.y,p.x);
    vec3 bg=cosmos(uv*.85,t,vec3(.36,.18,.13));
    float swirl=a+2.2/(r+.25)+t*.1+u_drag.x*.2;
    float cloud=fbm(vec2(swirl*2.7,r*8.-t*.18)+u_seed);
    float acc=exp(-pow((r-.64)/.17,2.));
    float disc=acc*(.55+.7*cloud);
    float angular=.55+.45*sin(5.*swirl+cloud*7.);
    vec3 fire=palette(a/TAU+cloud*.15+u_seed*.15,vec3(.6,.27,.09),vec3(.5,.29,.19),vec3(1.),vec3(.04,.09,.18));
    vec3 c=bg+fire*disc*angular*1.65;
    float photonRing=exp(-pow((r-.335)/.016,2.));
    c+=vec3(1.8,.9,.68)*photonRing*1.1;
    c+=vec3(.38,.31,.85)*exp(-pow((r-.43)/.1,2.))*.3;
    float core=1.-smoothstep(.28,.34,r);
    c*=1.-core;
    float lens=exp(-pow((r-.40)/.09,2.));
    c+=vec3(.32,.17,.55)*lens*.16;
    float jet=exp(-abs(p.x)*10.)*exp(-abs(p.y)*.85)*(1.-smoothstep(.2,.6,r));
    c+=vec3(.25,.38,.82)*jet*.25;
    float orbital=exp(-pow((r-(.93+.04*sin(a*4.+t*.15)))/.019,2.));
    c+=vec3(.36,.18,.24)*orbital*.1;
    return c;
}
vec3 sceneWitness(vec2 uv,float t){
    vec2 p=uv-u_mouse*.06;
    p*=rot(.06*sin(t*.22)+u_drag.x*.12);
    float r=length(p),a=atan(p.y,p.x);
    float seed=u_seed*TAU;
    float wave=sin(a*7.+t*.19+seed)*.11+sin(a*13.-t*.27)*.045+sin(a*23.+seed*3.)*.018;
    float limb=.57+wave;
    float shell=exp(-pow((r-limb)/.028,2.));
    float shell2=exp(-pow((r-(limb*.7+.07*sin(a*5.-t*.14)))/.013,2.));
    float inner=pow(max(0.,1.-r*.65),1.8);
    float interference=sin(a*17.+13./(r+.23)+t*.28+seed);
    float lattice=pow(max(0.,interference),9.)*exp(-r*r*.9);
    float speckle=exp(-32.*abs(fbm(p*4.+t*.04)-.55));
    vec3 c=cosmos(uv,t,vec3(.25,.14,.45))*.5;
    c+=vec3(.34,.23,.9)*shell*.56;
    c+=vec3(.36,.8,.89)*shell2*.4;
    c+=vec3(.17,.19,.3)*lattice*.55;
    c+=vec3(.34,.13,.43)*speckle*.17;
    float bloom=exp(-4.*abs(r-limb));
    c+=vec3(.35,.16,.57)*bloom*.22;
    float center=.012/(r*r+.025);
    c+=vec3(.28,.48,.72)*center*(.7+.3*sin(t*.4));
    float photon=exp(-pow((r-.15)/.015,2.));
    c+=vec3(1.2,.85,1.3)*photon*.19;
    float spokes=pow(max(0.,sin(a*17.+.5*sin(t*.18))),40.);
    c+=vec3(.32,.19,.57)*spokes*exp(-r*1.5)*.2;
    return c;
}
void main(){
    vec2 fc=gl_FragCoord.xy;
    vec2 uv=(fc-.5*u_resolution)/min(u_resolution.x,u_resolution.y);
    uv*=1.62;
    float t=u_time;
    float s=u_scene;
    vec3 color=vec3(0.);
    if(s<.5)color=sceneOrigin(uv,t);
    else if(s<1.5)color=sceneFold(uv,t);
    else if(s<2.5)color=sceneMemory(uv,t);
    else if(s<3.5)color=sceneRecursive(uv,t);
    else if(s<4.5)color=sceneHorizon(uv,t);
    else color=sceneWitness(uv,t);
    float distort=u_rupture;
    if(distort>.001){
      float band=sin(uv.y*72.+t*44.)*sin(t*63.);
      vec2 shift=vec2(band*.038*distort,0.);
      if(s<.5){color+=sceneOrigin(uv+shift,t+distort*.3)*distort*.22;}
      else if(s<1.5){color+=sceneFold(uv+shift,t)*distort*.23;}
      else if(s<2.5){color+=sceneMemory(uv+shift,t)*distort*.23;}
      else if(s<3.5){color+=sceneRecursive(uv+shift,t)*distort*.23;}
      else if(s<4.5){color+=sceneHorizon(uv+shift,t)*distort*.23;}
      else{color+=sceneWitness(uv+shift,t)*distort*.23;}
      color+=vec3(.13,.035,.22)*max(0.,band)*distort;
    }
    float vignette=1.-smoothstep(.3,1.7,length(uv))*.58;
    color*=vignette;
    color*=.92+u_energy*.09;
    color=tonemap(max(vec3(0.),color));
    color=pow(color,vec3(.89));
    fragColor=vec4(color,1.);
}`;

class UniverseRenderer {
  constructor(canvas) {
    this.canvas=canvas;this.gl=null;this.fallback=null;this.started=false;
    this.scene=0;this.time=0;this.seed=.43;this.rupture=0;this.energy=0;
    this.mouse=[0,0];this.targetMouse=[0,0];this.drag=[0,0];this.targetDrag=[0,0];this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.last=0;this.frames=0;this.frameTime=0;this.scale=(window.innerWidth<720?.75:.74);this.pixelRatio=1;
    this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(this.gl){try{this.initGL();this.canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();console.warn('WebGL context lost; switching to Canvas 2D fallback.');this.useFallback();});}catch(e){console.warn('WebGL initialization failed:',e);this.useFallback();}}
    if(!this.gl&&!this.fallback)this.useFallback();
    this.resize();window.addEventListener('resize',()=>this.resize(),{passive:true});
    document.addEventListener('visibilitychange',()=>{this.last=0;});
  }
  useFallback(){
    // Once a canvas has acquired WebGL, browsers cannot switch it to Canvas 2D.
    // Replace the element instead, so shader errors never leave a blank screen.
    this.gl=null;
    const replacement=document.createElement('canvas');
    replacement.id=this.canvas.id;
    replacement.setAttribute('aria-hidden','true');
    this.canvas.replaceWith(replacement);
    this.canvas=replacement;
    this.fallback=replacement.getContext('2d');
    document.body.classList.add('no-webgl');
    if(this.started)this.resize();
  }
  compile(type,src){const gl=this.gl,sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){let log=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(log)}return sh;}
  initGL(){const gl=this.gl;const vs=this.compile(gl.VERTEX_SHADER,VERT),fs=this.compile(gl.FRAGMENT_SHADER,FRAG);const prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);gl.deleteShader(vs);gl.deleteShader(fs);this.program=prog;const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let loc=gl.getAttribLocation(prog,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);this.uniforms={};for(const key of ['resolution','mouse','drag','time','scene','seed','rupture','energy','reduced'])this.uniforms[key]=gl.getUniformLocation(prog,'u_'+key);}
  resize(){const base=Math.min(window.devicePixelRatio||1,1.5);this.pixelRatio=base;let w=Math.max(1,Math.round(innerWidth*base*this.scale));let h=Math.max(1,Math.round(innerHeight*base*this.scale));const maxPixels=innerWidth<720?330000:1050000;if(w*h>maxPixels){const f=Math.sqrt(maxPixels/(w*h));w=Math.max(1,Math.round(w*f));h=Math.max(1,Math.round(h*f));}this.canvas.width=w;this.canvas.height=h;if(this.gl)this.gl.viewport(0,0,w,h);}
  setMouse(x,y){this.targetMouse[0]=x*2-1;this.targetMouse[1]=1-y*2;}
  addDrag(dx,dy){this.targetDrag[0]+=dx*.004;this.targetDrag[1]=Math.max(-1.9,Math.min(1.9,this.targetDrag[1]+dy*.004));}
  setScene(n){this.scene=n;this.rupture=.3;}
  setSeed(seed){this.seed=seed;this.rupture=1;}
  burst(){this.rupture=1.45;this.energy=2;}
  start(){if(this.started)return;this.started=true;requestAnimationFrame(now=>this.loop(now));}
  loop(now){if(!this.started)return;const dt=Math.min(.06,(now-(this.last||now))/1000);this.last=now;
    this.time+=dt*(this.reduced?.15:1.);
    for(let i=0;i<2;i++){this.mouse[i]+=(this.targetMouse[i]-this.mouse[i])*.045;this.drag[i]+=(this.targetDrag[i]-this.drag[i])*.04;}
    this.rupture=Math.max(0,this.rupture-dt*1.75);this.energy=Math.max(0,this.energy-dt*.7);
    if(this.gl){const gl=this.gl,un=this.uniforms;gl.useProgram(this.program);gl.uniform2f(un.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(un.mouse,...this.mouse);gl.uniform2f(un.drag,...this.drag);gl.uniform1f(un.time,this.time);gl.uniform1f(un.scene,this.scene);gl.uniform1f(un.seed,this.seed);gl.uniform1f(un.rupture,this.rupture);gl.uniform1f(un.energy,this.energy);gl.uniform1f(un.reduced,this.reduced?1:0);gl.drawArrays(gl.TRIANGLES,0,6);}
    else this.drawFallback();
    this.frames++;this.frameTime+=dt;
    if(this.frameTime>3.2){const fps=this.frames/this.frameTime;
      if(fps<25&&this.scale>.50){this.scale=Math.max(.5,this.scale-.1);this.resize();}
      else if(fps>49&&this.scale<.88){this.scale=Math.min(.88,this.scale+.05);this.resize();}
      this.frames=0;this.frameTime=0;
    }
    requestAnimationFrame(n=>this.loop(n));
  }
  drawFallback(){const c=this.fallback;if(!c)return;const w=this.canvas.width,h=this.canvas.height,t=this.time;smoothBackground(c,w,h,t,this.scene,this.seed,this.mouse);}
  capture(){return this.canvas.toDataURL('image/png');}
}
function smoothBackground(c,w,h,t,scene,seed,mouse){const palettes=[['#090918','#ab72d4','#283979'],['#060c25','#8669d0','#213b9a'],['#02141b','#39b1ba','#3b368e'],['#210b19','#da733e','#762378'],['#130908','#e68b36','#883a4e'],['#09081e','#8d69e9','#255b7a']];const col=palettes[scene],cx=w*(.5+mouse[0]*.08),cy=h*(.5-mouse[1]*.08);c.fillStyle=col[0];c.fillRect(0,0,w,h);const g=c.createRadialGradient(cx,cy,10,cx,cy,w*.55);g.addColorStop(0,col[1]);g.addColorStop(.25,col[2]);g.addColorStop(1,col[0]);c.globalAlpha=.8;c.fillStyle=g;c.fillRect(0,0,w,h);c.globalAlpha=1;for(let i=0;i<9;i++){c.save();c.translate(cx,cy);c.rotate(t*.06+i*.43);c.strokeStyle=col[1];c.lineWidth=Math.max(1,w*.0007);c.globalAlpha=.15+Math.sin(t+i)*.07;c.beginPath();c.ellipse(0,0,w*(.11+i*.012),h*(.14+i*.015),i*.15,0,Math.PI*2);c.stroke();c.restore();}c.globalAlpha=1;}
window.UniverseRenderer=UniverseRenderer;
})();
