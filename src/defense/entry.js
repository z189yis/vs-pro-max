// ===== 水晶防守模式 · 入口 =====
// 装配 DOM、注册 gameLoop 钩子、启动

import { gameState } from '../game.js';
import { HEROES } from './heroes.js';
import { initDefense, chooseHero, updateDefense, disposeDefense, restartDefense, doRepairCrystal, doUpgradeCrystal, updateWeaponsBar } from './update.js';
import { renderDefense } from './render.js';
import { openRollPanel, closeRollPanel, reroll, lockRoll, updateRollButtons } from './rollpanel.js';
import { initAudio } from '../audio.js';

export function startDefense() {
  initAudio();
  initDefense();

  // 隐藏标题页（与 startGame 一致）
  document.getElementById('title-screen').style.display = 'none';

  // 注册 gameLoop 钩子（game.js 在 gameState==='defense' 时调用）
  window.__updateDefense = (dt) => updateDefense(dt);
  window.__renderDefense = () => renderDefense();
  // 重开（结算界面点击）
  window.__restartDefense = () => { restartDefense(); };
  // 水晶修理/升级
  window.__repairCrystal = () => { doRepairCrystal(); };
  window.__upgradeCrystal = () => { doUpgradeCrystal(); };
  // Roll 面板
  window.__openRoll = () => { if (openRollPanel()) updateRollButtons(); };
  window.__closeRoll = () => { closeRollPanel(); };
  window.__rollReroll = () => { if (reroll()) updateRollButtons(); };
  window.__rollLock = () => { if (lockRoll()) updateRollButtons(); };
  // 刷新防御模式武器栏（选卡后同步）
  window.__refreshDefenseBars = () => { updateWeaponsBar(); };

  // 英雄选择界面（每次进入都重建卡片，避免残留状态）
  const sel = document.getElementById('hero-select');
  if (sel) {
    sel.classList.add('active');
    const list = document.getElementById('hero-cards');
    if (list) {
      list.innerHTML = '';
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
  disposeDefense();
  window.__updateDefense = null;
  window.__renderDefense = null;
  // 恢复标题页
  document.getElementById('title-screen').style.display = 'flex';
  gameState.value = 'title';
}
