import * as THREE from 'three';
import { toon, noOutline, ball, tube } from './toon.js';
import { patternTexture } from './patterns.js';
import { motifMesh } from './motifs.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Colours the player can pick for a pet. */
export const PET_COLORS = ['#ffffff', '#f2d2a0', '#ffb066', '#ff9a3c', '#c98a5a', '#8a5a3c', '#8f94b8', '#3a3550', '#ff9fb8', '#c39bff', '#7fd3ff', '#5ad17a', '#ffe066'];

/** Pet accessories: one per slot. */
export const PET_ACC_SLOT = { bow: 'head', partyhat: 'head', crown: 'head', flower: 'head', bandana: 'neck', bell: 'neck', glasses: 'face' };

// ------------------------------------------------------------------ helpers

function fabric(m, repeat = [2, 1]) {
  if (!m.pattern) return toon(m.color);
  const t = patternTexture(m.pattern).clone();
  t.needsUpdate = true;
  t.repeat.set(...repeat);
  return toon('#ffffff', { map: t });
}

function ring(r, tubeR, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 10, 40), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}

function curveTube(points, r, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => V(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, r, 8, false), mat);
}

const INK = noOutline(new THREE.MeshBasicMaterial({ color: '#2b1d3a' }));
const SHINE = noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
const BLUSH = noOutline(new THREE.MeshBasicMaterial({ color: '#ff9fb8' }));

/** Fur materials derived from one base colour. */
function kit(color) {
  const base = new THREE.Color(color);
  return {
    fur: toon(base),
    light: toon(base.clone().lerp(new THREE.Color('#ffffff'), 0.45)),
    dark: toon(base.clone().lerp(new THREE.Color('#3a2a2a'), 0.35)),
    pink: toon('#ff9fb8'),
  };
}

/** Two shiny cartoon eyes + blush on a head group. */
function face(head, { eye = 0.065, y = 0.02, z = 0.15, r = 0.032 } = {}) {
  for (const sx of [-1, 1]) {
    head.add(ball(r, INK, sx * eye, y, z, 10));
    head.add(ball(r * 0.35, SHINE, sx * eye - r * 0.3, y + r * 0.45, z + r * 0.85, 6));
    const cheek = ball(r * 0.9, BLUSH, sx * eye * 1.7, y - r * 1.4, z - r * 0.6, 8);
    cheek.scale.z = 0.3;
    head.add(cheek);
  }
}

/** Sitting body shared by cat, dog and bunny. */
function sittingBody(P, k) {
  const body = ball(0.2, k.fur, 0, 0.21, 0, 20);
  body.scale.set(1, 1.1, 0.95);
  const belly = ball(0.13, k.light, 0, 0.2, 0.1, 16);
  belly.scale.set(1, 1.2, 0.6);
  P.add(body, belly);
  for (const sx of [-1, 1]) P.add(ball(0.06, k.light, sx * 0.08, 0.04, 0.14, 10));
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.03);
  head.add(ball(0.17, k.fur, 0, 0, 0, 22));
  P.add(head);
  face(head);
  const tail = new THREE.Group();
  tail.position.set(0, 0.12, -0.16);
  P.add(tail);
  return { head, tail };
}

const sitAnchors = (P, head, top = V(0, 0.16, 0)) => ({
  head: { parent: head, pos: top, s: 1 },
  face: { parent: head, pos: V(0, 0.02, 0.17), eye: 0.065 },
  neck: { parent: P, pos: V(0, 0.37, 0), r: 0.12 },
});

// ------------------------------------------------------------------ animals
// Each returns { P, anchors, tick(t), hop } — P faces +z, sits at y=0.

