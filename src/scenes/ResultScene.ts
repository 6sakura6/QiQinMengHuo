// ============================================================
// ResultScene.ts — 关卡结算场景（Batch 8 桩）
// 显示擒获完成 + 得分，自动跳转回主菜单
// ============================================================

import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data?: { levelId?: string; score?: number }): void {
    const { width, height } = this.cameras.main;
    const score = data?.score ?? 0;
    const levelName = data?.levelId === 'level_01' ? '西洱河初战' : (data?.levelId ?? '未知关卡');

    // 背景
    this.cameras.main.setBackgroundColor('#0a1220');

    // 标题
    this.add.text(width / 2, height / 2 - 80, '🏆 擒获成功', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // 关卡通名
    this.add.text(width / 2, height / 2 - 20, levelName, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#d4a574',
    }).setOrigin(0.5);

    // 得分
    this.add.text(width / 2, height / 2 + 30, `得分: ${score}`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 返回提示
    const prompt = this.add.text(width / 2, height / 2 + 80, '点击或按任意键返回', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#667788',
    }).setOrigin(0.5);

    // 闪烁提示
    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // 交互：点击或按键 → 返回 BootScene
    this.input.once('pointerdown', () => this.goBack());
    this.input.keyboard?.once('keydown', () => this.goBack());

    // 5 秒无操作自动返回
    this.time.delayedCall(5000, () => this.goBack());

    console.log(`[ResultScene] 结算 — ${levelName} / 得分: ${score}`);
  }

  private goBack(): void {
    // 清理所有 tweens 防止回调冲突
    this.tweens.killAll();
    this.scene.start('BootScene');
  }
}
