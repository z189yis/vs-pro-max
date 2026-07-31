// ===== 水晶防守模式 · 入口 =====
// 装配 DOM、注册 gameLoop 钩子、启动

import { gameState } from '../game.js';
import { HEROES } from './heroes.js';
import { initDefense, chooseHero, updateDefense, disposeDefense, restartDefense } from './update.js';
import { renderDefense } from './render.js';
import { initAudio } from '../audio.js';

let started = false;

export function startDefense() {
  if (started) return;
  started = true;
  initAudio();
  initDefense();

  // 注册 gameLoop 钩子（game.js 在 gameState==='defense' 时调用）
  window.__updateDefense = (dt) => updateDefense(dt);
  window.__renderDefense = () => renderDefense();
  // 重开（结算界面点击）
  window.__restartDefense = () => { restartDefense(); };

  // 英雄选择界面
  const sel = document.getElementById('hero-select');
  if (sel) {
    sel.classList.add('active');
    const list = document.getElementById('hero-cards');
    if (list && list.children.length === 0) {
      for (let h of HEROES) {
        const card = document.createElement('div');
        card.className = 'hero-card';
        card.innerHTML = `
          <div class="hero-icon">${h.icon}</div>
          <div class="hero-name">${h.name}</div>
          <div class="hero-desc">${h.desc}</div>
          <div class="hero-passive">被动：${heroPassiveName(h)}</div>`;
        card.addEventListener('click', () => chooseHero(h.id));
        list.appendChild(card);
      }
    }
  }

  // 状态驱动
  gameState.value = 'defense';
}

function heroPassiveName(h) {
  const names = { thorns: '荆棘', crit: '暴击', manaCascade: '奥能涌动' };
  return names[h.passive] || h.passive;
}

export function exitDefense() {
  if (!started) return;
  started = false;
  disposeDefense();
  window.__updateDefense = null;
  window.__renderDefense = null;
  gameState.value = 'title';
}
