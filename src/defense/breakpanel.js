// ===== 水晶防守模式 · 突破面板 UI =====

import { rollArtifactOptions, pickArtifact, breakState } from './breakthrough.js';
import { player } from '../game.js';
import { sfxLevelUp } from '../audio.js';

// 打开突破面板（三选一）
export function openBreakthroughPanel() {
  const opts = rollArtifactOptions();
  const c = document.getElementById('breakthrough-cards');
  if (!c) return;
  c.innerHTML = '';
  for (let a of opts) {
    const el = document.createElement('div');
    el.className = 'break-card';
    el.innerHTML = `<div class="break-icon">${a.icon}</div><div class="break-name">${a.name}</div><div class="break-desc">${a.desc}</div>`;
    el.addEventListener('click', () => {
      pickArtifact(player, a);
      document.getElementById('breakthrough-overlay').classList.remove('active');
      sfxLevelUp();
    });
    c.appendChild(el);
  }
  document.getElementById('breakthrough-overlay').classList.add('active');
  document.getElementById('breakthrough-title').textContent = `✨ 突破！第 ${Math.floor(player.level / 10)} 次突破`;
}

// 关闭突破面板
export function closeBreakthroughPanel() {
  document.getElementById('breakthrough-overlay').classList.remove('active');
  breakState.pending = false;
}
