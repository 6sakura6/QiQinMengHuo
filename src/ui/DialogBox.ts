// ============================================================
// DialogBox.ts — 对话框中式像素国风重构（对标 Phase 1 参考稿）
// 参考：03-dialog-scene.svg + 03-dialog-system-prompt.md
// 设计：朱砂红双线边框 + 金色角花云纹 + 深木底色 +
//       诸葛亮圆框肖像 + CRT扫描线 + 电影遮幅沉浸感
// ============================================================

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import type { DialogNode } from '../types/system.types';

// ─── 对话框布局常量（对标 Phase 1 参考稿）────────────────
const BOX_PADDING    = 12;        // 左右留白
const BOX_HEIGHT     = 140;       // 对话框总高度（容纳96px头像）
const PORTRAIT_SIZE  = 96;        // 肖像框尺寸（匹配导出的96×96像素头像）
const PORTRAIT_X     = 18;        // 肖像 X 偏移（在对话框内）
const TEXT_X_OFFSET  = 130;       // 文字区起始偏移
const TEXT_SPEED     = 40;        // 打字机速度（ms/字）
const TEXT_FAST      = 8;         // 快进速度

// ─── 颜色常量（对标 Phase 1 参考稿色板）────────────────
const COLOR_BG       = 0x1C1917;  // 深木底色
const COLOR_BORDER    = 0xDC2626;  // 朱砂红
const COLOR_GOLD      = 0xF59E0B;  // 琥珀金
const COLOR_PORTRAIT_BG = 0x1E293B; // 肖像底
const COLOR_TEXT      = 0xFEF3C7;  // 奶油白
const COLOR_TEXT_SUB  = 0x64748B;  // 灰蓝
const COLOR_SPEAKER_ZGL = 0xF59E0B; // 诸葛亮金
const COLOR_SPEAKER_MH  = 0xEF4444; // 孟获红

// 说话人颜色表
const SPEAKER_COLORS: Record<string, number> = {
  '诸葛亮': COLOR_SPEAKER_ZGL,
  '孟获':   COLOR_SPEAKER_MH,
  '张伯':   0x22C55E,
  '祝融夫人': 0xDC2626,
  '木鹿大王': 0x92400E,
  '朵思大王': 0x22C55E,
  '阿会喃':   0x22C55E,
  '董荼那':   0x3B82F6,
  '马谡':     0x7C3AED,
};

// 说话人 → 头像文件名映射（public/portraits/ 目录下）
const SPEAKER_PORTRAITS: Record<string, string> = {
  '诸葛亮':   'zhugeliang',
  '孟获':     'menghuo',
  '张伯':     'zhangbo',
  '祝融夫人': 'zhurong',
  '木鹿大王': 'mulu',
  '朵思大王': 'duosi',
  '阿会喃':   'ahuinan',
  '董荼那':   'dongtuna',
  '马谡':     'masu',
};

export class DialogBox {
  private scene: Phaser.Scene;
  private bus = EventBus.getInstance();

  // ── 显示对象 ──────────────────────────────────
  private container: Phaser.GameObjects.Container;
  private boxBg!: Phaser.GameObjects.Graphics;
  private boxBorder!: Phaser.GameObjects.Graphics;
  private boxDecor!: Phaser.GameObjects.Graphics;   // 角花 + 云纹
  private scanlines!: Phaser.GameObjects.Graphics;    // CRT 扫描线
  private portraitBg!: Phaser.GameObjects.Rectangle;
  private portraitImg!: Phaser.GameObjects.Image;   // 像素头像图片
  private portraitLabel!: Phaser.GameObjects.Text;   // fallback 文字
  private portraitName!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;        // "汉 · 丞相"
  private viewTagText!: Phaser.GameObjects.Text;      // "士卒视角"
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;       // "▼"

  // ── 状态 ──────────────────────────────────────
  private _active     = false;
  private _dialog: DialogNode | null = null;
  private _charIndex  = 0;
  private _showTimer   = 0;
  private _lockTimer   = 0;
  private _fullText    = '';
  private _done        = false;
  private _canSkip     = true;
  private _skipKey1!: Phaser.Input.Keyboard.Key;
  private _skipKey2!: Phaser.Input.Keyboard.Key;
  private _skipKey3!: Phaser.Input.Keyboard.Key;
  private _skipKeys: Phaser.Input.Keyboard.Key[] = [];

  // ── 尺寸 ──────────────────────────────────────
  private boxW!: number;
  private boxY!: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const w = scene.scale.width;
    this.boxW = w - BOX_PADDING * 2;
    this.boxY = scene.scale.height - BOX_HEIGHT - 8;

