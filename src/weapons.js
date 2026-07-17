import { WDEF, ATTACK, SYNERGIES } from './config.js';
import { rng, irng, dist, clamp, addToPool, compactPool, addParticle, addDmgNumber, addLightningEffect, addFireExplosion, addConeEffect, addBlizzardZone, addFrostNovaEffect, addGarlicAura, addDisintegrateBeam, addTidalWave, disintegrateBeams, distToSegment, onScreen, tidalWaves } from './utils.js';
import { sfxShoot, sfxKnife, sfxGarlicTick, sfxAxe, sfxLightning, sfxLightningSpear, sfxIce, sfxFire, sfxBlizzard, sfxFrostNova, sfxBounce, sfxDisintegrate, sfxTidalWave, sfxPickup } from './audio.js';
import { playerRef, gameRefs, enemyGrid, handleEnemyDeath, dealDmg } from './entities.js';

// 获取武器固定数值（不再按等级缩放）
export function ws(w) { return WDEF[w.id].stats; }

// 发射普攻（角色本体）
export function fireAttack() {
  const player = playerRef.value;
  const a = player.facingAngle;
  const dmg = (ATTACK.dmg + (player.attackDmgBonus || 0)) * player.dmgMult;
  const pierce = player.synergyAttackPierce ? Infinity : 0;
  const bounces = player.synergyAttackBounce || 0;
  addToPool(gameRefs.projectiles, 400, {
    x: player.x + Math.cos(a) * 20, y: player.y + Math.sin(a) * 20,
    vx: Math.cos(a) * ATTACK.spd, vy: Math.sin(a) * ATTACK.spd,
    spd: ATTACK.spd, angle: a, dmg, pierce, bounces, life: 1.2,
    type: 'attack', element: ATTACK.element, color: ATTACK.color, size: ATTACK.size, trail: [], hit: [], bounceUsed: 0
  }, 'life');
}

// 发射武器
export function fireWeapon(weapon) {
  const player = playerRef.value;
  const s = ws(weapon);
  const el = WDEF[weapon.id].element;
  const pd = s.d * player.dmgMult;

  // 雷系4件羁绊：电荷充能双重释放
  let castCount = 1;
  if (el === 'lightning' && player.synergyThunderCharge && player.thunderChargeReady) {
    castCount = 2;
    player.thunderChargeReady = false;
    addParticle(player.x, player.y, '#ffff44', 15, 100, 0.4, 4);
  }

  for (let cast = 0; cast < castCount; cast++) {
    fireWeaponOnce(weapon, s, pd, cast);
  }
}

