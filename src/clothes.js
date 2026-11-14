import * as THREE from 'three';
import { toon, ball, tube, noOutline } from './toon.js';
import { patternTexture } from './patterns.js';
import { motifMesh } from './motifs.js';
import { LEG_X } from './girl.js';
import { pet } from './pets.js';

const TAU = Math.PI * 2;
const V2 = (r, y) => new THREE.Vector2(r, y);

/** Which slot each category fills. A dress replaces top + bottom. */
export const SLOT = { shirt: 'top', skirt: 'bottom', pants: 'bottom', shorts: 'bottom', dress: 'dress', hat: 'hat', shoes: 'shoes', bag: 'bag', pet: 'pet' };
const ACC_SLOT = { necklace: 'neck', glasses: 'face', wand: 'hand', balloon: 'hand' };

/** Slot an item occupies; one item per slot. Accessories go by kind (necklace, glasses, held item). */
export const slotOf = (item) => (item.cat === 'acc' ? ACC_SLOT[item.style] : SLOT[item.cat]);

export const CATEGORIES = [
  { cat: 'hat', label: 'כובעים', emoji: '👒' },
  { cat: 'shirt', label: 'חולצות', emoji: '👕' },
  { cat: 'dress', label: 'שמלות', emoji: '👗' },
  { cat: 'skirt', label: 'חצאיות', emoji: '🩰' },
  { cat: 'pants', label: 'מכנסיים', emoji: '👖' },
  { cat: 'shorts', label: 'קצרים', emoji: '🩳' },
  { cat: 'shoes', label: 'נעליים', emoji: '👟' },
  { cat: 'bag', label: 'תיקים', emoji: '👜' },
  { cat: 'acc', label: 'אביזרים', emoji: '🪄' },
  { cat: 'pet', label: 'חיות', emoji: '🐱' },
  { cat: 'petacc', label: 'לחיה', emoji: '🎀' },
];

function fabric(m, repeat = [4, 2], side = THREE.FrontSide) {
  if (!m.pattern) return toon(m.color, { side });
  const tex = patternTexture(m.pattern).clone();
  tex.needsUpdate = true;
  if (m.pattern.kind === 'stripes') tex.repeat.set(1, 1);
  else tex.repeat.set(...repeat);
  return toon('#ffffff', { map: tex, side });
}

const lathe = (pts, mat, seg = 48) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg), mat);

function ring(r, tube, y, color, z = 0) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 48), typeof color === 'string' ? toon(color) : color);
  m.rotation.x = Math.PI / 2;
  m.position.set(0, y, z);
  return m;
}

/** Open cone between two heights, optionally with a ruffled hem. */
function flare(rTop, yTop, rBot, yBot, mat, { ruffle = 0, n = 12 } = {}) {
  const h = yTop - yBot;
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 72, 8, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (h / 2 - y) / h;
    const f = 1 + ruffle * t * t * Math.sin(n * Math.atan2(z, x));
    p.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals();
  g.translate(0, (yTop + yBot) / 2, 0);
  return new THREE.Mesh(g, mat);
}

const dome = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 36, 16, 0, TAU, 0, Math.PI / 2), mat);

/** Bend a cone geometry (base at y=0) so its tip droops sideways. */
function bend(geo, height, dx, dy, pow = 2) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / height;
    p.setX(i, p.getX(i) + dx * Math.pow(t, pow));
    p.setY(i, p.getY(i) - dy * Math.pow(t, pow));
  }
  geo.computeVertexNormals();
  return geo;
}

/** Smooth tube through points (for straps, chains, strings). */
function curveTube(points, r, mat, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), closed);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 8, closed), mat);
}

/** Invisible marker that tells the girl to raise this arm (for held items). */
function armLift(amount) {
  const o = new THREE.Object3D();
  o.userData.armLift = amount;
  return o;
}

function trimOf(spec) {
  return spec.trim || spec.layer2 || spec.mat.color || '#ffffff';
}

