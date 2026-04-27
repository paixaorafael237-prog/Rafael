import { Game } from './game.js';
import { AudioManager } from './audio.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { setupTouchControls } from './touch.js';

const canvas = document.getElementById('game');
const audio = new AudioManager();
const input = new Input();

// Resume audio on the first user interaction (required by browsers).
const kickAudio = async () => {
  await audio.resume();
  audio.playMusic('menu');
};
window.addEventListener('pointerdown', kickAudio, { once: true });
window.addEventListener('keydown', kickAudio, { once: true });

let game;

const ui = new UI({
  audio,
  getUnlocked: () => (game ? game.highestUnlocked : 1),
  onPlay: () => {
    audio.resume();
    game.startGame(0);
  },
  onSelectLevel: (idx) => {
    audio.resume();
    game.startGame(idx);
  },
  onStartLevel: () => game.startLevel(),
  onResume: () => game.resume(),
  onRestart: () => game.restartLevel(),
  onQuit: () => game.quitToMenu(),
  onNextLevel: () => game.nextLevel(),
  onReplay: () => game.loadLevel(game.levelIndex),
  onRetry: () => game.startGame(game.levelIndex),
  onCompleteMenu: () => game.quitToMenu(),
  onGameOverMenu: () => game.quitToMenu(),
  onVictoryMenu: () => game.quitToMenu(),
});

game = new Game({ canvas, audio, ui, input });

setupTouchControls();

// Allow clicking the background to toggle fullscreen on desktop.
canvas.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});
