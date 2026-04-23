import * as THREE from 'three';
import { Snowman, IceGoblin, IceBat, RollingBall, PolarKing } from './enemies.js';
import { Fish, Spikes, IcePatch, Pit, Goal, makeBlock, MovingPlatform } from './obstacles.js';

// A Level bundles all visuals, colliders, and gameplay entities for one stage.
// The Game class is responsible for wiring things into the scene.
export class Level {
  constructor(index, cfg) {
    this.index = index;
    this.name = cfg.name;
    this.subtitle = cfg.subtitle;
    this.description = cfg.description;
    this.theme = cfg.theme;
    this.length = cfg.length ?? 60;
    this.width = cfg.width ?? 16;
    this.spawn = cfg.spawn ?? new THREE.Vector3(0, 1.2, -cfg.length / 2 + 4);
    this.goalPos = cfg.goalPos ?? new THREE.Vector3(0, 0, cfg.length / 2 - 4);
    this.isBoss = !!cfg.isBoss;
    this.icy = !!cfg.icy;
    this.hasPit = !!cfg.hasPit;
    this.group = new THREE.Group();
    this.colliders = []; // static AABB colliders
    this.platforms = []; // MovingPlatform instances
    this.pits = [];
    this.enemies = [];
    this.fishes = [];
    this.goal = null;
    this.decor = [];
    // Levels with pits: set groundY very low so the player falls through.
    // killY is the height below which the player dies.
    this.groundY = cfg.hasPit ? -999 : 0;
    this.killY = cfg.hasPit ? -2 : -100;
  }

  addBlock(x, y, z, w, h, d, color) {
    const m = makeBlock(x, y, z, w, h, d, color);
    this.group.add(m);
    this.colliders.push(m.userData.box);
    return m;
  }

  addSpikes(x, z, count = 3) {
    const s = new Spikes(x, z, count);
    this.group.add(s.mesh);
    this.enemies.push({
      mesh: s.mesh,
      position: s.mesh.position,
      radius: s.radius,
      update: () => {},
      alive: true,
      stompable: false,
      damage: 1,
      isStatic: true,
    });
  }

  addIcePatch(x, z, size) {
    const p = new IcePatch(x, z, size);
    this.group.add(p.mesh);
    this.decor.push(p);
  }

  addPit(x, z, w, d) {
    const p = new Pit(x, z, w, d);
    this.group.add(p.mesh);
    this.pits.push(p);
  }

  addFish(x, z) {
    const f = new Fish(x, z);
    this.group.add(f.mesh);
    this.fishes.push(f);
  }

  addEnemy(e) {
    this.enemies.push(e);
    this.group.add(e.mesh);
  }

  addPlatform(plat) {
    this.platforms.push(plat);
    this.group.add(plat.mesh);
  }

  setGoal(x, z) {
    this.goal = new Goal(x, z);
    this.goalPos.set(x, 0, z);
    this.group.add(this.goal.mesh);
  }

  // Outer boundary walls so the player can't walk off the sides.
  addBoundaryWalls() {
    const half = this.width / 2;
    const L = this.length;
    const wallH = 1.5;
    this.addBlock(-half - 0.5, 0, 0, 1, wallH, L, 0x2c3c5a);
    this.addBlock(half + 0.5, 0, 0, 1, wallH, L, 0x2c3c5a);
    // back wall
    this.addBlock(0, 0, -L / 2 - 0.5, this.width + 2, wallH, 1, 0x2c3c5a);
    // the front wall is "open" near the goal; use a short decorative wall
    this.addBlock(0, 0, L / 2 + 0.5, this.width + 2, wallH * 0.4, 1, 0x2c3c5a);
  }
}

// ---------------------------------------------------------------------------
// Level builders.

