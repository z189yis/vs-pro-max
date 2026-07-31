// ===== 水晶防守模式 · 渲染 =====
// 复用 game.js 的共享绘制函数，另绘制水晶与波次进度

import { W, H, sx, sy, onScreen } from '../utils.js';
import { xpGems } from '../utils.js';
import { ctx, shakeX, shakeY, gameTime,
  drawGround, drawXPGems, drawEnemies, drawProjectiles, drawTidalWaves, drawLightningEffects,
  drawFireExplosions, drawConeEffects, drawReactionEffects, drawBlizzardZones, drawFrostNovaEffects,
  drawDisintegrateBeams, drawParticles, drawPlayer, drawDmgNumbers, drawJoystick } from '../game.js';
import { joystick } from '../input.js';
import { crystal } from './crystal.js';
import { waveState, TOTAL_WAVES } from './wave.js';
import { defState } from './state.js';

// 金币/木材拾取物绘制（复用 xpGem 池，跳过硬刷的 XP 分支）
export function drawCurrencyGems() {
  for (let gem of xpGems) {
    if (!gem.active || !gem._isGold && !gem._isWood) continue;
    if (!onScreen(gem.x, gem.y, 20)) continue;
    const gx = sx(gem.x) + shakeX, gy = sy(gem.y) + shakeY + Math.sin(gameTime.value * 3 + gem.bobOff) * 3;
    const pulse = 1 + Math.sin(gameTime.value * 5 + gem.bobOff) * 0.2;
    ctx.save();
    if (gem._isGold) {
      const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 9 * pulse);
      glow.addColorStop(0, 'rgba(255,204,68,0.8)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(gx, gy, 9 * pulse, 0, Math.PI * 2); ctx.fill();
      // 金币：圆形 + 内刻
      ctx.fillStyle = '#ffcc44'; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(gx, gy, 5 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6a00';
      ctx.beginPath(); ctx.arc(gx, gy, 2 * pulse, 0, Math.PI * 2); ctx.fill();
    } else if (gem._isWood) {
      const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 9 * pulse);
      glow.addColorStop(0, 'rgba(255,136,68,0.8)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(gx, gy, 9 * pulse, 0, Math.PI * 2); ctx.fill();
      // 木材：短棒形
      ctx.fillStyle = '#ff8844'; ctx.strokeStyle = '#ffbb88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(gx, gy, 5 * pulse, 3.5 * pulse, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawCrystal() {
  if (defState.value === 'hero_select') return;
  const cx = sx(crystal.x) + shakeX, cy = sy(crystal.y) + shakeY;
  const pulse = 1 + Math.sin(gameTime.value * 3) * 0.06;
  const r = 22 * pulse;
  const alive = crystal.hp > 0;

  // 底座光晕
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 45);
  glow.addColorStop(0, alive ? 'rgba(120,200,255,0.5)' : 'rgba(255,80,80,0.4)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 菱形水晶
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  const flash = crystal.flash > 0 ? 0.6 : 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = alive ? '#4488ff' : '#884444';
  ctx.strokeStyle = '#aaccff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.stroke();
  // 内部亮面
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5);
  ctx.lineTo(r * 0.3, 0);
  ctx.lineTo(0, r * 0.5);
  ctx.lineTo(-r * 0.3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 水晶等级标记
  if (crystal.level > 1) {
    ctx.save();
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 11px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv${crystal.level}`, cx, cy - r - 8);
    ctx.restore();
  }

  // 受击闪烁粒子
  if (crystal.flash > 0) crystal.flash -= 0.016;
}

export function drawWaveBar() {
  if (defState.value !== 'playing') return;
  // 波次状态徽标（画布内：底部中央上方）
  const bw = 180, bh = 10;
  const bx = W.value / 2 - bw / 2, by = H.value - 70;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx - 4, by - 4, bw + 8, bh + 8, 4);
  ctx.fill();
  ctx.stroke();
  const pct = waveState.phase === 'fight' ? waveState.fightTimer / 30 : waveState.breakTimer / 15;
  const grad = waveState.phase === 'fight'
    ? (waveState.bossAlive ? '#ff6644' : '#44dd88')
    : '#88ccff';
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw * Math.min(1, Math.max(0, pct)), bh, 3);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = waveState.phase === 'fight' ? '#ffcc44' : '#88ccff';
  ctx.font = 'bold 13px "Segoe UI",sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  const label = waveState.phase === 'fight'
    ? (waveState.bossAlive ? `⚔ ${waveState.number}/${TOTAL_WAVES} 波 · BOSS` : `⚔ 第 ${waveState.number} 波`)
    : `☕ 发育窗口 ${Math.ceil(waveState.breakTimer)}s`;
  ctx.strokeText(label, W.value / 2, by - 12);
  ctx.fillText(label, W.value / 2, by - 12);
  ctx.restore();
}

export function renderDefense() {
  ctx.clearRect(0, 0, W.value, H.value);
  drawGround();
  drawCrystal();
  drawCurrencyGems();
  drawXPGems();
  drawEnemies();
  drawProjectiles();
  drawTidalWaves();
  drawLightningEffects();
  drawFireExplosions();
  drawConeEffects();
  drawReactionEffects();
  drawBlizzardZones();
  drawFrostNovaEffects();
  drawDisintegrateBeams();
  drawParticles();
  drawPlayer();
  drawDmgNumbers();
  drawWaveBar();
  if (joystick.active) drawJoystick();
}
