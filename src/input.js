import { rng } from './utils.js';

export const keys = {};
export let joystick = { active: false, baseX: 0, baseY: 0, moveX: 0, moveY: 0, dist: 0, angle: 0 };
export const JR = 70;
export const JT = 30;

export function tp(t) { return { x: t.clientX, y: t.clientY }; }

export function setupInput(canvas, getGameState, setPostUpgrade) {
  let mouseDown = false;
  let touchId = null;

  function releaseJoystick() {
    touchId = null;
    joystick.active = false;
    joystick.moveX = 0;
    joystick.moveY = 0;
    joystick.dist = 0;
    joystick.angle = 0;
  }

  function updateJoystick(p) {
    const dx = p.x - joystick.baseX;
    const dy = p.y - joystick.baseY;
    const d = Math.hypot(dx, dy);
    const c = Math.min(d, JR);
    joystick.dist = c / JR;
    if (d > 0) {
      joystick.angle = Math.atan2(dy, dx);
      joystick.moveX = (dx / d) * joystick.dist;
      joystick.moveY = (dy / d) * joystick.dist;
    } else {
      joystick.moveX = 0;
      joystick.moveY = 0;
    }
  }

  window.addEventListener('touchstart', e => {
    const gs = getGameState();
    if (gs === 'postupgrade') { e.preventDefault(); setPostUpgrade(); return; }
    if (gs !== 'playing') return;
    e.preventDefault();
    if (touchId !== null) return;
    const W = window.innerWidth;
    for (let tch of e.changedTouches) {
      const p = tp(tch);
      if (p.x < W / 2) {
        touchId = tch.identifier;
        joystick.active = true;
        joystick.baseX = p.x;
        joystick.baseY = p.y;
        joystick.moveX = 0;
        joystick.moveY = 0;
        joystick.dist = 0;
        joystick.angle = 0;
        break;
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (getGameState() !== 'playing') return;
    if (touchId === null) return;
    e.preventDefault();
    for (let tch of e.changedTouches) {
      if (tch.identifier === touchId) {
        updateJoystick(tp(tch));
        break;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', e => {
    if (getGameState() !== 'playing') return;
    if (touchId === null) return;
    e.preventDefault();
    for (let tch of e.changedTouches) {
      if (tch.identifier === touchId) {
        releaseJoystick();
        break;
      }
    }
  }, { passive: false });

  window.addEventListener('touchcancel', e => {
    if (touchId === null) return;
    for (let tch of e.changedTouches) {
      if (tch.identifier === touchId) { releaseJoystick(); break; }
    }
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
    if (!mouseDown) return;
    updateJoystick({ x: e.clientX, y: e.clientY });
  });

  canvas.addEventListener('mouseup', () => {
    if (!mouseDown) return;
    mouseDown = false;
    releaseJoystick();
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
  joystick.angle = 0;
}
