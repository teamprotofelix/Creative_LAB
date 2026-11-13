/* UNWRITTEN // Entirely self-contained real-time generative graphics engine.
   No CDNs, tracking, external requests or image downloads. */
(() => {
  'use strict';
  const VERTEX = `
    attribute vec2 a_position;
    void main(){ gl_Position=vec4(a_position,0.0,1.0); }
  `;
  const FRAGMENT = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_seed;
    uniform float u_from;
    uniform float u_to;
    uniform float u_blend;
    uniform float u_zoom;
    uniform float u_pulse;
    #define PI 3.14159265359
    float sat(float x){return clamp(x,0.0,1.0);}
    float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float hash11(float n){return fract(sin(n*123.683)*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.0),f.x),f.y);}
    float fbm(vec2 p){float v=0.0,a=.5;mat2 m=mat2(1.63,1.15,-1.15,1.63);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+7.14;a*=.52;}return v;}
    mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
    vec3 gradient(float t,vec3 a,vec3 b,vec3 c){return mix(mix(a,b,sat(t*1.8)),c,sat((t-.48)*1.9));}
    float starfield(vec2 uv,float density){
      vec2 grid=vec2(90.0,56.0)*density;
      vec2 id=floor(uv*grid),f=fract(uv*grid);
      float r=hash21(id+floor(u_seed*.13));
      vec2 pos=vec2(hash21(id+2.7),hash21(id+7.4));
      float d=length((f-pos)*vec2(1.,1.));
      float s=(1.0-smoothstep(.012,.17,d))*step(.971,r);
      s*=.5+.5*sin(u_time*(.5+r*2.0)+r*40.0);
      return s*(.3+1.5*pow(r,20.));
    }
    vec3 threshold(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=(uv-vec2(.626,.505))*vec2(asp,1.);
      p+= (u_mouse-vec2(.5))*.025;
      float r=length(p),a=atan(p.y,p.x);
      vec2 warp=rot(1.1/(r+.32)+u_time*.045)*p;
      float n=fbm(warp*2.7+vec2(u_seed*.003,u_time*.025));
      float n2=fbm(warp*5.3-vec2(u_time*.04,u_seed*.002));
      float clouds=pow(sat(n*.85+n2*.54-.26),2.8);
      vec3 col=mix(vec3(.002,.004,.016),vec3(.029,.018,.072),sat(uv.y*.7+clouds));
      col+=clouds*vec3(.15,.12,.42)*(.45+1.2*n2);
      col+=vec3(.07,.16,.32)*pow(sat(fbm(p*4.0+10.0)-.29),2.5)*.8;
      float jet=exp(-abs(p.y+sin(p.x*4.0+u_time*.23)*.023)*38.0)*exp(-abs(p.x)*2.2);
      col+=jet*vec3(.09,.19,.32)*.18;
      float ringR=.252+.021*sin(a*5.0+u_time*.44)+.008*sin(a*13.0-u_time*.27);
      float ring=exp(-abs(r-ringR)*27.0);
      float thin=exp(-abs(r-(.229+.008*sin(a*7.0+u_time)))*98.0);
      float arcs=.52+.48*sin(a*10.0+u_time*.65+fbm(p*10.0)*3.0);
      float ringLight=(ring*.8+thin*.95)*( .45+.6*arcs);
      vec3 hue=mix(vec3(.17,.52,1.0),vec3(1.,.54,.90),sat(sin(a*1.5+u_seed*.004)*.5+.5));
      col+=hue*ringLight*.95;
      col+=vec3(.3,.18,.66)*exp(-r*6.0)*.48;
      float disc=(1.0-smoothstep(.135,.174,r));
      col=mix(col,vec3(.002,.003,.012),disc*.97);
      float lens=exp(-abs(r-.173)*70.0)*.38;
      col+=lens*vec3(.45,.78,1.0);
      col+=starfield(uv,1.0)*vec3(.5,.68,1.0)*(.78-smoothstep(.12,.35,r)*.15);
      col+=vec3(.19,.38,.82)*u_pulse*exp(-abs(r-(.2+u_pulse*.2))*36.0)*.4;
      return col;
    }
    float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;float h=sat(dot(p-a,v)/dot(v,v));return length(p-(a+h*v));}
    vec3 garden(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=(uv-vec2(.5))*vec2(asp,1.);
      vec3 col=mix(vec3(.003,.017,.029),vec3(.006,.055,.061),sat(1.0-uv.y));
      float mist=fbm(p*2.1+vec2(u_time*.014,u_seed*.001));
      col+=vec3(.015,.15,.13)*pow(mist,3.0)*1.1;
      float ground=(1.0-smoothstep(0.0,.48,abs(uv.y-.05)));
      col+=ground*vec3(.013,.055,.04)*.3;
      for(int i=0;i<9;i++){
        float j=float(i),r1=hash11(j*4.73+u_seed*.015),r2=hash11(j*8.24+u_seed*.014);
        vec2 center=vec2((.31+r1*.59-.5)*asp,.22+r2*.57+sin(u_time*.31+j*2.0)*.012);
        float sz=.060+.063*hash11(j*3.41+2.0);
        vec2 b=p-center;
        float rr=length(b),an=atan(b.y,b.x),petals=5.0+floor(hash11(j+31.0)*4.0);
        float petalR=sz*(.65+.32*cos(an*petals+sin(u_time*.28+j)*.18));
        float fringe=exp(-abs(rr-petalR)*115.0)*(.6+.4*cos(an*petals*2.0));
        float fill=(1.0-smoothstep(petalR-.015,petalR+.021,rr));
        float glow=exp(-rr/(sz*.85));
        vec3 flower=mix(vec3(.05,.95,.68),vec3(.72,.42,1.0),r1);
        flower=mix(flower,vec3(1.0,.47,.72),r2*.55);
        col+=flower*(fill*.35+fringe*.58+glow*.15);
        col+=vec3(.90,1.0,.78)*exp(-rr*150.0)*.95;
        vec2 root=vec2(center.x+sin(j*3.3)*.045,-.56);
        float stem=segment(p,root,center);
        col+=vec3(.06,.39,.25)*(1.0-smoothstep(.002,.009,stem))*.6;
        vec2 leafPt=mix(root,center,.40);
        vec2 q=(p-leafPt)*rot(.55+j*.3);
        float leaf=length(q/vec2(.055,.013));
        col+=vec3(.045,.30,.17)*(1.0-smoothstep(.7,1.1,leaf))*.6;
      }
      float twinkle=starfield(uv,1.1);
      col+=twinkle*vec3(.34,1.0,.78)*.95;
      col+=vec3(.05,.28,.20)*exp(-length(p-vec2(.24,.0))*2.8)*.12;
      return col;
    }
    vec3 ocean(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=(uv-vec2(.5))*vec2(asp,1.);
      float t=u_time;
      float horizon=.48+.012*sin(p.x*1.4+t*.12);
      float depth=sat((horizon-uv.y)*2.8);
      vec3 col=mix(vec3(.001,.013,.037),vec3(.017,.074,.13),sat(uv.y*.85));
      col+=vec3(.008,.12,.16)*exp(-abs(uv.y-horizon)*16.0)*.29;
      float moon=exp(-length((uv-vec2(.648,.68))*vec2(asp,1.))*14.0);
      float disc=1.0-smoothstep(.067,.077,length((uv-vec2(.648,.68))*vec2(asp,1.)));
      col+=disc*vec3(.43,.84,1.0)*.67+moon*vec3(.07,.37,.45)*.4;
      vec2 v=p;
      float a=fbm(v*2.4+vec2(t*.045,u_seed*.003));
      float wave=sin(30.0*v.x+sin(v.y*9.0-t*.3)*2.0+8.0*a+t*.9);
      wave+=sin(37.0*v.y+8.0*sin(v.x*2.0+t*.22)+t*.7);
      wave+=sin(23.0*(v.x*.70+v.y*.9)+t*.7);
      float ripple=exp(-abs(wave)*2.1);
      float shimmer=pow(sat(.5+.5*cos(v.x*9.0+t*.35)),12.0);
      float water=(1.0-smoothstep(horizon-.03,horizon+.04,uv.y));
      vec3 sea=vec3(.004,.026,.065)+vec3(.008,.14,.22)*(a*.9+.12);
      sea+=vec3(.055,.54,.68)*ripple*(.2+depth*.6);
      sea+=vec3(.22,.77,1.0)*shimmer*exp(-abs(v.x-(.648-.5)*asp)*9.0)*.32;
      col=mix(col,sea,water);
      float circle=length((uv-u_mouse)*vec2(asp,1.));
      col+=vec3(.19,.72,.94)*exp(-abs(circle-(.10+.12*u_pulse))*68.0)*u_pulse*.65*water;
      col+=starfield(uv,1.0)*vec3(.7,.9,1.)*(1.0-water);
      return col;
    }
    vec3 cityLayer(vec2 uv,float density,float base,float maxH,float depth){
      float x=uv.x*density;
      float id=floor(x),f=fract(x);
      float rnd=hash11(id*11.23+floor(u_seed*.1)+depth*20.0);
      float h=maxH*(.26+.74*rnd);
      float top=base+h;
      float inset=.10+.12*hash11(id+9.0);
      float building=step(inset,f)*step(f,1.0-inset)*step(uv.y,top)*step(base,uv.y);
      float winX=fract(f*8.0),winY=fract((uv.y-base)*density*1.45);
      float win=step(.24,winX)*step(winX,.74)*step(.32,winY)*step(winY,.77);
      win*=step(.33,hash21(vec2(id,floor((uv.y-base)*density*1.45))+depth*3.0));
      vec3 dark=mix(vec3(.03,.022,.08),vec3(.085,.045,.14),depth);
      vec3 light=mix(vec3(.9,.26,.39),vec3(1.0,.73,.38),rnd);
      return building*(dark+win*light*(.4+depth*.6));
    }
    vec3 city(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=uv-vec2(.5);
      vec3 col=gradient(sat(uv.y*1.13),vec3(.027,.018,.075),vec3(.20,.065,.17),vec3(.48,.18,.20));
      float n=fbm(uv*vec2(4.0,2.3)+u_seed*.001);
      col+=vec3(.11,.04,.13)*n*n;
      vec2 sunp=(uv-vec2(.65,.48))*vec2(asp,1.);
      float d=length(sunp);
      col+=vec3(1.0,.22,.28)*exp(-d*5.4)*.8;
      float sun=1.0-smoothstep(.16,.164,d);
      float stripes=.5+.5*cos((uv.y-.48)*175.0);
      col+=sun*vec3(1.0,.39,.35)*(.60+.40*stripes);
      col+=starfield(uv,.72)*vec3(.9,.53,.8)*.45;
      col=mix(col,cityLayer(uv,32.0,.28,.23,.2),sat(cityLayer(uv,32.0,.28,.23,.2).r*11.0));
      vec3 c2=cityLayer(uv,21.0,.22,.37,.55);
      col=mix(col,c2,sat(c2.r*18.0));
      vec3 c3=cityLayer(uv,12.0,.09,.48,.96);
      col=mix(col,c3,sat(c3.r*18.0));
      float floorMask=1.0-smoothstep(.03,.20,uv.y);
      float road=pow(sat(cos((uv.x-.5)*42.0/(uv.y+.13))),18.0);
      col+=floorMask*road*vec3(.85,.13,.56)*.45;
      col+=vec3(.25,.016,.13)*exp(-abs(uv.y-.2)*20.0)*.08;
      return col;
    }
    vec3 fractal(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=(uv-vec2(.625,.51))*vec2(asp,1.);
      float angle=.03*sin(u_time*.10);
      vec2 z=rot(angle)*p*2.95/max(u_zoom,.35);
      vec2 c=vec2(-.745+.058*sin(u_seed*.015+u_time*.022),.190+.07*cos(u_seed*.007));
      z+=vec2(.03,.0);
      float it=0.0,esc=0.0;
      for(int i=0;i<64;i++){
        z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
        if(dot(z,z)>70.0){esc=length(z);break;}
        it+=1.0;
      }
      float mu=it;
      if(esc>0.0){mu+=1.0-log2(max(log2(esc),.01));}
      float f=mu*.065+u_seed*.002;
      vec3 palette=.5+.5*cos(6.28318*(vec3(.0,.2,.43)+f*vec3(.93,1.0,1.05)));
      float edge=1.0-sat(it/63.0);
      vec3 col=palette*edge*(.10+.65*pow(sat(mu/24.0),.65));
      col+=vec3(.04,.02,.07)*(.2+sin(mu*.11)*.15);
      col+=pow(sat(mu/65.0),4.0)*vec3(.08,.22,.3);
      float waves=exp(-abs(sin(mu*.9))*8.0)*edge;
      col+=waves*vec3(.25,.25,.4)*.28;
      col+=starfield(uv,.55)*vec3(.38,.5,.8)*.08;
      return col;
    }
    vec3 aurora(vec2 uv){
      float asp=u_resolution.x/u_resolution.y;
      vec2 p=(uv-.5)*vec2(asp,1.);
      float t=u_time;
      vec3 col=mix(vec3(.006,.009,.036),vec3(.021,.031,.077),sat(uv.y));
      col+=starfield(uv,1.4)*vec3(.82,.94,1.0);
      float haze=fbm(p*2.3+vec2(t*.015,u_seed*.009));
      col+=vec3(.022,.065,.13)*pow(haze,2.0)*.5;
      for(int i=0;i<6;i++){
        float j=float(i);
        float offset=.35+j*.052;
        float ripple=sin(p.x*(2.8+j*.2)+t*(.18+j*.012)+j*.72)*.093;
        ripple+=sin(p.x*7.3-t*.21+j*.95)*.027;
        ripple+=fbm(vec2(p.x*2.2+j,t*.05))*.065;
        float path=uv.y-offset-ripple;
        float curtain=exp(-abs(path)*21.0)*(1.0-smoothstep(-.04,.75,p.x));
        float vertical=.4+.6*pow(sat(noise(vec2(p.x*15.0+j,t*.10))),1.5);
        vec3 hue=mix(vec3(.12,.86,.65),vec3(.59,.34,1.0),j/6.0);
        col+=hue*curtain*vertical*.51;
        col+=hue*exp(-abs(path)*5.0)*.045;
      }
      float planet=length((uv-vec2(.68,.72))*vec2(asp,1.));
      col+=vec3(.20,.35,.64)*exp(-planet*9.0)*.19;
      float ground=(1.0-smoothstep(0.0,.22,uv.y));
      col+=ground*vec3(.01,.07,.065)*.38;
      return col;
    }
    vec3 scene(vec2 uv,float index){
      if(index<.5) return threshold(uv);
      if(index<1.5) return garden(uv);
      if(index<2.5) return ocean(uv);
      if(index<3.5) return city(uv);
      if(index<4.5) return fractal(uv);
      return aurora(uv);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec3 col;
      if(u_blend>.999 || abs(u_from-u_to)<.5){
        col=scene(uv,u_to);
      }else{
        vec3 a=scene(uv,u_from);
        vec3 b=scene(uv,u_to);
        float d=length((uv-vec2(.60,.5))*vec2(u_resolution.x/u_resolution.y,1.));
        float wipe=smoothstep(-.10,.20,u_blend*1.40-d*.22);
        col=mix(a,b,wipe);
      }
      float vignette=1.0-.28*pow(length((uv-.5)*vec2(1.2,1.)),1.5);
      col*=vignette;
      col=pow(max(col,0.0),vec3(.85));
      gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
    }
  `;

  class UniverseEngine {
    constructor(canvas){
      this.canvas=canvas;this.gl=null;this.ready=false;this.program=null;
      this.from=0;this.to=0;this.blend=1;this.seed=172.8;this.time=0;this.mouse=[.5,.5];this.zoom=1;
      this.pulse=0;this._last=0;this._frame=0;this._quality=1;this._slowFrames=0;
      this.motionReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
      try{this.init();}catch(err){console.warn('[UNWRITTEN] WebGL unavailable. Using the Canvas 2D generative renderer.',err);this.initFallback();}
    }

    initFallback(){
      if(this.gl){const next=document.createElement('canvas');next.id=this.canvas.id;this.canvas.replaceWith(next);this.canvas=next;this.gl=null;}
      this.ctx=this.canvas.getContext('2d');this.fallback=true;this.ready=true;this.fractalKey=null;
      this.resize();
    }
    H(x){return (Math.sin(x*127.1+this.seed*.141)*43758.5453)%1 + ((Math.sin(x*127.1+this.seed*.141)*43758.5453)%1<0?1:0);}
    glow(x,y,r,c,alpha=1){const c2=this.ctx,gr=c2.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'transparent');c2.globalAlpha=alpha;c2.fillStyle=gr;c2.fillRect(x-r,y-r,r*2,r*2);c2.globalAlpha=1;}
    stars(w,h,n=180){const c=this.ctx;c.save();for(let i=0;i<n;i++){const x=this.H(i+1.14)*w,y=this.H(i*2.71+55.12)*h,r=.5+this.H(i*1.39+9.4)*1.5;let a=.2+.55*this.H(i+1.19);a*=.76+.24*Math.sin(this.time*(.8+i%3)+i);c.fillStyle=`rgba(209,234,255,${Math.max(.08,a)})`;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill();}c.restore();}
    base(w,h,top='#080a1b',bottom='#050612'){
      const c=this.ctx,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,w,h);
    }
    drawFallback(){
      const c=this.ctx,w=innerWidth,h=innerHeight,t=this.time,scene=this.to;
      c.clearRect(0,0,w,h);
      if(scene===0){
        this.base(w,h,'#0b1028','#020310');
        const x=w*.64+this.mouse[0]*10,y=h*.49,r=Math.min(w*.29,h*.32);
        this.glow(x,y,r*2.4,'rgba(84,54,191,.30)');
        this.glow(x-r*.5,y+r*.22,r*1.8,'rgba(40,77,201,.18)');
        this.stars(w,h,200);
        c.save();c.translate(x,y);c.rotate(-.22+t*.016);c.scale(1,.70);
        for(let i=0;i<6;i++){const rr=r*(.71+i*.055);c.beginPath();c.ellipse(0,0,rr,rr*.95,0,.2+i*.14,Math.PI*2-.4);c.lineWidth=5-i*.45;c.strokeStyle=['rgba(103,177,255,.10)','rgba(136,159,255,.24)','rgba(185,120,255,.36)','rgba(238,196,255,.56)','rgba(122,210,255,.72)','rgba(238,248,255,.32)'][i];c.shadowColor=i%2?'#ce97ff':'#82c8ff';c.shadowBlur=35;c.stroke();}
        c.restore();
        this.glow(x,y,r*1.06,'rgba(45,47,130,.50)');
        const core=c.createRadialGradient(x,y,3,x,y,r*.67);core.addColorStop(0,'#000009');core.addColorStop(.64,'#00000a');core.addColorStop(.86,'rgba(4,5,22,.95)');core.addColorStop(1,'rgba(10,12,44,0)');c.fillStyle=core;c.beginPath();c.arc(x,y,r*.67,0,6.2832);c.fill();
        c.beginPath();c.arc(x,y,r*.68,0,6.2832);c.strokeStyle='rgba(180,220,255,.25)';c.lineWidth=2;c.shadowBlur=28;c.shadowColor='#b7d9ff';c.stroke();c.shadowBlur=0;
      }else if(scene===1){
        this.base(w,h,'#031c24','#031510');this.glow(w*.65,h*.53,w*.5,'rgba(24,146,108,.24)');this.stars(w,h,110);
        for(let i=0;i<9;i++){const x=w*(.35+.56*this.H(i+34)),y=h*(.25+.42*this.H(i+42)),r=(28+72*this.H(i+21))*Math.min(1,w/1100);const hue=i%3===0?'#f39adf':i%3===1?'#69f4c3':'#9e9bff';c.strokeStyle='rgba(55,188,131,.38)';c.lineWidth=2;c.beginPath();c.moveTo(x,h+20);c.bezierCurveTo(x+35,y+70,x-16,y+40,x,y);c.stroke();this.glow(x,y,r*2,hue,.08);c.save();c.translate(x,y);c.rotate(t*.019+i);for(let j=0;j<7;j++){c.rotate(Math.PI*2/7);c.beginPath();c.ellipse(0,r*.42,r*.25,r*.6,0,0,6.2832);c.fillStyle=hue+'28';c.strokeStyle=hue+'9a';c.shadowColor=hue;c.shadowBlur=25;c.fill();c.lineWidth=1.2;c.stroke();}c.restore();this.glow(x,y,r*.34,'rgba(243,255,216,.85)');}
      }else if(scene===2){
        this.base(w,h,'#07132a','#03253a');const hor=h*.53;this.glow(w*.65,hor,w*.47,'rgba(18,108,155,.32)');this.stars(w,h*.55,120);
        this.glow(w*.67,h*.27,h*.25,'rgba(90,190,228,.17)');c.fillStyle='#9ad6ee';c.beginPath();c.arc(w*.67,h*.27,Math.min(48,w*.05),0,6.2832);c.fill();
        const g=c.createLinearGradient(0,hor,0,h);g.addColorStop(0,'#124560');g.addColorStop(1,'#041327');c.fillStyle=g;c.fillRect(0,hor,w,h-hor);
        for(let i=0;i<70;i++){const y=hor+(h-hor)*(i+1)/71;c.beginPath();for(let x=0;x<w+10;x+=8){const yy=y+Math.sin(x*.012+i*.36+t*.7)*(.8+i*.07)+Math.sin(x*.026-i*.18-t*.23)*1.7;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}const a=.03+(i/70)*.20;c.strokeStyle=`rgba(117,228,248,${a})`;c.lineWidth=.7+(i/70)*.6;c.stroke();}
      }else if(scene===3){
        this.base(w,h,'#130d31','#531c43');this.glow(w*.65,h*.53,w*.55,'rgba(237,78,105,.3)');this.stars(w,h*.4,50);
        const x=w*.68,y=h*.42,r=Math.min(w*.13,h*.18);this.glow(x,y,r*2.2,'rgba(255,136,122,.23)');c.fillStyle='#ef7e7d';c.beginPath();c.arc(x,y,r,0,6.2832);c.fill();
        for(let layer=0;layer<3;layer++){const count=[54,35,22][layer],base=h*[.72,.82,.92][layer],max=h*[.22,.37,.55][layer],bw=w/count;c.fillStyle=['#382443','#20192d','#080d20'][layer];for(let i=0;i<count;i++){const bh=max*(.15+.85*this.H(i*2+layer*45)),x=i*bw,y=base-bh;c.fillRect(x+1,y,bw*.82,bh+h*.14);for(let wy=y+14;wy<base-4;wy+=16){for(let wx=x+6;wx<x+bw*.76;wx+=11){if(this.H(wx*.12+wy*.14+layer)>.47){c.fillStyle=this.H(wx+wy)>.5?'rgba(255,176,117,.60)':'rgba(245,93,157,.51)';c.fillRect(wx,wy,2,4);c.fillStyle=['#382443','#20192d','#080d20'][layer];}}}}}
      }else if(scene===4){
        this.base(w,h,'#0b0d2a','#050616');const key=`${this.seed}_${this.zoom.toFixed(2)}_${Math.round(w/50)}_${Math.round(h/50)}`;
        if(this.fractalKey!==key){this.fractalKey=key;const cw=Math.min(520,Math.max(180,Math.round(w*.43))),ch=Math.min(360,Math.max(120,Math.round(h*.43)));const tiny=document.createElement('canvas');tiny.width=cw;tiny.height=ch;const tc=tiny.getContext('2d'),im=tc.createImageData(cw,ch),asp=w/h,ccx=-.745+.058*Math.sin(this.seed*.015+this.time*.022),ccy=.190+.07*Math.cos(this.seed*.007);for(let y=0;y<ch;y++){for(let x=0;x<cw;x++){let zx=(x/cw-.625)*asp*2.95/this.zoom+.03,zy=(y/ch-.51)*2.95/this.zoom,it=0;while(zx*zx+zy*zy<70&&it<84){const nx=zx*zx-zy*zy+ccx;zy=2*zx*zy+ccy;zx=nx;it++;}const j=(y*cw+x)*4;const t=it*.071+this.seed*.002;im.data[j]=Math.round(255*(.10+.53*(.5+.5*Math.cos(6.283*(t+.0))))*(it<84?1:.2));im.data[j+1]=Math.round(255*(.1+.53*(.5+.5*Math.cos(6.283*(t+.25))))*(it<84?1:.2));im.data[j+2]=Math.round(255*(.12+.55*(.5+.5*Math.cos(6.283*(t+.49)))));im.data[j+3]=255;}}tc.putImageData(im,0,0);this.fractalCanvas=tiny;}
        if(this.fractalCanvas){c.imageSmoothingEnabled=true;c.drawImage(this.fractalCanvas,0,0,w,h);}
        this.glow(w*.58,h*.47,w*.36,'rgba(57,28,145,.1)');
      }else{
        this.base(w,h,'#050c25','#071935');this.stars(w,h,230);this.glow(w*.7,h*.54,w*.45,'rgba(20,121,146,.19)');
        for(let i=0;i<9;i++){const grad=c.createLinearGradient(0,h*.2,0,h*.81);grad.addColorStop(0,'rgba(123,98,255,0)');grad.addColorStop(.48,i%2?'rgba(57,236,175,.14)':'rgba(183,114,245,.15)');grad.addColorStop(1,'rgba(22,199,186,0)');c.beginPath();const yy=h*(.32+i*.043);for(let x=0;x<w+15;x+=12){let y=yy+Math.sin(x/w*7.0+t*.32+i*.56)*h*.078+Math.sin(x/w*13+t*.18+i)*h*.018;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}for(let x=w;x>=0;x-=12){let y=yy+h*.19+Math.sin(x/w*7.0+t*.32+i*.56)*h*.087;c.lineTo(x,y);}c.closePath();c.fillStyle=grad;c.fill();}
      }
      c.globalAlpha=1;
    }

    init(){
      const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'default'});
      if(!gl)throw new Error('WebGL unavailable');
      this.gl=gl;
      const makeShader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(info);}return s;};
      const vs=makeShader(gl.VERTEX_SHADER,VERTEX),fs=makeShader(gl.FRAGMENT_SHADER,FRAGMENT);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      this.program=program;gl.useProgram(program);
      const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.uniforms={};
      for(const n of ['u_resolution','u_mouse','u_time','u_seed','u_from','u_to','u_blend','u_zoom','u_pulse'])this.uniforms[n]=gl.getUniformLocation(program,n);
      this._quality=(window.innerWidth<680)?.8:(window.innerWidth<1200?.85:1);
      this.resize();this.ready=true;
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
      this.canvas.addEventListener('webglcontextrestored',()=>{location.reload();});
    }
    resize(){
      if(this.fallback){const dpr=Math.min(window.devicePixelRatio||1,1.5);this.canvas.width=Math.round(innerWidth*dpr);this.canvas.height=Math.round(innerHeight*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.fractalKey=null;return;}
      if(!this.gl)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.5)*this._quality;
      const w=Math.max(1,Math.round(innerWidth*dpr)),h=Math.max(1,Math.round(innerHeight*dpr));
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}
    }
    setScene(idx){
      idx=Math.max(0,Math.min(5,idx));
      if(idx===this.to)return;
      this.from=this.to;this.to=idx;this.blend=0;
      this.zoom=1;this.pulse=1;
    }
    setSeed(seed){this.seed=seed%10000;this.pulse=1;}
    setMouse(x,y){this.mouse[0]=Math.max(0,Math.min(1,x));this.mouse[1]=Math.max(0,Math.min(1,1-y));}
    frame(now){
      if(!this.ready||document.hidden)return;
      const dt=this._last?Math.min((now-this._last)/1000,.08):.016;this._last=now;
      if(this.motionReduced){this.time+=dt*.10;}else this.time+=dt;
      this.blend=Math.min(1,this.blend+dt*1.14);
      this.pulse=Math.max(0,this.pulse-dt*.63);
      if(this.fallback){this.drawFallback();return;}
      const gl=this.gl,u=this.uniforms;
      gl.useProgram(this.program);
      gl.uniform2f(u.u_resolution,this.canvas.width,this.canvas.height);
      gl.uniform2f(u.u_mouse,this.mouse[0],this.mouse[1]);
      gl.uniform1f(u.u_time,this.time);gl.uniform1f(u.u_seed,this.seed);
      gl.uniform1f(u.u_from,this.from);gl.uniform1f(u.u_to,this.to);
      gl.uniform1f(u.u_blend,this.blend);gl.uniform1f(u.u_zoom,this.zoom);
      gl.uniform1f(u.u_pulse,this.pulse);
      gl.drawArrays(gl.TRIANGLES,0,6);
      this._frame++;
      if(this._frame%80===0){if(dt>.038&&this._quality>.65){this._slowFrames++;if(this._slowFrames>=3){this._quality=Math.max(.62,this._quality-.13);this.resize();this._slowFrames=0;}}else this._slowFrames=0;}
    }
  }
  window.UniverseEngine=UniverseEngine;
})();
