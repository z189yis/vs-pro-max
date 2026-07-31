// ===== 水晶防守模式 · 英雄定义 =====
// 新增英雄 = 此处追加一条定义；statMods 的键与 player 字段一一对应

export const HEROES = [
  {
    id: 'knight',
    name: '铁壁骑士',
    icon: '🛡️',
    desc: '生命+60 · 受到伤害-15%',
    statMods: { maxHp: 60, dmgTakenMult: 0.85 },
    weapon: 'garlic',
    passive: 'thorns'
  },
  {
    id: 'assassin',
    name: '疾风刺客',
    icon: '🗡️',
    desc: '普攻伤害+50% · 移速+15%',
    statMods: { attackDmgMult: 1.5, speedMult: 1.15 },
    weapon: 'knife',
    passive: 'crit'
  },
  {
    id: 'mage',
    name: '奥术贤者',
    icon: '🔮',
    desc: '武器伤害+25% · 冷却-15%',
    statMods: { dmgMult: 1.25, cdMult: 0.85 },
    weapon: 'magic_missile',
    passive: 'manaCascade'
  }
];

// 英雄被动技能（M4 突破将逐级强化）
export const HERO_PASSIVES = {
  thorns: {
    name: '荆棘',
    desc: '被击中时反弹伤害',
    tick: (player, e, dt) => {
      if (e && e._dead === false) dealDmgDefense(e, 6 * player.dmgMult, null, '#aadd88', 'nature');
    }
  },
  crit: {
    name: '暴击',
    desc: '普攻 20% 概率造成 2 倍伤害',
    // 由普攻系统调用：返回伤害倍率
    dmgMult: (player, dmg) => (Math.random() < 0.2 ? dmg * 2 : dmg)
  },
  manaCascade: {
    name: '奥能涌动',
    desc: '击杀时 10% 概率重置随机武器冷却',
    onKill: (player) => {
      if (Math.random() < 0.1 && player.weapons.length > 0) {
        const w = player.weapons[Math.floor(Math.random() * player.weapons.length)];
        if (w) w._timer = 0;
      }
    }
  }
};

// 应用英雄属性与初始武器（同时设置基础被动等级）
export function applyHero(player, hero) {
  for (let k in hero.statMods) player[k] = hero.statMods[k];
  player.weapons = [{ id: hero.weapon, _timer: 0 }];
  player.heroId = hero.id;
  player.heroPassive = hero.passive;
  player.heroPassiveLv = 1;
}

// 处理英雄被动事件（解耦：由系统在对应时机调用）
export function triggerHeroPassive(player, event, ...args) {
  const p = player.heroPassive;
  if (!p || !HERO_PASSIVES[p]) return;
  const fn = HERO_PASSIVES[p][event];
  if (fn) fn(player, ...args);
}

// 延迟引用，避免循环依赖（由 entry 注入）
let dealDmgDefense = () => {};
export function setHeroDmgFn(fn) { dealDmgDefense = fn; }
