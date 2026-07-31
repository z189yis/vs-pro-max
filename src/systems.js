// ===== 共享战斗系统（生存模式 + 防守模式共用） =====
// 敌人 AI、弹丸碰撞、武器冷却抽离为独立系统；
// 目标点可配置：生存模式 = 玩家，防守模式 = 水晶。
// 系统通过回调注入（setSystemsCfg）避免与具体模式耦合。

import { ATTACK, WDEF } from './config.js';
import { rng, irng, clamp, randAngle, dist, distToSegment, addToPool, compactPool, compactTrail, addParticle, addDmgNumber, addLightningEffect, addFireExplosion, addConeEffect, addBlizzardZone, addFrostNovaEffect, addGarlicAura, addDisintegrateBeam, addTidalWave, onScreen, countActive, enemies, projectiles, lightningEffects, garlicAuraAlpha, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects, disintegrateBeams, tidalWaves } from './utils.js';
import { sfxShoot, sfxBounce, sfxPlayerHit } from './audio.js';
import { playerRef, enemyGrid, handleEnemyDeath, dealDmg } from './entities.js';
import { fireWeapon } from './weapons.js';

// ===== 配置（模式启动时注入） =====
let cfg = {
  getTargetPoint: () => ({ x: playerRef.value.x, y: playerRef.value.y }), // 敌人 AI 目标
  onKill: null,           // 击杀钩子（defense: bossKilled/统计）
  onCrystalHit: null,     // 水晶受击钩子（defense）
  heroHitDmg: null,       // 玩家受击结算（defense: 死亡处理；survival: 保留原逻辑时不用）
  preFire: null,          // 武器发射前钩子（hero 被动 manaCascade）
  crit: () => 1           // 普攻暴击倍率（hero 被动 crit）
};

export function setSystemsCfg(c) { Object.assign(cfg, c); }

// ===== 敌人 AI =====
// 移动/状态/烧伤/死亡由本系统结算；玩家受击判定由模式层调用 playerHitSystem
export function systemEnemies(dt) {
  const player = playerRef.value;
  const tp = cfg.getTargetPoint();
  const tdx = tp.x - player.x, tdy = tp.y - player.y;
  // 超出目标一定距离的敌人直接清除（防止敌人游荡在屏幕外堆积）
  const outRange = Math.hypot(tdx, tdy) + 1400;

  for (let e of enemies) {
    if (e._dead || !e.active) continue;
    const dx = tp.x - e.x, dy = tp.y - e.y, d = Math.hypot(dx, dy) || 0.001;
    if (d > outRange) { e.active = false; continue; }
    let bs = d < 180 ? 100 : e.spd;
    let spd = bs * (1 + gameTimeRef.value / 400);
    if (e.freezeTimer > 0) { spd = 0; e.freezeTimer -= dt; }
    else if (e.slowTimer > 0) { spd *= (1 - e.slowAmount); e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowAmount = 0; }
    if (weatherRef.value && weatherRef.value.id === 'snowstorm') spd *= 0.9;
    if (e.statusTimer > 0) { e.statusTimer -= dt; if (e.statusTimer <= 0) e.status = null; }
    if (e.defenseDown > 0) e.defenseDown -= dt;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.burnTimer > 0) { e.hp -= e.burnDmg * dt; e.burnTimer -= dt; e.hitFlash = 0.04; if (e.hp <= 0) { handleEnemyDeath(e); } }
    e.x += (dx / d) * spd * dt + e.knockback.vx * dt;
    e.y += (dy / d) * spd * dt + e.knockback.vy * dt;
    e.knockback.vx *= Math.exp(-8 * dt);
    e.knockback.vy *= Math.exp(-8 * dt);
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.burnTimer > 0 && Math.random() < dt * 8) addParticle(e.x, e.y, '#ff6622', 1, 60, 0.4, 5);
  }
  // 玩家/水晶受击判定（由系统统一结算）
  playerHitSystem(dt);
}