function fireWeaponOnce(weapon, s, pd, castIndex) {
  const player = playerRef.value;
  const delayOffset = castIndex * 0.2; // 双重释放延迟

  switch (weapon.id) {
    case 'magic_missile': {
      sfxShoot();
      const extraBounces = player.synergyMissileBounce || 0;
      for (let i = 0; i < s.n; i++) {
        const oa = rng(0, Math.PI * 2);
        addToPool(gameRefs.projectiles, 400, {
          x: player.x + Math.cos(oa) * 20, y: player.y + Math.sin(oa) * 20, vx: 0, vy: 0,
          spd: s.s, angle: oa, turnRate: s.tr, dmg: pd, bounces: s.b + extraBounces, splits: s.sp, pierce: 0, life: s.l,
          type: 'missile', element: 'arcane', color: '#66ccff', size: 5, target: null, trail: [], hit: [], bounceUsed: 0,
          _delay: delayOffset
        }, 'life');
      }
      break;
    }
    case 'knife': {
      sfxKnife();
      const extraBounces = player.synergyKnifeBounce || 0;
      for (let i = 0; i < s.n; i++) {
        const oa = rng(0, Math.PI * 2);
        addToPool(gameRefs.projectiles, 400, {
          x: player.x + Math.cos(oa) * 22, y: player.y + Math.sin(oa) * 22, vx: 0, vy: 0,
          spd: s.s, angle: oa, turnRate: s.tr, dmg: pd, pierce: s.p, bounces: extraBounces, life: s.l,
          type: 'knife', element: 'physical', color: '#eeeeee', size: 4, target: null, trail: [], hit: [], bounceUsed: 0,
          _delay: delayOffset
        }, 'life');
      }
      break;
    }
    case 'garlic': break;
    case 'axe': {
      sfxAxe();
      const extraN = player.synergyAxeExtra || 0;
      const totalN = s.n + extraN;
      for (let i = 0; i < totalN; i++) {
        const phase = (i / totalN) * Math.PI * 2 + castIndex * Math.PI;
        addToPool(gameRefs.projectiles, 400, {
          x: player.x, y: player.y, phase, orbitR: s.orbitR, orbitS: s.orbitS, dmg: pd, pierce: s.p, life: s.l,
          type: 'axe', element: 'physical', color: '#ff8844', size: 8, aoe: s.aoe, trail: [], angle: 0, spinSpeed: 10
        }, 'life');
      }
      break;
    }
    case 'lightning': {
      sfxLightning();
      const extraN = player.synergyLightningExtra || 0;
      const totalN = s.n + extraN;
      const alive = gameRefs.enemies.filter(e => e.active && !e._dead && onScreen(e.x, e.y, 0));
      const targets = [];
      for (let i = 0; i < Math.min(totalN, alive.length); i++) {
        const idx = irng(0, alive.length - 1);
        const t = alive[idx];
        alive[idx] = alive[alive.length - 1];
        alive.length--;
        targets.push(t);
      }
      while (targets.length < totalN) {
        targets.push({
          x: player.x + rng(-350, 350), y: player.y + rng(-350, 350), hp: 0, maxHp: 1, dmg: 0, size: 5, color: '#fff', xpVal: 0, type: 'dummy', spd: 0,
          hitFlash: 0, knockback: { vx: 0, vy: 0 }, slowAmount: 0, slowTimer: 0, burnDmg: 0, burnTimer: 0
        });
      }
      for (let t of targets) {
        const segs = [];
        const sy2 = t.y - 300, steps = 10;
        for (let s2 = 0; s2 < steps; s2++) {
          const frac = s2 / steps;
          const ny = sy2 + (t.y - sy2) * frac;
          const nx = t.x + (Math.random() - 0.5) * 80 * (1 - frac * 0.7);
          segs.push({ x: nx, y: ny });
        }
        segs.push({ x: t.x, y: t.y });
        addToPool(gameRefs.lightningEffects, 100, { x: t.x, y: t.y, life: s.l, maxLife: s.l, aoe: s.a, dmg: pd, element: 'lightning', segments: segs, _delay: delayOffset }, 'life');
      }
      if (gameRefs.screenShake) gameRefs.screenShake.value = Math.max(gameRefs.screenShake.value, 3);
      break;
    }
    case 'lightning_spear': {
      sfxLightningSpear();
      const extraN = player.synergyLightningExtra || 0;
      const totalN = s.n + extraN;
      const alive2 = gameRefs.enemies.filter(e => e.active && !e._dead);
      alive2.sort((a, b) => dist(player, a) - dist(player, b));
      const tgs = [];
      for (let i = 0; i < Math.min(totalN, alive2.length); i++) tgs.push(alive2[i]);
      while (tgs.length < totalN) tgs.push(null);
      for (let t of tgs) {
        const a2 = t ? Math.atan2(t.y - player.y, t.x - player.x) : rng(0, Math.PI * 2);
        const so = rng(0, 12);
        addToPool(gameRefs.projectiles, 400, {
          x: player.x + Math.cos(a2) * (24 + so), y: player.y + Math.sin(a2) * (24 + so),
          vx: Math.cos(a2) * s.s, vy: Math.sin(a2) * s.s, angle: a2, turnRate: s.tr, spd: s.s, dmg: pd, pierce: s.p, life: s.l,
          type: 'lspear', element: 'lightning', color: '#88ddff', size: s.w, trail: [], sparkTimer: 0,
          _delay: delayOffset
        }, 'life');
      }
      break;
    }
    case 'ice_shard': {
      sfxIce();
      const extraPierce = player.synergyIcePierce || 0;
      for (let i = 0; i < s.n; i++) {
        const oa = rng(0, Math.PI * 2);
        addToPool(gameRefs.projectiles, 400, {
          x: player.x + Math.cos(oa) * 18, y: player.y + Math.sin(oa) * 18, vx: 0, vy: 0,
          spd: s.s, angle: oa, turnRate: s.tr, dmg: pd, coneR: s.coneR, coneA: s.coneA, slow: s.slow, slowT: s.slowT, aoeDmg: s.aoeDmg, life: s.l,
          type: 'ice', element: 'ice', color: '#88ccff', size: 5, target: null, trail: [], hit: [], pierce: extraPierce,
          _delay: delayOffset
        }, 'life');
      }
      break;
    }
    case 'fireball': {
      sfxFire();
      if (player.synergyFireSplit) {
        // 羁绊形态：分裂为 3 颗小火球，每颗 60% 伤害
        for (let i = 0; i < 3; i++) {
          const oa = rng(0, Math.PI * 2);
          addToPool(gameRefs.projectiles, 400, {
            x: player.x + Math.cos(oa) * 16, y: player.y + Math.sin(oa) * 16, vx: 0, vy: 0,
            spd: s.s * 1.2, angle: oa, turnRate: s.tr + 2, dmg: pd * 0.6, aoe: s.aoe * 0.7, burn: s.burn, burnT: s.burnT, life: s.l,
            type: 'fire', element: 'fire', color: '#ff6622', size: 5, target: null, trail: [], _exploded: false,
            _delay: delayOffset
          }, 'life');
        }
      } else {
        for (let i = 0; i < s.n; i++) {
          const oa = rng(0, Math.PI * 2);
          addToPool(gameRefs.projectiles, 400, {
            x: player.x + Math.cos(oa) * 16, y: player.y + Math.sin(oa) * 16, vx: 0, vy: 0,
            spd: s.s, angle: oa, turnRate: s.tr, dmg: pd, aoe: s.aoe, burn: s.burn, burnT: s.burnT, life: s.l,
            type: 'fire', element: 'fire', color: '#ff6622', size: 7, target: null, trail: [], _exploded: false,
            _delay: delayOffset
          }, 'life');
        }
      }
      break;
    }
    case 'blizzard': {
      sfxBlizzard();
      const alive = gameRefs.enemies.filter(e => e.active && !e._dead && onScreen(e.x, e.y, 0));
      const radiusMult = player.synergyBlizzardRadius || 1;
      for (let i = 0; i < s.n; i++) {
        let tx, ty;
        if (alive.length > 0) {
          const t = alive[Math.floor(Math.random() * alive.length)];
          tx = t.x + rng(-40, 40);
          ty = t.y + rng(-40, 40);
        } else {
          tx = player.x + rng(-300, 300);
          ty = player.y + rng(-300, 300);
        }
        const flakes = [];
        for (let f = 0; f < 12; f++) flakes.push({ x: rng(-s.r, s.r), y: rng(-s.r, s.r), size: rng(2, 5), spd: rng(30, 80) });
        addToPool(gameRefs.blizzardZones, 50, {
          x: tx, y: ty, radius: s.r * radiusMult, dmg: pd, duration: s.dur, life: s.dur, tick: s.tick, nextTick: delayOffset, slow: s.slow, slowT: s.slowT, flakes
        }, 'life');
      }
      break;
    }
    case 'frost_nova': {
      sfxFrostNova();
      if (gameRefs.screenShake) gameRefs.screenShake.value = Math.max(gameRefs.screenShake.value, 4);
      addToPool(gameRefs.frostNovaEffects, 30, { x: player.x, y: player.y, radius: 0, maxRadius: s.r, life: 0.35, maxLife: 0.35 }, 'life');
      for (let e of gameRefs.enemies) {
        if (!e.active || e._dead) continue;
        if (dist(player, e) < s.r + e.size) {
          dealDmg(e, pd, null, '#aaddff', 'ice');
          e.freezeTimer = Math.max(e.freezeTimer, s.freeze);
          if (e.hp <= 0) handleEnemyDeath(e);
        }
      }
      addParticle(player.x, player.y, '#aaddff', 20, 140, 0.5, 5);
      break;
    }
    case 'disintegrate_ray': {
      sfxDisintegrate();
      const widthMult = player.synergyBeamWidth || 1;
      let target = null, nd = Infinity;
      for (let e of gameRefs.enemies) {
        if (!e.active || e._dead) continue;
        const d = dist(player, e);
        if (d < nd) { nd = d; target = e; }
      }
      let angle = player.facingAngle;
      let endX = player.x + Math.cos(angle) * s.range;
      let endY = player.y + Math.sin(angle) * s.range;
      if (target) {
        angle = Math.atan2(target.y - player.y, target.x - player.x);
        const d = Math.min(dist(player, target), s.range);
        endX = player.x + Math.cos(angle) * d;
        endY = player.y + Math.sin(angle) * d;
      }
      addDisintegrateBeam({
        x: player.x, y: player.y, endX, endY, angle,
        dmg: pd, range: s.range, width: s.width * widthMult,
        duration: s.dur, life: s.dur + delayOffset,
        tick: s.tick, nextTick: delayOffset
      });
      if (gameRefs.screenShake) gameRefs.screenShake.value = Math.max(gameRefs.screenShake.value, 1);
      break;
    }
    case 'tidal_wave': {
      sfxTidalWave();
      const widthMult = player.synergyWaveWidth || 1;
      const knockMult = player.synergyKnockMult || 1;
      for (let i = 0; i < s.n; i++) {
        const spread = (i - (s.n - 1) / 2) * (Math.PI / 8) + castIndex * (Math.PI / 4);
        const a = player.facingAngle + spread;
        addTidalWave({
          x: player.x + Math.cos(a) * 30, y: player.y + Math.sin(a) * 30,
          angle: a, spd: s.spd, range: s.range, width: s.w * widthMult,
          dmg: pd, knock: s.knock * knockMult, slow: s.slow, slowT: s.slowT,
          life: s.range / s.spd, maxLife: s.range / s.spd, dist: 0, hit: []
        });
      }
      break;
    }
  }
}

