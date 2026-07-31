// ===== 水晶防守模式 · 状态 =====
// 模式专用数据；player 对象复用生存模式定义（由 entry 初始化）

export const defState = {
  value: 'hero_select',   // hero_select | playing | victory | defeat
  hero: null,
  gold: 0,
  wood: 0,
  playerDeathTimer: 0,
  playerKills: 0,
  totalKills: 0
};

export function resetDefState() {
  Object.assign(defState, {
    value: 'hero_select', hero: null, gold: 0, wood: 0,
    playerDeathTimer: 0, playerKills: 0, totalKills: 0
  });
}

export function addGold(n) { defState.gold += n; }
export function addWood(n) { defState.wood += n; }
export function spendGold(n) { if (defState.gold >= n) { defState.gold -= n; return true; } return false; }
export function spendWood(n) { if (defState.wood >= n) { defState.wood -= n; return true; } return false; }
