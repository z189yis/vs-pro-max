export const WDEF = {
  magic_missile: {
    id: 'magic_missile',
    name: '魔法飞弹',
    icon: '🔮',
    color: '#66ccff',
    element: 'arcane',
    descs: ['发射 1 枚追踪飞弹', '数量+1 · 伤害+2', '弹射+1 · 冷却-0.1s', '数量+1 · 伤害+2', '分裂+1 · 冷却-0.1s', '数量+1 · 伤害+4', '弹射+2 · 分裂+1', '数量+2 · 伤害+6'],
    stats: [
      { n: 1, cd: 1.5, d: 10, s: 300, tr: 8, b: 0, sp: 0, l: 2.5 },
      { n: 2, cd: 1.4, d: 12, s: 300, tr: 8, b: 0, sp: 0, l: 2.5 },
      { n: 2, cd: 1.3, d: 14, s: 330, tr: 9, b: 1, sp: 0, l: 2.5 },
      { n: 3, cd: 1.2, d: 16, s: 330, tr: 9, b: 1, sp: 0, l: 2.8 },
      { n: 3, cd: 1.1, d: 18, s: 330, tr: 10, b: 1, sp: 1, l: 2.8 },
      { n: 4, cd: 1.0, d: 22, s: 330, tr: 10, b: 1, sp: 1, l: 3 },
      { n: 4, cd: 0.85, d: 26, s: 380, tr: 11, b: 3, sp: 2, l: 3 },
      { n: 6, cd: 0.6, d: 32, s: 380, tr: 12, b: 3, sp: 2, l: 3.2 }
    ]
  },
  knife: {
    id: 'knife',
    name: '飞刀',
    icon: '🔪',
    color: '#cccccc',
    element: 'physical',
    descs: ['自动追踪 1 把穿透飞刀', '数量+1 · 伤害+2', '数量+1 · 速度+15%', '数量+1 · 伤害+3', '数量+1 · 冷却-0.1s', '数量+1 · 伤害+4', '数量+2 · 速度+15%', '数量+3 · 伤害+5'],
    stats: [
      { n: 1, cd: 0.65, d: 10, s: 420, tr: 5, p: Infinity, l: 1.5 },
      { n: 2, cd: 0.6, d: 12, s: 420, tr: 5, p: Infinity, l: 1.5 },
      { n: 3, cd: 0.55, d: 15, s: 480, tr: 6, p: Infinity, l: 1.5 },
      { n: 4, cd: 0.5, d: 18, s: 480, tr: 6, p: Infinity, l: 1.6 },
      { n: 5, cd: 0.4, d: 22, s: 480, tr: 7, p: Infinity, l: 1.6 },
      { n: 6, cd: 0.35, d: 26, s: 520, tr: 7, p: Infinity, l: 1.7 },
      { n: 8, cd: 0.3, d: 30, s: 520, tr: 8, p: Infinity, l: 1.7 },
      { n: 11, cd: 0.22, d: 36, s: 560, tr: 8, p: Infinity, l: 1.8 }
    ]
  },
  garlic: {
    id: 'garlic',
    name: '大蒜',
    icon: '🧄',
    color: '#aadd88',
    element: 'nature',
    descs: ['范围光环 60px · 3 伤害', '半径+10 · 伤害+1', '半径+10 · 冷却-0.1s', '半径+10 · 伤害+2 · 击退+30', '半径+10 · 伤害+2 · 冷却-0.1s', '半径+15 · 伤害+2 · 击退+30', '半径+15 · 伤害+2 · 冷却-0.1s', '半径+20 · 伤害+3 · 击退+40'],
    stats: [
      { r: 60, t: 1, d: 3, k: 50 },
      { r: 70, t: 0.9, d: 4, k: 50 },
      { r: 80, t: 0.8, d: 5, k: 60 },
      { r: 90, t: 0.7, d: 7, k: 90 },
      { r: 100, t: 0.6, d: 9, k: 90 },
      { r: 115, t: 0.5, d: 11, k: 120 },
      { r: 130, t: 0.4, d: 14, k: 120 },
      { r: 155, t: 0.28, d: 18, k: 160 }
    ]
  },
  axe: {
    id: 'axe',
    name: '飞斧',
    icon: '🪓',
    color: '#ff8844',
    element: 'physical',
    descs: ['弧形环绕 1 把斧头', '数量+1 · 伤害+4', '范围+30 · 伤害+4', '数量+1 · 转速+15%', '伤害+6 · 冷却-0.2s', '数量+1 · 范围+30', '伤害+8 · 冷却-0.2s', '数量+2 · 伤害+12'],
    stats: [
      { n: 1, cd: 2.2, d: 18, orbitR: 130, orbitS: 2.5, aoe: 35, p: Infinity, l: 4 },
      { n: 2, cd: 2.1, d: 22, orbitR: 130, orbitS: 2.5, aoe: 35, p: Infinity, l: 4 },
      { n: 2, cd: 1.9, d: 26, orbitR: 160, orbitS: 2.7, aoe: 40, p: Infinity, l: 4.5 },
      { n: 3, cd: 1.8, d: 30, orbitR: 160, orbitS: 3.1, aoe: 40, p: Infinity, l: 4.5 },
      { n: 3, cd: 1.6, d: 36, orbitR: 170, orbitS: 3.1, aoe: 45, p: Infinity, l: 5 },
      { n: 4, cd: 1.4, d: 40, orbitR: 190, orbitS: 3.4, aoe: 48, p: Infinity, l: 5 },
      { n: 4, cd: 1.2, d: 48, orbitR: 190, orbitS: 3.8, aoe: 52, p: Infinity, l: 5.5 },
      { n: 6, cd: 0.9, d: 58, orbitR: 220, orbitS: 4.2, aoe: 58, p: Infinity, l: 5.5 }
    ]
  },
  lightning: {
    id: 'lightning',
    name: '闪电',
    icon: '⚡',
    color: '#ffff44',
    element: 'lightning',
    descs: ['1道闪电随机打击', '闪电+1 · 伤害+4', '范围+15 · 冷却-0.3s', '闪电+1 · 伤害+4', '范围+15 · 冷却-0.3s', '闪电+1 · 伤害+6', '范围+15 · 冷却-0.3s', '闪电+2 · 伤害+12'],
    stats: [
      { n: 1, cd: 3, d: 25, a: 50, l: 0.3 },
      { n: 2, cd: 2.8, d: 29, a: 50, l: 0.3 },
      { n: 2, cd: 2.5, d: 33, a: 58, l: 0.35 },
      { n: 3, cd: 2.3, d: 37, a: 58, l: 0.35 },
      { n: 3, cd: 2.0, d: 43, a: 66, l: 0.4 },
      { n: 4, cd: 1.8, d: 49, a: 66, l: 0.4 },
      { n: 4, cd: 1.5, d: 56, a: 74, l: 0.45 },
      { n: 6, cd: 1.1, d: 68, a: 82, l: 0.45 }
    ]
  },
  lightning_spear: {
    id: 'lightning_spear',
    name: '闪电矛',
    icon: '🔱',
    color: '#88ddff',
    element: 'lightning',
    descs: ['投掷 1 支追踪闪电矛 · 高穿透', '闪电矛+1 · 伤害+5', '速度+15% · 穿透+1', '闪电矛+1 · 伤害+6', '伤害+8 · 穿透+2', '闪电矛+1 · 速度+15%', '伤害+10 · 穿透+2', '闪电矛+2 · 伤害+15'],
    stats: [
      { n: 1, cd: 1.8, d: 22, s: 650, p: 5, l: 1.2, w: 6, tr: 4 },
      { n: 2, cd: 1.7, d: 27, s: 650, p: 5, l: 1.2, w: 6, tr: 4.5 },
      { n: 2, cd: 1.55, d: 32, s: 748, p: 6, l: 1.3, w: 7, tr: 5 },
      { n: 3, cd: 1.4, d: 38, s: 748, p: 6, l: 1.3, w: 7, tr: 5.5 },
      { n: 3, cd: 1.25, d: 46, s: 748, p: 8, l: 1.4, w: 8, tr: 6 },
      { n: 4, cd: 1.1, d: 54, s: 860, p: 8, l: 1.4, w: 8, tr: 7 },
      { n: 4, cd: 0.95, d: 64, s: 860, p: 10, l: 1.5, w: 9, tr: 8 },
      { n: 6, cd: 0.75, d: 79, s: 990, p: 10, l: 1.5, w: 10, tr: 10 }
    ]
  },
  ice_shard: {
    id: 'ice_shard',
    name: '冰凌',
    icon: '❄️',
    color: '#88ccff',
    element: 'ice',
    descs: ['自动追踪 1 枚冰凌·锥形溅射', '数量+1 · 伤害+2', '锥形范围+20 · 减速+10%', '数量+1 · 伤害+3', '锥形角度+15° · 冷却-0.2s', '数量+1 · 伤害+4', '减速+15% · 锥形范围+20', '数量+2 · 伤害+5 · 冷却-0.3s'],
    stats: [
      { n: 1, cd: 1.8, d: 14, coneR: 80, coneA: 60, slow: 0.3, slowT: 1.5, aoeDmg: 0.4, s: 380, tr: 8, l: 2.5 },
      { n: 2, cd: 1.7, d: 16, coneR: 80, coneA: 60, slow: 0.3, slowT: 1.5, aoeDmg: 0.4, s: 380, tr: 9, l: 2.5 },
      { n: 2, cd: 1.6, d: 18, coneR: 100, coneA: 60, slow: 0.4, slowT: 1.8, aoeDmg: 0.45, s: 400, tr: 9, l: 2.8 },
      { n: 3, cd: 1.5, d: 21, coneR: 100, coneA: 60, slow: 0.4, slowT: 1.8, aoeDmg: 0.45, s: 400, tr: 10, l: 2.8 },
      { n: 3, cd: 1.3, d: 24, coneR: 110, coneA: 75, slow: 0.45, slowT: 2.0, aoeDmg: 0.5, s: 420, tr: 10, l: 3 },
      { n: 4, cd: 1.2, d: 28, coneR: 110, coneA: 75, slow: 0.45, slowT: 2.0, aoeDmg: 0.5, s: 420, tr: 11, l: 3 },
      { n: 4, cd: 1.0, d: 33, coneR: 130, coneA: 80, slow: 0.55, slowT: 2.2, aoeDmg: 0.55, s: 440, tr: 11, l: 3.2 },
      { n: 6, cd: 0.7, d: 40, coneR: 130, coneA: 80, slow: 0.6, slowT: 2.5, aoeDmg: 0.6, s: 440, tr: 12, l: 3.2 }
    ]
  },
  fireball: {
    id: 'fireball',
    name: '火球',
    icon: '🔥',
    color: '#ff6622',
    element: 'fire',
    descs: ['追踪火球·范围爆炸·点燃', '爆炸范围+15 · 灼烧+2/s', '直接伤害+5 · 冷却-0.3s', '数量+1 · 爆炸范围+15', '灼烧+3/s · 持续+1s', '直接伤害+8 · 冷却-0.3s', '数量+1 · 爆炸范围+20', '数量+2 · 伤害+12 · 灼烧+5/s'],
    stats: [
      { n: 1, cd: 2.5, d: 25, aoe: 60, burn: 5, burnT: 3, s: 220, tr: 5, l: 3 },
      { n: 1, cd: 2.3, d: 27, aoe: 75, burn: 7, burnT: 3, s: 230, tr: 5, l: 3 },
      { n: 1, cd: 2.0, d: 32, aoe: 75, burn: 7, burnT: 3.5, s: 240, tr: 6, l: 3 },
      { n: 2, cd: 1.9, d: 34, aoe: 90, burn: 8, burnT: 3.5, s: 250, tr: 6, l: 3.2 },
      { n: 2, cd: 1.7, d: 37, aoe: 90, burn: 11, burnT: 4.5, s: 260, tr: 7, l: 3.2 },
      { n: 2, cd: 1.4, d: 45, aoe: 100, burn: 11, burnT: 4.5, s: 270, tr: 7, l: 3.5 },
      { n: 3, cd: 1.2, d: 50, aoe: 120, burn: 14, burnT: 5, s: 280, tr: 8, l: 3.5 },
      { n: 5, cd: 0.9, d: 62, aoe: 120, burn: 19, burnT: 5, s: 300, tr: 9, l: 3.5 }
    ]
  },
  disintegrate_ray: {
    id: 'disintegrate_ray', name: '瓦解射线', icon: '🔆', color: '#ff66ff', element: 'arcane',
    descs: ['持续 0.6s 瓦解射线 · 穿刺伤害', '持续时间 +0.1s · 伤害 +2', '宽度 +4 · 伤害 +3', '持续时间 +0.1s · 伤害 +4', '冷却 -0.15s · 伤害 +4', '宽度 +5 · 持续时间 +0.1s', '伤害 +6 · 冷却 -0.15s', '持续时间 +0.2s · 伤害 +10'],
    stats: [
      { n: 1, cd: 2.0, d: 8, range: 420, dur: 0.6, tick: 0.08, width: 10 },
      { n: 1, cd: 1.9, d: 10, range: 420, dur: 0.7, tick: 0.08, width: 10 },
      { n: 1, cd: 1.8, d: 13, range: 440, dur: 0.7, tick: 0.08, width: 14 },
      { n: 1, cd: 1.7, d: 17, range: 440, dur: 0.8, tick: 0.08, width: 14 },
      { n: 1, cd: 1.55, d: 21, range: 460, dur: 0.8, tick: 0.07, width: 14 },
      { n: 1, cd: 1.4, d: 25, range: 460, dur: 0.9, tick: 0.07, width: 19 },
      { n: 1, cd: 1.25, d: 31, range: 480, dur: 0.9, tick: 0.06, width: 19 },
      { n: 1, cd: 1.0, d: 41, range: 500, dur: 1.1, tick: 0.05, width: 24 }
    ]
  },
  blizzard: {
    id: 'blizzard',
    name: '暴风雪',
    icon: '❄️',
    color: '#88ccff',
    element: 'ice',
    descs: ['召唤 1 片暴风雪 · 减速 20%', '范围 +15 · 伤害 +2', '暴风雪 +1 · 减速 +5%', '伤害 +3 · 持续时间 +0.5s', '范围 +15 · 冷却 -0.3s', '暴风雪 +1 · 伤害 +4', '减速 +10% · 持续时间 +0.5s', '暴风雪 +2 · 伤害 +6'],
    stats: [
      { n: 1, cd: 3.5, d: 6, r: 55, dur: 2.5, tick: 0.4, slow: 0.20, slowT: 1.2 },
      { n: 1, cd: 3.3, d: 8, r: 70, dur: 2.8, tick: 0.38, slow: 0.20, slowT: 1.3 },
      { n: 2, cd: 3.1, d: 10, r: 70, dur: 3.0, tick: 0.36, slow: 0.25, slowT: 1.4 },
      { n: 2, cd: 2.9, d: 13, r: 70, dur: 3.5, tick: 0.34, slow: 0.25, slowT: 1.5 },
      { n: 2, cd: 2.6, d: 15, r: 85, dur: 3.5, tick: 0.32, slow: 0.25, slowT: 1.6 },
      { n: 3, cd: 2.3, d: 19, r: 85, dur: 4.0, tick: 0.30, slow: 0.30, slowT: 1.8 },
      { n: 3, cd: 2.0, d: 22, r: 85, dur: 4.5, tick: 0.28, slow: 0.35, slowT: 2.0 },
      { n: 5, cd: 1.5, d: 28, r: 100, dur: 5.0, tick: 0.25, slow: 0.40, slowT: 2.2 }
    ]
  },
  frost_nova: {
    id: 'frost_nova',
    name: '冰霜新星',
    icon: '🧊',
    color: '#aaddff',
    element: 'ice',
    descs: ['新星半径 80px · 冻结 0.8s', '半径 +15 · 伤害 +4', '冻结 +0.2s · 冷却 -0.3s', '伤害 +6 · 半径 +15', '冻结 +0.3s · 伤害 +5', '半径 +20 · 冷却 -0.4s', '伤害 +8 · 冻结 +0.3s', '半径 +25 · 伤害 +10 · 冻结 +0.4s'],
    stats: [
      { n: 1, cd: 4.0, d: 18, r: 80, freeze: 0.8 },
      { n: 1, cd: 3.7, d: 22, r: 95, freeze: 0.8 },
      { n: 1, cd: 3.4, d: 26, r: 95, freeze: 1.0 },
      { n: 1, cd: 3.1, d: 32, r: 110, freeze: 1.0 },
      { n: 1, cd: 2.8, d: 37, r: 110, freeze: 1.3 },
      { n: 1, cd: 2.4, d: 42, r: 130, freeze: 1.3 },
      { n: 1, cd: 2.1, d: 50, r: 130, freeze: 1.6 },
      { n: 1, cd: 1.7, d: 60, r: 155, freeze: 2.0 }
    ]
  },
  tidal_wave: {
    id: 'tidal_wave',
    name: '潮水',
    icon: '🌊',
    color: '#44aaff',
    element: 'water',
    descs: ['推出 1 道弧形潮水 · 宽度 90 · 潮湿 3s', '伤害 +3 · 宽度 +15', '潮水 +1 · 冷却 -0.3s', '伤害 +4 · 宽度 +20', '击退 +30 · 冷却 -0.3s', '潮水 +1 · 伤害 +5', '宽度 +25 · 减速 +10%', '潮水 +2 · 伤害 +8 · 宽度 +30'],
    stats: [
      { n: 1, cd: 3.0, d: 16, w: 90, range: 360, spd: 260, knock: 60, slow: 0.25, slowT: 2 },
      { n: 1, cd: 2.8, d: 19, w: 105, range: 370, spd: 270, knock: 60, slow: 0.25, slowT: 2 },
      { n: 2, cd: 2.5, d: 22, w: 105, range: 380, spd: 280, knock: 60, slow: 0.30, slowT: 2.2 },
      { n: 2, cd: 2.3, d: 26, w: 125, range: 390, spd: 290, knock: 60, slow: 0.30, slowT: 2.2 },
      { n: 2, cd: 2.0, d: 30, w: 125, range: 400, spd: 300, knock: 90, slow: 0.35, slowT: 2.5 },
      { n: 3, cd: 1.7, d: 35, w: 125, range: 420, spd: 310, knock: 90, slow: 0.35, slowT: 2.5 },
      { n: 3, cd: 1.4, d: 40, w: 150, range: 430, spd: 320, knock: 90, slow: 0.45, slowT: 3 },
      { n: 5, cd: 1.1, d: 48, w: 180, range: 450, spd: 340, knock: 120, slow: 0.50, slowT: 3.5 }
    ]
  }
};

