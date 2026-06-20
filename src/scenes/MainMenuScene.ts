// ============================================================
// MainMenuScene.ts — 主菜单场景（对标 Phase 1 视觉概念版）
// 参考: docs/phase1/visuals/01-main-menu.svg
//       docs/phase1/visuals/md_image_prompts/01-main-menu-prompt.md
// 风格: 16-bit 像素三国战争史诗
// 画布: 960×540（从 1280×720 参考等比缩放 0.75x）
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

// ─── 设计系统颜色（Phase 3 像素三国规范）───────────────
const C = {
  BG:           0x0F172A,  // 深藏青夜空
  NEAR_BLACK:   0x0B1120,  // 近景黑蓝（前景剪影）
  SLATE:        0x1E293B,  // 深蓝灰（中景山峦）
  SMOKE:        0x334155,  // 烟灰蓝（远景山峦）
  VERMILION:    0xDC2626,  // 朱砂红（标题、边框）
  BRIGHT_RED:   0xEF4444,  // 亮红（警示）
  AMBER:        0xF59E0B,  // 琥珀金（副标题、标签）
  GOLD:         0xFBBF24,  // 金色高光（描边）
  ORANGE:       0xEA580C,  // 火橙（火星粒子）
  EMERALD:      0x22C55E,  // 翠绿（开始按钮、光标）
  CREAM:        0xFEF3C7,  // 奶油白（文字）
  BLOOD_MOON:   0x991B1B,  // 血月核心
  MOON_GLOW:    0x7F1D1D,  // 血月外光
  BANNER_RED:   0xB91C1C,  // 战旗红
  DISABLED:     0x475569,  // 禁用状态
  MUTED:        0x64748B,  // 次要文字
  TEXT:         0xE2E8F0,  // 主要文字
  CLOUD_GOLD:   0x92400E,  // 祥云暗金（低对比度）
};

const W = GAME_WIDTH;   // 960
const H = GAME_HEIGHT;  // 540

// ─── 菜单选项 ──────────────────────────────────────────
interface MenuOption {
  text: string;
  action: () => void;
  y: number;
}

export class MainMenuScene extends Phaser.Scene {
  // ── UI 元素 ──
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuOptions: MenuOption[] = [];
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionBgGraphics: Phaser.GameObjects.Graphics[] = [];
  private selectedIndex = 0;
  private cursor!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;

  // ── 状态 ──
  private hasSaveData = false;
  private inputLocked = false;

  // ── 重置确认 ──
  private _awaitingResetConfirm = false;
  private _confirmResetCallback?: () => void;
  private confirmResetTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ================================================================
  // create — 主入口：11 层视觉元素 + 菜单交互
  // ================================================================
  create(): void {
    try {
    // ─── 第 1 层：夜空底色 ──────────────────────────────
    this.cameras.main.setBackgroundColor('#0F172A');

    // 🔧 fadeIn 确保从其他场景过渡时平滑显示
    this.cameras.main.fadeIn(200, 15, 19, 26);

    // ─── 第 2 层：血月 + 像素云 ─────────────────────────
    this.drawBloodMoon();

    // ─── 第 3 层：三层山峦剪影（远 → 中 → 近）───────
    this.drawMountains();

    // ─── 第 4 层：雾带 ──────────────────────────────────
    this.drawMistBands();

    // ─── 第 5 层：战旗 "漢" "蜀" ──────────────────────
    this.drawBanners();

    // ─── 第 6 层：汉军士卒剪影 ──────────────────────────
    this.drawSoldiers();

    // ─── 第 7 层：主标题 + 副标题 ──────────────────────
    this.drawTitles();

    // ─── 第 8 层：祥云角花（四角低对比度）─────────────
    this.drawCornerClouds();

    // ─── 第 9 层：火星粒子（底部上浮）──────────────────
    this.spawnEmbers();

    // ─── 第 10 层：CRT 扫描线 + 暗角 ───────────────────
    this.drawCRTOverlay();

    // ─── 第 11 层：像素四角标记 ─────────────────────────
    this.drawPixelCorners();

    // ─── 交互层：菜单按钮 + 光标 + 版本 ──────────────
    this.buildMenuSystem();

    // ─── 控制：键盘 + 鼠标 ────────────────────────────
    this.setupInput();

    // ─── 清理 ────────────────────────────────────────
    this.events.on('shutdown', () => {
      if (this.confirmResetTimer) {
        this.confirmResetTimer.remove(false);
        this.confirmResetTimer = undefined;
      }
    });

    } catch (e) {
      console.error('[MainMenuScene] ❌ create() 异常:', e);
    }
  }