// 玩家受击：由模式配置钩子决定死亡后的行为
function playerHitSystem(dt) {
  const player = playerRef.value;
  if (player.iframes > 0) { player.iframes -= dt; return; }
  for (let e of enemies) {
    if (e._dead || !e.active) continue;
    if (dist(player, e) < 12 + e.size) {
      const dmg = e.dmg * player.dmgTakenMult;
      player.hp -= dmg; player.iframes = 0.4; screenShakeRef.value = Math.max(screenShakeRef.value, 5);
      sfxPlayerHit(); addParticle(player.x, player.y, '#ff4444', 6, 60, 0.3, 3);
      if (cfg.onPlayerHit) cfg.onPlayerHit(e, dmg);
      if (player.hp <= 0) {
        player.alive = false;
        if (cfg.onPlayerDeath) cfg.onPlayerDeath(e);
        break;
      }
    }
  }
}

// ===== 弹丸更新 =====
export function systemProjectiles(dt) {
  for (let p of projectiles) {
    if (!p.active) continue;
    if (p._delay && p._delay > 0) { p._delay -= dt; continue; }
    p.life -= dt;
    if (p.life <= 0) { p._remove = true; continue; }
    if (p.type === 'missile') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.2 }); }
    else if (p.type === 'knife') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.12 }); }
    else if (p.type === 'fire') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.3 }); }
    else if (p.type === 'ice') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.2 }); }
    else if (p.type === 'attack') { p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (p.type === 'lspear') {
      p.target = enemyGrid.queryNearest(p.x, p.y, 800);
      if (p.target) {
        const dx = p.target.x - p.x, dy = p.target.y - p.y, ta = Math.atan2(dy, dx);
        let diff = ta - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.angle += Math.sign(diff) * Math.min(Math.abs(diff), p.turnRate * dt);
      }
      p.vx = Math.cos(p.angle) * p.spd; p.vy = Math.sin(p.angle) * p.spd;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.12 });
      if (Math.random() < 0.5) addParticle(p.x, p.y, '#aaddff', 1, 40, 0.12, 2);
    } else if (p.type === 'ice_shard_synergy') {
      p.x += p.vx * dt; p.y += p.vy * dt;
    } else if (p.type === 'axe') {
      p.phase += p.orbitS * dt;
      p.x = playerRef.value.x + Math.cos(p.phase) * p.orbitR;
      p.y = playerRef.value.y + Math.sin(p.phase) * p.orbitR;
      p.angle += p.spinSpeed * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.2 });
    }
    if (p.trail) { for (let t of p.trail) t.life -= dt; compactTrail(p.trail); }
    const cr = Math.max(p.size || 5, p.aoe || 0, p.coneR || 0, 60) + 120;
    const near = enemyGrid.query(p.x, p.y, cr);
    for (let e of near) {
      if (e._dead || !e.active) continue;
      if (p.type === 'ice') {
        const d = dist(p, e);
        if (d < p.size + e.size && !p.hit.includes(e)) {
          p.hit.push(e); dealDmg(e, p.dmg, p, '#88ccff'); e.slowAmount = Math.max(e.slowAmount, p.slow); e.slowTimer = Math.max(e.slowTimer, p.slowT);
          addParticle(e.x, e.y, '#aaddff', 4, 30, 0.25, 2);
          const ang = Math.atan2(e.y - p.y, e.x - p.x);
          addToPool(coneEffects, 100, { x: e.x, y: e.y, angle: ang, coneA: p.coneA, coneR: p.coneR, life: 0.4, maxLife: 0.4 }, 'life');
          for (let e2 of near) {
            if (e2._dead || e2 === e || !e2.active) continue;
            const d2 = dist(e, e2);
            if (d2 < p.coneR) {
              const ea = Math.atan2(e2.y - e.y, e2.x - e.x), adiff = ea - ang;
              let aa = adiff; while (aa > Math.PI) aa -= Math.PI * 2; while (aa < -Math.PI) aa += Math.PI * 2;
              if (Math.abs(aa) < p.coneA * Math.PI / 360) {
                const cdmg = p.dmg * p.aoeDmg; dealDmg(e2, cdmg, null, '#88ccff'); e2.slowAmount = Math.max(e2.slowAmount, p.slow); e2.slowTimer = Math.max(e2.slowTimer, p.slowT);
                addParticle(e2.x, e2.y, '#aaddff', 2, 20, 0.2, 2);
              }
            }
          }
          p._remove = true; break;
        }
      } else if (p.type === 'fire') {
        const d = dist(p, e);
        if (d < p.size + e.size && !p._exploded) {
          p._exploded = true;
          for (let e2 of near) {
            if (e2._dead || !e2.active) continue;
            const d2 = dist(p, e2);
            if (d2 < p.aoe + e2.size) {
              dealDmg(e2, p.dmg, null, '#ff6622');
              // 火4件：点燃可叠加
              if (playerRef.value.synergyBurnStacks > 0) {
                e2.burnDmg = Math.min(e2.burnDmg + p.burn, p.burn * playerRef.value.synergyBurnStacks);
              } else {
                e2.burnDmg = Math.max(e2.burnDmg, p.burn);
              }
              e2.burnTimer = Math.max(e2.burnTimer, p.burnT);
            }
          }
          addToPool(fireExplosions, 100, { x: p.x, y: p.y, life: 0.5, maxLife: 0.5, radius: p.aoe }, 'life');
          addParticle(p.x, p.y, '#ff6622', 15, 120, 0.5, 6); addParticle(p.x, p.y, '#ffaa00', 10, 80, 0.4, 4);
          screenShakeRef.value = Math.max(screenShakeRef.value, 3); p._remove = true; break;
        }
      } else if (p.type === 'axe') {
        const d = dist(p, e);
        if (d < p.aoe + e.size) { dealDmg(e, p.dmg, p); addParticle(e.x, e.y, '#ff8844', 3, 40, 0.2, 2); }
      } else if (p.type === 'attack') {
        const d = dist(p, e);
        if (d < p.size + e.size) {
          p.hit = p.hit || [];
          if (p.hit.includes(e)) continue;
          p.hit.push(e);
          dealDmg(e, p.dmg * cfg.crit(), p, '#ffffff');
          // 物理4件：普攻弹射
          if (p.bounces > 0 && (!p.bounceUsed || p.bounceUsed < p.bounces)) {
            p.bounceUsed = (p.bounceUsed || 0) + 1;
            p.target = null; p.hit.length = 0;
            sfxBounce();
            addParticle(p.x, p.y, '#ffffff', 5, 60, 0.3, 3);
          } else {
            p._remove = true;
          }
          break;
        }
      } else if (p.type === 'ice_shard_synergy') {
        const d = dist(p, e);
        if (d < p.size + e.size) {
          p.hit = p.hit || [];
          if (p.hit.includes(e)) continue;
          p.hit.push(e);
          dealDmg(e, p.dmg, p, '#aaddff', 'ice');
          p._remove = true; break;
        }
      } else {
        const d = dist(p, e);
        if (d < p.size + e.size) {
          if (p.type === 'missile') {
            p.hit = p.hit || [];
            if (p.hit.includes(e)) continue;
            p.hit.push(e);
            dealDmg(e, p.dmg, p);
            // 奥术4件：命中概率重置冷却
            if (cfg.preFire) cfg.preFire('magic_missile');
            if (p.bounces > 0 && p.bounceUsed < p.bounces) {
              p.bounceUsed++; p.target = null; p.hit.length = 0; sfxBounce();
              addParticle(p.x, p.y, '#66ccff', 5, 60, 0.3, 3);
            } else if (p.splits > 0 && !p._split) {
              p._split = true;
              for (let si = 0; si < p.splits; si++) {
                const sa = randAngle();
                addToPool(projectiles, 400, { x: p.x, y: p.y, vx: 0, vy: 0, spd: p.spd * 0.7, angle: sa, turnRate: p.turnRate + 2, dmg: p.dmg * 0.6, bounces: 0, splits: 0, pierce: 0, life: p.life * 0.6, type: 'missile', color: '#88ddff', size: 3, target: null, trail: [], hit: [], bounceUsed: 0 }, 'life');
              }
              addParticle(p.x, p.y, '#66ccff', 8, 80, 0.4, 4);
            } else { p._remove = true; }
          } else if (p.type === 'knife') {
            p.hit = p.hit || [];
            if (p.hit.includes(e)) continue;
            p.hit.push(e);
            dealDmg(e, p.dmg, p);
            // 物理2件：飞刀弹射
            if (p.bounces > 0 && p.bounceUsed < p.bounces) {
              p.bounceUsed++;
              p.target = null; p.hit.length = 0; sfxBounce();
              addParticle(p.x, p.y, '#cccccc', 5, 60, 0.3, 3);
            } else { p._remove = true; }
          } else {
            // lspear 等穿透弹：同一敌人每发只命中一次
            p.hit = p.hit || [];
            if (p.hit.includes(e)) continue;
            p.hit.push(e);
            dealDmg(e, p.dmg, p);
            if (p._remove) break;
          }
        }
      }
    }
  }
  compactPool(projectiles, p => p._remove || p.life <= 0);
}