// ------------------------------------------------------------------ tops

const SHIRT = [[0.25, 1.03], [0.32, 1.05], [0.315, 1.12], [0.305, 1.25], [0.255, 1.4], [0.285, 1.55], [0.297, 1.65], [0.25, 1.75], [0.13, 1.83], [0.09, 1.86]];

function emblem(spec, y = 1.46) {
  const e = motifMesh(spec.emblem.motif, 0.17, spec.emblem.color);
  e.position.set(0, y, 0.305);
  return e;
}

function shirt(spec, g) {
  const parts = [[g.root, lathe(SHIRT, fabric(spec.mat, [5, 2]))]];
  const SHORT = [[0.07, -0.3], [0.125, -0.29], [0.12, -0.08], [0.1, 0.04]];
  const LONG = [[0.07, -0.64], [0.112, -0.63], [0.12, -0.1], [0.1, 0.04]];
  const sleeve = { tee: SHORT, long: LONG, hoodie: LONG, sweater: LONG }[spec.style];
  const longSleeve = sleeve === LONG;
  if (sleeve) {
    for (const sx of [-1, 1]) {
      const sm = fabric(spec.mat, [2, 1]);
      parts.push([g.arms[sx], lathe(sleeve, sm, 24)]);
      parts.push([g.arms[sx], ball(0.125, sm, 0, -0.02, 0, 16)]);
      if (longSleeve) parts.push([g.arms[sx], ring(0.105, 0.03, -0.6, spec.collar || trimOf(spec))]);
    }
  }
  if (spec.style === 'blouse') {
    for (const sx of [-1, 1]) {
      const puff = ball(0.15, fabric(spec.mat, [2, 1]), 0, -0.07, 0, 18);
      puff.scale.set(1, 0.85, 1);
      parts.push([g.arms[sx], puff]);
    }
    parts.push([g.root, flare(0.1, 1.88, 0.28, 1.74, toon(trimOf(spec), { side: THREE.DoubleSide }), { ruffle: 0.16, n: 10 })]);
  }
  if (spec.style === 'hoodie') {
    const t = toon(trimOf(spec));
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.09, 10, 24), fabric(spec.mat, [3, 1]));
    hood.position.set(0, 1.84, -0.1);
    hood.rotation.x = -1.2;
    parts.push([g.root, hood]);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.05), t);
    pocket.position.set(0, 1.18, 0.315);
    parts.push([g.root, pocket]);
    for (const sx of [-1, 1]) {
      parts.push([g.root, tube(new THREE.Vector3(sx * 0.06, 1.83, 0.17), new THREE.Vector3(sx * 0.07, 1.62, 0.29), 0.012, t, 6)]);
      parts.push([g.root, ball(0.025, t, sx * 0.07, 1.61, 0.29, 8)]);
    }
  }
  if (spec.style === 'sweater') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.17, 24), toon(trimOf(spec)));
    neck.position.y = 1.87;
    parts.push([g.root, neck]);
    parts.push([g.root, ring(0.325, 0.035, 1.06, trimOf(spec))]);
  }
  if (spec.collar) parts.push([g.root, ring(0.12, 0.04, 1.84, spec.collar)]);
  if (spec.emblem) parts.push([g.root, emblem(spec)]);
  return parts;
}

// ------------------------------------------------------------------ bottoms

