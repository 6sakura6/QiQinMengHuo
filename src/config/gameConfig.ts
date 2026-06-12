// ============================================================
// gameConfig.ts — Phaser 游戏配置 + 全局常量
// ============================================================

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';

/** 游戏画布尺寸 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** 物理世界常量 */
export const GRAVITY = 980;
export const TILE_SIZE = 32;

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
      debug: false,
    },
  },
  scene: [BootScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
