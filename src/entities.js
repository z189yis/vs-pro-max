import { WDEF, ELEMENTS, ELEMENT_STATUS_DURATION, ELEMENT_REACTIONS } from './config.js';
import { rng, irng, dist, randAngle, addToPool, addParticle, addDmgNumber, addLightningEffect, addReactionEffect, addXPGem, countActive, SpatialGrid, enemies } from './utils.js';
import { sfxReaction, sfxKill, sfxBossSpawn } from './audio.js';

export let playerRef = { value: null };
export let gameRefs = {};
export const enemyGrid = new SpatialGrid(120);

export function setPlayer(p) { playerRef.value = p; }
export function setGameRefs(r) { Object.assign(gameRefs, r); }

export const ET = {
  bat: { name: '蝙蝠', hp: 15, spd: 100, dmg: 8, size: 12, color: '#cc4444', xp: 1 },
  fast: { name: '疾行', hp: 10, spd: 220, dmg: 6, size: 10, color: '#ddaa44', xp: 1 },
  tank: { name: '巨兽', hp: 60, spd: 55, dmg: 15, size: 20, color: '#448844', xp: 2 },
  boss: { name: 'BOSS', hp: 300, spd: 40, dmg: 25, size: 38, color: '#aa44ff', xp: 8 }
};

export function spawnEnemy(type = 'bat', ad = null) {
  const player = playerRef.value;
  const gameState = gameRefs.gameState;
  const currentWeather = gameRefs.currentWeather;
  const enemies = gameRefs.enemies;
  const gameTime = gameRefs.gameTime;
  const dr = ad || rng(600, 850);
  const a = randAngle();
  const x = player.x + Math.cos(a) * dr;
  const y = player.y + Math.sin(a) * dr;
  const td = ET[type];
  const t = gameTime.value;
  let hs = 1 + t / 200;
  if (t > 180) hs += Math.pow((t - 180) / 80, 1.8);
  if (t > 300) hs += Math.pow((t - 300) / 100, 2);
  let roll = Math.random();
  let ele = 'physical';
  if (currentWeather.value.id === 'rain') {
    if (roll < 0.55) ele = 'water';
    else if (roll < 0.75) ele = 'ice';
    else if (roll < 0.85) ele = 'lightning';
  } else if (currentWeather.value.id === 'drought') {
    if (roll < 0.5) ele = 'fire';
    else if (roll < 0.7) ele = 'physical';
  } else if (currentWeather.value.id === 'snowstorm') {
    if (roll < 0.5) ele = 'ice';
    else if (roll < 0.7) ele = 'water';
  } else if (currentWeather.value.id === 'thunder') {
    if (roll < 0.45) ele = 'lightning';
    else if (roll < 0.65) ele = 'water';
  } else {
    if (roll < 0.5) ele = 'physical';
    else if (roll < 0.7) ele = 'fire';
    else if (roll < 0.82) ele = 'ice';
    else if (roll < 0.92) ele = 'lightning';
    else ele = 'water';
  }
  let resist = ele;
  let weak = ele === 'fire' ? 'ice' : ele === 'ice' ? 'fire' : ele === 'water' ? 'lightning' : ele === 'lightning' ? 'fire' : 'nature';
  if (Math.random() < 0.25) { const elems = ['fire', 'ice', 'lightning', 'water']; weak = elems[Math.floor(Math.random() * elems.length)]; }
  addToPool(enemies, 250, {
    x, y, type, hp: td.hp * hs, maxHp: td.hp * hs,
    spd: td.spd * (1 + t / 600), dmg: td.dmg, size: td.size, color: td.color, xpVal: td.xp,
    hitFlash: 0, knockback: { vx: 0, vy: 0 }, slowAmount: 0, slowTimer: 0, burnDmg: 0, burnTimer: 0, freezeTimer: 0,
    element: ele, resist, weakness: weak, status: null, statusTimer: 0, defenseDown: 0, stun: 0, _spawnTime: t
  }, '_spawnTime');
}

export function spawnWave() {
  const gameTime = gameRefs.gameTime.value;
  const count = 2 + Math.floor(gameTime / 15);
  for (let i = 0; i < count; i++) {
    let type = 'bat';
    const r = Math.random();
    if (gameTime > 40 && r < 0.3) type = 'fast';
    if (gameTime > 80 && r < 0.15) type = 'tank';
    if (gameTime > 100 && r < 0.08) type = 'tank';
    spawnEnemy(type);
  }
}

export function spawnBoss() {
  const player = playerRef.value;
  spawnEnemy('boss', rng(700, 900));
  if (gameRefs.screenShake) gameRefs.screenShake.value = 12;
  sfxBossSpawn();
  addParticle(player.x, player.y, '#aa44ff', 30, 200, 0.8, 6);
}

export function handleEnemyDeath(e) {
  if (e.hp > 0) return;
  e._dead = true;
  gameRefs.kills.value++;
  sfxKill();
  addParticle(e.x, e.y, e.color, 8, 100, 0.4, 4);
  const gc = e.type === 'boss' ? 8 : (e.type === 'tank' ? 3 : 1);
  for (let i = 0; i < gc; i++) {
    const gv = e.type === 'boss' ? 3 : 1;
    addToPool(gameRefs.xpGems, 300, { x: e.x + rng(-15, 15), y: e.y + rng(-15, 15), value: gv, life: 30, bobOff: Math.random() * Math.PI * 2 }, 'life');
  }
}

