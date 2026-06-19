// ============================================================
// BootScene.ts — 启动加载场景
// Phase 3 集成：集中加载所有外部美术/音频资源，完成后跳转主菜单
// ============================================================

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const A = 'assets'; // 短前缀

    // ── 加载错误监听（诊断纹理加载失败） ───────────
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`[BootScene] ❌ 资源加载失败: ${file.key} → ${file.url}`);
    });
    // 加载完成诊断
    this.load.on('complete', () => {
      console.log('[BootScene] ✅ 所有资源加载完成');
      console.log(`  player spritesheet: ${this.textures.exists('player') ? '✓' : '✗ 缺失!'}`);
      console.log(`  enemy_barbarian spritesheet: ${this.textures.exists('enemy_barbarian') ? '✓' : '✗ 缺失!'}`);
      console.log(`  boss_menghuo spritesheet: ${this.textures.exists('boss_menghuo') ? '✓' : '✗ 缺失!'}`);
    });

    // ── 精灵表（sprite sheets） ─────────────────────
    this.load.spritesheet('player',          `${A}/sprites/player/player.png`,          { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('enemy_barbarian', `${A}/sprites/enemy/enemy_barbarian.png`,  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('boss_menghuo',    `${A}/sprites/boss/boss_menghuo.png`,      { frameWidth: 96, frameHeight: 96 });

    // ── 肖像（单帧图片） ─────────────────────────────
    this.load.image('portrait_zhugeliang', `${A}/sprites/npc/zhugeliang.png`);
    this.load.image('portrait_zhangbo',    `${A}/sprites/npc/zhangbo.png`);

    // ── Tileset ─────────────────────────────────────
    this.load.image('tileset_l1', `${A}/tilesets/tileset_l1.png`);

    // ── UI 组件（预切片） ───────────────────────────────
    this.load.image('ui_hp_bar',       `${A}/ui/ui_hp_bar.png`);
    this.load.image('ui_hp_fill',      `${A}/ui/ui_hp_fill.png`);
    this.load.image('ui_boss_hp_bar',  `${A}/ui/ui_boss_hp_bar.png`);
    this.load.image('ui_boss_hp_fill', `${A}/ui/ui_boss_hp_fill.png`);
    this.load.image('ui_weapon_panel', `${A}/ui/ui_weapon_panel.png`);
    this.load.image('ui_dialog_box',   `${A}/ui/ui_dialog_box.png`);
    this.load.image('ui_green_bar',    `${A}/ui/ui_green_bar.png`);

    // ── BGM（背景音乐，6 首） ────────────────────────
    this.load.audio('bgm_main_menu',       `${A}/audio/bgm/bgm_main_menu.wav`);
    this.load.audio('bgm_level_01',        `${A}/audio/bgm/bgm_level_01.wav`);
    this.load.audio('bgm_level_01_boss',   `${A}/audio/bgm/bgm_level_01_boss.wav`);
    this.load.audio('bgm_victory_fanfare', `${A}/audio/bgm/bgm_victory_fanfare.wav`);
    this.load.audio('bgm_cutscene_calm',   `${A}/audio/bgm/bgm_cutscene_calm.wav`);
    this.load.audio('bgm_cutscene_tense',  `${A}/audio/bgm/bgm_cutscene_tense.wav`);

    // ── SFX（音效，8 个） ────────────────────────────
    this.load.audio('sfx_shoot',         `${A}/audio/sfx/shoot.wav`);
    this.load.audio('sfx_hit',           `${A}/audio/sfx/hit.wav`);
    this.load.audio('sfx_jump',          `${A}/audio/sfx/jump.wav`);
    this.load.audio('sfx_boss_charge',   `${A}/audio/sfx/boss_charge.wav`);
    this.load.audio('sfx_boss_stomp',    `${A}/audio/sfx/boss_stomp.wav`);
    this.load.audio('sfx_dialog_popup',  `${A}/audio/sfx/dialog_popup.wav`);
    this.load.audio('sfx_capture',       `${A}/audio/sfx/capture.wav`);
    this.load.audio('sfx_victory',       `${A}/audio/sfx/victory.wav`);
  }

  create(): void {
    // Phaser 3 行为说明：
    //   preload() 中注册的加载任务会自动阻塞到 create() 调用之前完成。
    //   因此 create() 中 this.load.isLoading() 永远为 false，
    //   不需要手动等待 load.once('complete') 或超时兜底。
    //   直接播放过渡动画即可 —— 此时所有纹理、音频已就绪。

    const { width, height } = this.cameras.main;

    // ── 初始化全局单例系统 ────────────────────────
    const saveSys = SaveSystem.getInstance();
    console.log(`[BootScene] SaveSystem 就绪 — 已解锁: ${saveSys.data.unlockedLevels.join(', ') || '(无)'}`);

    // ── 标题文字 ──────────────────────────────────
    const title = this.add
      .text(width / 2, height / 2 - 20, '七擒孟获', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#d4a574',
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(width / 2, height / 2 + 20, 'Phase 2 · 加载中…', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#667788',
      })
      .setOrigin(0.5);

    // ── 过渡动画 → 跳转主菜单 ────────────────────
    // 短暂闪烁后跳转（灰盒模式亦然）
    this.tweens.add({
      targets: sub,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.scene.start('MainMenuScene');
      },
    });
  }
}
