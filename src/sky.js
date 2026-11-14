import * as THREE from 'three';
import { noOutline } from './toon.js';
import { drawIcon } from './icons.js';
import { sparkleTexture, RAINBOW, motif2d } from './patterns.js';

/** Big glowing version of a wheel icon, for floating up into the sky. */
export function makeSkyIcon(key, glowColor) {
  const g = new THREE.Group();
  const halo = document.createElement('canvas');
  halo.width = halo.height = 128;
  const hx = halo.getContext('2d');
  const grad = hx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(glowColor);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb},0.85)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  hx.fillStyle = grad;
  hx.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(halo);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, depthWrite: false, opacity: 0 }));
  haloSprite.scale.setScalar(2.3);
  g.add(haloSprite);

  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.translate(256, 256);
  drawIcon(x, key, 190);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  g.add(icon);
  return { group: g, icon, halo: haloSprite };
}

/** Twinkling star field for the night sky. */
export function makeStars(count = 160) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 90;
    pos[i * 3 + 1] = 2 + Math.random() * 20;
    pos[i * 3 + 2] = -18 - Math.random() * 14;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: sparkleTexture(), size: 1.1, transparent: true, opacity: 0, depthWrite: false, color: '#fffbe0' });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -1;
  return pts;
}

/** Huge rainbow arching behind the hills. */
export function makeSkyRainbow() {
  const g = new THREE.Group();
  RAINBOW.forEach((c, k) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(26 - k * 1.3, 0.68, 8, 96, Math.PI),
      noOutline(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })),
    );
    g.add(m);
  });
  g.position.set(0, -6, -34);
  return g;
}

/**
 * Hearts drifting up (dir 1) or petals/flowers drifting down (dir -1) across the sky.
 * Call update(dt, opacity) every frame.
 */
export function makeFloaters({ kind, colors, dir }, count = 34) {
  const group = new THREE.Group();
  const mats = colors.map((c) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    motif2d(x, kind, 32, 32, 24, c);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 });
  });
  const items = [];
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(mats[i % mats.length]);
    s.position.set((Math.random() - 0.5) * 40, -3 + Math.random() * 16, -6 - Math.random() * 14);
    s.scale.setScalar(0.5 + Math.random() * 0.6);
    s.userData = { speed: 0.6 + Math.random() * 0.8, phase: Math.random() * 6 };
    group.add(s);
    items.push(s);
  }
  let t = 0;
  return {
    group,
    update(dt, opacity) {
      t += dt;
      mats.forEach((m) => { m.opacity = opacity; });
      for (const s of items) {
        const u = s.userData;
        s.position.y += dir * u.speed * dt;
        s.position.x += Math.sin(t * 1.3 + u.phase) * dt * 0.6;
        s.material.rotation = Math.sin(t * 2 + u.phase) * 0.4;
        if (s.position.y > 14) s.position.y = -4;
        if (s.position.y < -4) s.position.y = 14;
      }
    },
  };
}
