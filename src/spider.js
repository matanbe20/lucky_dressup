import * as THREE from 'three';
import { toon, noOutline, tube, ball } from './toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * A cartoon 3D spider. Root sits on the ground, faces +z.
 * Call update(time, gait, freq) each frame to animate the legs.
 */
export function createSpider() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.62;
  root.add(body);

  const dark = toon('#3d2a5c');
  const dark2 = toon('#55397f');
  const pink = toon('#ff7eb6');
  const white = toon('#ffffff');
  const ink = noOutline(new THREE.MeshBasicMaterial({ color: '#1a1024' }));
  const shine = noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff' }));

  const abdomen = ball(0.52, dark, 0, 0.12, -0.45, 28);
  abdomen.scale.set(1, 0.85, 1.15);
  body.add(abdomen);
  body.add(ball(0.12, pink, 0, 0.53, -0.4, 14));
  body.add(ball(0.08, pink, 0.2, 0.45, -0.68, 12));
  body.add(ball(0.08, pink, -0.2, 0.45, -0.68, 12));

  body.add(ball(0.4, dark2, 0, 0.05, 0.2, 28));
  for (const sx of [-1, 1]) {
    body.add(ball(0.15, white, sx * 0.15, 0.17, 0.5, 18));
    body.add(ball(0.075, ink, sx * 0.15, 0.17, 0.64, 12));
    body.add(ball(0.025, shine, sx * 0.15 - 0.03, 0.21, 0.71, 8));
    const cheek = ball(0.06, noOutline(new THREE.MeshBasicMaterial({ color: '#ff8fb8' })), sx * 0.27, -0.02, 0.5, 10);
    cheek.scale.z = 0.4;
    body.add(cheek);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), white);
    fang.rotation.x = Math.PI;
    fang.position.set(sx * 0.055, -0.14, 0.55);
    body.add(fang);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 16, Math.PI), ink);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.06, 0.57);
  body.add(mouth);

  // 8 legs: hip (yaw) → upper (lift) → two segments down to a pink foot.
  const legs = [];
  const zs = [0.28, 0.1, -0.1, -0.3];
  const yaws = [-0.8, -0.3, 0.2, 0.7];
  const knee = V(0.5, 0.38, 0), foot = V(0.85, -0.6, 0);
  for (const side of [1, -1]) {
    for (let k = 0; k < 4; k++) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.22, 0, zs[k]);
      const baseYaw = side === 1 ? yaws[k] : Math.PI - yaws[k];
      hip.rotation.y = baseYaw;
      const upper = new THREE.Group();
      upper.add(tube(V(0, 0, 0), knee, 0.055, dark, 8));
      upper.add(ball(0.075, dark, knee.x, knee.y, 0, 12));
      upper.add(tube(knee, foot, 0.045, dark, 8));
      upper.add(ball(0.065, pink, foot.x, foot.y, 0, 12));
      hip.add(upper);
      body.add(hip);
      legs.push({ hip, upper, side, baseYaw, phase: (k % 2 === 0) !== (side === 1) ? 0 : Math.PI });
    }
  }

  function update(time, gait = 1, freq = 20) {
    for (const l of legs) {
      const ph = time * freq + l.phase;
      l.hip.rotation.y = l.baseYaw - l.side * Math.sin(ph) * 0.38 * gait;
      l.upper.rotation.z = Math.max(0, Math.cos(ph)) * 0.45 * gait;
    }
    body.position.y = 0.62 + Math.abs(Math.sin(time * freq)) * 0.06 * gait;
  }

  return { root, body, update };
}
