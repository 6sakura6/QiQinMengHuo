// ============================================================
// BootScene.ts — 启动加载场景（Batch 1 版：加载完成后进入 Level1）
// ============================================================

import Phaser from 'phaser';

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

    // 进度提示
    const title = this.add
      .text(width / 2, height / 2 - 20, '七擒孟获', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#d4a574',
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(width / 2, height / 2 + 20, 'Phase 2 · Batch 1 · 正在进入关卡…', {
        fontFamily: 'monospace',
        fontSize: '13px',
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
        this.scene.start('Level1Scene');
      },
    });

    console.log('[BootScene] → 即将进入 Level1Scene');
  }
}
