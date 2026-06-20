// ============================================================
// BootScene.ts — 启动加载场景（Batch 10：初始化系统 → 合成音频 → 进入主菜单）
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ProceduralAudio } from '../systems/ProceduralAudio';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 加载启动场景背景图
    this.load.image('boot_bg', 'ui/boot_bg.jpg');
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ── 背景图（铺满全屏，保持比例覆盖） ───────────
    this.add.image(width / 2, height / 2, 'boot_bg')
      .setDisplaySize(width, height)
      .setDepth(0);

    // ── 半透明遮罩（提升文字可读性） ────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35)
      .setDepth(1);

    // ── 初始化全局单例系统 ────────────────────────
    const saveSys = SaveSystem.getInstance();
    console.log(`[BootScene] SaveSystem 就绪 — 已解锁: ${saveSys.data.unlockedLevels.join(', ') || '(无)'}`);

    // 标题
    this.add
      .text(width / 2, height / 2 - 50, '七擒孟获', {
        fontFamily: '"Press Start 2P", "SimHei", monospace',
        fontSize: '36px',
        color: '#d4a574',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2);

    // 加载提示（动态更新）
    const loadingText = this.add
      .text(width / 2, height / 2 + 10, '加载中…', {
        fontFamily: '"VT323", monospace',
        fontSize: '18px',
        color: '#667788',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── 启动音频合成（异步） ──────────────────────
    this._bootSequence(loadingText);
  }

  /** 启动序列：合成音频 → 过渡动画 → 进入主菜单 */
  private async _bootSequence(loadingText: Phaser.GameObjects.Text): Promise<void> {
    console.log('[BootScene] 🎵 开始程序化音频合成...');

    // 第1步：合成所有游戏音频
    const procAudio = new ProceduralAudio();
    try {
      loadingText.setText('合成音效中…');
      const result = await procAudio.generateAll(this);
      console.log(`[BootScene] ✅ 音频合成完成: ${result.generated.length} 个已生成`);
    } catch (e) {
      console.warn('[BootScene] ⚠️  音频合成异常，使用静音模式:', e);
    }

    // 第2步：闪烁过渡动画
    loadingText.setText('准备就绪');
    await this._waitTween(loadingText, 300);

    // 第3步：进入主菜单
    console.log('[BootScene] → 进入 MainMenuScene');
    this.scene.start('MainMenuScene');
  }

  /** 等待加载文字的闪烁动画完成 */
  private _waitTween(target: Phaser.GameObjects.Text, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        alpha: 0,
        duration: durationMs,
        yoyo: true,
        repeat: 2,
        onComplete: () => resolve(),
      });
    });
  }
}
