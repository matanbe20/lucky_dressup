// Cartoon icons drawn on a 2D canvas. Each icon is centred on (0,0), roughly
// `s` in radius, with "up" = -y (the wheel rotates it so up points outward).
export const INK = '#2b1d3a';
const TAU = Math.PI * 2;

function inked(ctx, fill, lw) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function radial(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function cheeks(ctx, x, y, s, dx = 0.34) {
  ctx.fillStyle = 'rgba(255, 90, 130, 0.5)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + sx * s * dx, y + s * 0.13, s * 0.085, s * 0.055, 0, 0, TAU);
    ctx.fill();
  }
}

function face(ctx, x, y, s) {
  const ex = s * 0.2, er = s * 0.08;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x + sx * ex, y, er * 0.85, er * 1.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + sx * ex - er * 0.25, y - er * 0.45, er * 0.38, 0, TAU);
    ctx.fill();
  }
  cheeks(ctx, x, y, s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.08, s * 0.12, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU - Math.PI / 2;
    const rad = k % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  inked(ctx, '#fff59e', r * 0.25);
}

function heart(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.82);
  ctx.bezierCurveTo(-s * 0.2, s * 0.62, -s, s * 0.22, -s, -s * 0.25);
  ctx.bezierCurveTo(-s, -s * 0.78, -s * 0.32, -s * 0.98, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.32, -s * 0.98, s, -s * 0.78, s, -s * 0.25);
  ctx.bezierCurveTo(s, s * 0.22, s * 0.2, s * 0.62, 0, s * 0.82);
  ctx.closePath();
  inked(ctx, radial(ctx, 0, 0, s, '#ff8fab', '#e8234f'), s * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.55, -s * 0.38, s * 0.16, s * 0.09, -0.8, 0, TAU);
  ctx.fill();
  face(ctx, 0, s * 0.02, s * 0.95);
}

function sun(ctx, s) {
  const rays = 12;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.17) * s * 0.55, Math.sin(a - 0.17) * s * 0.55);
    ctx.lineTo(Math.cos(a) * s * 1.0, Math.sin(a) * s * 1.0);
    ctx.lineTo(Math.cos(a + 0.17) * s * 0.55, Math.sin(a + 0.17) * s * 0.55);
    ctx.closePath();
    inked(ctx, k % 2 ? '#ffb22e' : '#ff8a1f', s * 0.06);
  }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.62, 0, TAU);
  inked(ctx, radial(ctx, 0, 0, s * 0.62, '#fff59a', '#ffc72c'), s * 0.07);
  face(ctx, 0, 0, s * 0.95);
}

function moon(ctx, s) {
  ctx.save();
  ctx.rotate(-0.4);
  const R = s * 0.82, r = s * 0.72, d = s * 0.48;
  const x = (R * R - r * r + d * d) / (2 * d);
  const y = Math.sqrt(R * R - x * x);
  const alpha = Math.atan2(y, x);
  ctx.beginPath();
  ctx.arc(0, 0, R, alpha, TAU - alpha, false);
  ctx.arc(d, 0, r, Math.atan2(-y, x - d), Math.atan2(y, x - d), true);
  ctx.closePath();
  inked(ctx, radial(ctx, -s * 0.3, 0, R, '#fffbd6', '#ffd84d'), s * 0.07);
  // sleepy face on the thick part
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(-s * 0.5, -s * 0.16, s * 0.08, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-s * 0.52, s * 0.12, s * 0.09, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 90, 130, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.36, -s * 0.02, s * 0.07, s * 0.05, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  sparkle(ctx, s * 0.5, -s * 0.55, s * 0.2);
  sparkle(ctx, s * 0.62, s * 0.35, s * 0.13);
}

function star(ctx, s) {
  ctx.save();
  ctx.translate(0, s * 0.06);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 ? s * 0.5 : s;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  inked(ctx, radial(ctx, 0, 0, s, '#fff59a', '#ffbf1f'), s * 0.09);
  face(ctx, 0, s * 0.08, s * 0.8);
  ctx.restore();
}

function flower(ctx, s) {
  // stem + leaf
  ctx.lineCap = 'round';
  for (const [w, c] of [[s * 0.17, INK], [s * 0.09, '#3fae4a']]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.25);
    ctx.quadraticCurveTo(s * 0.08, s * 0.65, 0, s * 1.0);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(s * 0.2, s * 0.7, s * 0.2, s * 0.09, -0.6, 0, TAU);
  inked(ctx, '#5ccf5f', s * 0.05);
  const cy = -s * 0.12;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.47, cy + Math.sin(a) * s * 0.47, s * 0.3, 0, TAU);
    inked(ctx, radial(ctx, Math.cos(a) * s * 0.47, cy + Math.sin(a) * s * 0.47, s * 0.3, '#ffd0ea', '#ff6fb5'), s * 0.06);
  }
  ctx.beginPath();
  ctx.arc(0, cy, s * 0.32, 0, TAU);
  inked(ctx, radial(ctx, 0, cy, s * 0.32, '#fff3a0', '#ffc533'), s * 0.06);
  face(ctx, 0, cy, s * 0.62);
}

