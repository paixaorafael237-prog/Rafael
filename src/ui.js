import { LEVEL_META } from './levels.js';

const MAX_LEVELS = 7;

export class UI {
  constructor({ audio, onPlay, onSelectLevel, onResume, onRestart, onQuit, onStartLevel, onNextLevel, onReplay, onRetry, onCompleteMenu, onGameOverMenu, onVictoryMenu, getUnlocked }) {
    this.audio = audio;
    this.onPlay = onPlay;
    this.onSelectLevel = onSelectLevel;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onQuit = onQuit;
    this.onStartLevel = onStartLevel;
    this.onNextLevel = onNextLevel;
    this.onReplay = onReplay;
    this.onRetry = onRetry;
    this.onCompleteMenu = onCompleteMenu;
    this.onGameOverMenu = onGameOverMenu;
    this.onVictoryMenu = onVictoryMenu;
    this.getUnlocked = getUnlocked;

    this.el = (id) => document.getElementById(id);
    this._bind();
    // Hide loading, show menu
    this.el('loading').classList.add('hidden');
    this.el('menu').classList.remove('hidden');
  }

  _bind() {
    const clickAudio = () => this.audio.sfx('click');
    const hoverAudio = () => this.audio.sfx('hover');
    document.querySelectorAll('.btn').forEach(b => {
      b.addEventListener('mouseenter', hoverAudio);
    });

    this.el('btn-play').addEventListener('click', () => { clickAudio(); this.onPlay(); });
    this.el('btn-levels').addEventListener('click', () => { clickAudio(); this._showLevelGrid(); });
    this.el('btn-options').addEventListener('click', () => { clickAudio(); this._show('options'); });
    this.el('btn-credits').addEventListener('click', () => { clickAudio(); this._show('credits'); });

    document.querySelectorAll('[data-back]').forEach(b => {
      b.addEventListener('click', () => { clickAudio(); this._show(b.dataset.back); });
    });

    this.el('btn-resume').addEventListener('click', () => { clickAudio(); this.onResume(); });
    this.el('btn-restart').addEventListener('click', () => { clickAudio(); this.onRestart(); });
    this.el('btn-quit').addEventListener('click', () => { clickAudio(); this.onQuit(); });

    this.el('btn-start-level').addEventListener('click', () => { clickAudio(); this.onStartLevel(); });

    this.el('btn-next-level').addEventListener('click', () => { clickAudio(); this.onNextLevel(); });
    this.el('btn-replay').addEventListener('click', () => { clickAudio(); this.onReplay(); });
    this.el('btn-complete-menu').addEventListener('click', () => { clickAudio(); this.onCompleteMenu(); });

    this.el('btn-retry').addEventListener('click', () => { clickAudio(); this.onRetry(); });
    this.el('btn-gameover-menu').addEventListener('click', () => { clickAudio(); this.onGameOverMenu(); });
    this.el('btn-victory-menu').addEventListener('click', () => { clickAudio(); this.onVictoryMenu(); });

    // Options sliders
    const music = this.el('vol-music');
    const sfx = this.el('vol-sfx');
    music.addEventListener('input', () => this.audio.setMusicVolume(parseFloat(music.value)));
    sfx.addEventListener('input', () => this.audio.setSfxVolume(parseFloat(sfx.value)));

    // Load saved volumes
    const savedMusic = parseFloat(localStorage.getItem('penguin3d_music') ?? '0.4');
    const savedSfx = parseFloat(localStorage.getItem('penguin3d_sfx') ?? '0.6');
    music.value = savedMusic;
    sfx.value = savedSfx;
    this.audio.setMusicVolume(savedMusic);
    this.audio.setSfxVolume(savedSfx);
    music.addEventListener('change', () => localStorage.setItem('penguin3d_music', music.value));
    sfx.addEventListener('change', () => localStorage.setItem('penguin3d_sfx', sfx.value));
  }

  _show(panel) {
    this.hideAllOverlays();
    this.el(panel).classList.remove('hidden');
    if (panel === 'menu' || panel === 'options' || panel === 'credits' || panel === 'level-select') {
      this.audio.sfx('menu_back');
    }
  }

  _showLevelGrid() {
    const grid = this.el('level-grid');
    grid.innerHTML = '';
    const unlocked = this.getUnlocked();
    for (let i = 0; i < MAX_LEVELS; i++) {
      const b = document.createElement('button');
      const locked = (i + 1) > unlocked;
      b.className = 'level-btn' + (locked ? ' locked' : '');
      b.innerHTML = `<span>${LEVEL_META[i].icon} ${i + 1}</span><small>${LEVEL_META[i].name}</small>`;
      if (locked) {
        b.setAttribute('disabled', 'true');
      } else {
        b.addEventListener('mouseenter', () => this.audio.sfx('hover'));
        b.addEventListener('click', () => {
          this.audio.sfx('click');
          this.onSelectLevel(i);
        });
      }
      grid.appendChild(b);
    }
    this._show('level-select');
  }

  hideAllOverlays() {
    ['menu','level-select','options','credits','pause','level-intro','level-complete','game-over','victory','loading']
      .forEach(id => this.el(id).classList.add('hidden'));
  }

  showMenu() { this._show('menu'); }
  showPause() { this._show('pause'); }
  showGameOver() { this._show('game-over'); }
  showVictory() { this._show('victory'); }
  showLevelIntro(num, subtitle, desc) {
    this.el('level-intro-title').textContent = `Nível ${num}`;
    this.el('level-intro-subtitle').textContent = subtitle;
    this.el('level-intro-desc').textContent = desc;
    this._show('level-intro');
  }
  showLevelComplete(stats, isLast) {
    this.el('level-complete-stats').textContent = stats;
    const nextBtn = this.el('btn-next-level');
    nextBtn.textContent = isLast ? 'Vitória!' : 'Próximo Nível';
    this._show('level-complete');
  }

  showHUD() { this.el('hud').classList.remove('hidden'); }
  hideHUD() { this.el('hud').classList.add('hidden'); }

  updateHUD({ level, lives, fish, time }) {
    this.el('hud-level').textContent = String(level);
    this.el('hud-lives').textContent = lives > 0 ? '♥'.repeat(lives) : '—';
    this.el('hud-fish').textContent = String(fish);
    this.el('hud-time').textContent = time.toFixed(1) + 's';
  }
}
