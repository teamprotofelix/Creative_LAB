/* BEYOND visual engine — original, dependency-free canvas artwork. */
(()=>{'use strict';
 const TAU=Math.PI*2;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const heroCanvas=document.getElementById('sculptureCanvas');
 const heroZone=document.getElementById('sculptureZone');
 const starsCanvas=document.getElementById('starCanvas');
 const starStage=document.getElementById('starStage');
 if(!heroCanvas||!heroZone||!starsCanvas||!starStage)return;
 const hctx=heroCanvas.getContext('2d',{alpha:true});
 const sctx=starsCanvas.getContext('2d',{alpha:true});
 if(!hctx||!sctx)return;
 let hw=0,hh=0,sw=0,sh=0,dpr=1,frame=0,t=0,last=0;
 let ptr={x:0,y:0,targetX:0,targetY:0,down:false};
 let palette=0,shock=0,starPoints=[],heroDust=[],fragments=[];
 let selected=[];
 let heroVisible=true,starVisible=false;
 const schemes=[[79,255,189],[250,76,187],[25,78,280],[191,292,84],[258,78,33]];
 const rand=(i)=>{let x=Math.sin(i*127.1+78.233)*43758.5453123;return x-Math.floor(x)};
 const d2r=x=>x*Math.PI/180;
 function sizeCanvas(canvas,ctx){let r=canvas.getBoundingClientRect();let w=Math.max(1,r.width),h=Math.max(1,r.height);let ratio=Math.min(window.devicePixelRatio||1,1.75);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);return {w,h,ratio};}
 function resize(){let a=sizeCanvas(heroCanvas,hctx),b=sizeCanvas(starsCanvas,sctx);hw=a.w;hh=a.h;sw=b.w;sh=b.h;dpr=a.ratio;heroDust=Array.from({length:130},(_,i)=>({x:rand(i+23)*hw,y:rand(i+100)*hh,r:.4+rand(i+900)*1.3,a:.14+rand(i+67)*.51,phase:rand(i+48)*TAU}));starPoints=Array.from({length:145},(_,i)=>({x:rand(i+800)*sw,y:rand(i+450)*sh,r:.35+rand(i+600)*1.2,a:.1+rand(i+700)*.44,phase:rand(i+610)*TAU}));}
 const vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const vmul=(a,n)=>[a[0]*n,a[1]*n,a[2]*n];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>{let l=Math.hypot(...a)||1;return a.map(x=>x/l)};
 function rotate(v,ax,ay,az){let [x,y,z]=v,c=Math.cos(ax),s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(az);s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];return[x,y,z];}
 function project(v){let m=4.6/(5-v[2]);let scale=Math.min(hw*.52,hh*.40);return{x:hw*.52+v[0]*scale*m,y:hh*.5+v[1]*scale*m,z:v[2],m};}
 function knot(tt,phase,seconds,idx){const a=tt*2,b=tt*3+phase+Math.sin(seconds*.42)*.075;
  const w=.45+Math.sin(seconds*.9+idx*2)*.025+shock*.035;
  const rad=1.26+w*Math.cos(b),radp=-w*3*Math.sin(b);
  const pos=[rad*Math.cos(a),rad*Math.sin(a),.55*Math.sin(b)];
  const tan=[radp*Math.cos(a)-rad*2*Math.sin(a),radp*Math.sin(a)+rad*2*Math.cos(a),1.65*Math.cos(b)];
  let n=norm([Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)]);
  let side=norm(cross(norm(tan),n));
  return{pos,tan: norm(tan),side,n};
 }
 function makeRibbons(sec){const ax=.48+ptr.y*.56+Math.sin(sec*.21)*.13,ay=.23+ptr.x*.8+sec*.12,az=.06+Math.sin(sec*.12)*.16;
   const mesh=[];let sketch=[];
   for(let strand=0;strand<3;strand++){
    const ph=strand*TAU/3+.05,steps=220,width=.085+shock*.036;
    let pts=[];
    for(let j=0;j<=steps;j++){
     const u=j/steps*TAU,k=knot(u,ph,sec,strand);
     const offset=vmul(k.side,width*(1+.18*Math.sin(u*7-sec*.8)));
     const mid=rotate(k.pos,ax,ay,az);
     const left=rotate(vadd(k.pos,offset),ax,ay,az),right=rotate(vadd(k.pos,vmul(offset,-1)),ax,ay,az);
     const side=rotate(k.side,ax,ay,az),n=rotate(k.n,ax,ay,az);
     pts.push({mid:project(mid),l:project(left),r:project(right),n,side,depth:mid[2]});
    }
    for(let j=0;j<steps;j++)mesh.push({a:pts[j],b:pts[j+1],depth:(pts[j].depth+pts[j+1].depth)/2,strand,j});
    sketch.push({pts,strand});
   }
   mesh.sort((a,b)=>a.depth-b.depth);
   return{mesh,sketch};
 }
 function gradientAura(){const g=hctx.createRadialGradient(hw*.52,hh*.52,18,hw*.52,hh*.52,Math.min(hw,hh)*.52);g.addColorStop(0,`hsla(${schemes[palette][0]},90%,45%,${.05+shock*.09})`);g.addColorStop(.3,'rgba(82,90,158,.026)');g.addColorStop(1,'rgba(0,0,0,0)');hctx.fillStyle=g;hctx.fillRect(0,0,hw,hh);}
 function renderHero(sec){hctx.clearRect(0,0,hw,hh);gradientAura();
   const cx=hw*.52,cy=hh*.5,R=Math.min(hw*.4,hh*.36);hctx.save();
   hctx.translate(cx,cy);hctx.rotate(sec*.01);
   [1.25,1.02,.7].forEach((r,i)=>{hctx.strokeStyle=`rgba(161,176,162,${.045-i*.01})`;hctx.lineWidth=1;hctx.setLineDash([4+i*2,13+i*3]);hctx.beginPath();hctx.ellipse(0,0,R*r,R*r*.87,-.43,0,TAU);hctx.stroke();});hctx.setLineDash([]);hctx.restore();
   for(let i=0;i<heroDust.length;i++){let p=heroDust[i],f=Math.sin(sec*.4+p.phase)*.18+.82;hctx.fillStyle=`rgba(209,230,226,${p.a*f})`;hctx.beginPath();hctx.arc(p.x+Math.sin(sec*.16+p.phase)*7,p.y+Math.cos(sec*.13+p.phase)*7,p.r,0,TAU);hctx.fill();}
   const {mesh,sketch}=makeRibbons(sec);
   for(const m of mesh){const {a,b,strand,j}=m;let brightness=clamp(.42+(.5*a.n[2])+.27*Math.max(0,a.side[0]*.65-a.side[1]*.3+a.side[2]*.8),.13,.98);const hue=schemes[palette][strand];let light=clamp(28+brightness*48,18,84);let sat=65+brightness*29;
     if(shock>.08 && rand(j+strand*400+Math.floor(sec*10))<shock*.12)light=Math.min(90,light+26);
     hctx.fillStyle=`hsla(${hue},${sat}%,${light}%,.91)`;
     hctx.beginPath();hctx.moveTo(a.l.x,a.l.y);hctx.lineTo(b.l.x,b.l.y);hctx.lineTo(b.r.x,b.r.y);hctx.lineTo(a.r.x,a.r.y);hctx.closePath();hctx.fill();
     if(j%5===0){hctx.strokeStyle=`rgba(245,255,242,${brightness*.13})`;hctx.lineWidth=.75;hctx.beginPath();hctx.moveTo(a.l.x,a.l.y);hctx.lineTo(b.l.x,b.l.y);hctx.stroke();}
   }
   hctx.save();hctx.globalCompositeOperation='screen';
   sketch.forEach(({pts,strand})=>{let hue=schemes[palette][strand];hctx.lineJoin='round';hctx.lineCap='round';hctx.shadowColor=`hsl(${hue},100%,65%)`;hctx.shadowBlur=23+shock*32;hctx.strokeStyle=`hsla(${hue},100%,80%,.36)`;hctx.lineWidth=2.2;hctx.beginPath();pts.forEach((p,i)=>i?hctx.lineTo(p.mid.x,p.mid.y):hctx.moveTo(p.mid.x,p.mid.y));hctx.stroke();hctx.shadowBlur=0;hctx.strokeStyle='rgba(255,255,244,.37)';hctx.lineWidth=.75;hctx.stroke();});
   hctx.restore();
   if(shock>.02){hctx.save();hctx.globalCompositeOperation='screen';for(const p of fragments){p.x+=p.vx;p.y+=p.vy;p.vx*=.989;p.vy*=.989;p.life-=.008;hctx.fillStyle=`hsla(${p.h},100%,76%,${Math.max(0,p.life)})`;hctx.fillRect(p.x,p.y,p.size,p.size);}fragments=fragments.filter(p=>p.life>0);hctx.restore();}
   hctx.save();hctx.strokeStyle=`rgba(214,255,120,${.13+shock*.35})`;hctx.lineWidth=1;let rad=R*(.78+shock*.3);hctx.beginPath();hctx.arc(cx,cy,rad,.1,1.03);hctx.stroke();hctx.beginPath();hctx.arc(cx,cy,rad,3.25,3.78);hctx.stroke();hctx.restore();
 }
 function getNodes(){return[...document.querySelectorAll('.star-node')].map(el=>{let a=el.getBoundingClientRect(),b=starStage.getBoundingClientRect();return{id:el.dataset.node,x:a.left+a.width/2-b.left,y:a.top+a.height/2-b.top}});}
 function renderStars(sec){sctx.clearRect(0,0,sw,sh);for(let p of starPoints){sctx.fillStyle=`rgba(193,205,243,${p.a*(.75+.25*Math.sin(sec*.3+p.phase))})`;sctx.beginPath();sctx.arc(p.x,p.y,p.r,0,TAU);sctx.fill();}
  let nodes=getNodes();if(!nodes.length)return;
  for(let i=0;i<nodes.length;i++){let n=nodes[i],near=nodes.filter(p=>p!==n).map(p=>({p,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d).slice(0,2);for(let item of near){let k=nodes.indexOf(item.p);if(k<i)continue;sctx.strokeStyle='rgba(154,170,214,.11)';sctx.lineWidth=.7;sctx.beginPath();sctx.moveTo(n.x,n.y);sctx.lineTo(item.p.x,item.p.y);sctx.stroke();}}
  if(selected.length===2){let a=nodes.find(n=>n.id===selected[0]),b=nodes.find(n=>n.id===selected[1]);if(a&&b){sctx.save();sctx.shadowBlur=17;sctx.shadowColor='#d4ff68';sctx.strokeStyle='#d4ff68';sctx.lineWidth=1.7;sctx.beginPath();sctx.moveTo(a.x,a.y);sctx.lineTo(b.x,b.y);sctx.stroke();sctx.shadowBlur=0;const tt=((sec*.25)%1);sctx.fillStyle='#f4ffe0';sctx.beginPath();sctx.arc(a.x+(b.x-a.x)*tt,a.y+(b.y-a.y)*tt,4,0,TAU);sctx.fill();sctx.restore();}}
  else if(selected.length===1){let a=nodes.find(n=>n.id===selected[0]);if(a){sctx.strokeStyle='rgba(214,255,104,.34)';sctx.lineWidth=1;sctx.beginPath();sctx.arc(a.x,a.y,38+Math.sin(sec*2)*4,0,TAU);sctx.stroke();}}
 }
 function loop(ms){const seconds=Math.min(ms/1000,1e8);const delta=Math.min(.05,(ms-last)/1000||.016);last=ms;if(!document.hidden){t+=reduced.matches?0:delta;ptr.x+=(ptr.targetX-ptr.x)*.055;ptr.y+=(ptr.targetY-ptr.y)*.055;shock*=.957;if(heroVisible)renderHero(t);if(starVisible)renderStars(t);}requestAnimationFrame(loop);}
 function burst(){shock=1;const sx=hw*.52,sy=hh*.5;fragments=Array.from({length:70},(_,i)=>{let a=rand(i+230)*TAU,r=1+rand(i+20)*8,speed=1.5+rand(i+80)*8;return{x:sx+Math.cos(a)*r,y:sy+Math.sin(a)*r,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.7+rand(i+790)*.3,size:1+rand(i+940)*2.5,h:schemes[palette][i%3]};});}
 function bindPointer(){heroZone.addEventListener('pointermove',e=>{let r=heroZone.getBoundingClientRect();ptr.targetX=clamp((e.clientX-r.left)/r.width*2-1,-1,1);ptr.targetY=clamp((e.clientY-r.top)/r.height*2-1,-1,1);if(ptr.down)shock=Math.max(shock,.12);document.getElementById('coordX').textContent=ptr.targetX.toFixed(2);document.getElementById('coordY').textContent=ptr.targetY.toFixed(2);},{passive:true});heroZone.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;ptr.down=true;heroZone.classList.add('dragging');try{heroZone.setPointerCapture(e.pointerId)}catch{}});heroZone.addEventListener('pointerup',()=>{ptr.down=false;heroZone.classList.remove('dragging')});heroZone.addEventListener('pointercancel',()=>{ptr.down=false;heroZone.classList.remove('dragging')});heroZone.addEventListener('pointerleave',()=>{if(!ptr.down){ptr.targetX*=.5;ptr.targetY*=.5}});}
 function watch(){if(!('IntersectionObserver'in window))return;const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.target===heroZone)heroVisible=entry.isIntersecting;else starVisible=entry.isIntersecting}),{rootMargin:'150px'});io.observe(heroZone);io.observe(starStage);}
 let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(resize,120)},{passive:true});
 resize();bindPointer();watch();requestAnimationFrame(loop);
 window.BeyondVisual={burst,setPalette(index){palette=clamp(index,0,schemes.length-1);burst()},setPair(arr){selected=arr.slice(0,2)}};
})();
