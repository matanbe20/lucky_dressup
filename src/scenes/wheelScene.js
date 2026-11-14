import * as THREE from 'three';
import { Wheel, R } from '../wheel.js';
import { createSpider } from '../spider.js';
import { buildWorld, makeShadow } from '../world.js';
import { noOutline } from '../toon.js';
import { ITEMS } from '../items.js';
import { THEMES } from '../themes.js';
import { createDoor } from '../door.js';
import { makeSkyIcon, makeStars, makeSkyRainbow, makeFloaters } from '../sky.js';
import { sparkleTexture } from '../patterns.js';

const WHEEL_Y = 0.9;
const GROUND_Y = -2.3;
const TAU = Math.PI * 2;
const easeOutQuart = (k) => 1 - Math.pow(1 - k, 4);
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const easeInBack = (k) => 2.70158 * k * k * k - 1.70158 * k * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));

const CONFETTI = ['#ff4d6d', '#ffd23f', '#4fc2ff', '#5ad15a', '#b28cff', '#ff9f1c'].map(
  (color) => noOutline(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })),
);
const CONFETTI_GEO = new THREE.PlaneGeometry(0.14, 0.22);
const DUST_GEO = new THREE.SphereGeometry(0.16, 10, 8);

/**
 * Stage 1: spin the lucky wheel.
 * - spider → it jumps out of its picture and runs off screen; spin again.
 * - anything else → celebration + app.onPrize(item) (next stage hooks in there).
 */
export class WheelScene {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    this.world = buildWorld(this.scene, GROUND_Y);
    this.ambient = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(this.ambient);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.sunLight.position.set(5, 9, 8);
    this.scene.add(this.sunLight);

    this.wheel = new Wheel(ITEMS, GROUND_Y - WHEEL_Y);
    this.wheel.group.position.y = WHEEL_Y;
    this.scene.add(this.wheel.group);

    this.actors = [];
    this.state = 'idle';
    this.time = 0;
    this.exitX = 12;
    this.buildUI();
    this.say('בואו נסובב! 🎡');

