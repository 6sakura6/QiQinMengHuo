// ============================================================
// gameConfig.ts — Phaser 游戏配置 + 全局常量
// ============================================================

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { Level1Scene } from '../scenes/Level1Scene';
import { ResultScene } from '../scenes/ResultScene';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from './constants';

/** 游戏配置 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a1220',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      debug: false,          // 物理碰撞盒调试（开发期可改回 true）
    },
  },
  scene: [BootScene, MainMenuScene, Level1Scene, ResultScene],   // Batch 10 加入 MainMenuScene
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