function skirt(spec, g) {
  const m = fabric(spec.mat, [7, 2], THREE.DoubleSide);
  const parts = [];
  if (spec.style === 'tutu') {
    parts.push([g.root, flare(0.28, 1.17, 0.6, 0.82, m, { ruffle: 0.08, n: 14 })]);
    parts.push([g.root, flare(0.3, 1.19, 0.68, 0.93, toon(spec.layer2, { side: THREE.DoubleSide }), { ruffle: 0.07, n: 11 })]);
  } else if (spec.style === 'long') {
    parts.push([g.root, flare(0.28, 1.19, 0.62, 0.24, m, { ruffle: 0.04, n: 10 })]);
  } else if (spec.style === 'pleated') {
    parts.push([g.root, flare(0.28, 1.19, 0.5, 0.66, m, { ruffle: 0.05, n: 26 })]);
  } else if (spec.style === 'tiered') {
    const D = THREE.DoubleSide;
    parts.push([g.root, flare(0.28, 1.19, 0.42, 0.95, m)]);
    parts.push([g.root, flare(0.35, 1.0, 0.55, 0.76, toon(spec.layer2, { side: D }), { ruffle: 0.03, n: 14 })]);
    parts.push([g.root, flare(0.45, 0.8, 0.66, 0.56, toon(spec.layer3 || spec.layer2, { side: D }), { ruffle: 0.04, n: 16 })]);
  } else {
    parts.push([g.root, flare(0.28, 1.19, 0.52, 0.6, m)]);
  }
  parts.push([g.root, ring(0.29, 0.04, 1.18, trimOf(spec))]);
  return parts;
}

function pants(spec, g) {
  const short = spec.cat === 'shorts';
  const m = fabric(spec.mat, short ? [3, 1] : [3, 3]);
  const tight = spec.style === 'leggings';
  const parts = [[g.root, new THREE.Mesh(new THREE.CylinderGeometry(0.3, tight ? 0.3 : 0.31, 0.26, 40), m)]];
  parts[0][1].position.y = 0.99;
  const bottomY = short ? 0.66 : tight ? 0.12 : 0.16;
  const rBot = spec.style === 'flare' ? 0.25 : short ? 0.185 : tight ? 0.12 : 0.15;
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(tight ? 0.14 : 0.165, rBot, 0.9 - bottomY, 28), m);
    leg.position.set(sx * LEG_X, (0.9 + bottomY) / 2, 0);
    parts.push([g.root, leg]);
    if (short) {
      const cuff = ring(rBot, 0.035, bottomY + 0.02, trimOf(spec));
      cuff.position.x = sx * LEG_X;
      parts.push([g.root, cuff]);
    }
  }
  parts.push([g.root, ring(0.305, 0.035, 1.1, trimOf(spec))]);
  return parts;
}

// ------------------------------------------------------------------ dresses

const BODICE = [[0.27, 1.1], [0.305, 1.13], [0.305, 1.25], [0.255, 1.4], [0.285, 1.55], [0.297, 1.65], [0.25, 1.75], [0.13, 1.83], [0.09, 1.86]];
const BODICE_LOW = [[0.27, 1.1], [0.305, 1.13], [0.305, 1.25], [0.255, 1.4], [0.285, 1.55], [0.292, 1.62], [0.2, 1.665]];

