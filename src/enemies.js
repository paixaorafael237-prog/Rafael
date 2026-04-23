import * as THREE from 'three';

// Base class for anything that can damage the player on touch.
class Enemy {
  constructor() {
    this.mesh = new THREE.Group();
    this.alive = true;
    this.radius = 0.6;
    this.damage = 1;
    this.stompable = false;
  }
  get position() { return this.mesh.position; }
  update(_dt, _player, _level) {}
}

// Snowman that paces back and forth along a path.
export class Snowman extends Enemy {
  constructor(x, z, rangeX = 4) {
    super();
    this.mesh.position.set(x, 0, z);
    this.startX = x;
    this.rangeX = rangeX;
    this.dir = 1;
    this.speed = 1.8;
    this.stompable = true;
    this.radius = 0.55;
    this._build();
  }

  _build() {
    const white = new THREE.MeshLambertMaterial({ color: 0xfafcff });
    const orange = new THREE.MeshLambertMaterial({ color: 0xff7a1f });
    const coal = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), white);
    bottom.position.y = 0.55;
    bottom.castShadow = true;
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), white);
    mid.position.y = 1.2;
    mid.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), white);
    head.position.y = 1.7;
    head.castShadow = true;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), orange);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.72, 0.3);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), coal);
    eyeL.position.set(-0.08, 1.8, 0.22);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.08;
    this.mesh.add(bottom, mid, head, nose, eyeL, eyeR);
    this._head = head;
  }

  update(dt, _player, _level) {
    if (!this.alive) return;
    this.mesh.position.x += this.dir * this.speed * dt;
    if (this.mesh.position.x > this.startX + this.rangeX) this.dir = -1;
    if (this.mesh.position.x < this.startX - this.rangeX) this.dir = 1;
    this.mesh.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (this._head) this._head.rotation.y = Math.sin(performance.now() / 300) * 0.3;
  }

  onStomped() {
    this.alive = false;
    this.mesh.scale.y = 0.2;
    this.mesh.position.y -= 0.2;
    setTimeout(() => { this.mesh.visible = false; }, 400);
  }
}

// Spiky ice goblin — faster, not stompable.
export class IceGoblin extends Enemy {
  constructor(x, z) {
    super();
    this.mesh.position.set(x, 0, z);
    this._t = 0;
    this.speed = 2.4;
    this.radius = 0.5;
    this.damage = 1;

    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshLambertMaterial({ color: 0x6fd0ff, flatShading: true })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    const eyes = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.03, 6, 10),
      new THREE.MeshBasicMaterial({ color: 0xff3355 })
    );
    eyes.position.set(0, 0.7, 0.45);
    eyes.rotation.x = Math.PI / 2;
    this.mesh.add(body, eyes);
    this._body = body;
  }

  update(dt, player, _level) {
    if (!this.alive) return;
    this._t += dt;
    const to = new THREE.Vector3().subVectors(player.position, this.position);
    to.y = 0;
    const dist = to.length();
    if (dist < 12 && dist > 0.1) {
      to.normalize();
      this.mesh.position.x += to.x * this.speed * dt;
      this.mesh.position.z += to.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(to.x, to.z);
    }
    if (this._body) {
      this._body.rotation.x = this._t * 6;
      this._body.rotation.z = this._t * 4;
    }
  }
}

// Floating ice bat that bobs up and down on a patrol line.
export class IceBat extends Enemy {
  constructor(x, z, rangeZ = 5) {
    super();
    this.mesh.position.set(x, 2.2, z);
    this.startZ = z;
    this.rangeZ = rangeZ;
    this.dir = 1;
    this.speed = 3;
    this._t = 0;
    this.radius = 0.5;

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0x5a4976 })
    );
    body.castShadow = true;
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x4a3c60, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), wingMat);
    wingL.position.set(-0.45, 0, 0);
    const wingR = wingL.clone();
    wingR.position.x = 0.45;
    this.mesh.add(body, wingL, wingR);
    this._wings = [wingL, wingR];
  }

  update(dt, _player) {
    if (!this.alive) return;
    this._t += dt;
    this.mesh.position.z += this.dir * this.speed * dt;
    if (this.mesh.position.z > this.startZ + this.rangeZ) this.dir = -1;
    if (this.mesh.position.z < this.startZ - this.rangeZ) this.dir = 1;
    this.mesh.position.y = 2.4 + Math.sin(this._t * 5) * 0.4;
    this.mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;
    const flap = Math.sin(this._t * 18) * 0.8;
    this._wings[0].rotation.z = flap;
    this._wings[1].rotation.z = -flap;
  }
}

// Rolling snowball that moves in a straight line and respawns.
export class RollingBall extends Enemy {
  constructor(x, z, dirX = 1, speed = 6, travel = 18) {
    super();
    this.mesh.position.set(x, 0.7, z);
    this.startX = x;
    this.dirX = dirX;
    this.speed = speed;
    this.travel = travel;
    this.radius = 0.75;
    this.damage = 1;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 18, 14),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    m.castShadow = true;
    this.mesh.add(m);
    this._ball = m;
  }

  update(dt, _player) {
    this.mesh.position.x += this.dirX * this.speed * dt;
    if (Math.abs(this.mesh.position.x - this.startX) > this.travel) {
      this.mesh.position.x = this.startX;
    }
    if (this._ball) this._ball.rotation.z -= this.dirX * this.speed * dt;
  }
}

// The final boss — a big "Polar King" with periodic stomps.
export class PolarKing extends Enemy {
  constructor(x, z) {
    super();
    this.mesh.position.set(x, 0, z);
    this.hp = 3;
    this.radius = 1.1;
    this.speed = 2.2;
    this._t = 0;
    this._cooldown = 0;
    this.stompable = true; // but requires 3 stomps
    this.damage = 1;

    const fur = new THREE.MeshLambertMaterial({ color: 0xf5f9ff });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 14), fur);
    body.position.y = 1.1; body.scale.set(1, 0.9, 1);
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), fur);
    head.position.y = 2.25;
    head.castShadow = true;
    const ears = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), fur);
    ears.position.set(-0.5, 2.7, 0);
    const ear2 = ears.clone(); ear2.position.x = 0.5;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.5, 6),
      new THREE.MeshLambertMaterial({ color: 0xffd84a })
    );
    crown.position.y = 3.05;
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    eyeL.position.set(-0.22, 2.35, 0.6);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.22;
    this.mesh.add(body, head, ears, ear2, crown, eyeL, eyeR);
    this._body = body;
  }

  update(dt, player, _level) {
    if (!this.alive) return;
    this._t += dt;
    this._cooldown -= dt;
    const to = new THREE.Vector3().subVectors(player.position, this.position);
    to.y = 0;
    const dist = to.length();
    if (dist > 1.5 && dist < 20) {
      to.normalize();
      this.mesh.position.x += to.x * this.speed * dt;
      this.mesh.position.z += to.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(to.x, to.z);
    }
    // idle breathe
    this._body.scale.y = 0.9 + Math.sin(this._t * 2) * 0.03;
  }

  onStomped() {
    this.hp -= 1;
    this.mesh.position.y = 0.1;
    setTimeout(() => { if (this.alive) this.mesh.position.y = 0; }, 120);
    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.scale.setScalar(0.6);
      setTimeout(() => { this.mesh.visible = false; }, 600);
    }
  }
}
