// ============================================================
// DialogBox.ts — 对话框 UI（Batch 6）
// 底部对话框，支持说话人、打字机效果、跳过/继续
// 灰盒占位：无立绘时用彩色方块代替头像
// ============================================================

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import type { DialogNode } from '../types/system.types';

// 对话框配色常量
const BOX_PADDING    = 24;        // 内边距
const BOX_HEIGHT     = 120;       // 对话框总高度
const PORTRAIT_SIZE  = 72;        // 头像占位尺寸
const TEXT_SPEED     = 40;        // 打字机速度（ms/字）
const TEXT_FAST      = 8;         // 快进速度
const LOCK_COLOR     = 0xf44336;  // 不可跳过时闪烁颜色

// 说话人颜色表
const SPEAKER_COLORS: Record<string, number> = {
  '诸葛亮': 0x4fc3f7,
  '孟获':   0xff7043,
  '张伯':   0xa5d6a7,
};

export class DialogBox {
  private scene: Phaser.Scene;
  private bus = EventBus.getInstance();

  // ── 显示对象 ──────────────────────────────────
  private container: Phaser.GameObjects.Container;
  private boxBg!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Rectangle;
  private portraitLabel!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;  // 跳过提示

  // ── 状态 ──────────────────────────────────────
  private _active     = false;
  private _dialog: DialogNode | null = null;
  private _charIndex  = 0;         // 当前显示到的字符位置
  private _showTimer   = 0;         // 字符累积计时器
  private _lockTimer   = 0;         // 不可跳过强制等待计时器
  private _fullText    = '';        // 完整文本
  private _done        = false;     // 打字完成
  private _canSkip     = true;      // 当前是否可跳过
  private _skipKey1!: Phaser.Input.Keyboard.Key;  // Space
  private _skipKey2!: Phaser.Input.Keyboard.Key;  // Enter
  private _skipKey3!: Phaser.Input.Keyboard.Key;  // J

  // ── 尺寸 ──────────────────────────────────────
  private boxW!: number;
  private boxY!: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const w = scene.scale.width;
    this.boxW = w - BOX_PADDING * 2;
    this.boxY = scene.scale.height - BOX_HEIGHT - 12;

    // 容器 — 固定在屏幕坐标（scrollFactor=0），不随摄像机滚动
    this.container = scene.add.container(0, 0)
      .setDepth(100)
      .setScrollFactor(0)
      .setAlpha(0);

