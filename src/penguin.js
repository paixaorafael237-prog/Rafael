import * as THREE from 'three';

// Builds a stylized low-poly penguin as a THREE.Group.
export function createPenguinMesh() {
  const g = new THREE.Group();

  const blackMat = new THREE.MeshLambertMaterial({ color: 0x141a24 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xf5a623 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), blackMat);
  body.scale.set(1, 1.25, 0.85);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  // Belly (white)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), whiteMat);
  belly.scale.set(1, 1.2, 0.55);
  belly.position.set(0, 0.5, 0.18);
  g.add(belly);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), blackMat);
  head.position.y = 1.35;
  head.castShadow = true;
  g.add(head);

  // Face patch
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), whiteMat);
  face.scale.set(1, 0.9, 0.55);
  face.position.set(0, 1.3, 0.18);
  g.add(face);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), eyeMat);
  eyeL.position.set(-0.12, 1.42, 0.32);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeL, eyeR);

  // Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), orangeMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.32, 0.44);
  g.add(beak);

  // Wings
  const wingGeo = new THREE.BoxGeometry(0.12, 0.5, 0.3);
  const wingL = new THREE.Mesh(wingGeo, blackMat);
  wingL.position.set(-0.55, 0.7, 0);
  wingL.rotation.z = 0.25;
  const wingR = wingL.clone();
  wingR.position.x = 0.55;
  wingR.rotation.z = -0.25;
  g.add(wingL, wingR);

  // Feet
  const footGeo = new THREE.BoxGeometry(0.22, 0.08, 0.3);
  const footL = new THREE.Mesh(footGeo, orangeMat);
  footL.position.set(-0.18, 0.04, 0.12);
  const footR = footL.clone();
  footR.position.x = 0.18;
  g.add(footL, footR);

  g.userData.parts = { body, head, wingL, wingR, footL, footR };
  return g;
}

// Player character with physics-style movement (AABB-ish collisions against
// axis-aligned boxes provided by the level).
export class Penguin {
  constructor() {
    this.mesh = createPenguinMesh();
    this.position = this.mesh.position;
    this.velocity = new THREE.Vector3();
    this.radius = 0.5;
    this.height = 1.7;
    this.onGround = false;
    this.facing = 0; // yaw target
    this._walkPhase = 0;
    this.invuln = 0;
  }

  reset(x = 0, y = 1, z = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.invuln = 0;
  }

  update(dt, input, level, audio) {
    const { x: ix, z: iz } = input.axis();
    const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    const baseSpeed = 5.5;
    const maxSpeed = running ? 8.5 : baseSpeed;
    const accel = 35;
    const damping = this.onGround ? 9 : 2;
    const gravity = -24;
    const jumpV = 9.2;

    // Camera-relative movement is unnecessary because the camera is roughly
    // behind the penguin. We use world axes directly.
    let dx = ix, dz = iz;
    const len = Math.hypot(dx, dz);
    if (len > 0) { dx /= len; dz /= len; }

    this.velocity.x += dx * accel * dt;
    this.velocity.z += dz * accel * dt;

    // Clamp horizontal speed
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hSpeed > maxSpeed) {
      const s = maxSpeed / hSpeed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    // Damping when no input
    if (len === 0) {
      this.velocity.x -= this.velocity.x * Math.min(1, damping * dt);
      this.velocity.z -= this.velocity.z * Math.min(1, damping * dt);
    }

    // Jump
    if (this.onGround && input.wasPressed('Space')) {
      this.velocity.y = jumpV;
      this.onGround = false;
      audio && audio.sfx('jump');
    }

    // Gravity
    this.velocity.y += gravity * dt;

    // Apply movement
    const dxStep = this.velocity.x * dt;
    const dyStep = this.velocity.y * dt;
    const dzStep = this.velocity.z * dt;

    // Move X and resolve collisions
    this.position.x += dxStep;
    this._resolveXZ(level);
    this.position.z += dzStep;
    this._resolveXZ(level);
    this.position.y += dyStep;
    this._resolveY(level, audio);

    // Face the direction of horizontal motion
    if (hSpeed > 0.6) {
      this.facing = Math.atan2(this.velocity.x, this.velocity.z);
    }
    const cur = this.mesh.rotation.y;
    let diff = this.facing - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y = cur + diff * Math.min(1, 12 * dt);

    // Walk animation
    this._walkPhase += hSpeed * dt * 1.8;
    const parts = this.mesh.userData.parts;
    if (parts) {
      const swing = this.onGround ? Math.sin(this._walkPhase * 3) * 0.3 : 0;
      parts.footL.position.z = 0.12 + swing * 0.18;
      parts.footR.position.z = 0.12 - swing * 0.18;
      parts.wingL.rotation.x = swing * 0.6;
      parts.wingR.rotation.x = -swing * 0.6;
    }

    if (this.invuln > 0) {
      this.invuln -= dt;
      const flash = Math.sin(performance.now() / 50) * 0.5 + 0.5;
      this.mesh.visible = flash > 0.35;
    } else {
      this.mesh.visible = true;
    }
  }

  _aabbCollide(level) {
    // Returns a list of colliders the penguin body currently intersects.
    const hits = [];
    const p = this.position;
    const r = this.radius;
    const top = p.y + this.height;
    const bottom = p.y;

    for (const box of level.colliders) {
      if (p.x + r < box.min.x || p.x - r > box.max.x) continue;
      if (p.z + r < box.min.z || p.z - r > box.max.z) continue;
      if (top < box.min.y || bottom > box.max.y) continue;
      hits.push(box);
    }
    return hits;
  }

  _resolveXZ(level) {
    const p = this.position;
    const r = this.radius;
    for (const box of level.colliders) {
      if (p.y + this.height < box.min.y || p.y > box.max.y) continue;
      const cx = Math.max(box.min.x, Math.min(p.x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(p.z, box.max.z));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = (r - d) / d;
        p.x += dx * push;
        p.z += dz * push;
        // kill velocity toward the wall
        const nx = dx / d, nz = dz / d;
        const vn = this.velocity.x * nx + this.velocity.z * nz;
        if (vn < 0) {
          this.velocity.x -= vn * nx;
          this.velocity.z -= vn * nz;
        }
      }
    }
  }

  _resolveY(level, audio) {
    const p = this.position;
    const r = this.radius;
    let landed = false;
    let wasGrounded = this.onGround;
    this.onGround = false;

    // Ground check against level floor (y = 0 by default; floor list may vary)
    if (p.y <= level.groundY) {
      p.y = level.groundY;
      if (this.velocity.y < 0) {
        if (this.velocity.y < -4) landed = true;
        this.velocity.y = 0;
      }
      this.onGround = true;
    }

    // Box tops (landing on top of colliders)
    for (const box of level.colliders) {
      if (p.x + r < box.min.x || p.x - r > box.max.x) continue;
      if (p.z + r < box.min.z || p.z - r > box.max.z) continue;
      // landing on top
      if (this.velocity.y <= 0 && p.y <= box.max.y + 0.01 && p.y >= box.max.y - 0.6) {
        p.y = box.max.y;
        if (this.velocity.y < -4) landed = true;
        this.velocity.y = 0;
        this.onGround = true;
      } else if (this.velocity.y > 0 && p.y + this.height >= box.min.y && p.y + this.height - this.velocity.y * 0.03 <= box.min.y + 0.3) {
        // bonk head
        this.velocity.y = 0;
      }
    }

    if (landed && !wasGrounded && audio) audio.sfx('land');
  }
}
