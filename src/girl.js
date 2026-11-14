import * as THREE from 'three';
import { toon, noOutline, tube, ball } from './toon.js';

const V2 = (r, y) => new THREE.Vector2(r, y);

// Bodysuit torso profile (radius, height) — clothes are built just outside it.
export const TORSO = [[0, 0.98], [0.24, 1.0], [0.29, 1.1], [0.28, 1.25], [0.23, 1.4], [0.26, 1.55], [0.27, 1.65], [0.22, 1.75], [0.1, 1.8], [0, 1.8]];
export const SHOULDER_X = 0.3;
export const SHOULDER_Y = 1.66;
export const HEAD_Y = 2.32;
export const LEG_X = 0.14;

/**
 * Chibi cartoon girl in a plain bodysuit. Origin at her feet, facing +z.
 * Anchors for clothes: root, head, arms[+1] (her left, +x) and arms[-1].
 */
export function createGirl() {
  const root = new THREE.Group();
  const body = [];
  const add = (parent, mesh) => { parent.add(mesh); body.push(mesh); return mesh; };

  const skin = toon('#ffd8c0');
  const suit = toon('#eeeaf6');
  const hair = toon('#7a3e22');
  const ribbon = toon('#ff7eb6');
  const ink = noOutline(new THREE.MeshBasicMaterial({ color: '#2b1d3a' }));
  const white = noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const blush = noOutline(new THREE.MeshBasicMaterial({ color: '#ff9bb8' }));

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.82, 6, 14), skin);
    leg.position.set(sx * LEG_X, 0.6, 0);
    add(root, leg);
    const foot = ball(0.12, skin, sx * LEG_X, 0.07, 0.06, 16);
    foot.scale.set(1, 0.6, 1.6);
    add(root, foot);
  }

  add(root, new THREE.Mesh(new THREE.LatheGeometry(TORSO.map(([r, y]) => V2(r, y)), 40), suit));
  add(root, tube(new THREE.Vector3(0, 1.74, 0), new THREE.Vector3(0, 1.98, 0), 0.075, skin, 12));

  // Arms hang from the shoulders, angled slightly out.
  const arms = {};
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * SHOULDER_X, SHOULDER_Y, 0);
    arm.rotation.z = sx * 0.2;
    arm.userData.side = sx;
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.5, 6, 12), skin);
    upper.position.y = -0.33;
    add(arm, upper);
    add(arm, ball(0.1, skin, 0, -0.71, 0, 14));
    root.add(arm);
    arms[sx] = arm;
  }

  // Head
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  root.add(head);
  add(head, ball(0.5, skin, 0, 0, 0, 36));
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eye = ball(0.075, ink, sx * 0.17, -0.02, 0.465, 16);
    eye.scale.set(0.8, 1.2, 0.45);
    add(head, eye);
    eyes.push(eye);
    const shine = ball(0.028, white, sx * 0.17 - 0.025, 0.035, 0.5, 8);
    add(head, shine);
    eyes.push(shine);
    const cheek = ball(0.07, blush, sx * 0.29, -0.14, 0.41, 12);
    cheek.scale.set(1, 0.6, 0.25);
    add(head, cheek);
  }
  add(head, ball(0.035, skin, 0, -0.08, 0.5, 10));
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI), ink);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.17, 0.475);
  add(head, mouth);

  // Hair: cap tilted back, bangs, long back hair, pigtail buns with ribbons
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.545, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
  cap.rotation.x = -0.42;
  add(head, cap);
  for (const x of [-0.28, -0.14, 0, 0.14, 0.28]) {
    const b = ball(0.13, hair, x, 0.27 - Math.abs(x) * 0.35, 0.43 - Math.abs(x) * 0.25, 14);
    b.scale.set(1, 0.75, 0.6);
    add(head, b);
  }
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.5, 8, 16), hair);
  back.position.set(0, -0.42, -0.22);
  back.scale.set(1.15, 1, 0.55);
  add(head, back);
  for (const sx of [-1, 1]) {
    add(head, ball(0.18, hair, sx * 0.5, 0.0, -0.1, 16));
    const tail = ball(0.16, hair, sx * 0.6, -0.3, -0.1, 14);
    tail.scale.set(0.85, 1.4, 0.85);
    add(head, tail);
    const bow = ball(0.07, ribbon, sx * 0.47, 0.15, 0.0, 10);
    bow.scale.set(1.6, 0.8, 0.8);
    add(head, bow);
  }

  let blinkT = 2;
  const state = { hop: 0 };

  return {
    root,
    head,
    arms,
    setBodyVisible(v) { body.forEach((m) => { m.visible = v; }); },
    hop() { state.hop = 0.0001; },
    update(dt, t) {
      for (const sx of [-1, 1]) {
        // held items (bags, wands…) leave a marker asking to raise the arm a little
        const lift = arms[sx].children.reduce((m, c) => Math.max(m, c.userData.armLift || 0), 0);
        arms[sx].rotation.z = sx * (0.2 + lift + 0.05 * Math.sin(t * 1.8 + sx));
      }
      head.rotation.z = Math.sin(t * 1.2) * 0.05;
      head.rotation.y = Math.sin(t * 0.7) * 0.08;
      blinkT -= dt;
      const closed = blinkT < 0.12;
      if (blinkT < 0) blinkT = 2 + Math.random() * 2.5;
      eyes.forEach((e, i) => { e.scale.y = i % 2 === 0 ? (closed ? 0.15 : 1.2) : closed ? 0.01 : 1; });
      if (state.hop > 0) {
        state.hop += dt / 0.45;
        const k = Math.min(1, state.hop);
        root.position.y = root.userData.baseY + Math.sin(k * Math.PI) * 0.25;
        const sq = Math.sin(k * Math.PI * 2) * 0.05;
        root.scale.set(1 - sq, 1 + sq, 1 - sq);
        if (k >= 1) { state.hop = 0; root.scale.setScalar(1); }
      } else {
        root.position.y = root.userData.baseY ?? root.position.y;
      }
    },
  };
}
