// ===== 水晶防守模式 · 主更新 =====
// 节奏：hero_select（选英雄）→ playing（波次驱动）→ victory / defeat

import { player, gameState, gameTime, kills, currentWeather, initGameRefs } from '../game.js';
import { WDEF, ATTACK } from '../config.js';
import { rng, lerp, clamp, dist, distToSegment, addToPool, addParticle, onScreen, compactPool,
  enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects, disintegrateBeams, tidalWaves, garlicAuraAlpha } from '../utils.js';
import { spawnEnemy, spawnBoss, enemyGrid, handleEnemyDeath, dealDmg, gameRefs } from '../entities.js';
import { systemEnemies, systemProjectiles, systemWeapons, fireAttackSys, setSystemsCfg, setSystemsRefs } from '../systems.js';
import { crystal, resetCrystal, crystalTakeDamage, updateCrystalShield, upgradeCrystal, repairCrystal, getNextCrystalUpgrade, CRYSTAL_REPAIR_COST } from './crystal.js';
import { waveState, resetWaves, TOTAL_WAVES, FIGHT_DURATION, BREAK_DURATION, updateWaves, isBossWave, enemyHpMult, enemySpeedMult } from './wave.js';
import { defState, resetDefState, addGold, addWood, spendGold, spendWood } from './state.js';
import { setPassivePlayerRef } from './passives.js';
import { rollState, resetRollState } from './roll.js';
import { openRollPanel, closeRollPanel, reroll, lockRoll, updateRollButtons } from './rollpanel.js';
import { checkBreakthrough, breakState } from './breakthrough.js';
import { openBreakthroughPanel, closeBreakthroughPanel } from './breakpanel.js';
import { HEROES, applyHero, triggerHeroPassive, setHeroDmgFn } from './heroes.js';
import { sfxLevelUp, sfxPickup, sfxPlayerHit, sfxShoot, sfxGameOver, sfxCrystalHit, sfxCrystalShield, sfxCrystalRepair, sfxCrystalUpgrade, sfxBossWarning, sfxVictory, sfxBreakthrough } from '../audio.js';
import { keys, joystick, resetInput } from '../input.js';

export const defenseGameTime = { value: 0 };

let firstFrame = true;

