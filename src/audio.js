import { rng } from './utils.js';

export let audioCtx = null;

export function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

export function beep(f, d, t = 'square', v = 0.08, s = 0) {
  if (!audioCtx) return;
  try {
    const T = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, T);
    if (s) o.frequency.linearRampToValueAtTime(f + s, T + d);
    g.gain.setValueAtTime(v, T);
    g.gain.exponentialRampToValueAtTime(0.001, T + d);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(T);
    o.stop(T + d);
  } catch (e) { /* ignore */ }
}

export function sfxShoot() { beep(800, 0.06, 'square', 0.05); }
export function sfxKnife() { beep(1200, 0.04, 'triangle', 0.04); }
export function sfxGarlicTick() { beep(200, 0.15, 'sine', 0.06, -80); }
export function sfxAxe() { beep(300, 0.1, 'sawtooth', 0.07, -100); }
export function sfxLightning() { beep(80, 0.2, 'sawtooth', 0.1); beep(2000, 0.08, 'square', 0.05, -1500); }
export function sfxHit() { beep(150, 0.08, 'triangle', 0.06); }
export function sfxKill() { beep(600, 0.1, 'square', 0.05, 400); }
export function sfxPickup() { beep(1400, 0.06, 'sine', 0.04, 200); }
export function sfxLevelUp() {
  beep(523, 0.1, 'sine', 0.08);
  setTimeout(() => beep(659, 0.1, 'sine', 0.08), 100);
  setTimeout(() => beep(784, 0.15, 'sine', 0.1), 200);
}
export function sfxBossSpawn() { beep(50, 0.5, 'sawtooth', 0.12, -20); }
export function sfxPlayerHit() { beep(80, 0.25, 'sawtooth', 0.15, -30); }
export function sfxGameOver() {
  beep(400, 0.3, 'sine', 0.1);
  setTimeout(() => beep(300, 0.3, 'sine', 0.1), 200);
  setTimeout(() => beep(200, 0.5, 'sine', 0.12), 400);
}
export function sfxIce() { beep(2000, 0.08, 'sine', 0.06, -1500); }
export function sfxFire() { beep(60, 0.2, 'sawtooth', 0.1, 30); }
export function sfxBounce() { beep(1500, 0.04, 'square', 0.04, 400); }
export function sfxLightningSpear() { beep(900, 0.08, 'square', 0.05); beep(2200, 0.05, 'sine', 0.04, -1000); }
export function sfxBlizzard() { beep(1200, 0.08, 'sine', 0.04, -600); beep(300, 0.15, 'sine', 0.05, -100); }
export function sfxFrostNova() { beep(600, 0.12, 'sine', 0.08, 800); beep(1400, 0.06, 'square', 0.05, -400); }

export function sfxReaction(type) {
  if (type === 'explosion') {
    beep(80, 0.25, 'sawtooth', 0.12, -40);
    setTimeout(() => beep(200, 0.15, 'square', 0.08), 80);
  } else if (type === 'steam') {
    beep(400, 0.2, 'sine', 0.07, -200);
  } else if (type === 'spark') {
    beep(1200, 0.08, 'square', 0.06);
    setTimeout(() => beep(1800, 0.06, 'square', 0.05), 60);
  } else if (type === 'ice') {
    beep(300, 0.15, 'sine', 0.07, -150);
    sfxIce();
  } else if (type === 'fire') {
    sfxFire();
  }
}
