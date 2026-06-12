// ============================================================
// main.ts — 游戏入口，初始化 Phaser.Game
// ============================================================

import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// 启动游戏
const game = new Phaser.Game(gameConfig);

// 调试：暴露到 window 方便控制台操作
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__GAME__ = game;
  console.log('🎮 七擒孟获 Phase 2 MVP — 开发模式');
  console.log('  可用 window.__GAME__ 访问 Phaser.Game 实例');
}
