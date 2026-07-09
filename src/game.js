import { WDEF, PASSIVES, WEATHER_TYPES, getWeatherDuration } from './config.js';
import { W, H, camera, dist, rng, irng, clamp, lerp, randAngle, sx, sy, onScreen, addToPool, compactPool, compactTrail, countActive,
  enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, garlicAuraAlpha, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects,
  addParticle, addDmgNumber
} from './utils.js';
import { keys, joystick } from './input.js';
import { playerRef, gameRefs, enemyGrid, setPlayer, setGameRefs, spawnEnemy, spawnWave, spawnBoss, handleEnemyDeath, dealDmg, applyElement, calcDamage, getElementalDamageMult, getElementalCdMult } from './entities.js';
import { ws, fireWeapon, updateGarlicAura, updateBlizzardZones } from './weapons.js';
import { sfxReaction, sfxPickup, sfxLevelUp, sfxPlayerHit, sfxGameOver } from './audio.js';

export const player = {
  x: 0, y: 0, hp: 100, maxHp: 100, speed: 220, level: 1, xp: 0, xpToNext: 8,
  facingAngle: 0, angle: 0, dmgMult: 1, cdMult: 1, magnetRange: 100,
  weapons: [], iframes: 0, alive: true
};

export const gameState = { value: 'title' };
export const gameTime = { value: 0 };
export const kills = { value: 0 };
export const screenShake = { value: 0 };
export let shakeX = 0, shakeY = 0;

export const currentWeather = { value: WEATHER_TYPES.clear };
export let weatherTimer = 0;
export let weatherDuration = getWeatherDuration();
export let weatherAnnounceTimer = 0;
export let lastTime = 0;
export const bossTimer = { value: 0 };
export let firstBossSpawned = false;
export let spawnTimer = 0;
export let canvas = null;
export let ctx = null;

export function setCanvas(c, x) { canvas = c; ctx = x; }

export function getGameState() { return gameState.value; }

export function setPostUpgrade() { gameState.value = 'playing'; lastTime = 0; }

export function initGameRefs() {
  setPlayer(player);
  setGameRefs({
    gameState, gameTime, kills, screenShake, enemies, projectiles, xpGems, particles, dmgNumbers,
    lightningEffects, garlicAuraAlpha, fireExplosions, coneEffects, reactionEffects, blizzardZones,
    frostNovaEffects, currentWeather, player
  });
}

export function updateWeather(dt) {
  weatherTimer += dt;
  if (weatherAnnounceTimer > 0) weatherAnnounceTimer -= dt;
  if (weatherTimer >= weatherDuration) {
    const ids = Object.keys(WEATHER_TYPES);
    const next = ids[Math.floor(Math.random() * ids.length)];
    currentWeather.value = WEATHER_TYPES[next];
    weatherTimer = 0;
    weatherDuration = getWeatherDuration();
    weatherAnnounceTimer = 4;
  }
  if (currentWeather.value.id === 'rain') {
    for (let e of enemies) { if (e._dead || !e.active) continue; if (Math.random() < dt * 0.08) e.status = 'water'; }
  }
}

export function getUpgradeOptions() {
  let o = [];
  for (let w of player.weapons) { if (w.level < 8) o.push({ type: 'weapon', weaponId: w.id }); }
  const oids = new Set(player.weapons.map(w => w.id));
  for (let [id] of Object.entries(WDEF)) { if (!oids.has(id) && player.weapons.length < 7) o.push({ type: 'new_weapon', weaponId: id }); }
  for (let p of PASSIVES) o.push({ type: 'passive', passiveId: p.id });
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  const wo = o.filter(x => x.type === 'weapon' || x.type === 'new_weapon');
  const po = o.filter(x => x.type === 'passive');
  let r = [];
  r.push(...wo.slice(0, 3));
  while (r.length < 4) { const x = po[Math.floor(Math.random() * po.length)]; if (!r.includes(x)) r.push(x); else r.push(po[Math.floor(Math.random() * po.length)]); }
  const seen = new Set(), final = [];
  for (let x of r) { const k = x.type + '_' + (x.weaponId || x.passiveId); if (!seen.has(k)) { seen.add(k); final.push(x); } }
  while (final.length < 4 && po.length > 0) { final.push(po[Math.floor(Math.random() * po.length)]); if (final.length > 4) break; }
  return final.slice(0, 4);
}

