// ===== 普通攻击（角色本体，不占用武器格） =====
export const ATTACK = {
  dmg: 8,
  cd: 0.35,           // 普攻间隔（秒）
  range: 280,         // 索敌范围
  spd: 500,           // 弹速
  size: 3,
  color: '#ffffff',
  element: 'physical'
};

// ===== 武器定义（固定1级，CD大幅延长） =====
export const WDEF = {
  magic_missile: {
    id: 'magic_missile',
    name: '魔法飞弹',
    icon: '🔮',
    color: '#66ccff',
    element: 'arcane',
    desc: '发射 3 枚追踪飞弹',
    stats: { n: 3, cd: 4.5, d: 14, s: 300, tr: 8, b: 1, sp: 0, l: 2.5 }
  },
  knife: {
    id: 'knife',
    name: '飞刀',
    icon: '🔪',
    color: '#cccccc',
    element: 'physical',
    desc: '自动追踪 4 把穿透飞刀',
    stats: { n: 4, cd: 2.2, d: 16, s: 420, tr: 5, p: Infinity, l: 1.5 }
  },
  garlic: {
    id: 'garlic',
    name: '大蒜',
    icon: '🧄',
    color: '#aadd88',
    element: 'nature',
    desc: '范围光环 90px · 持续伤害',
    stats: { r: 90, t: 0.7, d: 7, k: 60 }
  },
  axe: {
    id: 'axe',
    name: '飞斧',
    icon: '🪓',
    color: '#ff8844',
    element: 'physical',
    desc: '弧形环绕 2 把斧头',
    stats: { n: 2, cd: 5.0, d: 30, orbitR: 130, orbitS: 2.5, aoe: 40, p: Infinity, l: 4 }
  },
  lightning: {
    id: 'lightning',
    name: '闪电',
    icon: '⚡',
    color: '#ffff44',
    element: 'lightning',
    desc: '3 道闪电随机打击',
    stats: { n: 3, cd: 7.0, d: 35, a: 58, l: 0.3 }
  },
  lightning_spear: {
    id: 'lightning_spear',
    name: '闪电矛',
    icon: '🔱',
    color: '#88ddff',
    element: 'lightning',
    desc: '投掷 2 支追踪闪电矛 · 高穿透',
    stats: { n: 2, cd: 5.5, d: 28, s: 650, p: 5, l: 1.2, w: 6, tr: 4 }
  },
  ice_shard: {
    id: 'ice_shard',
    name: '冰凌',
    icon: '❄️',
    color: '#88ccff',
    element: 'ice',
    desc: '自动追踪 3 枚冰凌 · 锥形溅射',
    stats: { n: 3, cd: 5.0, d: 18, coneR: 80, coneA: 60, slow: 0.3, slowT: 1.5, aoeDmg: 0.4, s: 380, tr: 8, l: 2.5 }
  },
  fireball: {
    id: 'fireball',
    name: '火球',
    icon: '🔥',
    color: '#ff6622',
    element: 'fire',
    desc: '追踪火球 · 范围爆炸 · 点燃',
    stats: { n: 1, cd: 6.0, d: 30, aoe: 75, burn: 7, burnT: 3, s: 220, tr: 5, l: 3 }
  },
  disintegrate_ray: {
    id: 'disintegrate_ray',
    name: '瓦解射线',
    icon: '🔆',
    color: '#ff66ff',
    element: 'arcane',
    desc: '持续 0.8s 瓦解射线 · 穿刺伤害',
    stats: { n: 1, cd: 8.0, d: 12, range: 420, dur: 0.8, tick: 0.08, width: 14 }
  },
  blizzard: {
    id: 'blizzard',
    name: '暴风雪',
    icon: '❄️',
    color: '#88ccff',
    element: 'ice',
    desc: '召唤 2 片暴风雪 · 减速 25%',
    stats: { n: 2, cd: 9.0, d: 10, r: 70, dur: 3.0, tick: 0.36, slow: 0.25, slowT: 1.4 }
  },
  frost_nova: {
    id: 'frost_nova',
    name: '冰霜新星',
    icon: '🧊',
    color: '#aaddff',
    element: 'ice',
    desc: '新星半径 95px · 冻结 1.0s',
    stats: { n: 1, cd: 10.0, d: 26, r: 95, freeze: 1.0 }
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: '潮水',
    icon: '🌊',
    color: '#44aaff',
    element: 'water',
    desc: '推出 2 道弧形潮水 · 宽度 105',
    stats: { n: 2, cd: 7.0, d: 22, w: 105, range: 370, spd: 270, knock: 60, slow: 0.25, slowT: 2 }
  }
};