    // 注册事件监听（存储引用以便 destroy 时解除）
    this.bus.on(GameEvent.DIALOG_START, this._onDialogStart, this);
  }

  private _onDialogStart = (payload: { dialog: DialogNode }): void => {
    this.show(payload.dialog);
  };

  // ─────────────────────────────────────────────────
  // 显示对话
  // ─────────────────────────────────────────────────
  show(dialog: DialogNode): void {
    // ⚠️ 先杀掉容器上的所有旧 tween（包括 hide() 的 fade-out + onComplete），
    //    否则旧 tween 的 onComplete 会在 150ms 后销毁新创建的元素
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0);

    // 销毁旧元素
    this.cleanupElements();

    this._dialog   = dialog;
    this._active   = true;
    this._charIndex = 0;
    this._showTimer = 0;
    this._lockTimer = 0;
    this._fullText  = dialog.text;
    this._done      = false;
    this._canSkip   = dialog.skippable;

    const color = SPEAKER_COLORS[dialog.speaker] ?? 0x888888;

    // 背景面板
    this.boxBg = this.scene.add.graphics();
    this.boxBg.fillStyle(0x111122, 0.92);
    this.boxBg.fillRoundedRect(BOX_PADDING, this.boxY, this.boxW, BOX_HEIGHT, 12);
    this.boxBg.lineStyle(2, 0x334466, 0.8);
    this.boxBg.strokeRoundedRect(BOX_PADDING, this.boxY, this.boxW, BOX_HEIGHT, 12);
    this.container.add(this.boxBg);

    // 头像占位
    const portraitX = BOX_PADDING + 20;
    const portraitY = this.boxY + BOX_HEIGHT / 2;
    this.portrait = this.scene.add.rectangle(
      portraitX, portraitY,
      PORTRAIT_SIZE, PORTRAIT_SIZE,
      color, 0.9,
    );
    this.portrait.setStrokeStyle(2, 0xffffff, 0.3);
    this.container.add(this.portrait);

    // 头像标签（说话人名首字）
    this.portraitLabel = this.scene.add.text(
      portraitX, portraitY,
      dialog.speaker[0],
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.container.add(this.portraitLabel);

    // 说话人
    this.speakerText = this.scene.add.text(
      portraitX + PORTRAIT_SIZE / 2 + 16,
      this.boxY + 14,
      dialog.speaker,
      {
        fontSize: '16px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      },
    );
    this.container.add(this.speakerText);

    // 正文区域
    const textX = portraitX + PORTRAIT_SIZE / 2 + 16;
    const textY = this.boxY + 40;
    const maxWidth = this.boxW - PORTRAIT_SIZE - 60;
    this.bodyText = this.scene.add.text(textX, textY, '', {
      fontSize: '15px',
      color: '#e8e8e8',
      fontFamily: 'monospace',
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.container.add(this.bodyText);

    // 跳过提示
    this.promptText = this.scene.add.text(
      BOX_PADDING + this.boxW - 16,
      this.boxY + BOX_HEIGHT - 10,
      '(Space/J/Enter 继续)',
      {
        fontSize: '11px',
        color: dialog.skippable ? '#6688aa' : '#aa4444',
        fontFamily: 'monospace',
      },
    ).setOrigin(1, 1);
    this.container.add(this.promptText);

    // 键盘绑定
    const kb = this.scene.input.keyboard!;
    this._skipKey1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._skipKey2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._skipKey3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // 入场动画
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    console.log(`[DialogBox] 显示对话: ${dialog.id} — ${dialog.speaker}: "${dialog.text.slice(0, 20)}..."`);
  }

  // ─────────────────────────────────────────────────
  // 隐藏对话框
  // ─────────────────────────────────────────────────
  hide(): void {
    if (!this._active) return;

    this._active = false;
    this._dialog = null;

    // 退场动画
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.cleanupElements();
      },
    });
  }

  // ─────────────────────────────────────────────────
  // 帧更新（打字机 + 输入检测）
  // ─────────────────────────────────────────────────
  update(delta: number): void {
    if (!this._active || !this._dialog) return;

    const locked = this._lockTimer < this._dialog.firstPlayLockSec * 1000;
    this._lockTimer += delta;

    // 强制等待期间不可跳过
    this._canSkip = this._dialog.skippable && !locked;

    // 打字机效果
    if (!this._done) {
      const speed = this._canSkip ? TEXT_FAST : TEXT_SPEED;
      this._showTimer += delta;

      while (this._showTimer >= speed && this._charIndex < this._fullText.length) {
        this._showTimer -= speed;
        this._charIndex++;
      }

      this.bodyText.setText(this._fullText.slice(0, this._charIndex));

      if (this._charIndex >= this._fullText.length) {
        this._done = true;
        // 文字显示完毕，更新提示
        this.updatePromptText();
      }
    }

    // 锁定状态闪烁提示
    if (locked) {
      const blink = Math.sin(this.scene.time.now / 300) > 0;
      this.promptText.setColor(blink ? '#ff4444' : '#aa4444');
      this.promptText.setText(`(请阅读... ${Math.ceil(this._dialog.firstPlayLockSec - this._lockTimer / 1000)}s)`);
    } else if (this._done) {
      this.updatePromptText();
    }

    // 不可跳过的对话：打字完成 + lock 到期 → 自动推进
    // （firstPlayLockSec=0 时 lock 从第一帧即为 false，文本打完即刻推进）
    if (this._done && !locked && !this._dialog.skippable) {
      const dialogId = this._dialog.id;
      this.hide();
      this.bus.emit(GameEvent.DIALOG_END, { dialogId });
      return;
    }

    // 输入处理（可跳过对话）
    if (this.isSkipPressed()) {
      if (!this._done) {
        // 还没打完 → 快进（直接显示全文）
        this._charIndex = this._fullText.length;
        this._showTimer = 0;
        this.bodyText.setText(this._fullText);
        this._done = true;
        this.updatePromptText();
      } else if (this._canSkip) {
        // 已读完且可跳过 → 继续
        // ⚠️ 必须先取 dialog.id，因为 hide() 会把 this._dialog 置 null
        const dialogId = this._dialog!.id;
        this.hide();
        this.bus.emit(GameEvent.DIALOG_END, { dialogId });
      }
    }
  }

  // ─────────────────────────────────────────────────
  // 清理
  // ─────────────────────────────────────────────────
  destroy(): void {
    this._active = false;
    this.bus.off(GameEvent.DIALOG_START, this._onDialogStart, this);
    this.cleanupElements();
    this.container.destroy();
  }

  // ─────────────────────────────────────────────────
  // 内部
  // ─────────────────────────────────────────────────
  private cleanupElements(): void {
    this.container.removeAll(true);
    this._dialog = null;
  }

  private isSkipPressed(): boolean {
    if (!this._skipKey1 || !this._skipKey2 || !this._skipKey3) return false;
    return Phaser.Input.Keyboard.JustDown(this._skipKey1)
        || Phaser.Input.Keyboard.JustDown(this._skipKey2)
        || Phaser.Input.Keyboard.JustDown(this._skipKey3);
  }

  private updatePromptText(): void {
    if (!this._dialog) return;
    const color = this._canSkip ? '#6688aa' : '#aa4444';
    this.promptText.setColor(color);
    this.promptText.setText(this._canSkip ? '(Space/J/Enter 继续)' : '(请阅读)');
  }
}
