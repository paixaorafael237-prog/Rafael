// Touch / on-screen controls for mobile.
// Dispatches synthetic keydown / keyup events so the existing keyboard
// `Input` manager picks them up without any special-casing.

const HAS_TOUCH = typeof window !== 'undefined' &&
  ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

function dispatchKey(type, code) {
  const map = {
    KeyW: { key: 'w' },
    KeyA: { key: 'a' },
    KeyS: { key: 's' },
    KeyD: { key: 'd' },
    Space: { key: ' ' },
    ShiftLeft: { key: 'Shift' },
    Escape: { key: 'Escape' },
  };
  const info = map[code] || { key: code };
  const ev = new KeyboardEvent(type, { code, key: info.key, bubbles: true });
  window.dispatchEvent(ev);
}

export function setupTouchControls() {
  const root = document.getElementById('touch-controls');
  if (!root) return;

  // The CSS already hides the panel on `pointer: fine` (desktop). On hybrid
  // devices we still want to allow taps; bail only on plain desktop browsers.
  if (!HAS_TOUCH) return;

  root.addEventListener('contextmenu', (e) => e.preventDefault());

  for (const btn of root.querySelectorAll('.touch-btn')) {
    const code = btn.dataset.key;
    if (!code) continue;

    const press = (e) => {
      e.preventDefault();
      btn.classList.add('active');
      dispatchKey('keydown', code);
    };
    const release = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      dispatchKey('keyup', code);
    };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }
}

export function showTouchControls(show) {
  const root = document.getElementById('touch-controls');
  if (!root) return;
  if (show && HAS_TOUCH) root.classList.remove('hidden');
  else root.classList.add('hidden');
}