export function updateGarlicAura(dt) {
  const player = playerRef.value;
  const gw = player.weapons.find(w => w.id === 'garlic');
  if (!gw) return;
  const s = ws(gw);
  if (!gw._timer) gw._timer = 0;
  gw._timer -= dt;
  if (gw._timer <= 0) {
    gw._timer = s.t;
    sfxGarlicTick();
    const radiusMult = player.synergyGarlicRadius || 1;
    const garlicSlow = player.synergyGarlicSlow || 0;
    addToPool(gameRefs.garlicAuraAlpha, 20, { life: 0.25, maxLife: 0.25, radius: s.r * radiusMult }, 'life');
    for (let e of gameRefs.enemies) {
      if (!e.active || e._dead) continue;
      const d = dist(player, e);
      if (d < s.r * radiusMult + e.size) {
        const dmg = s.d * player.dmgMult;
        dealDmg(e, dmg, null, '#aadd88', 'nature');
        const ka = Math.atan2(e.y - player.y, e.x - player.x);
        e.knockback.vx += Math.cos(ka) * s.k;
        e.knockback.vy += Math.sin(ka) * s.k;
        // 羁绊：光环附加减速
        if (garlicSlow > 0) {
          e.slowAmount = Math.max(e.slowAmount, garlicSlow);
          e.slowTimer = Math.max(e.slowTimer, 1);
        }
        if (e.hp <= 0) handleEnemyDeath(e);
      }
    }
  }
}

