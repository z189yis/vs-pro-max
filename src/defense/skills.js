// ===== 水晶防守模式 · 主动技能 =====
// 手动施放（1-4 键 / 移动端按钮），有冷却；Roll 获得，可重复拾取升级（最多 5 级）
// 风格参考 KK 防守图：玩家主动按键放招，而非纯自动武器

import { rng, dist, addToPool, addParticle } from '../utils.js';
import { playerRef, gameRefs, handleEnemyDeath, dealDmg, enemyGrid } from '../entities.js';
import { sfxFire, sfxLightning, sfxIce } from '../audio.js';

// 技能定义（id: 唯一，name, icon, desc, cd: 基础冷却, maxLevel: 5）
export const SKILLS = {
  meteor: {
    id: 'meteor', name: '陨石', icon: '☄️', cd: 10,
    desc: '召唤陨石砸击目标区域，大范围伤害',
    cast: (p, level) => {
      sfxFire();
      const t = nearestEnemy(p, 400);
      const x = t ? t.x : p.x + rng(-150, 150);
      const y = t ? t.y : p.y + rng(-150, 150);
      const dmg = (60 + 30 * level) * p.dmgMult;
      // 命中动画（复用 fireExplosions 池）
      addToPool(gameRefs.fireExplosions, 100, { x, y, life: 0.5, maxLife: 0.5, radius: 90 }, 'life');
      addParticle(x, y, '#ff6622', 20, 150, 0.5, 6);
      const near = enemyGrid.query(x, y, 90);
      for (let e of near) {
        if (e._dead || !e.active) continue;
        if (dist({ x, y }, e) < 90 + e.size) {
          dealDmg(e, dmg, null, '#ff6622', 'fire');
          if (e.hp <= 0) handleEnemyDeath(e);
        }
      }
    }
  },
  nova: {
    id: 'nova', name: '寒霜新星', icon: '❄️', cd: 8,
    desc: '以自身为中心爆发冰环，冻结周围敌人',
    cast: (p, level) => {
      sfxIce();
      const r = 120 + 20 * level;
      const dmg = (30 + 15 * level) * p.dmgMult;
      addToPool(gameRefs.frostNovaEffects, 30, { x: p.x, y: p.y, radius: 0, maxRadius: r, life: 0.35, maxLife: 0.35 }, 'life');
      addParticle(p.x, p.y, '#aaddff', 15, 120, 0.4, 4);
      const near = enemyGrid.query(p.x, p.y, r);
      for (let e of near) {
        if (e._dead || !e.active) continue;
        if (dist(p, e) < r + e.size) {
          dealDmg(e, dmg, null, '#aaddff', 'ice');
          e.freezeTimer = Math.max(e.freezeTimer, 1.2);
          if (e.hp <= 0) handleEnemyDeath(e);
        }
      }
    }
  },
  lightning_storm: {
    id: 'lightning_storm', name: '雷暴', icon: '⛈️', cd: 12,
    desc: '连锁闪电打击多个敌人',
    cast: (p, level) => {
      sfxLightning();
      const count = 3 + level;
      const dmg = (25 + 12 * level) * p.dmgMult;
      let targets = [];
      const alive = gameRefs.enemies.filter(e => e.active && !e._dead);
      for (let i = 0; i < Math.min(count, alive.length); i++) {
        const idx = Math.floor(Math.random() * alive.length);
        const t = alive[idx];
        alive.splice(idx, 1);
        targets.push(t);
      }
      for (let t of targets) {
        dealDmg(t, dmg, null, '#ffff44', 'lightning');
        t.stun = Math.max(t.stun, 0.3);
        addToPool(gameRefs.lightningEffects, 100, { x: t.x, y: t.y, life: 0.25, maxLife: 0.25, aoe: 30, dmg: 0, segments: [{ x: p.x, y: p.y }, { x: t.x, y: t.y }] }, 'life');
        if (t.hp <= 0) handleEnemyDeath(t);
      }
    }
  },
  heal: {
    id: 'heal', name: '治疗术', icon: '💚', cd: 15,
    desc: '恢复自身生命值',
    cast: (p, level) => {
      const amount = (30 + 20 * level);
      p.hp = Math.min(p.maxHp, p.hp + amount);
      addParticle(p.x, p.y, '#44ff88', 15, 80, 0.5, 4);
    }
  },
  shield: {
    id: 'shield', name: '护盾', icon: '🛡️', cd: 12,
    desc: '获得持续 4 秒的伤害减免护盾',
    cast: (p, level) => {
      p.skillShield = 4 + level;
      p.skillShieldMult = 0.5; // 减伤 50%
      addParticle(p.x, p.y, '#66ccff', 12, 60, 0.5, 4);
    }
  },
  teleport: {
    id: 'teleport', name: '闪现', icon: '💨', cd: 6,
    desc: '向移动方向瞬移一段距离',
    cast: (p, level) => {
      const d = 150 + 30 * level;
      const a = p.facingAngle;
      p.x += Math.cos(a) * d;
      p.y += Math.sin(a) * d;
      addParticle(p.x, p.y, '#ffffff', 10, 100, 0.3, 3);
    }
  },
  berserk_active: {
    id: 'berserk_active', name: '狂怒', icon: '🔥', cd: 20,
    desc: '8 秒内攻速 +100%、移速 +30%',
    cast: (p, level) => {
      p.berserkTimer = 8;
      p.berserkAttackMult = 2 + level * 0.25;
      p.berserkSpeedMult = 1.3;
      addParticle(p.x, p.y, '#ff4422', 15, 120, 0.5, 4);
    }
  },
  storm: {
    id: 'storm', name: '剑气风暴', icon: '⚔️', cd: 14,
    desc: '旋转剑气，对周围敌人造成持续伤害',
    cast: (p, level) => {
      // 创建围绕玩家的剑气弹丸（8 个方向）
      const dmg = (20 + 10 * level) * p.dmgMult;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p.angle;
        addToPool(gameRefs.projectiles, 400, {
          x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
          vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
          spd: 300, angle: a, dmg, pierce: 2, life: 0.6,
          type: 'knife', element: 'physical', color: '#ffcc44', size: 5, target: null, trail: [], hit: [], bounceUsed: 0
        }, 'life');
      }
      addParticle(p.x, p.y, '#ffcc44', 10, 100, 0.4, 4);
    }
  }
};

// 最近敌人辅助
function nearestEnemy(p, maxR) {
  return enemyGrid.queryNearest(p.x, p.y, maxR);
}

// 玩家持有的技能: player.skills = [{ id, level }]
// 施放技能（由 update 层在按键时调用）
export function castSkill(skillId) {
  const p = playerRef.value;
  if (!p.skills) return false;
  const s = p.skills.find(s => s.id === skillId);
  if (!s) return false;
  if (s.cdTimer > 0) return false;
  const def = SKILLS[skillId];
  def.cast(p, s.level);
  s.cdTimer = def.cd;
  return true;
}

// 冷却递减（每帧）
export function tickSkills(dt) {
  const p = playerRef.value;
  if (!p.skills) return;
  for (let s of p.skills) {
    if (s.cdTimer > 0) s.cdTimer -= dt;
  }
  // 主动护盾计时
  if (p.skillShield > 0) {
    p.skillShield -= dt;
    if (p.skillShield <= 0) p.skillShieldMult = 0;
  }
  // 主动狂暴计时
  if (p.berserkTimer > 0) {
    p.berserkTimer -= dt;
    if (p.berserkTimer <= 0) { p.berserkAttackMult = 0; p.berserkSpeedMult = 0; }
  }
}