export function initDefense() {
  // 模式数据
  resetDefState();
  resetCrystal();
  resetWaves();
  resetRollState();
  defenseGameTime.value = 0;
  firstFrame = true;

  // 被动引用注入
  setPassivePlayerRef(() => player);

  // 复用 entities 所需的 gameRefs（enemies/projectiles 等池 + 回调）
  initGameRefs();
  // 敌人生成中心 = 水晶（防守模式特有）
  gameRefs.spawnCenter = () => crystal;
  // 隐藏 Roll 按钮（选英雄后显示）
  document.getElementById('btn-roll-open').style.display = 'none';

  // 玩家初始状态（基础值，英雄属性由 applyHero 叠加）
  Object.assign(player, {
    x: crystal.x, y: crystal.y, hp: 100, maxHp: 100, speed: 220, level: 1, xp: 0, xpToNext: 8,
    facingAngle: 0, angle: 0, dmgMult: 1, cdMult: 1, powerStacks: 0, hasteStacks: 0, magnetRange: 100,
    weapons: [], iframes: 0, alive: true,
    attackTimer: 0, attackCdMult: 1, attackDmgBonus: 0, attackSpeedStacks: 0,
    armorStacks: 0, dmgTakenMult: 1, regenRate: 0,
    synergies: {},
    synergyFireSplit: false, synergyBurnStacks: 0, synergyFireExplode: false,
    synergyIcePierce: 0, synergyBlizzardRadius: 1, synergyIceShatter: false,
    synergyLightningExtra: 0, synergyThunderCharge: false, thunderChargeReady: false,
    synergyWaveWidth: 1, synergyKnockMult: 1, synergyWaterBurst: false,
    synergyKnifeBounce: 0, synergyAxeExtra: 0, synergyAttackPierce: false, synergyAttackBounce: 0,
    synergyMissileBounce: 0, synergyBeamWidth: 1, synergyArcaneReset: 0,
    synergyGarlicRadius: 1, synergyGarlicSlow: 0, synergyNatureOrb: false,
    attackDmgMult: 1, speedMult: 1,
    defPassives: {}, berserkTimer: 0, berserkCount: 0
  });
  player.weapons = [];

  // 清理对象池
  for (let a of [enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects, disintegrateBeams, tidalWaves, garlicAuraAlpha]) {
    for (let i = 0; i < a.length; i++) a[i].active = false;
  }

  // 系统注入
  setSystemsCfg({
    getTargetPoint: () => ({ x: crystal.x, y: crystal.y }),
    onKill: null,
    onPlayerHit: (e, dmg) => {
      // 荆棘反弹（英雄被动 + 被动技能叠加）
      triggerHeroPassive(player, 'tick', e);
      if (player.defPassives && player.defPassives.thorns) {
        dealDmg(e, 6 * player.dmgMult * player.defPassives.thorns, null, '#aadd88', 'nature');
      }
      // 防守模式：玩家死亡不掉游戏，转复活计时
      if (player.hp <= 0) {
        player.alive = false;
        defState.playerDeathTimer = 3;
        // 死亡代价：掉 10% 金币
        const lost = Math.floor(defState.gold * 0.1);
        defState.gold -= lost;
        addParticle(player.x, player.y, '#ff4444', 12, 120, 0.5, 4);
      }
    },
    onPlayerDeath: () => {},
    preFire: (wid) => {
      // 奥术4件：命中重置冷却（武器专用，magic_missile 在命中回调触发）
      if (player.synergyArcaneReset && Math.random() < player.synergyArcaneReset) {
        const w = player.weapons.find(w => w.id === wid);
        if (w) { w._timer = 0; addParticle(player.x, player.y, '#66ccff', 8, 60, 0.3, 3); }
      }
    },
    crit: () => {
      // 暴击：英雄被动 20% + 被动技能 15% 叠加
      let c = 1;
      if (player.heroPassive === 'crit') c = Math.random() < 0.2 ? 2 : c;
      if (player.defPassives && player.defPassives.crit) c = Math.random() < 0.15 * player.defPassives.crit ? 2 : c;
      return c;
    },
    extraShots: () => {
      return (player.defPassives && player.defPassives.multishot) || 0;
    },
    onVoidCheck: () => {
      const lv = (player.defPassives && player.defPassives.void) || 0;
      return lv > 0 && Math.random() < 0.1 * lv;
    }
  });
  setSystemsRefs({ gameTime: defenseGameTime, weather: currentWeather, screenShake: null });
  setHeroDmgFn((e, dmg, color, element) => {
    dealDmg(e, dmg, null, color, element);
  });

  // 击杀钩子（由 game.js 的 onEnemyDeath 路由到此处；覆盖生存模式钩子）
  window.__onDefenseKill = (e) => {
    defState.totalKills++;
    triggerHeroPassive(player, 'onKill');
    // 吸血被动：击杀回 2 HP
    const ls = (player.defPassives && player.defPassives.lifesteal) || 0;
    if (ls > 0) player.hp = Math.min(player.maxHp, player.hp + 2 * ls);
    // 狂暴被动：每击杀 10 只怪，5 秒攻速 +50%
    if (player.defPassives && player.defPassives.berserk) {
      player.berserkCount = (player.berserkCount || 0) + 1;
      if (player.berserkCount >= 10) {
        player.berserkCount = 0;
        player.berserkTimer = 5;
        player.attackCdMult = 1 / 1.5; // 攻速 +50%
        addParticle(player.x, player.y, '#ff6644', 10, 100, 0.4, 4);
      }
    }
    if (e.type === 'boss') {
      waveState.bossKilled = true;
      waveState.bossAlive = false;
      // Boss 大掉宝：木材 + 金币（拾取时入账）
      dropGold(40, e.x, e.y);
      dropWood(5, e.x, e.y);
      const banner = document.getElementById('defense-banner');
      if (banner) { banner.textContent = '💀 Boss 已被击败！'; banner.classList.add('active'); setTimeout(() => banner.classList.remove('active'), 2500); }
    } else {
      if (Math.random() < 0.2) dropGold(1, e.x, e.y);
    }
  };

  // 初始：第一波前的 break 阶段，玩家可以提前行动
  updateHUD();
  showWaveBanner();
}

