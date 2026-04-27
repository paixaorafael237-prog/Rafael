// Procedural audio using the Web Audio API.
// Generates music loops and sound effects without external assets,
// keeping the build completely self-contained.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = 0.4;
    this.sfxVolume = 0.6;
    this._musicNodes = [];
    this._musicTimer = null;
    this._currentTrack = null;
  }

  ensureContext() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }

  async resume() {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  // --- SFX -----------------------------------------------------------------

  _env(gainNode, startVol, duration) {
    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(startVol, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  tone(freq, duration = 0.18, type = 'sine', vol = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(this.sfxGain);
    this._env(g, vol, duration);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.05);
  }

  slide(from, to, duration = 0.2, type = 'square', vol = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    this._env(g, vol, duration);
    osc.start();
    osc.stop(now + duration + 0.05);
  }

  noise(duration = 0.2, vol = 0.25, filterFreq = 800) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    src.connect(filt).connect(g).connect(this.sfxGain);
    this._env(g, vol, duration);
    src.start();
    src.stop(this.ctx.currentTime + duration + 0.05);
  }

  // Named sound effects used throughout the game.
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump':       this.slide(440, 880, 0.18, 'square', 0.18); break;
      case 'land':       this.noise(0.12, 0.18, 500); break;
      case 'hurt':       this.slide(400, 90, 0.32, 'sawtooth', 0.28); break;
      case 'coin':
      case 'fish':       this.tone(880, 0.08, 'square', 0.22);
                         setTimeout(() => this.tone(1320, 0.12, 'square', 0.22), 70);
                         break;
      case 'click':      this.tone(660, 0.05, 'square', 0.18); break;
      case 'hover':      this.tone(820, 0.04, 'sine', 0.08); break;
      case 'menu_back':  this.slide(660, 330, 0.12, 'square', 0.18); break;
      case 'die':        this.slide(330, 80, 0.6, 'sawtooth', 0.32); break;
      case 'win':
        [0, 0.12, 0.26, 0.42].forEach((d, i) => {
          setTimeout(() => this.tone([523, 659, 784, 1046][i], 0.18, 'triangle', 0.25), d * 1000);
        });
        break;
      case 'enemy_hit':  this.noise(0.18, 0.3, 1500); break;
      case 'step':       this.noise(0.05, 0.08, 200); break;
      case 'portal':
        for (let i = 0; i < 5; i++) setTimeout(() => this.tone(440 + i * 120, 0.12, 'sine', 0.18), i * 60);
        break;
    }
  }

  // --- Music ---------------------------------------------------------------

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
    this._musicNodes.forEach(n => { try { n.stop(); } catch {} });
    this._musicNodes = [];
    this._currentTrack = null;
  }

  // A looping chiptune sequence. The `track` id picks a scale/tempo.
  playMusic(track = 'menu') {
    this.ensureContext();
    if (!this.ctx) return;
    if (this._currentTrack === track) return;
    this.stopMusic();
    this._currentTrack = track;

    const configs = {
      menu:   { scale: [0, 2, 4, 5, 7, 9, 11], root: 261.63, bpm: 96, bass: true },
      level1: { scale: [0, 2, 3, 5, 7, 8, 10], root: 220.00, bpm: 108, bass: true },
      level2: { scale: [0, 2, 4, 7, 9],         root: 293.66, bpm: 112, bass: true },
      level3: { scale: [0, 3, 5, 7, 10],        root: 246.94, bpm: 120, bass: true },
      level4: { scale: [0, 2, 3, 5, 7, 8, 10],  root: 196.00, bpm: 126, bass: true },
      level5: { scale: [0, 2, 4, 5, 7, 9, 11],  root: 261.63, bpm: 132, bass: true },
      level6: { scale: [0, 2, 3, 5, 6, 8, 10],  root: 174.61, bpm: 140, bass: true },
      level7: { scale: [0, 2, 3, 5, 7, 8, 10],  root: 146.83, bpm: 150, bass: true },
    };
    const cfg = configs[track] || configs.menu;

    const stepDur = 60 / cfg.bpm / 2; // eighth notes
    const pitch = (semi) => cfg.root * Math.pow(2, semi / 12);
    const scale = cfg.scale;

    let step = 0;
    const loopLen = 32;

    const playNote = (freq, dur, type = 'triangle', vol = 0.12, dest) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g).connect(dest || this.musicGain);
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start();
      osc.stop(now + dur + 0.02);
      this._musicNodes.push(osc);
      if (this._musicNodes.length > 120) this._musicNodes.shift();
    };

    const tick = () => {
      if (!this.ctx || this._currentTrack !== track) return;

      // lead melody every other step
      if (step % 2 === 0) {
        const idx = scale[Math.floor(Math.random() * scale.length)];
        const octave = (step % 8 < 4) ? 1 : 2;
        playNote(pitch(idx) * octave, stepDur * 1.2, 'triangle', 0.10);
      }

      // bass on strong beats
      if (cfg.bass && step % 4 === 0) {
        const bassIdx = scale[(step / 4) % scale.length];
        playNote(pitch(bassIdx) / 2, stepDur * 1.8, 'sine', 0.16);
      }

      // gentle hat noise
      if (step % 2 === 1) {
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.value = 4000;
        const g = this.ctx.createGain();
        g.gain.value = 0.06;
        src.connect(filt).connect(g).connect(this.musicGain);
        src.start();
        this._musicNodes.push(src);
      }

      step = (step + 1) % loopLen;
    };

    // Start immediately so there's no silence gap.
    tick();
    this._musicTimer = setInterval(tick, stepDur * 1000);
  }
}