// ===== 被动技能（角色本体属性，升级唯一来源） =====
export const PASSIVES = [
  { id: 'maxHp', name: '生命力', icon: '❤️', desc: '+30 最大生命值', a: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); } },
  { id: 'speed', name: '迅捷', icon: '💨', desc: '+12% 移动速度', a: (p) => { p.speed *= 1.12; } },
  { id: 'damage', name: '力量', icon: '💪', desc: '+15% 全伤害', a: (p) => { p.powerStacks = (p.powerStacks || 0) + 1; p.dmgMult = 1 + p.powerStacks * 0.15; } },
  { id: 'cooldown', name: '急速', icon: '⏩', desc: '-10% 技能冷却', a: (p) => { p.hasteStacks = (p.hasteStacks || 0) + 1; p.cdMult = 1 / (1 + p.hasteStacks * 0.10); } },
  { id: 'magnet', name: '磁铁', icon: '🧲', desc: '+40 拾取范围', a: (p) => { p.magnetRange += 40; } },
  { id: 'attackSpeed', name: '狂暴', icon: '⚡', desc: '+15% 普攻速度', a: (p) => { p.attackSpeedStacks = (p.attackSpeedStacks || 0) + 1; p.attackCdMult = 1 / (1 + p.attackSpeedStacks * 0.15); } },
  { id: 'attackDmg', name: '锐利', icon: '🗡️', desc: '+3 普攻伤害', a: (p) => { p.attackDmgBonus = (p.attackDmgBonus || 0) + 3; } },
  { id: 'armor', name: '坚韧', icon: '🛡️', desc: '-15% 受到伤害', a: (p) => { p.armorStacks = (p.armorStacks || 0) + 1; p.dmgTakenMult = 1 / (1 + p.armorStacks * 0.15); } },
  { id: 'regen', name: '再生', icon: '💚', desc: '+1.5 生命/秒', a: (p) => { p.regenRate = (p.regenRate || 0) + 1.5; } }
];

// ===== 元素定义 =====
export const ELEMENTS = {
  fire: { name: '火', icon: '🔥', color: '#ff6622' },
  ice: { name: '冰', icon: '❄️', color: '#88ccff' },
  lightning: { name: '雷', icon: '⚡', color: '#ffff44' },
  water: { name: '水', icon: '💧', color: '#44aaff' },
  nature: { name: '自然', icon: '🌿', color: '#aadd88' },
  physical: { name: '物理', icon: '⚔️', color: '#cccccc' },
  arcane: { name: '奥术', icon: '✨', color: '#66ccff' }
};

// ===== 元素状态持续时间 =====
export const ELEMENT_STATUS_DURATION = { fire: 3, ice: 2.5, lightning: 2, water: 5, physical: 2, arcane: 2, nature: 2.5 };