// 掉落金币拾取物（复用 xpGem 池）
export function dropGold(n, x, y) {
  addToPool(xpGems, 300, {
    x: x + rng(-10, 10), y: y + rng(-10, 10),
    value: 0, life: 60, bobOff: Math.random() * Math.PI * 2,
    _isGold: true, _isWood: false
  }, 'life');
}

// 掉落木材拾取物（复用 xpGem 池）
export function dropWood(n, x, y) {
  addToPool(xpGems, 300, {
    x: x + rng(-10, 10), y: y + rng(-10, 10),
    value: 0, life: 60, bobOff: Math.random() * Math.PI * 2,
    _isGold: false, _isWood: true
  }, 'life');
}

// 修理水晶（金币消耗）
export function doRepairCrystal() {
  if (defState.gold < CRYSTAL_REPAIR_COST) return false;
  if (crystal.hp >= crystal.maxHp) return false;
  spendGold(CRYSTAL_REPAIR_COST);
  repairCrystal();
  sfxCrystalRepair();
  addParticle(crystal.x, crystal.y, '#88ddff', 15, 100, 0.5, 4);
  updateCrystalButtons();
  return true;
}

// 升级水晶（木材消耗）
export function doUpgradeCrystal() {
  const u = getNextCrystalUpgrade();
  if (!u) return false;
  if (defState.wood < u.cost) return false;
  spendWood(u.cost);
  upgradeCrystal();
  sfxCrystalUpgrade();
  addParticle(crystal.x, crystal.y, '#aaddff', 20, 120, 0.6, 5);
  const banner = document.getElementById('defense-banner');
  if (banner) { banner.textContent = `💎 水晶升级 Lv${crystal.level}：${u.desc}`; banner.classList.add('active'); setTimeout(() => banner.classList.remove('active'), 3500); }
  updateCrystalButtons();
  return true;
}

// 刷新修理/升级按钮可用状态
export function updateCrystalButtons() {
  const repairBtn = document.getElementById('btn-crystal-repair');
  if (repairBtn) {
    repairBtn.disabled = defState.gold < CRYSTAL_REPAIR_COST || crystal.hp >= crystal.maxHp;
  }
  const upBtn = document.getElementById('btn-crystal-upgrade');
  if (upBtn) {
    const u = getNextCrystalUpgrade();
    if (u) {
      upBtn.disabled = defState.wood < u.cost;
      upBtn.innerHTML = `⬆ 升级 <span class="cost">🪵${u.cost}</span>`;
      upBtn.title = u.desc;
    } else {
      upBtn.disabled = true;
      upBtn.innerHTML = '⬆ 已满级';
      upBtn.title = '';
    }
  }
}

// 选英雄
export function chooseHero(heroId) {
  const hero = HEROES.find(h => h.id === heroId);
  if (!hero) return;
  applyHero(player, hero);
  defState.hero = hero;
  defState.value = 'playing';
  document.getElementById('hero-select').classList.remove('active');
  document.getElementById('defense-hud').classList.add('active');
  document.getElementById('btn-roll-open').style.display = 'block';
  startWave(1);
  updateHUD();
  updateWeaponsBar();
}

function startWave(n) {
  waveState.number = n;
  waveState.phase = 'fight';
  waveState.fightTimer = 0;
  waveState.bossSpawned = false;
  waveState.bossKilled = false;
  waveState.bossAlive = isBossWave(n);
  waveState.bossSpawnAt = isBossWave(n) ? FIGHT_DURATION / 3 : 0;
  waveState.spawnTimer = 0;
  waveState.spawned = 0;
  // Boss 波预告（提前 5 秒红字警告 + 音效）
  if (isBossWave(n)) {
    sfxBossWarning();
    const banner = document.getElementById('defense-banner');
    if (banner) {
      banner.textContent = `⚠ 第 ${n} 波：BOSS 来袭！⚠`;
      banner.style.borderColor = '#ff4444';
      banner.classList.add('active');
      setTimeout(() => { banner.classList.remove('active'); banner.style.borderColor = ''; }, 3000);
    }
  }
  showWaveBanner();
}