export function updateBlizzardZones(dt) {
  for (let b of gameRefs.blizzardZones) {
    if (!b.active) continue;
    b.life -= dt;
    b.nextTick -= dt;
    if (b.nextTick <= 0) {
      b.nextTick = b.tick;
      for (let e of gameRefs.enemies) {
        if (!e.active || e._dead) continue;
        const d = dist(b, e);
        if (d < b.radius + e.size) {
          dealDmg(e, b.dmg, null, '#88ccff', 'ice');
          e.slowAmount = Math.max(e.slowAmount, b.slow);
          e.slowTimer = Math.max(e.slowTimer, b.slowT);
          if (e.hp <= 0) handleEnemyDeath(e);
        }
      }
    }
  }
}

export function updateDisintegrateBeams(dt) {
  const player = playerRef.value;
  for (let b of disintegrateBeams) {
    if (!b.active) continue;
    b.life -= dt;
    b.nextTick -= dt;
    b.x = player.x;
    b.y = player.y;
    b.endX = player.x + Math.cos(b.angle) * b.range;
    b.endY = player.y + Math.sin(b.angle) * b.range;
    if (b.nextTick <= 0) {
      b.nextTick = b.tick;
      for (let e of gameRefs.enemies) {
        if (!e.active || e._dead) continue;
        const d = distToSegment(e.x, e.y, b.x, b.y, b.endX, b.endY);
        if (d < b.width + e.size) {
          dealDmg(e, b.dmg, null, '#ff66ff', 'arcane');
          if (e.hp <= 0) handleEnemyDeath(e);
        }
      }
    }
  }
  compactPool(disintegrateBeams, b => b.life <= 0);
}

