import * as THREE from 'three';

const TAU = Math.PI * 2;
export const RAINBOW = ['#ff5d6c', '#ff9f40', '#ffe066', '#5ad17a', '#4fb3ff', '#9b6bff'];

function crescent(ctx, s) {
  const R = s, r = s * 0.85, d = s * 0.5;
  const x = (R * R - r * r + d * d) / (2 * d);
  const y = Math.sqrt(R * R - x * x);
  const a = Math.atan2(y, x);
  ctx.arc(0, 0, R, a, TAU - a, false);
  ctx.arc(d, 0, r, Math.atan2(-y, x - d), Math.atan2(y, x - d), true);
}

function starPath(ctx, s, points = 5, inner = 0.45) {
  for (let k = 0; k < points * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / points;
    const rad = k % 2 ? s * inner : s;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
}

function heartPath(ctx, s) {
  ctx.moveTo(0, s * 0.8);
  ctx.bezierCurveTo(-s * 0.2, s * 0.6, -s, s * 0.2, -s, -s * 0.25);
  ctx.bezierCurveTo(-s, -s * 0.78, -s * 0.32, -s * 0.98, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.32, -s * 0.98, s, -s * 0.78, s, -s * 0.25);
  ctx.bezierCurveTo(s, s * 0.2, s * 0.2, s * 0.6, 0, s * 0.8);
}

/** Flat silhouette motif for fabric / wallpaper. `color` may be an array for rainbows. */
export function motif2d(ctx, kind, x, y, s, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = Array.isArray(color) ? color[0] : color;
  ctx.beginPath();
  if (kind === 'moon') crescent(ctx, s);
  else if (kind === 'star') { ctx.lineJoin = 'round'; starPath(ctx, s); ctx.lineWidth = s * 0.2; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
  else if (kind === 'sun') {
    ctx.arc(0, 0, s * 0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      ctx.moveTo(Math.cos(a - 0.22) * s * 0.62, Math.sin(a - 0.22) * s * 0.62);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a + 0.22) * s * 0.62, Math.sin(a + 0.22) * s * 0.62);
    }
  } else if (kind === 'heart') heartPath(ctx, s);
  else if (kind === 'flower') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.42, Math.sin(a) * s * 0.55);
      ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, TAU);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 236, 120, 0.95)';
    ctx.arc(0, 0, s * 0.32, 0, TAU);
  }
  else if (kind === 'rainbow') {
    const cols = Array.isArray(color) ? color : RAINBOW;
    const w = s * 0.28;
    cols.slice(0, 3).forEach((c, k) => {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.arc(0, s * 0.4, s - k * w, Math.PI, TAU);
      ctx.arc(0, s * 0.4, s - (k + 1) * w, TAU, Math.PI, true);
      ctx.fill();
    });
    ctx.restore();
    return;
  } else ctx.arc(0, 0, s * 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const cache = new Map();

/**
 * Tileable fabric texture. spec:
 *  { kind:'motif', bg, fg, motif } | { kind:'dots', bg, fg } | { kind:'stripes', colors }
 */
export function patternTexture(spec) {
  const key = JSON.stringify(spec);
  if (cache.has(key)) return cache.get(key);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  if (spec.kind === 'stripes') {
    const n = spec.colors.length;
    spec.colors.forEach((col, k) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, (k * S) / n, S, S / n + 1);
    });
  } else {
    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, S, S);
    if (spec.kind === 'dots') {
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.75], [0.75, 0.25], [0.25, 0.75]]) motif2d(ctx, 'dot', x * S, y * S, S * 0.13, spec.fg);
    } else {
      motif2d(ctx, spec.motif, S * 0.27, S * 0.27, S * 0.15, spec.fg, -0.3);
      motif2d(ctx, spec.motif, S * 0.75, S * 0.74, S * 0.15, spec.fg, 0.35);
      const small = spec.motif === 'star' ? 'dot' : 'star';
      motif2d(ctx, small, S * 0.76, S * 0.24, S * 0.06, spec.fg);
      motif2d(ctx, small, S * 0.24, S * 0.77, S * 0.06, spec.fg);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Twinkly 4-point sparkle texture for sprites / stars. */
let sparkleTex;
export function sparkleTexture() {
  if (sparkleTex) return sparkleTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,250,210,0.7)');
  g.addColorStop(1, 'rgba(255,250,210,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#fff';
  x.beginPath();
  x.translate(32, 32);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    const r = k % 2 ? 5 : 30;
    x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  x.fill();
  sparkleTex = new THREE.CanvasTexture(c);
  sparkleTex.colorSpace = THREE.SRGBColorSpace;
  return sparkleTex;
}
