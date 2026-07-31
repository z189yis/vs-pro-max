// ===== 水晶防守模式 · 被动技能应用 =====
// 玩家持有 player.defPassives = { id: level }（0 起，每取一次 +1）
// [扩展] 3 件同名合成 → level+1 上限 3（预留）

import { rng } from '../utils.js';

export function applyPassive(id) {
  const p = playerRefValue();
  if (!p.defPassives) p.defPassives = {};
  p.defPassives[id] = (p.defPassives[id] || 0) + 1;
  const lv = p.defPassives[id];
  // 应用即时数值效果
  switch (id) {
    case 'lifesteal': break; // 击杀时处理
    case 'thorns': break;    // 受击时处理
    case 'crit': break;      // 普攻时处理
    case 'multishot': break; // 普攻发射时处理
    case 'berserk': break;   // 击杀计数处理
    case 'void': break;      // 受击时处理
    case 'regen': p.regenRate = (p.regenRate || 0) + 1.5; break;
    case 'haste': p.hasteStacks = (p.hasteStacks || 0) + 1; p.cdMult = 1 / (1 + p.hasteStacks * 0.10); break;
    case 'power': p.powerStacks = (p.powerStacks || 0) + 1; p.dmgMult = 1 + p.powerStacks * 0.15; break;
    case 'magnet': p.magnetRange += 40; break;
    case 'armor': p.armorStacks = (p.armorStacks || 0) + 1; p.dmgTakenMult = 1 / (1 + p.armorStacks * 0.15); break;
    case 'resolve': p.maxHp += 50; p.hp = Math.min(p.maxHp, p.hp + 50); break;
  }
}

let playerRefValue = () => null;
export function setPassivePlayerRef(fn) { playerRefValue = fn; }