function dress(spec, g) {
  const parts = [];
  const top = fabric(spec.mat, [5, 2]);
  const skirtMat = fabric(spec.mat, [8, 3], THREE.DoubleSide);
  parts.push([g.root, lathe(spec.style === 'sundress' ? BODICE_LOW : BODICE, top)]);
  const D = THREE.DoubleSide;
  if (spec.style === 'gown') parts.push([g.root, flare(0.3, 1.2, 0.8, 0.1, skirtMat, { ruffle: 0.05, n: 10 })]);
  else if (spec.style === 'tutudress') {
    parts.push([g.root, flare(0.3, 1.2, 0.62, 0.85, skirtMat, { ruffle: 0.08, n: 14 })]);
    parts.push([g.root, flare(0.31, 1.21, 0.72, 0.95, toon(spec.layer2, { side: D }), { ruffle: 0.07, n: 11 })]);
  } else if (spec.style === 'princess') {
    parts.push([g.root, flare(0.3, 1.2, 0.82, 0.1, skirtMat, { ruffle: 0.05, n: 10 })]);
    parts.push([g.root, flare(0.31, 1.21, 0.72, 0.55, toon(spec.layer2, { side: D }), { ruffle: 0.12, n: 7 })]);
  }
  else if (spec.style === 'sundress') parts.push([g.root, flare(0.3, 1.2, 0.58, 0.68, skirtMat, { ruffle: 0.03, n: 9 })]);
  else parts.push([g.root, flare(0.3, 1.2, 0.66, 0.6, skirtMat, { ruffle: 0.06, n: 12 })]);
  parts.push([g.root, ring(0.305, 0.045, 1.19, trimOf(spec))]);

  if (spec.style === 'party' || spec.style === 'princess') {
    for (const sx of [-1, 1]) {
      const puff = ball(0.16, fabric(spec.mat, [2, 1]), 0, -0.07, 0, 18);
      puff.scale.set(1, 0.85, 1);
      parts.push([g.arms[sx], puff]);
    }
  }
  if (spec.style === 'gown') parts.push([g.root, ring(0.12, 0.035, 1.84, trimOf(spec))]);
  if (spec.style === 'sundress') {
    const strapMat = toon(trimOf(spec));
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 24, Math.PI), strapMat);
      strap.rotation.y = Math.PI / 2;
      strap.position.set(sx * 0.15, 1.6, 0);
      parts.push([g.root, strap]);
    }
  }
  if (spec.emblem) parts.push([g.root, emblem(spec, 1.42)]);
  return parts;
}

// ------------------------------------------------------------------ hats

function ornament(spec, size, x, y, z, rotX = 0) {
  if (!spec.ornament) return null;
  const o = motifMesh(spec.ornament.motif, size, spec.ornament.color);
  o.position.set(x, y, z);
  o.rotation.x = rotX;
  return o;
}