export function updateDefense(dt) {
  if (firstFrame) { firstFrame = false; }
  if (defState.value !== 'playing') return;
  dt = Math.min(dt, 0.1);

  // R 键开关 Roll 面板（仅 break 窗口；fight 期间禁止打开）
  if (keys['r'] && waveState.phase === 'break' && !rollState.open && !breakState.pending) {
    keys['r'] = false;
    openRollPanel();
  } else if (keys['escape'] && rollState.open) {
    keys['escape'] = false;
    closeRollPanel();
  }
  if (rollState.open) return; // 面板打开时暂停游戏
  if (breakState.pending) return; // 突破面板打开时暂停游戏

  defenseGameTime.value += dt;

  if (player.regenRate > 0) player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt);
  if (player.iframes > 0) player.iframes -= dt;

  // 玩家移动
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (joystick.active) { mx += joystick.moveX; my += joystick.moveY; }
  if (mx !== 0 || my !== 0) {
    const mag = Math.hypot(mx, my);
    mx /= mag; my /= mag;
    player.facingAngle = Math.atan2(my, mx);
    player.x += mx * player.speed * player.speedMult * dt;
    player.y += my * player.speed * player.speedMult * dt;
  }
  player.angle = player.facingAngle;

  // 玩家死亡复活
  if (!player.alive) {
    defState.playerDeathTimer -= dt;
    if (defState.playerDeathTimer <= 0) {
      player.x = crystal.x; player.y = crystal.y;
      player.hp = player.maxHp;
      player.alive = true;
      player.iframes = 1;
      addParticle(player.x, player.y, '#44ff88', 15, 100, 0.5, 4);
    }
    // 死亡期间仍推进波次
  }

  // 狂暴计时衰减（结束后恢复普攻冷却倍率）
  if (player.berserkTimer > 0) {
    player.berserkTimer -= dt;
    if (player.berserkTimer <= 0) {
      player.attackCdMult = 1 / (1 + (player.attackSpeedStacks || 0) * 0.15);
    }
  }

  // 水晶回血 + 护盾充能
  if (crystal.regen > 0) crystal.hp = Math.min(crystal.maxHp, crystal.hp + crystal.regen * dt);
  updateCrystalShield(dt);

  // 波次推进
  const events = updateWaves(dt);
  for (let ev of events) {
    if (ev === 'spawn') spawnWaveBatch();
    else if (ev === 'boss') spawnBossWave();
    else if (ev === 'waveStart') showWaveBanner();
    else if (ev === 'waveEnd') showWaveEndBanner();
    else if (ev === 'victory') { defState.value = 'victory'; showEndScreen('victory'); }
  }

  // 重建空间网格（敌人查询依赖）
  enemyGrid.clear();
  for (let e of enemies) { if (e._dead || !e.active) continue; enemyGrid.insert(e); }

  // 敌人系统（AI 目标 = 水晶，由 systems 注入）
  systemEnemies(dt);

  // 敌人攻击水晶
  for (let e of enemies) {
    if (!e.active || e._dead) continue;
    if (dist(e, crystal) < e.size + 30) {
      const hadShield = crystal.shield > 0;
      const actual = crystalTakeDamage(e.dmg * dt);
      // 音效反馈
      if (hadShield) sfxCrystalShield();
      else if (actual > 0) sfxCrystalHit();
      // 伤害反射（升级 4）
      if (actual > 0 && crystal.reflectPct > 0) {
        dealDmg(e, actual * crystal.reflectPct, null, '#66ccff', 'arcane');
      }
      e.hitFlash = 0.1;
    }
  }
  if (crystal.hp <= 0) {
    defState.value = 'defeat';
    showEndScreen('defeat');
  }

  // 普攻
  player.attackTimer -= dt;
  if (player.attackTimer <= 0 && player.alive) {
    player.attackTimer = ATTACK.cd * player.attackCdMult;
    const nearest = enemyGrid.queryNearest(player.x, player.y, ATTACK.range);
    if (nearest) { fireAttackSys(); sfxShoot(); }
  }

  // 武器系统
  systemWeapons(dt);

  // 弹丸
  systemProjectiles(dt);

  // 特效更新
  for (let l of lightningEffects) { if (l.active) { l.life -= dt; if (l.life < l.maxLife * 0.7 && !l._applied) { l._applied = true; } } }
  compactPool(lightningEffects, l => l.life <= 0);
  for (let fe of fireExplosions) { if (fe.active) fe.life -= dt; } compactPool(fireExplosions, fe => fe.life <= 0);
  for (let ce of coneEffects) { if (ce.active) ce.life -= dt; } compactPool(coneEffects, ce => ce.life <= 0);
  for (let r of reactionEffects) { if (r.active) r.life -= dt; } compactPool(reactionEffects, r => r.life <= 0);
  for (let a of garlicAuraAlpha) { if (a.active) a.life -= dt; } compactPool(garlicAuraAlpha, a => a.life <= 0);
  for (let b of blizzardZones) { if (b.active) b.life -= dt; } compactPool(blizzardZones, b => b.life <= 0);
  for (let f of frostNovaEffects) { if (!f.active) continue; f.life -= dt; f.radius = lerp(0, f.maxRadius, 1 - f.life / f.maxLife); } compactPool(frostNovaEffects, f => f.life <= 0);
  updateTidalWavesLocal(dt);

  // 经验宝石拾取（与生存模式一致）
  for (let gem of xpGems) {
    if (!gem.active) continue;
    gem.life -= dt;
    const d = dist(player, gem);
    if (d < player.magnetRange) { const spd = 400 + (player.magnetRange - d) * 2, a = Math.atan2(player.y - gem.y, player.x - gem.x); gem.x += Math.cos(a) * spd * dt; gem.y += Math.sin(a) * spd * dt; }
    if (d < 18) {
      gem._picked = true;
      if (gem._isGold) {
        // 金币拾取入账
        addGold(1);
        addParticle(gem.x, gem.y, '#ffcc44', 5, 60, 0.3, 3);
        sfxPickup();
      } else if (gem._isWood) {
        // 木材拾取入账
        addWood(1);
        addParticle(gem.x, gem.y, '#ff8844', 6, 60, 0.3, 3);
        sfxPickup();
      } else {
        player.xp += gem.value;
        sfxPickup();
        addParticle(gem.x, gem.y, '#44ff88', 3, 40, 0.2, 2);
      }
    }
  }
  compactPool(xpGems, g => g._picked || g.life <= 0);

  // 升级（防守模式：升级仅加属性，无三选一；每 10 级触发突破）
  if (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = 5 + player.level * 3;
    player.hp = Math.min(player.maxHp, player.hp + 15);
    // M4：突破（每 10 级三选一法宝）
    if (checkBreakthrough(player.level)) {
      openBreakthroughPanel();
      return; // 暂停本帧（面板打开）
    }
    addParticle(player.x, player.y, '#ffcc44', 20, 120, 0.6, 5);
    updateHUD();
  }

  // 清理远离战场的敌人（玩家与水晶之间超出 1600px 的敌人移除，防止游荡堆积）
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.active) continue;
    const dFromCrystal = dist(e, crystal);
    const dFromPlayer = dist(e, player);
    if (e._dead || (dFromCrystal > 1600 && dFromPlayer > 1600)) { e.active = false; continue; }
  }
  for (let p of particles) { if (!p.active) continue; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; } compactPool(particles, p => p.life <= 0);
  for (let dn of dmgNumbers) { if (!dn.active) continue; dn.life -= dt; dn.y += dn.vy * dt; dn.vy *= 0.98; } compactPool(dmgNumbers, dn => dn.life <= 0);

  updateHUD();
}