    // Tapping the magic door (only once it has appeared)
    this.raycaster = new THREE.Raycaster();
    this.canvas = app.renderer.domElement;
    this.onPointer = (e) => {
      if (!this.door) return;
      const hit = this.hitDoor(e);
      if (e.type === 'pointermove') this.canvas.style.cursor = hit && this.state === 'door' ? 'pointer' : '';
      else if (hit && this.state === 'door') this.knock();
    };
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
  }

  hitDoor(e) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.door.group, true).length > 0;
  }

  buildUI() {
    this.root = document.createElement('div');
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    this.btn = document.createElement('button');
    this.btn.className = 'spin-btn';
    this.btn.textContent = 'סובב את הגלגל';
    this.btn.addEventListener('click', () => this.spin());
    this.onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      if (this.state === 'door') this.knock();
      else this.spin();
    };
    addEventListener('keydown', this.onKey);
    this.root.append(this.bubble, this.btn);
    this.app.ui.append(this.root);
  }

  say(text) {
    this.bubble.textContent = text;
    this.bubble.classList.remove('show');
    void this.bubble.offsetWidth; // restart the pop animation
    this.bubble.classList.add('show');
  }

  hideBubble() { this.bubble.classList.remove('show'); }

  resize(w, h) {
    const cam = this.camera;
    cam.aspect = w / h;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Keep the whole wheel + stand + room for the UI in view on any screen shape.
    const d = Math.max(11 / (2 * tanH), 8.6 / (2 * tanH * cam.aspect));
    cam.position.set(0, 1.7, d);
    cam.lookAt(0, 0.55, 0);
    cam.updateProjectionMatrix();
    this.exitX = (d - 1.1) * tanH * cam.aspect + 2.5;
  }

  // ---------------------------------------------------------------- spinning

  spin() {
    if (this.state !== 'idle' && this.state !== 'won') return;
    const sfx = this.app.sfx;
    sfx.unlock();
    sfx.whoosh();
    if (this.wheel.restoreAll()) sfx.boing();
    this.wheel.clearHighlight();

    const n = ITEMS.length, seg = TAU / n;
    let target;
    const force = this.app.debug?.force; // ?force=spider / ?force=heart for testing
    if (force) {
      const options = ITEMS.map((it, i) => (it.key === force ? i : -1)).filter((i) => i >= 0);
      if (options.length) target = options[Math.floor(Math.random() * options.length)];
    }
    if (target === undefined) target = Math.floor(Math.random() * n);

    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const desired = Math.PI / 2 - target * seg + jitter;
    const start = this.wheel.angle;
    const delta = (((start - desired) % TAU) + TAU) % TAU;
    const turns = 4 + Math.floor(Math.random() * 2);
    this.anim = { t: 0, start, windup: 0.22, windT: 0.3, end: start - delta - TAU * turns, dur: 4.3 + Math.random() * 0.9 };
    this.lastPeg = this.pegIndex(start);
    this.state = 'spinning';
    this.btn.disabled = true;
    this.hideBubble();
  }

  pegIndex(angle) { return Math.floor((Math.PI / 2 - angle) / (TAU / ITEMS.length) - 0.5); }

  updateSpin(dt) {
    const a = this.anim;
    a.t += dt;
    let ang, done = false;
    if (a.t < a.windT) {
      ang = a.start + a.windup * Math.sin((a.t / a.windT) * Math.PI / 2);
    } else {
      const k = Math.min(1, (a.t - a.windT) / a.dur);
      const from = a.start + a.windup;
      ang = from + (a.end - from) * easeOutQuart(k);
      done = k >= 1;
    }
    const prev = this.wheel.angle;
    this.wheel.angle = ang;
    const peg = this.pegIndex(ang);
    if (peg !== this.lastPeg) {
      this.lastPeg = peg;
      this.app.sfx.tick();
      const speed = Math.abs(ang - prev) / Math.max(dt, 1e-3);
      this.wheel.kickPointer(ang < prev ? 1 : -1, Math.min(1, speed / 10));
    }
    if (done) this.finishSpin();
  }

  finishSpin() {
    const i = this.wheel.indexAtPointer();
    if (ITEMS[i].kind === 'spider') this.spiderEscape(i);
    else this.win(i);
  }

  // ---------------------------------------------------------------- outcomes

  win(i) {
    const item = ITEMS[i];
    this.state = 'won';
    this.app.sfx.win();
    this.wheel.highlight(i);
    this.say(`יש! קיבלת ${item.name}! ${item.emoji}`);
    this.burstConfetti();
    this.app.onPrize?.(item);
    if (item.theme && THEMES[item.key]) {
      // Themed item → it floats up into the sky and a magic door appears.
      this.state = 'intro';
      this.btn.disabled = true;
      setTimeout(() => this.startIntro(i), 1100);
    } else {
      this.btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------- themed intro → door

  startIntro(i) {
    const theme = THEMES[ITEMS[i].key];
    this.theme = theme;
    const sfx = this.app.sfx;
    sfx.magic();
    this.btn.classList.add('hidden');
    this.say(theme.intro);
    this.wheel.clearHighlight();

    const from = this.wheel.iconWorldPos(i);
    // Sky spot: upper right, below the speech bubble on any screen shape.
    const tall = this.camera.aspect < 1;
    const target = new THREE.Vector3(Math.min(3.4, this.exitX * 0.33), WHEEL_Y + R + (tall ? 0.4 : 1.3), -3);
    this.wheel.setAway(i, true);
    const sky = makeSkyIcon(theme.key, theme.glow);
    sky.group.position.copy(from);
    this.scene.add(sky.group);

    const skyFrom = this.world.skyColors();
    const ambFrom = { color: this.ambient.color.clone(), i: this.ambient.intensity, sun: this.sunLight.intensity };
    const ambTo = new THREE.Color(theme.light.ambient);
    const stars = theme.stars ? makeStars() : null;
    if (stars) this.scene.add(stars);
    const arc = theme.rainbowArc ? makeSkyRainbow() : null;
    if (arc) { arc.scale.setScalar(0.001); this.scene.add(arc); }
    const floaters = theme.floaters ? makeFloaters(theme.floaters) : null;
    if (floaters) this.scene.add(floaters.group);

    let t = 0, poofed = false;
    this.actors.push({
      update: (dt) => {
        t += dt;
        // 1. the item floats up into the sky and grows
        const kr = clamp01(t / 1.9), e = easeInOutCubic(kr);
        sky.group.position.lerpVectors(from, target, e);
        sky.group.position.y += Math.sin(kr * Math.PI) * 0.9;
        sky.group.scale.setScalar(0.85 + (theme.skyScale - 0.85) * e);
        sky.halo.material.opacity = e;
        sky.icon.material.rotation = theme.spin ? -this.time * 0.4 : Math.sin(this.time * 1.5) * 0.08;
        // 2. the world changes to the theme's sky
        const ks = easeInOutCubic(clamp01((t - 0.4) / 2));
        this.world.lerpSky(skyFrom, theme.sky, ks);
        this.ambient.color.copy(ambFrom.color).lerp(ambTo, ks);
        this.ambient.intensity = ambFrom.i + (theme.light.amb - ambFrom.i) * ks;
        this.sunLight.intensity = ambFrom.sun + (theme.light.sun - ambFrom.sun) * ks;
        if (stars) stars.material.opacity = ks * (0.75 + 0.25 * Math.sin(this.time * 3));
        if (arc) arc.scale.setScalar(Math.max(0.001, easeOutCubic(ks)));
        if (floaters) floaters.update(dt, ks);
        // 3. the wheel spins away to nothing
        const kw = clamp01((t - 1.9) / 0.6);
        if (kw > 0 && !poofed) {
          this.wheel.angle -= dt * 18 * kw;
          this.wheel.group.scale.setScalar(Math.max(0.001, 1 - easeInBack(kw)));
          if (kw >= 1) {
            poofed = true;
            this.wheel.group.visible = false;
            sfx.poof();
            this.burstSparkles(new THREE.Vector3(0, WHEEL_Y, 0.5), 30);
          }
        }
        // 4. a door grows out of the ground
        if (t >= 2.6 && !this.door) {
          this.door = createDoor(theme);
          this.door.group.position.set(0, GROUND_Y, 0.3);
          this.scene.add(this.door.group);
          sfx.boing();
        }
        if (this.door) {
          const kd = clamp01((t - 2.6) / 0.6);
          if (kd < 1) this.door.group.scale.setScalar(Math.max(0.001, easeOutBack(kd)));
          if (kd >= 1 && this.state === 'intro') {
            this.state = 'door';
            this.say('דפקו על הדלת! 🚪');
          }
          // inviting wiggle while waiting for a knock
          if (this.state === 'door') {
            const w = (this.time % 2.4) / 2.4;
            this.door.group.rotation.z = w < 0.25 ? Math.sin(w * 4 * Math.PI * 3) * 0.025 * (1 - w * 4) : 0;
          }
        }
      },
    });
  }

  knock() {
    if (this.state !== 'door') return;
    this.state = 'knocking';
    this.door.group.rotation.z = 0;
    const sfx = this.app.sfx;
    sfx.unlock();
    this.say('טוק טוק! ✊');
    const theme = this.theme;
    const cam = this.camera;
    const camFrom = cam.position.clone();
    const lookFrom = new THREE.Vector3(0, 0.55, 0);
    const lookTo = new THREE.Vector3(0, GROUND_Y + 1.9, 0);
    const camTo = new THREE.Vector3(0, GROUND_Y + 1.9, 0.9);
    const knocks = [0, 0.32];
    let t = 0, k = 0, faded = false;
    this.actors.push({
      update: (dt) => {
        t += dt;
        if (k < knocks.length && t >= knocks[k]) { k++; sfx.knock(); this.door.knockT = 0; }
        if (this.door.knockT !== undefined) {
          this.door.knockT += dt;
          const kk = this.door.knockT / 0.18;
          this.door.pivot.position.z = kk < 1 ? -Math.sin(kk * Math.PI) * 0.06 : 0;
        }
        if (t > 0.9 && t - dt <= 0.9) { this.say('בואו ניכנס! ✨'); sfx.magic(); }
        this.door.open(easeInOutCubic(clamp01((t - 0.9) / 0.8)));
        const kc = easeInOutCubic(clamp01((t - 1.4) / 1.3));
        if (kc > 0) {
          cam.position.lerpVectors(camFrom, camTo, kc);
          cam.lookAt(new THREE.Vector3().lerpVectors(lookFrom, lookTo, kc));
        }
        if (t > 2.0 && !faded) {
          faded = true;
          this.hideBubble();
          this.app.fade(theme.glow, 600).then(() => {
            this.app.goTo('room', { theme: theme.key });
            this.app.unfade(700);
          });
        }
        return t < 3;
      },
    });
  }

  burstSparkles(origin, count) {
    const mat = new THREE.SpriteMaterial({ map: sparkleTexture(), transparent: true, depthWrite: false });
    const parts = [];
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat.clone());
      s.position.copy(origin);
      s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.3) * 8, Math.random() * 3);
      s.scale.setScalar(0.4 + Math.random() * 0.5);
      this.scene.add(s);
      parts.push(s);
    }
    let t = 0;
    this.actors.push({
      update: (dt) => {
        t += dt;
        for (const s of parts) {
          s.position.addScaledVector(s.userData.v, dt);
          s.userData.v.multiplyScalar(1 - dt * 2.5);
          s.material.opacity = Math.max(0, 1 - t / 1.1);
        }
        if (t > 1.1) { this.scene.remove(...parts); return false; }
      },
    });
  }

  spiderEscape(i) {
    this.state = 'spider';
    this.say('אוי! עכביש! 🕷️');
    const sfx = this.app.sfx;
    sfx.eek();

    const from = this.wheel.iconWorldPos(i);
    this.wheel.setAway(i, true);

    const spider = createSpider();
    const r = spider.root;
    this.scene.add(r);
    const shadow = makeShadow();
    this.scene.add(shadow);
    const alarm = makeAlarm();
    this.scene.add(alarm);

    const dir = from.x > 0.05 ? 1 : from.x < -0.05 ? -1 : Math.random() < 0.5 ? -1 : 1;
    const land = new THREE.Vector3(from.x + dir * 0.9, GROUND_Y, 1.1);
    const S = 0.85; // full size on the ground
    const s0 = 0.35;
    r.position.copy(from);
    r.scale.setScalar(s0);

    let t = 0, phase = 'jump', speed = 0, dustT = 0;
    this.actors.push({
      update: (dt) => {
        t += dt;
        if (phase === 'jump') {
          const k = Math.min(1, t / 0.6);
          r.position.lerpVectors(from, land, k);
          r.position.y += Math.sin(k * Math.PI) * 1.6;
          r.rotation.x = -TAU * easeOutCubic(k); // somersault out of the picture
          r.scale.setScalar(s0 + (S - s0) * k);
          spider.update(this.time, 1, 24);
          if (k >= 1) {
            phase = 'land'; t = 0;
            r.rotation.x = 0;
            sfx.thud();
            for (let j = 0; j < 6; j++) this.spawnDust(r.position.x + Math.cos(j) * 0.6, r.position.z + Math.sin(j) * 0.4, 0.9);
          }
        } else if (phase === 'land') {
          const k = Math.min(1, t / 0.22);
          const sq = Math.sin(k * Math.PI) * 0.32;
          r.scale.set(S * (1 + sq), S * (1 - sq), S * (1 + sq));
          r.rotation.y = dir * (Math.PI / 2) * easeOutCubic(k);
          if (k >= 1) { phase = 'run'; t = 0; r.scale.setScalar(S); }
        } else {
          speed = Math.min(11, speed + dt * 40);
          r.position.x += dir * speed * dt;
          spider.update(this.time, 1, 28);
          dustT -= dt;
          if (dustT <= 0) {
            dustT = 0.06;
            this.spawnDust(r.position.x - dir * 0.7, r.position.z + (Math.random() - 0.5) * 0.5, 0.6);
            sfx.pitter();
          }
          if (Math.abs(r.position.x) > this.exitX) {
            this.scene.remove(r, shadow, alarm);
            this.spiderGone();
            return false;
          }
        }
        const h = r.position.y - GROUND_Y;
        shadow.position.set(r.position.x, GROUND_Y + 0.02, r.position.z);
        shadow.material.opacity = 0.35 * Math.max(0.15, 1 - h / 4);
        shadow.scale.setScalar(r.scale.x * (1 - Math.min(0.5, h / 8)));
        // "!" pops above its head from landing until a moment into the run
        const showAlarm = phase === 'land' || (phase === 'run' && t < 0.5);
        alarm.visible = showAlarm;
        if (showAlarm) {
          alarm.position.set(r.position.x, r.position.y + 1.85 * r.scale.y, r.position.z);
          alarm.scale.setScalar(0.85 * (phase === 'land' ? easeOutCubic(Math.min(1, t / 0.15)) : 1));
        }
      },
    });
  }

  spiderGone() {
    this.state = 'idle';
    this.say('הוא ברח! סובבו שוב 🎡');
    this.btn.disabled = false;
  }

  // ---------------------------------------------------------------- effects

  spawnDust(x, z, size) {
    const m = new THREE.Mesh(DUST_GEO, noOutline(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false })));
    m.position.set(x, GROUND_Y + 0.15, z);
    this.scene.add(m);
    let t = 0;
    this.actors.push({
      update: (dt) => {
        t += dt;
        const k = t / 0.45;
        if (k >= 1) { this.scene.remove(m); m.material.dispose(); return false; }
        m.scale.setScalar(size * (0.4 + k * 1.2));
        m.position.y += dt * 0.6;
        m.material.opacity = 0.85 * (1 - k);
      },
    });
  }

  burstConfetti() {
    const origin = new THREE.Vector3(0, WHEEL_Y + R + 0.3, 0.8);
    const pieces = [];
    for (let k = 0; k < 90; k++) {
      const m = new THREE.Mesh(CONFETTI_GEO, CONFETTI[k % CONFETTI.length]);
      m.position.copy(origin);
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 7, Math.random() * 4);
      m.userData.spin = new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      this.scene.add(m);
      pieces.push(m);
    }
    let t = 0;
    this.actors.push({
      update: (dt) => {
        t += dt;
        for (const m of pieces) {
          const v = m.userData.v;
          v.y -= 9 * dt;
          v.multiplyScalar(1 - dt * 0.9);
          m.position.addScaledVector(v, dt);
          m.rotation.x += m.userData.spin.x * dt;
          m.rotation.y += m.userData.spin.y * dt;
          m.rotation.z += m.userData.spin.z * dt;
        }
        if (t > 3.5) { this.scene.remove(...pieces); return false; }
      },
    });
  }

  // ---------------------------------------------------------------- loop

  update(dt) {
    this.time += dt;
    if (this.state === 'spinning') this.updateSpin(dt);
    this.wheel.update(dt, this.time, this.state);
    this.world.update(dt, this.time);
    // Actors may spawn new actors (dust) while updating — keep those too.
    const running = this.actors;
    this.actors = [];
    const alive = running.filter((a) => a.update(dt) !== false);
    this.actors = alive.concat(this.actors);
  }

  dispose() {
    removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onPointer);
    this.canvas.style.cursor = '';
    this.root.remove();
  }
}

function makeAlarm() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffe14d';
  x.strokeStyle = '#2b1d3a';
  x.lineWidth = 9;
  x.beginPath();
  x.arc(64, 64, 52, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#ff3b5c';
  x.font = '900 84px Fredoka, Arial, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('!', 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.renderOrder = 10;
  s.visible = false;
  return s;
}