  // ================================================================
  // 第 2 层：血月
  // 参考：右上角，直径 170px@1280 → ~128px@960
  // 位置：x=1010,y=145@1280 → x=758,y=109@960
  // ================================================================
  private drawBloodMoon(): void {
    const mX = 758, mY = 109, mR = 64;

    // 外层光晕（大圆，高透明度，模糊感用多层模拟）
    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(C.MOON_GLOW, 0.08);
    glow.fillCircle(mX, mY, mR + 36);
    glow.fillStyle(C.MOON_GLOW, 0.12);
    glow.fillCircle(mX, mY, mR + 18);
    glow.fillStyle(C.MOON_GLOW, 0.20);
    glow.fillCircle(mX, mY, mR + 6);

    // 月轮主体
    const moon = this.add.graphics().setDepth(2);
    // 像素化圆形：用 fillRect 近似（大圆 + 方形锯齿边缘）
    moon.fillStyle(C.BLOOD_MOON, 1);
    moon.fillCircle(mX, mY, mR);
    // 暗部（右上高光区颜色稍浅）
    moon.fillStyle(0xB91C1C, 0.35);
    moon.fillCircle(mX - 8, mY - 8, mR * 0.6);

    // 方形像素陨石坑
    moon.fillStyle(0x7F1D1D, 0.6);
    moon.fillRect(mX + 12, mY - 18, 8, 6);
    moon.fillRect(mX - 22, mY + 8, 10, 8);
    moon.fillRect(mX + 18, mY + 16, 6, 4);
    moon.fillRect(mX - 6, mY + 22, 8, 6);
    moon.fillRect(mX - 28, mY - 12, 6, 6);

    // 像素云掠过月面（低透明度灰色阶梯矩形）
    const cloud = this.add.graphics().setDepth(3);
    cloud.fillStyle(C.SMOKE, 0.3);
    // 阶梯像素云条
    const cy = mY - 10;
    cloud.fillRect(mX - 40, cy, 18, 4);
    cloud.fillRect(mX - 28, cy + 4, 22, 4);
    cloud.fillRect(mX - 18, cy + 8, 16, 4);
  }