function cloud(ctx, x, y, s) {
  const blobs = [[-0.34, 0.06, 0.27], [0, -0.1, 0.34], [0.34, 0.06, 0.27], [0, 0.14, 0.27]];
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.16;
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * s, y + by * s, br * s, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * s, y + by * s, br * s, 0, TAU);
    ctx.fill();
  }
}

function rainbow(ctx, s) {
  const cy = s * 0.32, outer = s * 0.98, w = s * 0.12;
  const cols = ['#ff4d6d', '#ff9f1c', '#ffe14d', '#5ad15a', '#3fa9ff', '#9b5de5'];
  cols.forEach((c, k) => {
    const r = outer - k * w;
    ctx.beginPath();
    ctx.arc(0, cy, r, Math.PI, TAU);
    ctx.arc(0, cy, r - w, TAU, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(0, cy, outer, Math.PI, TAU);
  ctx.arc(0, cy, outer - cols.length * w, TAU, Math.PI, true);
  ctx.closePath();
  ctx.lineWidth = s * 0.07;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  cloud(ctx, -s * 0.64, cy + s * 0.04, s * 0.55);
  cloud(ctx, s * 0.64, cy + s * 0.04, s * 0.55);
}

function web(ctx, s) {
  const cy = s * 0.05, L = s, spokes = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * TAU + 0.2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(Math.cos(a) * L, cy + Math.sin(a) * L);
    ctx.stroke();
  }
  for (const ring of [0.33, 0.6, 0.88]) {
    ctx.beginPath();
    for (let k = 0; k <= spokes; k++) {
      const a = (k / spokes) * TAU + 0.2;
      const px = Math.cos(a) * ring * L, py = cy + Math.sin(a) * ring * L;
      if (k === 0) ctx.moveTo(px, py);
      else {
        const m = a - Math.PI / spokes;
        ctx.quadraticCurveTo(Math.cos(m) * ring * L * 0.8, cy + Math.sin(m) * ring * L * 0.8, px, py);
      }
    }
    ctx.stroke();
  }
}

function spider(ctx, s, { away }) {
  web(ctx, s);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  if (away) {
    // just a snapped, dangling thread — the spider ran off!
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.05);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.62, -s * 0.06, -s * 0.36);
    ctx.stroke();
    return;
  }
  const by = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.05);
  ctx.lineTo(0, by - s * 0.4);
  ctx.stroke();
  // legs
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.085;
  ctx.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const ay = by - s * 0.2 + k * s * 0.13;
      ctx.beginPath();
      ctx.moveTo(sx * s * 0.2, ay);
      ctx.lineTo(sx * s * (0.62 + (k === 1 || k === 2 ? 0.07 : 0)), ay - s * 0.24 + k * s * 0.07);
      ctx.lineTo(sx * s * (0.84 - k * 0.03), ay + s * 0.1 + k * s * 0.1);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(0, by, s * 0.44, 0, TAU);
  inked(ctx, radial(ctx, 0, by, s * 0.44, '#8463b8', '#3b2659'), s * 0.06);
  // eyes peeking sideways, mischievous brows
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * s * 0.16, by - s * 0.06, s * 0.15, 0, TAU);
    inked(ctx, '#fff', s * 0.04);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(sx * s * 0.16 + s * 0.05, by - s * 0.04, s * 0.075, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx * s * 0.16 + s * 0.03, by - s * 0.07, s * 0.025, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(sx * s * 0.3, by - s * 0.3);
    ctx.lineTo(sx * s * 0.06, by - s * 0.22);
    ctx.stroke();
  }
  cheeks(ctx, 0, by, s, 0.3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.arc(0, by + s * 0.1, s * 0.14, 0.3, Math.PI - 0.3);
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * s * 0.1, by + s * 0.21);
    ctx.lineTo(sx * s * 0.04, by + s * 0.22);
    ctx.lineTo(sx * s * 0.07, by + s * 0.32);
    ctx.closePath();
    inked(ctx, '#fff', s * 0.025);
  }
}

const DRAWERS = { heart, sun, moon, star, flower, rainbow, spider };

export function drawIcon(ctx, key, s, opts = {}) {
  DRAWERS[key]?.(ctx, s, opts);
}
