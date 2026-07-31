// ===== 水晶防守模式 · 主动技能（自动释放版） =====
// 冷却转好自动索敌释放（类似大威力武器），无需手动按键
// 所有技能有范围限制：只索敌玩家周围 600px 内的敌人

import { rng, dist, addToPool, addParticle } from '../utils.js';
import { playerRef, gameRefs, handleEnemyDeath, dealDmg, enemyGrid } from '../entities.js';
import { sfxFire, sfxLightning, sfxIce } from '../audio.js';

// 技能索敌范围上限
export const SKILL_RANGE = 600;

// 技能定义
export const SKILLS = {
  meteor: {
    id: 'meteor', name: '陨石', icon: '☄️', cd: 10, range: SKILL_RANGE,
    desc: '自动砸击目标区域，大范围伤害',
    cast: (p, level) => {
      const t = nearestEnemy(p, SKILL_RANGE);
      if (!t) return false;
      sfxFire();
      const x = t.x, y = t.y;
      const dmg = (60 + 30 * level) * p.dmgMult;
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
      return true;
    }
  },
  nova: {
    id: 'nova', name: '寒霜新星', icon: '❄️', cd: 8, range: SKILL_RANGE,
    desc: '周围有敌人时爆发冰环冻结',
    cast: (p, level) => {
      const t = nearestEnemy(p, SKILL_RANGE);
      if (!t) return false;
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
      return true;
    }
  },
  lightning_storm: {
    id: 'lightning_storm', name: '雷暴', icon: '⛈️', cd: 12, range: SKILL_RANGE,
    desc: '自动连锁闪电打击多个敌人',
    cast: (p, level) => {
      const targets = [];
      const alive = gameRefs.enemies.filter(e => e.active && !e._dead && dist(p, e) < SKILL_RANGE);
      if (!alive.length) return false;
      sfxLightning();
      const count = 3 + level;
      for (let i = 0; i < Math.min(count, alive.length); i++) {
        const idx = Math.floor(Math.random() * alive.length);
        const t = alive[idx];
        alive.splice(idx, 1);
        targets.push(t);
      }
      const dmg = (25 + 12 * level) * p.dmgMult;
      for (let t of targets) {
        dealDmg(t, dmg, null, '#ffff44', 'lightning');
        t.stun = Math.max(t.stun, 0.3);
        addToPool(gameRefs.lightningEffects, 100, { x: t.x, y: t.y, life: 0.25, maxLife: 0.25, aoe: 30, dmg: 0, segments: [{ x: p.x, y: p.y }, { x: t.x, y: t.y }] }, 'life');
        if (t.hp <= 0) handleEnemyDeath(t);
      }
      return true;
    }
  },
  heal: {
    id: 'heal', name: '治疗术', icon: '💚', cd: 15, range: 0,
    desc: '自动恢复自身生命值',
    cast: (p, level) => {
      // 血量低于 70% 才自动释放
      if (p.hp > p.maxHp * 0.7) return false;
      const amount = (30 + 20 * level);
      p.hp = Math.min(p.maxHp, p.hp + amount);
      addParticle(p.x, p.y, '#44ff88', 15, 80, 0.5, 4);
      return true;
    }
  },
  shield: {
    id: 'shield', name: '护盾', icon: '🛡️', cd: 12, range: 0,
    desc: '自动获得持续 4 秒的伤害减免护盾',
    cast: (p, level) => {
      p.skillShield = 4 + level;
      p.skillShieldMult = 0.5;
      addParticle(p.x, p.y, '#66ccff', 12, 60, 0.5, 4);
      return true;
    }
  },
  teleport: {
    id: 'teleport', name: '闪现', icon: '💨', cd: 6, range: 0,
    desc: '被包围时自动向远处瞬移',
    cast: (p, level) => {
      // 周围敌人过多才自动触发
      const near = enemyGrid.query(p.x, p.y, 200);
      const count = near.filter(e => e.active && !e._dead).length;
      if (count < 3) return false;
      const a = Math.random() * Math.PI * 2;
      const d = 150 + 30 * level;
      p.x += Math.cos(a) * d;
      p.y += Math.sin(a) * d;
      addParticle(p.x, p.y, '#ffffff', 10, 100, 0.3, 3);
      return true;
    }
  },
  berserk_active: {
    id: 'berserk_active', name: '狂怒', icon: '🔥', cd: 20, range: 0,
    desc: '自动进入狂暴：8 秒攻速 +100%、移速 +30%',
    cast: (p, level) => {
      // 周围有敌人且非狂暴中才触发
      const near = enemyGrid.query(p.x, p.y, 300);
      const count = near.filter(e => e.active && !e._dead).length;
      if (count < 2 || p.berserkTimer > 0) return false;
      p.berserkTimer = 8;
      p.berserkAttackMult = 2 + level * 0.25;
      p.berserkSpeedMult = 1.3;
      addParticle(p.x, p.y, '#ff4422', 15, 120, 0.5, 4);
      return true;
    }
  },
  storm: {
    id: 'storm', name: '剑气风暴', icon: '⚔️', cd: 14, range: SKILL_RANGE,
    desc: '自动旋转剑气，对周围敌人造成伤害',
    cast: (p, level) => {
      const near = enemyGrid.query(p.x, p.y, SKILL_RANGE);
      if (!near.some(e => e.active && !e._dead)) return false;
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
      return true;
    }
  }
};

// 最近敌人辅助（范围内）
function nearestEnemy(p, maxR) {
  return enemyGrid.queryNearest(p.x, p.y, maxR);
}

// 玩家持有的技能: player.skills = [{ id, level, cdTimer }]
// 自动释放：冷却归零且有目标（或满足条件）时自动施放
export function autoCastSkills() {
  const p = playerRef.value;
  if (!p.skills) return;
  for (let s of p.skills) {
    if (s.cdTimer > 0) continue;
    const def = SKILLS[s.id];
    if (!def) continue;
    const ok = def.cast(p, s.level);
    if (ok) s.cdTimer = def.cd;
  }
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
