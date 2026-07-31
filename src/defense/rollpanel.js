// ===== 水晶防守模式 · Roll 构筑面板 =====
// 打开：break 窗口内按 R 或点按钮；3 张卡免费选 1，重抽 2 木材，锁定 1 木材
// [扩展] 装备合成（3 件同名 → 升级）后续迭代接入

import { WDEF } from '../config.js';
import { DEF_PASSIVES, rollState, resetRollState, ROLL_COST, LOCK_COST } from './roll.js';
import { defState, spendWood } from './state.js';
import { player } from '../game.js';
import { applyPassive } from './passives.js';
import { rng } from '../utils.js';

// 构建抽卡池：未拥有的武器 + 未拥有的被动（被动可重复 = 未满时）
function buildPool() {
  const pool = [];
  const ownedWeapons = new Set(player.weapons.map(w => w.id));
  for (let id of Object.keys(WDEF)) {
    if (!ownedWeapons.has(id)) pool.push({ type: 'weapon', id });
  }
  for (let id of Object.keys(DEF_PASSIVES)) {
    if (!player.defPassives[id] || player.defPassives[id] < 3) pool.push({ type: 'passive', id });
  }
  return pool;
}

// 抽 3 张不同卡片
export function drawCards() {
  const pool = buildPool();
  const cards = [];
  // 洗牌取前 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < Math.min(3, pool.length); i++) cards.push(pool[i]);
  // 池子不足 3 时允许重复（极后期）
  while (cards.length < 3) cards.push(pool[cards.length % pool.length] || { type: 'passive', id: 'power' });
  rollState.cards = cards;
  renderRollPanel();
}

// 打开面板
export function openRollPanel() {
  if (defState.value !== 'playing') return false;
  rollState.open = true;
  rollState.locked = false;
  drawCards();
  document.getElementById('roll-overlay').classList.add('active');
  return true;
}

// 关闭面板
export function closeRollPanel() {
  rollState.open = false;
  rollState.locked = false;
  document.getElementById('roll-overlay').classList.remove('active');
}

// 重抽（2 木材）
export function reroll() {
  if (rollState.locked) return false;
  if (!spendWood(ROLL_COST)) return false;
  drawCards();
  updateRollButtons();
  return true;
}

// 锁定（1 木材）：锁后只能选当前 3 张
export function lockRoll() {
  if (rollState.locked) return false;
  if (!spendWood(LOCK_COST)) return false;
  rollState.locked = true;
  updateRollButtons();
  return true;
}

// 选择卡片
export function pickCard(card) {
  if (card.type === 'weapon') {
    if (player.weapons.length >= 6) return false;
    player.weapons.push({ id: card.id, _timer: 0 });
  } else {
    applyPassive(card.id);
  }
  closeRollPanel();
  // 刷新武器栏 + 同步羁绊（applySynergies 在 game.js）
  if (window.__refreshDefenseBars) window.__refreshDefenseBars();
  return true;
}

// 渲染面板
function renderRollPanel() {
  const c = document.getElementById('roll-cards');
  if (!c) return;
  c.innerHTML = '';
  for (let card of rollState.cards) {
    const el = document.createElement('div');
    el.className = 'roll-card';
    let icon, name, desc;
    if (card.type === 'weapon') {
      const d = WDEF[card.id];
      icon = d.icon; name = d.name; desc = d.desc;
    } else {
      const d = DEF_PASSIVES[card.id];
      icon = d.icon; name = d.name; desc = d.desc;
      // 已持有被动显示层数
      if (player.defPassives[card.id]) {
        name += ` ×${player.defPassives[card.id] + 1}`;
      }
    }
    el.innerHTML = `<div class="roll-icon">${icon}</div><div class="roll-name">${name}</div><div class="roll-desc">${desc}</div>`;
    el.addEventListener('click', () => pickCard(card));
    c.appendChild(el);
  }
}

function updateRollButtons() {
  const rerollBtn = document.getElementById('btn-roll-reroll');
  if (rerollBtn) rerollBtn.disabled = rollState.locked || defState.wood < ROLL_COST;
  const lockBtn = document.getElementById('btn-roll-lock');
  if (lockBtn) lockBtn.disabled = rollState.locked || defState.wood < LOCK_COST;
}

export { updateRollButtons };