// ===== 元素反应 =====
export const ELEMENT_REACTIONS = {
  'fire+ice': { name: '融化', mult: 2.0, knockback: 0, aoe: 0, particles: 'steam' },
  'ice+fire': { name: '蒸发', mult: 2.5, knockback: 30, aoe: 60, particles: 'fire' },
  'water+lightning': { name: '感电', mult: 0.8, chain: 80, particles: 'spark' },
  'lightning+water': { name: '电解', mult: 1.8, spread: 120, particles: 'spark' },
  'fire+lightning': { name: '超载', mult: 1.5, knockback: 120, aoe: 100, particles: 'explosion' },
  'ice+lightning': { name: '超导', mult: 1.3, armorBreak: 3, aoe: 90, particles: 'ice' },
  'fire+water': { name: '汽化', mult: 1.6, aoe: 80, blind: 2, particles: 'steam' },
  'water+fire': { name: '沸腾', mult: 1.4, burn: 8, burnT: 3, aoe: 50, particles: 'fire' },
  'ice+water': { name: '冻结', mult: 0.6, freeze: 1.2, aoe: 60, particles: 'ice' },
  'water+ice': { name: '寒流', mult: 1.1, slow: 0.5, slowT: 3, aoe: 70, particles: 'ice' },
  'physical+fire': { name: '爆燃', mult: 1.4, aoe: 70, knockback: 60, particles: 'explosion' },
  'fire+physical': { name: '重击', mult: 1.3, stun: 0.6, knockback: 80, particles: 'explosion' },
  'physical+ice': { name: '碎冰', mult: 1.5, aoe: 60, armorBreak: 2, particles: 'ice' },
  'ice+physical': { name: '凿击', mult: 1.4, stun: 0.5, particles: 'ice' },
  'physical+lightning': { name: '雷击', mult: 1.3, chain: 60, particles: 'spark' },
  'lightning+physical': { name: '麻痹', mult: 1.2, stun: 0.8, particles: 'spark' },
  'physical+water': { name: '溃堤', mult: 1.2, knockback: 100, aoe: 50, particles: 'steam' },
  'water+physical': { name: '潮湿打击', mult: 1.3, slow: 0.35, slowT: 2, particles: 'steam' },
  'arcane+fire': { name: '奥术燃烧', mult: 1.5, burn: 10, burnT: 4, particles: 'fire' },
  'fire+arcane': { name: '魔力爆裂', mult: 1.7, aoe: 90, particles: 'explosion' },
  'arcane+ice': { name: '霜蚀', mult: 1.4, armorBreak: 3, aoe: 60, particles: 'ice' },
  'ice+arcane': { name: '晶化', mult: 1.3, freeze: 0.8, aoe: 50, particles: 'ice' },
  'arcane+lightning': { name: '奥能风暴', mult: 1.6, chain: 100, aoe: 70, particles: 'spark' },
  'lightning+arcane': { name: '过载', mult: 1.4, stun: 1, aoe: 60, particles: 'spark' },
  'arcane+water': { name: '洪流', mult: 1.3, aoe: 80, knockback: 50, particles: 'steam' },
  'water+arcane': { name: '秘法潮汐', mult: 1.5, slow: 0.4, slowT: 3, aoe: 60, particles: 'steam' },
  'nature+fire': { name: '野火', mult: 1.4, burn: 12, burnT: 4, aoe: 60, particles: 'fire' },
  'fire+nature': { name: '枯萎', mult: 1.2, aoe: 70, particles: 'steam' },
  'nature+ice': { name: '霜冻', mult: 1.3, slow: 0.45, slowT: 3, aoe: 50, particles: 'ice' },
  'ice+nature': { name: '休眠', mult: 1.1, freeze: 1, aoe: 60, particles: 'ice' },
  'nature+lightning': { name: '生电', mult: 1.3, chain: 70, particles: 'spark' },
  'lightning+nature': { name: '激化', mult: 1.6, aoe: 80, particles: 'spark' },
  'nature+water': { name: '滋长', mult: 1.2, heal: 0.05, aoe: 60, particles: 'steam' },
  'water+nature': { name: '沼泽', mult: 0.9, slow: 0.55, slowT: 4, aoe: 80, particles: 'steam' },
  'physical+arcane': { name: '破魔', mult: 1.5, armorBreak: 3, aoe: 50, particles: 'explosion' },
  'arcane+physical': { name: '回响', mult: 1.4, chain: 50, particles: 'spark' },
  'physical+nature': { name: '毒刺', mult: 1.3, poison: 6, poisonT: 3, particles: 'steam' },
  'nature+physical': { name: '荆棘', mult: 1.1, reflect: 0.3, aoe: 50, particles: 'steam' },
  'arcane+nature': { name: '魔藤', mult: 1.3, slow: 0.4, slowT: 3, aoe: 60, particles: 'spark' },
  'nature+arcane': { name: '绽放', mult: 1.5, aoe: 70, particles: 'spark' }
};

// ===== 羁绊系统 =====
// 武器格上限 6，最多成型 1 套 4 件羁绊 + 散件
export const MAX_WEAPONS = 6;