// ===== 武器冷却 =====
// survival：cdMult = player.cdMult * 元素CD系数；defense：可额外叠加武器专属加成（M3）
export function systemWeapons(dt, opts = {}) {
  const player = playerRef.value;
  const { cdMultOf } = opts;
  for (let w of player.weapons) {
    if (w.id === 'garlic') continue;
    if (!w._timer) w._timer = 0;
    w._timer -= dt;
    if (w._timer <= 0) {
      const s2 = WDEF[w.id].stats;
      let cm = player.cdMult;
      if (cdMultOf) cm *= cdMultOf(w.id);
      w._timer = s2.cd * cm;
      if (cfg.preFire) cfg.preFire(w.id);
      fireWeapon(w);
    }
  }
}

// ===== 普攻 =====
export function fireAttackSys() {
  const player = playerRef.value;
  const a = player.facingAngle;
  const dmg = (ATTACK.dmg + (player.attackDmgBonus || 0)) * player.dmgMult * (player.attackDmgMult || 1);
  const pierce = player.synergyAttackPierce ? Infinity : 0;
  const bounces = player.synergyAttackBounce || 0;
  addToPool(projectiles, 400, {
    x: player.x + Math.cos(a) * 20, y: player.y + Math.sin(a) * 20,
    vx: Math.cos(a) * ATTACK.spd, vy: Math.sin(a) * ATTACK.spd,
    spd: ATTACK.spd, angle: a, dmg, pierce, bounces, life: 1.2,
    type: 'attack', element: ATTACK.element, color: ATTACK.color, size: ATTACK.size, trail: [], hit: [], bounceUsed: 0
  }, 'life');
}

// ===== 弹丸寻的（从 game.js 抽出） =====
export function seekTarget(p, dt) {
  if (!p.target || p.target._dead) p.target = enemyGrid.queryNearest(p.x, p.y, 900);
  if (p.target && !p.target._dead) {
    const dx = p.target.x - p.x, dy = p.target.y - p.y;
    const ta = Math.atan2(dy, dx);
    let diff = ta - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += Math.sign(diff) * Math.min(Math.abs(diff), p.turnRate * dt);
  }
  p.x += Math.cos(p.angle) * p.spd * dt;
  p.y += Math.sin(p.angle) * p.spd * dt;
}

// ===== 延迟引用（避免循环依赖） =====
let gameTimeRef = { value: 0 };
let weatherRef = { value: null };
let screenShakeRef = { value: 0 };
export function setSystemsRefs(refs) {
  if (refs.gameTime) gameTimeRef = refs.gameTime;
  if (refs.weather) weatherRef = refs.weather;
  if (refs.screenShake) screenShakeRef = refs.screenShake;
}
