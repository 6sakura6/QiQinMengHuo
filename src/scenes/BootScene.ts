// ============================================================
// BootScene.ts — 启动加载场景（Batch 10：初始化系统 → 进入主菜单）
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Batch 1：全灰盒，无外部资源需要加载
    // Batch 3 开始这里会读 asset-manifest.json 并加载精灵/图块
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ── 初始化全局单例系统 ────────────────────────
    // SaveSystem 在首次 getInstance() 时自动从 localStorage 恢复存档
    const saveSys = SaveSystem.getInstance();
    console.log(`[BootScene] SaveSystem 就绪 — 已解锁: ${saveSys.data.unlockedLevels.join(', ') || '(无)'}`);

    // 进度提示
    const title = this.add
      .text(width / 2, height / 2 - 20, '七擒孟获', {
        fontFamily: '"Press Start 2P", "SimHei", monospace',
        fontSize: '36px',
        color: '#d4a574',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(width / 2, height / 2 + 24, 'Phase 2 · 加载中…', {
        fontFamily: '"VT323", monospace',
        fontSize: '18px',
        color: '#667788',
      })
      .setOrigin(0.5);

    // 闪烁动画（像素风 blink）
    this.tweens.add({
      targets: sub,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Batch 10: 改为跳转主菜单（而非直接进关卡）
        this.scene.start('MainMenuScene');
      },
    });

    console.log('[BootScene] → 即将进入 MainMenuScene');
  }
}
