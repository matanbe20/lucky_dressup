import * as THREE from 'three';
import { toon as baseToon, noOutline, ball } from './toon.js';

// Door parts glow a little so they stay bright in night themes.
const toon = (c) => baseToon(c, { emissive: c, emissiveIntensity: 0.35 });
import { drawIcon } from './icons.js';

/** Rounded-top door outline, base centred at (0,0). */
export function archShape(w, h) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

/** Round badge texture with a wheel icon on it. */
export function iconBadgeTexture(key, bg, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);
  x.translate(size / 2, size / 2);
  drawIcon(x, key, size * 0.36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A free-standing magic door with the theme's icon on it.
 * open(k): 0 = closed, 1 = wide open (swings toward the viewer).
 */
export function createDoor(theme) {
  const group = new THREE.Group();
  const W = 2.3, H = 3.7, FW = 2.95, FH = 4.05, STEP = 0.2;
  const inner = new THREE.Group();
  inner.position.y = STEP;
  group.add(inner);

  const frameShape = archShape(FW, FH);
  frameShape.holes.push(archShape(W, H));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 40 });
  frameGeo.translate(0, 0, -0.175);
  inner.add(new THREE.Mesh(frameGeo, toon(theme.door.frame)));

  // warm light seen through the doorway once it opens
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(archShape(W, H), 32), noOutline(new THREE.MeshBasicMaterial({ color: theme.glow })));
  glow.position.z = -0.12;
  inner.add(glow);

  const pivot = new THREE.Group();
  pivot.position.set(-W / 2, 0, 0.0);
  inner.add(pivot);
  const panelGeo = new THREE.ExtrudeGeometry(archShape(W - 0.06, H - 0.04), { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 40 });
  panelGeo.translate(W / 2, 0.02, -0.06);
  const panelMat = toon(theme.door.panel);
  pivot.add(new THREE.Mesh(panelGeo, panelMat));

  const inset = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.06), toon(new THREE.Color(theme.door.panel).lerp(new THREE.Color('#ffffff'), 0.25)));
  inset.position.set(W / 2, 0.9, 0.1);
  pivot.add(inset);

  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.58, 48), noOutline(new THREE.MeshBasicMaterial({ map: iconBadgeTexture(theme.key, theme.door.plaque) })));
  plaque.position.set(W / 2, H * 0.6, 0.11);
  pivot.add(plaque);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 12, 48), toon(theme.door.frame));
  ring.position.copy(plaque.position);
  pivot.add(ring);
  pivot.add(ball(0.12, toon('#ffcf3a'), W - 0.32, H * 0.38, 0.17, 16));

  const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, STEP, 1.0), toon(theme.door.frame));
  step.position.set(0, STEP / 2, 0.15);
  group.add(step);

  return {
    group,
    pivot,
    height: H + STEP,
    open(k) { pivot.rotation.y = -1.95 * k; },
  };
}
