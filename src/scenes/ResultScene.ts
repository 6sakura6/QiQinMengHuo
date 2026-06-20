// ============================================================
// ResultScene.ts — 关卡结算场景（Phase 3 像素三国风格重构）
// 深藏青背景 + 暗金面板 + 像素角标
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

// ─── Phase 3 设计颜色 ────────────────────────────────
const COLOR_BG       = '#0F172A';
const COLOR_PANEL    = '#192134';
const COLOR_GOLD     = '#F59E0B';
const COLOR_RED      = '#DC2626';
const COLOR_GREEN    = '#22C55E';
const COLOR_TEXT     = '#FEF3C7';
const COLOR_SUB      = '#94A3B8';
const COLOR_MUTED    = '#64748B';
const COLOR_HIGHLIGHT = '#22C55E';

export interface ResultData {
  levelId: string;
  levelName: string;
  score: number;
  timeSec: number;
  deaths: number;
  nextLevelId?: string;
}

// 关卡名映射
const LEVEL_NAMES: Record<string, string> = {
  level_01: '西洱河初战',
  level_02: '泸水险滩',
  level_03: '紫荆山蛮营',
};

export class ResultScene extends Phaser.Scene {
  private _data!: ResultData;
  private _saveSys = SaveSystem.getInstance();
  private _selectedIndex = 0;
  private _menuItems: { text: Phaser.GameObjects.Text; action: () => void }[] = [];
  private _transitioning = false;     // 🛡️ 防止重复切换场景
  private _transitionTarget = '';     // 🔧 跳转目标场景 key
  private _transitionDeadline = 0;    // 🔧 跳转截止时间戳（ms）

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(raw?: Record<string, unknown>): void {
    // 重置过渡标记（scene.restart 场景复用时需要）
    this._transitioning = false;
    this._transitionTarget = '';
    this._transitionDeadline = 0;
    const { width: W, height: H } = this.cameras.main;

    // 解析传入数据
    this._data = {
      levelId: (raw?.levelId as string) ?? 'level_01',
      levelName: (raw?.levelName as string) ?? LEVEL_NAMES[raw?.levelId as string] ?? '未知关卡',
      score: (raw?.score as number) ?? 0,
      timeSec: (raw?.timeSec as number) ?? 0,
      deaths: (raw?.deaths as number) ?? 0,
      nextLevelId: raw?.nextLevelId as string | undefined,
    };

    // ── 背景（Phase 3 深藏青）──────────────────────
    this.cameras.main.setBackgroundColor(COLOR_BG);

    // 顶部金色装饰线
    const topLine = this.add.graphics();
    topLine.fillStyle(0xF59E0B, 0.5);
    topLine.fillRect(0, 0, W, 4);

    // 四角像素红标
    this.drawCornerMarkers();

    // ── 标题区 ────────────────────────────────────
    const title = this.add.text(W / 2, 55, '关卡完成', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: COLOR_GOLD,
    }).setOrigin(0.5).setAlpha(0);

    // 红色分隔线
    const redDivider = this.add.graphics();
    redDivider.fillStyle(0xDC2626, 1);
    redDivider.fillRect(W / 2 - 120, 72, 240, 3);

    const subtitle = this.add.text(W / 2, 95, this._data.levelName, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: COLOR_SUB,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    // ── 统计面板（Phase 3: 暗底 + 金色像素边框）───
    const panelY = 120;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x192134, 0.9);
    panelBg.fillRect(W / 2 - 180, panelY, 360, 180);
    panelBg.lineStyle(4, 0xF59E0B, 1);
    panelBg.strokeRect(W / 2 - 180, panelY, 360, 180);
    panelBg.setAlpha(0);

    // 统计项
    const stats = [
      { label: '得    分', value: this._data.score.toLocaleString(), color: COLOR_GOLD },
      { label: '通关时间', value: this.formatTime(this._data.timeSec), color: '#64B5F6' },
      { label: '阵亡次数', value: `${this._data.deaths}`, color: this._data.deaths > 0 ? '#EF4444' : COLOR_GREEN },
    ];

    const statTexts: Phaser.GameObjects.Text[] = [];
    stats.forEach((s, i) => {
      const y = panelY + 24 + i * 48;
      const label = this.add.text(W / 2 - 150, y, s.label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: COLOR_SUB,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0, 0.5).setAlpha(0);

      const value = this.add.text(W / 2 + 150, y, s.value, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '24px',
        color: s.color,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(1, 0.5).setAlpha(0);

      statTexts.push(label, value);
    });

    // ── 游玩风格标签 ──────────────────────────────
    const styleLabel = this.detectStyle();
    const styleTag = this.add.text(W / 2, panelY + 157, styleLabel, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: COLOR_MUTED,
      backgroundColor: COLOR_PANEL,
      padding: { x: 12, y: 6 },
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0);

    // ── 操作区（Phase 3 按钮风格）─────────────────
    const menuY = panelY + 200;

    // "下一关" 按钮（红底金框像素风）
    if (this._data.nextLevelId) {
      const nextName = LEVEL_NAMES[this._data.nextLevelId] ?? '下一关';
      const btnX = W / 2;
      const btnY = menuY;

      // 按钮背景
      const nextBg = this.add.graphics();
      nextBg.fillStyle(0xDC2626, 0.9);
      nextBg.fillRect(btnX - 130, btnY - 18, 260, 36);
      nextBg.lineStyle(4, 0xF59E0B, 1);
      nextBg.strokeRect(btnX - 130, btnY - 18, 260, 36);

      const nextBtn = this.createMenuItem(btnX, btnY, `下一关: ${nextName}`, () => {
        if (this._transitioning) return;
        this._saveSys.unlockLevel(this._data.nextLevelId!);
        this.scheduleTransition('Level1Scene');
      });
      this._menuItems.push(nextBtn);
    }

    // "返回主菜单" 按钮（暗底灰框）
    const menuBtnY = menuY + (this._data.nextLevelId ? 50 : 0);
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x192134, 0.85);
    menuBg.fillRect(W / 2 - 110, menuBtnY - 16, 220, 32);
    menuBg.lineStyle(3, 0x334155, 1);
    menuBg.strokeRect(W / 2 - 110, menuBtnY - 16, 220, 32);

