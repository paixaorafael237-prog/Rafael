import * as THREE from 'three';

// Collectible fish. The player picks them up to earn points.
export class Fish {
  constructor(x, z) {
    this.collected = false;
    const g = new THREE.Group();
    g.position.set(x, 1.2, z);

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0x62a7ff })
    );
    body.scale.set(1.4, 0.8, 0.8);
    body.castShadow = true;
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.25, 4),
      new THREE.MeshLambertMaterial({ color: 0x62a7ff })
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.32;
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    eye.position.set(0.15, 0.06, 0.13);
    g.add(body, tail, eye);

    this.mesh = g;
    this.radius = 0.35;
    this._t = Math.random() * Math.PI * 2;
  }

  update(dt) {
    if (this.collected) return;
    this._t += dt;
    this.mesh.position.y = 1.2 + Math.sin(this._t * 3) * 0.12;
    this.mesh.rotation.y += dt * 1.4;
  }
}

// Static spike hazard.
export class Spikes {
  constructor(x, z, count = 3) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    const mat = new THREE.MeshLambertMaterial({ color: 0xd7dde6 });
    for (let i = 0; i < count; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), mat);
      s.position.set((i - (count - 1) / 2) * 0.4, 0.35, 0);
      s.castShadow = true;
      this.mesh.add(s);
    }
    this.radius = count * 0.2;
    this.damage = 1;
  }
  update() {}
}

// Ice patch — cosmetic only (visual). Physics treats whole ground as slippery
// in the levels that are flagged icy.
export class IcePatch {
  constructor(x, z, size = 4) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(size, 20),
      new THREE.MeshLambertMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.6 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    m.receiveShadow = true;
    this.mesh = m;
    this.noCollide = true;
  }
  update() {}
}

// Gap in the floor (visual pit — falling off kills the player).
export class Pit {
  constructor(x, z, w, d) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    const depth = 8;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.1, d),
      new THREE.MeshBasicMaterial({ color: 0x081425 })
    );
    floor.position.y = -depth / 2;
    this.mesh.add(floor);
    this.bounds = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
    this.isPit = true;
  }
  update() {}
}

// Goal flag at the end of each level.
export class Goal {
  constructor(x, z) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
    );
    pole.position.y = 1.75;
    pole.castShadow = true;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xffd84a, side: THREE.DoubleSide })
    );
    flag.position.set(0.8, 3.0, 0);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16),
      new THREE.MeshLambertMaterial({ color: 0xbbbbbb })
    );
    base.position.y = 0.1;
    this.mesh.add(pole, flag, base);
    this._flag = flag;
    this.radius = 1.2;
  }
  update(dt) {
    if (this._flag) this._flag.rotation.y = Math.sin(performance.now() / 400) * 0.3;
  }
}

// Wall / platform block. Provides a collider.
export function makeBlock(x, y, z, w, h, d, color = 0x9aa5be) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.box = {
    min: { x: x - w / 2, y: y, z: z - d / 2 },
    max: { x: x + w / 2, y: y + h, z: z + d / 2 },
  };
  return m;
}

// Moving platform that translates on a single axis.
export class MovingPlatform {
  constructor(x, y, z, w, d, axis = 'x', range = 4, speed = 2) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.4, d),
      new THREE.MeshLambertMaterial({ color: 0x6fb0ff })
    );
    this.mesh.position.set(x, y, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.origin = new THREE.Vector3(x, y, z);
    this.axis = axis;
    this.range = range;
    this.speed = speed;
    this._t = Math.random() * Math.PI * 2;
    this.size = { w, h: 0.4, d };
    this.collider = this._makeCollider();
  }

  _makeCollider() {
    const p = this.mesh.position;
    const { w, h, d } = this.size;
    return {
      min: { x: p.x - w / 2, y: p.y - h / 2, z: p.z - d / 2 },
      max: { x: p.x + w / 2, y: p.y + h / 2, z: p.z + d / 2 },
    };
  }

  update(dt) {
    this._t += dt * this.speed;
    const off = Math.sin(this._t) * this.range;
    if (this.axis === 'x') this.mesh.position.x = this.origin.x + off;
    else if (this.axis === 'z') this.mesh.position.z = this.origin.z + off;
    else if (this.axis === 'y') this.mesh.position.y = this.origin.y + off;
    const c = this._makeCollider();
    this.collider.min = c.min;
    this.collider.max = c.max;
  }
}
