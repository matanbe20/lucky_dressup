import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { WheelScene } from './scenes/wheelScene.js';
import { DressUpScene } from './scenes/dressUpScene.js';
import { Sfx } from './audio.js';

const SCENES = { wheel: WheelScene, room: DressUpScene };

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// Inverted-hull ink outline on every toon mesh → cartoon look.
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0065, defaultColor: [0.17, 0.11, 0.23] });

const fadeEl = document.createElement('div');
fadeEl.className = 'fade';
document.body.append(fadeEl);

// Testing helpers: ?force=moon (wheel lands on it), ?slow=0.25, ?scene=room&theme=star
const params = new URLSearchParams(location.search);
const app = {
  renderer,
  ui: document.getElementById('ui'),
  sfx: new Sfx(),
  debug: { force: params.get('force'), slow: Number(params.get('slow')) || 1 },
  outfits: {}, // theme → { slot: item index }, kept while the page is open
  goTo,
  onPrize(item) { console.log('[prize]', item.key); },
  fade(color, ms = 500) {
    fadeEl.style.transition = `opacity ${ms}ms ease`;
    fadeEl.style.background = color;
    fadeEl.style.opacity = '1';
    return new Promise((res) => setTimeout(res, ms));
  },
  unfade(ms = 600) {
    fadeEl.style.transition = `opacity ${ms}ms ease`;
    fadeEl.style.opacity = '0';
  },
};
window.game = app;

let current = null;
function goTo(name, opts) {
  current?.dispose();
  current = new SCENES[name](app, opts);
  app.scene = current;
  resize();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  effect.setSize(w, h);
  current?.resize(w, h);
}
addEventListener('resize', resize);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05) * app.debug.slow;
  if (!current) return;
  current.update(dt);
  effect.render(current.scene, current.camera);
});

goTo(params.get('scene') === 'room' ? 'room' : 'wheel', { theme: params.get('theme') || 'moon' });
