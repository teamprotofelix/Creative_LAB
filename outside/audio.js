/* Calm procedural soundscape. No audio files and no network calls. */
(function(){'use strict';
class Soundscape{
 constructor(){this.ctx=null;this.on=false;this.voices=[];this.master=null;this.filter=null;this.notes=[55,73.416,82.407];this.scene=0;this.t=0;}
 async enable(){if(this.on)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
   if(!this.ctx){this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=450;this.filter.Q.value=.4;this.filter.connect(this.master);this.master.connect(this.ctx.destination);
     for(let i=0;i<3;i++){const osc=this.ctx.createOscillator(),v=this.ctx.createGain();osc.type=i===0?'sine':i===1?'triangle':'sine';osc.frequency.value=this.notes[i];v.gain.value=[.24,.07,.14][i];osc.connect(v);v.connect(this.filter);osc.start();this.voices.push({osc,gain:v});}
     const lfo=this.ctx.createOscillator(),gain=this.ctx.createGain();lfo.frequency.value=.11;gain.gain.value=130;lfo.connect(gain);gain.connect(this.filter.frequency);lfo.start();
   }
   try{await this.ctx.resume();}catch(e){return false;}
   this.on=true;this.master.gain.setTargetAtTime(.13,this.ctx.currentTime,.7);this.setScene(this.scene);return true;
 }
 disable(){if(!this.on||!this.ctx)return;this.on=false;this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.2);}
 async toggle(){if(this.on){this.disable();return false;}return await this.enable();}
 setScene(i){this.scene=i;if(!this.ctx)return;const bases=[55,65.406,48.999,69.296,43.654,61.735],base=bases[i];const ratios=[1,1.3333,1.4983];this.voices.forEach((v,n)=>v.osc.frequency.setTargetAtTime(base*ratios[n],this.ctx.currentTime,1.4));this.filter.frequency.setTargetAtTime([510,680,900,740,420,1080][i],this.ctx.currentTime,.8);}
 burst(){if(!this.on||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(180,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(42,this.ctx.currentTime+.65);g.gain.setValueAtTime(.09,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.75);o.connect(g);g.connect(this.master);o.start();o.stop(this.ctx.currentTime+.8);}
}
window.Soundscape=Soundscape;
})();
