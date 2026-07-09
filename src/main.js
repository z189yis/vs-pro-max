import { initAudio } from './audio.js';
import { setupInput } from './input.js';
import { W, H } from './utils.js';
import {
  setCanvas, setPostUpgrade, restartGame, startGame, gameLoop, getGameState,
  canvas, ctx, gameState, gameTime
} from './game.js';

function main() {
  const c = document.getElementById('game');
  const x = c.getContext('2d');
  setCanvas(c, x);
  window.__gameState = gameState;
  window.__gameTime = gameTime;

  function resize() {
    W.value = c.width = window.innerWidth;
    H.value = c.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  setupInput(c, getGameState, () => setPostUpgrade());

  window.__startGame = () => { initAudio(); startGame(); };
  window.__restartGame = () => restartGame();

  document.getElementById('btn-start').addEventListener('click', window.__startGame);
  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' && getGameState() === 'gameover') restartGame();
    if (e.key === 'Enter' && getGameState() === 'title') window.__startGame();
  });

  c.focus();
  requestAnimationFrame(gameLoop);
}

main();
