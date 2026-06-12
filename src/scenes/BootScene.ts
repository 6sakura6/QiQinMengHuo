// ============================================================
// BootScene.ts — 启动加载场景（Batch 0 占位版本）
// 后续批次将扩展为完整的资源加载 + 进度条流程
// ============================================================

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Batch 0：无需加载资源，仅显示占位文字
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 标题文字
    const title = this.add.text(width / 2, height / 2 - 20, '七擒孟获', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#d4a574',
    });
    title.setOrigin(0.5);

    // 版本信息
    const subtitle = this.add.text(
      width / 2,
      height / 2 + 20,
      'Phase 2 · Batch 0 · 工程骨架就绪',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#667788',
      },
    );
    subtitle.setOrigin(0.5);

    // 像素格子地装饰线
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x334455, 0.5);
    gfx.strokeRect(width / 2 - 160, height / 2 - 40, 320, 80);

    console.log('[BootScene] ✅ Phaser 3 + TypeScript + Vite 运行正常');
    console.log('[BootScene] 📦 等待 Batch 1 → InputManager + Player');
  }
}
