// ============================================================
// MainMenuScene.ts — 主菜单场景（Batch 10）
// 像素三国风格主菜单：标题 → 开始游戏 / 继续游戏
// Batch 11 热修复：修复"重置进度"二次确认无反应 Bug
//   根因：inputLocked=true 后 selectOption() 被自己拦截，
//         新增 _awaitingResetConfirm 标志绕过拦截。
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

/** 菜单按钮选项 */
interface MenuOption {
  text: string;
  action: () => void;
  y: number;
}

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuOptions: MenuOption[] = [];
  private selectedIndex = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private bgParticles: Phaser.GameObjects.Graphics[] = [];
  private hasSaveData = false;
  private versionText!: Phaser.GameObjects.Text;
  private inputLocked = false;
  private confirmResetTimer?: Phaser.Time.TimerEvent;
  /**
   * 正在等待"重置进度"二次确认。
   * 此状态下 Enter/Space/点击 不被 inputLocked 拦截，
   * 而是直接触发确认回调或取消。
   */
  private _awaitingResetConfirm = false;
  private _confirmResetCallback?: () => void;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ──────────────────────────────────────
  // create — 构建主菜单界面
  // ──────────────────────────────────────
  create(): void {
    // 1. 背景：深色渐变 + 星尘粒子
    this.drawBackground();

    // 2. 检查存档
    const saveSys = SaveSystem.getInstance();
    this.hasSaveData = saveSys.hasAnyProgress();

    // 3. 游戏标题（像素风）
    this.titleText = this.add.text(W / 2, 140, '七擒孟获', {
      fontSize: '56px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#dc2626',
      stroke: '#7f1d1d',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    // 标题呼吸动画
    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.95, to: 1 },
      duration: 1200,
      ease: 'Sine.easeOut',
    });

    // 4. 副标题
    this.subtitleText = this.add.text(W / 2, 200, '— 横版动作叙事游戏 —', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      delay: 600,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    // 5. 菜单选项构建
    this.buildMenuOptions(saveSys);

    // 6. 光标箭头（在菜单文字左侧）
    this.cursor = this.add.text(
      W / 2 - 130,
      this.menuOptions[this.selectedIndex].y,
      '> ',
      {
        fontSize: '20px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#22c55e',
      }
    ).setOrigin(0.5).setDepth(10);

    // 光标闪烁
    this.tweens.add({
      targets: this.cursor,
      alpha: { from: 0.4, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // 7. 版本信息
    this.versionText = this.add.text(W - 12, H - 12, 'v0.2-alpha', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#334155',
    }).setOrigin(1, 1).setDepth(10);

    // 8. 键盘输入
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => this.moveCursor(-1));
      this.input.keyboard.on('keydown-DOWN', () => this.moveCursor(1));
      this.input.keyboard.on('keydown-ENTER', () => this.selectOption());
      this.input.keyboard.on('keydown-SPACE', () => this.selectOption());
      // ESC：若在等待二次确认中，取消确认
      this.input.keyboard.on('keydown-ESC', () => this.cancelResetConfirm());
    }

    // 9. 鼠标点击支持
    this.optionTexts.forEach((txt, i) => {
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        // 等待确认期间禁止鼠标导航切换选项
        if (!this._awaitingResetConfirm) this.moveToIndex(i);
      });
      txt.on('pointerdown', () => this.selectOption());
    });

    // 10. 场景销毁时清理定时器
    this.events.on('shutdown', () => {
      if (this.confirmResetTimer) {
        this.confirmResetTimer.remove(false);
        this.confirmResetTimer = undefined;
      }
    });
  }

  // ──────────────────────────────────────
  // drawBackground — 绘制背景 + 粒子
  // ──────────────────────────────────────
  private drawBackground(): void {
    // 深色底
    this.cameras.main.setBackgroundColor('#0f131a');

    // 底部山峦剪影
    const mountains = this.add.graphics().setDepth(1);
    mountains.fillStyle(0x1a1f2e, 1);
    mountains.beginPath();
    mountains.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) {
      mountains.lineTo(x, H - 40 - Math.sin(x * 0.015) * 30 - Math.sin(x * 0.03) * 20);
    }
    mountains.lineTo(W, H);
    mountains.closePath();
    mountains.fillPath();

    // 远景山
    const farMtn = this.add.graphics().setDepth(0);
    farMtn.fillStyle(0x151a26, 1);
    farMtn.beginPath();
    farMtn.moveTo(0, H);
    for (let x = 0; x <= W; x += 50) {
      farMtn.lineTo(x, H - 60 - Math.cos(x * 0.008) * 50);
    }
    farMtn.lineTo(W, H);
    farMtn.closePath();
    farMtn.fillPath();

    // 星尘粒子
    for (let i = 0; i < 25; i++) {
      const star = this.add.graphics().setDepth(2);
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, H - 100);
      const sr = Phaser.Math.FloatBetween(0.8, 2.2);
      const sa = Phaser.Math.FloatBetween(0.3, 0.9);
      star.fillStyle(0xe2e8f0, sa);
      star.fillCircle(sx, sy, sr);
      this.bgParticles.push(star);

      // 微闪烁
      this.tweens.add({
        targets: star,
        alpha: { from: sa * 0.3, to: sa },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // ──────────────────────────────────────
  // buildMenuOptions — 构建菜单项列表
  // ──────────────────────────────────────
  private buildMenuOptions(saveSys: SaveSystem): void {
    const baseY = 300;
    const spacing = 52;

    this.menuOptions = [
      {
        text: '开始新旅程',
        action: () => this.startGame(),
        y: baseY,
      },
      {
        text: '继续游戏',
        action: () => this.continueGame(),
        y: baseY + spacing,
      },
      {
        text: '重置进度',
        action: () => this.confirmReset(),
        y: baseY + spacing * 2,
      },
    ];

    // 如果没有存档，"继续"变灰
    this.optionTexts = this.menuOptions.map((opt, i) => {
      const disabled = !this.hasSaveData && i === 1;
      return this.add.text(W / 2, opt.y, opt.text, {
        fontSize: '18px',
        fontFamily: '"Press Start 2P", monospace',
        color: disabled ? '#475569' : '#e2e8f0',
        stroke: disabled ? undefined : '#1e293b',
        strokeThickness: disabled ? 0 : 2,
      }).setOrigin(0.5).setDepth(10).setAlpha(0);
    });

    // 入场动画：逐行淡入
    this.optionTexts.forEach((txt, i) => {
      this.tweens.add({
        targets: txt,
        alpha: 1,
        y: txt.y - 6,
        duration: 400,
        delay: 900 + i * 120,
        ease: 'Back.easeOut',
      });
    });
  }

  // ──────────────────────────────────────
  // 光标导航
  // ──────────────────────────────────────
  private moveCursor(dir: number): void {
    // 等待二次确认时禁止切换选项
    if (this.inputLocked || this._awaitingResetConfirm) return;

    let newIndex = this.selectedIndex + dir;

    // 无存档时跳过"继续"
    if (!this.hasSaveData && newIndex === 1) {
      newIndex += dir;
    }

    if (newIndex < 0 || newIndex >= this.menuOptions.length) return;

    this.moveToIndex(newIndex);
  }

  private moveToIndex(index: number): void {
    if (!this.hasSaveData && index === 1) return; // 禁用项不可选

    this.selectedIndex = index;
    this.tweens.add({
      targets: this.cursor,
      y: this.menuOptions[index].y,
      duration: 120,
      ease: 'Back.easeOut',
    });

    // 高亮当前项文字
    this.optionTexts.forEach((txt, i) => {
      const targetColor = i === index ? '#22c55e' : (i === 1 && !this.hasSaveData ? '#475569' : '#e2e8f0');
      txt.setColor(targetColor);
    });
  }

  // ──────────────────────────────────────
  // selectOption — 执行选中操作
  // ──────────────────────────────────────
  private selectOption(): void {
    // ── 特殊情况：正在等待二次确认 ──
    // 此时不管 inputLocked，直接触发确认回调
    if (this._awaitingResetConfirm) {
      if (this._confirmResetCallback) {
        this._confirmResetCallback();
      }
      return;
    }

    // 正常情况
    if (this.inputLocked) return;

    const opt = this.menuOptions[this.selectedIndex];
    if (!opt) return;

    // 无存档时阻止选继续
    if (!this.hasSaveData && this.selectedIndex === 1) return;

    // 点击反馈动画
    this.tweens.add({
      targets: this.optionTexts[this.selectedIndex],
      scaleX: 0.92,
      scaleY: 0.92,
      yoyo: true,
      duration: 80,
      onComplete: () => opt.action(),
    });
  }

  // ──────────────────────────────────────
  // 场景跳转方法
  // ──────────────────────────────────────
  private startGame(): void {
    this.cameras.main.fadeOut(250, 15, 19, 26);
    this.time.delayedCall(260, () => {
      this.scene.start('Level1Scene');
    });
  }

  private continueGame(): void {
    if (!this.hasSaveData) return;
    // 继续游戏：直接进入 Level1Scene（后续可扩展到上次关卡）
    this.cameras.main.fadeOut(250, 15, 19, 26);
    this.time.delayedCall(260, () => {
      this.scene.start('Level1Scene');
    });
  }

  private confirmReset(): void {
    // ── 进入二次确认等待状态 ──
    this._awaitingResetConfirm = true;
    this.inputLocked = true; // 同时锁定，防止 pointerover 切换选项

    // 提示文字
    const confirmTxt = this.add.text(W / 2, H - 80, '确定要清除所有进度吗？(再按一次确认 / ESC 取消)', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ef4444',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({ targets: confirmTxt, alpha: 1, duration: 200 });

    // "重置进度"文字变红提示
    this.optionTexts[2]?.setColor('#ef4444');

    // ── 确认回调（二次 Enter/点击 触发）──
    const doReset = () => {
      this._awaitingResetConfirm = false;
      this._confirmResetCallback = undefined;

      if (this.confirmResetTimer) {
        this.confirmResetTimer.remove(false);
        this.confirmResetTimer = undefined;
      }

      if (confirmTxt.active) confirmTxt.destroy();

      const saveSys = SaveSystem.getInstance();
      saveSys.resetAll();

      this.inputLocked = false;

      // 重置后刷新菜单
      this.refreshMenu();
      console.log('[MainMenuScene] 🗑️ 重置进度完成');
    };

    this._confirmResetCallback = doReset;

    // 3 秒超时自动取消
    this.confirmResetTimer = this.time.delayedCall(3000, () => {
      this.cancelResetConfirm(confirmTxt);
    });
  }

  /** 取消重置确认（ESC 或超时） */
  private cancelResetConfirm(confirmTxtRef?: Phaser.GameObjects.Text): void {
    if (!this._awaitingResetConfirm) return;

    this._awaitingResetConfirm = false;
    this._confirmResetCallback = undefined;

    if (this.confirmResetTimer) {
      this.confirmResetTimer.remove(false);
      this.confirmResetTimer = undefined;
    }

    // 恢复"重置进度"文字颜色
    this.optionTexts[2]?.setColor('#e2e8f0');

    const target = confirmTxtRef ?? this.children.list.find(
      (c) => c instanceof Phaser.GameObjects.Text && (c as Phaser.GameObjects.Text).text.includes('清除所有进度')
    ) as Phaser.GameObjects.Text | undefined;

    if (target && target.active) {
      this.tweens.add({
        targets: target,
        alpha: 0,
        duration: 300,
        onComplete: () => (target as Phaser.GameObjects.Text).destroy(),
      });
    }

    this.inputLocked = false;
  }

  /** 刷新菜单状态（如重置后） */
  private refreshMenu(): void {
    this.hasSaveData = false;
    this.optionTexts.forEach((txt, i) => {
      if (i === 1) {
        txt.setColor('#475569');
      } else if (i === 2) {
        txt.setColor('#22c55e'); // 重置后光标仍在第 2 项，保持选中色
      }
    });
  }
}
