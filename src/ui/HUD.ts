// ============================================================
// HUD.ts — 游戏内抬头显示（02-game-hud 参考图重构版）
//
// 布局（960×540）：
//   ┌──────────────┐   第壹关 — 西洱河初战   ┌───────┐
//   │ 玩家面板      │                        │ 小地图 │  y=10
//   │ 头像 HP ∞    │                        │       │
//   └──────────────┘                        └───────┘
//
//                     GAMEPLAY AREA
//
//   AD移动 W跳跃 J射击            ┌──────────────┐
//                                  │  武器面板      │  y=480
//                                  │  连弩  ████   │
//                                  └──────────────┘
//
// 全屏叠加：CRT扫描线 + 轻微暗角（不阻碍可读性）
// ============================================================

import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../config/constants';

// ─── 布局常量（960×540）───────────────────────────
// 玩家面板
const PANEL_X        = 8;
const PANEL_Y        = 8;
const PANEL_W        = 200;
const PANEL_H        = 74;
const PORTRAIT_X     = PANEL_X + 8;
const PORTRAIT_Y     = PANEL_Y + 8;
const PORTRAIT_S     = 52;          // 头像正方形边长
const HP_BAR_X       = PORTRAIT_X + PORTRAIT_S + 10;
const HP_BAR_Y       = PANEL_Y + 14;
const HP_BAR_W       = 118;
const HP_BAR_H       = 14;
const HP_SEG_COUNT   = 8;           // 分段数
const AMMO_X         = HP_BAR_X;
const AMMO_Y         = HP_BAR_Y + HP_BAR_H + 10;

// 关卡标题
const TITLE_X        = GAME_WIDTH / 2;
const TITLE_Y        = 8;

// 小地图
const MAP_X          = GAME_WIDTH - 198;
const MAP_Y          = 8;
const MAP_W          = 190;
const MAP_H          = 74;

// 武器面板
const WP_X           = GAME_WIDTH - 228;
const WP_Y           = GAME_HEIGHT - 66;
const WP_W           = 218;
const WP_H           = 58;

// 操作提示
const HINT_X         = 10;
const HINT_Y         = GAME_HEIGHT - 12;

// ─── 参考图色板 ───────────────────────────────────
const C_PANEL_BG     = 0x1E293B;   // 深藏青面板
const C_DARK_WOOD    = 0x1C1917;   // 深木底色
const C_BORDER       = 0xDC2626;   // 朱砂红边框
const C_BORDER_INNER = 0xB91C1C;   // 内框暗红
const C_GOLD         = 0xF59E0B;   // 琥珀金
const C_GOLD_LIGHT   = 0xFBBF24;   // 金色高光
const C_HP_FILL      = 0xEF4444;   // 亮红 HP
const C_HP_LOW       = 0xDC2626;   // 朱砂红 HP
const C_GREEN        = 0x22C55E;   // 翠绿
const C_CREAM        = '#FEF3C7';  // 奶油白正文
const C_LABEL        = '#94A3B8';  // 灰蓝标签
const C_HINT         = '#475569';  // 提示灰
const C_MAP_BG       = 0x334155;   // 小地图底
const C_MAP_WATER    = 0x3B82F6;   // 河流蓝
const C_MAP_PLAYER   = 0x22C55E;   // 玩家绿点
const C_MAP_ENEMY    = 0xEF4444;   // 敌红点
const C_MAP_PATH     = 0x64748B;   // 地形线灰
const C_SCANLINE     = 0x000000;   // 扫描线

