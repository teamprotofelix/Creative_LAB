const PENTA = [0, 3, 5, 7, 10];

class Sound {
  constructor() {
    this.ready = false;
    this.on = false;
    this.lastNote = 0;
  }

  async start() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._ir(3.0, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.reverb.connect(wet);
    wet.connect(this.master);

    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.master);
    this.bus.connect(this.reverb);

    // 드론
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.055;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 2;
    droneGain.connect(lp);
    lp.connect(this.bus);

    [55, 82.41, 110, 164.81].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 7;
      o.connect(droneGain);
      o.start();
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();

    this.ready = true;
    this.on = true;
    this.master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5);
  }

  _ir(dur, decay) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  noteFor(hue) {
    const idx = Math.floor((((hue % 360) + 360) % 360) / 360 * 15);
    const oct = Math.min(2, Math.floor(idx / 5));
    const semi = PENTA[idx % 5] + oct * 12;
    return 220 * Math.pow(2, semi / 12);
  }

  note(freq, gain = 0.07, dur = 1.7) {
    if (!this.on || !this.ready) return;
    const now = performance.now();
    if (now - this.lastNote < 55) return;
    this.lastNote = now;

    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 12;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  toggle() {
    if (!this.ready) return;
    this.on = !this.on;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.on ? 0.5 : 0.0001, t, 0.25);
  }
}