function hat(spec, g) {
  const H = new THREE.Group();
  const m = fabric(spec.mat, [4, 2]);
  const mD = fabric(spec.mat, [4, 2], THREE.DoubleSide);
  const trim = toon(spec.trim || '#ffffff');
  const add = (o) => o && H.add(o);

  switch (spec.style) {
    case 'nightcap': {
      const geo = new THREE.CylinderGeometry(0.02, 0.5, 1.05, 32, 14, true);
      geo.translate(0, 0.525, 0);
      add(new THREE.Mesh(bend(geo, 1.05, 0.55, 0.28), mD));
      add(ring(0.5, 0.085, 0.02, trim));
      add(ball(0.13, trim, 0.55, 0.77, 0, 16));
      H.position.set(0, 0.3, -0.02);
      H.rotation.set(-0.25, 0, 0.12);
      break;
    }
    case 'beanie':
      add(dome(0.56, m));
      add(ring(0.555, 0.08, 0.02, trim));
      add(ball(0.14, trim, 0, 0.57, 0, 16));
      H.position.y = 0.14;
      H.rotation.x = -0.22;
      break;
    case 'crown': {
      const geo = new THREE.CylinderGeometry(0.41, 0.39, 0.26, 60, 1, true);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) <= 0) continue;
        const phase = ((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) / TAU) * 6;
        const frac = phase - Math.floor(phase);
        p.setY(i, p.getY(i) + 0.17 * (1 - Math.abs(2 * frac - 1)));
      }
      geo.computeVertexNormals();
      add(new THREE.Mesh(geo, mD));
      for (let k = 0; k < 6; k++) {
        const a = ((k + 0.5) / 6) * TAU - Math.PI;
        add(ball(0.045, toon(k % 2 ? '#3fd0c9' : '#ff7fbf'), Math.cos(a) * 0.41, 0.3, Math.sin(a) * 0.41, 10));
      }
      add(ornament(spec, 0.13, 0, 0.02, 0.43));
      H.position.y = 0.36;
      H.rotation.x = -0.15;
      break;
    }
    case 'wizard': {
      const geo = new THREE.CylinderGeometry(0.01, 0.47, 1.25, 32, 12, true);
      geo.translate(0, 0.625, 0);
      add(new THREE.Mesh(bend(geo, 1.25, 0.3, 0.1, 3), mD));
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.035, 56), m);
      add(brim);
      add(ring(0.47, 0.045, 0.06, trim));
      const star = motifMesh('star', 0.14, spec.trim || '#ffcf3a');
      star.position.set(0.05, 0.42, 0.37);
      add(star);
      H.position.y = 0.28;
      H.rotation.x = -0.18;
      break;
    }
    case 'sunhat':
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.035, 56), m));
      add(dome(0.5, m));
      add(ring(0.5, 0.055, 0.05, trim));
      add(ornament(spec, 0.15, 0.18, 0.12, 0.47));
      H.position.y = 0.27;
      H.rotation.set(-0.22, 0, 0.08);
      break;
    case 'cap': {
      add(dome(0.56, m));
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.035, 32, 1, false, -Math.PI / 2, Math.PI), trim);
      visor.scale.z = 1.15;
      visor.position.set(0, 0.0, 0.3);
      add(visor);
      add(ball(0.05, trim, 0, 0.56, 0, 10));
      add(ornament(spec, 0.13, 0, 0.27, 0.5, -0.5));
      H.position.y = 0.12;
      H.rotation.x = -0.15;
      break;
    }
    case 'flowercrown': {
      add(ring(0.47, 0.045, 0, toon('#3fae4a')));
      const cols = [spec.ornament?.color || '#ff8fc8', '#ffe066', '#c39bff'];
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + ((k - 4) / 4) * (Math.PI * 0.85); // front and sides
        const f = motifMesh('flower', 0.12, cols[k % 3]);
        f.position.set(Math.cos(a) * 0.47, 0.03, -Math.sin(a) * 0.47);
        f.rotation.y = Math.atan2(f.position.x, f.position.z);
        f.rotation.x = -0.3;
        add(f);
      }
      H.position.y = 0.3;
      H.rotation.x = -0.2;
      break;
    }
    case 'bow': {
      for (const sx of [-1, 1]) {
        const lobe = ball(0.2, m, sx * 0.21, 0, 0, 18);
        lobe.scale.set(1.15, 0.75, 0.45);
        lobe.rotation.z = sx * 0.35;
        add(lobe);
      }
      add(ball(0.08, toon(spec.trim || '#ffffff'), 0, 0, 0.02, 12));
      H.position.set(0, 0.5, -0.12);
      H.rotation.x = -0.5;
      break;
    }
    case 'catears': {
      add(new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.04, 10, 48, Math.PI), m));
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 16), m);
        ear.position.set(sx * 0.29, 0.5, 0);
        ear.rotation.z = -sx * 0.5;
        add(ear);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 12), trim);
        inner.position.set(sx * 0.3, 0.49, 0.07);
        inner.rotation.z = -sx * 0.5;
        add(inner);
      }
      H.position.set(0, 0.05, 0.02);
      H.rotation.x = -0.3;
      break;
    }
    case 'beret': {
      const b = ball(0.52, m, 0, 0, 0, 32);
      b.scale.set(1.1, 0.35, 1.1);
      add(b);
      add(ball(0.05, trim, 0, 0.18, 0, 10));
      add(ornament(spec, 0.12, 0.42, 0.02, 0.3));
      H.position.set(0.05, 0.4, -0.05);
      H.rotation.set(-0.2, 0, -0.28);
      break;
    }
    default: { // headband
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.045, 10, 48, Math.PI), m);
      add(band);
      add(ornament(spec, 0.2, 0.27, 0.46, 0.06));
      H.position.set(0, 0.05, 0.06);
      H.rotation.x = -0.35;
    }
  }
  return [[g.head, H]];
}

// ------------------------------------------------------------------ shoes

