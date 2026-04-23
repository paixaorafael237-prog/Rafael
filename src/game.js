import * as THREE from 'three';
import { Penguin } from './penguin.js';
import { buildLevel } from './levels.js';

const MAX_LEVELS = 7;

export class Game {
  constructor({ canvas, audio, ui, input }) {
    this.canvas = canvas;
    this.audio = audio;
    this.ui = ui;
    this.input = input;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

    this.penguin = new Penguin();

    this.state = 'menu'; // menu | playing | paused | intro | complete | gameover | victory
    this.levelIndex = 0;
    this.level = null;
    this.lives = 3;
    this.fishCollected = 0;
    this.totalFishCollectedSession = 0;
    this.time = 0;
    this.levelStartTime = 0;
    this._clock = new THREE.Clock();

    // persistent progress
    this.highestUnlocked = this._loadProgress();

    window.addEventListener('resize', () => this._onResize());
    this._onResize();

    this._setupSceneBase();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _loadProgress() {
    const v = parseInt(localStorage.getItem('penguin3d_unlocked') || '1', 10);
    return Math.max(1, Math.min(MAX_LEVELS, v));
  }

  _saveProgress(levelIndex1Based) {
    this.highestUnlocked = Math.max(this.highestUnlocked, levelIndex1Based);
    localStorage.setItem('penguin3d_unlocked', String(this.highestUnlocked));
  }

  _setupSceneBase() {
    // Lights that persist across levels; fog/sky is swapped per-level.
    this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sun.position.set(20, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 0.1;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.scene.add(this.sun);

    // Player mesh is always in the scene; we only change its position.
    this.scene.add(this.penguin.mesh);
  }

  _clearLevel() {
    if (this.level) {
      this.scene.remove(this.level.group);
      if (this._ground) {
        this.scene.remove(this._ground);
        this._ground.geometry.dispose();
        this._ground.material.dispose();
        this._ground = null;
      }
      this.level = null;
    }
  }

  loadLevel(index) {
    this._clearLevel();
    this.levelIndex = index;
    this.level = buildLevel(index);
    this.scene.add(this.level.group);

    const theme = this.level.theme;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear ?? 30, theme.fogFar ?? 80);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(this.level.width + 4, this.level.length + 4, 1, 1);
    const floorMat = new THREE.MeshLambertMaterial({ color: theme.ground });
    this._ground = new THREE.Mesh(floorGeo, floorMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.position.y = this.level.groundY ?? 0;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);

    // Spawn
    this.penguin.reset(this.level.spawn.x, this.level.spawn.y, this.level.spawn.z);

    // Reset per-level stats
    this.fishCollected = 0;
    this.levelStartTime = performance.now();

    // Music per level
    this.audio.playMusic('level' + (index + 1));

    this.ui.showLevelIntro(index + 1, this.level.subtitle, this.level.description);
    this.state = 'intro';
  }

  startLevel() {
    this.state = 'playing';
    this.levelStartTime = performance.now();
    this.ui.hideAllOverlays();
    this.ui.showHUD();
  }

  startGame(fromLevel = 0) {
    this.lives = 3;
    this.totalFishCollectedSession = 0;
    this.loadLevel(fromLevel);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.hideAllOverlays();
    this.ui.showHUD();
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  quitToMenu() {
    this._clearLevel();
    this.state = 'menu';
    this.ui.hideHUD();
    this.ui.showMenu();
    this.audio.playMusic('menu');
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const rawDt = this._clock.getDelta();
    const dt = Math.min(0.05, rawDt); // clamp dt to avoid big jumps

    if (this.state === 'playing') {
      this._update(dt);
    }
    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  _updateCamera(dt) {
    // 3rd-person chase cam behind the penguin.
    const target = new THREE.Vector3().copy(this.penguin.position);
    target.y += 1.2;
    const desired = new THREE.Vector3(target.x, target.y + 4.5, target.z - 8.5);
    this.camera.position.lerp(desired, Math.min(1, 5 * dt));
    this.camera.lookAt(target.x, target.y + 0.3, target.z + 2);
  }

  _update(dt) {
    if (this.input.wasPressed('Escape')) {
      this.pause();
      return;
    }

    // Update moving platforms first so their colliders are up to date.
    for (const p of this.level.platforms) p.update(dt);

    // Merge dynamic colliders temporarily so the penguin's own physics
    // resolves against moving platforms too.
    const staticColliders = this.level.colliders;
    this.level.colliders = staticColliders.concat(this.level.platforms.map(p => p.collider));
    this.penguin.update(dt, this.input, this.level, this.audio);
    this.level.colliders = staticColliders;

    // Fishes
    for (const f of this.level.fishes) {
      if (f.collected) continue;
      f.update(dt);
      if (f.mesh.position.distanceTo(this.penguin.position) < (f.radius + this.penguin.radius)) {
        f.collected = true;
        f.mesh.visible = false;
        this.fishCollected++;
        this.totalFishCollectedSession++;
        this.audio.sfx('fish');
      }
    }

    // Enemies
    for (const e of this.level.enemies) {
      if (!e.alive) continue;
      e.update(dt, this.penguin, this.level);

      const dx = this.penguin.position.x - e.position.x;
      const dz = this.penguin.position.z - e.position.z;
      const d = Math.hypot(dx, dz);
      const r = (e.radius ?? 0.5) + this.penguin.radius;
      if (d < r) {
        // Check for stomp (player above enemy and falling)
        const penguinBottom = this.penguin.position.y;
        const enemyTop = e.position.y + (e.mesh?.scale?.y ?? 1) * 1.6;
        if (e.stompable && !e.isStatic && penguinBottom > enemyTop - 0.3 && this.penguin.velocity.y < 0) {
          if (e.onStomped) e.onStomped();
          this.penguin.velocity.y = 9;
          this.audio.sfx('enemy_hit');
        } else if (this.penguin.invuln <= 0) {
          this._damagePlayer();
        }
      }
    }

    // Death by falling into the void.
    if (this.penguin.position.y < (this.level.killY ?? -100)) {
      this._damagePlayer({ fatal: true });
    }
    // Pit rectangles on non-hasPit levels: immediate death if stepping into one.
    for (const pit of this.level.pits) {
      const b = pit.bounds;
      if (this.penguin.position.x > b.minX && this.penguin.position.x < b.maxX &&
          this.penguin.position.z > b.minZ && this.penguin.position.z < b.maxZ &&
          this.penguin.position.y < 0.6) {
        this._damagePlayer({ fatal: true });
        break;
      }
    }

    // Goal
    if (this.level.goal) {
      const d = this.level.goal.mesh.position.distanceTo(this.penguin.position);
      if (this.level.isBoss) {
        const king = this.level.enemies.find(e => e.constructor && e.constructor.name === 'PolarKing');
        if (king && !king.alive && d < 2.5) this._completeLevel();
      } else if (d < 1.8) {
        this._completeLevel();
      }
    }

    // HUD
    this.time = (performance.now() - this.levelStartTime) / 1000;
    this.ui.updateHUD({
      level: this.levelIndex + 1,
      lives: this.lives,
      fish: this.fishCollected,
      time: this.time,
    });
  }

  _damagePlayer({ fatal = false } = {}) {
    if (this.penguin.invuln > 0 && !fatal) return;
    this.lives -= 1;
    this.audio.sfx('hurt');
    this.canvas.classList.remove('hit');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('hit');

    if (this.lives <= 0) {
      this._gameOver();
      return;
    }

    if (fatal) {
      // respawn at level start
      this.penguin.reset(this.level.spawn.x, this.level.spawn.y, this.level.spawn.z);
      this.penguin.invuln = 1.2;
    } else {
      this.penguin.invuln = 1.2;
      // bump back
      this.penguin.velocity.y = 6;
      this.penguin.velocity.x *= -0.4;
      this.penguin.velocity.z *= -0.4;
    }
  }

  _completeLevel() {
    if (this.state !== 'playing') return;
    this.state = 'complete';
    this.audio.sfx('win');
    this._saveProgress(this.levelIndex + 2); // unlock next
    const elapsed = (performance.now() - this.levelStartTime) / 1000;
    const stats = `Tempo: ${elapsed.toFixed(1)}s · Peixes: ${this.fishCollected}`;
    this.ui.showLevelComplete(stats, this.levelIndex + 1 >= MAX_LEVELS);
  }

  _gameOver() {
    this.state = 'gameover';
    this.audio.sfx('die');
    this.audio.stopMusic();
    this.ui.showGameOver();
  }

  nextLevel() {
    if (this.levelIndex + 1 >= MAX_LEVELS) {
      this.state = 'victory';
      this.ui.showVictory();
      this.audio.playMusic('menu');
      return;
    }
    this.loadLevel(this.levelIndex + 1);
  }
}