// 羁绊阈值和效果定义
// 设计原则：2件=形态优化，4件=机制优化，数值微调仅作辅助
export const SYNERGIES = {
  fire: {
    element: 'fire',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '烈焰分裂', desc: '火球分裂为 3 颗小火球，每颗 60% 伤害', icon: '🔥',
        apply: (p) => { p.synergyFireSplit = true; } },
      { count: 4, name: '焚天业火', desc: '点燃可叠 3 层，火系击杀爆炸扩散点燃', icon: '💥',
        apply: (p) => { p.synergyFireSplit = true; p.synergyBurnStacks = 3; p.synergyFireExplode = true; } }
    ]
  },
  ice: {
    element: 'ice',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '寒冰穿透', desc: '冰凌穿透 +1，暴风雪范围 +50%', icon: '❄️',
        apply: (p) => { p.synergyIcePierce = 1; p.synergyBlizzardRadius = 1.5; } },
      { count: 4, name: '绝对零度', desc: '冻结敌人死亡时释放 6 向冰锥散射', icon: '🧊',
        apply: (p) => { p.synergyIcePierce = 1; p.synergyBlizzardRadius = 1.5; p.synergyIceShatter = true; } }
    ]
  },
  lightning: {
    element: 'lightning',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '电能增幅', desc: '闪电额外打击 1 目标，闪电矛 +1 支', icon: '⚡',
        apply: (p) => { p.synergyLightningExtra = 1; } },
      { count: 4, name: '雷霆充能', desc: '雷系击杀掉落电荷，拾取后下次雷技能双重释放', icon: '🔋',
        apply: (p) => { p.synergyLightningExtra = 1; p.synergyThunderCharge = true; } }
    ]
  },
  water: {
    element: 'water',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '潮汐拓宽', desc: '潮水宽度 +50%，击退距离翻倍', icon: '💧',
        apply: (p) => { p.synergyWaveWidth = 1.5; p.synergyKnockMult = 2; } },
      { count: 4, name: '深海爆发', desc: '潮湿敌人死亡时爆发水环 AOE', icon: '🌊',
        apply: (p) => { p.synergyWaveWidth = 1.5; p.synergyKnockMult = 2; p.synergyWaterBurst = true; } }
    ]
  },
  physical: {
    element: 'physical',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '锋刃弹射', desc: '飞刀弹射 +1 次，飞斧数量 +1', icon: '⚔️',
        apply: (p) => { p.synergyKnifeBounce = 1; p.synergyAxeExtra = 1; } },
      { count: 4, name: '穿透核心', desc: '普攻变为穿透弹，且可弹射 1 次', icon: '🎯',
        apply: (p) => { p.synergyKnifeBounce = 1; p.synergyAxeExtra = 1; p.synergyAttackPierce = true; p.synergyAttackBounce = 1; } }
    ]
  },
  arcane: {
    element: 'arcane',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '魔力弹射', desc: '飞弹弹射 +1 次，瓦解射线宽度 +50%', icon: '✨',
        apply: (p) => { p.synergyMissileBounce = 1; p.synergyBeamWidth = 1.5; } },
      { count: 4, name: '奥术回响', desc: '奥术技能命中时 20% 概率重置自身冷却', icon: '🔄',
        apply: (p) => { p.synergyMissileBounce = 1; p.synergyBeamWidth = 1.5; p.synergyArcaneReset = 0.20; } }
    ]
  },
  nature: {
    element: 'nature',
    thresholds: [2, 4],
    tiers: [
      { count: 2, name: '自然扩张', desc: '大蒜光环范围 +30%，光环附加减速', icon: '🌿',
        apply: (p) => { p.synergyGarlicRadius = 1.3; p.synergyGarlicSlow = 0.2; } },
      { count: 4, name: '生命循环', desc: '光环内敌人每秒掉落生命球，拾取回血', icon: '💚',
        apply: (p) => { p.synergyGarlicRadius = 1.3; p.synergyGarlicSlow = 0.2; p.synergyNatureOrb = true; } }
    ]
  }
};

// ===== 天气系统 =====
export const WEATHER_TYPES = {
  clear: { id: 'clear', name: '晴朗', icon: '☀️', desc: '无特殊效果' },
  rain: { id: 'rain', name: '雨天', icon: '🌧️', desc: '火伤-15% 雷伤+20%' },
  thunder: { id: 'thunder', name: '雷暴', icon: '⛈️', desc: '雷系冷却-20%' },
  drought: { id: 'drought', name: '干旱', icon: '🌵', desc: '火伤+25%' },
  snowstorm: { id: 'snowstorm', name: '暴风雪', icon: '🌨️', desc: '冰伤+20% 怪物减速' }
};

export function getWeatherDuration() { return 50 + Math.random() * 40; }