function shoes(spec, g) {
  const parts = [];
  const trim = toon(spec.trim || '#ffffff');
  for (const sx of [-1, 1]) {
    const m = fabric(spec.mat, [2, 1]);
    const S = new THREE.Group();
    S.position.set(sx * LEG_X, 0, 0);
    const body = (r, y, sy) => { const b = ball(r, m, 0, y, 0.08, 18); b.scale.set(1, sy, 1.7); S.add(b); return b; };
    switch (spec.style) {
      case 'boots': {
        body(0.145, 0.085, 0.66);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.42, 24), m);
        shaft.position.y = 0.3;
        S.add(shaft, ring(0.15, 0.04, 0.51, trim));
        break;
      }
      case 'flats': {
        body(0.135, 0.07, 0.55);
        const o = ornament(spec, 0.075, 0, 0.12, 0.25, -0.9);
        if (o) S.add(o);
        break;
      }
      case 'sandals': {
        const sole = ball(0.145, m, 0, 0.03, 0.08, 18);
        sole.scale.set(1.05, 0.26, 1.75);
        S.add(sole);
        for (const z of [0.0, 0.16]) {
          const strap = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 8, 24, Math.PI), m);
          strap.position.set(0, 0.04, z);
          S.add(strap);
        }
        const o = ornament(spec, 0.06, 0, 0.15, 0.17, -0.6);
        if (o) S.add(o);
        break;
      }
      case 'slippers':
        body(0.16, 0.09, 0.7);
        S.add(ball(0.075, trim, 0, 0.18, 0.22, 12));
        break;
      default: { // sneakers
        body(0.14, 0.09, 0.66);
        const sole = ball(0.145, toon('#ffffff'), 0, 0.03, 0.08, 18);
        sole.scale.set(1.04, 0.28, 1.75);
        const tongue = ball(0.06, trim, 0, 0.155, 0.12, 12);
        tongue.scale.set(1.3, 0.5, 1.5);
        S.add(sole, tongue);
      }
    }
    parts.push([g.root, S]);
  }
  return parts;
}

// ------------------------------------------------------------------ bags

/** Group placed at the hand of arm `sx`, counter-rotated so things hang straight down. */
function inHand(g, sx, lift) {
  const H = new THREE.Group();
  H.position.set(0, -0.71, 0);
  H.rotation.z = -sx * (0.2 + lift);
  return [[g.arms[sx], armLift(lift)], [g.arms[sx], H]];
}

function bag(spec, g) {
  const m = fabric(spec.mat, [2, 2]);
  const trim = toon(trimOf(spec));
  if (spec.style === 'backpack') {
    const B = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.22), m);
    body.position.set(0, 1.35, -0.5);
    const top = ball(0.25, m, 0, 1.62, -0.5, 18);
    top.scale.set(1, 0.35, 0.45);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.08), trim);
    pocket.position.set(0, 1.25, -0.63);
    B.add(body, top, pocket);
    for (const sx of [-1, 1]) {
      B.add(curveTube([[sx * 0.16, 1.55, -0.38], [sx * 0.17, 1.8, -0.12], [sx * 0.18, 1.72, 0.2], [sx * 0.21, 1.42, 0.3], [sx * 0.28, 1.18, 0.22], [sx * 0.31, 1.15, -0.2], [sx * 0.2, 1.2, -0.4]], 0.03, trim));
    }
    return [[g.root, B]];
  }
  if (spec.style === 'crossbody') {
    const B = new THREE.Group();
    B.add(curveTube([[-0.2, 1.8, 0.05], [-0.1, 1.62, 0.31], [0.12, 1.35, 0.35], [0.32, 1.12, 0.31], [0.43, 1.04, 0.22]], 0.022, trim));
    B.add(curveTube([[-0.2, 1.8, 0.05], [-0.12, 1.65, -0.3], [0.15, 1.35, -0.34], [0.38, 1.12, -0.18], [0.45, 1.04, 0.15]], 0.022, trim));
    const purse = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 28), m);
    purse.rotation.x = Math.PI / 2;
    purse.position.set(0.45, 0.97, 0.24);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 32), trim);
    rim.position.copy(purse.position);
    B.add(purse, rim);
    const o = ornament(spec, 0.07, 0.45, 0.97, 0.3);
    if (o) B.add(o);
    return [[g.root, B]];
  }
  // hand-held: handbag or a purse shaped like the theme's motif
  const parts = inHand(g, 1, 0.4);
  const H = parts[1][1];
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), trim);
  handle.position.y = -0.15;
  H.add(handle);
  if (spec.style === 'motifpurse') {
    const purse = motifMesh(spec.motif, 0.21, spec.mat.color);
    purse.position.y = -0.36;
    H.add(purse);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.14), m);
    body.position.y = -0.29;
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.09, 0.15), trim);
    flap.position.y = -0.19;
    H.add(body, flap);
    const o = ornament(spec, 0.07, 0, -0.29, 0.09);
    if (o) H.add(o);
  }
  return parts;
}