    // 容器 — 固定屏幕坐标，不随摄像机滚动
    // depth=500 确保浮动在所有地图层 (depth≤50) 和 HUD 层 (depth≤199) 之上
    this.container = scene.add.container(0, 0)
      .setDepth(500)
      .setScrollFactor(0)
      .setAlpha(0);

    // 注册事件
    this.bus.on(GameEvent.DIALOG_START, this._onDialogStart, this);
  }

  // ─────────────────────────────────────────────────
  // 事件入口
  // ─────────────────────────────────────────────────
  private _onDialogStart = (payload: { dialog: DialogNode }): void => {
    this.show(payload.dialog);
  };

  // ─────────────────────────────────────────────────
  // 显示对话
  // ─────────────────────────────────────────────────
  show(dialog: DialogNode): void {
    // 杀掉旧 tween + 清理
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0);
    this.destroySkipKeys();
    this.cleanupElements();

    // 设置状态
    this._dialog   = dialog;
    this._active   = true;
    this._charIndex = 0;
    this._showTimer = 0;
    this._lockTimer = 0;
    this._fullText  = dialog.text;
    this._done      = false;
    this._canSkip   = dialog.skippable;

    const color = SPEAKER_COLORS[dialog.speaker] ?? 0x888888;
    const colorHex = '#' + color.toString(16).padStart(6, '0');

    // ═══════════════════════════════════════
    // 0. 暗角遮罩 — 并入容器，作为最底层
    // ═══════════════════════════════════════
    this.drawVignette();

    // ═══════════════════════════════════════
    // 1. 对话框背景：深木底色 + 朱砂红双线边框
    // ═══════════════════════════════════════
    // → 外层 4px 朱砂红
    // → 4px 间隙（深木色自然留出）
    // → 内层 2px 朱砂红

    this.boxBg = this.scene.add.graphics();

    // 深木底色
    this.boxBg.fillStyle(COLOR_BG, 0.96);
    this.boxBg.fillRect(BOX_PADDING, this.boxY, this.boxW, BOX_HEIGHT);

    // 外边框 4px
    this.boxBg.lineStyle(4, COLOR_BORDER, 1);
    this.boxBg.strokeRect(BOX_PADDING - 2, this.boxY - 2, this.boxW + 4, BOX_HEIGHT + 4);

    // 内边框 2px（偏移 4px）
    this.boxBg.lineStyle(2, COLOR_BORDER, 0.9);
    this.boxBg.strokeRect(BOX_PADDING + 4, this.boxY + 4, this.boxW - 8, BOX_HEIGHT - 8);

    // 顶部金色装饰线
    this.boxBg.lineStyle(2, COLOR_GOLD, 0.6);
    this.boxBg.lineBetween(
      BOX_PADDING + 12, this.boxY + 8,
      BOX_PADDING + this.boxW - 12, this.boxY + 8,
    );

    this.container.add(this.boxBg);

    // ═══════════════════════════════════════
    // 3. 四角金色角花 + 云纹像素装饰
    // ═══════════════════════════════════════
    this.drawCornerFlourishes();

    // ═══════════════════════════════════════
    // 3b. CRT 扫描线 — 必须在文字之前加入容器
    // ═══════════════════════════════════════
    this.drawScanlines();

    // ═══════════════════════════════════════
    // 4. 左侧肖像区：金框 + 像素头像图 + 名称
    // ═══════════════════════════════════════
    const portraitCX = BOX_PADDING + PORTRAIT_X + PORTRAIT_SIZE / 2;
    const portraitCY = this.boxY + BOX_HEIGHT / 2 - 6;

    // 肖像背景（深底 + 金色像素边框）
    this.portraitBg = this.scene.add.rectangle(
      portraitCX, portraitCY,
      PORTRAIT_SIZE + 8, PORTRAIT_SIZE + 8,
      COLOR_PORTRAIT_BG, 1,
    );
    this.portraitBg.setStrokeStyle(3, COLOR_GOLD, 1);
    this.container.add(this.portraitBg);

    // 加载像素头像图片
    const portraitKey = SPEAKER_PORTRAITS[dialog.speaker] ?? 'zhugeliang';
    const imgPath = `portraits/${portraitKey}.png`;

    if (this.scene.textures.exists(portraitKey)) {
      // 纹理已缓存，直接使用
      this.portraitImg = this.scene.add.image(portraitCX, portraitCY, portraitKey)
        .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      this.container.add(this.portraitImg);

      // 隐藏 fallback 文字
      this.portraitLabel = this.scene.add.text(0, 0, '', {}).setVisible(false);
    } else {
      // 尝试加载，加载期间用文字 fallback
      this.scene.load.image(portraitKey, imgPath);
      this.scene.load.once('filecomplete-image-' + portraitKey, () => {
        if (this._active && this.portraitLabel?.visible === false) return;
        // 加载完成，替换为图片
        if (this._active && this.portraitImg) {
          this.portraitImg.destroy();
        }
        if (this._active && this.portraitLabel) {
          this.portraitLabel.setVisible(false);
        }
        if (this._active) {
          this.portraitImg = this.scene.add.image(portraitCX, portraitCY, portraitKey)
            .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
          this.container.add(this.portraitImg);
        }
      });
      this.scene.load.start();

      // Fallback: 显示首字
      this.portraitImg = this.scene.add.image(0, 0, '__MISSING').setVisible(false);
      this.portraitLabel = this.scene.add.text(
        portraitCX, portraitCY - 4,
        dialog.speaker[0],
        {
          fontSize: '48px',
          color: '#FEF3C7',
          fontFamily: '"Press Start 2P", monospace',
          stroke: '#000000',
          strokeThickness: 3,
        },
      ).setOrigin(0.5);
      this.container.add(this.portraitLabel);
    }

    // 肖像下方名称
    this.portraitName = this.scene.add.text(
      portraitCX, portraitCY + PORTRAIT_SIZE / 2 + 10,
      dialog.speaker,
      {
        fontSize: '16px',
        color: colorHex,
        fontFamily: '"VT323", "Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 2,
      },
    ).setOrigin(0.5, 0);
    this.container.add(this.portraitName);

    // ═══════════════════════════════════════
    // 5. 右侧文本区：标题标签 + 对话正文
    // ═══════════════════════════════════════
    const textX = BOX_PADDING + TEXT_X_OFFSET + PORTRAIT_SIZE / 2;
    const titleY = this.boxY + 14;

    // "汉 · 丞相" 标题
    this.titleText = this.scene.add.text(
      textX, titleY,
      this.getTitleTag(dialog.speaker),
      {
        fontSize: '20px',
        color: '#F59E0B',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 2,
      },
    );
    this.container.add(this.titleText);

    // "士卒视角" 标签（右上角）
    this.viewTagText = this.scene.add.text(
      BOX_PADDING + this.boxW - 16, titleY,
      '士卒视角',
      {
        fontSize: '13px',
        color: '#64748B',
        fontFamily: '"VT323", monospace',
      },
    ).setOrigin(1, 0);
    this.container.add(this.viewTagText);

    // 正文
    const bodyY = this.boxY + 48;
    const maxWidth = this.boxW - TEXT_X_OFFSET - PORTRAIT_SIZE / 2 - 20;
    this.bodyText = this.scene.add.text(textX, bodyY, '', {
      fontSize: '22px',
      color: '#FEF3C7',
      fontFamily: '"VT323", "Press Start 2P", monospace',
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      lineSpacing: 8,
      stroke: '#000000',
      strokeThickness: 1,
    });
    this.container.add(this.bodyText);

    // "▼" 提示（右下角闪烁）
    this.promptText = this.scene.add.text(
      BOX_PADDING + this.boxW - 16,
      this.boxY + BOX_HEIGHT - 14,
      '▼',
      {
        fontSize: '20px',
        color: dialog.skippable ? '#64748B' : '#EF4444',
        fontFamily: '"VT323", monospace',
      },
    ).setOrigin(1, 1);
    this.container.add(this.promptText);

    // ═══════════════════════════════════════
    // 7. 键盘绑定
    // ═══════════════════════════════════════
    const kb = this.scene.input.keyboard!;
    this._skipKey1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._skipKey2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._skipKey3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this._skipKeys = [this._skipKey1, this._skipKey2, this._skipKey3];

    // 入场动画（从底部滑入 + 淡入）
    this.container.setAlpha(0);
    this.container.y = 30;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: 0,
      duration: 250,
      ease: 'Power3',
    });

    console.log(`[DialogBox] 显示对话: ${dialog.id} — ${dialog.speaker}: "${dialog.text.slice(0, 20)}..."`);
  }

  // ─────────────────────────────────────────────────
  // 根据说话人返回标题标签
  // ─────────────────────────────────────────────────
  private getTitleTag(speaker: string): string {
    if (speaker === '诸葛亮') return '汉 · 丞相';
    if (speaker === '孟获') return '蛮 · 洞主';
    return '蜀 · 士卒';
  }

  // ─────────────────────────────────────────────────
  // 绘制场景暗角（上方渐变暗 + 底部遮幅）— 并入容器
  // 作为容器最底层，确保不遮挡文字
  // ─────────────────────────────────────────────────
  private drawVignette(): void {
    const g = this.scene.add.graphics();
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;

    // 顶部渐变暗角
    for (let i = 0; i < 8; i++) {
      const alpha = 0.25 - i * 0.03;
      g.fillStyle(0x000000, Math.max(0, alpha));
      g.fillRect(0, i * 4, w, 4);
    }

    // 🔧 底部遮幅：只覆盖对话框下方区域（h-8 到 h），不再覆盖对话框文字区
    g.fillStyle(0x000000, 0.4);
    g.fillRect(0, h - 8, w, 8);

    // 顶部细遮幅
    g.fillStyle(0x000000, 0.2);
    g.fillRect(0, 0, w, 12);

    // ⚠️ 暗角作为容器第一个子元素 → 渲染在最底层
    this.container.addAt(g, 0);
  }

  // ─────────────────────────────────────────────────
  // 绘制四角金色角花 + 云纹像素装饰
  // ─────────────────────────────────────────────────
  private drawCornerFlourishes(): void {
    const g = this.scene.add.graphics();
    const bx = BOX_PADDING;
    const by = this.boxY;
    const bw = this.boxW;
    const bh = BOX_HEIGHT;

    // 四角暗金方块（角花底座）
    const cSize = 14;
    g.fillStyle(0x92400E, 0.7);
    g.fillRect(bx, by, cSize, cSize);                    // 左上
    g.fillRect(bx + bw - cSize, by, cSize, cSize);        // 右上
    g.fillRect(bx, by + bh - cSize, cSize, cSize);        // 左下
    g.fillRect(bx + bw - cSize, by + bh - cSize, cSize, cSize); // 右下

    // 云纹像素块（阶梯状，每个角 2-3 个小方块）
    g.fillStyle(0x78350F, 0.6);
    // 左上内层
    g.fillRect(bx + 4, by + 4, 8, 4);
    g.fillRect(bx + 2, by + 4, 4, 8);
    // 右上内层
    g.fillRect(bx + bw - 12, by + 4, 8, 4);
    g.fillRect(bx + bw - 6, by + 4, 4, 8);
    // 左下内层
    g.fillRect(bx + 4, by + bh - 8, 8, 4);
    g.fillRect(bx + 2, by + bh - 12, 4, 8);
    // 右下内层
    g.fillRect(bx + bw - 12, by + bh - 8, 8, 4);
    g.fillRect(bx + bw - 6, by + bh - 12, 4, 8);

    this.container.add(g);
  }

  // ─────────────────────────────────────────────────
  // 绘制对话框 CRT 扫描线
  // ─────────────────────────────────────────────────
  private drawScanlines(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.06);
    for (let y = this.boxY + 4; y < this.boxY + BOX_HEIGHT - 4; y += 4) {
      g.fillRect(BOX_PADDING + 4, y, this.boxW - 8, 1);
    }
    this.container.add(g);
  }

  // ─────────────────────────────────────────────────
  // 隐藏对话框
  // ─────────────────────────────────────────────────
  hide(): void {
    if (!this._active) return;

    this._active = false;
    this._dialog = null;

    // 对话框滑出（暗角已并入容器，随容器一起动画）
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 20,
      duration: 200,
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
        this.updatePromptText();
      }
    }

    // 锁定状态闪烁提示
    if (locked) {
      const blink = Math.sin(this.scene.time.now / 300) > 0;
      this.promptText.setColor(blink ? '#EF4444' : '#991B1B');
      this.promptText.setText(`(${Math.ceil(this._dialog.firstPlayLockSec - this._lockTimer / 1000)})`);
    } else if (this._done) {
      // "▼" 呼吸闪烁
      const blink = (Math.sin(this.scene.time.now / 500) + 1) / 2;
      this.promptText.setAlpha(0.4 + blink * 0.6);
      this.updatePromptText();
    }

    // 不可跳过 + 读完 → 自动推进
    if (this._done && !locked && !this._dialog.skippable) {
      const dialogId = this._dialog.id;
      this.hide();
      this.bus.emit(GameEvent.DIALOG_END, { dialogId });
      return;
    }

    // 输入处理
    if (this.isSkipPressed()) {
      if (!this._done) {
        // 快进
        this._charIndex = this._fullText.length;
        this._showTimer = 0;
        this.bodyText.setText(this._fullText);
        this._done = true;
        this.updatePromptText();
      } else if (this._canSkip) {
        const dialogId = this._dialog!.id;
        this.hide();
        this.bus.emit(GameEvent.DIALOG_END, { dialogId });
      }
    }
  }

  // ─────────────────────────────────────────────────
  // 销毁
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
  // 内部辅助
  // ─────────────────────────────────────────────────
  private destroySkipKeys(): void {
    for (const k of this._skipKeys) k.destroy();
    this._skipKeys = [];
  }

  private cleanupElements(): void {
    this.container.removeAll(true);
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
    this.promptText.setText(this._canSkip ? '▼' : '⏳');
  }
}
