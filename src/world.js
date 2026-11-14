import * as THREE from 'three';
import { toon, noOutline, tube, ball } from './toon.js';

/** Sky, grass, hills, drifting clouds and a few bobbing flowers. */
export function buildWorld(scene, groundY) {
  const sky = document.createElement('canvas');
  sky.width = 4; sky.height = 256;
  const sc = sky.getContext('2d');
  const skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyNow = [new THREE.Color('#6cc9ff'), new THREE.Color('#bfeaff'), new THREE.Color('#f3fbff')];
  function paintSky() {
    const g = sc.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#' + skyNow[0].getHexString());
    g.addColorStop(0.65, '#' + skyNow[1].getHexString());
    g.addColorStop(1, '#' + skyNow[2].getHexString());
    sc.fillStyle = g;
    sc.fillRect(0, 0, 4, 256);
    skyTex.needsUpdate = true;
  }
  paintSky();
  scene.background = skyTex;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), toon('#7fdc5a'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  scene.add(ground);

  for (const [x, z, r, c] of [[-16, -34, 15, '#6bcb4b'], [12, -38, 19, '#5dbb45'], [34, -30, 13, '#74d457'], [-38, -28, 13, '#5fc24a'], [0, -50, 22, '#8be06a']]) {
    scene.add(ball(r, toon(c), x, groundY - r * 0.55, z, 40));
  }

  const cloudMat = toon('#ffffff');
  const clouds = [];
  for (let k = 0; k < 7; k++) {
    const c = new THREE.Group();
    const n = 4 + (k % 2);
    for (let j = 0; j < n; j++) {
      const r = 0.9 + Math.random() * 0.7;
      c.add(ball(r, cloudMat, (j - (n - 1) / 2) * 1.2, (j % 2) * 0.5 - 0.2, Math.random() * 0.4, 18));
    }
    c.position.set(-36 + k * 11 + Math.random() * 4, 7 + Math.random() * 5, -22 - Math.random() * 6);
    c.userData.speed = 0.3 + Math.random() * 0.4;
    scene.add(c);
    clouds.push(c);
  }

  const flowers = [];
  const stemMat = toon('#3fae4a');
  const petalCols = ['#ff7eb6', '#ffd23f', '#ffffff', '#b28cff', '#ff8a5c'];
  const centerMat = toon('#ffc533');
  for (let k = 0; k < 18; k++) {
    let x, z;
    do { x = (Math.random() - 0.5) * 26; z = -8 + Math.random() * 11; } while (Math.abs(x) < 4 && z > -3);
    const f = new THREE.Group();
    const h = 0.35 + Math.random() * 0.3;
    f.add(tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h, 0), 0.03, stemMat, 6));
    const pm = toon(petalCols[k % petalCols.length]);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      f.add(ball(0.09, pm, Math.cos(a) * 0.11, h + Math.sin(a) * 0.11, 0, 10));
    }
    f.add(ball(0.08, centerMat, 0, h, 0.03, 10));
    f.position.set(x, groundY, z);
    f.userData.phase = Math.random() * 6;
    scene.add(f);
    flowers.push(f);
  }

  const bushMat = toon('#4fb84a');
  for (const [x, z] of [[-7.5, -4], [7.8, -5], [-11, -7], [11.5, -2]]) {
    const b = new THREE.Group();
    b.add(ball(0.9, bushMat, 0, 0.5, 0, 20), ball(0.7, bushMat, -0.8, 0.35, 0.1, 18), ball(0.7, bushMat, 0.8, 0.35, 0.1, 18));
    b.position.set(x, groundY, z);
    scene.add(b);
  }

  return {
    /** Current sky colours (top, middle, bottom) as THREE.Colors. */
    skyColors: () => skyNow.map((c) => c.clone()),
    /** Blend the sky from `from` to `to` (arrays of 3 colours) by k. */
    lerpSky(from, to, k) {
      skyNow.forEach((c, i) => c.copy(from[i]).lerp(new THREE.Color(to[i]), k));
      paintSky();
    },
    update(dt, t) {
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 42) c.position.x = -42;
      }
      for (const f of flowers) f.rotation.z = Math.sin(t * 1.6 + f.userData.phase) * 0.12;
    },
  };
}

/** Soft round shadow blob. */
export function makeShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(30,20,50,1)');
  g.addColorStop(1, 'rgba(30,20,50,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.6),
    noOutline(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.35, depthWrite: false })),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
