// ===== 水晶防守模式 · 波次调度器 =====
// fight 30s 刷怪 → break 15s 发育窗口，交替进行；第 5/10/15/20 波为 Boss 波
// 总 20 波；第 20 波最终 Boss 死亡 = 通关

export const TOTAL_WAVES = 20;
export const FIGHT_DURATION = 30;
export const BREAK_DURATION = 15;
const BOSS_WAVES = new Set([5, 10, 15, 20]);

export const waveState = {
  number: 0,          // 当前波数（0 = 未开始）
  phase: 'break',     // break | fight
  fightTimer: 0, breakTimer: 0,
  bossAlive: false,
  spawnTimer: 0,
  bossSpawned: false,
  bossKilled: false
};

export function resetWaves() {
  Object.assign(waveState, {
    number: 0, phase: 'break', fightTimer: 0, breakTimer: 0,
    bossAlive: false, spawnTimer: 0, bossSpawned: false, bossKilled: false
  });
}

export function isBossWave(n) { return BOSS_WAVES.has(n); }
export function isFinalWave() { return waveState.number === TOTAL_WAVES; }

// 刷怪间隔（秒）：随波数缩短
export function spawnInterval() {
  return Math.max(1.0, 2.4 - waveState.number * 0.06);
}

// 每波小怪总数
export function waveEnemyCount() {
  return 3 + waveState.number * 2;
}

// 敌人强度倍率（波次驱动）
export function enemyHpMult() {
  const w = waveState.number;
  let m = 1 + (w - 1) * 0.14;
  if (w >= 5) m += Math.pow(w - 5, 1.6) * 0.02;
  return m;
}

export function enemySpeedMult() {
  return 1 + waveState.number * 0.01;
}

// 开始第 n 波（n >= 1）
export function startWave(n) {
  waveState.number = n;
  waveState.phase = 'fight';
  waveState.fightTimer = 0;
  waveState.bossSpawned = false;
  waveState.bossKilled = false;
  if (isBossWave(n)) {
    waveState.bossAlive = true;
    // Boss 波：fight 进行到 1/3 时刷 Boss
    waveState.bossSpawnAt = FIGHT_DURATION / 3;
  } else {
    waveState.bossAlive = false;
    waveState.bossSpawnAt = 0;
  }
  waveState.spawnTimer = 0;
  waveState.spawned = 0;
}

// 推进调度；返回事件列表（'waveStart'|'waveEnd'|'boss'|'victory'），由更新层处理
export function updateWaves(dt, callbacks) {
  const events = [];
  if (waveState.phase === 'fight') {
    waveState.fightTimer += dt;
    // Boss 波计时刷 Boss（一次）
    if (waveState.bossAlive && !waveState.bossSpawned && waveState.fightTimer >= waveState.bossSpawnAt) {
      waveState.bossSpawned = true;
      events.push('boss');
    }
    // 小怪按间隔刷
    waveState.spawnTimer -= dt;
    if (waveState.spawnTimer <= 0 && waveState.spawned < spawnTotal()) {
      waveState.spawnTimer = spawnInterval();
      waveState.spawned++;
      events.push('spawn');
    }
    if (waveState.fightTimer >= FIGHT_DURATION) {
      waveState.phase = 'break';
      waveState.breakTimer = 0;
      events.push('waveEnd');
    }
  } else {
    waveState.breakTimer += dt;
    if (waveState.breakTimer >= BREAK_DURATION) {
      if (waveState.number >= TOTAL_WAVES) {
        events.push('victory');
      } else {
        startWave(waveState.number + 1);
        events.push('waveStart');
      }
    }
  }
  return events;
}

// 每波应刷的小怪总数（Boss 波略少，为 Boss 腾出压力）
export function spawnTotal() {
  if (isBossWave(waveState.number)) return Math.ceil(waveEnemyCount() * 0.7);
  return waveEnemyCount();
}
