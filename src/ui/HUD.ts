// ============================================================
// HUD.ts — 游戏内抬头显示（Phase 3 像素三国风格重构）
// 血条（红）、弹药冷却（绿）、敌人数、分数、操作提示
// ============================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

// ─── 布局常量 ────────────────────────────────────────
const HP_BAR_X      = 16;
const HP_BAR_Y      = 16;
const HP_BAR_W      = 180;
const HP_BAR_H      = 18;

const CD_BAR_X      = 16;
const CD_BAR_Y      = 38;
const CD_BAR_W      = 180;
const CD_BAR_H      = 6;

const AMMO_X        = GAME_WIDTH - 136;
const AMMO_Y        = 16;

const COUNTER_X     = GAME_WIDTH - 80;
const COUNTER_Y     = 16;

const SCORE_X       = GAME_WIDTH - 80;
const SCORE_Y       = 36;

const HINT_X        = 10;
const HINT_Y        = GAME_HEIGHT - 16;

// ─── Phase 3 设计颜色 ────────────────────────────────
const COLOR_BG      = 0x192134;   // 深藏青面板
const COLOR_HP_BG   = 0x192134;   // 血条背景
const COLOR_HP_FILL = 0xEF4444;   // 亮红 HP
const COLOR_HP_BORDER = 0xEF4444;
const COLOR_CD_BG   = 0x192134;   // 冷却背景
const COLOR_CD_FILL = 0x22C55E;   // 翠绿冷却
const COLOR_CD_BORDER = 0x22C55E;
const COLOR_AMMO_FILL = 0x22C55E;
const COLOR_TEXT    = '#FEF3C7';  // 奶油白
const COLOR_LABEL   = '#94A3B8';  // 灰蓝标签
const COLOR_HINT    = '#475569';  // 提示文字
const COLOR_ENEMY   = '#F59E0B';  // 琥珀金敌人

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
  private hpText!: Phaser.GameObjects.Text;

  // ── 弹药/武器 ──
  private ammoLabel!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;

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
  // 创建所有 UI 元素（Phase 3 像素风格）
  // ─────────────────────────────────────────────────
  private create(): void {
    const depth = 200;

    // ── 血条背景 + 像素边框 ──
    this.hpBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth);
    this.hpBg.fillStyle(COLOR_HP_BG, 0.9);
    this.hpBg.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_W, HP_BAR_H);
    this.hpBg.lineStyle(3, COLOR_HP_BORDER, 1);
    this.hpBg.strokeRect(HP_BAR_X, HP_BAR_Y, HP_BAR_W, HP_BAR_H);

    // ── 血条填充 ──
    this.hpFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    // ── HP 标签 ──
    this.hpLabel = this.scene.add.text(
      HP_BAR_X + 6, HP_BAR_Y - 2,
      'HP', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#EF4444',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 2);

    // ── HP 数值（血条内居中） ──
    this.hpText = this.scene.add.text(
      HP_BAR_X + HP_BAR_W / 2, HP_BAR_Y + HP_BAR_H / 2,
      '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: COLOR_TEXT,
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // ── 弹药/武器区 ──
    this.ammoLabel = this.scene.add.text(
      AMMO_X, AMMO_Y - 2,
      '武器', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#22C55E',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    
    this.ammoText = this.scene.add.text(
      AMMO_X + 28, AMMO_Y + 8,
      '弩', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#22C55E',
      },
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);

    // ── 冷却条背景 ──
    this.cdBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth);
    this.cdBg.fillStyle(COLOR_CD_BG, 0.8);
    this.cdBg.fillRect(CD_BAR_X, CD_BAR_Y, CD_BAR_W, CD_BAR_H);
    this.cdBg.lineStyle(2, COLOR_CD_BORDER, 1);
    this.cdBg.strokeRect(CD_BAR_X, CD_BAR_Y, CD_BAR_W, CD_BAR_H);

    // ── 冷却条填充 ──
    this.cdFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    // ── 敌人数 ──
    this.enemyText = this.scene.add.text(
      COUNTER_X, COUNTER_Y, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: COLOR_ENEMY,
      },
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

    // ── 分数 ──
    this.scoreText = this.scene.add.text(
      SCORE_X, SCORE_Y, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: COLOR_LABEL,
      },
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

    // ── 操作提示 ──
    this.hintText = this.scene.add.text(
      HINT_X, HINT_Y,
      'AD 移动 | W 跳跃 | J 射击', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: COLOR_HINT,
      },
    ).setOrigin(0, 1).setScrollFactor(0).setDepth(depth);
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
      this.hpText.setText(`${data.hp}/${data.maxHp}`);
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
        `敌 ${enemies}/${data.totalEnemies}`,
      );
    }

    // ── 分数 ──
    if (data.score !== this._lastScore) {
      this._lastScore = data.score;
      this.scoreText.setText(`分 ${data.score}`);
    }
  }

  // ─────────────────────────────────────────────────
  // 血条绘制（像素风直边）
  // ─────────────────────────────────────────────────
  private drawHpBar(pct: number): void {
    const g = this.hpFill;
    g.clear();

    const w = Math.max(0, Math.floor(HP_BAR_W * pct));
    if (w <= 0) return;

    // 三段色：翠绿 > 琥珀金 > 亮红
    let color: number;
    if (pct > 0.5) {
      color = 0x22C55E;
    } else if (pct > 0.25) {
      color = 0xF59E0B;
    } else {
      color = 0xEF4444;
    }

    g.fillStyle(color, 0.95);
    g.fillRect(HP_BAR_X, HP_BAR_Y, w, HP_BAR_H);

    // 满血微光泽
    if (pct > 0.85) {
      g.fillStyle(0xFFFFFF, 0.1);
      g.fillRect(HP_BAR_X, HP_BAR_Y, w, HP_BAR_H / 2);
    }
  }

  // ─────────────────────────────────────────────────
  // 冷却条绘制（像素风直边）
  // ─────────────────────────────────────────────────
  private drawCdBar(pct: number): void {
    const g = this.cdFill;
    g.clear();

    const w = Math.max(0, Math.floor(CD_BAR_W * pct));
    if (w <= 0) return;

    g.fillStyle(COLOR_CD_FILL, pct >= 1 ? 1 : 0.7);
    g.fillRect(CD_BAR_X, CD_BAR_Y, w, CD_BAR_H);
  }

  // ─────────────────────────────────────────────────
  // 销毁
  // ─────────────────────────────────────────────────
  destroy(): void {
    this.hpBg?.destroy();
    this.hpFill?.destroy();
    this.hpLabel?.destroy();
    this.hpText?.destroy();
    this.ammoLabel?.destroy();
    this.ammoText?.destroy();
    this.cdBg?.destroy();
    this.cdFill?.destroy();
    this.enemyText?.destroy();
    this.scoreText?.destroy();
    this.hintText?.destroy();
  }
}