function buildLevel1() {
  const lvl = new Level(1, {
    name: 'Nível 1 — Planícies Nevadas',
    subtitle: 'Planícies Nevadas',
    description: 'Aprenda o básico. Corra até a bandeira amarela e pegue peixes no caminho!',
    theme: { sky: 0x9cd6ff, fog: 0xcfe8ff, ground: 0xffffff, fogNear: 30, fogFar: 70 },
    length: 60, width: 14,
  });
  lvl.addBoundaryWalls();
  // decorative hills (small blocks)
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * 10 + ((Math.random() > 0.5) ? 1 : -1) * 9;
    const z = -24 + i * 5;
    const h = 0.6 + Math.random() * 0.6;
    lvl.addBlock(x, 0, z, 1.2 + Math.random(), h, 1.2 + Math.random(), 0xe6f2ff);
  }
  // fish trail
  for (let i = 0; i < 6; i++) lvl.addFish((Math.random() - 0.5) * 8, -20 + i * 6);
  // snowmen
  lvl.addEnemy(new Snowman(-3, -10, 3));
  lvl.addEnemy(new Snowman(4, 5, 3));
  lvl.addEnemy(new Snowman(-1, 15, 2));
  lvl.setGoal(0, 26);
  return lvl;
}

function buildLevel2() {
  const lvl = new Level(2, {
    name: 'Nível 2 — Cavernas de Gelo',
    subtitle: 'Cavernas de Gelo',
    description: 'O chão está escorregadio! Cuidado com os espinhos.',
    theme: { sky: 0x4a6aa8, fog: 0x3a5080, ground: 0xbfe9ff, fogNear: 18, fogFar: 55 },
    length: 70, width: 14, icy: true,
  });
  lvl.addBoundaryWalls();
  lvl.addIcePatch(0, 0, 6);
  lvl.addIcePatch(5, -10, 4);
  lvl.addIcePatch(-5, 8, 4);
  lvl.addIcePatch(0, 18, 5);

  // cave pillars
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (2 + Math.random() * 3);
    const z = -25 + i * 6;
    lvl.addBlock(x, 0, z, 1.2, 2.2, 1.2, 0x7fbddb);
  }
  // spikes
  lvl.addSpikes(-3, -8, 3);
  lvl.addSpikes(3, 0, 3);
  lvl.addSpikes(-2, 12, 4);
  lvl.addSpikes(4, 20, 3);
  // enemies
  lvl.addEnemy(new IceGoblin(3, -5));
  lvl.addEnemy(new IceGoblin(-3, 10));
  lvl.addEnemy(new Snowman(0, 22, 4));
  // fish
  for (let i = 0; i < 6; i++) lvl.addFish((i % 2 === 0 ? -1 : 1) * 3, -20 + i * 7);
  lvl.setGoal(0, 30);
  return lvl;
}

function buildLevel3() {
  const lvl = new Level(3, {
    name: 'Nível 3 — Lago Congelado',
    subtitle: 'Lago Congelado',
    description: 'Pule nas plataformas flutuantes para atravessar o vazio.',
    theme: { sky: 0x5e87c3, fog: 0x6b8cc8, ground: 0x2a3f66, fogNear: 25, fogFar: 65 },
    length: 70, width: 20, hasPit: true,
  });
  lvl.addBoundaryWalls();
  // Starting island — covers the full spawn area.
  lvl.addBlock(0, 0, -24, 20, 0.5, 16, 0xbfe3ff);
  // Stepping-stone ice floes
  const floes = [
    [-5, 0, -10, 5, 0.5, 5],
    [5,  0, -3, 5, 0.5, 5],
    [-4, 0, 6, 4.5, 0.5, 4.5],
    [4,  0, 14, 5, 0.5, 5],
  ];
  floes.forEach(([x, y, z, w, h, d]) => lvl.addBlock(x, y, z, w, h, d, 0xbfe3ff));
  // End island
  lvl.addBlock(0, 0, 27, 20, 0.5, 12, 0xbfe3ff);

  // Moving platforms span the big gaps
  lvl.addPlatform(new MovingPlatform(0, 0.5, 2, 2.6, 2.6, 'x', 5, 1.3));
  lvl.addPlatform(new MovingPlatform(0, 0.5, 20, 2.6, 2.6, 'x', 6, 1.6));

  // bats patrol above the gap
  lvl.addEnemy(new IceBat(-3, 0, 4));
  lvl.addEnemy(new IceBat(4, 10, 4));
  lvl.addEnemy(new IceBat(-2, 20, 3));

  // fish on platforms
  [[-5, -10], [5, -3], [-4, 6], [4, 14], [0, 27]].forEach(([x, z]) => lvl.addFish(x, z));
  lvl.setGoal(0, 30);
  return lvl;
}

