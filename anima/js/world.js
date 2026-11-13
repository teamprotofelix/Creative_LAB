
const MAX_POP      = 170;
const MAX_FOOD     = 420;
const FOOD_RATE    = 15;     // 자연 발생 / 초
const FOOD_VALUE   = 40;
const FOOD_RADIUS  = 11;
const METABOLISM   = 5.0;
const MOVE_COST    = 3.6;
const MAX_SPEED    = 130;
const MAX_ENERGY   = 120;
const REPRO_ENERGY = 90;
const REPRO_COST   = 44;
const MIN_AGE      = 4.0;
const SENSE_FOOD   = 300;

class World {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.in = new Float32Array(INPUTS_LEN);
    this.newborns = [];
    this.onEvent = null;
    this.reset();
  }

  reset() {
    this.creatures = [];
    this.food = [];
    this.sparks = [];
    this.newborns = [];
    this.pointer = { x: this.w * 0.5, y: this.h * 0.5, active: false, feeding: false };
    this.time = 0;
    this.foodAccum = 0;
    this.births = 0;
    this.deaths = 0;
    this.maxGen = 0;
    this.history = [];
    this.histAccum = 0;

    const cx = this.w * 0.5, cy = this.h * 0.5;
    const r0 = Math.min(this.w, this.h) * 0.22;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r = r0 * (0.25 + Math.random() * 0.95);
      this.creatures.push(
        this.makeCreature(cx + Math.cos(a) * r, cy + Math.sin(a) * r, randomGenome(), 0)
      );
    }
    for (let i = 0; i < 180; i++) {
      this.spawnFood(Math.random() * this.w, Math.random() * this.h);
    }
  }

  makeCreature(x, y, genome, gen) {
    return {
      x, y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      energy: 58,
      age: 0,
      genome,
      generation: gen,
      hue: hueOf(genome),
      alive: true,
      songCd: Math.random() * 4
    };
  }

  spawnFood(x, y) {
    if (this.food.length >= MAX_FOOD) return;
    this.food.push({
      x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12
    });
  }

  addSpark(x, y, hue, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 55;
      const life = 0.35 + Math.random() * 0.45;
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        hue: hue + (Math.random() - 0.5) * 40,
        life, max: life
      });
    }
  }

  step(dt) {
    this.time += dt;

    // ---- 먹이 생성 ----
    this.foodAccum += FOOD_RATE * dt;
    if (this.pointer.feeding) this.foodAccum += 95 * dt;

    while (this.foodAccum >= 1) {
      this.foodAccum -= 1;
      if (this.food.length >= MAX_FOOD) continue;
      if (this.pointer.feeding && Math.random() < 0.88) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 46;
        this.spawnFood(this.pointer.x + Math.cos(a) * r,
                       this.pointer.y + Math.sin(a) * r);
      } else {
        this.spawnFood(Math.random() * this.w, Math.random() * this.h);
      }
    }

    // ---- 먹이 이동 ----
    for (let i = 0; i < this.food.length; i++) {
      const f = this.food[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < 0) { f.x = 0; f.vx = Math.abs(f.vx); }
      if (f.x > this.w) { f.x = this.w; f.vx = -Math.abs(f.vx); }
      if (f.y < 0) { f.y = 0; f.vy = Math.abs(f.vy); }
      if (f.y > this.h) { f.y = this.h; f.vy = -Math.abs(f.vy); }
    }

    // ---- 개체 업데이트 ----
    this.newborns.length = 0;
    let died = 0;

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      this.updateCreature(c, dt);
      if (!c.alive) died++;
    }

    if (died > 0) {
      this.creatures = this.creatures.filter(c => c.alive);
      this.deaths += died;
    }

    for (let i = 0; i < this.newborns.length; i++) {
      if (this.creatures.length < MAX_POP) this.creatures.push(this.newborns[i]);
    }

    // ---- 스파크 ----
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.94;
      s.vy *= 0.94;
    }

    // ---- 히스토리 ----
    this.histAccum += dt;
    if (this.histAccum >= 0.3) {
      this.histAccum = 0;
      this.history.push(this.creatures.length);
      if (this.history.length > 130) this.history.shift();
    }
  }

  updateCreature(c, dt) {
    c.age += dt;
    const inp = this.in;

    // ---------- 먹이 감지 + 섭취 ----------
    let bf = null, bfd2 = Infinity;
    const food = this.food;
    const eatR2 = FOOD_RADIUS * FOOD_RADIUS;

    for (let i = food.length - 1; i >= 0; i--) {
      const f = food[i];
      const dx = f.x - c.x, dy = f.y - c.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < eatR2) {
        food.splice(i, 1);
        c.energy = Math.min(MAX_ENERGY, c.energy + FOOD_VALUE);
        this.addSpark(f.x, f.y, c.hue, 3);
        if (this.onEvent) this.onEvent('eat', c);
      } else if (d2 < bfd2) {
        bfd2 = d2; bf = f;
      }
    }

    // ---------- 이웃 감지 ----------
    let bn = null, bnd2 = Infinity, near = 0;
    const list = this.creatures;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o === c || !o.alive) continue;
      const dx = o.x - c.x, dy = o.y - c.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 3600) near++;
      if (d2 < bnd2) { bnd2 = d2; bn = o; }
    }

    // ---------- 감각 ----------
    if (bf && bfd2 < SENSE_FOOD * SENSE_FOOD) {
      const d = Math.sqrt(bfd2) + 1;
      inp[0] = (bf.x - c.x) / d;
      inp[1] = (bf.y - c.y) / d;
      inp[2] = 1 - Math.sqrt(bfd2) / SENSE_FOOD;
    } else { inp[0] = inp[1] = inp[2] = 0; }

    if (bn && bnd2 < 40000) {
      const d = Math.sqrt(bnd2) + 1;
      inp[3] = (bn.x - c.x) / d;
      inp[4] = (bn.y - c.y) / d;
    } else { inp[3] = inp[4] = 0; }

    inp[5] = Math.min(1, near / 12);
    inp[6] = Math.min(1, Math.hypot(c.vx, c.vy) / MAX_SPEED);
    inp[7] = c.energy / MAX_ENERGY;

    if (this.pointer.active) {
      const px = this.pointer.x - c.x, py = this.pointer.y - c.y;
      const pd = Math.hypot(px, py) + 1;
      inp[8] = px / pd;
      inp[9] = py / pd;
    } else { inp[8] = inp[9] = 0; }

    const M = 140;
    inp[10] = c.x < M ? (M - c.x) / M
             : c.x > this.w - M ? -(c.x - (this.w - M)) / M : 0;
    inp[11] = c.y < M ? (M - c.y) / M
             : c.y > this.h - M ? -(c.y - (this.h - M)) / M : 0;

    // ---------- 사고 ----------
    const out = think(c.genome, inp);

    const dvx = out[0] * MAX_SPEED;
    const dvy = out[1] * MAX_SPEED;
    const k = Math.min(1, dt * 3.2);
    c.vx += (dvx - c.vx) * k;
    c.vy += (dvy - c.vy) * k;

    // 벽 회피
    const margin = 70;
    if (c.x < margin) c.vx += (margin - c.x) * 9 * dt;
    if (c.x > this.w - margin) c.vx -= (c.x - (this.w - margin)) * 9 * dt;
    if (c.y < margin) c.vy += (margin - c.y) * 9 * dt;
    if (c.y > this.h - margin) c.vy -= (c.y - (this.h - margin)) * 9 * dt;

    // 속도 제한
    const sp = Math.hypot(c.vx, c.vy);
    const cap = MAX_SPEED * 1.25;
    if (sp > cap) { c.vx = c.vx / sp * cap; c.vy = c.vy / sp * cap; }

    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.x = Math.max(0, Math.min(this.w, c.x));
    c.y = Math.max(0, Math.min(this.h, c.y));

    // ---------- 대사 ----------
    c.energy -= (METABOLISM + MOVE_COST * (sp / MAX_SPEED)) * dt;

    // ---------- 노래 ----------
    c.songCd -= dt;
    if (out[2] > 0.86 && c.songCd <= 0) {
      c.songCd = 2.5 + Math.random() * 5;
      if (this.onEvent) this.onEvent('sing', c);
    }

    // ---------- 번식 ----------
    if (c.energy > REPRO_ENERGY && c.age > MIN_AGE &&
        this.creatures.length + this.newborns.length < MAX_POP) {
      const mate = (bn && bnd2 < 3600) ? bn : null;
      let g = mate ? crossover(c.genome, mate.genome) : new Float32Array(c.genome);
      g = mutate(g);

      const gen = Math.max(c.generation, mate ? mate.generation : 0) + 1;
      c.energy -= REPRO_COST;

      const ang = Math.random() * Math.PI * 2;
      const child = this.makeCreature(
        c.x + Math.cos(ang) * 8,
        c.y + Math.sin(ang) * 8,
        g, gen
      );
      child.energy = 30;
      this.newborns.push(child);
      this.births++;
      if (gen > this.maxGen) this.maxGen = gen;

      this.addSpark(c.x, c.y, child.hue, 6);
      if (this.onEvent) this.onEvent('birth', child);
    }

    // ---------- 죽음 ----------
    if (c.energy <= 0) {
      c.alive = false;
      this.addSpark(c.x, c.y, c.hue, 7);
      if (this.onEvent) this.onEvent('death', c);
    }
  }
}

const INPUTS_LEN = 12;