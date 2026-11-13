// 작은 신경망 + 유전 알고리즘
const INPUTS  = 12;
const HIDDEN  = 10;
const OUTPUTS = 3;
const GENOME_SIZE =
  INPUTS * HIDDEN + HIDDEN + HIDDEN * OUTPUTS + OUTPUTS;

function randomGenome() {
  const g = new Float32Array(GENOME_SIZE);
  for (let i = 0; i < GENOME_SIZE; i++) g[i] = (Math.random() * 2 - 1) * 1.4;
  return g;
}

function mutate(g, rate = 0.09, strength = 0.45) {
  const c = new Float32Array(g);
  for (let i = 0; i < c.length; i++) {
    if (Math.random() < rate) {
      c[i] += (Math.random() * 2 - 1) * strength;
      if (c[i] >  4) c[i] =  4;
      if (c[i] < -4) c[i] = -4;
    }
  }
  return c;
}

function crossover(a, b) {
  const c = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) c[i] = Math.random() < 0.5 ? a[i] : b[i];
  return c;
}

const hiddenBuf = new Float32Array(HIDDEN);
const outBuf = [0, 0, 0];

function think(g, inputs) {
  let idx = 0;

  for (let h = 0; h < HIDDEN; h++) {
    let s = 0;
    for (let i = 0; i < INPUTS; i++) s += inputs[i] * g[idx++];
    s += g[INPUTS * HIDDEN + h];
    hiddenBuf[h] = Math.tanh(s);
  }

  const wOff = INPUTS * HIDDEN + HIDDEN;
  for (let o = 0; o < OUTPUTS; o++) {
    let s = 0;
    for (let h = 0; h < HIDDEN; h++) s += hiddenBuf[h] * g[wOff + o * HIDDEN + h];
    s += g[wOff + OUTPUTS * HIDDEN + o];
    outBuf[o] = Math.tanh(s);
  }
  return outBuf;
}

/** 유전자 → 색상(hue). 160(청록) ~ 340(분홍) */
function hueOf(g) {
  let s = 0;
  for (let i = 0; i < 24; i++) s += g[i];
  return 160 + (Math.tanh(s / 12) * 0.5 + 0.5) * 180;
}