export function updateTidalWaves(dt) {
  const player = playerRef.value;
  for (let w of tidalWaves) {
    if (!w.active) continue;
    w.life -= dt;
    w.x += Math.cos(w.angle) * w.spd * dt;
    w.y += Math.sin(w.angle) * w.spd * dt;
    w.dist += w.spd * dt;
    if (w.dist > w.range) { w.active = false; continue; }
    const halfW = w.width * 0.5;
    const perpA = w.angle + Math.PI / 2;
    const ex = w.x + Math.cos(perpA) * halfW;
    const ey = w.y + Math.sin(perpA) * halfW;
    const sx2 = w.x - Math.cos(perpA) * halfW;
    const sy2 = w.y - Math.sin(perpA) * halfW;
    const near = enemyGrid.query(w.x, w.y, w.range * 0.5 + halfW + 80);
    for (let e of near) {
      if (!e.active || e._dead) continue;
      const d = distToSegment(e.x, e.y, sx2, sy2, ex, ey);
      if (d < halfW + e.size && !w.hit.includes(e)) {
        w.hit.push(e);
        dealDmg(e, w.dmg, null, '#44aaff', 'water');
        e.slowAmount = Math.max(e.slowAmount, w.slow);
        e.slowTimer = Math.max(e.slowTimer, w.slowT);
        const ka = Math.atan2(e.y - w.y, e.x - w.x);
        e.knockback.vx += Math.cos(ka) * w.knock;
        e.knockback.vy += Math.sin(ka) * w.knock;
        if (e.hp <= 0) handleEnemyDeath(e);
      }
    }
    if (Math.random() < dt * 8) {
      const px = sx2 + Math.random() * (ex - sx2);
      const py = sy2 + Math.random() * (ey - sy2);
      addParticle(px, py, '#88ccff', 1, 50, 0.3, 2);
    }
  }
  compactPool(tidalWaves, w => w.life <= 0 || w.dist > w.range);
}

// 自然4件羁绊：光环内敌人掉落生命球
export function updateNatureOrbs(dt) {
  const player = playerRef.value;
  if (!player.synergyNatureOrb) return;
  const gw = player.weapons.find(w => w.id === 'garlic');
  if (!gw) return;
  if (!player._natureOrbTimer) player._natureOrbTimer = 0;
  player._natureOrbTimer -= dt;
  if (player._natureOrbTimer <= 0) {
    player._natureOrbTimer = 1.0;
    const s = ws(gw);
    const radiusMult = player.synergyGarlicRadius || 1;
    const auraR = s.r * radiusMult;
    // 找光环内敌人
    for (let e of gameRefs.enemies) {
      if (!e.active || e._dead) continue;
      if (dist(player, e) < auraR + e.size) {
        // 每秒最多掉 1 个生命球
        if (!e._natureOrbDropped || gameRefs.gameTime.value - e._natureOrbDropped > 1.0) {
          e._natureOrbDropped = gameRefs.gameTime.value;
          // 掉落生命球（用 xpGem 池，value=0 但带 heal 标记）
          addToPool(gameRefs.xpGems, 300, {
            x: e.x + rng(-10, 10), y: e.y + rng(-10, 10),
            value: 0, heal: 3, life: 15, bobOff: Math.random() * Math.PI * 2,
            _isHealOrb: true
          }, 'life');
        }
      }
    }
  }
}

// 羁绊特效更新
export function updateSynergyEffects(dt) {
  updateNatureOrbs(dt);
}
