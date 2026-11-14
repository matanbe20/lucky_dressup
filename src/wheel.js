import * as THREE from 'three';
import { toon, noOutline, tube, ball } from './toon.js';
import { drawIcon, INK } from './icons.js';

export const R = 2.6;
const TAU = Math.PI * 2;
const TEX = 1024;
const easeOutBack = (k) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

const BULB_ON = new THREE.Color('#fff7b0');
const BULB_OFF = new THREE.Color('#ff8a3d');

/**
 * The lucky wheel: a rotor (face texture, rim, bulbs, pegs, hub) on a stand,
 * with a springy pointer at the top. Wedge i is centred at angle i*seg
 * (counter-clockwise from +x) in rotor space.
 */
export class Wheel {
  constructor(items, groundOffset) {
    this.items = items.map((it) => ({ ...it, away: false, popT: 1 }));
    this.n = items.length;
    this.seg = TAU / this.n;
    this.hl = -1;
    this.hlT = 0;
    this.pAng = 0;
    this.pVel = 0;

    this.group = new THREE.Group();
    this.rotor = new THREE.Group();
    this.group.add(this.rotor);

    // Face: one canvas texture holding all 8 wedges + icons.
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = TEX;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 128), noOutline(new THREE.MeshBasicMaterial({ map: this.texture })));
    face.position.z = 0.01;
    this.rotor.add(face);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, 0.4, 96), toon('#ff6fae'));
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.2;
    this.rotor.add(body);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.03, 0.14, 16, 160), toon('#ffcf3a'));
    rim.position.z = 0.03;
    this.rotor.add(rim);

    this.bulbs = [];
    const bulbGeo = new THREE.SphereGeometry(0.075, 12, 10);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU;
      const m = new THREE.Mesh(bulbGeo, noOutline(new THREE.MeshBasicMaterial({ color: BULB_ON })));
      m.position.set(Math.cos(a) * R * 1.03, Math.sin(a) * R * 1.03, 0.15);
      this.rotor.add(m);
      this.bulbs.push(m);
    }

    const pegMat = toon('#ffffff');
    for (let i = 0; i < this.n; i++) {
      const a = i * this.seg + this.seg / 2;
      this.rotor.add(ball(0.085, pegMat, Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93, 0.08, 14));
    }

    const hub = ball(0.46, toon('#ff4f8b'), 0, 0, 0.05, 32);
    hub.scale.z = 0.6;
    this.rotor.add(hub);
    this.rotor.add(ball(0.09, noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff' })), -0.15, 0.16, 0.28, 12));

    // Stand
    const standMat = toon('#9b6bff');
    const g = groundOffset;
    for (const sx of [-1, 1]) {
      this.group.add(tube(new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(sx * 1.9, g + 0.3, -0.65), 0.17, standMat));
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, 0.42, 48), toon('#7c4dff'));
    base.scale.set(2.7, 1, 0.9);
    base.position.set(0, g + 0.21, -0.65);
    this.group.add(base);

    // Pointer: post behind the wheel, arm over the top, teardrop flapper.
    const top = R + 0.45;
    this.group.add(tube(new THREE.Vector3(0, g + 0.3, -0.8), new THREE.Vector3(0, top, -0.8), 0.12, standMat));
    this.group.add(tube(new THREE.Vector3(0, top, -0.8), new THREE.Vector3(0, top, 0.3), 0.12, standMat));
    this.group.add(ball(0.12, standMat, 0, top, -0.8, 14));

    const shape = new THREE.Shape();
    shape.moveTo(0, -0.62);
    shape.lineTo(0.28, 0.0);
    shape.absarc(0, 0.15, 0.32, -0.49, Math.PI + 0.49, false);
    shape.lineTo(0, -0.62);
    const pgeo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 24 });
    pgeo.translate(0, -0.15, -0.1);
    this.pointer = new THREE.Group();
    this.pointer.position.set(0, top, 0.4);
    this.pointer.add(new THREE.Mesh(pgeo, toon('#ff4d6d')));
    this.pointer.add(ball(0.11, toon('#fff3b0'), 0, 0, 0.2, 16));
    this.group.add(this.pointer);

    this.dirty = true;
  }

  get angle() { return this.rotor.rotation.z; }
  set angle(v) { this.rotor.rotation.z = v; }

  /** Wedge index currently under the pointer. */
  indexAtPointer() {
    const i = Math.round((Math.PI / 2 - this.angle) / this.seg);
    return ((i % this.n) + this.n) % this.n;
  }

  /** World position of wedge i's icon. */
  iconWorldPos(i, target = new THREE.Vector3()) {
    const a = i * this.seg;
    return this.rotor.localToWorld(target.set(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 0.2));
  }

  setAway(i, away) { this.items[i].away = away; this.dirty = true; }

  /** Spiders that ran off pop back into their wedges. Returns how many. */
  restoreAll() {
    let n = 0;
    for (const it of this.items) if (it.away) { it.away = false; it.popT = 0; n++; }
    this.dirty = true;
    return n;
  }

  highlight(i) { this.hl = i; this.hlT = 0; this.hlSettled = false; this.dirty = true; }
  clearHighlight() { if (this.hl >= 0) { this.hl = -1; this.dirty = true; } }

  kickPointer(dir, strength) { this.pVel += dir * (4 + 6 * strength); }

  update(dt, t, mode) {
    // springy flapper
    this.pVel += (-this.pAng * 260 - this.pVel * 14) * dt;
    this.pAng = Math.max(-0.6, Math.min(0.6, this.pAng + this.pVel * dt));
    this.pointer.rotation.z = this.pAng;

    this.bulbs.forEach((b, k) => {
      let on;
      if (mode === 'spinning') on = (k + Math.floor(t * 16)) % 3 === 0;
      else if (mode === 'won') on = (k + Math.floor(t * 7)) % 2 === 0;
      else if (mode === 'spider') on = Math.floor(t * 10) % 2 === 0;
      else on = (k + Math.floor(t * 4)) % 4 < 2;
      b.material.color.copy(on ? BULB_ON : BULB_OFF);
    });

    for (const it of this.items) {
      if (it.popT < 1) { it.popT = Math.min(1, it.popT + dt / 0.5); this.dirty = true; }
    }
    if (this.hl >= 0) {
      this.hlT += dt;
      if (this.hlT < 2.6) this.dirty = true;
      else if (!this.hlSettled) { this.hlSettled = true; this.dirty = true; }
    }
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  draw() {
    const c = this.ctx, cx = TEX / 2, r = TEX / 2 - 4, seg = this.seg;
    const pulsing = this.hl >= 0 && this.hlT < 2.6;
    c.clearRect(0, 0, TEX, TEX);
    const wedge = (a) => {
      c.beginPath();
      c.moveTo(cx, cx);
      c.arc(cx, cx, r, -(a - seg / 2), -(a + seg / 2), true);
      c.closePath();
    };

    this.items.forEach((it, i) => {
      wedge(i * seg);
      const g = c.createRadialGradient(cx, cx, r * 0.15, cx, cx, r);
      g.addColorStop(0, it.light);
      g.addColorStop(1, it.color);
      c.fillStyle = g;
      c.fill();
      if (i === this.hl) {
        c.fillStyle = `rgba(255,255,255,${pulsing ? 0.25 + 0.25 * Math.sin(this.hlT * 10) : 0.25})`;
        c.fill();
      }
    });

    c.lineCap = 'round';
    c.lineWidth = 12;
    c.strokeStyle = '#fff';
    for (let i = 0; i < this.n; i++) {
      const a = i * seg + seg / 2;
      c.beginPath();
      c.moveTo(cx, cx);
      c.lineTo(cx + Math.cos(a) * r, cx - Math.sin(a) * r);
      c.stroke();
    }
    if (this.hl >= 0) {
      wedge(this.hl * seg);
      c.lineJoin = 'round';
      c.lineWidth = 18;
      c.strokeStyle = '#fff36b';
      c.stroke();
    }
    c.beginPath();
    c.arc(cx, cx, r - 7, 0, TAU);
    c.lineWidth = 14;
    c.strokeStyle = INK;
    c.stroke();

    this.items.forEach((it, i) => {
      const a = i * seg;
      let sc = Math.max(0.001, easeOutBack(it.popT));
      if (i === this.hl && pulsing) sc *= 1 + 0.14 * Math.max(0, Math.sin(this.hlT * 10));
      if (it.away && it.kind !== 'spider') return; // flew off into the sky
      c.save();
      c.translate(cx + Math.cos(a) * r * 0.62, cx - Math.sin(a) * r * 0.62);
      c.rotate(-a + Math.PI / 2);
      c.scale(sc, sc);
      drawIcon(c, it.key, r * 0.2, { away: it.away });
      c.restore();
    });
    this.texture.needsUpdate = true;
  }
}