function spawnWaveBatch() {
  const count = 2;
  const hpMult = enemyHpMult();
  const spdMult = enemySpeedMult();
  for (let i = 0; i < count; i++) {
    let type = 'bat';
    const r = Math.random();
    if (waveState.number > 3 && r < 0.3) type = 'fast';
    if (waveState.number > 7 && r < 0.15) type = 'tank';
    // 生成在屏幕边缘内侧（视野 250-450），保证可见且能到达水晶
    spawnEnemy(type, rng(250, 450), { hpMult, spdMult });
  }
}

function spawnBossWave() {
  // Boss 波：Boss 按波次缩放 + 小怪（按波次递增，为 Boss 让出压力）
  spawnBoss(rng(500, 650), enemyHpMult());
  const escortCount = 2 + Math.floor(waveState.number / 5);
  for (let i = 0; i < escortCount; i++) spawnEnemy('fast', rng(250, 450), { hpMult: enemyHpMult(), spdMult: enemySpeedMult() });
  // Boss 波公告
  const banner = document.getElementById('defense-banner');
  if (banner) { banner.textContent = '⚠ BOSS 波来袭 ⚠'; banner.classList.add('active'); setTimeout(() => banner.classList.remove('active'), 3000); }
}

function showWaveBanner() {
  const banner = document.getElementById('defense-banner');
  if (!banner) return;
  banner.textContent = `第 ${waveState.number} 波 / ${TOTAL_WAVES} 波`;
  banner.classList.add('active');
  setTimeout(() => banner.classList.remove('active'), 2000);
}

