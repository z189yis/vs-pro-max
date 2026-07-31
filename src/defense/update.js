// ===== 水晶防守模式 · 主更新 =====
// 节奏：hero_select（选英雄）→ playing（波次驱动）→ victory / defeat

import { player, gameState, gameTime, kills, currentWeather, initGameRefs } from '../game.js';
import { WDEF, ATTACK } from '../config.js';
import { rng, lerp, clamp, dist, distToSegment, addToPool, addParticle, onScreen, compactPool,
  enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects, disintegrateBeams, tidalWaves, garlicAuraAlpha } from '../utils.js';
import { spawnEnemy, spawnBoss, enemyGrid, handleEnemyDeath, dealDmg, gameRefs } from '../entities.js';
import { systemEnemies, systemProjectiles, systemWeapons, fireAttackSys, setSystemsCfg, setSystemsRefs } from '../systems.js';
import { crystal, resetCrystal, crystalTakeDamage } from './crystal.js';
import { waveState, resetWaves, TOTAL_WAVES, FIGHT_DURATION, BREAK_DURATION, updateWaves, isBossWave, enemyHpMult, enemySpeedMult } from './wave.js';
import { defState, resetDefState, addGold, addWood } from './state.js';
import { HEROES, applyHero, triggerHeroPassive, setHeroDmgFn } from './heroes.js';
import { sfxLevelUp, sfxPickup, sfxPlayerHit, sfxShoot, sfxGameOver } from '../audio.js';
import { keys, joystick, resetInput } from '../input.js';

export const defenseGameTime = { value: 0 };

let firstFrame = true;

export function initDefense() {
  // 模式数据
  resetDefState();
  resetCrystal();
  resetWaves();
  defenseGameTime.value = 0;
  firstFrame = true;

  // 复用 entities 所需的 gameRefs（enemies/projectiles 等池 + 回调）
  initGameRefs();
  // 敌人生成中心 = 水晶（防守模式特有）
  gameRefs.spawnCenter = () => crystal;

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
    attackDmgMult: 1, speedMult: 1
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
      // 英雄被动：荆棘反弹
      triggerHeroPassive(player, 'tick', e);
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
      if (player.heroPassive === 'crit') {
        return Math.random() < 0.2 ? 2 : 1;
      }
      return 1;
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
    if (e.type === 'boss') {
      waveState.bossKilled = true;
      waveState.bossAlive = false;
      addWood(5);
      addGold(40);
      const banner = document.getElementById('defense-banner');
      if (banner) { banner.textContent = '💀 Boss 已被击败！'; banner.classList.add('active'); setTimeout(() => banner.classList.remove('active'), 2500); }
    } else {
      if (Math.random() < 0.2) addGold(1);
    }
  };

  // 初始：第一波前的 break 阶段，玩家可以提前行动
  updateHUD();
  showWaveBanner();
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
  showWaveBanner();
}

export function updateDefense(dt) {
  if (firstFrame) { firstFrame = false; }
  if (defState.value !== 'playing') return;
  dt = Math.min(dt, 0.1);
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

  // 水晶回血
  if (crystal.regen > 0) crystal.hp = Math.min(crystal.maxHp, crystal.hp + crystal.regen * dt);

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
      crystalTakeDamage(e.dmg * dt);
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
      player.xp += gem.value;
      sfxPickup();
      addParticle(gem.x, gem.y, '#44ff88', 3, 40, 0.2, 2);
    }
  }
  compactPool(xpGems, g => g._picked || g.life <= 0);

  // 升级（防守模式：升级仅加属性，无三选一）
  if (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = 5 + player.level * 3;
    player.hp = Math.min(player.maxHp, player.hp + 15);
    // M4：突破逻辑将在这里接入
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
  // Boss 波：Boss 按波次缩放 + 2 只小怪
  spawnBoss(rng(500, 650), enemyHpMult());
  for (let i = 0; i < 2; i++) spawnEnemy('fast', rng(250, 450), { hpMult: enemyHpMult(), spdMult: enemySpeedMult() });
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
  sfxGameOver();
}

// 供 entry 使用的退出清理
export function disposeDefense() {
  document.getElementById('defense-hud').classList.remove('active');
  document.getElementById('hero-select').classList.remove('active');
  document.getElementById('defense-end').classList.remove('active');
  document.getElementById('defense-banner').classList.remove('active');
}

// 重开一局（保留已选英雄，回到选择界面）
export function restartDefense() {
  document.getElementById('defense-end').classList.remove('active');
  document.getElementById('hero-select').classList.add('active');
  initDefense();
}
