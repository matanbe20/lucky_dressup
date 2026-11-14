// Draws the app icons (a cartoon lucky wheel) with the same artwork as the game.
// Open tools/make-icons.html in the browser to preview them; with ?save it also
// POSTs each PNG to /save (see tools/save-icons-server.mjs) to write icons/*.png.
import { drawIcon, INK } from '../src/icons.js';
import { ITEMS } from '../src/items.js';

const TAU = Math.PI * 2;

/**
 * size: px. wheel: wheel radius as a fraction of size. round: rounded-square
 * background (for normal icons) vs full-bleed (maskable / Apple).
 */
export function drawAppIcon(size, { wheel = 0.34, round = true, cy = 0.54, detail = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const lw = Math.max(1.5, size * 0.012);

  // background
  if (round) {
    const r = size * 0.22;
    x.beginPath();
    x.roundRect(0, 0, size, size, r);
    x.clip();
  }
  const bg = x.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#6cc9ff');
  bg.addColorStop(0.7, '#bfeaff');
  bg.addColorStop(1, '#e9f9ff');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);
  // soft hill
  x.fillStyle = '#7fdc5a';
  x.beginPath();
  x.ellipse(size * 0.5, size * 1.12, size * 0.8, size * 0.32, 0, 0, TAU);
  x.fill();

  const cx = size / 2, cyy = size * cy, R = size * wheel;
  // glow
  const glow = x.createRadialGradient(cx, cyy, R * 0.6, cx, cyy, R * 1.5);
  glow.addColorStop(0, 'rgba(255,255,255,0.7)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = glow;
  x.fillRect(0, 0, size, size);

  // rim + bulbs
  x.beginPath();
  x.arc(cx, cyy, R * 1.1, 0, TAU);
  x.fillStyle = '#ffcf3a';
  x.fill();
  x.lineWidth = lw;
  x.strokeStyle = INK;
  x.stroke();
  if (detail) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      x.beginPath();
      x.arc(cx + Math.cos(a) * R * 1.05, cyy + Math.sin(a) * R * 1.05, R * 0.035, 0, TAU);
      x.fillStyle = k % 2 ? '#fff7b0' : '#ff8a3d';
      x.fill();
    }
  }

  // wedges (heart on top, like the game's start position)
  const seg = TAU / ITEMS.length;
  const rot = 0;
  ITEMS.forEach((it, i) => {
    const a = i * seg + rot;
    x.beginPath();
    x.moveTo(cx, cyy);
    x.arc(cx, cyy, R, -(a - seg / 2), -(a + seg / 2), true);
    x.closePath();
    const g = x.createRadialGradient(cx, cyy, R * 0.15, cx, cyy, R);
    g.addColorStop(0, it.light);
    g.addColorStop(1, it.color);
    x.fillStyle = g;
    x.fill();
  });
  x.strokeStyle = '#ffffff';
  x.lineWidth = lw * 1.1;
  x.lineCap = 'round';
  for (let i = 0; i < ITEMS.length; i++) {
    const a = i * seg + seg / 2 + rot;
    x.beginPath();
    x.moveTo(cx, cyy);
    x.lineTo(cx + Math.cos(a) * R, cyy - Math.sin(a) * R);
    x.stroke();
  }
  x.beginPath();
  x.arc(cx, cyy, R, 0, TAU);
  x.strokeStyle = INK;
  x.lineWidth = lw;
  x.stroke();

  if (detail) {
    ITEMS.forEach((it, i) => {
      const a = i * seg + rot;
      x.save();
      x.translate(cx + Math.cos(a) * R * 0.62, cyy - Math.sin(a) * R * 0.62);
      x.rotate(-a + Math.PI / 2);
      drawIcon(x, it.key, R * 0.2);
      x.restore();
    });
  }

  // hub
  x.beginPath();
  x.arc(cx, cyy, R * 0.17, 0, TAU);
  x.fillStyle = '#ff4f8b';
  x.fill();
  x.lineWidth = lw;
  x.strokeStyle = INK;
  x.stroke();
  x.beginPath();
  x.arc(cx - R * 0.05, cyy - R * 0.06, R * 0.045, 0, TAU);
  x.fillStyle = '#fff';
  x.fill();

  // pointer (teardrop) at the top
  const pr = R * 0.17, pcy = cyy - R * 1.12, tip = cyy - R * 0.8;
  x.beginPath();
  x.moveTo(cx, tip);
  x.lineTo(cx + pr * 0.88, pcy + pr * 0.45);
  x.arc(cx, pcy, pr, Math.PI * 0.15, Math.PI * 0.85, true);
  x.closePath();
  x.fillStyle = '#ff4d6d';
  x.fill();
  x.lineJoin = 'round';
  x.lineWidth = lw;
  x.strokeStyle = INK;
  x.stroke();
  x.beginPath();
  x.arc(cx, pcy, pr * 0.35, 0, TAU);
  x.fillStyle = '#fff3b0';
  x.fill();
  return c;
}

export const ICONS = [
  { name: 'icons/icon-512.png', size: 512, opts: {} },
  { name: 'icons/icon-192.png', size: 192, opts: {} },
  { name: 'icons/maskable-512.png', size: 512, opts: { wheel: 0.27, round: false, cy: 0.545 } },
  { name: 'icons/apple-touch-icon.png', size: 180, opts: { wheel: 0.32, round: false } },
  { name: 'icons/favicon-64.png', size: 64, opts: { wheel: 0.36, detail: false } },
];

const out = document.getElementById('out');
const save = new URLSearchParams(location.search).has('save');
const results = [];
for (const { name, size, opts } of ICONS) {
  const c = drawAppIcon(size, opts);
  const fig = document.createElement('figure');
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: name }));
  out.append(fig);
  if (save) {
    const body = c.toDataURL('image/png').split(',')[1];
    results.push(fetch(`/save?name=${encodeURIComponent(name)}`, { method: 'POST', body }).then((r) => `${name}: ${r.status}`));
  }
}
window.saved = Promise.all(results);
