// ===== 水晶防守模式 · 突破/法宝系统 =====
// 每 10 级触发突破：随机 3 选 1 法宝，法宝可重复选（数值叠加）
// [扩展] 法宝库扩充 + 英雄专属法宝

export const ARTIFACTS = [
  { id: 'strength_totem', name: '力量图腾', icon: '🗿', desc: '+25 最大生命 · +10% 全伤害',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); p.powerStacks = (p.powerStacks || 0) + 1; p.dmgMult = 1 + p.powerStacks * 0.15; } },
  { id: 'wind_boots', name: '疾风之靴', icon: '👢', desc: '+10% 移速 · +8% 攻速',
    apply: (p) => { p.speedMult = (p.speedMult || 1) * 1.10; p.attackCdMult = p.attackCdMult / 1.08; } },
  { id: 'sages_stone', name: '贤者之石', icon: '💎', desc: '武器冷却 -8% · 普攻伤害 +15%',
    apply: (p) => { p.hasteStacks = (p.hasteStacks || 0) + 1; p.cdMult = 1 / (1 + p.hasteStacks * 0.10); p.attackDmgMult = (p.attackDmgMult || 1) * 1.15; } },
  { id: 'vitality_core', name: '活力核心', icon: '❤️', desc: '+60 最大生命 · +1 生命/秒',
    apply: (p) => { p.maxHp += 60; p.hp = Math.min(p.maxHp, p.hp + 60); p.regenRate = (p.regenRate || 0) + 1; } },
  { id: 'arcane_lens', name: '奥术透镜', icon: '🔭', desc: '+20% 全伤害',
    apply: (p) => { p.powerStacks = (p.powerStacks || 0) + 1; p.dmgMult = 1 + p.powerStacks * 0.15; } },
  { id: 'iron_hide', name: '铁壁', icon: '🛡️', desc: '-15% 受到伤害',
    apply: (p) => { p.armorStacks = (p.armorStacks || 0) + 1; p.dmgTakenMult = 1 / (1 + p.armorStacks * 0.15); } }
];

// 突破界面状态
export const breakState = {
  pending: false,       // 待突破（面板打开）
  options: []           // 当前 3 选 1 的法宝
};

// 升级时调用：等级为 10 的倍数 → 触发突破
export function checkBreakthrough(level) {
  if (level % 10 === 0) return true;
  return false;
}

// 生成突破三选一（随机 3 个，允许重复选择）
export function rollArtifactOptions() {
  const opts = [];
  for (let i = 0; i < 3; i++) {
    opts.push(ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)]);
  }
  breakState.options = opts;
  breakState.pending = true;
  return opts;
}

// 选择法宝
export function pickArtifact(player, artifact) {
  artifact.apply(player);
  breakState.pending = false;
}
