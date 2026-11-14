import * as THREE from 'three';
import { toon } from './toon.js';
import { RAINBOW } from './patterns.js';

const TAU = Math.PI * 2;

function crescentShape(s) {
  const R = s, r = s * 0.85, d = s * 0.5;
  const x = (R * R - r * r + d * d) / (2 * d);
  const y = Math.sqrt(R * R - x * x);
  const a = Math.atan2(y, x);
  const sh = new THREE.Shape();
  sh.absarc(0, 0, R, a, TAU - a, false);
  sh.absarc(d, 0, r, Math.atan2(-y, x - d), Math.atan2(y, x - d), true);
  return sh;
}

function starShape(s, points = 5, inner = 0.48) {
  const sh = new THREE.Shape();
  for (let k = 0; k < points * 2; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / points;
    const rad = k % 2 ? s * inner : s;
    if (k === 0) sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  sh.closePath();
  return sh;
}

function heartShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s * 0.8);
  sh.bezierCurveTo(-s * 0.2, -s * 0.6, -s, -s * 0.2, -s, s * 0.25);
  sh.bezierCurveTo(-s, s * 0.78, -s * 0.32, s * 0.98, 0, s * 0.5);
  sh.bezierCurveTo(s * 0.32, s * 0.98, s, s * 0.78, s, s * 0.25);
  sh.bezierCurveTo(s, -s * 0.2, s * 0.2, -s * 0.6, 0, -s * 0.8);
  return sh;
}

function flowerShape(s) {
  const sh = new THREE.Shape();
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const r = s * (0.55 + 0.45 * Math.abs(Math.cos(2.5 * a)));
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return sh;
}

function bandShape(R, r) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, R, 0, Math.PI, false);
  sh.absarc(0, 0, r, Math.PI, 0, true);
  return sh;
}

const extrude = (shape, depth) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: depth * 0.4, bevelSegments: 2, curveSegments: 16 });

/**
 * Small chunky 3D motif (moon/star/sun/heart/rainbow) of radius ~size, facing +z.
 */
export function motifMesh(kind, size, color) {
  const depth = size * 0.25;
  if (kind === 'rainbow') {
    const g = new THREE.Group();
    const w = size * 0.3;
    RAINBOW.filter((_, i) => i % 2 === 0).forEach((c, k) => {
      const geo = extrude(bandShape(size - k * w, size - (k + 1) * w + w * 0.05), depth);
      geo.translate(0, -size * 0.35, -depth / 2);
      g.add(new THREE.Mesh(geo, toon(c)));
    });
    return g;
  }
  if (kind === 'flower') {
    const g = new THREE.Group();
    const geo = extrude(flowerShape(size), depth);
    geo.center();
    g.add(new THREE.Mesh(geo, toon(color)));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.33, size * 0.33, depth * 1.6, 20), toon('#ffd23f'));
    mid.rotation.x = Math.PI / 2;
    g.add(mid);
    return g;
  }
  let shape;
  if (kind === 'moon') shape = crescentShape(size);
  else if (kind === 'sun') shape = starShape(size, 10, 0.72);
  else if (kind === 'heart') shape = heartShape(size);
  else shape = starShape(size);
  const geo = extrude(shape, depth);
  geo.center();
  const m = new THREE.Mesh(geo, toon(color));
  if (kind === 'moon') m.rotation.z = -0.5;
  return m;
}
