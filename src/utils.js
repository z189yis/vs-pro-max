export const W = { value: window.innerWidth };
export const H = { value: window.innerHeight };
export const camera = { x: 0, y: 0 };

export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
export function rng(a, b) { return Math.random() * (b - a) + a; }
export function irng(a, b) { return Math.floor(rng(a, b + 1)); }
export function clamp(v, l, h) { return Math.max(l, Math.min(h, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function randAngle() { return Math.random() * Math.PI * 2; }
export function sx(wx) { return wx - camera.x; }
export function sy(wy) { return wy - camera.y; }
export function onScreen(wx, wy, m = 60) {
  const x = sx(wx), y = sy(wy);
  return x > -m && x < W.value + m && y > -m && y < H.value + m;
}

export class SpatialGrid {
  constructor(cellSize = 120) { this.cellSize = cellSize; this.map = new Map(); }
  clear() { this.map.clear(); }
  insert(e) {
    const cx = Math.floor(e.x / this.cellSize);
    const cy = Math.floor(e.y / this.cellSize);
    const k = cx + ',' + cy;
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(e);
  }
  query(x, y, radius) {
    const r = [], cs = this.cellSize;
    const minCX = Math.floor((x - radius) / cs), maxCX = Math.floor((x + radius) / cs);
    const minCY = Math.floor((y - radius) / cs), maxCY = Math.floor((y + radius) / cs);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const arr = this.map.get(cx + ',' + cy);
        if (!arr) continue;
        for (let e of arr) {
          if (e._dead || !e.active) continue;
          const d = Math.hypot(e.x - x, e.y - y);
          if (d <= radius + e.size) r.push(e);
        }
      }
    }
    return r;
  }
  queryNearest(x, y, maxRadius) {
    let nearest = null, nd = maxRadius * maxRadius, cs = this.cellSize;
    const minCX = Math.floor((x - maxRadius) / cs), maxCX = Math.floor((x + maxRadius) / cs);
    const minCY = Math.floor((y - maxRadius) / cs), maxCY = Math.floor((y + maxRadius) / cs);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const arr = this.map.get(cx + ',' + cy);
        if (!arr) continue;
        for (let e of arr) {
          if (e._dead || !e.active) continue;
          const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
          if (d2 < nd) { nd = d2; nearest = e; }
        }
      }
    }
    return nearest;
  }
}

export function resetObj(o) { for (let k in o) delete o[k]; }

export function addToPool(arr, cap, obj, lifeProp = 'life') {
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i].active) {
      const it = arr[i];
      resetObj(it);
      Object.assign(it, obj);
      it.active = true;
      it._remove = false;
      it._dead = false;
      return it;
    }
  }
  if (arr.length < cap) {
    const it = { ...obj, active: true, _remove: false, _dead: false };
    arr.push(it);
    return it;
  }
  let evictIdx = 0, minLife = arr[0][lifeProp] !== undefined ? arr[0][lifeProp] : Infinity;
  for (let i = 1; i < arr.length; i++) {
    const life = arr[i][lifeProp] !== undefined ? arr[i][lifeProp] : Infinity;
    if (life < minLife) { minLife = life; evictIdx = i; }
  }
  const it = arr[evictIdx];
  resetObj(it);
  Object.assign(it, obj);
  it.active = true;
  it._remove = false;
  it._dead = false;
  return it;
}

export function compactPool(arr, inactiveFn) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    if (inactiveFn(it)) { it.active = false; continue; }
    if (!it.active) it.active = true;
    if (w !== i) arr[w] = it;
    w++;
  }
  arr.length = w;
}

export function compactTrail(t) {
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i].life > 0) { if (w !== i) t[w] = t[i]; w++; }
  }
  t.length = w;
}

export function countActive(arr) { let c = 0; for (let i = 0; i < arr.length; i++) if (arr[i].active) c++; return c; }

export const enemies = [];
export const projectiles = [];
export const xpGems = [];
export const particles = [];
export const dmgNumbers = [];
export const lightningEffects = [];
export const garlicAuraAlpha = [];
export const fireExplosions = [];
export const coneEffects = [];
export const reactionEffects = [];
export const blizzardZones = [];
export const frostNovaEffects = [];
export const disintegrateBeams = [];

export const tidalWaves = [];
export function addTidalWave(obj) { return addToPool(tidalWaves, 30, obj, 'life'); }

export function addProjectile(obj) { return addToPool(projectiles, 400, obj, 'life'); }
export function addLightningEffect(obj) { return addToPool(lightningEffects, 100, obj, 'life'); }
export function addXPGem(obj) { return addToPool(xpGems, 300, obj, 'life'); }
export function addFireExplosion(obj) { return addToPool(fireExplosions, 100, obj, 'life'); }
export function addConeEffect(obj) { return addToPool(coneEffects, 100, obj, 'life'); }
export function addReactionEffect(obj) { return addToPool(reactionEffects, 50, obj, 'life'); }
export function addBlizzardZone(obj) { return addToPool(blizzardZones, 50, obj, 'life'); }
export function addFrostNovaEffect(obj) { return addToPool(frostNovaEffects, 30, obj, 'life'); }
export function addGarlicAura(obj) { return addToPool(garlicAuraAlpha, 20, obj, 'life'); }
export function addDisintegrateBeam(obj) { return addToPool(disintegrateBeams, 30, obj, 'life'); }
export function addEnemy(obj) { return addToPool(enemies, 250, obj, '_spawnTime'); }

export function addParticle(x, y, color, count = 5, speed = 80, life = 0.5, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = randAngle(), s = rng(speed * .5, speed);
    addToPool(particles, 600, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life, maxLife: life, size: rng(size * .5, size) }, 'life');
  }
}

export function addDmgNumber(x, y, dmg, color = '#ffffff') {
  addToPool(dmgNumbers, 100, { x, y, text: Math.round(dmg).toString(), color, life: 0.8, vy: -60, size: 14 + Math.min(dmg, 50) * 0.3 }, 'life');
}