  // ================================================================
  // 第 3 层：三层山峦剪影（像素阶梯边缘）
  // 远山 #334155 / 中景 #1E293B / 近景 #0B1120
  // ================================================================
  private drawMountains(): void {
    // 坐标量化函数：将 y 值量化到 8px 步进，产生像素锯齿效果
    const step = (y: number) => Math.round(y / 8) * 8;

    // ── 远景山峦 (#334155, depth 0) ──
    const far = this.add.graphics().setDepth(0);
    far.fillStyle(C.SMOKE, 0.7);
    far.beginPath();
    far.moveTo(0, H);
    const farPeaks = [
      { x: 0,   y: H - 110 }, { x: 60,  y: H - 155 }, { x: 130, y: H - 130 },
      { x: 200, y: H - 170 }, { x: 280, y: H - 140 }, { x: 350, y: H - 160 },
      { x: 420, y: H - 120 }, { x: 500, y: H - 150 }, { x: 570, y: H - 130 },
      { x: 640, y: H - 165 }, { x: 720, y: H - 135 }, { x: 790, y: H - 155 },
      { x: 860, y: H - 115 }, { x: 920, y: H - 140 }, { x: W,   y: H - 125 },
    ];
    farPeaks.forEach((p) => far.lineTo(p.x, step(p.y)));
    far.lineTo(W, H);
    far.closePath();
    far.fillPath();

    // ── 中景山峦 (#1E293B, depth 1) ──
    const mid = this.add.graphics().setDepth(1);
    mid.fillStyle(C.SLATE, 0.85);
    mid.beginPath();
    mid.moveTo(0, H);
    const midPeaks = [
      { x: 0,   y: H - 80  }, { x: 80,  y: H - 110 }, { x: 170, y: H - 90  },
      { x: 260, y: H - 120 }, { x: 360, y: H - 95  }, { x: 450, y: H - 115 },
      { x: 540, y: H - 85  }, { x: 630, y: H - 105 }, { x: 720, y: H - 95  },
      { x: 810, y: H - 110 }, { x: 900, y: H - 80  }, { x: W,   y: H - 100 },
    ];
    midPeaks.forEach((p) => mid.lineTo(p.x, step(p.y)));
    mid.lineTo(W, H);
    mid.closePath();
    mid.fillPath();

    // ── 近景山脊 (#0B1120, depth 4，在雾带之上) ──
    const near = this.add.graphics().setDepth(4);
    near.fillStyle(C.NEAR_BLACK, 1);
    near.beginPath();
    near.moveTo(0, H);
    const nearPeaks = [
      { x: 0,   y: H - 50 }, { x: 100, y: H - 75 }, { x: 220, y: H - 55 },
      { x: 340, y: H - 70 }, { x: 460, y: H - 48 }, { x: 570, y: H - 65 },
      { x: 680, y: H - 50 }, { x: 790, y: H - 60 }, { x: 900, y: H - 42 },
      { x: W,   y: H - 55 },
    ];
    nearPeaks.forEach((p) => near.lineTo(p.x, step(p.y)));
    near.lineTo(W, H);
    near.closePath();
    near.fillPath();

    // ── 火星光源：山脚处微弱的琥珀色像素散点 ──
    const glowDots = this.add.graphics().setDepth(5);
    for (let i = 0; i < 8; i++) {
      const gx = Phaser.Math.Between(60, 300);
      const gy = H - Phaser.Math.Between(15, 40);
      glowDots.fillStyle(C.AMBER, Phaser.Math.FloatBetween(0.2, 0.4));
      glowDots.fillRect(gx, gy, 3, 3);
    }
  }

  // ================================================================
  // 第 4 层：横向像素雾带（半透明）
  // ================================================================
  private drawMistBands(): void {
    const mist = this.add.graphics().setDepth(3);

    // 山脚雾带：多条横向像素条带，逐行透明度递减
    for (let i = 0; i < 6; i++) {
      const alpha = 0.06 + i * 0.02;
      mist.fillStyle(C.SMOKE, alpha);
      mist.fillRect(0, H - 82 + i * 6, W, 6);
    }

    // 远景薄雾（细条带）
    mist.fillStyle(C.SMOKE, 0.04);
    mist.fillRect(0, H - 140, W, 3);
    mist.fillStyle(C.SMOKE, 0.05);
    mist.fillRect(120, H - 155, 600, 3);
  }

  // ================================================================
  // 第 5 层：战旗 "漢"（左）"蜀"（右）
  // ================================================================
  private drawBanners(): void {
    const bannerG = this.add.graphics().setDepth(5);

    // ── 左旗 "漢" ──
    this.drawSingleBanner(bannerG, 65, H - 80, 120, '漢');

    // ── 右旗 "蜀" ──
    this.drawSingleBanner(bannerG, 885, H - 80, 120, '蜀');
  }