function buildLevel4() {
  const lvl = new Level(4, {
    name: 'Nível 4 — Passo da Montanha',
    subtitle: 'Passo da Montanha',
    description: 'Bolas de neve gigantes rolam pela encosta. Atenção ao tempo!',
    theme: { sky: 0xcbe0f7, fog: 0xd9e9f9, ground: 0xf0f4fc, fogNear: 26, fogFar: 70 },
    length: 80, width: 12,
  });
  lvl.addBoundaryWalls();
  // walls forming a narrow path
  for (let i = 0; i < 6; i++) {
    const z = -28 + i * 10;
    const off = (i % 2 === 0 ? -1 : 1) * 3.5;
    lvl.addBlock(off, 0, z, 3, 1.5, 3, 0xd6dee9);
  }
  // rolling balls
  lvl.addEnemy(new RollingBall(-6, -20, 1, 6, 10));
  lvl.addEnemy(new RollingBall(6, -8, -1, 7, 10));
  lvl.addEnemy(new RollingBall(-6, 4, 1, 8, 10));
  lvl.addEnemy(new RollingBall(6, 16, -1, 9, 10));
  lvl.addEnemy(new Snowman(0, 28, 3));
  // spikes at choke points
  lvl.addSpikes(-2, -15, 2);
  lvl.addSpikes(2, 2, 2);
  for (let i = 0; i < 5; i++) lvl.addFish((i % 2 === 0 ? -1 : 1) * 2, -18 + i * 8);
  lvl.setGoal(0, 34);
  return lvl;
}

function buildLevel5() {
  const lvl = new Level(5, {
    name: 'Nível 5 — Arquipélago Polar',
    subtitle: 'Arquipélago Polar',
    description: 'Inimigos de todos os lados. Use o pulo em cima dos bonecos!',
    theme: { sky: 0x3a5a8f, fog: 0x273d66, ground: 0x8ebdff, fogNear: 30, fogFar: 85 },
    length: 80, width: 20,
  });
  lvl.addBoundaryWalls();
  // Ice pillars scattered
  for (let i = 0; i < 14; i++) {
    const x = (Math.random() - 0.5) * 16;
    const z = -30 + (i * 4.5) % 60;
    const h = 0.8 + Math.random() * 1.2;
    lvl.addBlock(x, 0, z, 1.3, h, 1.3, 0xcfe3ff);
  }
  // A pit in the middle with a moving platform
  lvl.addPit(0, 0, 7, 6);
  lvl.addBlock(0, -0.5, 0, 7, 0.5, 6, 0x1c2a46);
  lvl.addPlatform(new MovingPlatform(0, 0.2, 0, 3, 3, 'z', 2.8, 1.8));

  lvl.addEnemy(new Snowman(-4, -18, 4));
  lvl.addEnemy(new Snowman(5, -8, 4));
  lvl.addEnemy(new IceGoblin(-6, 5));
  lvl.addEnemy(new IceGoblin(6, 12));
  lvl.addEnemy(new IceBat(0, 20, 6));
  lvl.addEnemy(new Snowman(0, 28, 4));
  for (let i = 0; i < 8; i++) lvl.addFish((i % 2 === 0 ? -1 : 1) * (2 + (i % 3)), -22 + i * 6);
  lvl.setGoal(0, 34);
  return lvl;
}

