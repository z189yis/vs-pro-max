// ===== 水晶防守模式 · Roll 技能池 =====
// 每波一次免费抽取机会：打开面板 → 若本波未抽过则免费 3 选 1，否则消耗木材
// 关闭重开不刷新卡片（防白嫖重抽）；重抽 2 木材
// [扩展] 3 件同名合成升级在后续迭代接入（skill.level 字段已预留）

// 被动技能定义
export const DEF_PASSIVES = {
  lifesteal: { id: 'lifesteal', name: '吸血', icon: '🩸', desc: '击杀回 2 HP', rarity: 1 },
  thorns: { id: 'thorns', name: '荆棘', icon: '🌵', desc: '被击中时反弹伤害', rarity: 1 },
  crit: { id: 'crit', name: '暴击', icon: '🎯', desc: '普攻 15% 概率 2 倍伤害', rarity: 1 },
  multishot: { id: 'multishot', name: '多重', icon: '🔱', desc: '普攻 +1 发射方向', rarity: 2 },
  berserk: { id: 'berserk', name: '狂暴', icon: '💢', desc: '每击杀 10 只怪，5 秒内攻速 +50%', rarity: 2 },
  void: { id: 'void', name: '虚空', icon: '🌀', desc: '受击时 10% 概率免疫该次伤害', rarity: 2 },
  regen: { id: 'regen', name: '再生', icon: '💚', desc: '+1.5 生命/秒', rarity: 1 },
  haste: { id: 'haste', name: '急速', icon: '⏩', desc: '武器冷却 -10%', rarity: 1 },
  power: { id: 'power', name: '力量', icon: '💪', desc: '+15% 全伤害', rarity: 1 },
  magnet: { id: 'magnet', name: '磁铁', icon: '🧲', desc: '+40 拾取范围', rarity: 1 },
  armor: { id: 'armor', name: '坚韧', icon: '🛡️', desc: '-15% 受到伤害', rarity: 2 },
  resolve: { id: 'resolve', name: '坚定', icon: '🗿', desc: '最大生命 +50', rarity: 1 }
};

// Roll 面板配置
export const ROLL_COST = 2;      // 重抽（木材）
export const LOCK_COST = 1;      // 锁定（木材）
export const FREE_ROLL_PER_WAVE = 1; // 每波免费抽取次数

export const rollState = {
  open: false,
  cards: [],            // [{ type: 'weapon'|'passive'|'skill', id }]
  locked: false,
  waveRolled: false,    // 本波是否已抽过（免费机会用完）
  freeAvailable: true   // 本次打开是否免费（每波一次）
};

export function resetRollState() {
  Object.assign(rollState, { open: false, cards: [], locked: false, waveRolled: false, freeAvailable: true });
}

// 新波开始时重置免费机会
export function onWaveStart() {
  rollState.waveRolled = false;
  rollState.freeAvailable = true;
}
