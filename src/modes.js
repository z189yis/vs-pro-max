// ===== 模式注册表 =====
// 新增模式 = 注册表加一行 + 提供 start()/dispose()
// 每个模式互相独立，通过 window.__ 钩子与 gameLoop 通信

export const MODES = {
  survival: {
    id: 'survival',
    name: '生存模式',
    desc: '无限生存 · 升级三选一',
    start() {
      const { startGame } = import('./game.js');
      return startGame;
    },
    dispose() {}
  },
  defense: {
    id: 'defense',
    name: '水晶防守',
    desc: '守水晶 20 波 · 木材 Roll 构筑',
    start() {
      const { startDefense } = import('./defense/entry.js');
      return startDefense;
    },
    dispose() {}
  }
};

export function getMode(id) { return MODES[id]; }