function cat(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const { head, tail } = sittingBody(P, k);
  head.add(ball(0.022, k.pink, 0, -0.03, 0.17, 8));
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.1, 0.13, 0);
    ear.rotation.z = -sx * 0.35;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.13, 12), k.fur);
    outer.position.y = 0.04;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10), k.pink);
    inner.position.set(0, 0.03, 0.03);
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }
  tail.add(curveTube([[0, 0, 0], [0.15, -0.03, -0.08], [0.25, 0.12, -0.05], [0.22, 0.3, 0]], 0.03, k.fur));
  return {
    P, hop: true, anchors: sitAnchors(P, head),
    tick(t) { tail.rotation.z = Math.sin(t * 3) * 0.35; head.rotation.z = Math.sin(t * 1.3) * 0.12; ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2 + i) * 0.08; }); },
  };
}

function dog(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const { head, tail } = sittingBody(P, k);
  const snout = ball(0.08, k.light, 0, -0.05, 0.14, 14);
  snout.scale.set(1.2, 0.85, 1);
  head.add(snout, ball(0.028, INK, 0, -0.02, 0.225, 8));
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = ball(0.08, k.dark, sx * 0.16, -0.02, 0, 12);
    ear.scale.set(0.55, 1.3, 0.5);
    ear.rotation.z = sx * 0.25;
    head.add(ear);
    ears.push(ear);
  }
  tail.add(curveTube([[0, 0, 0], [0, 0.15, -0.1], [0.04, 0.28, -0.08]], 0.035, k.fur));
  return {
    P, hop: true, anchors: sitAnchors(P, head),
    tick(t) { tail.rotation.z = Math.sin(t * 9) * 0.4; head.rotation.z = Math.sin(t * 1.3) * 0.12; ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2 + i) * 0.1; }); },
  };
}

function bunny(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const { head, tail } = sittingBody(P, k);
  head.add(ball(0.022, k.pink, 0, -0.03, 0.17, 8));
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.01), SHINE);
  teeth.position.set(0, -0.085, 0.16);
  head.add(teeth);
  const ears = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.06, 0.13, -0.02);
    ear.rotation.z = -sx * 0.12;
    const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 6, 10), k.fur);
    outer.position.y = 0.14;
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.15, 6, 8), k.pink);
    inner.position.set(0, 0.14, 0.03);
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }
  tail.add(ball(0.07, toon('#ffffff'), 0, -0.02, -0.04, 12));
  return {
    P, hop: true, anchors: sitAnchors(P, head, V(0, 0.12, 0.08)),
    tick(t) { head.rotation.z = Math.sin(t * 1.3) * 0.1; ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2.4 + i) * 0.12; }); },
  };
}

function ferret(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 8, 16), k.fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.14;
  P.add(body);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.3, 6, 12), k.light);
  belly.rotation.z = Math.PI / 2;
  belly.position.set(0, 0.1, 0.05);
  P.add(belly);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.add(ball(0.045, k.dark, sx * 0.2, 0.04, sz * 0.06, 10));
  const tail = new THREE.Group();
  tail.position.set(-0.3, 0.15, 0);
  const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), k.dark);
  tailMesh.rotation.z = Math.PI / 2 - 0.4;
  tailMesh.position.set(-0.13, 0.05, 0);
  tail.add(tailMesh);
  P.add(tail);

  const head = new THREE.Group();
  head.position.set(0.3, 0.24, 0.05);
  const skull = ball(0.11, k.fur, 0, 0, 0, 20);
  skull.scale.set(1, 0.9, 1.15);
  head.add(skull);
  const mask = ball(0.06, k.dark, 0, 0.028, 0.07, 14);
  mask.scale.set(1.7, 0.55, 0.65);
  head.add(mask);
  const snout = ball(0.055, k.light, 0, -0.03, 0.09, 12);
  head.add(snout, ball(0.016, k.pink, 0, -0.01, 0.145, 8));
  face(head, { eye: 0.042, y: 0.03, z: 0.105, r: 0.022 });
  for (const sx of [-1, 1]) head.add(ball(0.035, k.light, sx * 0.075, 0.08, -0.01, 10));
  P.add(head);
  return {
    P, hop: true,
    anchors: {
      head: { parent: head, pos: V(0, 0.1, 0), s: 0.65 },
      face: { parent: head, pos: V(0, 0.03, 0.12), eye: 0.042 },
      neck: { parent: head, pos: V(0, -0.08, -0.02), r: 0.075 },
    },
    tick(t) { tail.rotation.y = Math.sin(t * 2.5) * 0.5; head.rotation.z = Math.sin(t * 1.6) * 0.15; head.rotation.y = Math.sin(t * 0.9) * 0.2; },
  };
}