export function showUpgradePanel() {
  gameState.value = 'levelup';
  const options = getUpgradeOptions();
  const c = document.getElementById('upgrade-cards');
  c.innerHTML = '';
  document.getElementById('upgrade-overlay').classList.add('active');
  for (let o of options) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    let icon, name, desc, ls;
    if (o.type === 'weapon') {
      const w = player.weapons.find(w => w.id === o.weaponId);
      const d = WDEF[o.weaponId];
      icon = d.icon; name = d.name; ls = `Lv.${w.level} → Lv.${w.level + 1}`; desc = d.descs[w.level];
    } else if (o.type === 'new_weapon') {
      const d = WDEF[o.weaponId];
      icon = d.icon; name = d.name; ls = '<span class="card-new">NEW</span>'; desc = d.descs[0];
    } else {
      const p = PASSIVES.find(p => p.id === o.passiveId);
      icon = p.icon; name = p.name; ls = '被动'; desc = p.desc;
    }
    card.innerHTML = `<div class="card-icon">${icon}</div><div class="card-name">${name}</div><div class="card-level">${ls}</div><div class="card-desc">${desc}</div>`;
    card.addEventListener('click', () => applyUpgrade(o));
    c.appendChild(card);
  }
}

export function applyUpgrade(o) {
  if (o.type === 'weapon') {
    const w = player.weapons.find(w => w.id === o.weaponId);
    w.level++; w._timer = 0;
  } else if (o.type === 'new_weapon') {
    player.weapons.push({ id: o.weaponId, level: 1, _timer: 0 });
  } else {
    const p = PASSIVES.find(p => p.id === o.passiveId);
    p.a(player);
  }
  document.getElementById('upgrade-overlay').classList.remove('active');
  gameState.value = 'postupgrade';
  lastTime = 0;
  updateWeaponsBar();
}

export function updateHUD() {
  const m = Math.floor(gameTime.value / 60), s = Math.floor(gameTime.value % 60);
  document.getElementById('hud-time').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  document.getElementById('hud-kills').textContent = kills.value;
  document.getElementById('hud-level').textContent = player.level;
  document.getElementById('hud-hp').textContent = Math.max(0, Math.round(player.hp));
  document.getElementById('xp-bar-fill').style.width = Math.min(100, (player.xp / player.xpToNext) * 100) + '%';
  const hw = document.getElementById('hud-weather');
  if (hw) {
    hw.textContent = `${currentWeather.value.icon} ${currentWeather.value.name}`;
    hw.title = `${currentWeather.value.name}：${currentWeather.value.desc}`;
    if (weatherAnnounceTimer > 0) { hw.style.borderColor = '#ffcc44'; hw.style.boxShadow = '0 0 10px rgba(255,200,50,0.5)'; }
    else { hw.style.borderColor = 'rgba(255,255,255,0.1)'; hw.style.boxShadow = 'none'; }
  }
}

export function updateWeaponsBar() {
  const b = document.getElementById('weapons-bar');
  b.innerHTML = '';
  for (let w of player.weapons) {
    const d = WDEF[w.id];
    const el = document.createElement('div');
    el.className = 'weapon-icon';
    el.innerHTML = `${d.icon}<span class="lv">${w.level}</span>`;
    el.title = `${d.name} Lv.${w.level}`;
    b.appendChild(el);
  }
}

export function showGameOver() {
  gameState.value = 'gameover';
  document.getElementById('go-time').textContent = document.getElementById('hud-time').textContent;
  document.getElementById('go-kills').textContent = kills.value;
  document.getElementById('go-level').textContent = player.level;
  document.getElementById('game-over').classList.add('active');
  sfxGameOver();
}

export function restartGame() {
  Object.assign(player, { x: 0, y: 0, hp: 100, maxHp: 100, speed: 220, level: 1, xp: 0, xpToNext: 8, facingAngle: 0, angle: 0, dmgMult: 1, cdMult: 1, magnetRange: 100, iframes: 0, alive: true });
  player.weapons = [{ id: 'magic_missile', level: 1, _timer: 0 }];
  gameTime.value = 0; kills.value = 0; screenShake.value = 0; bossTimer.value = 0; firstBossSpawned = false; spawnTimer = 0; weatherTimer = 0; weatherDuration = getWeatherDuration(); weatherAnnounceTimer = 0;
  for (let a of [enemies, projectiles, xpGems, particles, dmgNumbers, lightningEffects, garlicAuraAlpha, fireExplosions, coneEffects, reactionEffects, blizzardZones, frostNovaEffects]) {
    for (let i = 0; i < a.length; i++) a[i].active = false;
  }
  camera.x = 0; camera.y = 0;
  currentWeather.value = WEATHER_TYPES.clear;
  document.getElementById('game-over').classList.remove('active');
  document.getElementById('upgrade-overlay').classList.remove('active');
  document.getElementById('title-screen').style.display = 'none';
  updateWeaponsBar(); updateHUD();
  gameState.value = 'playing'; lastTime = 0; canvas.focus();
}

