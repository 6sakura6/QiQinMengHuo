// ============================================================
// DialogBox.ts — 对话框 UI（Phase 3 像素三国风格重构）
// 底部对话框：左侧头像区 + 右侧文字区，像素边框 + 红金配色
// ============================================================

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import type { DialogNode } from '../types/system.types';

// ─── Phase 3 像素配色 ────────────────────────────────
const BOX_PADDING    = 16;
const BOX_HEIGHT     = 110;
const PORTRAIT_SIZE  = 56;
const TEXT_SPEED     = 40;
const TEXT_FAST      = 8;

// 说话人颜色表（Phase 3）
const SPEAKER_COLORS: Record<string, number> = {
  '诸葛亮': 0xF59E0B,    // 琥珀金
  '孟获':   0xEF4444,    // 亮红
  '张伯':   0x22C55E,    // 翠绿
};

// Batch 8 热修复：防止 interrupted-dialog 冻屏 + 键盘 Key 泄露
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
  private _skipKeys: Phaser.Input.Keyboard.Key[] = [];  // 🔑 所有绑定 Key 的集合，防泄露

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

    // 销毁旧元素（先清理键盘绑定，防 Key 对象泄露）
    this.destroySkipKeys();
    this.cleanupElements();

    // 🛡️ 先设置 _dialog 再设置 _active，确保 update() 中 _dialog 永不为 null
    this._dialog   = dialog;
    this._active   = true;
    this._charIndex = 0;
    this._showTimer = 0;
    this._lockTimer = 0;
    this._fullText  = dialog.text;
    this._done      = false;
    this._canSkip   = dialog.skippable;

    const color = SPEAKER_COLORS[dialog.speaker] ?? 0x888888;

    // 背景面板（Phase 3: 深藏青底 + 朱砂红像素边框）
    this.boxBg = this.scene.add.graphics();
    this.boxBg.fillStyle(0x192134, 0.94);
    this.boxBg.fillRect(BOX_PADDING, this.boxY, this.boxW, BOX_HEIGHT);
    this.boxBg.lineStyle(4, 0xDC2626, 1);
    this.boxBg.strokeRect(BOX_PADDING, this.boxY, this.boxW, BOX_HEIGHT);
    // 顶部金色细线（像素装饰）
    this.boxBg.lineStyle(2, 0xF59E0B, 0.5);
    this.boxBg.lineBetween(BOX_PADDING + 4, this.boxY + 6, BOX_PADDING + this.boxW - 4, this.boxY + 6);
    this.container.add(this.boxBg);

    // 头像占位（Phase 3: 深底 + 金色边框）
    const portraitX = BOX_PADDING + 16;
    const portraitY = this.boxY + BOX_HEIGHT / 2;
    this.portrait = this.scene.add.rectangle(
      portraitX, portraitY,
      PORTRAIT_SIZE, PORTRAIT_SIZE,
      0x1E293B, 1,
    );
    this.portrait.setStrokeStyle(3, 0xF59E0B, 1);
    this.container.add(this.portrait);

    // 头像标签（说话人名首字，像素体）
    this.portraitLabel = this.scene.add.text(
      portraitX, portraitY,
      dialog.speaker[0],
      {
        fontSize: '24px',
        color: '#FEF3C7',
        fontFamily: '"Press Start 2P", monospace',
      },
    ).setOrigin(0.5);
    this.container.add(this.portraitLabel);

    // 说话人（Phase 3: 琥珀金像素体）
    this.speakerText = this.scene.add.text(
      portraitX + PORTRAIT_SIZE / 2 + 14,
      this.boxY + 12,
      dialog.speaker,
      {
        fontSize: '14px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: '"Press Start 2P", monospace',
      },
    );
    this.container.add(this.speakerText);

    // 正文区域
    const textX = portraitX + PORTRAIT_SIZE / 2 + 14;
    const textY = this.boxY + 38;
    const maxWidth = this.boxW - PORTRAIT_SIZE - 50;
    this.bodyText = this.scene.add.text(textX, textY, '', {
      fontSize: '14px',
      color: '#FEF3C7',
      fontFamily: '"VT323", monospace',
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.container.add(this.bodyText);

    // 跳过提示（Phase 3: 灰蓝小字）
    this.promptText = this.scene.add.text(
      BOX_PADDING + this.boxW - 12,
      this.boxY + BOX_HEIGHT - 8,
      '[Space] 继续',
      {
        fontSize: '10px',
        color: dialog.skippable ? '#64748B' : '#EF4444',
        fontFamily: '"Press Start 2P", monospace',
      },
    ).setOrigin(1, 1);
    this.container.add(this.promptText);

    // 键盘绑定 — 🔑 注册到 _skipKeys 集合以便 show() 替换时清理
    const kb = this.scene.input.keyboard!;
    this._skipKey1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._skipKey2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._skipKey3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this._skipKeys = [this._skipKey1, this._skipKey2, this._skipKey3];

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
    // ⚠️ _dialog 在 cleanupElements() 中不再自动置 null
    //    在此显式置 null，但语义上 hide 已经停用对话框
    this._dialog = null;

    // 退场动画
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.destroySkipKeys();
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
      console.log(`[DialogBox] 🔍 自动推进 → hide() + DIALOG_END (${dialogId})`);
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
    this.destroySkipKeys();
    this.cleanupElements();
    this._dialog = null;
    this.container.destroy();
  }

  // ─────────────────────────────────────────────────
  // 内部
  // ─────────────────────────────────────────────────
  /** 销毁已注册的跳过后按键，防止 Key 对象泄露 */
  private destroySkipKeys(): void {
    for (const k of this._skipKeys) {
      k.destroy();
    }
    this._skipKeys = [];
  }

  private cleanupElements(): void {
    this.container.removeAll(true);
    // ⚠️ 不再在此处设置 this._dialog = null
    //    旧代码在 cleanupElements 中置 null 会在 show() 的间隙留出空窗期
    //    如果 update() 在该窗口执行，this._dialog 为 null → 静默跳过整帧 → 冻屏
    //    现在由 destroy() / hide() 各自管理 _dialog 的生命周期
  }

  private isSkipPressed(): boolean {
    if (!this._skipKey1 || !this._skipKey2 || !this._skipKey3) return false;
    return Phaser.Input.Keyboard.JustDown(this._skipKey1)
        || Phaser.Input.Keyboard.JustDown(this._skipKey2)
        || Phaser.Input.Keyboard.JustDown(this._skipKey3);
  }

  private updatePromptText(): void {
    if (!this._dialog) return;
    const color = this._canSkip ? '#64748B' : '#EF4444';
    this.promptText.setColor(color);
    this.promptText.setText(this._canSkip ? '[Space] 继续' : '[请阅读]');
  }
}