function buildLevel6() {
  const lvl = new Level(6, {
    name: 'Nível 6 — Abismo Gelado',
    subtitle: 'Abismo Gelado',
    description: 'Plataformas se movem perigosamente sobre o vazio. Concentre-se!',
    theme: { sky: 0x1b2a4a, fog: 0x0b1428, ground: 0x10203a, fogNear: 20, fogFar: 70 },
    length: 90, width: 20, hasPit: true,
  });
  lvl.addBoundaryWalls();
  // visible pit bottom (non-colliding, cosmetic)
  const pitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 100),
    new THREE.MeshBasicMaterial({ color: 0x030812 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -9;
  lvl.group.add(pitFloor);

  // Starting island
  lvl.addBlock(0, 0, -40, 18, 0.5, 10, 0xa0c5ff);

  const platforms = [
    [-4, 0, -28, 6, 0.5, 6, 0xa0c5ff],
    [4,  0, -18, 4.5, 0.5, 4.5, 0xa0c5ff],
    [-5, 0, -8, 4.5, 0.5, 4.5, 0xa0c5ff],
    [5,  0, 2, 4.5, 0.5, 4.5, 0xa0c5ff],
    [-4, 0, 12, 4.5, 0.5, 4.5, 0xa0c5ff],
    [4,  0, 22, 4.5, 0.5, 4.5, 0xa0c5ff],
    [0,  0, 34, 12, 0.5, 8, 0xa0c5ff],
  ];
  platforms.forEach(([x, y, z, w, h, d, c]) => lvl.addBlock(x, y, z, w, h, d, c));

  // Moving platforms in between
  lvl.addPlatform(new MovingPlatform(0, 0.5, -23, 2.5, 2.5, 'x', 5, 2.0));
  lvl.addPlatform(new MovingPlatform(0, 0.5, -13, 2.5, 2.5, 'z', 3, 1.6));
  lvl.addPlatform(new MovingPlatform(0, 0.5, -3, 2.5, 2.5, 'x', 6, 2.4));
  lvl.addPlatform(new MovingPlatform(0, 0.5, 7, 2.5, 2.5, 'z', 3.5, 1.8));
  lvl.addPlatform(new MovingPlatform(0, 0.5, 17, 2.5, 2.5, 'x', 6, 2.8));
  lvl.addPlatform(new MovingPlatform(0, 0.5, 27, 2.5, 2.5, 'z', 3.5, 2.0));

  lvl.addEnemy(new IceBat(-3, -20, 5));
  lvl.addEnemy(new IceBat(3, -5, 5));
  lvl.addEnemy(new IceBat(-3, 10, 5));
  lvl.addEnemy(new IceBat(0, 25, 4));
  lvl.addEnemy(new IceGoblin(0, 32));

  [[-4, -28], [4, -18], [-5, -8], [5, 2], [-4, 12], [4, 22], [0, 34]].forEach(([x, z]) => lvl.addFish(x, z));

  lvl.setGoal(0, 36);
  return lvl;
}

function buildLevel7() {
  const lvl = new Level(7, {
    name: 'Nível 7 — Covil do Rei Polar',
    subtitle: 'Covil do Rei Polar',
    description: 'Derrote o Rei Polar! Pule sobre ele 3 vezes para vencer.',
    theme: { sky: 0x301a3c, fog: 0x1c0a26, ground: 0x6b3a8a, fogNear: 25, fogFar: 70 },
    length: 44, width: 30, isBoss: true,
  });
  lvl.addBoundaryWalls();
  // circular arena pillars
  const R = 10;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lvl.addBlock(Math.cos(a) * R, 0, Math.sin(a) * R, 1.5, 2.2, 1.5, 0x8a4bb3);
  }
  // a central podium
  lvl.addBlock(0, 0, 0, 6, 0.4, 6, 0x5a2a7a);
  // boss
  lvl.addEnemy(new PolarKing(0, 6));
  // some helper fish
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    lvl.addFish(Math.cos(a) * 5, Math.sin(a) * 5);
  }
  // goal appears after boss is defeated (we still add it for layout)
  lvl.setGoal(0, 16);
  return lvl;
}

export const levelBuilders = [
  buildLevel1,
  buildLevel2,
  buildLevel3,
  buildLevel4,
  buildLevel5,
  buildLevel6,
  buildLevel7,
];

export function buildLevel(index) {
  const fn = levelBuilders[index];
  if (!fn) throw new Error('No such level: ' + index);
  return fn();
}

export const LEVEL_META = [
  { name: 'Planícies Nevadas',   icon: '❄️' },
  { name: 'Cavernas de Gelo',    icon: '🕳️' },
  { name: 'Lago Congelado',      icon: '🧊' },
  { name: 'Passo da Montanha',   icon: '⛰️' },
  { name: 'Arquipélago Polar',   icon: '🏝️' },
  { name: 'Abismo Gelado',       icon: '🌌' },
  { name: 'Covil do Rei Polar',  icon: '👑' },
];
