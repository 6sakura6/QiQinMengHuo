// ============================================================
// BossHealthBar.ts — Boss 血条 UI（Phase 3 像素三国风格重构）
// 屏幕顶部：金色 Boss 名称 + 红底血条 + 百分比
// ============================================================

import Phaser from 'phaser';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';
import { GAME_WIDTH } from '../config/constants';

// ─── 布局常量 ──────────────────────────────────────
const BAR_WIDTH   = 320;
const BAR_HEIGHT  = 12;
const BAR_X       = (GAME_WIDTH - BAR_WIDTH) / 2;
const BAR_Y       = 52;
const NAME_Y      = BAR_Y - 20;

// ─── Phase 3 颜色 ──────────────────────────────────
const COLOR_BG     = 0x192134;
const COLOR_FILL   = 0xDC2626;   // 朱砂红
const COLOR_NAME   = '#F59E0B';  // 琥珀金
const COLOR_BORDER = 0xDC2626;

export class BossHealthBar {
  private scene: Phaser.Scene;
  private bus = EventBus.getInstance();
  private _visible = false;

  // ── Graphics 对象 ────────────────────────────────
  private bgBar!: Phaser.GameObjects.Graphics;
  private fillBar!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;

  // ── 当前值 ───────────────────────────────────────
  private _currentHp = 0;
  private _maxHp     = 0;
  private _bossName  = '???';
  private _pulseTime = 0;       // 低血量闪烁计时器（毫秒）

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createElements();
    this.hide(); // 初始隐藏
    this.setupListeners();
  }

  // ─────────────────────────────────────────────────
  // 创建 UI 元素
  // ─────────────────────────────────────────────────
  private createElements(): void {
    const d = 200; // depth

    // 名称文字（Phase 3: 琥珀金像素体 + 黑色描边）
    this.nameText = this.scene.add.text(BAR_X + BAR_WIDTH / 2, NAME_Y, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: COLOR_NAME,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.nameText.setOrigin(0.5, 0);
    this.nameText.setDepth(d);
    this.nameText.setScrollFactor(0);

    // 背景条（暗）
    this.bgBar = this.scene.add.graphics();
    this.bgBar.setDepth(d);
    this.bgBar.setScrollFactor(0);

    // 填充条（红）
    this.fillBar = this.scene.add.graphics();
    this.fillBar.setDepth(d + 1);
    this.fillBar.setScrollFactor(0);

    // 百分比文字
    this.hpText = this.scene.add.text(
      BAR_X + BAR_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2,
      '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      },
    );
    this.hpText.setOrigin(0.5, 0.5);
    this.hpText.setDepth(d + 2);
    this.hpText.setScrollFactor(0);
  }

  // ─────────────────────────────────────────────────
  // 事件监听
  // ─────────────────────────────────────────────────
  private setupListeners(): void {
    this.bus.on(GameEvent.BOSS_HP_CHANGED, this.onBossHpChanged, this);
    // Boss 击败后隐藏血条
    this.bus.on(GameEvent.BOSS_DEFEATED, this.onBossDefeated, this);
  }

  // ─────────────────────────────────────────────────
  // HP 变化回调
  // ─────────────────────────────────────────────────
  private onBossHpChanged(payload: unknown): void {
    const p = payload as { currentHp: number; maxHp: number };
    this._currentHp = p.currentHp;
    this._maxHp     = p.maxHp;
    this._bossName  = '孟获·骑象';

    // 首次收到 HP 事件 → 显示血条
    if (!this._visible) {
      this.show();
    }

    this.redraw();
  }

  private onBossDefeated(_payload: unknown): void {
    this.hide();
  }

  // ─────────────────────────────────────────────────
  // 重绘
  // ─────────────────────────────────────────────────
  private redraw(): void {
    const pct = this._maxHp > 0 ? this._currentHp / this._maxHp : 0;
    const fillW = Math.max(0, Math.floor(BAR_WIDTH * pct));

    // 名称
    this.nameText.setText(this._bossName);

    // 背景条（Phase 3: 深底 + 红边框）
    this.bgBar.clear();
    this.bgBar.fillStyle(COLOR_BG, 0.9);
    this.bgBar.fillRect(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
    this.bgBar.lineStyle(3, COLOR_BORDER, 1);
    this.bgBar.strokeRect(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT);

    // 填充条 — 三段色阶
    this.fillBar.clear();
    let color: number;
    if (pct > 0.5) {
      color = 0xDC2626;          // 朱砂红
    } else if (pct > 0.25) {
      color = 0xF59E0B;          // 琥珀金（警告）
    } else {
      color = 0xEF4444;          // 亮红（危险）
    }
    const alpha = pct <= 0.3 ? 0.7 + 0.3 * Math.sin(this._pulseTime / 150) : 1;
    this.fillBar.fillStyle(color, alpha);
    this.fillBar.fillRect(BAR_X, BAR_Y, fillW, BAR_HEIGHT);

    // 百分比文字
    this.hpText.setText(`${Math.ceil(pct * 100)}%`);
  }

  // ─────────────────────────────────────────────────
  // 逐帧更新低血量闪烁（由 Scene.update 调用）
  // 仅在血条可见且 HP ≤ 30% 时执行重绘
  // ─────────────────────────────────────────────────
  pulse(delta: number): void {
    if (!this._visible) return;
    const pct = this._maxHp > 0 ? this._currentHp / this._maxHp : 0;
    if (pct > 0.3) return;
    this._pulseTime += delta;
    // 仅更新 fillBar 的 alpha，不重绘文字/背景（避免闪烁时的视觉跳动）
    const alpha = 0.7 + 0.3 * Math.sin(this._pulseTime / 150);
    this.fillBar.setAlpha(alpha);
  }

  // ─────────────────────────────────────────────────
  // 显隐控制
  // ─────────────────────────────────────────────────
  private show(): void {
    this._visible = true;
    this.fillBar.setAlpha(1);  // 重置闪烁残留
    this.nameText.setVisible(true);
    this.bgBar.setVisible(true);
    this.fillBar.setVisible(true);
    this.hpText.setVisible(true);
  }

  private hide(): void {
    this._visible = false;
    this.nameText.setVisible(false);
    this.bgBar.setVisible(false);
    this.fillBar.setVisible(false);
    this.hpText.setVisible(false);
  }

  // ─────────────────────────────────────────────────
  // 销毁
  // ─────────────────────────────────────────────────
  destroy(): void {
    this.bus.off(GameEvent.BOSS_HP_CHANGED, this.onBossHpChanged, this);
    this.bus.off(GameEvent.BOSS_DEFEATED, this.onBossDefeated, this);
    this.nameText?.destroy();
    this.bgBar?.destroy();
    this.fillBar?.destroy();
    this.hpText?.destroy();
  }
}