function showWaveEndBanner() {
  const banner = document.getElementById('defense-banner');
  if (!banner) return;
  banner.textContent = '🌙 发育时间';
  banner.classList.add('active');
  setTimeout(() => banner.classList.remove('active'), 2500);
}

function updateTidalWavesLocal(dt) {
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
  }
  compactPool(tidalWaves, w => w.life <= 0 || w.dist > w.range);
}

// ===== HUD =====
export function updateHUD() {
  const el = document.getElementById('def-hud');
  if (!el) return;
  const m = Math.floor(defenseGameTime.value / 60), s = Math.floor(defenseGameTime.value % 60);
  document.getElementById('def-time').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  document.getElementById('def-wave').textContent = `${waveState.number}/${TOTAL_WAVES}`;
  document.getElementById('def-kills').textContent = defState.totalKills;
  document.getElementById('def-level').textContent = player.level;
  document.getElementById('def-hp').textContent = Math.max(0, Math.round(player.hp));
  document.getElementById('def-gold').textContent = defState.gold;
  document.getElementById('def-wood').textContent = defState.wood;
  // 水晶血条
  const cbar = document.getElementById('crystal-bar-fill');
  if (cbar) cbar.style.width = Math.min(100, (crystal.hp / crystal.maxHp) * 100) + '%';
  const cx = document.getElementById('crystal-hp');
  if (cx) cx.textContent = Math.max(0, Math.round(crystal.hp));
  const cmx = document.getElementById('crystal-max');
  if (cmx) cmx.textContent = crystal.maxHp;
  // 波次进度条
  const pbar = document.getElementById('def-wave-progress');
  if (pbar) {
    if (waveState.phase === 'fight') pbar.style.width = Math.min(100, (waveState.fightTimer / FIGHT_DURATION) * 100) + '%';
    else pbar.style.width = Math.min(100, (waveState.breakTimer / BREAK_DURATION) * 100) + '%';
  }
  updateCrystalButtons();
}

export function updateWeaponsBar() {
  const b = document.getElementById('def-weapons-bar');
  if (!b) return;
  b.innerHTML = '';
  for (let w of player.weapons) {
    const d = WDEF[w.id];
    const el = document.createElement('div');
    el.className = 'weapon-icon';
    el.innerHTML = `${d.icon}`;
    el.title = `${d.name}`;
    b.appendChild(el);
  }
}

function showEndScreen(result) {
  document.getElementById('defense-end').classList.add('active');
  document.getElementById('defense-end-title').textContent = result === 'victory' ? '🎉 防守胜利！' : '💀 水晶被摧毁！';
  document.getElementById('defense-end-wave').textContent = `${waveState.number}/${TOTAL_WAVES}`;
  document.getElementById('defense-end-time').textContent = document.getElementById('def-time').textContent;
  document.getElementById('defense-end-kills').textContent = defState.totalKills;
  document.getElementById('defense-end-gold').textContent = defState.gold;
  document.getElementById('defense-end-wood').textContent = defState.wood;
  if (result === 'victory') sfxVictory();
  else sfxGameOver();
}

// 供 entry 使用的退出清理
export function disposeDefense() {
  document.getElementById('defense-hud').classList.remove('active');
  document.getElementById('hero-select').classList.remove('active');
  document.getElementById('defense-end').classList.remove('active');
  document.getElementById('defense-banner').classList.remove('active');
  document.getElementById('roll-overlay').classList.remove('active');
  document.getElementById('btn-roll-open').style.display = 'none';
  document.getElementById('breakthrough-overlay').classList.remove('active');
}

// 重开一局（保留已选英雄，回到选择界面）
export function restartDefense() {
  document.getElementById('defense-end').classList.remove('active');
  document.getElementById('hero-select').classList.add('active');
  initDefense();
}