// ------------------------------------------------------------------ accessories

function acc(spec, g) {
  const color = spec.mat.color || '#ffffff';
  switch (spec.style) {
    case 'necklace': {
      const N = new THREE.Group();
      N.add(curveTube([[0, 1.87, -0.1], [0.14, 1.85, -0.02], [0.2, 1.73, 0.17], [0, 1.6, 0.315], [-0.2, 1.73, 0.17], [-0.14, 1.85, -0.02]], 0.014, toon(trimOf(spec)), true));
      const o = ornament(spec, 0.09, 0, 1.52, 0.335);
      if (o) N.add(o);
      return [[g.root, N]];
    }
    case 'glasses': {
      const G = new THREE.Group();
      const frame = toon(color);
      for (const sx of [-1, 1]) {
        const lens = motifMesh(spec.ornament.motif, 0.11, spec.ornament.color);
        lens.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 0.7; } });
        lens.position.set(sx * 0.17, -0.01, 0.52);
        G.add(lens);
        G.add(tube(new THREE.Vector3(sx * 0.27, 0, 0.48), new THREE.Vector3(sx * 0.46, 0.04, 0.08), 0.015, frame, 6));
      }
      G.add(tube(new THREE.Vector3(-0.08, 0.01, 0.53), new THREE.Vector3(0.08, 0.01, 0.53), 0.015, frame, 6));
      return [[g.head, G]];
    }
    case 'wand': {
      const parts = inHand(g, -1, 0.3);
      const H = parts[1][1];
      H.add(tube(new THREE.Vector3(0, -0.04, 0.02), new THREE.Vector3(0, 0.26, 0.4), 0.022, toon(color), 8));
      const tip = motifMesh(spec.ornament.motif, 0.13, spec.ornament.color);
      tip.position.set(0, 0.3, 0.45);
      H.add(tip);
      return parts;
    }
    default: { // balloon on a string, held in the right hand
      const B = new THREE.Group();
      B.add(curveTube([[-0.54, 0.97, 0.06], [-0.62, 1.6, 0.1], [-0.78, 2.3, 0.12], [-0.85, 2.72, 0.12]], 0.008, toon('#ffffff')));
      const ball3 = motifMesh(spec.ornament.motif, 0.3, spec.ornament.color);
      const holder = new THREE.Group();
      holder.position.set(-0.85, 3.0, 0.12);
      holder.add(ball3);
      B.add(holder);
      holder.userData.tick = (t) => { holder.position.y = 3.0 + Math.sin(t * 1.6) * 0.04; holder.rotation.z = Math.sin(t * 1.1) * 0.08; };
      return [[g.arms[-1], armLift(0.15)], [g.root, B]];
    }
  }
}

const BUILDERS = { shirt, skirt, pants, shorts: pants, dress, hat, shoes, bag, acc, pet };

/** Build an item and attach it to the girl. Returns the parts so it can be taken off. */
export function putOn(spec, girl) {
  const parts = BUILDERS[spec.cat](spec, girl);
  for (const [parent, obj] of parts) parent.add(obj);
  return parts;
}

export function takeOff(parts) {
  for (const [parent, obj] of parts) parent.remove(obj);
}
