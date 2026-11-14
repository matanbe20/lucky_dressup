import * as THREE from 'three';

let gradient;
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra });

/** Exclude a material from the cartoon ink outline. */
export function noOutline(mat) {
  mat.userData.outlineParameters = { visible: false };
  return mat;
}

/** Cylinder stretched between two points. */
export function tube(a, b, r, mat, seg = 12) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function ball(r, mat, x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(x, y, z);
  return m;
}
