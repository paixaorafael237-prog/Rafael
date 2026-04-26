// Simple keyboard input manager.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this._down = (e) => {
      // Prevent page scroll on space/arrows while playing.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this._up = (e) => {
      this.keys.delete(e.code);
    };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', () => this.keys.clear());
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  axis() {
    let x = 0, z = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z -= 1;
    return { x, z };
  }

  dispose() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
  }
}
