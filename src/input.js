import { rng } from './utils.js';

export const keys = {};
export let joystick = { active: false, baseX: 0, baseY: 0, moveX: 0, moveY: 0, dist: 0, angle: 0 };
export const JR = 70;
export const JT = 30;

export function tp(t) { return { x: t.clientX, y: t.clientY }; }

export function setupInput(canvas, getGameState, setPostUpgrade) {
  let mouseDown = false;

  window.addEventListener('touchstart', e => {
    const gs = getGameState();
    if (gs === 'postupgrade') { e.preventDefault(); setPostUpgrade(); return; }
    if (gs !== 'playing') return;
    e.preventDefault();
    const W = window.innerWidth;
    for (let tch of e.changedTouches) {
      const p = tp(tch);
      if (p.x < W / 2) {
        joystick.active = true;
        joystick.baseX = p.x;
        joystick.baseY = p.y;
        joystick.moveX = 0;
        joystick.moveY = 0;
        joystick.dist = 0;
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (getGameState() !== 'playing') return;
    e.preventDefault();
    const W = window.innerWidth;
    for (let tch of e.changedTouches) {
      const p = tp(tch);
      if (!joystick.active) {
        if (p.x >= W / 2) continue;
        joystick.active = true;
        joystick.baseX = p.x;
        joystick.baseY = p.y;
      }
      const dx = p.x - joystick.baseX;
      const dy = p.y - joystick.baseY;
      const d = Math.hypot(dx, dy);
      const c = Math.min(d, JR);
      joystick.dist = c / JR;
      if (d > 0) {
        joystick.angle = Math.atan2(dy, dx);
        joystick.moveX = (dx / d) * joystick.dist;
        joystick.moveY = (dy / d) * joystick.dist;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', e => {
    if (getGameState() !== 'playing') return;
    e.preventDefault();
    const W = window.innerWidth;
    let sa = false;
    for (let t of e.touches) {
      if (t.clientX < W / 2) { sa = true; break; }
    }
    if (!sa) {
      joystick.active = false;
      joystick.moveX = 0;
      joystick.moveY = 0;
      joystick.dist = 0;
    }
  }, { passive: false });

  window.addEventListener('touchcancel', () => {
    if (getGameState() !== 'playing') return;
    joystick.active = false;
    joystick.moveX = 0;
    joystick.moveY = 0;
    joystick.dist = 0;
  });

  canvas.addEventListener('mousedown', e => {
    const gs = getGameState();
    if (gs === 'gameover') { window.__restartGame?.(); return; }
    if (gs === 'title') { window.__startGame?.(); return; }
    if (gs === 'postupgrade') { setPostUpgrade(); return; }
    if (e.button === 0 && e.clientX < window.innerWidth / 2) {
      mouseDown = true;
      joystick.active = true;
      joystick.baseX = e.clientX;
      joystick.baseY = e.clientY;
      joystick.moveX = 0;
      joystick.moveY = 0;
      joystick.dist = 0;
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (!mouseDown || e.clientX >= window.innerWidth / 2) return;
    if (!joystick.active) {
      joystick.active = true;
      joystick.baseX = e.clientX;
      joystick.baseY = e.clientY;
    }
    const dx = e.clientX - joystick.baseX;
    const dy = e.clientY - joystick.baseY;
    const d = Math.hypot(dx, dy);
    const c = Math.min(d, JR);
    joystick.dist = c / JR;
    if (d > 0) {
      joystick.angle = Math.atan2(dy, dx);
      joystick.moveX = (dx / d) * joystick.dist;
      joystick.moveY = (dy / d) * joystick.dist;
    }
  });

  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    joystick.active = false;
    joystick.moveX = 0;
    joystick.moveY = 0;
    joystick.dist = 0;
  });

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (getGameState() === 'postupgrade') { setPostUpgrade(); }
    e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    e.preventDefault();
  });
}

export function resetInput() {
  for (let k in keys) delete keys[k];
  joystick.active = false;
  joystick.moveX = 0;
  joystick.moveY = 0;
  joystick.dist = 0;
}
