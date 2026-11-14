import * as THREE from 'three';
import { THEMES } from '../themes.js';
import { buildRoom } from '../room.js';
import { createGirl } from '../girl.js';
import { putOn, takeOff, slotOf, CATEGORIES } from '../clothes.js';
import { makeThumbs } from '../thumbs.js';
import { sparkleTexture } from '../patterns.js';
import { PET_COLORS, PET_ACC_SLOT, putOnPet } from '../pets.js';

const BASE_Y = 0.22; // podium height
const TAU = Math.PI * 2;

/**
 * Stage 2: a themed room where the player dresses the girl.
 * Tap an item to put it on, tap it again to take it off. Drag the girl to turn her.
 */
export class DressUpScene {
  constructor(app, { theme = 'moon' } = {}) {
    this.app = app;
    this.theme = THEMES[theme] || THEMES.moon;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.room = buildRoom(this.scene, this.theme);

    this.girl = createGirl();
    this.girl.root.userData.baseY = BASE_Y;
    this.girl.root.position.y = BASE_Y;
    this.scene.add(this.girl.root);

    this.items = this.theme.wardrobe.map((spec, i) => ({ ...spec, i }));
    this.worn = {}; // slot → { item, parts }
    this.petColor = null; // chosen fur colour (null = the pet's own colour)
    this.petAcc = {}; // pet accessory slot → item (kept even while no pet is out)
    this.petAccParts = {};
    this.cat = 'dress';
    this.actors = [];
    this.time = 0;
    this.idle = 0;
    this.thumbs = null;

    this.buildUI();
    const saved = app.outfits[this.theme.key];
    if (saved) {
      this.petColor = saved.petColor || null;
      for (const [slot, i] of Object.entries(saved.petAcc || {})) this.petAcc[slot] = this.items[i];
      for (const i of Object.values(saved.worn || {})) this.wear(this.items[i], true);
    }
    this.renderItems();
    // Let the room paint first, then render the wardrobe pictures.
    setTimeout(() => {
      this.thumbs = makeThumbs(this.items);
      this.renderTabs();
      this.renderItems();
    }, 60);

    this.canvas = app.renderer.domElement;
    this.onDown = (e) => { this.drag = { x: e.clientX, y: e.clientY, moved: 0 }; };
    this.onMove = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      this.drag.moved += Math.abs(dx) + Math.abs(e.clientY - this.drag.y);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.girl.root.rotation.y += dx * 0.012;
      this.idle = 0;
    };
    this.onUp = () => {
      if (this.drag && this.drag.moved < 6) { this.girl.hop(); this.app.sfx.boing(); }
      this.drag = null;
    };
    this.canvas.addEventListener('pointerdown', this.onDown);
    addEventListener('pointermove', this.onMove);
    addEventListener('pointerup', this.onUp);
  }

  // ---------------------------------------------------------------- UI

  buildUI() {
    const t = this.theme;
    this.root = document.createElement('div');
    this.root.className = 'dress-ui';
    this.root.style.setProperty('--accent', t.ui[0]);
    this.root.style.setProperty('--accent2', t.ui[1]);

    this.title = document.createElement('div');
    this.title.className = 'bubble room-title show';
    this.title.textContent = t.title;

    const home = document.createElement('button');
    home.className = 'round-btn home-btn';
    home.textContent = '🏠';
    home.title = 'חזרה לגלגל';
    home.addEventListener('click', () => this.goHome());

    const reset = document.createElement('button');
    reset.className = 'round-btn reset-btn';
    reset.textContent = '🧺';
    reset.title = 'להוריד הכל';
    reset.addEventListener('click', () => this.undressAll());

    this.panel = document.createElement('div');
    this.panel.className = 'wardrobe';
    this.tabs = document.createElement('div');
    this.tabs.className = 'tabs';
    this.grid = document.createElement('div');
    this.grid.className = 'items';
    this.panel.append(this.tabs, this.grid);

    this.root.append(this.title, home, reset, this.panel);
    this.app.ui.append(this.root);
    this.renderTabs();
  }

  renderTabs() {
    this.tabs.innerHTML = '';
    for (const c of CATEGORIES) {
      const first = this.items.find((it) => it.cat === c.cat);
      if (!first) continue;
      const b = document.createElement('button');
      b.className = 'tab' + (c.cat === this.cat ? ' active' : '');
      const pic = this.thumbs ? `<img src="${this.thumbs[first.i]}" alt="">` : `<span class="emoji">${c.emoji}</span>`;
      b.innerHTML = `${pic}<span>${c.label}</span>`;
      b.addEventListener('click', () => {
        this.cat = c.cat;
        this.app.sfx.tick();
        this.renderTabs();
        this.renderItems();
      });
      this.tabs.append(b);
    }
  }

  renderItems() {
    this.grid.innerHTML = '';
    const emoji = CATEGORIES.find((c) => c.cat === this.cat)?.emoji;
    const petTab = this.cat === 'pet' || this.cat === 'petacc';
    if (petTab && this.worn.pet) {
      // colour picker for the pet
      const row = document.createElement('div');
      row.className = 'swatches';
      const current = this.petColor || this.worn.pet.item.mat.color;
      row.innerHTML = '<span>🎨</span>';
      for (const c of PET_COLORS) {
        const sw = document.createElement('button');
        sw.className = 'swatch' + (c === current ? ' on' : '');
        sw.style.background = c;
        sw.addEventListener('click', () => this.setPetColor(c));
        row.append(sw);
      }
      this.grid.append(row);
    } else if (this.cat === 'petacc') {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'קודם בוחרים חיה 🐾';
      this.grid.append(hint);
    }
    for (const item of this.items.filter((it) => it.cat === this.cat)) {
      const b = document.createElement('button');
      const on = item.cat === 'petacc' ? this.petAcc[PET_ACC_SLOT[item.style]] === item : this.worn[slotOf(item)]?.item === item;
      b.className = 'item' + (on ? ' on' : '');
      b.innerHTML = this.thumbs ? `<img src="${this.thumbs[item.i]}" alt="">` : `<span class="emoji">${emoji}</span>`;
      b.addEventListener('click', () => this.toggle(item));
      this.grid.append(b);
    }
  }

  // ---------------------------------------------------------------- dressing

  remove(slot) {
    if (!this.worn[slot]) return;
    takeOff(this.worn[slot].parts);
    delete this.worn[slot];
  }

  wear(item, silent = false) {
    const slot = slotOf(item);
    if (slot === 'dress') { this.remove('top'); this.remove('bottom'); }
    if (slot === 'top' || slot === 'bottom') this.remove('dress');
    this.remove(slot);
    if (slot === 'pet') {
      const spec = this.petColor ? { ...item, mat: { color: this.petColor } } : item;
      this.worn.pet = { item, parts: putOn(spec, this.girl) };
      this.attachPetAcc();
    } else {
      this.worn[slot] = { item, parts: putOn(item, this.girl) };
    }
    if (!silent) {
      this.app.sfx.pop();
      this.girl.hop();
      this.sparkle();
    }
  }

  // ---------------------------------------------------------------- pet extras

  get petAnchors() { return this.worn.pet?.parts[0][1].userData.anchors; }

  /** (Re)build the chosen pet accessories on the current pet. */
  attachPetAcc() {
    this.petAccParts = {};
    const anchors = this.petAnchors;
    if (!anchors) return;
    for (const [slot, item] of Object.entries(this.petAcc)) this.petAccParts[slot] = putOnPet(item, anchors);
    anchors.collar.forEach((o) => { o.visible = !this.petAcc.neck; });
  }

  togglePetAcc(item) {
    if (!this.worn.pet) {
      // no pet yet → send them to the pets tab
      this.app.sfx.unpop();
      this.cat = 'pet';
      this.renderTabs();
      this.renderItems();
      return;
    }
    const slot = PET_ACC_SLOT[item.style];
    if (this.petAccParts[slot]) takeOff(this.petAccParts[slot]);
    delete this.petAccParts[slot];
    if (this.petAcc[slot] === item) {
      delete this.petAcc[slot];
      this.app.sfx.unpop();
    } else {
      this.petAcc[slot] = item;
      this.petAccParts[slot] = putOnPet(item, this.petAnchors);
      this.app.sfx.pop();
      this.sparkle(this.worn.pet.parts[0][1].position);
    }
    this.petAnchors.collar.forEach((o) => { o.visible = !this.petAcc.neck; });
    this.save();
    this.renderItems();
  }

  setPetColor(c) {
    this.petColor = c;
    const item = this.worn.pet?.item;
    if (item) {
      this.wear(item, true);
      this.app.sfx.pop();
      this.sparkle(this.worn.pet.parts[0][1].position);
    }
    this.save();
    this.renderItems();
  }

  toggle(item) {
    if (item.cat === 'petacc') { this.togglePetAcc(item); return; }
    if (item.cat === 'pet' && this.worn.pet?.item !== item) this.petColor = null; // new pet → its own colour
    const slot = slotOf(item);
    if (this.worn[slot]?.item === item) {
      this.remove(slot);
      this.app.sfx.unpop();
    } else {
      this.wear(item);
    }
    this.save();
    this.renderItems();
  }

  undressAll() {
    for (const slot of Object.keys(this.worn)) this.remove(slot);
    this.petAcc = {};
    this.petAccParts = {};
    this.petColor = null;
    this.app.sfx.unpop();
    this.save();
    this.renderItems();
  }

  save() {
    this.app.outfits[this.theme.key] = {
      worn: Object.fromEntries(Object.entries(this.worn).map(([s, w]) => [s, w.item.i])),
      petAcc: Object.fromEntries(Object.entries(this.petAcc).map(([s, it]) => [s, it.i])),
      petColor: this.petColor,
    };
  }

  sparkle(center) {
    const mat = new THREE.SpriteMaterial({ map: sparkleTexture(), transparent: true, depthWrite: false });
    const parts = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(mat.clone());
      const a = Math.random() * TAU;
      if (center) s.position.set(center.x + Math.cos(a) * 0.5, BASE_Y + center.y + Math.random() * 1.0, center.z + Math.sin(a) * 0.4);
      else s.position.set(Math.cos(a) * 0.9, 0.4 + Math.random() * 2.8, Math.sin(a) * 0.6 + 0.4);
      s.userData.delay = Math.random() * 0.3;
      s.scale.setScalar(0.001);
      this.scene.add(s);
      parts.push(s);
    }
    let t = 0;
    this.actors.push({
      update: (dt) => {
        t += dt;
        for (const s of parts) {
          const k = Math.max(0, Math.min(1, (t - s.userData.delay) / 0.6));
          s.scale.setScalar(Math.max(0.001, Math.sin(k * Math.PI) * 0.45));
          s.position.y += dt * 0.4;
        }
        if (t > 1) { this.scene.remove(...parts); return false; }
      },
    });
  }

  goHome() {
    this.app.sfx.unlock();
    this.app.sfx.whoosh();
    this.app.fade('#ffffff', 400).then(() => {
      this.app.goTo('wheel');
      this.app.unfade(500);
    });
  }

  // ---------------------------------------------------------------- layout & loop

  resize(w, h) {
    const landscape = w > h * 1.05;
    let cx, cy, rw, rh;
    if (landscape) {
      const P = Math.min(440, w * 0.42);
      this.root.style.setProperty('--panel-w', `${P}px`);
      this.root.classList.add('landscape');
      this.root.classList.remove('portrait');
      cx = (P + 16 + w) / 2;
      cy = h / 2 + 45;
      rw = w - P - 16;
      rh = h - 130;
    } else {
      const Ph = Math.round(h * 0.36);
      this.root.style.setProperty('--panel-h', `${Ph}px`);
      this.root.classList.add('portrait');
      this.root.classList.remove('landscape');
      cx = w / 2;
      cy = (h - Ph) / 2 + 30;
      rw = w;
      rh = h - Ph - 110;
    }
    this.title.style.left = `${cx}px`;
    const cam = this.camera;
    const FW = 2 * Math.max(cx, w - cx), FH = 2 * Math.max(cy, h - cy);
    cam.aspect = FW / FH;
    cam.setViewOffset(FW, FH, FW / 2 - cx, FH / 2 - cy, w, h);
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.max((4.1 * FH) / (2 * tan * rh), (3.4 * FH) / (2 * tan * rw));
    cam.position.set(0, 1.95, d);
    cam.lookAt(0, 1.75, 0);
    cam.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    this.girl.update(dt, this.time);
    // animated items (pets, balloons)
    for (const w of Object.values(this.worn)) {
      for (const [, obj] of w.parts) obj.traverse((o) => o.userData.tick?.(this.time));
    }
    this.room.update(dt, this.time);
    // Drift back to facing front when left alone
    this.idle += dt;
    if (!this.drag && this.idle > 1.5) {
      const r = this.girl.root.rotation;
      const target = Math.round(r.y / TAU) * TAU;
      r.y += (target - r.y) * (1 - Math.exp(-dt * 2.5));
    }
    const running = this.actors;
    this.actors = [];
    this.actors = running.filter((a) => a.update(dt) !== false).concat(this.actors);
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    removeEventListener('pointermove', this.onMove);
    removeEventListener('pointerup', this.onUp);
    this.root.remove();
  }
}
