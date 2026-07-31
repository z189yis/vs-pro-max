// ===== 水晶防守模式 · 主更新 =====
// 节奏：hero_select（选英雄）→ playing（波次驱动）→ victory / defeat

import { player, gameState, gameTime, kills, currentWeather, initGameRefs } from '../game.js';
import { WDEF, ATTACK } from '../config.js';
import { rng, lerp, clamp, dist, distToSegment, addToPool, addParticle, addDmgNumber, onScreen, compactPool,
  enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects, disintegrateBeams, tidalWaves, garlicAuraAlpha, W, H, camera } from '../utils.js';
import { spawnEnemy, spawnBoss, enemyGrid, handleEnemyDeath, dealDmg, gameRefs } from '../entities.js';
import { systemEnemies, systemProjectiles, systemWeapons, fireAttackSys, setSystemsCfg, setSystemsRefs } from '../systems.js';
import { crystal, resetCrystal, crystalTakeDamage, updateCrystalShield, upgradeCrystal, repairCrystal, getNextCrystalUpgrade, CRYSTAL_REPAIR_COST } from './crystal.js';
import { waveState, resetWaves, TOTAL_WAVES, FIGHT_DURATION, BREAK_DURATION, updateWaves, isBossWave, enemyHpMult, enemySpeedMult } from './wave.js';
import { defState, resetDefState, addGold, addWood, spendGold, spendWood } from './state.js';
import { setPassivePlayerRef } from './passives.js';
import { rollState, resetRollState, onWaveStart } from './roll.js';
import { openRollPanel, closeRollPanel, reroll, lockRoll, updateRollButtons } from './rollpanel.js';
import { castSkill, tickSkills, SKILLS as SKILL_DEFS } from './skills.js';
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
  // 敌人生成中心 = 玩家（怪在玩家视野边缘出现，向水晶推进；保证战斗可见可打）
  gameRefs.spawnCenter = () => player;
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
    attackDmgMult: 1, speedMult: 1, speedMultBase: 1,
    defPassives: {}, berserkTimer: 0, berserkCount: 0, berserkAttackMult: 0, berserkSpeedMult: 0, skillShield: 0, skillShieldMult: 0,
    skills: []
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
      // 主动技能护盾减伤（skillShieldMult）
      if (player.skillShield > 0 && player.skillShieldMult > 0) {
        const reduced = dmg * (1 - player.skillShieldMult);
        player.hp += dmg - reduced; // 返还减免部分
        addParticle(player.x, player.y, '#66ccff', 5, 60, 0.3, 3);
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
      // 同时直接入账一部分，保证即时反馈
      addGold(10);
      addWood(1);
      addDmgNumber(e.x, e.y - 20, '+10🪙', '#ffcc44');
      const banner = document.getElementById('defense-banner');
      if (banner) { banner.textContent = '💀 Boss 已被击败！'; banner.classList.add('active'); setTimeout(() => banner.classList.remove('active'), 2500); }
    } else {
      // 小怪：20% 概率直接入账 1 金币（即时反馈，无需走到掉落物旁）
      if (Math.random() < 0.2) {
        addGold(1);
        addDmgNumber(e.x, e.y - 16, '+1', '#ffcc44');
      }
    }
  };

  // 初始：第一波前的 break 阶段，玩家可以提前行动
  updateHUD();
  showWaveBanner();
}

// 掉落金币拾取物（复用 xpGem 池，携带实际金额）
export function dropGold(n, x, y) {
  addToPool(xpGems, 300, {
    x: x + rng(-10, 10), y: y + rng(-10, 10),
    value: 0, life: 60, bobOff: Math.random() * Math.PI * 2,
    _isGold: true, _isWood: false, amount: n
  }, 'life');
}

// 掉落木材拾取物（复用 xpGem 池，携带实际数量）
export function dropWood(n, x, y) {
  addToPool(xpGems, 300, {
    x: x + rng(-10, 10), y: y + rng(-10, 10),
    value: 0, life: 60, bobOff: Math.random() * Math.PI * 2,
    _isGold: false, _isWood: true, amount: n
  }, 'life');
}

