// ===== 水晶防守模式 · 水晶实体 =====
// 水晶固定于出生点 (0,0)；血量归零 = 防守失败

export const crystal = {
  x: 0, y: 0, hp: 500, maxHp: 500,
  level: 1, shield: 0, regen: 0, flash: 0, respawnTimer: 0
};

export function resetCrystal() {
  Object.assign(crystal, {
    x: 0, y: 0, hp: 500, maxHp: 500,
    level: 1, shield: 0, regen: 0, flash: 0, respawnTimer: 0
  });
}

// 升级（M2：木材消耗）；每次升级一次性生效
export const CRYSTAL_UPGRADES = [
  // 每一档：cost=木材, addHp, regen, shield 描述
  { level: 2, cost: 10, addHp: 150, regen: 1, desc: '水晶血量 +150 · 每秒回血 +1' },
  { level: 3, cost: 20, addHp: 200, regen: 1, desc: '水晶血量 +200 · 护盾：每 45 秒抵挡一次伤害' },
  { level: 4, cost: 35, addHp: 300, regen: 2, desc: '水晶血量 +300 · 伤害反射 15%' }
];

export function getNextCrystalUpgrade() {
  return CRYSTAL_UPGRADES.find(u => u.level === crystal.level + 1) || null;
}

export function upgradeCrystal() {
  const u = getNextCrystalUpgrade();
  if (!u) return false;
  crystal.level = u.level;
  crystal.maxHp += u.addHp;
  crystal.hp = Math.min(crystal.maxHp, crystal.hp + u.addHp);
  crystal.regen = u.regen;
  return true;
}

// 水晶受击
export function crystalTakeDamage(dmg) {
  crystal.hp -= dmg;
  crystal.flash = 0.15;
  if (crystal.hp <= 0) crystal.hp = 0;
}
