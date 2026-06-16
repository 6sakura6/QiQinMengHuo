// ============================================================
// HUD.ts — 游戏内抬头显示（Batch 4）
// 职责：血条、武器冷却、敌人数、分数、操作提示
// 架构：所有元素 setScrollFactor(0)，固定于屏幕
//       update() 接收 Scene 传入的最新数据
// ============================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

// ─── 布局常量 ────────────────────────────────────────
const HP_BAR_X      = 16;
const HP_BAR_Y      = 16;
const HP_BAR_W      = 160;
const HP_BAR_H      = 18;
const HP_BAR_RADIUS = 5;

const CD_BAR_X      = 16;
const CD_BAR_Y      = 40;
const CD_BAR_W      = 160;
const CD_BAR_H      = 8;
const CD_BAR_RADIUS = 3;

const COUNTER_X     = GAME_WIDTH - 100;
const COUNTER_Y     = 16;

const SCORE_X       = GAME_WIDTH - 100;
const SCORE_Y       = 40;

const HINT_X        = 10;
const HINT_Y        = GAME_HEIGHT - 20;

// ─── 颜色 ────────────────────────────────────────────
const COLOR_BG      = 0x000000;
const COLOR_HP_BG   = 0x440000;
const COLOR_HP_FILL = 0x33dd55;   // 健康绿
const COLOR_HP_MID  = 0xddaa33;   // 半血橙
const COLOR_HP_LOW  = 0xdd3333;   // 濒血红
const COLOR_CD_EMPTY = 0x222222;
const COLOR_CD_FILL  = 0xffaa00;
const COLOR_TEXT    = '#ddeeff';
const COLOR_HINT    = '#556677';
const COLOR_ENEMY   = '#ff8866';

/** 每帧更新所需数据 */
export interface HUDData {
  hp: number;
  maxHp: number;
  cooldownPercent: number;
  liveEnemies: number;
  totalEnemies: number;
  score: number;
}

export class HUD {
  // ── 血条 ──
  private hpBg!: Phaser.GameObjects.Graphics;
  private hpFill!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;

  // ── 冷却条 ──
  private cdBg!: Phaser.GameObjects.Graphics;
  private cdFill!: Phaser.GameObjects.Graphics;

  // ── 文字 ──
  private enemyText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  // ── 缓存（避免无效重绘） ──
  private _lastHpPct    = -1;
  private _lastCdPct    = -1;
  private _lastEnemies  = -1;
  private _lastScore    = -1;

  constructor(private scene: Phaser.Scene) {
    this.create();
  }

  // ─────────────────────────────────────────────────
  // 创建所有 UI 元素
  // ─────────────────────────────────────────────────
  private create(): void {
    const depth = 200;

    // ── 血条背景 ──
    this.hpBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth);
    this.hpBg.fillStyle(COLOR_HP_BG, 0.8);
    this.hpBg.fillRoundedRect(HP_BAR_X, HP_BAR_Y, HP_BAR_W, HP_BAR_H, HP_BAR_RADIUS);

    // ── 血条填充 ──
    this.hpFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    // ── HP 文字 ──
    this.hpLabel = this.scene.add.text(
      HP_BAR_X + HP_BAR_W / 2, HP_BAR_Y + HP_BAR_H / 2,
      '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // ── 冷却条背景 ──
    this.cdBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth);
    this.cdBg.fillStyle(COLOR_CD_EMPTY, 0.6);
    this.cdBg.fillRoundedRect(CD_BAR_X, CD_BAR_Y, CD_BAR_W, CD_BAR_H, CD_BAR_RADIUS);

    // ── 冷却条填充 ──
    this.cdFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    // ── 敌人数 ──
    this.enemyText = this.scene.add.text(
      COUNTER_X, COUNTER_Y, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: COLOR_ENEMY,
      },
    ).setScrollFactor(0).setDepth(depth);

    // ── 分数 ──
    this.scoreText = this.scene.add.text(
      SCORE_X, SCORE_Y, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLOR_TEXT,
      },
    ).setScrollFactor(0).setDepth(depth);

    // ── 操作提示 ──
    this.hintText = this.scene.add.text(
      HINT_X, HINT_Y,
      'A/D / ← → 移动 | Space / W / ↑ 跳跃 | J / Z 射击（八方向弩箭）', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: COLOR_HINT,
      },
    ).setScrollFactor(0).setDepth(depth);
  }

  // ─────────────────────────────────────────────────
  // 每帧更新（仅重绘变化的部分）
  // ─────────────────────────────────────────────────
  update(data: HUDData): void {
    const hpPct   = data.maxHp > 0 ? data.hp / data.maxHp : 0;
    const cdPct   = 1 - data.cooldownPercent;
    const enemies = data.liveEnemies;

    // ── 血条 ──
    if (hpPct !== this._lastHpPct) {
      this._lastHpPct = hpPct;
      this.drawHpBar(hpPct);
      this.hpLabel.setText(`HP  ${data.hp} / ${data.maxHp}`);
    }

    // ── 冷却条 ──
    if (cdPct !== this._lastCdPct) {
      this._lastCdPct = cdPct;
      this.drawCdBar(cdPct);
    }

    // ── 敌人数 ──
    if (enemies !== this._lastEnemies) {
      this._lastEnemies = enemies;
      this.enemyText.setText(
        `👥 ${enemies} / ${data.totalEnemies}`,
      );
    }

    // ── 分数 ──
    if (data.score !== this._lastScore) {
      this._lastScore = data.score;
      this.scoreText.setText(`⭐ ${data.score}`);
    }
  }

  // ─────────────────────────────────────────────────
  // 血条绘制
  // ─────────────────────────────────────────────────
  private drawHpBar(pct: number): void {
    const g = this.hpFill;
    g.clear();

    const w = Math.max(0, HP_BAR_W * pct);
    if (w <= 0) return;

    // 渐变色：绿 → 橙 → 红
    let color: number;
    if (pct > 0.5) {
      color = COLOR_HP_FILL;
    } else if (pct > 0.25) {
      color = COLOR_HP_MID;
    } else {
      color = COLOR_HP_LOW;
    }

    g.fillStyle(color, 0.9);
    g.fillRoundedRect(HP_BAR_X, HP_BAR_Y, w, HP_BAR_H, HP_BAR_RADIUS);

    // 满血微微发光
    if (pct > 0.9) {
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(HP_BAR_X, HP_BAR_Y, w, HP_BAR_H, HP_BAR_RADIUS);
    }
  }

  // ─────────────────────────────────────────────────
  // 冷却条绘制
  // ─────────────────────────────────────────────────
  private drawCdBar(pct: number): void {
    const g = this.cdFill;
    g.clear();

    const w = Math.max(0, CD_BAR_W * pct);
    if (w <= 0) return;

    const alpha = pct >= 1 ? 1 : 0.7;
    g.fillStyle(COLOR_CD_FILL, alpha);
    g.fillRoundedRect(CD_BAR_X, CD_BAR_Y, w, CD_BAR_H, CD_BAR_RADIUS);
  }

  // ─────────────────────────────────────────────────
  // 销毁
  // ─────────────────────────────────────────────────
  destroy(): void {
    this.hpBg?.destroy();
    this.hpFill?.destroy();
    this.hpLabel?.destroy();
    this.cdBg?.destroy();
    this.cdFill?.destroy();
    this.enemyText?.destroy();
    this.scoreText?.destroy();
    this.hintText?.destroy();
  }
}
