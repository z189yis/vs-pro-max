// ===== 水晶防守模式 · Roll 构筑面板 =====
// 每波一次免费抽取；关闭重开不刷新卡片；重抽 2 木材 / 锁定 1 木材
// [扩展] 装备合成（3 件同名 → 升级）后续迭代接入

import { WDEF } from '../config.js';
import { DEF_PASSIVES, rollState, ROLL_COST, LOCK_COST } from './roll.js';
import { SKILLS as SKILL_DEFS } from './skills.js';
import { defState, spendWood } from './state.js';
import { player } from '../game.js';
import { applyPassive } from './passives.js';

// 构建抽卡池：未拥有的武器 + 未拥有的被动（可重复到 3 级）+ 未满级技能
function buildPool() {
  const pool = [];
  const ownedWeapons = new Set(player.weapons.map(w => w.id));
  for (let id of Object.keys(WDEF)) {
    if (!ownedWeapons.has(id)) pool.push({ type: 'weapon', id });
  }
  for (let id of Object.keys(DEF_PASSIVES)) {
    if (!player.defPassives[id] || player.defPassives[id] < 3) pool.push({ type: 'passive', id });
  }
  for (let id of Object.keys(SKILL_DEFS)) {
    const owned = player.skills ? player.skills.find(s => s.id === id) : null;
    if (!owned || owned.level < 5) pool.push({ type: 'skill', id });
  }
  return pool;
}

// 抽 3 张不同卡片（打开时用）
export function drawCards() {
  const pool = buildPool();
  const cards = [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < Math.min(3, pool.length); i++) cards.push(pool[i]);
  while (cards.length < 3) cards.push(pool[cards.length % pool.length] || { type: 'passive', id: 'power' });
  rollState.cards = cards;
  renderRollPanel();
}

// 打开面板（每波一次免费；已有卡片则直接显示）
export function openRollPanel() {
  if (defState.value !== 'playing') return false;
  rollState.open = true;
  if (!rollState.cards.length || !rollState.waveRolled) {
    // 本波未抽过：免费抽取新卡片
    rollState.waveRolled = true;
    rollState.freeAvailable = true;
    drawCards();
  }
  // 已抽过：保留当前卡片（关闭重开不刷新）
  document.getElementById('roll-overlay').classList.add('active');
  renderRollPanel();
  updateRollButtons();
  return true;
}

// 关闭面板
export function closeRollPanel() {
  rollState.open = false;
  document.getElementById('roll-overlay').classList.remove('active');
}

// 重抽（2 木材）：替换全部卡片
export function reroll() {
  if (rollState.locked) return false;
  if (!spendWood(ROLL_COST)) return false;
  rollState.waveRolled = true;
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
  } else if (card.type === 'passive') {
    applyPassive(card.id);
  } else if (card.type === 'skill') {
    // 技能：已持有则升级，否则获得
    if (!player.skills) player.skills = [];
    const owned = player.skills.find(s => s.id === card.id);
    if (owned) {
      if (owned.level < 5) owned.level++;
    } else {
      player.skills.push({ id: card.id, level: 1, cdTimer: 0 });
    }
  }
  closeRollPanel();
  // 刷新武器栏 + 技能栏 + 同步羁绊
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
    let icon, name, desc, tag = '';
    if (card.type === 'weapon') {
      const d = WDEF[card.id];
      icon = d.icon; name = d.name; desc = d.desc;
      tag = '<div class="roll-tag">武器</div>';
    } else if (card.type === 'passive') {
      const d = DEF_PASSIVES[card.id];
      icon = d.icon; name = d.name; desc = d.desc;
      tag = '<div class="roll-tag">被动</div>';
      if (player.defPassives[card.id]) name += ` ×${player.defPassives[card.id] + 1}`;
    } else {
      const d = SKILL_DEFS[card.id];
      icon = d.icon; name = d.name; desc = d.desc;
      tag = '<div class="roll-tag">技能</div>';
      const owned = player.skills ? player.skills.find(s => s.id === card.id) : null;
      if (owned) name += ` Lv${owned.level + 1}`;
    }
    el.innerHTML = `${tag}<div class="roll-icon">${icon}</div><div class="roll-name">${name}</div><div class="roll-desc">${desc}</div>`;
    el.addEventListener('click', () => pickCard(card));
    c.appendChild(el);
  }
}

function updateRollButtons() {
  const rerollBtn = document.getElementById('btn-roll-reroll');
  if (rerollBtn) rerollBtn.disabled = rollState.locked || defState.wood < ROLL_COST;
  const lockBtn = document.getElementById('btn-roll-lock');
  if (lockBtn) lockBtn.disabled = rollState.locked || defState.wood < LOCK_COST;
  // 免费机会提示
  const subtitle = document.getElementById('roll-subtitle');
  if (subtitle) {
    subtitle.textContent = rollState.freeAvailable && !rollState.waveRolled
      ? '每波一次免费抽取 · 重抽 🪵2 / 锁定 🪵1'
      : '本波免费机会已用 · 重抽 🪵2 / 锁定 🪵1';
  }
}

export { updateRollButtons };
