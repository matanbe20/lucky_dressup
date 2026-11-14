import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { createGirl } from './girl.js';
import { putOn, takeOff } from './clothes.js';
import { putOnPet } from './pets.js';

/**
 * Render a picture of each clothing item (on an invisible girl) for the
 * wardrobe buttons. Returns an array of data-URLs in the same order.
 */
export function makeThumbs(items, size = 168) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  const fx = new OutlineEffect(renderer, { defaultThickness: 0.008, defaultColor: [0.17, 0.11, 0.23] });
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, 7);
  scene.add(sun);
  const girl = createGirl();
  girl.setBodyVisible(false);
  scene.add(girl.root);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const tan = Math.tan(THREE.MathUtils.degToRad(14));

  const urls = items.map((item) => {
    let parts;
    if (item.cat === 'petacc') {
      // show the accessory on a kitten
      parts = putOn({ cat: 'pet', style: 'cat', mat: { color: '#f2d2a0' }, trim: '#ff7eb6' }, girl);
      const anchors = parts[0][1].userData.anchors;
      if (item.style === 'bandana' || item.style === 'bell') anchors.collar.forEach((o) => { o.visible = false; });
      putOnPet(item, anchors);
    } else {
      parts = putOn(item, girl);
    }
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const [, obj] of parts) box.expandByObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const d = (Math.max(s.x, s.y) * 0.62) / tan + s.z / 2;
    const back = item.style === 'backpack' ? -1 : 1;
    cam.position.set(c.x + (back < 0 ? d * 0.35 : 0), c.y + s.y * 0.25, c.z + back * d);
    cam.lookAt(c);
    renderer.setClearColor(0x000000, 0);
    fx.render(scene, cam);
    const url = renderer.domElement.toDataURL();
    takeOff(parts);
    return url;
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return urls;
}
