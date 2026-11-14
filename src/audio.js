// Tiny synthesized sound effects (no audio files needed).
export class Sfx {
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'sine', vol = 0.5, slide = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  tick() { this.tone(1500, 0.035, { type: 'square', vol: 0.12 }); }
  whoosh() { this.tone(260, 0.35, { type: 'sawtooth', vol: 0.08, slide: 900 }); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.4, delay: i * 0.09 }));
    this.tone(1568, 0.5, { vol: 0.25, delay: 0.36 });
  }
  eek() {
    this.tone(1800, 0.12, { type: 'square', vol: 0.14, slide: 2700 });
    this.tone(2500, 0.2, { type: 'square', vol: 0.12, slide: 1100, delay: 0.13 });
  }
  pitter() { this.tone(2100 + Math.random() * 700, 0.025, { type: 'triangle', vol: 0.08 }); }
  thud() { this.tone(180, 0.18, { vol: 0.4, slide: 90 }); }
  knock() {
    this.tone(140, 0.09, { type: 'triangle', vol: 0.6, slide: 70 });
    this.tone(320, 0.05, { type: 'square', vol: 0.12, slide: 120 });
  }
  magic() {
    [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.4, { type: 'sine', vol: 0.22, delay: i * 0.08 }));
  }
  poof() { this.tone(900, 0.25, { type: 'sawtooth', vol: 0.06, slide: 120 }); }
  pop() { this.tone(520, 0.12, { vol: 0.35, slide: 1100 }); this.tone(1400, 0.15, { type: 'triangle', vol: 0.12, delay: 0.06 }); }
  unpop() { this.tone(900, 0.12, { vol: 0.25, slide: 380 }); }
  boing() { this.tone(240, 0.3, { vol: 0.3, slide: 620 }); }
}
