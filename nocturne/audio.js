/* NOCTURNE · 소리는 사용자 클릭 후에만 활성화됩니다. 외부 오디오 파일을 사용하지 않습니다. */
class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.scale = [261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25,783.99,880.00];
  }
  init() {
    if (this.ctx) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      for (const [i, frequency] of [55, 82.4069, 110].entries()) {
        const voice = this.ctx.createOscillator();
        voice.type = i === 1 ? 'triangle' : 'sine';
        voice.frequency.value = frequency;
        const gain = this.ctx.createGain();
        gain.gain.value = i === 1 ? 0.018 : 0.035;
        voice.connect(gain);
        gain.connect(this.master);
        voice.start();
      }
      return true;
    } catch (error) {
      console.warn('[NOCTURNE] Audio unavailable:', error);
      this.ctx = null; this.master = null; return false;
    }
  }
  async toggle() {
    if (!this.init()) return false;
    try {
      if (!this.enabled && this.ctx.state !== 'running') await this.ctx.resume();
      this.enabled = !this.enabled;
      const t = this.ctx.currentTime;
      const gain = this.master.gain;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(gain.value, t);
      gain.linearRampToValueAtTime(this.enabled ? 0.42 : 0, t + 0.55);
      return this.enabled;
    } catch (error) {
      console.warn('[NOCTURNE] Audio toggle failed:', error);
      this.enabled = false;
      return false;
    }
  }
  note(frequency, duration = 2, volume = 0.1, delay = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + duration + 0.03);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (error) {
      console.warn('[NOCTURNE] Tone unavailable:', error);
    }
  }
  bloom(seed) {
    const base = ((seed >>> 0) % 4);
    for (let i = 0; i < 4; i++) {
      const degree = [0, 2, 4, 7][i];
      this.note(this.scale[(degree + base) % this.scale.length], 1.8 + i * .25, .1, i * .12);
    }
  }
  idleMelody() {
    [0,4,2,5,4,2,7].forEach((index, i) => this.note(this.scale[index], 2.3, .07, i * .52));
  }
}
