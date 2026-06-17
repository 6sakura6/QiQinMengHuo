// ============================================================
// ResultScene.ts — 关卡结算场景（Batch 8）
// 显示通关统计 + 存档记录 + 下一关/主菜单导航
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

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

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(raw?: Record<string, unknown>): void {
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

    // ── 背景 ──────────────────────────────────────
    this.cameras.main.setBackgroundColor('#0a1220');

    // 顶部装饰线
    const topLine = this.add.graphics();
    topLine.fillStyle(0xffd700, 0.3);
    topLine.fillRect(0, 0, W, 3);

    // ── 标题区 ────────────────────────────────────
    const titleEmoji = this.add.text(W / 2, 60, '🏆', {
      fontSize: '48px',
    }).setOrigin(0.5).setAlpha(0);

    const title = this.add.text(W / 2, 120, '擒获成功', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(W / 2, 165, this._data.levelName, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#d4a574',
    }).setOrigin(0.5).setAlpha(0);

    // ── 统计面板 ──────────────────────────────────
    const panelY = 200;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.85);
    panelBg.fillRoundedRect(W / 2 - 180, panelY, 360, 200, 16);
    panelBg.lineStyle(1, 0xffd700, 0.4);
    panelBg.strokeRoundedRect(W / 2 - 180, panelY, 360, 200, 16);
    panelBg.setAlpha(0);

    // 统计项
    const stats = [
      { label: '得分', value: this._data.score.toLocaleString(), color: '#ffd700', icon: '⭐' },
      { label: '通关时间', value: this.formatTime(this._data.timeSec), color: '#64b5f6', icon: '⏱' },
      { label: '阵亡次数', value: `${this._data.deaths}`, color: this._data.deaths > 0 ? '#ef5350' : '#4caf50', icon: '💀' },
    ];

    const statTexts: Phaser.GameObjects.Text[] = [];
    stats.forEach((s, i) => {
      const y = panelY + 30 + i * 50;
      const icon = this.add.text(W / 2 - 150, y, s.icon, {
        fontSize: '20px',
      }).setOrigin(0, 0.5).setAlpha(0);

      const label = this.add.text(W / 2 - 115, y, s.label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8899aa',
      }).setOrigin(0, 0.5).setAlpha(0);

      const value = this.add.text(W / 2 + 150, y, s.value, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: s.color,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5).setAlpha(0);

      statTexts.push(icon, label, value);
    });

    // ── 游玩风格标签 ──────────────────────────────
    const styleLabel = this.detectStyle();
    const styleTag = this.add.text(W / 2, panelY + 175, styleLabel, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#a0a0b0',
      backgroundColor: '#2a2a3e',
      padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setAlpha(0);

    // ── 操作区 ────────────────────────────────────
    const menuY = panelY + 230;

    // "下一关" 按钮（仅在有关卡可解锁时显示）
    if (this._data.nextLevelId) {
      const nextName = LEVEL_NAMES[this._data.nextLevelId] ?? '下一关';
      const nextBtn = this.createMenuItem(W / 2, menuY, `▶  ${nextName}`, () => {
        this._saveSys.unlockLevel(this._data.nextLevelId!);
        this.scene.start('Level1Scene'); // 复用 Level1Scene 模板（后续 Batch 替换为 Level2Scene）
      });
      this._menuItems.push(nextBtn);
    }

    // "返回主菜单"
    const menuBtn = this.createMenuItem(W / 2, menuY + (this._data.nextLevelId ? 44 : 0), '🏠  返回主菜单', () => {
      this.scene.start('BootScene');
    });
    this._menuItems.push(menuBtn);

    // ── 入口动画序列 ──────────────────────────────
    this.tweens.add({ targets: titleEmoji, alpha: 1, y: 55, duration: 400, ease: 'Back.easeOut', delay: 200 });
    this.tweens.add({ targets: title, alpha: 1, duration: 500, delay: 400 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 400, delay: 600 });
    this.tweens.add({ targets: panelBg, alpha: 1, duration: 400, delay: 700 });

    statTexts.forEach((t, i) => {
      this.tweens.add({
        targets: t,
        alpha: 1,
        duration: 300,
        delay: 800 + i * 80,
        ease: 'Sine.easeOut',
      });
    });

    this.tweens.add({ targets: styleTag, alpha: 1, duration: 400, delay: 1200 });

    this._menuItems.forEach((item, i) => {
      this.tweens.add({
        targets: item.text,
        alpha: 1,
        duration: 400,
        delay: 1400 + i * 200,
        ease: 'Sine.easeOut',
      });
    });

    // ── 键盘操控 ──────────────────────────────────
    this.input.keyboard?.on('keydown-UP', () => {
      if (this._menuItems.length > 1) {
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this.updateSelection();
      }
    });

    this.input.keyboard?.on('keydown-DOWN', () => {
      if (this._menuItems.length > 1) {
        this._selectedIndex = Math.min(this._menuItems.length - 1, this._selectedIndex + 1);
        this.updateSelection();
      }
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this._menuItems[this._selectedIndex]?.action();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this._menuItems[this._selectedIndex]?.action();
    });

    // 初始高亮
    this.updateSelection();

    console.log(`[ResultScene] 结算 — ${this._data.levelName} | 得分:${this._data.score} 时间:${this.formatTime(this._data.timeSec)} 死亡:${this._data.deaths}`);
  }

  // ── 创建菜单项 ───────────────────────────────────
  private createMenuItem(x: number, y: number, label: string, action: () => void): {
    text: Phaser.GameObjects.Text;
    action: () => void;
  } {
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ccccdd',
      padding: { x: 30, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => {
      this._selectedIndex = this._menuItems.findIndex((m) => m.text === text);
      this.updateSelection();
    });

    text.on('pointerdown', action);

    return { text, action };
  }

  // ── 高亮更新 ────────────────────────────────────
  private updateSelection(): void {
    this._menuItems.forEach((item, i) => {
      if (i === this._selectedIndex) {
        item.text.setColor('#ffd700');
        item.text.setFontStyle('bold');
      } else {
        item.text.setColor('#8899aa');
        item.text.setFontStyle('normal');
      }
    });
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