function hamster(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const body = ball(0.2, k.fur, 0, 0.18, 0, 22);
  body.scale.set(1.1, 0.95, 1);
  const belly = ball(0.13, k.light, 0, 0.13, 0.12, 16);
  belly.scale.set(1, 1, 0.5);
  P.add(body, belly);
  face(P, { eye: 0.07, y: 0.24, z: 0.17, r: 0.028 });
  P.add(ball(0.018, k.pink, 0, 0.2, 0.2, 8));
  for (const sx of [-1, 1]) {
    P.add(ball(0.06, k.light, sx * 0.1, 0.17, 0.14, 12));
    P.add(ball(0.045, k.fur, sx * 0.11, 0.34, 0.03, 10));
    P.add(ball(0.025, k.pink, sx * 0.11, 0.34, 0.06, 8));
    P.add(ball(0.03, k.light, sx * 0.06, 0.08, 0.18, 8));
  }
  return {
    P, hop: true,
    anchors: {
      head: { parent: P, pos: V(0, 0.36, 0.02), s: 0.9 },
      face: { parent: P, pos: V(0, 0.24, 0.19), eye: 0.07 },
      neck: { parent: P, pos: V(0, 0.26, 0), r: 0.21 },
    },
    tick(t) { P.rotation.z = Math.sin(t * 1.4) * 0.05; },
  };
}

function bird(color) {
  const k = kit(color);
  const wood = toon('#b07a4a');
  const P = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 24), wood);
  base.position.y = 0.025;
  P.add(base);
  P.add(tube(V(0, 0.05, -0.05), V(0, 0.6, -0.05), 0.022, wood, 8));
  P.add(tube(V(-0.2, 0.6, -0.05), V(0.2, 0.6, -0.05), 0.02, wood, 8));

  const B = new THREE.Group();
  B.position.set(0, 0.6, -0.02);
  P.add(B);
  const body = ball(0.1, k.fur, 0, 0.13, 0, 18);
  body.scale.set(1, 1.25, 0.95);
  const belly = ball(0.07, k.light, 0, 0.11, 0.06, 14);
  belly.scale.set(1, 1.3, 0.6);
  B.add(body, belly);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.08, 0.18, 0);
    const wm = ball(0.07, k.dark, sx * 0.015, -0.05, -0.01, 12);
    wm.scale.set(0.35, 1, 0.8);
    w.add(wm);
    B.add(w);
    wings.push(w);
    B.add(ball(0.02, toon('#ff9a3c'), sx * 0.03, 0.02, 0.03, 8));
  }
  const tailM = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), k.dark);
  tailM.rotation.x = -2.5;
  tailM.position.set(0, 0.04, -0.09);
  tailM.scale.z = 0.4;
  B.add(tailM);
  const head = new THREE.Group();
  head.position.set(0, 0.27, 0.02);
  head.add(ball(0.085, k.fur, 0, 0, 0, 18));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 10), toon('#ff9a3c'));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.015, 0.09);
  head.add(beak);
  face(head, { eye: 0.04, y: 0.02, z: 0.072, r: 0.018 });
  B.add(head);
  return {
    P, hop: false,
    anchors: {
      head: { parent: head, pos: V(0, 0.08, 0), s: 0.55 },
      face: { parent: head, pos: V(0, 0.025, 0.085), eye: 0.04 },
      neck: { parent: B, pos: V(0, 0.21, 0.01), r: 0.075 },
    },
    tick(t) {
      const flap = t % 2.6 < 0.45 ? Math.sin(t * 40) * 0.6 : 0;
      wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.abs(flap); });
      head.rotation.z = Math.sin(t * 1.7) * 0.2;
      B.position.y = 0.6 + (t % 2.6 < 0.45 ? Math.sin(((t % 2.6) / 0.45) * Math.PI) * 0.06 : 0);
    },
  };
}