// 水晶是否在视野内
function crystalVisible() {
  const cx = crystal.x - camera.x, cy = crystal.y - camera.y;
  return cx > -40 && cx < W.value + 40 && cy > -40 && cy < H.value + 40;
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
  updateSkillBar();
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
  if (player.berserkTimer > 0) { // 主动狂暴：移速加成
    player.speedMult = (player.speedMultBase || 1) * (1 + (player.berserkSpeedMult || 0));
  }

  // R 键开关 Roll 面板（仅 break 窗口；fight 期间禁止打开）
  if (keys['r'] && waveState.phase === 'break' && !rollState.open && !breakState.pending) {
    keys['r'] = false;
    openRollPanel();
  } else if (keys['escape'] && rollState.open) {
    keys['escape'] = false;
    closeRollPanel();
  }
  // 主动技能施放（1-4 键）
  if (keys['1'] && !rollState.open && !breakState.pending) { keys['1'] = false; castSkillAt('1'); }
  if (keys['2'] && !rollState.open && !breakState.pending) { keys['2'] = false; castSkillAt('2'); }
  if (keys['3'] && !rollState.open && !breakState.pending) { keys['3'] = false; castSkillAt('3'); }
  if (keys['4'] && !rollState.open && !breakState.pending) { keys['4'] = false; castSkillAt('4'); }
  tickSkills(dt); // 技能冷却/护盾/狂暴计时
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

  // 相机：无限跟随玩家（与生存模式一致）—— 玩家可自由探索大世界
  camera.x = lerp(camera.x, player.x - W.value / 2, 8 * dt);
  camera.y = lerp(camera.y, player.y - H.value / 2, 8 * dt);

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
  let crystalUnderAttack = false;
  for (let e of enemies) {
    if (!e.active || e._dead) continue;
    if (dist(e, crystal) < e.size + 30) {
      crystalUnderAttack = true;
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
  // 水晶受击警告（视野外时触发 HUD 红色警示）
  if (crystalUnderAttack && !crystalVisible()) {
    document.getElementById('defense-hud').classList.add('under-attack');
    document.getElementById('crystal-bar-wrap').classList.add('under-attack');
  } else {
    document.getElementById('defense-hud').classList.remove('under-attack');
    document.getElementById('crystal-bar-wrap').classList.remove('under-attack');
  }
  if (crystal.hp <= 0) {
    defState.value = 'defeat';
    showEndScreen('defeat');
  }

  // 普攻（含主动狂暴攻速加成）
  player.attackTimer -= dt;
  if (player.attackTimer <= 0 && player.alive) {
    let cd = ATTACK.cd * player.attackCdMult;
    if (player.berserkTimer > 0 && player.berserkAttackMult > 0) cd /= player.berserkAttackMult;
    player.attackTimer = cd;
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
        // 金币拾取入账（按掉落实际金额）
        addGold(gem.amount || 1);
        addParticle(gem.x, gem.y, '#ffcc44', 5, 60, 0.3, 3);
        sfxPickup();
      } else if (gem._isWood) {
        // 木材拾取入账（按掉落实际数量）
        addWood(gem.amount || 1);
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

// 按技能槽位施放（1-4 对应第 1-4 个已学技能）
function castSkillAt(slot) {
  const p = player;
  if (!p.skills || !p.skills.length) return;
  const idx = parseInt(slot) - 1;
  if (idx >= p.skills.length) return;
  const s = p.skills[idx];
  const ok = castSkill(s.id);
  if (ok) updateSkillBar();
}

// 移动端技能按钮：window.__castSkillSlot(i) → 施放第 i 个技能
export function setupSkillCast() {
  window.__castSkillSlot = (i) => castSkillAt(String(i));
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
    // 生成在玩家视野边缘内侧（相机跟随玩家，保证怪可见且能打到）
    spawnEnemy(type, rng(300, 500), { hpMult, spdMult });
  }
}

function spawnBossWave() {
  // Boss 波：Boss 按波次缩放 + 小怪（按波次递增，为 Boss 让出压力）
  spawnBoss(rng(300, 500), enemyHpMult());
  const escortCount = 2 + Math.floor(waveState.number / 5);
  for (let i = 0; i < escortCount; i++) spawnEnemy('fast', rng(300, 500), { hpMult: enemyHpMult(), spdMult: enemySpeedMult() });
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
  // 发育窗口引导：剩余敌人清场 + 提示可做的事
  banner.textContent = '🌙 发育时间：清理残敌 · 按 R 抽技能 · 修理/升级水晶';
  banner.classList.add('active');
  setTimeout(() => banner.classList.remove('active'), 3500);
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

// 技能栏：显示已学主动技能 + 冷却
export function updateSkillBar() {
  const bar = document.getElementById('skill-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const skills = player.skills || [];
  for (let i = 0; i < skills.length && i < 4; i++) {
    const s = skills[i];
    const def = SKILL_DEFS[s.id];
    if (!def) continue;
    const el = document.createElement('div');
    el.className = 'skill-slot';
    el.title = `${def.name} Lv${s.level} - ${def.desc}`;
    let cdHtml = '';
    if (s.cdTimer > 0) {
      const pct = Math.max(0, s.cdTimer / def.cd);
      cdHtml = `<div class="skill-cd-overlay">${Math.ceil(s.cdTimer)}</div>`;
      el.style.opacity = 0.5;
    } else {
      el.style.opacity = 1;
    }
    el.innerHTML = `<div class="skill-key">${i + 1}</div><div class="skill-lv">${s.level}</div>${def.icon}${cdHtml}`;
    bar.appendChild(el);
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