export function startGame() {
  initGameRefs();
  Object.assign(player, { x: 0, y: 0, hp: 100, maxHp: 100, speed: 220, level: 1, xp: 0, xpToNext: 8, facingAngle: 0, angle: 0, dmgMult: 1, cdMult: 1, magnetRange: 100, iframes: 0, alive: true });
  player.weapons = [{ id: 'magic_missile', level: 1, _timer: 0 }];
  currentWeather.value = WEATHER_TYPES.clear;
  weatherTimer = 0; weatherDuration = getWeatherDuration(); weatherAnnounceTimer = 0;
  updateWeaponsBar(); updateHUD();
  gameState.value = 'playing'; canvas.focus(); lastTime = 0;
}

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

export function update(dt) {
  if (gameState.value === 'levelup' || gameState.value === 'gameover' || gameState.value === 'title') return;
  if (gameState.value === 'postupgrade') {
    const hm = keys['w'] || keys['arrowup'] || keys['s'] || keys['arrowdown'] || keys['a'] || keys['arrowleft'] || keys['d'] || keys['arrowright'] || joystick.active;
    if (!hm) { lastTime = 0; return; }
    gameState.value = 'playing';
  }
  dt = Math.min(dt, 0.1);
  gameTime.value += dt;
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
    player.x += mx * player.speed * dt;
    player.y += my * player.speed * dt;
  }
  player.angle = player.facingAngle;
  if (player.iframes > 0) player.iframes -= dt;
  camera.x = lerp(camera.x, player.x - W.value / 2, 8 * dt);
  camera.y = lerp(camera.y, player.y - H.value / 2, 8 * dt);
  if (screenShake.value > 0) {
    shakeX = (Math.random() - 0.5) * screenShake.value;
    shakeY = (Math.random() - 0.5) * screenShake.value;
    screenShake.value = Math.max(0, screenShake.value - dt * 25);
  } else { shakeX = 0; shakeY = 0; }
  updateWeather(dt);
  spawnTimer += dt;
  const si = Math.max(0.3, 3.0 - gameTime.value / 180);
  if (spawnTimer >= si && countActive(enemies) < 250) { spawnTimer = 0; spawnWave(); }
  bossTimer.value += dt;
  const bi = firstBossSpawned ? 60 : 120;
  if (bossTimer.value >= bi) { bossTimer.value = 0; firstBossSpawned = true; spawnBoss(); }
  enemyGrid.clear();
  for (let e of enemies) { if (e._dead || !e.active) continue; enemyGrid.insert(e); }
  for (let e of enemies) {
    if (e._dead || !e.active) continue;
    let dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 0.001;
    let bs = d < 180 ? 100 : e.spd;
    let spd = bs * (1 + gameTime.value / 400);
    if (e.freezeTimer > 0) { spd = 0; e.freezeTimer -= dt; }
    else if (e.slowTimer > 0) { spd *= (1 - e.slowAmount); e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowAmount = 0; }
    if (currentWeather.value.id === 'snowstorm') spd *= 0.9;
    if (e.statusTimer > 0) { e.statusTimer -= dt; if (e.statusTimer <= 0) e.status = null; }
    if (e.defenseDown > 0) e.defenseDown -= dt;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.burnTimer > 0) { e.hp -= e.burnDmg * dt; e.burnTimer -= dt; e.hitFlash = 0.04; if (e.hp <= 0) handleEnemyDeath(e); }
    e.x += (dx / d) * spd * dt + e.knockback.vx * dt;
    e.y += (dy / d) * spd * dt + e.knockback.vy * dt;
    e.knockback.vx *= Math.exp(-8 * dt);
    e.knockback.vy *= Math.exp(-8 * dt);
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.burnTimer > 0 && Math.random() < dt * 8) addParticle(e.x, e.y, '#ff6622', 1, 60, 0.4, 5);
    if (player.iframes <= 0 && dist(player, e) < 12 + e.size) {
      player.hp -= e.dmg; player.iframes = 0.4; screenShake.value = Math.max(screenShake.value, 5);
      sfxPlayerHit(); addParticle(player.x, player.y, '#ff4444', 6, 60, 0.3, 3);
      const pa = Math.atan2(player.y - e.y, player.x - e.x);
      player.x += Math.cos(pa) * 40; player.y += Math.sin(pa) * 40;
      if (player.hp <= 0) { player.alive = false; showGameOver(); return; }
    }
  }
  for (let p of projectiles) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p._remove = true; continue; }
    if (p.type === 'missile') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.2 }); }
    else if (p.type === 'knife') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.12 }); }
    else if (p.type === 'fire') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.3 }); }
    else if (p.type === 'ice') { seekTarget(p, dt); p.trail.push({ x: p.x, y: p.y, life: 0.2 }); }
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
    } else if (p.type === 'axe') {
      p.phase += p.orbitS * dt;
      p.x = player.x + Math.cos(p.phase) * p.orbitR;
      p.y = player.y + Math.sin(p.phase) * p.orbitR;
      p.angle += p.spinSpeed * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.2 });
    }
    for (let t of p.trail) t.life -= dt;
    compactTrail(p.trail);
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
            if (d2 < p.aoe + e2.size) { dealDmg(e2, p.dmg, null, '#ff6622'); e2.burnDmg = Math.max(e2.burnDmg, p.burn); e2.burnTimer = Math.max(e2.burnTimer, p.burnT); }
          }
          addToPool(fireExplosions, 100, { x: p.x, y: p.y, life: 0.5, maxLife: 0.5, radius: p.aoe }, 'life');
          addParticle(p.x, p.y, '#ff6622', 15, 120, 0.5, 6); addParticle(p.x, p.y, '#ffaa00', 10, 80, 0.4, 4);
          screenShake.value = Math.max(screenShake.value, 3); p._remove = true; break;
        }
      } else if (p.type === 'axe') {
        const d = dist(p, e);
        if (d < p.aoe + e.size) { dealDmg(e, p.dmg, p); addParticle(e.x, e.y, '#ff8844', 3, 40, 0.2, 2); }
      } else {
        const d = dist(p, e);
        if (d < p.size + e.size) {
          if (p.type === 'missile') {
            const hitBefore = p.hit.includes(e); dealDmg(e, p.dmg, p);
            if (!hitBefore) {
              p.hit.push(e);
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
            }
          } else { dealDmg(e, p.dmg, p); if (p._remove) break; }
        }
      }
    }
  }
  compactPool(projectiles, p => p._remove || p.life <= 0);
  for (let l of lightningEffects) {
    if (!l.active) continue; l.life -= dt;
    if (l.life < l.maxLife * 0.7 && !l._applied) {
      l._applied = true;
      const near = enemyGrid.query(l.x, l.y, l.aoe + 60);
      for (let e of near) { if (e._dead || !e.active) continue; dealDmg(e, l.dmg, null, '#ffff44', l.element); }
    }
  }
  compactPool(lightningEffects, l => l.life <= 0);
  for (let fe of fireExplosions) { if (fe.active) fe.life -= dt; } compactPool(fireExplosions, fe => fe.life <= 0);
  for (let ce of coneEffects) { if (ce.active) ce.life -= dt; } compactPool(coneEffects, ce => ce.life <= 0);
  for (let r of reactionEffects) { if (r.active) r.life -= dt; } compactPool(reactionEffects, r => r.life <= 0);
  updateGarlicAura(dt);
  for (let a of garlicAuraAlpha) { if (a.active) a.life -= dt; } compactPool(garlicAuraAlpha, a => a.life <= 0);
  updateBlizzardZones(dt); compactPool(blizzardZones, b => b.life <= 0);
  for (let f of frostNovaEffects) { if (!f.active) continue; f.life -= dt; f.radius = lerp(0, f.maxRadius, 1 - f.life / f.maxLife); } compactPool(frostNovaEffects, f => f.life <= 0);
  for (let gem of xpGems) {
    if (!gem.active) continue; gem.life -= dt;
    const d = dist(player, gem);
    if (d < player.magnetRange) { const spd = 400 + (player.magnetRange - d) * 2, a = Math.atan2(player.y - gem.y, player.x - gem.x); gem.x += Math.cos(a) * spd * dt; gem.y += Math.sin(a) * spd * dt; }
    if (d < 18) { gem._picked = true; player.xp += gem.value; sfxPickup(); addParticle(gem.x, gem.y, '#44ff88', 3, 40, 0.2, 2); }
  }
  compactPool(xpGems, g => g._picked || g.life <= 0);
  if (player.xp >= player.xpToNext) { player.xp -= player.xpToNext; player.level++; player.xpToNext = 5 + player.level * 3; player.hp = Math.min(player.maxHp, player.hp + 15); sfxLevelUp(); addParticle(player.x, player.y, '#ffcc44', 20, 120, 0.6, 5); showUpgradePanel(); }
  for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.active) continue; if (e._dead || !onScreen(e.x, e.y, 400)) { e.active = false; continue; } }
  for (let p of particles) { if (!p.active) continue; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; } compactPool(particles, p => p.life <= 0);
  for (let dn of dmgNumbers) { if (!dn.active) continue; dn.life -= dt; dn.y += dn.vy * dt; dn.vy *= 0.98; } compactPool(dmgNumbers, dn => dn.life <= 0);
  for (let w of player.weapons) { if (w.id === 'garlic') continue; if (!w._timer) w._timer = 0; w._timer -= dt; if (w._timer <= 0) { const s2 = ws(w), d2 = WDEF[w.id]; w._timer = s2.cd * player.cdMult * getElementalCdMult(d2.element); fireWeapon(w); } }
  updateHUD();
}

