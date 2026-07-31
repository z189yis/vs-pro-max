// ===== 水晶防守模式 · 水晶实体 =====
// 水晶固定于出生点 (0,0)；血量归零 = 防守失败
// M2：升级树（血量/回血/护盾/反射）、修理

export const crystal = {
  x: 0, y: 0, hp: 500, maxHp: 500,
  level: 1, shield: 0, regen: 1, flash: 0, respawnTimer: 0,   // 基础回血 1/s
  // M2
  shieldCharging: false,    // 护盾充能中（升级后解锁）
  shieldChargeTimer: 0,
  reflectPct: 0             // 伤害反射百分比（升级后解锁）
};

export const CRYSTAL_REPAIR_COST = 50;
export const CRYSTAL_REPAIR_PCT = 0.25;

export function resetCrystal() {
  Object.assign(crystal, {
    x: 0, y: 0, hp: 500, maxHp: 500,
    level: 1, shield: 0, regen: 1, flash: 0, respawnTimer: 0,
    shieldCharging: false, shieldChargeTimer: 0, reflectPct: 0
  });
}

// 升级（木材消耗）；每次升级一次性生效
export const CRYSTAL_UPGRADES = [
  { level: 2, cost: 10, addHp: 150, regen: 2, desc: '水晶血量 +150 · 回血提升至 2/s' },
  { level: 3, cost: 20, addHp: 200, regen: 2, desc: '水晶血量 +200 · 护盾：每 45 秒抵挡一次伤害' },
  { level: 4, cost: 35, addHp: 300, regen: 3, desc: '水晶血量 +300 · 回血 3/s · 伤害反射 15%' }
];

// 护盾冷却时间（秒）
export const SHIELD_COOLDOWN = 45;

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
  // 升级 3：解锁护盾充能
  if (crystal.level >= 3) crystal.shieldCharging = true;
  // 升级 4：解锁反射
  if (crystal.level >= 4) crystal.reflectPct = 0.15;
  return true;
}

// 修理（金币消耗）：恢复 25% 最大生命
export function repairCrystal() {
  if (crystal.hp >= crystal.maxHp) return false;
  crystal.hp = Math.min(crystal.maxHp, crystal.hp + crystal.maxHp * CRYSTAL_REPAIR_PCT);
  return true;
}

// 水晶受击（返回实际造成伤害；护盾/反射在此处理）
export function crystalTakeDamage(dmg) {
  // 护盾：满值时抵挡一次任意伤害
  if (crystal.shield > 0) {
    crystal.shield = 0;
    crystal.flash = 0.15;
    return 0;
  }
  crystal.hp -= dmg;
  crystal.flash = 0.15;
  const actual = dmg;
  if (crystal.hp <= 0) crystal.hp = 0;
  return actual;
}

// 护盾充能更新（每帧调用）
export function updateCrystalShield(dt) {
  if (!crystal.shieldCharging) return;
  if (crystal.shield > 0) return; // 已充能
  crystal.shieldChargeTimer += dt;
  if (crystal.shieldChargeTimer >= SHIELD_COOLDOWN) {
    crystal.shieldChargeTimer = 0;
    crystal.shield = 1;
    crystal.flash = 0.3;
  }
}