  private drawSingleBanner(
    g: Phaser.GameObjects.Graphics,
    x: number, baseY: number, poleH: number, char: string,
  ): void {
    // 旗杆
    g.fillStyle(0x292524, 1);
    g.fillRect(x, baseY - poleH, 4, poleH);
    // 杆顶装饰
    g.fillStyle(C.GOLD, 0.8);
    g.fillRect(x - 2, baseY - poleH - 6, 8, 6);

    // 旗布（阶梯状像素褶皱）
    g.fillStyle(C.BANNER_RED, 0.85);
    const flagTop = baseY - poleH + 24;
    // 使用 fillRect 拼接锯齿旗布
    const flagSegments = [
      { w: 36, h: 10 }, { w: 32, h: 10 }, { w: 28, h: 10 },
      { w: 32, h: 12 }, { w: 36, h: 8 },  { w: 30, h: 10 },
      { w: 26, h: 12 }, { w: 30, h: 10 },
    ];
    let fy = flagTop;
    flagSegments.forEach((seg) => {
      g.fillRect(x + 4, fy, seg.w, seg.h);
      fy += seg.h;
    });

    // 旗边（黑色）
    g.fillStyle(0x1a1a1a, 0.7);
    g.fillRect(x + 4, flagTop, 2, fy - flagTop);

    // 文字
    const bannerText = this.add.text(x + 10, flagTop + 10, char, {
      fontSize: '18px',
      fontFamily: '"SimSun", "STSong", serif',
      color: '#FBBF24',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(6);
  }

  // ================================================================
  // 第 6 层：汉军士卒剪影（像素方块拼接）
  // ================================================================
  private drawSoldiers(): void {
    const g = this.add.graphics().setDepth(5);

    // ── 士卒 1（左下，较大，面向右）──
    this.drawSoldierAt(g, 50, H - 25, 1.0);
    // ── 士卒 2（左中，略小，面向右）──
    this.drawSoldierAt(g, 150, H - 28, 0.75);
  }

  private drawSoldierAt(
    g: Phaser.GameObjects.Graphics,
    sx: number, baseY: number, scale: number,
  ): void {
    const s = (v: number) => Math.round(v * scale);
    const dark  = C.NEAR_BLACK;
    const rim   = C.AMBER;
    const accent = C.SLATE;

    // ── 头盔冠饰 ──
    g.fillStyle(dark, 0.95);
    g.fillRect(sx + s(10), baseY - s(62), s(12), s(5));
    g.fillRect(sx + s(12), baseY - s(67), s(8), s(5));

    // ── 头盔顶 ──
    g.fillRect(sx + s(4), baseY - s(57), s(24), s(8));

    // ── 脸部 ──
    g.fillRect(sx + s(6), baseY - s(49), s(20), s(14));
    // 眼睛（反光点）
    g.fillStyle(rim, 0.4);
    g.fillRect(sx + s(18), baseY - s(47), s(3), s(3));

    // ── 颈部 ──
    g.fillStyle(dark, 0.95);
    g.fillRect(sx + s(10), baseY - s(35), s(12), s(6));

    // ── 铠甲上身（分层札甲片）──
    const armorY = baseY - s(29);
    for (let row = 0; row < 4; row++) {
      const shade = row % 2 === 0 ? 0.95 : 0.85;
      g.fillStyle(row % 2 === 0 ? dark : accent, shade);
      g.fillRect(sx + s(4), armorY + row * s(5), s(24), s(5));
    }

    // ── 腰带 ──
    g.fillStyle(accent, 0.7);
    g.fillRect(sx + s(6), armorY + s(20), s(20), s(4));

    // ── 腿部 ──
    g.fillStyle(dark, 0.9);
    g.fillRect(sx + s(8), armorY + s(24), s(6), s(18));
    g.fillRect(sx + s(18), armorY + s(24), s(6), s(18));

    // ── 靴子 ──
    g.fillStyle(dark, 0.95);
    g.fillRect(sx + s(6), baseY - s(8), s(8), s(8));
    g.fillRect(sx + s(16), baseY - s(8), s(8), s(8));

    // ── 方盾（身体左侧）──
    g.fillStyle(C.SLATE, 0.6);
    g.fillRect(sx - s(2), baseY - s(48), s(8), s(30));
    // 盾纹
    g.fillStyle(C.AMBER, 0.2);
    g.fillRect(sx + s(0), baseY - s(42), s(4), s(4));
    g.fillRect(sx + s(0), baseY - s(32), s(4), s(4));

    // ── 长矛（向右伸出）──
    g.fillStyle(0x3d2b1f, 0.9);
    g.fillRect(sx + s(24), baseY - s(42), s(40), s(2));
    // 矛尖
    g.fillStyle(C.AMBER, 0.5);
    g.fillRect(sx + s(60), baseY - s(44), s(12), s(4));
    g.fillRect(sx + s(64), baseY - s(48), s(4), s(8));

    // ── 琥珀色边缘光（底部火光反射）──
    g.fillStyle(rim, 0.15);
    g.fillRect(sx + s(4), baseY - s(4), s(24), s(2));
    g.fillRect(sx + s(6), baseY - s(6), s(20), s(2));
  }

  // ================================================================
  // 第 7 层：主标题 + 副标题
  // ================================================================
  private drawTitles(): void {
    // ── 暗色投影（8px 右下偏移）──
    const shadow = this.add.text(W / 2 + 6, 146, '七  擒  孟  获', {
      fontSize: '48px',
      fontFamily: '"Press Start 2P", "SimHei", monospace',
      color: '#000000',
    }).setOrigin(0.5).setDepth(8).setAlpha(0.5);

    // ── 主标题：朱砂红 + 金色描边（双层实现）──
    // 外层金色描边
    const titleOuter = this.add.text(W / 2, 140, '七  擒  孟  获', {
      fontSize: '48px',
      fontFamily: '"Press Start 2P", "SimHei", monospace',
      color: '#FBBF24',
      stroke: '#B45309',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9);

    // 内层朱砂红
    this.titleText = this.add.text(W / 2, 140, '七  擒  孟  获', {
      fontSize: '48px',
      fontFamily: '"Press Start 2P", "SimHei", monospace',
      color: '#DC2626',
      stroke: '#7F1D1D',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // 标题呼吸动画
    this.tweens.add({
      targets: [this.titleText, titleOuter],
      alpha: { from: 0.85, to: 1 },
      scaleX: { from: 0.99, to: 1 },
      scaleY: { from: 0.99, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── 副标题：琥珀金小号像素字 ──
    this.subtitleText = this.add.text(W / 2, 202, 'SEVEN  CAPTURES  OF  MENG  HUO', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F59E0B',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      delay: 600,
      duration: 800,
      ease: 'Sine.easeOut',
    });

    // ── 红色分隔线 ──
    const divider = this.add.graphics().setDepth(10);
    divider.fillStyle(C.VERMILION, 0.7);
    divider.fillRect(W / 2 - 120, 218, 240, 4);
    // 金色细线点缀
    divider.fillStyle(C.GOLD, 0.3);
    divider.fillRect(W / 2 - 120, 218, 240, 1);
  }

  // ================================================================
  // 第 8 层：祥云角花（四角低对比度像素纹样）
  // ================================================================
  private drawCornerClouds(): void {
    const g = this.add.graphics().setDepth(6);
    const alpha = 0.15;
    const color = C.CLOUD_GOLD;

    // 左上角
    this.drawCloudMotif(g, 20, 20, color, alpha);
    // 右上角
    this.drawCloudMotif(g, W - 52, 20, color, alpha);
    // 左下角
    this.drawCloudMotif(g, 20, H - 52, color, alpha);
    // 右下角
    this.drawCloudMotif(g, W - 52, H - 52, color, alpha);
  }

  private drawCloudMotif(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, color: number, alpha: number,
  ): void {
    // 像素祥云：阶梯状方块组合
    g.fillStyle(color, alpha);
    // 云头（上凸）
    g.fillRect(cx + 8,  cy,      16, 4);
    g.fillRect(cx + 4,  cy + 4,  24, 4);
    g.fillRect(cx,      cy + 8,  32, 4);
    g.fillRect(cx,      cy + 12, 28, 4);
    g.fillRect(cx + 4,  cy + 16, 20, 4);
    g.fillRect(cx + 8,  cy + 20, 12, 4);
    // 卷尾
    g.fillRect(cx + 20, cy + 4,  4,  4);
    g.fillRect(cx + 24, cy + 8,  4,  4);
  }

  // ================================================================
  // 第 9 层：火星粒子（30+ 个方块粒子从底部上浮）
  // ================================================================
  private spawnEmbers(): void {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const ex = Phaser.Math.Between(0, W);
      const ey = H + Phaser.Math.Between(5, 160);
      const size = Phaser.Math.Between(2, 5);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.8);
      const color = Phaser.Math.RND.pick([C.ORANGE, C.AMBER, C.GOLD, C.BRIGHT_RED]);

      const ember = this.add.graphics().setDepth(7);
      ember.fillStyle(color, alpha);
      ember.fillRect(ex, ey, size, size);

      this.tweens.add({
        targets: ember,
        y: ey - Phaser.Math.Between(80, 250),
        x: ex + Phaser.Math.Between(-40, 40),
        alpha: { from: alpha, to: 0 },
        duration: Phaser.Math.Between(2500, 6000),
        delay: Phaser.Math.Between(0, 4000),
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
  }

  // ================================================================
  // 第 10 层：CRT 扫描线 + 暗角
  // ================================================================
  private drawCRTOverlay(): void {
    const crt = this.add.graphics().setDepth(90);

    // ── 水平扫描线（2px 每 4px，极低透明度）──
    crt.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) {
      crt.fillRect(0, y, W, 2);
    }

    // ── 暗角（四条边缘渐变黑带）──
    const vignette = this.add.graphics().setDepth(91);
    // 顶部
    vignette.fillStyle(0x000000, 0.25);
    vignette.fillRect(0, 0, W, 28);
    // 底部
    vignette.fillStyle(0x000000, 0.25);
    vignette.fillRect(0, H - 28, W, 28);
    // 左侧
    vignette.fillStyle(0x000000, 0.2);
    vignette.fillRect(0, 0, 30, H);
    // 右侧
    vignette.fillRect(W - 30, 0, 30, H);
  }

  // ================================================================
  // 第 11 层：像素四角红色标记
  // ================================================================
  private drawPixelCorners(): void {
    const size = 8;
    const margin = 12;
    const g = this.add.graphics().setDepth(92);

    g.fillStyle(C.VERMILION, 1);
    g.fillRect(margin, margin, size, size);
    g.fillRect(W - margin - size, margin, size, size);
    g.fillRect(margin, H - margin - size, size, size);
    g.fillRect(W - margin - size, H - margin - size, size, size);

    // 闪烁动画
    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.3 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ================================================================
  // 交互层：菜单系统
  // ================================================================
  private buildMenuSystem(): void {
    const saveSys = SaveSystem.getInstance();
    this.hasSaveData = saveSys.hasAnyProgress();

    // 🔧 防御: 清除旧引用（scene.restart 可能复用实例导致 optionTexts 残留已销毁对象）
    this.optionTexts = [];
    this.optionBgGraphics = [];

    // ── 菜单选项定义 ──
    const baseY = 320;
    const spacing = 56;

    this.menuOptions = [
      { text: '[  开 始 游 戏  ]', action: () => this.startGame(),   y: baseY },
      { text: '继 续 游 戏',       action: () => this.continueGame(), y: baseY + spacing },
      { text: '重 置 进 度',       action: () => this.confirmReset(), y: baseY + spacing * 2 },
    ];

    // ── 逐项渲染 ──
    this.menuOptions.forEach((opt, i) => {
      const disabled = !this.hasSaveData && i === 1;
      const isPrimary = i === 0;

      // 按钮背景
      const btnW = isPrimary ? 300 : 200;
      const btnH = isPrimary ? 46 : 36;
      const btnBg = this.add.graphics().setDepth(11);

      if (isPrimary) {
        // 主按钮：双层像素边框（参考设计稿 "[ 开 始 游 戏 ]"）
        // 外层暗红边框
        btnBg.fillStyle(0x991B1B, 0.8);
        btnBg.fillRect(W / 2 - btnW / 2 - 3, opt.y - btnH / 2 - 3, btnW + 6, btnH + 6);
        // 内层墨绿填充
        btnBg.fillStyle(0x0F172A, 0.9);
        btnBg.fillRect(W / 2 - btnW / 2, opt.y - btnH / 2, btnW, btnH);
        // 翠绿像素边框
        btnBg.lineStyle(4, C.EMERALD, 0.9);
        btnBg.strokeRect(W / 2 - btnW / 2, opt.y - btnH / 2, btnW, btnH);
        // 四角闪烁方块
        this.drawButtonCorners(btnBg, W / 2 - btnW / 2, opt.y - btnH / 2, btnW, btnH);
      } else if (!disabled) {
        // 次级按钮：暗底 + 灰边框
        btnBg.fillStyle(0x192134, 0.7);
        btnBg.fillRect(W / 2 - btnW / 2, opt.y - btnH / 2, btnW, btnH);
        btnBg.lineStyle(3, C.SMOKE, 0.5);
        btnBg.strokeRect(W / 2 - btnW / 2, opt.y - btnH / 2, btnW, btnH);
      }

      this.optionBgGraphics.push(btnBg);

      // 按钮文字
      const color = disabled ? C.DISABLED
        : (isPrimary ? C.EMERALD : C.TEXT);
      const fontSize = isPrimary ? '22px' : '16px';

      const txt = this.add.text(W / 2, opt.y, opt.text, {
        fontSize,
        fontFamily: '"Press Start 2P", monospace',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
      }).setOrigin(0.5).setDepth(12).setAlpha(0);

      this.optionTexts.push(txt);

      // 入场动画
      this.tweens.add({
        targets: [txt, btnBg],
        alpha: { from: 0, to: disabled ? 0.35 : 1 },
        y: opt.y - 8,
        duration: 400,
        delay: 1000 + i * 130,
        ease: 'Back.easeOut',
        onUpdate: (_t: Phaser.Tweens.Tween, target: unknown) => {
          if (target instanceof Phaser.GameObjects.Text) {
            (target as Phaser.GameObjects.Text).setY(opt.y);
          }
        },
      });
    });

    // ── 光标箭头（翠绿闪烁）──
    this.cursor = this.add.text(
      W / 2 - 155, this.menuOptions[0].y,
      '▶',
      { fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#22C55E', stroke: '#000000', strokeThickness: 2 },
    ).setOrigin(0.5).setDepth(13);

    this.tweens.add({
      targets: this.cursor,
      alpha: { from: 0.35, to: 1 },
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // ── 版本信息 ──
    this.versionText = this.add.text(W - 12, H - 10, 'v0.2 · 腾讯云黑客松', {
      fontSize: '10px',
      fontFamily: '"VT323", "Press Start 2P", monospace',
      color: '#64748B',
    }).setOrigin(1, 1).setDepth(12);
  }

  // ── 按钮四角闪烁方块 ──
  private drawButtonCorners(
    g: Phaser.GameObjects.Graphics,
    bx: number, by: number, bw: number, bh: number,
  ): void {
    const cs = 6; // corner size
    g.fillStyle(C.EMERALD, 0.9);
    g.fillRect(bx, by, cs, cs);
    g.fillRect(bx + bw - cs, by, cs, cs);
    g.fillRect(bx, by + bh - cs, cs, cs);
    g.fillRect(bx + bw - cs, by + bh - cs, cs, cs);
  }

  // ================================================================
  // 键盘 + 鼠标输入
  // ================================================================
  private setupInput(): void {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP',    () => this.moveCursor(-1));
      this.input.keyboard.on('keydown-DOWN',  () => this.moveCursor(1));
      this.input.keyboard.on('keydown-ENTER', () => this.selectOption());
      this.input.keyboard.on('keydown-SPACE', () => this.selectOption());
      this.input.keyboard.on('keydown-ESC',   () => this.cancelResetConfirm());
    }

    this.optionTexts.forEach((txt, i) => {
      if (!txt) return;
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        if (!this._awaitingResetConfirm) this.moveToIndex(i);
      });
      txt.on('pointerdown', () => this.selectOption());
    });
  }

  // ================================================================
  // 光标导航
  // ================================================================
  private moveCursor(dir: number): void {
    if (this.inputLocked || this._awaitingResetConfirm) return;

    let newIndex = this.selectedIndex + dir;
    if (!this.hasSaveData && newIndex === 1) newIndex += dir;
    if (newIndex < 0 || newIndex >= this.menuOptions.length) return;

    this.moveToIndex(newIndex);
  }

  private moveToIndex(index: number): void {
    if (!this.hasSaveData && index === 1) return;

    this.selectedIndex = index;
    this.tweens.add({
      targets: this.cursor,
      y: this.menuOptions[index].y,
      duration: 100,
      ease: 'Back.easeOut',
    });

    this.optionTexts.forEach((txt, i) => {
      if (!txt) return;
      const disabled = i === 1 && !this.hasSaveData;
      if (disabled) {
        txt.setColor('#475569');
      } else if (i === index) {
        txt.setColor(i === 0 ? '#22C55E' : '#F59E0B');
      } else {
        txt.setColor(i === 0 ? '#22C55E' : '#E2E8F0');
      }
    });
  }

  // ================================================================
  // selectOption — 执行选中操作
  // ================================================================
  private selectOption(): void {
    if (this._awaitingResetConfirm) {
      if (this._confirmResetCallback) this._confirmResetCallback();
      return;
    }

    if (this.inputLocked) return;

    const opt = this.menuOptions[this.selectedIndex];
    if (!opt) return;

    if (!this.hasSaveData && this.selectedIndex === 1) return;

    this.tweens.add({
      targets: this.optionTexts[this.selectedIndex],
      scaleX: 0.92,
      scaleY: 0.92,
      yoyo: true,
      duration: 80,
      onComplete: () => opt.action(),
    });
  }

  // ================================================================
  // 场景跳转
  // ================================================================
  // ── 场景跳转（事件驱动，消除 delayedCall 时序竞争）──
  private transitionToGame(): void {
    // 🔧 BUGFIX: 使用 camerafadeoutcomplete 替代 delayedCall(370)
    //   根因：delayedCall 基于帧循环，在低帧率/资源加载时可能延迟超过 fadeOut 时间，
    //   导致 fade 完成后有纯黑间隙。事件驱动确保 fadeOut 完成瞬间即切场景。
    this.inputLocked = true;
    let transitioned = false;

    const doTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('Level1Scene');
    };

    this.cameras.main.fadeOut(350, 15, 19, 26);
    this.cameras.main.once('camerafadeoutcomplete', doTransition);

    // 🛡️ 安全网：600ms 兜底（防止事件永不触发导致的永久黑屏）
    this.time.delayedCall(600, () => {
      if (!transitioned) {
        console.warn('[MainMenuScene] ⚠️ camerafadeoutcomplete 未触发，安全网兜底跳转');
        doTransition();
      }
    });
  }

  private startGame(): void {
    this.transitionToGame();
  }

  private continueGame(): void {
    if (!this.hasSaveData) return;
    this.transitionToGame();
  }

  // ================================================================
  // 重置确认流程
  // ================================================================
  private confirmReset(): void {
    this._awaitingResetConfirm = true;
    this.inputLocked = true;

    const confirmTxt = this.add.text(W / 2, H - 60, '确定清除所有进度？(再按一次确认 / ESC取消)', {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#EF4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(93).setAlpha(0);

    this.tweens.add({ targets: confirmTxt, alpha: 1, duration: 200 });
    this.optionTexts[2]?.setColor('#EF4444');

    const doReset = () => {
      this._awaitingResetConfirm = false;
      this._confirmResetCallback = undefined;
      if (this.confirmResetTimer) { this.confirmResetTimer.remove(false); this.confirmResetTimer = undefined; }
      if (confirmTxt.active) confirmTxt.destroy();

      const saveSys = SaveSystem.getInstance();
      saveSys.resetAll();
      this.inputLocked = false;
      this.refreshMenu();
    };

    this._confirmResetCallback = doReset;

    this.confirmResetTimer = this.time.delayedCall(3000, () => {
      this.cancelResetConfirm(confirmTxt);
    });
  }

  private cancelResetConfirm(confirmTxtRef?: Phaser.GameObjects.Text): void {
    if (!this._awaitingResetConfirm) return;

    this._awaitingResetConfirm = false;
    this._confirmResetCallback = undefined;

    if (this.confirmResetTimer) { this.confirmResetTimer.remove(false); this.confirmResetTimer = undefined; }

    this.optionTexts[2]?.setColor('#E2E8F0');

    const target = confirmTxtRef ?? this.children.list.find(
      (c) => c instanceof Phaser.GameObjects.Text
        && (c as Phaser.GameObjects.Text).text.includes('清除所有进度'),
    ) as Phaser.GameObjects.Text | undefined;

    if (target?.active) {
      this.tweens.add({
        targets: target, alpha: 0, duration: 300,
        onComplete: () => target.destroy(),
      });
    }

    this.inputLocked = false;
  }

  private refreshMenu(): void {
    this.hasSaveData = false;
    this.optionTexts.forEach((txt, i) => {
      if (i === 1) txt.setColor('#475569');
      else if (i === 2) txt.setColor('#22C55E');
    });
  }
}