    const menuBtn = this.createMenuItem(W / 2, menuBtnY, '返回主菜单', () => {

      this.goToMainMenu();

    });
    this._menuItems.push(menuBtn);

    // ── 入口动画序列 ──────────────────────────────
    this.tweens.add({ targets: title, alpha: 1, y: 50, duration: 400, ease: 'Back.easeOut', delay: 200 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 400, delay: 400 });
    this.tweens.add({ targets: panelBg, alpha: 1, duration: 400, delay: 500 });

    statTexts.forEach((t, i) => {
      this.tweens.add({
        targets: t,
        alpha: 1,
        duration: 300,
        delay: 600 + i * 80,
        ease: 'Sine.easeOut',
      });
    });

    this.tweens.add({ targets: styleTag, alpha: 1, duration: 400, delay: 1000 });

    this._menuItems.forEach((item, i) => {
      this.tweens.add({
        targets: item.text,
        alpha: 1,
        duration: 400,
        delay: 1100 + i * 200,
        ease: 'Sine.easeOut',
      });
    });

    // ── 键盘操控 ──────────────────────────────────
    const onKbUp = () => {
      if (this._transitioning) return;
      if (this._menuItems.length > 1) {
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this.updateSelection();
      }
    };
    const onKbDown = () => {
      if (this._transitioning) return;
      if (this._menuItems.length > 1) {
        this._selectedIndex = Math.min(this._menuItems.length - 1, this._selectedIndex + 1);
        this.updateSelection();
      }
    };
    const onKbConfirm = () => {
      if (this._transitioning) return;
      this._menuItems[this._selectedIndex]?.action();
    };

    this.input.keyboard?.on('keydown-UP',    onKbUp);
    this.input.keyboard?.on('keydown-DOWN',  onKbDown);
    this.input.keyboard?.on('keydown-ENTER', onKbConfirm);
    this.input.keyboard?.on('keydown-SPACE', onKbConfirm);

    // shutdown 清理：防止键盘监听器残留到下一个场景造成卡死
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-UP',    onKbUp);
      this.input.keyboard?.off('keydown-DOWN',  onKbDown);
      this.input.keyboard?.off('keydown-ENTER', onKbConfirm);
      this.input.keyboard?.off('keydown-SPACE', onKbConfirm);
    });

    // 初始高亮
    this.updateSelection();

    console.log(`[ResultScene] 结算 — ${this._data.levelName} | 得分:${this._data.score} 时间:${this.formatTime(this._data.timeSec)} 死亡:${this._data.deaths}`);
  }

  // ── 创建菜单项（Phase 3 风格）───────────────────
  private createMenuItem(x: number, y: number, label: string, action: () => void): {
    text: Phaser.GameObjects.Text;
    action: () => void;
  } {
    const text = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '15px',
      color: COLOR_TEXT,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => {
      this._selectedIndex = this._menuItems.findIndex((m) => m.text === text);
      this.updateSelection();
    });

    text.on('pointerdown', action);

    return { text, action };
  }

  // ── 场景跳转（fadeOut + delayedCall + update 安全网）─────
  private scheduleTransition(target: string): void {
    if (this._transitioning) return;
    this._transitioning = true;
    this._transitionTarget = target;
    this._transitionDeadline = this.time.now + 500;

    this.cameras.main.fadeOut(300, 15, 19, 26);
    this.time.delayedCall(350, () => {
      this.executeTransition();
    });
  }

  private executeTransition(): void {
    if (!this._transitionTarget) return;
    const target = this._transitionTarget;
    this._transitionTarget = '';
    this.scene.start(target);
  }

  private goToMainMenu(): void {
    this.scheduleTransition('MainMenuScene');
  }

  // ── update 安全网: delayedCall 未触发时的兜底 ─────
  update(): void {
    if (this._transitionTarget && this.time.now > this._transitionDeadline) {
      console.warn('[ResultScene] ⚠️ 安全网: 超时未跳转，强制执行');
      this.executeTransition();
    }
  }

  // ── 高亮更新（Phase 3 绿色光标色）───────────────
  private updateSelection(): void {
    this._menuItems.forEach((item, i) => {
      if (i === this._selectedIndex) {
        item.text.setColor(COLOR_HIGHLIGHT);
      } else {
        item.text.setColor(COLOR_TEXT);
      }
    });
  }

  // ── 像素角标（四角红色方块）─────────────────
  private drawCornerMarkers(): void {
    const size = 8;
    const margin = 10;
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0xDC2626, 1);
    g.fillRect(margin, margin, size, size);
    g.fillRect(W - margin - size, margin, size, size);
    g.fillRect(margin, H - margin - size, size, size);
    g.fillRect(W - margin - size, H - margin - size, size, size);
  }

  // ── 游玩风格推断 ────────────────────────────────
  private detectStyle(): string {
    const { timeSec, deaths } = this._data;
    if (deaths >= 3) return '【风格】苦战过关';
    if (timeSec < 180 && deaths <= 1) return '【风格】猛将速攻';
    if (timeSec >= 360 && deaths <= 1) return '【风格】步步为营';
    return '【风格】稳扎稳打';
  }

  // ── 时间格式化 ───────────────────────────────────
  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