function turtle(color) {
  const shell = kit(color);
  const skin = kit('#a8d86b');
  const P = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 12, 0, TAU, 0, Math.PI / 2), shell.fur);
  dome.scale.set(1, 0.75, 1.2);
  dome.position.y = 0.06;
  P.add(dome);
  const rim = ring(0.24, 0.03, shell.dark);
  rim.scale.set(1, 1.2, 1);
  rim.position.y = 0.06;
  P.add(rim);
  for (const [x, z, r] of [[0, 0, 0.07], [0.11, 0.09, 0.045], [-0.11, 0.09, 0.045], [0.11, -0.1, 0.045], [-0.11, -0.1, 0.045]]) {
    const spot = ball(r, shell.light, x, 0.06 + Math.sqrt(Math.max(0, 1 - (x * x + (z / 1.2) ** 2) / 0.0576)) * 0.18, z, 12);
    spot.scale.y = 0.35;
    P.add(spot);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = ball(0.06, skin.fur, sx * 0.18, 0.04, sz * 0.16, 10);
    leg.scale.set(1, 0.6, 1.2);
    P.add(leg);
  }
  P.add(tube(V(0, 0.07, 0.2), V(0, 0.12, 0.3), 0.05, skin.fur, 10));
  const head = new THREE.Group();
  head.position.set(0, 0.14, 0.33);
  const hm = ball(0.09, skin.fur, 0, 0, 0, 16);
  hm.scale.set(1, 0.9, 1.1);
  head.add(hm);
  face(head, { eye: 0.04, y: 0.02, z: 0.08, r: 0.02 });
  P.add(head);
  return {
    P, hop: false,
    anchors: {
      head: { parent: head, pos: V(0, 0.08, 0), s: 0.55 },
      face: { parent: head, pos: V(0, 0.025, 0.095), eye: 0.04 },
      neck: { parent: P, pos: V(0, 0.1, 0.25), r: 0.065 },
    },
    tick(t) { head.position.z = 0.33 + Math.sin(t * 1.2) * 0.025; head.rotation.y = Math.sin(t * 0.8) * 0.3; },
  };
}