export function dealDmg(e, dmg, proj, color, element) {
  const el = element || (proj?.element) || null;
  const fd = calcDamage(e, dmg, el);
  e.hp -= fd;
  e.hitFlash = 0.08;
  addDmgNumber(e.x + rng(-8, 8), e.y + rng(-8, 8), fd, color || proj?.color || '#ffffff');
  if (el) applyElement(e, el, fd, proj);
  if (proj && proj.pierce !== undefined && proj.pierce !== Infinity) { proj.pierce--; if (proj.pierce < 0) proj._remove = true; }
  if (e.hp <= 0) handleEnemyDeath(e);
}

export function applyElement(e, element, dmg, sourceProj) {
  if (!element || e._dead || !e.active) return;
  const player = playerRef.value;
  if (e.status && e.status !== element) {
    const key = e.status + '+' + element;
    const rx = ELEMENT_REACTIONS[key];
    if (rx) {
      const rd = dmg * rx.mult;
      e.hp -= rd;
      addDmgNumber(e.x + rng(-8, 8), e.y + rng(-8, 8), rd, ELEMENTS[element]?.color || '#fff');
      addToPool(gameRefs.reactionEffects, 50, { x: e.x, y: e.y, life: 0.6, maxLife: 0.6, name: rx.name, particles: rx.particles }, 'life');
      sfxReaction(rx.particles);
      if (gameRefs.screenShake) gameRefs.screenShake.value = Math.max(gameRefs.screenShake.value, 2);
      if (rx.knockback) {
        const ka = Math.atan2(e.y - (sourceProj ? sourceProj.y : player.y), e.x - (sourceProj ? sourceProj.x : player.x));
        e.knockback.vx += Math.cos(ka) * rx.knockback;
        e.knockback.vy += Math.sin(ka) * rx.knockback;
      }
      if (rx.stun) e.stun = Math.max(e.stun, rx.stun);
      if (rx.freeze) e.freezeTimer = Math.max(e.freezeTimer, rx.freeze);
      if (rx.slow) { e.slowAmount = Math.max(e.slowAmount, rx.slow); e.slowTimer = Math.max(e.slowTimer, rx.slowT || 2); }
      if (rx.burn) { e.burnDmg = Math.max(e.burnDmg, rx.burn); e.burnTimer = Math.max(e.burnTimer, rx.burnT); }
      if (rx.poison) { e.burnDmg = Math.max(e.burnDmg || 0, rx.poison); e.burnTimer = Math.max(e.burnTimer || 0, rx.poisonT); }
      if (rx.armorBreak) e.defenseDown = Math.max(e.defenseDown, rx.armorBreak);
      if (rx.blind) e.stun = Math.max(e.stun, rx.blind * 0.5);
      if (rx.heal && player) player.hp = Math.min(player.maxHp, player.hp + rd * rx.heal);
      if (rx.aoe) {
        const near = enemyGrid.query(e.x, e.y, rx.aoe + 80);
        for (let e2 of near) {
          if (e2._dead || e2 === e || !e2.active) continue;
          if (dist(e, e2) < rx.aoe + e2.size) { dealDmg(e2, rd * 0.6, null, ELEMENTS[element]?.color, element); }
        }
      }
      if (rx.chain) {
        const near = enemyGrid.query(e.x, e.y, rx.chain);
        for (let e2 of near) {
          if (e2._dead || e2 === e || !e2.active) continue;
          if (dist(e, e2) < rx.chain) {
            dealDmg(e2, rd, null, '#ffff44', 'lightning');
            e2.stun = Math.max(e2.stun, 0.5);
            addToPool(gameRefs.lightningEffects, 100, { x: e2.x, y: e2.y, life: 0.25, maxLife: 0.25, aoe: 30, dmg: 0, segments: [{ x: e.x, y: e.y }, { x: e2.x, y: e2.y }] }, 'life');
          }
        }
      }
      if (rx.spread) {
        const near = enemyGrid.query(e.x, e.y, rx.spread).filter(en => !en._dead && en.active && en !== e);
        for (let e2 of near) { e2.status = 'lightning'; e2.statusTimer = ELEMENT_STATUS_DURATION.lightning; }
      }
      e.status = null;
      e.statusTimer = 0;
      if (e.hp <= 0) { handleEnemyDeath(e); return; }
      return;
    }
  }
  if (element === 'physical' || element === 'arcane' || element === 'nature') {
    e.status = element;
    e.statusTimer = ELEMENT_STATUS_DURATION[element] || 1.5;
    return;
  }
  e.status = element;
  e.statusTimer = ELEMENT_STATUS_DURATION[element] || 2;
}

export function calcDamage(e, dmg, element) {
  let d = dmg;
  if (element && e.defenseDown > 0) d *= 1.3;
  const em = getElementalDamageMult(element);
  if (element === e.resist) d *= em * 0.7;
  else if (element === e.weakness) d *= em * 1.3;
  else d *= em;
  return d;
}

export function getElementalDamageMult(element) {
  const currentWeather = gameRefs.currentWeather.value;
  if (!element || element === 'physical' || element === 'arcane' || element === 'nature') return 1;
  const w = currentWeather.id;
  if (element === 'fire') return w === 'drought' ? 1.25 : (w === 'rain' ? 0.85 : 1);
  if (element === 'ice') return w === 'snowstorm' ? 1.2 : 1;
  if (element === 'lightning') return w === 'rain' ? 1.2 : (w === 'thunder' ? 1.15 : 1);
  if (element === 'water') return w === 'drought' ? 0.8 : (w === 'rain' ? 1.1 : 1);
  return 1;
}

export function getElementalCdMult(element) {
  const currentWeather = gameRefs.currentWeather.value;
  if (element === 'lightning' && currentWeather.id === 'thunder') return 0.8;
  return 1;
}
