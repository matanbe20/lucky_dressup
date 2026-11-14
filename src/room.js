import * as THREE from 'three';
import { toon, noOutline, tube } from './toon.js';
import { motif2d, sparkleTexture, RAINBOW } from './patterns.js';
import { motifMesh } from './motifs.js';
import { archShape } from './door.js';
import { drawIcon } from './icons.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** ShapeGeometry with UVs normalised to 0..1 over its bounding box. */
function shapeGeo(shape) {
  const g = new THREE.ShapeGeometry(shape, 32);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), (p.getY(i) - min.y) / (max.y - min.y));
  return g;
}

/** Themed dress-up room: wallpaper, window, podium, rug and hanging decorations. */
export function buildRoom(scene, theme) {
  const R = theme.room;
  scene.background = new THREE.Color(R.wall[1]);

  const wallTex = canvasTex(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, R.wall[0]);
    g.addColorStop(1, R.wall[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalAlpha = theme.motif === 'rainbow' ? 0.3 : 1;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 9; col++) {
        const px = col * 120 + (row % 2) * 60 + 20, py = 60 + row * 120;
        motif2d(x, theme.motif, px, py, 26, R.motifColor, (row + col) % 2 ? 0.3 : -0.3);
        motif2d(x, 'dot', px + 60, py + 10, 8, R.motifColor);
      }
    }
  });
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.repeat.x = 2;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(34, 13), noOutline(new THREE.MeshBasicMaterial({ map: wallTex })));
  wall.position.set(0, 5.5, -3.5);
  scene.add(wall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 16), toon(R.floor));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 4.5;
  scene.add(floor);
  const base = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 0.12), toon(new THREE.Color(R.floor).lerp(new THREE.Color('#ffffff'), 0.5)));
  base.position.set(0, 0.15, -3.44);
  scene.add(base);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), toon(R.rug));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  scene.add(rug);
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.22, 56), toon(R.podium));
  podium.position.y = 0.11;
  scene.add(podium);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 10, 64), toon(R.rug));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.22;
  scene.add(rim);

  // Window showing the theme's sky with its icon
  const win = new THREE.Group();
  const frameShape = archShape(2.0, 2.9);
  frameShape.holes.push(archShape(1.65, 2.55));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 32 }), toon('#ffffff'));
  win.add(frame);
  const glassTex = canvasTex(256, 384, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, R.windowSky[0]);
    g.addColorStop(1, R.windowSky[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    if (R.windowStars) {
      x.fillStyle = '#fff8d0';
      for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.6, 0, Math.PI * 2); x.fill(); }
    }
    x.translate(w * 0.5, h * 0.33);
    drawIcon(x, theme.key, 62);
  });
  const glass = new THREE.Mesh(shapeGeo(archShape(1.65, 2.55)), noOutline(new THREE.MeshBasicMaterial({ map: glassTex })));
  glass.position.z = 0.02;
  win.add(glass);
  const barMat = toon('#ffffff');
  const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 0.08), barMat);
  vbar.position.set(0, 1.25, 0.1);
  const hbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), barMat);
  hbar.position.set(0, 1.0, 0.1);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.45), barMat);
  sill.position.set(0, -0.05, 0.15);
  win.add(vbar, hbar, sill);
  win.position.set(R.rainbowArc ? 4.6 : 3.1, 1.3, -3.42);
  scene.add(win);

  if (R.rainbowArc) {
    RAINBOW.forEach((c, k) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(3.6 - k * 0.22, 0.11, 10, 80, Math.PI), toon(c));
      arc.position.set(0, 0.2, -3.3);
      scene.add(arc);
    });
  }

  // Hanging decorations
  const hangers = [];
  const xs = [-2.4, -1.45, 1.5, 2.6];
  R.hang.forEach((kind, i) => {
    const h = new THREE.Group();
    const len = 1.2 + (i % 2) * 0.5;
    h.add(tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -len, 0), 0.012, noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff' })), 4));
    const m = motifMesh(kind, 0.28, R.hangColor);
    m.position.y = -len - 0.2;
    h.add(m);
    h.position.set(xs[i], 5.6, -1.8);
    h.userData.phase = i * 1.7;
    scene.add(h);
    hangers.push(h);
  });

  // Floating twinkles
  const n = 40;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = Math.random() * 6;
    pos[i * 3 + 2] = -3 + Math.random() * 3;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const twinkles = new THREE.Points(pgeo, new THREE.PointsMaterial({ map: sparkleTexture(), size: 0.35, transparent: true, depthWrite: false, opacity: 0.8 }));
  scene.add(twinkles);

  scene.add(new THREE.AmbientLight(R.ambient[0], R.ambient[1]));
  const sun = new THREE.DirectionalLight(0xffffff, R.sun);
  sun.position.set(3, 6, 7);
  scene.add(sun);

  return {
    update(dt, t) {
      for (const h of hangers) {
        h.rotation.z = Math.sin(t * 1.1 + h.userData.phase) * 0.06;
        h.children[1].rotation.y = Math.sin(t * 0.9 + h.userData.phase) * 0.6;
      }
      twinkles.material.opacity = 0.55 + 0.35 * Math.sin(t * 2.2);
      const p = pgeo.attributes.position;
      for (let i = 0; i < n; i++) {
        let y = p.getY(i) + dt * 0.15;
        if (y > 6) y = 0;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    },
  };
}