function fish(color) {
  const k = kit(color);
  const P = new THREE.Group();
  const glass = noOutline(new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const water = noOutline(new THREE.MeshBasicMaterial({ color: '#9fe3ff', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  const R = 0.32;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24, 0, TAU, 0.2 * Math.PI, 0.8 * Math.PI), glass);
  bowl.position.y = R;
  const rimY = R + R * Math.cos(0.2 * Math.PI);
  const rimR = R * Math.sin(0.2 * Math.PI);
  const rim = ring(rimR, 0.022, toon('#bfe9ff'));
  rim.position.y = rimY;
  const wBody = new THREE.Mesh(new THREE.SphereGeometry(R - 0.02, 32, 20, 0, TAU, 0.38 * Math.PI, 0.62 * Math.PI), water);
  wBody.position.y = R;
  const surf = new THREE.Mesh(new THREE.CircleGeometry((R - 0.02) * Math.sin(0.38 * Math.PI), 40), water);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = R + (R - 0.02) * Math.cos(0.38 * Math.PI);
  P.add(bowl, rim, wBody, surf);
  const pebbles = ['#ff9fb8', '#ffe066', '#7fd3ff', '#c39bff', '#ffffff'];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU, r = 0.04 + (i % 3) * 0.05;
    P.add(ball(0.03, toon(pebbles[i % pebbles.length]), Math.cos(a) * r, 0.04 + (i % 2) * 0.015, Math.sin(a) * r, 8));
  }
  for (const [x, z, h] of [[-0.09, -0.06, 0.16], [-0.04, -0.1, 0.11]]) {
    const leaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, h, 4, 8), toon('#3fae4a'));
    leaf.position.set(x, 0.06 + h / 2, z);
    leaf.rotation.z = x * 2;
    P.add(leaf);
  }
  // goldfish swimming in a circle
  const orbit = new THREE.Group();
  orbit.position.y = 0.26;
  P.add(orbit);
  const F = new THREE.Group();
  F.position.x = 0.13;
  F.rotation.y = Math.PI / 2;
  orbit.add(F);
  const fb = ball(0.065, k.fur, 0, 0, 0, 16);
  fb.scale.set(1.4, 1, 0.75);
  F.add(fb);
  const tailG = new THREE.Group();
  tailG.position.x = -0.08;
  const tailM = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 4), k.light);
  tailM.rotation.z = Math.PI / 2;
  tailM.position.x = -0.03;
  tailM.scale.z = 0.3;
  tailG.add(tailM);
  F.add(tailG);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), k.light);
  fin.position.set(-0.01, 0.07, 0);
  fin.scale.z = 0.3;
  F.add(fin);
  for (const sz of [-1, 1]) {
    F.add(ball(0.014, INK, 0.06, 0.02, sz * 0.042, 8));
    F.add(ball(0.005, SHINE, 0.066, 0.026, sz * 0.05, 6));
  }
  return {
    P, hop: false,
    anchors: {
      head: { parent: F, pos: V(0.02, 0.055, 0), s: 0.7 },
      face: { parent: F, pos: V(0.085, 0.02, 0), eye: 0.04, rotY: Math.PI / 2 },
      neck: { parent: P, pos: V(0, rimY, 0), r: rimR + 0.02 },
    },
    tick(t) {
      orbit.rotation.y = t * 0.8;
      F.position.y = Math.sin(t * 2.2) * 0.02;
      tailG.rotation.y = Math.sin(t * 9) * 0.5;
    },
  };
}

const ANIMALS = { cat, dog, bunny, ferret, hamster, bird, turtle, fish };

/** Build a pet beside the podium. Returns parts like any clothing item. */
export function pet(spec, g) {
  const { P, anchors, tick, hop } = ANIMALS[spec.style](spec.mat.color);
  // collar with a little theme tag (the bowl gets a ribbon instead)
  if (spec.style !== 'fish') {
    const n = anchors.neck;
    const collar = ring(n.r, 0.022, toon(spec.trim || '#ff7eb6'));
    collar.position.copy(n.pos);
    n.parent.add(collar);
    anchors.collar = [collar];
    if (spec.ornament) {
      const tag = motifMesh(spec.ornament.motif, 0.045, spec.ornament.color);
      tag.position.copy(n.pos).add(V(0, -0.045, n.r + 0.02));
      n.parent.add(tag);
      anchors.collar.push(tag);
    }
  } else anchors.collar = [];

  // a round cushion beside the podium, level with it
  const holder = new THREE.Group();
  holder.position.set(-0.95, 0, 1.2); // front-left of the podium, visible on phones too
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.22, 36), toon('#ffffff'));
  cushion.position.y = -0.11;
  const piping = ring(0.42, 0.035, toon(spec.trim || '#ff7eb6'));
  piping.position.y = 0;
  holder.add(cushion, piping);
  const body = new THREE.Group();
  body.add(P);
  body.rotation.y = spec.style === 'ferret' ? -0.9 : 0.45;
  body.scale.setScalar(1.35);
  holder.add(body);
  holder.userData.anchors = anchors;
  holder.userData.tick = (t) => {
    tick(t);
    const h = t % 3.2;
    P.position.y = hop && h < 0.35 ? Math.sin((h / 0.35) * Math.PI) * 0.1 : 0;
  };
  return [[g.root, holder]];
}