export const PASSIVES = [
  { id: 'maxHp', name: '生命力', icon: '❤️', desc: '+30 最大生命值', a: (p) => { p.maxHp += 30; } },
  { id: 'speed', name: '迅捷', icon: '💨', desc: '+12% 移动速度', a: (p) => { p.speed *= 1.12; } },
  { id: 'damage', name: '力量', icon: '💪', desc: '+12% 伤害', a: (p) => { p.powerStacks = (p.powerStacks || 0) + 1; p.dmgMult = 1 + p.powerStacks * 0.12; } },
  { id: 'cooldown', name: '急速', icon: '⏩', desc: '-8% 冷却', a: (p) => { p.hasteStacks = (p.hasteStacks || 0) + 1; p.cdMult = 1 / (1 + p.hasteStacks * 0.08); } },
  { id: 'magnet', name: '磁铁', icon: '🧲', desc: '+30 拾取范围', a: (p) => { p.magnetRange += 30; } }
];

export const ELEMENTS = {
  fire: { name: '火', icon: '🔥', color: '#ff6622' },
  ice: { name: '冰', icon: '❄️', color: '#88ccff' },
  lightning: { name: '雷', icon: '⚡', color: '#ffff44' },
  water: { name: '水', icon: '💧', color: '#44aaff' },
  nature: { name: '自然', icon: '🌿', color: '#aadd88' },
  physical: { name: '物理', icon: '⚔️', color: '#cccccc' },
  arcane: { name: '奥术', icon: '✨', color: '#66ccff' }
};

export const ELEMENT_STATUS_DURATION = { fire: 3, ice: 2.5, lightning: 2, water: 5, physical: 2, arcane: 2, nature: 2.5 };

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

export const WEATHER_TYPES = {
  clear: { id: 'clear', name: '晴朗', icon: '☀️', desc: '无特殊效果' },
  rain: { id: 'rain', name: '雨天', icon: '🌧️', desc: '火伤-15% 雷伤+20%' },
  thunder: { id: 'thunder', name: '雷暴', icon: '⛈️', desc: '雷系冷却-20%' },
  drought: { id: 'drought', name: '干旱', icon: '🌵', desc: '火伤+25%' },
  snowstorm: { id: 'snowstorm', name: '暴风雪', icon: '🌨️', desc: '冰伤+20% 怪物减速' }
};

export function getWeatherDuration() { return 50 + Math.random() * 40; }