// ─── 深度层级 ─────────────────────────────────────
const DEPTH_PANEL    = 210;
const DEPTH_MAP      = 210;
const DEPTH_WEAPON   = 210;
const DEPTH_SCANLINE = 195;
const DEPTH_VIGNETTE = 196;

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
  private scene: Phaser.Scene;

  // ── 玩家面板 ──
  private panelBg!: Phaser.GameObjects.Graphics;
  private portraitGfx!: Phaser.GameObjects.Graphics;
  private hpBg!: Phaser.GameObjects.Graphics;
  private hpFill!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private ammoIcon!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;

  // ── 关卡标题 ──
  private titleText!: Phaser.GameObjects.Text;
  private titleUnderline!: Phaser.GameObjects.Graphics;

  // ── 小地图 ──
  private mapBg!: Phaser.GameObjects.Graphics;
  private mapDots!: Phaser.GameObjects.Graphics;
  private mapLabel!: Phaser.GameObjects.Text;

  // ── 武器面板 ──
  private wpBg!: Phaser.GameObjects.Graphics;
  private wpIcon!: Phaser.GameObjects.Graphics;
  private wpLabel!: Phaser.GameObjects.Text;
  private wpName!: Phaser.GameObjects.Text;
  private wpChargeBg!: Phaser.GameObjects.Graphics;
  private wpChargeFill!: Phaser.GameObjects.Graphics;

  // ── 操作提示 ──
  private hintText!: Phaser.GameObjects.Text;

  // ── 全屏特效 ──
  private scanlines!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;

  // ── 缓存 ──
  private _lastHpPct    = -1;
  private _lastCdPct    = -1;
  private _lastEnemies  = -1;
  private _lastScore    = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  // ═════════════════════════════════════════════════
  // 创建全部六区 + 特效
  // ═════════════════════════════════════════════════
  private create(): void {
    this.createVignette();
    this.createScanlines();
    this.createPlayerPanel();
    this.createLevelTitle();
    this.createMiniMap();
    this.createWeaponPanel();
    this.createHints();
  }

  // ─────────────────────────────────────────────────
  // 1. 全屏暗角（极淡，不挡文字）
  // ─────────────────────────────────────────────────
  private createVignette(): void {
    const g = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_VIGNETTE);

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // 四角渐变 — 仅边缘微暗
    // 顶部
    for (let i = 0; i < 6; i++) {
      const a = 0.10 - i * 0.015;
      g.fillStyle(C_SCANLINE, Math.max(0, a));
      g.fillRect(0, i * 4, w, 4);
    }
    // 底部
    for (let i = 0; i < 4; i++) {
      const a = 0.08 - i * 0.02;
      g.fillStyle(C_SCANLINE, Math.max(0, a));
      g.fillRect(0, h - 4 - i * 4, w, 4);
    }
    // 左侧
    for (let i = 0; i < 3; i++) {
      g.fillStyle(C_SCANLINE, 0.05 - i * 0.015);
      g.fillRect(i * 4, 0, 4, h);
    }
    // 右侧
    for (let i = 0; i < 3; i++) {
      g.fillStyle(C_SCANLINE, 0.05 - i * 0.015);
      g.fillRect(w - 4 - i * 4, 0, 4, h);
    }

    this.vignette = g;
  }

  // ─────────────────────────────────────────────────
  // 2. CRT 扫描线（每 3 行一条，极淡）
  // ─────────────────────────────────────────────────
  private createScanlines(): void {
    const g = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_SCANLINE);

    g.fillStyle(C_SCANLINE, 0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      g.fillRect(0, y, GAME_WIDTH, 1);
    }

    this.scanlines = g;
  }

  // ─────────────────────────────────────────────────
  // 3. 左上玩家面板
  // ─────────────────────────────────────────────────
  private createPlayerPanel(): void {
    // 面板背景 + 朱砂红双线边框
    this.panelBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_PANEL);

    this.panelBg.fillStyle(C_PANEL_BG, 0.92);
    this.panelBg.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // 外框 3px 朱砂红
    this.panelBg.lineStyle(3, C_BORDER, 1);
    this.panelBg.strokeRect(PANEL_X - 1, PANEL_Y - 1, PANEL_W + 2, PANEL_H + 2);

    // 内框 1px 暗红（间距 3px）
    this.panelBg.lineStyle(1, C_BORDER_INNER, 0.8);
    this.panelBg.strokeRect(PANEL_X + 3, PANEL_Y + 3, PANEL_W - 6, PANEL_H - 6);

    // 顶部金色装饰线
    this.panelBg.lineStyle(1, C_GOLD, 0.5);
    this.panelBg.lineBetween(
      PANEL_X + 10, PANEL_Y + 5,
      PANEL_X + PANEL_W - 10, PANEL_Y + 5,
    );

    // 像素头像（Graphics 绘制）
    this.portraitGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_PANEL + 2);
    this.drawPlayerPortrait(this.portraitGfx, PORTRAIT_X, PORTRAIT_Y);

    // 头像金框
    this.panelBg.lineStyle(2, C_GOLD, 0.7);
    this.panelBg.strokeRect(
      PORTRAIT_X - 2, PORTRAIT_Y - 2,
      PORTRAIT_S + 4, PORTRAIT_S + 4,
    );

    // HP 标签（VT323 在 12px 清晰可读）
    this.hpLabel = this.scene.add.text(
      HP_BAR_X, HP_BAR_Y - 14,
      'HP', {
        fontFamily: '"VT323", "Press Start 2P", monospace',
        fontSize: '12px',
        color: '#EF4444',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_PANEL + 3);

    // HP 背景条
    this.hpBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_PANEL + 1);
    this.hpBg.fillStyle(0x0F172A, 0.9);
    this.hpBg.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_W, HP_BAR_H);
    this.hpBg.lineStyle(1, C_BORDER, 0.5);
    this.hpBg.strokeRect(HP_BAR_X, HP_BAR_Y, HP_BAR_W, HP_BAR_H);

    // HP 填充
    this.hpFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_PANEL + 2);

    // HP 数值文字
    this.hpText = this.scene.add.text(
      HP_BAR_X + HP_BAR_W / 2, HP_BAR_Y + HP_BAR_H / 2,
      '', {
        fontFamily: '"VT323", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: C_CREAM,
      },
    ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(DEPTH_PANEL + 4);

    // 弹药 "∞" 图标
    this.ammoIcon = this.scene.add.text(
      AMMO_X, AMMO_Y,
      '∞', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '15px',
        color: '#22C55E',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_PANEL + 2);

    // 弹药标签
    this.ammoText = this.scene.add.text(
      AMMO_X + 24, AMMO_Y + 4,
      '弹药', {
        fontFamily: '"VT323", "Press Start 2P", monospace',
        fontSize: '10px',
        color: C_LABEL,
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_PANEL + 3);
  }

  // ─────────────────────────────────────────────────
  // 像素士兵头像（48×48 区域，8px 网格）
  // ─────────────────────────────────────────────────
  private drawPlayerPortrait(g: Phaser.GameObjects.Graphics, ox: number, oy: number): void {
    const S = PORTRAIT_S; // 52
    const BOX = 8; // 像素块大小

    // 背景（深藏青）
    g.fillStyle(0x1E293B, 1);
    g.fillRect(ox, oy, S, S);

    // 头盔顶 (y=0~6)
    g.fillStyle(0x475569);
    g.fillRect(ox + 4,  oy + 0,  S - 8, BOX - 2);
    g.fillRect(ox + 2,  oy + 6,  S - 4, 4);

    // 面部皮肤
    g.fillStyle(0xE8C884);
    g.fillRect(ox + 6,  oy + 10, S - 12, 20);

    // 头盔前沿 + 护耳
    g.fillStyle(0x334155);
    g.fillRect(ox + 4,  oy + 8,  S - 8, 4);
    g.fillRect(ox + 2,  oy + 8,  6, 12);
    g.fillRect(ox + S - 8, oy + 8,  6, 12);

    // 眼睛
    g.fillStyle(0x1C1917);
    g.fillRect(ox + 12, oy + 14, 6, 3);
    g.fillRect(ox + S - 18, oy + 14, 6, 3);

    // 眉毛（浓）
    g.fillStyle(0x1C1917);
    g.fillRect(ox + 10, oy + 12, 10, 2);
    g.fillRect(ox + S - 20, oy + 12, 10, 2);

    // 红色额带（横过额头）
    g.fillStyle(C_BORDER);
    g.fillRect(ox + 4,  oy + 24, S - 8, 5);

    // 额带飘带（右侧垂下）
    g.fillRect(ox + S - 10, oy + 24, 4, 12);

    // 下巴 / 胡子区域
    g.fillStyle(0xD4A86C);
    g.fillRect(ox + 8,  oy + 30, S - 16, 4);

    // 领口铠甲（鳞甲片）
    g.fillStyle(0x64748B);
    g.fillRect(ox + 4,  oy + 34, S - 8, 6);
    // 甲片分割线
    g.fillStyle(0x475569);
    g.fillRect(ox + 12, oy + 35, 2, 4);
    g.fillRect(ox + 20, oy + 35, 2, 4);
    g.fillRect(ox + 28, oy + 35, 2, 4);
    g.fillRect(ox + 36, oy + 35, 2, 4);

    // 胸部甲片（下层）
    g.fillStyle(0x94A3B8);
    g.fillRect(ox + 6,  oy + 40, S - 12, 4);
    g.fillStyle(0x64748B);
    g.fillRect(ox + 8,  oy + 44, S - 16, 4);
  }

  // ─────────────────────────────────────────────────
  // 4. 关卡标题
  // ─────────────────────────────────────────────────
  private createLevelTitle(): void {
    this.titleText = this.scene.add.text(
      TITLE_X, TITLE_Y,
      '第壹关 — 西洱河初战', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#F59E0B',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH_PANEL);

    // 底部金色装饰短线（适配更大的标题字号）
    this.titleUnderline = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_PANEL);
    this.titleUnderline.lineStyle(1, C_GOLD, 0.5);
    this.titleUnderline.lineBetween(
      TITLE_X - 110, TITLE_Y + 26,
      TITLE_X + 110, TITLE_Y + 26,
    );
    // 两端小菱形点
    this.titleUnderline.fillStyle(C_GOLD, 0.7);
    this.titleUnderline.fillRect(TITLE_X - 113, TITLE_Y + 24, 4, 4);
    this.titleUnderline.fillRect(TITLE_X + 109, TITLE_Y + 24, 4, 4);
  }

  // ─────────────────────────────────────────────────
  // 5. 右上小地图
  // ─────────────────────────────────────────────────
  private createMiniMap(): void {
    // 面板背景
    this.mapBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_MAP);

    this.mapBg.fillStyle(C_MAP_BG, 0.9);
    this.mapBg.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);

    // 朱砂红边框
    this.mapBg.lineStyle(2, C_BORDER, 0.7);
    this.mapBg.strokeRect(MAP_X, MAP_Y, MAP_W, MAP_H);

    // 标题
    this.mapLabel = this.scene.add.text(
      MAP_X + 6, MAP_Y + 3,
      '地图', {
        fontFamily: '"VT323", "Press Start 2P", monospace',
        fontSize: '10px',
        color: '#F59E0B',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_MAP + 2);

    // 地图地形（绘制地形线、河流、标记点）
    this.mapDots = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_MAP + 1);
    this.drawMapTerrain();

    // 网格背景线（极淡）
    this.mapBg.lineStyle(1, 0x475569, 0.15);
    for (let gx = MAP_X; gx <= MAP_X + MAP_W; gx += 16) {
      this.mapBg.lineBetween(gx, MAP_Y, gx, MAP_Y + MAP_H);
    }
    for (let gy = MAP_Y; gy <= MAP_Y + MAP_H; gy += 16) {
      this.mapBg.lineBetween(MAP_X, gy, MAP_X + MAP_W, gy);
    }
  }

  private drawMapTerrain(): void {
    const g = this.mapDots;
    const ox = MAP_X + 4;
    const oy = MAP_Y + 16;
    const mw = MAP_W - 8;
    const mh = MAP_H - 20;

    // 地形轮廓线（简化山脉）
    g.lineStyle(2, C_MAP_PATH, 0.6);
    // 上边缘山脉
    g.lineBetween(ox, oy + 6, ox + 30, oy + 2);
    g.lineBetween(ox + 30, oy + 2, ox + 60, oy + 8);
    g.lineBetween(ox + 60, oy + 8, ox + 100, oy + 4);
    g.lineBetween(ox + 100, oy + 4, ox + mw, oy + 6);

    // 下边缘山脉
    g.lineBetween(ox, oy + mh - 4, ox + 40, oy + mh - 8);
    g.lineBetween(ox + 40, oy + mh - 8, ox + 80, oy + mh - 2);
    g.lineBetween(ox + 80, oy + mh - 2, ox + mw, oy + mh - 5);

    // 中部战场路径虚线
    g.lineStyle(1, C_MAP_PATH, 0.3);
    const midY = oy + mh / 2;
    for (let px = ox + 10; px < ox + mw - 10; px += 12) {
      g.fillStyle(C_MAP_PATH, 0.3);
      g.fillRect(px, midY, 6, 1);
    }

    // 河流（蓝色波浪条）
    g.lineStyle(2, C_MAP_WATER, 0.7);
    const riverY = oy + mh * 0.65;
    g.lineBetween(ox + 20, riverY - 4, ox + 50, riverY);
    g.lineBetween(ox + 50, riverY, ox + 90, riverY + 3);
    g.lineBetween(ox + 90, riverY + 3, ox + 130, riverY - 1);
    g.lineBetween(ox + 130, riverY - 1, ox + mw - 5, riverY + 2);

    // 玩家绿点（左侧偏中）
    const dotS = 6;
    g.fillStyle(C_MAP_PLAYER, 0.9);
    g.fillRect(ox + 40 - dotS / 2, midY - 8 - dotS / 2, dotS, dotS);
    // 绿点边框
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRect(ox + 40 - dotS / 2, midY - 8 - dotS / 2, dotS, dotS);

    // 三个敌人红点（右侧分散）
    g.fillStyle(C_MAP_ENEMY, 0.9);
    const enemyX = [ox + 110, ox + 130, ox + 148];
    const enemyY = [midY - 12, midY, midY + 8];
    for (let i = 0; i < 3; i++) {
      g.fillRect(enemyX[i] - 3, enemyY[i] - 3, 6, 6);
    }

    // Boss 红点（右侧偏中，稍大）
    g.fillStyle(C_MAP_ENEMY, 1);
    g.fillRect(ox + mw - 25, midY - 3, 8, 8);
    g.lineStyle(1, C_GOLD, 0.6);
    g.strokeRect(ox + mw - 25, midY - 3, 8, 8);
  }

  // ─────────────────────────────────────────────────
  // 6. 右下武器面板
  // ─────────────────────────────────────────────────
  private createWeaponPanel(): void {
    // 面板背景（深木色）
    this.wpBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_WEAPON);

    this.wpBg.fillStyle(C_DARK_WOOD, 0.94);
    this.wpBg.fillRect(WP_X, WP_Y, WP_W, WP_H);

    // 朱砂红双线边框
    this.wpBg.lineStyle(3, C_BORDER, 1);
    this.wpBg.strokeRect(WP_X - 1, WP_Y - 1, WP_W + 2, WP_H + 2);
    this.wpBg.lineStyle(1, C_BORDER_INNER, 0.6);
    this.wpBg.strokeRect(WP_X + 3, WP_Y + 3, WP_W - 6, WP_H - 6);

    // 顶部金色装饰线
    this.wpBg.lineStyle(1, C_GOLD, 0.5);
    this.wpBg.lineBetween(
      WP_X + 10, WP_Y + 5,
      WP_X + WP_W - 10, WP_Y + 5,
    );

    // 武器标签
    this.wpLabel = this.scene.add.text(
      WP_X + 10, WP_Y + 7,
      '武器', {
        fontFamily: '"VT323", "Press Start 2P", monospace',
        fontSize: '11px',
        color: '#F59E0B',
      },
    ).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_WEAPON + 2);

    // 武器名
    this.wpName = this.scene.add.text(
      WP_X + 56, WP_Y + 22,
      '连弩', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '18px',
        color: C_CREAM,
        stroke: '#000000',
        strokeThickness: 2,
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH_WEAPON + 3);

    // 武器图标（像素连弩）
    this.wpIcon = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_WEAPON + 2);
    this.drawCrossbowIcon(this.wpIcon, WP_X + 18, WP_Y + 20);

    // 充能条（翠绿）
    const chargeX = WP_X + 18;
    const chargeY = WP_Y + 42;
    const chargeW = WP_W - 36;
    const chargeH = 8;

    this.wpChargeBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_WEAPON + 1);
    this.wpChargeBg.fillStyle(0x0F172A, 0.9);
    this.wpChargeBg.fillRect(chargeX, chargeY, chargeW, chargeH);
    this.wpChargeBg.lineStyle(1, C_GREEN, 0.4);
    this.wpChargeBg.strokeRect(chargeX, chargeY, chargeW, chargeH);

    // 分段刻度线
    this.wpChargeBg.lineStyle(1, 0x1E293B, 0.5);
    for (let i = 1; i < 4; i++) {
      const sx = chargeX + (chargeW / 4) * i;
      this.wpChargeBg.lineBetween(sx, chargeY, sx, chargeY + chargeH);
    }

    this.wpChargeFill = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH_WEAPON + 2);
  }

  // 像素连弩图标（24×24 区域）
  private drawCrossbowIcon(g: Phaser.GameObjects.Graphics, ox: number, oy: number): void {
    // 弩身（横木）
    g.fillStyle(0x78350F);
    g.fillRect(ox + 4, oy + 10, 20, 6);

    // 弩臂（弓形横条）
    g.fillStyle(0x92400E);
    g.fillRect(ox + 8, oy + 2, 10, 2);
    g.fillRect(ox + 6, oy + 4, 14, 2);

    // 弦
    g.lineStyle(1, 0xFEF3C7, 0.8);
    g.lineBetween(ox + 8, oy + 5, ox + 20, oy + 13);

    // 箭
    g.fillStyle(0xCBD5E1);
    g.fillRect(ox + 18, oy + 7, 8, 2);
    // 箭头
    g.fillStyle(0xFEF3C7);
    g.fillRect(ox + 23, oy + 5, 3, 6);

    // 扳机
    g.fillStyle(0x475569);
    g.fillRect(ox + 2, oy + 12, 4, 4);
  }

  // ─────────────────────────────────────────────────
  // 7. 操作提示
  // ─────────────────────────────────────────────────
  private createHints(): void {
    this.hintText = this.scene.add.text(
      HINT_X, HINT_Y,
      'AD 移动 | W 跳跃 | J 射击', {
        fontFamily: '"VT323", monospace',
        fontSize: '12px',
        color: C_HINT,
      },
    ).setOrigin(0, 1).setScrollFactor(0).setDepth(DEPTH_PANEL);
  }

  // ═════════════════════════════════════════════════
  // 每帧更新
  // ═════════════════════════════════════════════════
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

    // ── 武器充能条 ──
    if (cdPct !== this._lastCdPct) {
      this._lastCdPct = cdPct;
      this.drawChargeBar(cdPct);
    }

    // ── 敌人数（地图红点闪烁） ──
    if (enemies !== this._lastEnemies) {
      this._lastEnemies = enemies;
      // 更新小地图敌点（触发一次重绘）
      this.mapDots.clear();
      this.drawMapTerrain();
    }

    // ── 分数（暂不显示在主 HUD，保留接口） ──
    if (data.score !== this._lastScore) {
      this._lastScore = data.score;
    }
  }

  // ─────────────────────────────────────────────────
  // 血条分段绘制
  // ─────────────────────────────────────────────────
  private drawHpBar(pct: number): void {
    const g = this.hpFill;
    g.clear();

    const segW = HP_BAR_W / HP_SEG_COUNT;
    const fullSegs = Math.floor(pct * HP_SEG_COUNT);
    const partialW = Math.floor((pct * HP_SEG_COUNT - fullSegs) * segW);

    // 颜色按血量递减：翠绿 → 琥珀金 → 朱砂红
    let color: number;
    if (pct > 0.5) {
      color = 0x22C55E;       // 翠绿
    } else if (pct > 0.25) {
      color = C_GOLD;          // 琥珀金
    } else {
      color = C_HP_FILL;       // 亮红
    }

    // 分段绘制（每段留 1px 间隙）
    for (let i = 0; i < HP_SEG_COUNT; i++) {
      if (i < fullSegs) {
        // 完整段
        g.fillStyle(color, 0.95);
        g.fillRect(
          HP_BAR_X + i * segW,
          HP_BAR_Y,
          segW - 1,
          HP_BAR_H,
        );
      } else if (i === fullSegs && partialW > 0) {
        // 部分段
        g.fillStyle(color, 0.95);
        g.fillRect(
          HP_BAR_X + i * segW,
          HP_BAR_Y,
          partialW,
          HP_BAR_H,
        );
      }
    }

    // 高血量光泽
    if (pct > 0.7) {
      g.fillStyle(0xFFFFFF, 0.12);
      g.fillRect(HP_BAR_X, HP_BAR_Y, Math.floor(HP_BAR_W * pct), HP_BAR_H / 2);
    }
  }

  // ─────────────────────────────────────────────────
  // 武器充能条
  // ─────────────────────────────────────────────────
  private drawChargeBar(pct: number): void {
    const g = this.wpChargeFill;
    g.clear();

    const chargeX = WP_X + 18;
    const chargeY = WP_Y + 42;
    const chargeW = WP_W - 36;
    const chargeH = 8;

    const fillW = Math.max(0, Math.floor(chargeW * pct));
    if (fillW <= 0) return;

    // 充能颜色渐变（低→高：暗绿→亮绿→金色满）
    let color: number;
    if (pct >= 1) {
      color = C_GOLD;
    } else if (pct > 0.5) {
      color = C_GREEN;
    } else {
      color = 0x166534;
    }

    g.fillStyle(color, 0.9);
    g.fillRect(chargeX, chargeY, fillW, chargeH);

    // 满充能顶部高光
    if (pct >= 1) {
      g.fillStyle(0xFFFFFF, 0.2);
      g.fillRect(chargeX, chargeY, fillW, chargeH / 2);
    }
  }

  // ═════════════════════════════════════════════════
  // 销毁
  // ═════════════════════════════════════════════════
  destroy(): void {
    this.vignette?.destroy();
    this.scanlines?.destroy();
    this.panelBg?.destroy();
    this.portraitGfx?.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
    this.hpLabel?.destroy();
    this.hpText?.destroy();
    this.ammoIcon?.destroy();
    this.ammoText?.destroy();
    this.titleText?.destroy();
    this.titleUnderline?.destroy();
    this.mapBg?.destroy();
    this.mapDots?.destroy();
    this.mapLabel?.destroy();
    this.wpBg?.destroy();
    this.wpIcon?.destroy();
    this.wpLabel?.destroy();
    this.wpName?.destroy();
    this.wpChargeBg?.destroy();
    this.wpChargeFill?.destroy();
    this.hintText?.destroy();
  }
}