export function drawGround() {
  ctx.fillStyle = '#111122'; ctx.fillRect(0, 0, W.value, H.value);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  const gs = 120, gsx = -((camera.x % gs) + gs) % gs, gsy = -((camera.y % gs) + gs) % gs;
  ctx.beginPath();
  for (let x = gsx; x < W.value; x += gs) { ctx.moveTo(x + shakeX, shakeY); ctx.lineTo(x + shakeX, H.value + shakeY); }
  for (let y = gsy; y < H.value; y += gs) { ctx.moveTo(shakeX, y + shakeY); ctx.lineTo(W.value + shakeX, y + shakeY); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let i = 0; i < 40; i++) {
    const bx = ((i * 317 + 127) % 2000) - 1000, by = ((i * 521 + 331) % 2000) - 1000;
    if (onScreen(bx, by, 100)) { ctx.beginPath(); ctx.arc(sx(bx) + shakeX, sy(by) + shakeY, 60 + (i % 40), 0, Math.PI * 2); ctx.fill(); }
  }
}

export function drawPlayer() {
  if (!player.alive) return;
  const px = sx(player.x) + shakeX, py = sy(player.y) + shakeY;
  const ia = player.iframes > 0 ? 0.4 + 0.6 * Math.abs(Math.sin(player.iframes * 20)) : 1;
  ctx.save(); ctx.globalAlpha = 0.25 * ia;
  const glow = ctx.createRadialGradient(px, py, 8, px, py, 35);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.5, '#5588ff'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(px, py, 35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = ia; ctx.fillStyle = '#4488ff'; ctx.strokeStyle = '#aaccff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px + Math.cos(player.angle) * 16, py + Math.sin(player.angle) * 16, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2266cc'; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const gw = player.weapons.find(w => w.id === 'garlic');
  if (gw) {
    const s2 = ws(gw), pulse = 1 + Math.sin(gameTime.value * 4) * 0.06, r2 = s2.r * pulse;
    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#aadd88'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, r2, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.04; ctx.fillStyle = '#aadd88'; ctx.beginPath(); ctx.arc(px, py, r2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    for (let a of garlicAuraAlpha) {
      if (!a.active) continue; ctx.save(); ctx.globalAlpha = (a.life / a.maxLife) * 0.25; ctx.fillStyle = '#ccffaa';
      ctx.beginPath(); ctx.arc(px, py, a.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

export function drawEnemies() {
  for (let e of enemies) {
    if (!e.active || !onScreen(e.x, e.y)) continue;
    const ex = sx(e.x) + shakeX, ey = sy(e.y) + shakeY, fc = e.hitFlash > 0 ? '#ffffff' : e.color;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(ex, ey + e.size * 0.7, e.size * 0.8, e.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fc; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); if (e.type === 'fast') { ctx.ellipse(ex, ey, e.size * 1.3, e.size * 0.7, 0, 0, Math.PI * 2); } else { ctx.arc(ex, ey, e.size, 0, Math.PI * 2); } ctx.fill(); ctx.stroke();
    if (e.freezeTimer > 0) { ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, e.size + 3, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.beginPath(); ctx.arc(ex, ey, e.size, 0, Math.PI * 2); ctx.fill(); }
    else if (e.slowTimer > 0) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#88bbff'; ctx.beginPath(); ctx.arc(ex, ey, e.size, 0, Math.PI * 2); ctx.fill(); }
    if (e.burnTimer > 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(ex, ey, e.size * 1.1, 0, Math.PI * 2); ctx.fill(); }
    if (e.type === 'boss') {
      ctx.fillStyle = '#ffcc44'; ctx.beginPath(); const cy2 = ey - e.size - 4;
      ctx.moveTo(ex - 14, cy2 + 10); ctx.lineTo(ex - 10, cy2 - 8); ctx.lineTo(ex - 4, cy2 + 2); ctx.lineTo(ex, cy2 - 12); ctx.lineTo(ex + 4, cy2 + 2); ctx.lineTo(ex + 10, cy2 - 8); ctx.lineTo(ex + 14, cy2 + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 8, ey - 4, 5, 0, Math.PI * 2); ctx.arc(ex + 8, ey - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex - 8, ey - 4, 2.5, 0, Math.PI * 2); ctx.arc(ex + 8, ey - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 4, ey - 3, 3, 0, Math.PI * 2); ctx.arc(ex + 4, ey - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex - 4, ey - 3, 1.5, 0, Math.PI * 2); ctx.arc(ex + 4, ey - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    if (e.type === 'boss' || e.type === 'tank') {
      const bw = e.size * 2, bh = 3, bx = ex - bw / 2, by = ey - e.size - (e.type === 'boss' ? 20 : 14);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      const hpPct = Math.max(0, e.hp / e.maxHp), hc = hpPct > 0.5 ? '#44dd44' : hpPct > 0.25 ? '#ddaa44' : '#dd4444';
      ctx.fillStyle = hc; ctx.fillRect(bx, by, bw * hpPct, bh);
    }
    if (e.status) { const ei = { fire: '🔥', ice: '❄️', lightning: '⚡', water: '💧', nature: '🌿', physical: '⚔️', arcane: '✨' }[e.status]; if (ei) { ctx.font = 'bold 12px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeText(ei, ex, ey - e.size - 10); ctx.fillText(ei, ex, ey - e.size - 10); } }
    ctx.restore();
  }
}

export function drawProjectiles() {
  for (let p of projectiles) {
    if (!p.active || !onScreen(p.x, p.y, 30)) continue;
    const ppx = sx(p.x) + shakeX, ppy = sy(p.y) + shakeY;
    if (p.trail && p.trail.length > 1) { ctx.save(); ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.6; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(ppx, ppy); for (let i = p.trail.length - 1; i >= 0; i--) { const t = p.trail[i]; ctx.lineTo(sx(t.x) + shakeX, sy(t.y) + shakeY); } ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.fillStyle = p.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.translate(ppx, ppy);
    if (p.type === 'axe') {
      ctx.rotate(p.angle || 0); ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.7, -p.size * 0.5); ctx.lineTo(p.size * 0.5, p.size * 0.8); ctx.lineTo(-p.size * 0.5, p.size * 0.8); ctx.lineTo(-p.size * 0.7, -p.size * 0.5); ctx.closePath(); ctx.fill();
    } else if (p.type === 'missile' || p.type === 'ice') {
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'fire') {
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      const fg = ctx.createRadialGradient(0, 0, p.size * 0.3, 0, 0, p.size); fg.addColorStop(0, '#ffff88'); fg.addColorStop(0.5, '#ff6622'); fg.addColorStop(1, 'rgba(255,50,0,0)'); ctx.fillStyle = fg; ctx.fill();
    } else if (p.type === 'lspear') {
      ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillStyle = '#ccffff'; ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 12; ctx.fillRect(-p.size * 3, -p.size * 0.4, p.size * 6, p.size * 0.8); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(p.size * 3, -p.size * 1.2); ctx.lineTo(p.size * 5, 0); ctx.lineTo(p.size * 3, p.size * 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 6; ctx.fillRect(-p.size * 2.5, -p.size * 0.15, p.size * 5.5, p.size * 0.3);
    } else { ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillStyle = '#ddd'; ctx.fillRect(-p.size * 1.5, -1.5, p.size * 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(-p.size * 1.5, -0.5, p.size * 3, 1); }
    ctx.restore();
  }
}

export function drawLightningEffects() {
  for (let l of lightningEffects) {
    if (!l.active) continue;
    const alpha = l.life / l.maxLife, lx = sx(l.x) + shakeX, ly = sy(l.y) + shakeY;
    ctx.save(); ctx.globalAlpha = alpha * 0.4; ctx.fillStyle = '#ffff88'; ctx.beginPath(); ctx.arc(lx, ly, l.aoe, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.6; ctx.strokeStyle = '#ffff44'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    if (l.segments && l.segments.length > 1) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffffcc'; ctx.lineWidth = 3; ctx.shadowColor = '#ffff88'; ctx.shadowBlur = 12; ctx.beginPath();
      const fpt = l.segments[0]; ctx.moveTo(sx(fpt.x) + shakeX, sy(fpt.y) + shakeY);
      for (let i = 1; i < l.segments.length; i++) { const pt = l.segments[i]; ctx.lineTo(sx(pt.x) + shakeX, sy(pt.y) + shakeY); }
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 6; ctx.globalAlpha = alpha * 0.8; ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = alpha * 0.5;
    const flash = ctx.createRadialGradient(lx, ly, 0, lx, ly, l.aoe); flash.addColorStop(0, '#ffffff'); flash.addColorStop(0.3, '#ffffaa'); flash.addColorStop(1, 'transparent');
    ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(lx, ly, l.aoe, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

export function drawFireExplosions() {
  for (let fe of fireExplosions) {
    if (!fe.active) continue; const alpha = fe.life / fe.maxLife, fx = sx(fe.x) + shakeX, fy = sy(fe.y) + shakeY;
    ctx.save(); ctx.globalAlpha = alpha * 0.35;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fe.radius); g.addColorStop(0, '#ffff88'); g.addColorStop(0.4, '#ff6622'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, fe.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

export function drawConeEffects() {
  for (let ce of coneEffects) {
    if (!ce.active) continue; const alpha = ce.life / ce.maxLife, cx = sx(ce.x) + shakeX, cy = sy(ce.y) + shakeY, ha = ce.coneA * Math.PI / 360;
    ctx.save(); ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = '#88ccff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, ce.coneR, ce.angle - ha, ce.angle + ha); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = alpha * 0.2; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, ce.coneR * 0.7, ce.angle - ha * 0.7, ce.angle + ha * 0.7); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

export function drawBlizzardZones() {
  for (let b of blizzardZones) {
    if (!b.active) continue; const alpha = b.life / b.duration, bx = sx(b.x) + shakeX, by = sy(b.y) + shakeY;
    ctx.save(); ctx.globalAlpha = alpha * 0.35;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.radius); g.addColorStop(0, 'rgba(200,240,255,0.6)'); g.addColorStop(0.7, 'rgba(120,200,255,0.2)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, b.radius * (0.9 + Math.sin(gameTime.value * 6) * 0.05), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.save();
    for (let f of b.flakes) {
      const fx = bx + f.x + Math.sin(gameTime.value * 3 + f.y * 0.05) * 8, fy = by + f.y + (gameTime.value * f.spd) % (b.radius * 2) - b.radius;
      if (Math.hypot(fx - bx, fy - by) > b.radius) continue; ctx.globalAlpha = alpha * 0.8; ctx.fillStyle = '#e0f8ff'; ctx.beginPath(); ctx.arc(fx, fy, f.size * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawFrostNovaEffects() {
  for (let f of frostNovaEffects) {
    if (!f.active) continue; const alpha = f.life / f.maxLife, fx = sx(f.x) + shakeX, fy = sy(f.y) + shakeY, r = f.radius;
    ctx.save(); ctx.globalAlpha = alpha * 0.7; ctx.strokeStyle = '#d0f0ff'; ctx.lineWidth = 4; ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = alpha * 0.15; ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(fx, fy, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.shadowBlur = 8;
    const spikes = 12; for (let i = 0; i < spikes; i++) { const a = i / spikes * Math.PI * 2 + gameTime.value * 2; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * r * 0.75, fy + Math.sin(a) * r * 0.75); ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r); ctx.stroke(); }
    ctx.restore();
  }
}

export function drawXPGems() {
  for (let gem of xpGems) {
    if (!gem.active || !onScreen(gem.x, gem.y, 20)) continue;
    const gx = sx(gem.x) + shakeX, gy = sy(gem.y) + shakeY + Math.sin(gameTime.value * 3 + gem.bobOff) * 3, pulse = 1 + Math.sin(gameTime.value * 5 + gem.bobOff) * 0.2;
    ctx.save();
    const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 8 * pulse); glow.addColorStop(0, 'rgba(100,255,140,0.7)'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gx, gy, 8 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#44ff88'; ctx.strokeStyle = '#aaffcc'; ctx.lineWidth = 1; ctx.beginPath(); const s2 = 4 * pulse; ctx.moveTo(gx, gy - s2); ctx.lineTo(gx + s2, gy); ctx.lineTo(gx, gy + s2); ctx.lineTo(gx - s2, gy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

export function drawParticles() {
  for (let p of particles) {
    if (!p.active) continue; const ppx = sx(p.x) + shakeX, ppy = sy(p.y) + shakeY, alpha = p.life / p.maxLife;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(ppx, ppy, p.size * alpha, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

export function drawReactionEffects() {
  for (let r of reactionEffects) {
    if (!r.active) continue; const alpha = r.life / r.maxLife, rx = sx(r.x) + shakeX, ry = sy(r.y) + shakeY;
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = 'bold 16px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffcc44'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(r.name, rx, ry - 20); ctx.fillText(r.name, rx, ry - 20); ctx.restore();
    if (r.particles === 'explosion') { ctx.save(); ctx.globalAlpha = alpha * 0.4; ctx.fillStyle = '#ff6622'; ctx.beginPath(); ctx.arc(rx, ry, 40 * (1 - alpha + 0.2), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else if (r.particles === 'steam') { ctx.save(); ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(rx + rng(-20, 20), ry + rng(-30, 30) - i * 10, 8 + alpha * 10, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    else if (r.particles === 'spark') { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffff44'; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, l = 20 + alpha * 30; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * l, ry + Math.sin(a) * l); ctx.stroke(); } ctx.restore(); }
    else if (r.particles === 'ice') { ctx.save(); ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = '#aaddff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(rx + rng(-25, 25), ry + rng(-25, 25), 3 + alpha * 5, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  }
}

export function drawDmgNumbers() {
  for (let dn of dmgNumbers) {
    if (!dn.active) continue; const dx = sx(dn.x) + shakeX, dy = sy(dn.y) + shakeY, alpha = Math.min(1, dn.life / 0.3);
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = `bold ${dn.size}px "Segoe UI",sans-serif`; ctx.fillStyle = dn.color; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.textAlign = 'center'; ctx.strokeText(dn.text, dx, dy); ctx.fillText(dn.text, dx, dy); ctx.restore();
  }
}

export function drawBossWarning() {
  if (!firstBossSpawned && bossTimer.value > 110 && bossTimer.value < 120) {
    const alpha = Math.abs(Math.sin(gameTime.value * 8)) * 0.6;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ff4444'; ctx.font = 'bold 28px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚠ BOSS 即将到来！⚠', W.value / 2, H.value / 2 - 60); ctx.restore();
  }
}

export function drawJoystick() {
  if (!joystick.active) return;
  const bx = joystick.baseX, by = joystick.baseY, tx = bx + joystick.moveX * 70, ty = by + joystick.moveY * 70;
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#222244'; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 70, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.15; ctx.strokeStyle = '#888'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * 70 * 0.85, by + Math.sin(a) * 70 * 0.85); ctx.stroke(); }
  ctx.globalAlpha = 0.6; const tg = ctx.createRadialGradient(tx, ty, 70 * 0.2, tx, ty, 70); tg.addColorStop(0, '#8899cc'); tg.addColorStop(1, '#334466'); ctx.fillStyle = tg; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 70, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.7; ctx.fillStyle = '#aabbee'; ctx.beginPath(); ctx.arc(tx, ty, 70 * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function render() {
  ctx.clearRect(0, 0, W.value, H.value);
  drawGround(); drawXPGems(); drawEnemies(); drawProjectiles(); drawLightningEffects(); drawFireExplosions(); drawConeEffects(); drawReactionEffects(); drawBlizzardZones(); drawFrostNovaEffects(); drawParticles(); drawPlayer(); drawDmgNumbers();
  if (gameState.value === 'playing' || gameState.value === 'postupgrade') drawBossWarning();
  if (joystick.active) drawJoystick();
}

export function gameLoop(ts) {
  const dt = lastTime ? (ts - lastTime) / 1000 : 0.016;
  lastTime = ts;
  if (gameState.value === 'playing' || gameState.value === 'postupgrade') update(dt);
  render();
  requestAnimationFrame(gameLoop);
}