// ------------------------------------------------------------------ pet accessories

/** Put a pet accessory on the pet whose anchors are given. Returns parts. */
export function putOnPet(spec, anchors) {
  const slot = PET_ACC_SLOT[spec.style];
  const a = anchors?.[slot];
  if (!a) return [];
  const G = new THREE.Group();
  G.position.copy(a.pos);
  if (a.rotY) G.rotation.y = a.rotY;
  const m = fabric(spec.mat);
  const trim = toon(spec.trim || '#ffffff');

  switch (spec.style) {
    case 'bow':
      for (const sx of [-1, 1]) {
        const lobe = ball(0.055, m, sx * 0.055, 0, 0, 14);
        lobe.scale.set(1.2, 0.8, 0.5);
        lobe.rotation.z = sx * 0.35;
        G.add(lobe);
      }
      G.add(ball(0.025, trim, 0, 0, 0.01, 8));
      G.position.x += 0.06 * a.s;
      G.rotation.z = -0.3;
      break;
    case 'partyhat': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 20), m);
      cone.position.y = 0.075;
      G.add(cone, ball(0.025, trim, 0, 0.16, 0, 8));
      const brim = ring(0.06, 0.012, trim);
      G.add(brim);
      G.rotation.z = 0.2;
      break;
    }
    case 'crown': {
      const geo = new THREE.CylinderGeometry(0.065, 0.06, 0.05, 40, 1, true);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) <= 0) continue;
        const ph = ((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) / TAU) * 5;
        p.setY(i, p.getY(i) + 0.035 * (1 - Math.abs(2 * (ph - Math.floor(ph)) - 1)));
      }
      geo.computeVertexNormals();
      G.add(new THREE.Mesh(geo, toon('#ffcf3a', { side: THREE.DoubleSide })));
      if (spec.ornament) {
        const gem = motifMesh(spec.ornament.motif, 0.025, spec.ornament.color);
        gem.position.set(0, 0.005, 0.068);
        G.add(gem);
      }
      G.position.y += 0.01 * a.s;
      break;
    }
    case 'flower': {
      const f = motifMesh('flower', 0.055, spec.mat.color);
      f.position.set(0.06, 0, 0.03);
      f.rotation.x = -0.4;
      G.add(f);
      break;
    }
    case 'bandana': {
      G.add(ring(a.r + 0.012, 0.022, m));
      const tri = new THREE.Mesh(new THREE.ConeGeometry(a.r * 0.85, a.r * 1.2, 3), m);
      tri.rotation.set(Math.PI, Math.PI / 6, 0);
      tri.scale.z = 0.3;
      tri.position.set(0, -a.r * 0.45, a.r * 0.95);
      G.add(tri);
      break;
    }
    case 'bell': {
      G.add(ring(a.r + 0.008, 0.02, m));
      G.add(ball(0.032, toon('#ffcf3a'), 0, -0.035, a.r + 0.025, 12));
      G.add(ball(0.008, INK, 0, -0.05, a.r + 0.055, 6));
      break;
    }
    case 'glasses': {
      const size = a.eye * 0.75;
      for (const sx of [-1, 1]) {
        const lens = motifMesh(spec.ornament?.motif || 'heart', size, spec.ornament?.color || '#ff7eb6');
        lens.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 0.75; } });
        lens.position.set(sx * a.eye, 0, 0.012);
        G.add(lens);
      }
      G.add(tube(V(-a.eye * 0.4, 0, 0.012), V(a.eye * 0.4, 0, 0.012), 0.006, toon(spec.mat.color || '#2b1d3a'), 6));
      break;
    }
  }
  if (slot === 'head') G.scale.setScalar(a.s);
  a.parent.add(G);
  return [[a.parent, G]];
}
