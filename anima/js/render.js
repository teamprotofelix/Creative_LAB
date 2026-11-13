function draw(ctx, world) {
  const w = world.w, h = world.h;

  // 잔상 페이드 (긴 노출 사진 느낌)
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(4, 5, 12, 0.085)';
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'lighter';

  // 먹이
  ctx.fillStyle = 'rgba(122, 214, 255, 0.30)';
  for (let i = 0; i < world.food.length; i++) {
    const f = world.food[i];
    ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
  }

  // 스파크
  for (let i = 0; i < world.sparks.length; i++) {
    const s = world.sparks[i];
    const a = s.life / s.max;
    const r = 1 + a * 2.2;
    ctx.fillStyle = `hsla(${s.hue|0}, 95%, 68%, ${(a * 0.75).toFixed(3)})`;
    ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  }

  // 개체
  for (let i = 0; i < world.creatures.length; i++) {
    const c = world.creatures[i];
    const ang = Math.atan2(c.vy, c.vx);
    const s = 3.0 + (c.energy / 120) * 2.4;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(ang);
    ctx.fillStyle = `hsla(${c.hue|0}, 92%, 64%, 0.85)`;
    ctx.beginPath();
    ctx.moveTo(s * 1.9, 0);
    ctx.lineTo(-s * 0.9, s * 0.9);
    ctx.lineTo(-s * 0.9, -s * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';
}

function drawGraph(g, history, w, h) {
  g.clearRect(0, 0, w, h);
  if (history.length < 2) return;

  let max = 1;
  for (let i = 0; i < history.length; i++) if (history[i] > max) max = history[i];

  g.beginPath();
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * w;
    const y = h - (history[i] / max) * (h - 6) - 3;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.strokeStyle = 'rgba(127, 227, 208, 0.75)';
  g.lineWidth = 1;
  g.stroke();

  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fillStyle = 'rgba(127, 227, 208, 0.07)';
  g.fill();
}