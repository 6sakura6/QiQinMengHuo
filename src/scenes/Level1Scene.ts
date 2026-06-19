// ============================================================
// Level1Scene.ts — 第 1 关「西洱河初战」场景（Batch 1 灰盒版）
// 当前进度：灰盒地图 + Player 移动跳跃
// Batch 2 追加：WeaponSystem + 射击
// Batch 3 追加：Enemy 实体（巡逻/追击/受击/死亡）
// Batch 4 追加：CameraSystem + HUD（正式血条/冷却条/敌人计数/分数）
// Batch 5 追加：BossMengHuoL1 + Boss 血条 + Boss 触发/碰撞
// Batch 6 追加：DialogSystem
// Batch 8 追加：SaveSystem 串联 + 死亡/时间追踪
// Batch 8 热修复：防 interrupted-dialog 冻屏（取消 BOSS_INTRO 计时器 + physics 状态守卫）
// Batch 9 追加：StorySystem（碎片收集）+ ScreenShake（四级震动）
// Batch 11 追加：AudioManager 音效占位调用
// ============================================================

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossMengHuoL1 } from '../entities/BossMengHuoL1';
import { InputManager } from '../systems/InputManager';
import { WeaponSystem } from '../systems/WeaponSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { DialogSystem } from '../systems/DialogSystem';
import { CaptureSystem } from '../systems/CaptureSystem';
import type { DialogDataEntry } from '../systems/DialogSystem';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import { DialogTrigger } from '../types/system.types';
import { HUD } from '../ui/HUD';
import { BossHealthBar } from '../ui/BossHealthBar';
import { DialogBox } from '../ui/DialogBox';
import { SaveSystem } from '../systems/SaveSystem';
import { StorySystem } from '../systems/StorySystem';
import { ScreenShake } from '../systems/ScreenShake';
import { AudioManager, SFX, BGM } from '../systems/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config/constants';
import dialogsData from '../data/dialogs.json';
import fragmentsData from '../data/fragments.json';

// ─── 灰盒地图布局常量 ─────────────────────────────────────────
const MAP_WIDTH        = 5000;              // 关卡宽度（Boss 区需要更大地图）
const GROUND_Y         = GAME_HEIGHT - 40;  // 地面 Y
const BOSS_TRIGGER_X   = 3200;              // 玩家到达触发 Boss
const BOSS_SPAWN_X     = 4000;              // Boss 出生点
const BOSS_SPAWN_Y     = GROUND_Y - 120;    // Boss 出生 Y（大象体型大，需要更高）
const PLATFORM_CONFIGS = [
  // { x, y, w }  全部像素值
  { x: 200,  y: GAME_HEIGHT - 130, w: 160 },  // 低平台
  { x: 450,  y: GAME_HEIGHT - 200, w: 120 },  // 中平台
  { x: 680,  y: GAME_HEIGHT - 160, w: 200 },  // 宽平台
  { x: 980,  y: GAME_HEIGHT - 240, w: 100 },  // 高台
  { x: 1200, y: GAME_HEIGHT - 180, w: 180 },
  { x: 1500, y: GAME_HEIGHT - 220, w: 140 },
  { x: 1800, y: GAME_HEIGHT - 160, w: 160 },
  { x: 2100, y: GAME_HEIGHT - 200, w: 120 },
  { x: 2400, y: GAME_HEIGHT - 240, w: 200 },
  // Boss 竞技场区域（3200-5000）
  { x: 3400, y: GAME_HEIGHT - 200, w: 160 },
  { x: 3700, y: GAME_HEIGHT - 240, w: 100 },
  { x: 4100, y: GAME_HEIGHT - 180, w: 180 },
  { x: 4500, y: GAME_HEIGHT - 220, w: 140 },
];

export class Level1Scene extends Phaser.Scene {
  // ── 模块引用 ──────────────────────────────────────
  private player!: Player;
  private inputMgr!: InputManager;
  private weaponSys!: WeaponSystem;
  private cameraSys!: CameraSystem;
  private dialogSys!: DialogSystem;
  private captureSys!: CaptureSystem;
  private hud!: HUD;
  private bossHealthBar!: BossHealthBar;
  private dialogBox!: DialogBox;
  private storySys!: StorySystem;
  private screenShake!: ScreenShake;
  private bus = EventBus.getInstance();

  // ── 音频管理器（Batch 11）─────────────────────────
  private audioMgr!: AudioManager;

  // ── 物理组 ────────────────────────────────────────
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private _totalEnemies = 0;
  private _liveEnemies   = 0;
  private _score         = 0;
  private _dialogActive  = false;
  private boss!: BossMengHuoL1;
  private _bossSpawned   = false;
  private _startTime     = 0;
  private _deathCount    = 0;
  private _captureStarted = false;         // 🛡️ 擒获已启动标记
  private _bossIntroDelayMs = 0;          // 🛡️ Boss 登场对话延迟（自己管理 delta，避免 TimerManager 帧序竞争）
  private _fragmentsCollected: string[] = [];  // Batch 9: 本局收集的碎片 ID
  private _captureCompleteFired = false;   // 🔍 诊断: CAPTURE_COMPLETE 是否已触发
  private _resultSceneStarted = false;     // 🔍 诊断: ResultScene 是否已启动
  private _captureCompleteTime = 0;        // 🔍 诊断: CAPTURE_COMPLETE 触发时间
  private _noDialogSince = 0;              // 🔍 诊断: 上次对话活跃的时间戳
  private _dialogStuckTimer = 0;           // 🛡️ 安全网3: 对话卡住计时（同一次对话连续帧数）

  constructor() {
    super({ key: 'Level1Scene' });
  }

  // ─────────────────────────────────────────────────
  // preload — Batch 1：用程序生成灰盒贴图，不依赖外部文件
  // ─────────────────────────────────────────────────
  preload(): void {
    // 在 create 阶段用 generateTexture 代替真实精灵
    // 无需 load 任何文件
  }

  // ─────────────────────────────────────────────────
  // create — 组装场景
  // ─────────────────────────────────────────────────
  create(): void {
    // ⚠️ CRITICAL: 重置实例状态 — Phaser 的 scene.restart() 不重置类字段！
    //    如果不重置，_bossSpawned 在死亡重启后仍为 true → Boss 永远不会激活
    this._bossSpawned  = false;
    this._score        = 0;
    this._dialogActive = false;
    this._totalEnemies = 0;
    this._liveEnemies   = 0;
    // ⚠️ _deathCount 不在此重置 — 需要跨 scene.restart() 累积
    //    每次死亡触发 LEVEL_RESTART → _deathCount++ → restart → create()
    //    若在此归零则通关结算永远显示 deaths=0
    this._startTime    = this.time.now;
    this._captureStarted = false;
    this._bossIntroDelayMs = 0;
    this._fragmentsCollected = [];
    this._captureCompleteFired = false;
    this._resultSceneStarted = false;
    this._captureCompleteTime = 0;
    this._noDialogSince = 0;
    this._dialogStuckTimer = 0;

    // ⚠️ 必须绑定 shutdown 事件，否则 scene.restart() 不会清理旧资源
    this.events.on('shutdown', this.shutdown, this);

    this.buildGrayboxTextures();
    this.buildMap();
    this.spawnPlayer();
    this.setupWeaponSystem();
    this.spawnEnemies();
    this.setupCamera();
    this.spawnBoss();
    this.setupDialog();        // 先创建 dialogSys
    this.setupCapture();      // 再创建 captureSys，setDialogSys 能拿到有效引用
    this.setupCollisions();
    this.setupEventListeners();
    this.setupHUD();
    this.setupBossHealthBar();
    this.setupStorySystem();     // Batch 9: 故事碎片
    this.setupScreenShake();     // Batch 9: 屏幕震动
    this.spawnFragment();        // Batch 9: 隐藏碎片放置
    this.setupAudio();           // Batch 11: 音频管理器初始化 + BGM

    this.bus.emit(GameEvent.LEVEL_START, { levelId: 'level_01' });
    console.log('[Level1Scene] ✅ Batch 11 — 地图 + Player + 射击 + 敌人 + Camera + HUD + Boss + 对话 + 擒获 + SaveSystem + 碎片 + 震动 + AudioManager 就绪');
    console.log('  WASD/方向键移动，Space/W/↑ 跳跃，J/Z 射击（八方向弩箭）');
    console.log(`  敌人数：${this._totalEnemies}`);
  }

  // ─────────────────────────────────────────────────
  // update — 每帧驱动 InputManager + Player
  // ─────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    // 🔍 诊断安全网 1: CAPTURE_COMPLETE 已触发但 ResultScene 未启动 → 强制跳转
    if (this._captureCompleteFired && !this._resultSceneStarted) {
      if (this._captureCompleteTime === 0) {
        this._captureCompleteTime = _time;
      } else if (_time - this._captureCompleteTime > 2000) {
        console.error('[Level1Scene] 🚨 安全网1: CAPTURE_COMPLETE 后 2s ResultScene 仍未启动，强制跳转！');
        this._resultSceneStarted = true;
        this.scene.start('ResultScene', {
          levelId: 'level_01',
          levelName: '西洱河初战',
          score: this._score,
          timeSec: Math.floor((this.time.now - this._startTime) / 1000),
          deaths: this._deathCount,
          nextLevelId: 'level_02',
        });
        return;
      }
    }

    // 🔍 诊断安全网 2: 擒获流程已启动但 CAPTURE_COMPLETE 未触发，且无对话活跃超过 5s → 强制推进
    if (this._captureStarted && !this._captureCompleteFired) {
      if (this._dialogActive) {
        this._noDialogSince = _time;
      } else {
        if (this._noDialogSince === 0) {
          this._noDialogSince = _time;
        } else if (_time - this._noDialogSince > 5000) {
          console.error('[Level1Scene] 🚨 安全网2: 擒获流程中无对话活跃超过 5s，强制触发 CAPTURE_COMPLETE！');
          this._captureCompleteFired = true;
          this._captureCompleteTime = _time;
          // 直接跳转，不经过 CaptureSystem
          this.scene.start('ResultScene', {
            levelId: 'level_01',
            levelName: '西洱河初战',
            score: this._score,
            timeSec: Math.floor((this.time.now - this._startTime) / 1000),
            deaths: this._deathCount,
            nextLevelId: 'level_02',
          });
          return;
        }
      }
    }

    // 🛡️ 安全网3: _dialogActive 卡住超过 12s 强制恢复（无论是否擒获流程）
    //   — 防御 TimerManager 帧序竞争导致 physics.pause + _dialogActive=true 死锁
    if (this._dialogActive) {
      this._dialogStuckTimer += delta;
      if (this._dialogStuckTimer > 12000) {
        console.error('[Level1Scene] 🚨 安全网3: _dialogActive 卡住超过 12s，强制恢复！');
        console.error(`  state: captureStarted=${this._captureStarted} captureCompleteFired=${this._captureCompleteFired}`);
        this._dialogActive = false;
        this.physics.resume();
        this.player.unlockFromCutscene();
        this.dialogBox.hide();
        this.dialogSys.reset();
        this._dialogStuckTimer = 0;
        // 如果是擒获流程中，强制跳转结算
        if (this._captureStarted && !this._captureCompleteFired) {
          this._captureCompleteFired = true;
          this.scene.start('ResultScene', {
            levelId: 'level_01',
            levelName: '西洱河初战',
            score: this._score,
            timeSec: Math.floor((this.time.now - this._startTime) / 1000),
            deaths: this._deathCount,
            nextLevelId: 'level_02',
          });
          return;
        }
      }
    } else {
      this._dialogStuckTimer = 0;
    }

    // 对话期间：只更新 DialogBox + HUD，暂停物理 + 输入 + 所有游戏逻辑
    if (this._dialogActive) {
      this.dialogBox.update(delta);
      this.hud.update({
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        cooldownPercent: this.weaponSys.cooldownPercent,
        liveEnemies: this._liveEnemies,
        totalEnemies: this._totalEnemies,
        score: this._score,
      });
      return;
    }

    this.inputMgr.update();
    const input = this.inputMgr.snapshot;

    this.player.updatePlayer(delta, input);
    this.weaponSys.update(
      delta, input,
      this.player.x, this.player.y,
      this.player.facingRight,
    );
    this.updateEnemies(delta);
    this.updateBoss(delta);
    this.bossHealthBar.pulse(delta);
    this.cameraSys.update(delta);
    this.hud.update({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      cooldownPercent: this.weaponSys.cooldownPercent,
      liveEnemies: this._liveEnemies,
      totalEnemies: this._totalEnemies,
      score: this._score,
    });
  }

  // ─────────────────────────────────────────────────
  // 像素三国纹理 — 程序化生成第1关全部背景/地面/装饰素材
  // 配色参考 Phase 3 规范：翠绿 #166534、琥珀金 #F59E0B、深藏青 #0F172A
  // ─────────────────────────────────────────────────
  private buildGrayboxTextures(): void {
    const tex = this.textures;

    // 辅助：无边框矩形纹理
    const genTex = (key: string, w: number, h: number, drawFn: (g: Phaser.GameObjects.Graphics) => void) => {
      if (tex.exists(key)) { console.log(`[纹理] ${key} 已存在，跳过`); return; }
      try {
        const g = this.add.graphics();
        drawFn(g);
        g.generateTexture(key, w, h);
        g.destroy();
        console.log(`[纹理] ${key} ${w}×${h} 生成${tex.exists(key) ? '成功' : '失败!!'}`);
      } catch (e) { console.error(`[纹理] ${key} 异常:`, e); }
    };

    console.log('[纹理] 🎨 开始生成像素三国贴图...');

    // ═══════════════════════════════════════
    // 地面瓦片 32×32：泥土层 + 翠绿草皮顶 + 像素纹理
    // ═══════════════════════════════════════
    genTex('ground_tile', 32, 32, (g) => {
      // 泥土填充
      g.fillStyle(0x4A3728, 1);
      g.fillRect(0, 0, 32, 32);
      // 泥土颗粒纹理
      g.fillStyle(0x3A2718, 1);
      g.fillRect(4, 12, 3, 3); g.fillRect(18, 20, 2, 2);
      g.fillRect(10, 26, 3, 2); g.fillRect(25, 8, 2, 3);
      g.fillStyle(0x5A4738, 1);
      g.fillRect(8, 8, 2, 2); g.fillRect(22, 16, 3, 3);
      g.fillRect(14, 24, 2, 2);
      // 草皮顶层 (3px 翠绿)
      g.fillStyle(0x166534, 1);
      g.fillRect(0, 0, 32, 4);
      // 草皮高光
      g.fillStyle(0x22C55E, 0.6);
      g.fillRect(0, 1, 32, 1);
      // 随机草叶尖
      g.fillStyle(0x22C55E, 0.8);
      g.fillRect(4, 0, 2, 1); g.fillRect(12, 0, 1, 2);
      g.fillRect(20, 0, 2, 1); g.fillRect(28, 0, 1, 2);
      // 底部暗边
      g.fillStyle(0x2A1708, 0.5);
      g.fillRect(0, 30, 32, 2);
    });

    // ═══════════════════════════════════════
    // 木纹平台 32×16：深木色 + 年轮纹理
    // ═══════════════════════════════════════
    genTex('platform_wood', 32, 16, (g) => {
      // 木板底色
      g.fillStyle(0x8B6914, 1);
      g.fillRect(0, 0, 32, 16);
      // 木纹横线
      g.fillStyle(0x7B5908, 0.8);
      g.fillRect(0, 3, 32, 1); g.fillRect(0, 7, 32, 1);
      g.fillRect(0, 11, 32, 1);
      g.fillStyle(0x6B4F12, 0.6);
      g.fillRect(0, 2, 32, 1); g.fillRect(0, 10, 32, 1);
      // 顶边（接触面高光）
      g.fillStyle(0xA07924, 1);
      g.fillRect(0, 0, 32, 2);
      // 底边暗
      g.fillStyle(0x5A3E08, 0.7);
      g.fillRect(0, 14, 32, 2);
      // 侧边竖线（板缝）
      g.fillStyle(0x6B4F12, 0.4);
      g.fillRect(10, 2, 1, 12); g.fillRect(21, 2, 1, 12);
    });

    // ═══════════════════════════════════════
    // 远山剪影 160×80
    // ═══════════════════════════════════════
    genTex('mountain_far', 160, 80, (g) => {
      g.fillStyle(0x1A2A3A, 1);
      // 主峰
      g.fillRect(0, 30, 160, 50);
      // 山峰三角形
      for (let x = 0; x < 160; x++) {
        const mid = 80;
        const h = Math.max(0, 45 - Math.abs(x - mid) * 0.58);
        g.fillStyle(0x1A2A3A, 1);
        g.fillRect(x, Math.floor(30 - h), 1, Math.ceil(h));
      }
      // 小山峰 (右侧)
      for (let x = 100; x < 160; x++) {
        const h2 = Math.max(0, 25 - Math.abs(x - 130) * 0.85);
        g.fillStyle(0x152535, 1);
        g.fillRect(x, Math.floor(25 - h2), 1, Math.ceil(h2));
      }
    });

    // ═══════════════════════════════════════
    // 近山/丘陵 200×100
    // ═══════════════════════════════════════
    genTex('mountain_near', 200, 100, (g) => {
      // 山体基底
      g.fillStyle(0x2A3A4A, 1);
      g.fillRect(0, 35, 200, 65);
      // 主峰 (左侧)
      for (let x = 0; x < 140; x++) {
        const h = Math.max(0, 50 - Math.abs(x - 50) * 0.55);
        g.fillRect(x, Math.floor(35 - h), 1, Math.ceil(h));
      }
      // 次峰 (右侧)
      for (let x = 60; x < 200; x++) {
        const h2 = Math.max(0, 35 - Math.abs(x - 130) * 0.5);
        g.fillRect(x, Math.floor(30 - h2), 1, Math.ceil(h2));
      }
      // 山体纹理（浅色斑块模拟岩石）
      g.fillStyle(0x3A4A5A, 0.5);
      g.fillRect(30, 20, 40, 8); g.fillRect(100, 15, 30, 6);
    });

    // ═══════════════════════════════════════
    // 树/竹林 48×80
    // ═══════════════════════════════════════
    genTex('tree_pine', 48, 80, (g) => {
      // 树干
      g.fillStyle(0x4A3728, 1);
      g.fillRect(22, 40, 4, 40);
      // 树冠层 1（底层最宽）
      g.fillStyle(0x0F2F1F, 1);
      g.fillRect(8, 28, 32, 14);
      g.fillStyle(0x166534, 0.8);
      g.fillRect(10, 30, 28, 10);
      // 树冠层 2
      g.fillStyle(0x0F2F1F, 1);
      g.fillRect(12, 16, 24, 14);
      g.fillStyle(0x166534, 0.8);
      g.fillRect(14, 18, 20, 10);
      // 树冠层 3（顶层最窄）
      g.fillStyle(0x0F2F1F, 1);
      g.fillRect(16, 4, 16, 14);
      g.fillStyle(0x22C55E, 0.5);
      g.fillRect(18, 6, 12, 8);
      // 树冠尖顶
      g.fillStyle(0x22C55E, 0.6);
      g.fillRect(22, 0, 4, 6);
    });

    // ═══════════════════════════════════════
    // 草丛装饰 24×12
    // ═══════════════════════════════════════
    genTex('deco_grass', 24, 12, (g) => {
      g.fillStyle(0x166534, 1);
      g.fillRect(4, 6, 3, 6);   // 草1
      g.fillRect(10, 3, 2, 9);  // 草2（较高）
      g.fillRect(15, 6, 3, 6);  // 草3
      g.fillRect(20, 4, 2, 8);  // 草4
      // 高光
      g.fillStyle(0x22C55E, 0.7);
      g.fillRect(5, 6, 1, 2); g.fillRect(11, 3, 1, 3);
      g.fillRect(16, 6, 1, 2); g.fillRect(21, 4, 1, 2);
    });

    // ═══════════════════════════════════════
    // 石块装饰 20×14
    // ═══════════════════════════════════════
    genTex('deco_stone', 20, 14, (g) => {
      g.fillStyle(0x5A5A6A, 1);
      g.fillRect(2, 4, 16, 10);
      g.fillRect(0, 8, 20, 6);  // 底部更宽
      // 高光面
      g.fillStyle(0x6A6A7A, 0.6);
      g.fillRect(3, 5, 6, 3);
      // 暗面
      g.fillStyle(0x3A3A4A, 0.5);
      g.fillRect(12, 8, 6, 5);
      // 轮廓
      g.fillStyle(0x4A4A5A, 0.8);
      g.fillRect(1, 8, 18, 1);
    });

    // ═══════════════════════════════════════
    // 汉军旌旗 8×48
    // ═══════════════════════════════════════
    genTex('deco_flag', 8, 48, (g) => {
      // 旗杆
      g.fillStyle(0x8B6914, 1);
      g.fillRect(3, 0, 2, 48);
      // 旗帜（朱砂红）
      g.fillStyle(0xDC2626, 1);
      g.fillRect(0, 4, 8, 18);
      // 旗帜暗面
      g.fillStyle(0x991B1B, 0.5);
      g.fillRect(0, 12, 8, 10);
      // 金色旗边
      g.fillStyle(0xF59E0B, 0.9);
      g.fillRect(0, 4, 8, 1);
      // 旗杆顶
      g.fillStyle(0xF59E0B, 1);
      g.fillRect(2, 0, 4, 3);
    });

    // ═══════════════════════════════════════
    // 游戏实体（保持不变）
    // ═══════════════════════════════════════
    genTex('player_placeholder', 24, 40, (g) => { this.drawHanSoldier(g); });
    genTex('enemy_placeholder', 24, 40, (g) => { this.drawBarbarianWarrior(g); });
    genTex('boss_meng_huo_placeholder', 64, 80, (g) => { this.drawMengHuoOnElephant(g); });
    genTex('bullet_placeholder', 12, 6, (g) => { this.drawCrossbowBolt(g); });
    genTex('fragment_marker', 16, 16, (g) => {
      g.fillStyle(0xFFD700, 1); g.fillRect(0, 0, 16, 16);
      g.lineStyle(2, 0xFFF8C0, 1); g.strokeRect(1, 1, 14, 14);
    });

    console.log('[纹理] ✅ 像素三国贴图全部生成完毕');
  }

  // ─────────────────────────────────────────────────
  // 构建像素三国背景地图 — 六层场景 + 游戏层
  //
  //  深度分层：
  //    -50  天空渐变
  //    -40  远山剪影
  //    -30  近山丘陵
  //    -25  河流
  //    -20  树丛
  //    -5   战场地面填充
  //      1   地面/平台（物理碰撞层）
  //      2~3 装饰物
  // ─────────────────────────────────────────────────
  private buildMap(): void {
    this.drawSky();
    this.drawFarMountains();
    this.drawNearMountains();
    this.drawRiver();
    this.drawTrees();
    this.drawGroundFill();
    this.buildGroundAndPlatforms();
    this.scatterDecorations();
    // this.drawDevGrid();     // 开发辅助网格（已关闭）
    this.buildWorldBounds();
  }

  // ── 天空：深蓝→暖橙黄昏渐变（水平条带，像素风）─────────
  private drawSky(): void {
    const g = this.add.graphics().setDepth(-50);
    const H = GAME_HEIGHT;
    const W = MAP_WIDTH;

    // 天空色带（从上到下，15 段过渡）
    const bands = [
      { y: 0,    h: 40,  c: 0x0B132B },
      { y: 40,   h: 40,  c: 0x0E1835 },
      { y: 80,   h: 40,  c: 0x111D3F },
      { y: 120,  h: 40,  c: 0x162649 },
      { y: 160,  h: 40,  c: 0x1A3053 },
      { y: 200,  h: 40,  c: 0x1E3A5D },
      { y: 240,  h: 35,  c: 0x234468 },
      { y: 275,  h: 30,  c: 0x2B4E70 },
      { y: 305,  h: 30,  c: 0x355A78 },
      { y: 335,  h: 30,  c: 0x426880 },
      { y: 365,  h: 30,  c: 0x4A6A7A },
      { y: 395,  h: 30,  c: 0x5A5A5A },
      { y: 425,  h: 30,  c: 0x6A4A3A },
      { y: 455,  h: 40,  c: 0x7A4A2A },
      { y: 495,  h: 45,  c: 0x8A4A2A },
    ];

    for (const b of bands) {
      g.fillStyle(b.c, 1);
      g.fillRect(0, b.y, W, b.h);
    }

    // 地平线暖金光晕（超宽渐变带）
    g.fillStyle(0xF59E0B, 0.04);
    g.fillRect(0, H - 60, W, 60);
    g.fillStyle(0xEA580C, 0.03);
    g.fillRect(0, H - 40, W, 40);
  }

  // ── 远山剪影（视差 0.2）────────────────────────────
  private drawFarMountains(): void {
    const cfg = [
      { x: -40,  y: GAME_HEIGHT - 105, sx: 1.6, sy: 1.1 },
      { x: 300,  y: GAME_HEIGHT - 100, sx: 1.4, sy: 1.0 },
      { x: 700,  y: GAME_HEIGHT - 108, sx: 1.8, sy: 1.15 },
      { x: 1100, y: GAME_HEIGHT - 95,  sx: 1.3, sy: 0.95 },
      { x: 1500, y: GAME_HEIGHT - 102, sx: 1.5, sy: 1.05 },
      { x: 1900, y: GAME_HEIGHT - 98,  sx: 1.7, sy: 1.1 },
      { x: 2300, y: GAME_HEIGHT - 106, sx: 1.4, sy: 1.0 },
      { x: 2700, y: GAME_HEIGHT - 100, sx: 1.6, sy: 1.08 },
      { x: 3100, y: GAME_HEIGHT - 95,  sx: 1.5, sy: 0.98 },
      { x: 3500, y: GAME_HEIGHT - 103, sx: 1.8, sy: 1.12 },
      { x: 3900, y: GAME_HEIGHT - 99,  sx: 1.4, sy: 1.0 },
      { x: 4300, y: GAME_HEIGHT - 105, sx: 1.6, sy: 1.05 },
      { x: 4700, y: GAME_HEIGHT - 97,  sx: 1.3, sy: 0.95 },
    ];

    for (const m of cfg) {
      const img = this.add.image(m.x, m.y, 'mountain_far')
        .setOrigin(0, 1)
        .setScale(m.sx, m.sy)
        .setAlpha(0.7)
        .setDepth(-40)
        .setScrollFactor(0.2);
      // 远山色调：统一冷蓝灰
      img.setTint(0x1A2A3A);
    }
  }

  // ── 近山丘陵（视差 0.5）────────────────────────────
  private drawNearMountains(): void {
    const cfg = [
      { x: -50,  y: GAME_HEIGHT - 85, sx: 1.4, sy: 1.0 },
      { x: 450,  y: GAME_HEIGHT - 78, sx: 1.2, sy: 0.9 },
      { x: 1000, y: GAME_HEIGHT - 90, sx: 1.6, sy: 1.1 },
      { x: 1600, y: GAME_HEIGHT - 82, sx: 1.3, sy: 0.95 },
      { x: 2200, y: GAME_HEIGHT - 88, sx: 1.5, sy: 1.05 },
      { x: 2800, y: GAME_HEIGHT - 80, sx: 1.4, sy: 0.92 },
      { x: 3400, y: GAME_HEIGHT - 86, sx: 1.7, sy: 1.08 },
      { x: 4000, y: GAME_HEIGHT - 83, sx: 1.3, sy: 0.95 },
      { x: 4600, y: GAME_HEIGHT - 87, sx: 1.5, sy: 1.0 },
    ];

    for (const m of cfg) {
      const img = this.add.image(m.x, m.y, 'mountain_near')
        .setOrigin(0, 1)
        .setScale(m.sx, m.sy)
        .setAlpha(0.8)
        .setDepth(-30)
        .setScrollFactor(0.5);
      img.setTint(0x2A3A4A);
    }
  }

  // ── 河流（中景蓝色水带）────────────────────────────
  private drawRiver(): void {
    const riverY = GAME_HEIGHT - 70;
    const g = this.add.graphics().setDepth(-25).setAlpha(0.5);

    // 河流主体
    g.fillStyle(0x1A3A5A, 0.8);
    g.fillRect(0, riverY, MAP_WIDTH, 18);

    // 水面波光（像素短线）
    g.fillStyle(0x2A5A8A, 0.6);
    const segments = Math.floor(MAP_WIDTH / 48);
    for (let i = 0; i < segments; i++) {
      const sx = i * 48 + ((i % 3) * 12);
      g.fillRect(sx, riverY + 4, 24, 2);
      g.fillRect(sx + 6, riverY + 10, 16, 2);
    }

    // 河岸边缘（深色过渡）
    g.fillStyle(0x0F2A1A, 0.4);
    g.fillRect(0, riverY - 2, MAP_WIDTH, 3);
    g.fillRect(0, riverY + 16, MAP_WIDTH, 4);
  }

  // ── 树丛散落（战场两侧 + 远景装饰）─────────────────
  private drawTrees(): void {
    const trees = [
      // 远景树丛（较小，更透明）
      { x: 80,   y: GAME_HEIGHT - 95,  s: 0.5, a: 0.4, d: -20, scr: 0.3 },
      { x: 350,  y: GAME_HEIGHT - 90,  s: 0.55, a: 0.4, d: -20, scr: 0.3 },
      { x: 650,  y: GAME_HEIGHT - 98,  s: 0.45, a: 0.35, d: -20, scr: 0.3 },
      { x: 1350, y: GAME_HEIGHT - 85,  s: 0.5, a: 0.4, d: -20, scr: 0.3 },
      { x: 1850, y: GAME_HEIGHT - 92,  s: 0.55, a: 0.35, d: -20, scr: 0.3 },
      { x: 2550, y: GAME_HEIGHT - 88,  s: 0.5, a: 0.4, d: -20, scr: 0.3 },
      { x: 3150, y: GAME_HEIGHT - 95,  s: 0.45, a: 0.35, d: -20, scr: 0.3 },
      { x: 3850, y: GAME_HEIGHT - 90,  s: 0.55, a: 0.4, d: -20, scr: 0.3 },
      { x: 4550, y: GAME_HEIGHT - 93,  s: 0.5, a: 0.35, d: -20, scr: 0.3 },

      // 近景树丛（较大，地面层装饰）
      { x: 40,   y: GAME_HEIGHT - 55,  s: 0.65, a: 0.55, d: 2, scr: 0.8 },
      { x: 250,  y: GAME_HEIGHT - 50,  s: 0.6, a: 0.5, d: 2, scr: 0.8 },
      { x: 900,  y: GAME_HEIGHT - 58,  s: 0.7, a: 0.55, d: 2, scr: 0.8 },
      { x: 1700, y: GAME_HEIGHT - 52,  s: 0.6, a: 0.5, d: 2, scr: 0.8 },
      { x: 2400, y: GAME_HEIGHT - 56,  s: 0.65, a: 0.55, d: 2, scr: 0.8 },
      { x: 3300, y: GAME_HEIGHT - 50,  s: 0.7, a: 0.5, d: 2, scr: 0.8 },
      { x: 4200, y: GAME_HEIGHT - 54,  s: 0.65, a: 0.55, d: 2, scr: 0.8 },
      { x: 4900, y: GAME_HEIGHT - 53,  s: 0.6, a: 0.5, d: 2, scr: 0.8 },
    ];

    for (const t of trees) {
      this.add.image(t.x, t.y, 'tree_pine')
        .setOrigin(0.5, 1)
        .setScale(t.s)
        .setAlpha(t.a)
        .setDepth(t.d)
        .setScrollFactor(t.scr);
    }
  }

  // ── 战场地面填充（泥土色，在游戏地面之下）──────────
  private drawGroundFill(): void {
    const g = this.add.graphics().setDepth(-5);
    // 深泥底色铺在河流之下与地面之间的区域
    g.fillStyle(0x3A2A1A, 1);
    g.fillRect(0, GAME_HEIGHT - 55, MAP_WIDTH, 60);
    // 地面泥土纹理带
    g.fillStyle(0x4A3728, 0.6);
    g.fillRect(0, GAME_HEIGHT - 45, MAP_WIDTH, 15);
  }

  // ── 游戏层：地面 + 平台（物理碰撞）─────────────────
  private buildGroundAndPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    const tilesX = Math.ceil(MAP_WIDTH / TILE_SIZE) + 1;
    const MAP_DEPTH = 1;

    // ── 地面（3 行草皮泥土砖）───────────────────────
    for (let i = 0; i < tilesX; i++) {
      for (let row = 0; row < 3; row++) {
        const tile = this.platforms.create(
          i * TILE_SIZE + TILE_SIZE / 2,
          GROUND_Y + row * TILE_SIZE,
          'ground_tile',
        );
        tile.setDepth(MAP_DEPTH);
      }
    }

    // ── 木纹跳台 ────────────────────────────────────
    for (const cfg of PLATFORM_CONFIGS) {
      // 木平台用半高 tile（16px 高，居中对齐到 cfg.y）
      const platTileH = 16;
      const platY = cfg.y - platTileH / 2;
      const tileCount = Math.ceil(cfg.w / TILE_SIZE);

      for (let i = 0; i < tileCount; i++) {
        const tile = this.platforms.create(
          cfg.x + i * TILE_SIZE + TILE_SIZE / 2,
          cfg.y,
          'platform_wood',
        );
        tile.setDepth(MAP_DEPTH);
        // 修正碰撞体高度为 16px
        const body = tile.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(TILE_SIZE, platTileH);
        body.setOffset(0, -platTileH / 2);
      }
    }
  }

  // ── 战场散落装饰（草丛、石块、旗帜）───────────────
  private scatterDecorations(): void {
    const decos = [
      // 草丛（地面附近，坐标略高于地面）
      { t: 'deco_grass', x: 60,   y: GAME_HEIGHT - 52, d: 3 },
      { t: 'deco_grass', x: 180,  y: GAME_HEIGHT - 48, d: 3 },
      { t: 'deco_grass', x: 320,  y: GAME_HEIGHT - 54, d: 3 },
      { t: 'deco_grass', x: 550,  y: GAME_HEIGHT - 50, d: 3 },
      { t: 'deco_grass', x: 720,  y: GAME_HEIGHT - 53, d: 3 },
      { t: 'deco_grass', x: 1050, y: GAME_HEIGHT - 47, d: 3 },
      { t: 'deco_grass', x: 1300, y: GAME_HEIGHT - 52, d: 3 },
      { t: 'deco_grass', x: 1580, y: GAME_HEIGHT - 49, d: 3 },
      { t: 'deco_grass', x: 1950, y: GAME_HEIGHT - 55, d: 3 },
      { t: 'deco_grass', x: 2200, y: GAME_HEIGHT - 50, d: 3 },
      { t: 'deco_grass', x: 2600, y: GAME_HEIGHT - 48, d: 3 },
      { t: 'deco_grass', x: 2900, y: GAME_HEIGHT - 53, d: 3 },
      { t: 'deco_grass', x: 3500, y: GAME_HEIGHT - 51, d: 3 },
      { t: 'deco_grass', x: 4000, y: GAME_HEIGHT - 49, d: 3 },
      { t: 'deco_grass', x: 4400, y: GAME_HEIGHT - 54, d: 3 },
      { t: 'deco_grass', x: 4800, y: GAME_HEIGHT - 50, d: 3 },

      // 石块
      { t: 'deco_stone', x: 130,  y: GAME_HEIGHT - 46, d: 2 },
      { t: 'deco_stone', x: 440,  y: GAME_HEIGHT - 48, d: 2 },
      { t: 'deco_stone', x: 880,  y: GAME_HEIGHT - 44, d: 2 },
      { t: 'deco_stone', x: 1400, y: GAME_HEIGHT - 47, d: 2 },
      { t: 'deco_stone', x: 2100, y: GAME_HEIGHT - 45, d: 2 },
      { t: 'deco_stone', x: 2700, y: GAME_HEIGHT - 48, d: 2 },
      { t: 'deco_stone', x: 3600, y: GAME_HEIGHT - 46, d: 2 },
      { t: 'deco_stone', x: 4300, y: GAME_HEIGHT - 44, d: 2 },

      // 汉军旗帜
      { t: 'deco_flag', x: 100,  y: GAME_HEIGHT - 80, d: 3 },
      { t: 'deco_flag', x: 600,  y: GAME_HEIGHT - 82, d: 3 },
      { t: 'deco_flag', x: 1600, y: GAME_HEIGHT - 78, d: 3 },
      { t: 'deco_flag', x: 2500, y: GAME_HEIGHT - 84, d: 3 },
      { t: 'deco_flag', x: 3800, y: GAME_HEIGHT - 80, d: 3 },
      { t: 'deco_flag', x: 4700, y: GAME_HEIGHT - 79, d: 3 },
    ];

    for (const d of decos) {
      this.add.image(d.x, d.y, d.t)
        .setOrigin(0.5, 1)
        .setDepth(d.d);
    }
  }

  // ── 世界边界 ──────────────────────────────────────
  private buildWorldBounds(): void {
    // 左右隐形边界墙
    const wallL = this.physics.add.staticImage(-16, GAME_HEIGHT / 2, 'ground_tile');
    const wallR = this.physics.add.staticImage(MAP_WIDTH + 16, GAME_HEIGHT / 2, 'ground_tile');
    wallL.setVisible(false);
    wallR.setVisible(false);
    wallL.body.setSize(32, GAME_HEIGHT);
    wallR.body.setSize(32, GAME_HEIGHT);
    this.platforms.add(wallL);
    this.platforms.add(wallR);

    this.physics.world.setBounds(0, -GAME_HEIGHT, MAP_WIDTH, GAME_HEIGHT * 3);
  }

  // ─────────────────────────────────────────────────
  // 生成玩家
  // ─────────────────────────────────────────────────
  private spawnPlayer(): void {
    this.player = new Player(this, 120, GROUND_Y - 60);
    this.inputMgr = new InputManager(this);
  }

  // ─────────────────────────────────────────────────
  // 武器系统（Batch 2）
  // ─────────────────────────────────────────────────
  private setupWeaponSystem(): void {
    this.weaponSys = new WeaponSystem(this);
  }

  // ─────────────────────────────────────────────────
  // 敌人生成（Batch 3）
  // ─────────────────────────────────────────────────
  private spawnEnemies(): void {
    this.enemyGroup = this.physics.add.group({ runChildUpdate: false });

    // 敌人放置点（pixel 坐标，出生后受重力落到地面 / 平台）
    const spawns: { x: number; y: number }[] = [
      // 地面蛮兵（y 略高于地面，重力自动下落）
      { x: 400,  y: GROUND_Y - 80 },
      { x: 800,  y: GROUND_Y - 80 },
      { x: 1200, y: GROUND_Y - 80 },
      { x: 1700, y: GROUND_Y - 80 },
      { x: 2200, y: GROUND_Y - 80 },
      // 平台蛮兵（出生在第一个宽平台上方）
      { x: 700,  y: GAME_HEIGHT - 210 },
    ];

    for (const s of spawns) {
      const enemy = new Enemy(this, s.x, s.y);
      this.enemyGroup.add(enemy);
    }

    this._totalEnemies = spawns.length;
    this._liveEnemies   = spawns.length;
  }

  // ─────────────────────────────────────────────────
  // 敌人帧更新 + 清理（Bullet Group 同款模式）
  // ─────────────────────────────────────────────────
  private updateEnemies(delta: number): void {
    const enemies = this.enemyGroup.getChildren() as Enemy[];
    const toCleanup: Enemy[] = [];

    for (const e of enemies) {
      if (!e.active) {
        toCleanup.push(e);
        continue;
      }
      e.updateEnemy(delta, this.player.x, this.player.y);
    }

    for (const e of toCleanup) {
      this.enemyGroup.remove(e, false, false);
    }
  }

  // ─────────────────────────────────────────────────
  // 物理碰撞
  // ─────────────────────────────────────────────────
  private setupCollisions(): void {
    // 玩家 ↔ 平台
    this.physics.add.collider(
      this.player as unknown as Phaser.Physics.Arcade.Sprite,
      this.platforms,
    );

    // 敌人 ↔ 平台（站在地面上 / 平台上）
    this.physics.add.collider(this.enemyGroup, this.platforms);

    // 玩家 ↔ 敌人（接触伤害，Player.invincible 提供内置冷却）
    this.physics.add.overlap(
      this.player as unknown as Phaser.Physics.Arcade.Sprite,
      this.enemyGroup,
      () => { this.player.takeDamage(1, 'enemy'); },
      (_player, enemy) => {
        const e = enemy as unknown as Enemy;
        return e.active && !e.isDefeated;
      },
      this,
    );

    // 子弹 ↔ 敌人（命中击杀）
    // ⚠️ 同 Boss：用 getData('damage') 识别子弹，不依赖参数顺序
    this.physics.add.overlap(
      this.weaponSys.getBulletGroup(),
      this.enemyGroup,
      (objA, objB) => {
        const aIsBullet = (objA as any).getData?.('damage') !== undefined;
        const bulletObj = (aIsBullet ? objA : objB) as unknown as Phaser.Physics.Arcade.Sprite;
        const enemyObj = (aIsBullet ? objB : objA) as unknown as Enemy;
        const dmg: number = bulletObj.getData('damage') ?? 1;
        enemyObj.takeDamage(dmg);
        bulletObj.destroy();
      },
      (objA, objB) => {
        const aIsBullet = (objA as any).getData?.('damage') !== undefined;
        const bulletObj = (aIsBullet ? objA : objB) as unknown as Phaser.Physics.Arcade.Sprite;
        const enemyObj = (aIsBullet ? objB : objA) as unknown as Enemy;
        return bulletObj.active && enemyObj.active && !enemyObj.isDefeated;
      },
      this,
    );

    // 子弹 ↔ 平台（命中即销毁）
    this.physics.add.collider(
      this.weaponSys.getBulletGroup(),
      this.platforms,
      (bullet) => {
        const go = bullet as unknown as Phaser.GameObjects.GameObject;
        if (go.getData?.('damage') !== undefined) {
          go.destroy();
        }
      },
    );

    // 子弹 ↔ 世界边界（越界即销毁）
    // esbuild 编译后 instanceof Bullet 失效，用 getData('damage') 识别子弹
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      const go = body.gameObject;
      if (go.getData('damage') !== undefined) {
        go.destroy();
      }
    });

    // ── Boss 碰撞（Batch 5）───────────────────────
    this.setupBossCollisions();
  }

  // ─────────────────────────────────────────────────
  // Boss 碰撞独立方法（便于管理）
  // ─────────────────────────────────────────────────
  private setupBossCollisions(): void {
    // Boss ↔ 平台（站在地面上）
    this.physics.add.collider(
      this.boss as unknown as Phaser.Physics.Arcade.Sprite,
      this.platforms,
    );

    // 玩家 ↔ Boss（接触伤害）
    this.physics.add.overlap(
      this.player as unknown as Phaser.Physics.Arcade.Sprite,
      this.boss as unknown as Phaser.Physics.Arcade.Sprite,
      () => {
        if (!this.boss.isActive || this.boss.isDefeated) return;
        const dmg = this.boss.dealContactDamage();
        this.player.takeDamage(dmg, 'boss');
      },
      (_p, _b) => this.boss.isActive && !this.boss.isDefeated,
      this,
    );

    // 子弹 ↔ Boss（命中伤害）
    // ⚠️ BUGFIX: Phaser overlap 回调参数顺序不保证！
    //    add.overlap(group, sprite) 的回调可能收到 (sprite, groupChild)。
    //    不能假设第一个参数是子弹。必须用 getData('damage') 识别子弹。
    //    之前的 Bug：b.setActive(false) 实际作用在 Boss 上 → Boss 永久失活。
    this.physics.add.overlap(
      this.weaponSys.getBulletGroup(),
      this.boss as unknown as Phaser.Physics.Arcade.Sprite,
      (objA, objB) => {
        // 用 getData('damage') 识别子弹（只有子弹有此属性）
        const aIsBullet = (objA as any).getData?.('damage') !== undefined;
        const bulletObj = (aIsBullet ? objA : objB) as unknown as Phaser.Physics.Arcade.Sprite;

        if (!this.boss.isVulnerable) return;
        if (!bulletObj.active) return;
        const dmg: number = bulletObj.getData('damage') ?? 1;
        this.boss.takeDamage(dmg);
        // 安全失活子弹（绝不影响 Boss）
        bulletObj.setActive(false);
        bulletObj.setVisible(false);
        (bulletObj.body as Phaser.Physics.Arcade.Body).enable = false;
      },
      (objA, objB) => {
        const aIsBullet = (objA as any).getData?.('damage') !== undefined;
        const bulletObj = (aIsBullet ? objA : objB) as unknown as Phaser.Physics.Arcade.Sprite;
        return this.boss.isVulnerable && bulletObj.active;
      },
      this,
    );
  }

  // ─────────────────────────────────────────────────
  // 摄像机系统（Batch 4）
  // ─────────────────────────────────────────────────
  private setupCamera(): void {
    this.cameraSys = new CameraSystem(this, {
      worldBounds: new Phaser.Geom.Rectangle(
        0, -GAME_HEIGHT, MAP_WIDTH, GAME_HEIGHT * 3,
      ),
      lerpX: 0.08,
      lerpY: 0.08,
      deadzoneW: 80,
      deadzoneH: 40,
    });
    this.cameraSys.follow(this.player as unknown as Phaser.GameObjects.GameObject);
  }

  // ─────────────────────────────────────────────────
  // EventBus 监听
  // ─────────────────────────────────────────────────
  private setupEventListeners(): void {
    // 关卡重启（玩家死亡触发）— Batch 8: 追踪死亡次数
    // 🔧 热修复: 使用 delayedCall(0) 延迟一帧执行 scene.restart()，
    //    避免从 Player.die() 的延时回调中直接调用 restart 导致的 Phaser 内部竞态。
    this.bus.on(GameEvent.LEVEL_RESTART, (_payload) => {
      this._deathCount++;
      this.bus.clear();
      // 延迟到下一帧：确保不在任何 Phaser 内部迭代（TweenManager/TimerEvent）中销毁场景
      this.time.delayedCall(1, () => {
        this.scene.restart();
      });
    });

    // 敌人击杀——追踪全清 + 计分
    this.bus.on(GameEvent.ENEMY_DEFEATED, (payload) => {
      const p = payload as any;
      this._liveEnemies = Math.max(0, this._liveEnemies - 1);
      this._score += p.scoreValue ?? 100;
      this.audioMgr.playSfx(SFX.ENEMY_DEATH);    // 🔊 敌人死亡音效
      if (this._liveEnemies <= 0) {
        this.bus.emit(GameEvent.ALL_ENEMIES_CLEARED, {
          count: this._totalEnemies,
        });
        console.log('[Level1Scene] 🎉 所有敌人已消灭！');
      }
    });

    // Boss 被击败（Batch 7: 交给 CaptureSystem 接管）
    this.bus.on(GameEvent.BOSS_DEFEATED, (payload) => {
      const p = payload as { bossId: string; scoreValue: number };
      console.log(`[Level1Scene] 👑 Boss 击败: ${p.bossId} — 准备进入擒获流程，获得 ${p.scoreValue} 分`);
      this._score += p.scoreValue;
      this.audioMgr.playSfx(SFX.CAPTURE_START);  // 🔊 Boss 被擒音效
      // 切换为擒获 BGM（若有）
      // this.audioMgr.playBgm(BGM.BOSS);          // 占位：后续可切换 Boss 被擒 BGM

      // 🛡️ 标记擒获已启动 + 取消 Boss 登场对话
      this._captureStarted = true;
      this._bossIntroDelayMs = 0;  // 清除 delta 计数（若 BOSS_INTRO 已触发则无害）

      this.captureSys.startCapture(this.boss);
    });

    // Boss AOE 伤害转发（Batch 5）
    // Boss 的踏地/横扫通过 PLAYER_DAMAGED(currentHp=-1) 发送伤害请求
    // Scene 负责实际调用 player.takeDamage()
    this.bus.on(GameEvent.PLAYER_DAMAGED, (payload) => {
      const p = payload as { currentHp: number; maxHp: number; source: string };
      if (p.currentHp === -1 && p.source.startsWith('boss_')) {
        const dmg = p.source === 'boss_stomp' ? 1 : 1;
        this.player.takeDamage(dmg, p.source);
      }
      // Batch 9: 敌人攻击震动
      if (p.source === 'enemy') {
        this.screenShake.light();
      }
      // Batch 11: 玩家受伤音效
      this.audioMgr.playSfx(SFX.PLAYER_HIT, { volume: 0.8 });
    });

    // Batch 9: 玩家死亡 → 强烈震动  |  Batch 11: 死亡音效
    this.bus.on(GameEvent.PLAYER_DEATH, (_payload) => {
      this.screenShake.heavy();
      this.audioMgr.playSfx(SFX.PLAYER_DEATH);
    });

    // ── 对话状态管理（Batch 6）─────────────────────
    // 🛡️ Batch 8 热修复: 使用计数器替代布尔 toggle，防多次 pause 导致 resume 失效
    this.bus.on(GameEvent.DIALOG_START, (_payload) => {
      const wasActive = this._dialogActive;
      this._dialogActive = true;
      this.player.lockForCutscene();
      // 仅在首次进入对话时暂停物理（防多次 pause 后单次 resume 无法恢复）
      if (!wasActive) {
        this.physics.pause();
      }
    });

    this.bus.on(GameEvent.DIALOG_END, (_payload) => {
      console.log(`[Level1Scene] 🔍 DIALOG_END handler — dialogSys.isActive=${this.dialogSys.isActive}, _dialogActive=${this._dialogActive}, captureSys.isActive=${this.captureSys?.isActive}`);
      // ⚠️ 关键守卫：DIALOG_END 后可能同步触发 chained next 或 CaptureSystem 推进，
      //    此时 dialogSys.isActive 已变为 true（新对话已开始）。
      //    只在对话链真正结束时才重置状态，否则会覆写新对话的激活标志。
      if (this.dialogSys.isActive) {
        // 链式对话或擒获流程触发了下一句——什么都不做
        console.log('[Level1Scene] 🔍 DIALOG_END → dialogSys.isActive=true → return (守卫)');
        return;
      }

      this._dialogActive = false;
      this.player.unlockFromCutscene();
      this.physics.resume();   // 恢复物理模拟
      this.inputMgr.reset();   // ⚠️ 清除残留按键，防止对话中按着的 Space 触发跳跃

      // 🛡️ 安全检查：确保物理世界确实被恢复了
      //    如果由于某些异常路径导致 physics 仍然暂停，强制恢复
      if ((this.physics.world as any).isPaused) {
        console.warn('[Level1Scene] ⚠️ DIALOG_END 后 physics 仍为暂停状态，强制恢复');
        this.physics.resume();
      }
    });

    // Boss 阶段变化 → 触发中盘对话（Batch 6）
    this.bus.on(GameEvent.BOSS_PHASE_CHANGE, (payload) => {
      const p = payload as { phase: number; hpPercent: number };
      if (p.phase === 2 && !this._dialogActive) {
        // ⚠️ 守卫：若 BOSS_INTRO 对话仍在播放则跳过，避免时序竞争
        this.dialogSys.triggerByEvent(DialogTrigger.BOSS_PHASE);
      }
    });

    // ── 擒获流程事件（Batch 7）────────────────────
    // 擒获对话：孟获被擒后的不服台词
    this.bus.on(GameEvent.CAPTURE_DIALOG_START, (_payload) => {
      this.dialogSys.triggerByEvent(DialogTrigger.BOSS_DEFEAT);
    });

    // 释放对话：诸葛亮释放孟获台词
    this.bus.on(GameEvent.CAPTURE_RELEASE_START, (_payload) => {
      this.dialogSys.triggerByEvent(DialogTrigger.RELEASE);
    });

    // ── 碎片收集（Batch 9）─────────────────────────
    this.bus.on(GameEvent.FRAGMENT_COLLECTED, (payload) => {
      const p = payload as { fragmentId: string };
      if (!this._fragmentsCollected.includes(p.fragmentId)) {
        this._fragmentsCollected.push(p.fragmentId);
      }
      const frag = this.storySys.getFragment(p.fragmentId);
      console.log(`[Level1Scene] 📜 碎片收集: ${p.fragmentId} — "${frag?.title}"`);
      this.audioMgr.playSfx(SFX.FRAGMENT_PICK);  // 🔊 碎片拾取音效
      // 碎片发现提示（通过对话系统显示简短提示）
      this.dialogSys.triggerByEvent(DialogTrigger.FRAGMENT_FOUND);
    });

    // 擒获完成 → 记录统计 + 跳转结算（Batch 8: SaveSystem 串联）
    // 🛡️ 安全网: 即使 delayedCall 被异常清除也保证跳转
    this.bus.on(GameEvent.CAPTURE_COMPLETE, (_payload) => {
      console.log('[Level1Scene] 🔍 CAPTURE_COMPLETE handler 触发');
      this._captureCompleteFired = true;
      const timeSec = Math.floor((this.time.now - this._startTime) / 1000);
      const saveSys = SaveSystem.getInstance();

      try {
        saveSys.recordLevelCompletion({
          levelId: 'level_01',
          completed: true,
          timeSec,
          score: this._score,
          deaths: this._deathCount,
          fragmentsCollected: [...this._fragmentsCollected],
          playStyle: '',
        });

        saveSys.unlockLevel('level_02');
      } catch (e) {
        console.error('[Level1Scene] ❌ SaveSystem 操作异常:', e);
      }

      console.log(`[Level1Scene] 🏆 擒获完成 — 时间:${timeSec}s 得分:${this._score} 死亡:${this._deathCount}`);
      this.audioMgr.playSfx(SFX.CAPTURE_DONE);   // 🔊 擒获完成胜利音效
      this.audioMgr.stopBgm();                    // 停止关卡 BGM，进入结算静默
      console.log('[Level1Scene] → 0.8s 后跳转结算');

      // 🛡️ 确保 physics 已恢复（防御：对话链异常可能导致 physics 仍暂停）
      if ((this.physics.world as any).isPaused) {
        console.warn('[Level1Scene] ⚠️ CAPTURE_COMPLETE 时 physics 仍为暂停，强制恢复');
        this.physics.resume();
      }
      // 🛡️ 确保 _dialogActive 已清除
      this._dialogActive = false;
      this.player.unlockFromCutscene();

      this.time.delayedCall(800, () => {
        console.log('[Level1Scene] 🔍 delayedCall(800) 回调触发，准备 scene.start(ResultScene)');
        this._resultSceneStarted = true;
        try {
          this.scene.start('ResultScene', {
            levelId: 'level_01',
            levelName: '西洱河初战',
            score: this._score,
            timeSec,
            deaths: this._deathCount,
            nextLevelId: 'level_02',
          });
          console.log('[Level1Scene] ✅ scene.start(ResultScene) 已调用');
        } catch (e) {
          console.error('[Level1Scene] ❌ scene.start 异常:', e);
        }
      });
    });
  }

  // ─────────────────────────────────────────────────
  // HUD（Batch 4）
  // ─────────────────────────────────────────────────
  private setupHUD(): void {
    this.hud = new HUD(this);
  }

  // ─────────────────────────────────────────────────
  // Boss（Batch 5）
  // ─────────────────────────────────────────────────
  private spawnBoss(): void {
    this.boss = new BossMengHuoL1(this, BOSS_SPAWN_X, BOSS_SPAWN_Y, {
      id: 'menghuo_elephant',
      name: '孟获·骑象',
      maxHp: 30,
      phases: [],
      speed: 60,
      scoreValue: 500,   // 击败 Boss 获得 500 分
    });
  }

  private setupBossHealthBar(): void {
    this.bossHealthBar = new BossHealthBar(this);
  }

  // ─────────────────────────────────────────────────
  // 故事碎片系统（Batch 9）
  // ─────────────────────────────────────────────────
  private setupStorySystem(): void {
    this.storySys = StorySystem.getInstance();
    // 加载碎片数据到全局注册表
    const frags = (fragmentsData as { fragments: Array<{ id: string; levelId: string; title: string; text: string; unlockHint: string }> }).fragments;
    StorySystem.loadFragments(frags);
    console.log(`[Level1Scene] StorySystem — ${frags.length} 个碎片已注册`);
  }

  // ─────────────────────────────────────────────────
  // 屏幕震动（Batch 9）
  // ─────────────────────────────────────────────────
  private setupScreenShake(): void {
    this.screenShake = new ScreenShake(this);
  }

  // ─────────────────────────────────────────────────
  // 放置隐藏故事碎片（Batch 9）
  // ─────────────────────────────────────────────────
  private fragmentSprite!: Phaser.Physics.Arcade.Sprite;
  private _fragmentPulseTween!: Phaser.Tweens.Tween;

  private spawnFragment(): void {
    // 碎片位置：高台附近（x≈1000, y=GAME_HEIGHT-280）
    // 需要玩家探索跳跃才能到达

    // 🔧 诊断: 如果已持久化收集过，跳过生成（避免"触摸无反应"）
    if (this.storySys.isCollected('fragment_01')) {
      console.log('[Level1Scene] ⚠️ 碎片 fragment_01 已在存档中收集过，跳过生成');
      return;
    }

    // 🔧 位置微调：从平台左边缘 (980) 移到平台中部 (1020)，确保玩家容易触碰
    const fx = 1020;
    const fy = GAME_HEIGHT - 280;

    this.fragmentSprite = this.physics.add.sprite(fx, fy, 'fragment_marker');
    this.fragmentSprite.setDepth(20);
    const fragBody = this.fragmentSprite.body as Phaser.Physics.Arcade.Body;
    fragBody.setAllowGravity(false);
    // 🔧 碰撞体扩大为 40×40 (大于视觉 16×16)，方便玩家触碰收集
    fragBody.setSize(40, 40);
    fragBody.setOffset(-12, -12);
    // 🔧 显式确保 checkCollision 全部启用（防御：避免未知情况下被禁用）
    fragBody.checkCollision.none = false;

    console.log(`[Level1Scene] 🔍 碎片生成: (${fx}, ${fy}), body=${fragBody.width}x${fragBody.height}, checkCollision.none=${fragBody.checkCollision.none}`);

    // 呼吸发光动画
    this._fragmentPulseTween = this.tweens.add({
      targets: this.fragmentSprite,
      alpha: { from: 0.5, to: 1 },
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 0.9, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 玩家 ↔ 碎片 overlap 收集
    this.physics.add.overlap(
      this.player as unknown as Phaser.Physics.Arcade.Sprite,
      this.fragmentSprite,
      () => {
        console.log('[Level1Scene] 🔍 碎片 overlap 回调触发！');
        if (!this.fragmentSprite.active) {
          console.log('[Level1Scene] ⚠️ 碎片 active=false，跳过');
          return;
        }
        const collected = this.storySys.collect('fragment_01');
        console.log(`[Level1Scene] 🔍 collect() 返回: ${collected}`);
        if (collected) {
          // 收集特效：金光一闪 → 消失
          this._fragmentPulseTween?.destroy();
          this.tweens.add({
            targets: this.fragmentSprite,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
              this.fragmentSprite.setActive(false);
              this.fragmentSprite.setVisible(false);
            },
          });
        }
      },
      (_player, _frag) => this.fragmentSprite.active,
      this,
    );
  }

  // ─────────────────────────────────────────────────
  // 擒获系统（Batch 7）
  // ─────────────────────────────────────────────────
  private setupCapture(): void {
    this.captureSys = new CaptureSystem(this);
    this.captureSys.setDialogSys(this.dialogSys);
  }

  // ─────────────────────────────────────────────────
  // 对话系统（Batch 6）
  // ─────────────────────────────────────────────────
  private setupDialog(): void {
    // 加载对话数据
    const dialogs: DialogDataEntry[] = (dialogsData as { level_01: DialogDataEntry[] }).level_01;
    this.dialogSys = new DialogSystem();
    this.dialogSys.load(dialogs);

    // 创建对话框 UI
    this.dialogBox = new DialogBox(this);

    // 延迟播放开场对话（等场景渲染一帧后再触发）
    this.time.delayedCall(300, () => {
      this.dialogSys.triggerByEvent(DialogTrigger.LEVEL_INTRO);
    });
  }

  private updateBoss(delta: number): void {
    // 触发检测：玩家到达触发点且 Boss 未激活
    if (!this._bossSpawned && this.player.x >= BOSS_TRIGGER_X) {
      this._bossSpawned = true;
      this.boss.activate();
      this.screenShake.bossEntrance();
      this.audioMgr.playSfx(SFX.BOSS_ENTER);     // 🔊 Boss 登场音效
      this.audioMgr.playBgm(BGM.BOSS);            // 🎵 切换 Boss BGM
      console.log('[Level1Scene] 👑 Boss 激活！孟获·骑象登场');
      // 🛡️ 自管理延迟（不用 Phaser TimerManager，避免其先于 update() 触发 → 帧序竞争）
      this._bossIntroDelayMs = 800;
    }

    // 🌋 Boss 登场台词延迟检查（在 Boss 逻辑处理后，确保 boss.isDefeated 最新）
    if (this._bossIntroDelayMs > 0) {
      this._bossIntroDelayMs -= delta;
      if (this._bossIntroDelayMs <= 0 && !this._captureStarted && !this.boss.isDefeated) {
        console.log('[Level1Scene] 💬 Boss 登场台词触发');
        this.dialogSys.triggerByEvent(DialogTrigger.BOSS_INTRO);
      }
    }

    if (this.boss.active && this.boss.isActive) {
      this.boss.updateBoss(delta, this.player.x, this.player.y);
    }
  }

  // ─────────────────────────────────────────────────
  // 场景销毁时清理
  // ─────────────────────────────────────────────────
  shutdown(): void {
    // 🔧 热修复: 全量 try-catch 防御，避免任一子系统 destroy 抛异常导致场景无法重启
    try { this.inputMgr?.destroy(); } catch (e) { console.error('[Level1Scene] inputMgr.destroy 异常:', e); }
    try { this.weaponSys?.destroy(); } catch (e) { console.error('[Level1Scene] weaponSys.destroy 异常:', e); }
    try { this.cameraSys?.destroy(); } catch (e) { console.error('[Level1Scene] cameraSys.destroy 异常:', e); }
    try { this.hud?.destroy(); } catch (e) { console.error('[Level1Scene] hud.destroy 异常:', e); }
    try { this.bossHealthBar?.destroy(); } catch (e) { console.error('[Level1Scene] bossHealthBar.destroy 异常:', e); }
    try { this.dialogBox?.destroy(); } catch (e) { console.error('[Level1Scene] dialogBox.destroy 异常:', e); }
    try { this.dialogSys?.reset(); } catch (e) { console.error('[Level1Scene] dialogSys.reset 异常:', e); }
    try { this.captureSys?.reset(); } catch (e) { console.error('[Level1Scene] captureSys.reset 异常:', e); }
    try { this.enemyGroup?.destroy(true); } catch (e) { console.error('[Level1Scene] enemyGroup.destroy 异常:', e); }
    try { this.boss?.destroy(); } catch (e) { console.error('[Level1Scene] boss.destroy 异常:', e); }
    try {
      if (this._fragmentPulseTween) {
        this._fragmentPulseTween.destroy();
      }
      if (this.fragmentSprite?.active) {
        this.fragmentSprite.destroy();
      }
    } catch (e) { console.error('[Level1Scene] fragment 异常:', e); }
    // 清理 Boss 登场延迟标记
    this._bossIntroDelayMs = 0;
    try { this.audioMgr?.destroy(); } catch (e) { console.error('[Level1Scene] audioMgr.destroy 异常:', e); }
    try { this.bus.clear(); } catch (e) { console.error('[Level1Scene] bus.clear 异常:', e); }
  }

  // ─────────────────────────────────────────────────
  // 音频管理器初始化（Batch 11）
  // ─────────────────────────────────────────────────
  private setupAudio(): void {
    this.audioMgr = AudioManager.getInstance();
    this.audioMgr.init(this);
    // 播放关卡 BGM（资源未加载时静默忽略，不崩溃）
    this.audioMgr.playBgm(BGM.LEVEL_1);
    console.log('[Level1Scene] 🎵 AudioManager 初始化完成，BGM 占位启动');
  }

  // ═══════════════════════════════════════════════════════════
  // 像素三国武器 — 弩箭 / 弩矢 (12×6, 默认指向右)
  // 配色：箭杆木色 0xD4A574 / 箭头铁色 0x9CA3AF / 羽尾朱砂 0xDC2626
  // ═══════════════════════════════════════════════════════════
  private drawCrossbowBolt(g: Phaser.GameObjects.Graphics): void {
    const B = { WOOD: 0xD4A574, WSHD: 0xC4956A, METAL: 0x9CA3AF, MHL: 0xC0C7D0,
                FLETCH: 0xDC2626, FLSHD: 0xB91C1C, TIE: 0x78350F };

    // 箭杆 (shaft, running from x1 to x10)
    g.fillStyle(B.WOOD, 1);       g.fillRect(1, 2, 11, 2);
    g.fillStyle(B.WSHD, 1);       g.fillRect(1, 3, 10, 1);     // lower edge shadow

    // 箭头 (arrowhead, triangular metal tip at right end)
    g.fillStyle(B.METAL, 1);      g.fillRect(10, 1, 2, 4);    // tip base
    g.fillStyle(B.MHL, 1);        g.fillRect(11, 0, 1, 6);    // point
    g.fillStyle(B.MHL, 1);        g.fillRect(10, 1, 1, 1);    // tip highlight

    // 箭羽 (fletching, 3-feather fan at left end)
    g.fillStyle(B.FLETCH, 1);     g.fillRect(0, 0, 2, 6);     // upper feather
    g.fillStyle(B.FLSHD, 1);      g.fillRect(0, 1, 1, 4);
    g.fillStyle(B.FLETCH, 1);     g.fillRect(0, 0, 2, 1);     // top edge
    g.fillStyle(B.FLETCH, 1);     g.fillRect(0, 5, 2, 1);     // bottom edge

    // 缠绳 (binding at feather base)
    g.fillStyle(B.TIE, 1);         g.fillRect(2, 1, 1, 4);
    g.fillStyle(B.TIE, 1);         g.fillRect(3, 2, 1, 2);
  }

  // ─────────────────────────────────────────────────
  // 开发辅助：背景网格
  // ─────────────────────────────────────────────────
  private drawDevGrid(): void {
    const gfx = this.add.graphics().setDepth(-5).setAlpha(0.12);
    gfx.lineStyle(1, 0x334455);
    for (let x = 0; x < MAP_WIDTH; x += TILE_SIZE) {
      gfx.lineBetween(x, -GAME_HEIGHT, x, GAME_HEIGHT * 2);
    }
    for (let y = -GAME_HEIGHT; y < GAME_HEIGHT * 2; y += TILE_SIZE) {
      gfx.lineBetween(0, y, MAP_WIDTH, y);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 像素三国角色 — 汉军士卒 (24×40)
  // 配色：铁灰盔 0x6B7280 / 红缨 0xDC2626 / 汉军蓝甲 0x3B5998
  // ═══════════════════════════════════════════════════════════
  private drawHanSoldier(g: Phaser.GameObjects.Graphics): void {
    const C = { HELM: 0x6B7280, HHL: 0x9CA3AF, HSHD: 0x4B5563, CREST: 0xDC2626, CSHD: 0xB91C1C,
                SKIN: 0xF5D0A9, EYE: 0x1A1A1A, ARMOR: 0x3B5998, AHL: 0x5B79B8, ASHD: 0x2B4988,
                SASH: 0xDC2626, LEG: 0x1F2937, BOOT: 0x78350F, BHL: 0x92400E };

    // ── 铁盔 (iron helmet dome + brim) ──
    g.fillStyle(C.HELM, 1);       g.fillRect(7, 0, 10, 7);    // dome
    g.fillStyle(C.HHL, 1);        g.fillRect(9, 1, 2, 3);     // dome highlight
    g.fillStyle(C.HSHD, 1);       g.fillRect(7, 5, 10, 2);    // dome base shadow
    g.fillStyle(C.HELM, 1);       g.fillRect(5, 7, 14, 2);    // brim
    g.fillStyle(C.HHL, 1);        g.fillRect(6, 7, 12, 1);    // brim highlight

    // ── 红缨 (red crest plume) ──
    g.fillStyle(C.CREST, 1);      g.fillRect(11, 0, 2, 9);
    g.fillStyle(C.CSHD, 1);       g.fillRect(12, 4, 1, 5);

    // ── 面部 (face under helmet) ──
    g.fillStyle(C.SKIN, 1);       g.fillRect(9, 9, 6, 4);
    g.fillStyle(C.EYE, 1);        g.fillRect(10, 10, 2, 1);   // left eye
    g.fillStyle(C.EYE, 1);        g.fillRect(13, 10, 2, 1);   // right eye

    // ── 护颈 (gorget neck guard) ──
    g.fillStyle(C.HELM, 1);       g.fillRect(6, 13, 12, 3);
    g.fillStyle(C.HHL, 1);        g.fillRect(8, 13, 8, 1);

    // ── 鳞甲 (blue scale armor chest) ──
    g.fillStyle(C.ARMOR, 1);      g.fillRect(4, 16, 16, 11);
    g.fillStyle(C.AHL, 1);        g.fillRect(10, 17, 4, 8);   // center highlight
    g.fillStyle(C.AHL, 1);        g.fillRect(4, 16, 4, 4);    // left shoulder guard
    g.fillStyle(C.AHL, 1);        g.fillRect(16, 16, 4, 4);   // right shoulder guard
    // scale pattern lines
    g.fillStyle(C.ASHD, 1);       g.fillRect(5, 19, 14, 1);
    g.fillStyle(C.ASHD, 1);       g.fillRect(5, 22, 14, 1);
    g.fillStyle(C.ASHD, 1);       g.fillRect(5, 25, 14, 1);

    // ── 朱红腰封 (red sash belt) ──
    g.fillStyle(C.SASH, 1);       g.fillRect(4, 27, 16, 3);
    g.fillStyle(C.CSHD, 1);       g.fillRect(4, 29, 16, 1);

    // ── 裤腿 (dark pants) ──
    g.fillStyle(C.LEG, 1);        g.fillRect(5, 30, 6, 6);
    g.fillStyle(C.LEG, 1);        g.fillRect(13, 30, 6, 6);

    // ── 战靴 (brown boots) ──
    g.fillStyle(C.BOOT, 1);       g.fillRect(4, 36, 7, 4);
    g.fillStyle(C.BOOT, 1);       g.fillRect(13, 36, 7, 4);
    g.fillStyle(C.BHL, 1);        g.fillRect(4, 36, 7, 1);    // boot top highlight
    g.fillStyle(C.BHL, 1);        g.fillRect(13, 36, 7, 1);

    // ── 右手持弩 (crossbow, right side) ──
    const BOW = { WOOD: 0x78350F, WHL: 0x92400E, METAL: 0x9CA3AF, MHL: 0xC0C7D0,
                  BOLT: 0xD4A574, TIP: 0x9CA3AF, FLETCH: 0xDC2626 };
    // 弩臂 (stock, horizontal wooden body)
    g.fillStyle(BOW.WOOD, 1);     g.fillRect(18, 21, 8, 3);
    g.fillStyle(BOW.WHL, 1);      g.fillRect(18, 21, 8, 1);
    // 弓弧 (bow limbs, vertical above & below stock)
    g.fillStyle(BOW.METAL, 1);    g.fillRect(22, 16, 2, 5);    // upper limb
    g.fillStyle(BOW.METAL, 1);    g.fillRect(22, 24, 2, 5);    // lower limb
    g.fillStyle(BOW.MHL, 1);      g.fillRect(22, 18, 2, 1);    // limb highlight
    // 弩弦 (bowstring)
    g.fillStyle(0xE5E7EB, 1);     g.fillRect(22, 21, 1, 3);
    // 待发弩箭 (bolt nocked on stock)
    g.fillStyle(BOW.BOLT, 1);     g.fillRect(17, 20, 7, 1);    // shaft
    g.fillStyle(BOW.TIP, 1);      g.fillRect(14, 20, 3, 1);    // arrowhead
    g.fillStyle(BOW.FLETCH, 1);   g.fillRect(21, 19, 1, 3);    // fletching
    // 弩机 (trigger mechanism)
    g.fillStyle(BOW.METAL, 1);    g.fillRect(19, 24, 2, 2);
      g.fillStyle(BOW.MHL, 1);      g.fillRect(19, 24, 2, 1);
  }

  // ═══════════════════════════════════════════════════════════
  // 像素三国角色 — 蛮兵 (24×40)
  // 配色：狂发棕 0x451A03 / 深肤 0xC4956A / 朱砂战纹 0xDC2626
  //      兽皮甲 0x78350F / 骨饰 0xF5F5DC / 皮毛裙 0x6B4226
  // ═══════════════════════════════════════════════════════════
  private drawBarbarianWarrior(g: Phaser.GameObjects.Graphics): void {
    const C = { HAIR: 0x451A03, HHL: 0x5A2A08, SKIN: 0xC4956A, SSHD: 0xB0855A,
                WARP: 0xDC2626, EYE: 0xDC2626, BONE: 0xF5F5DC, BNSD: 0xD5D5BC,
                LTHR: 0x78350F, LTHL: 0x92400E, FUR: 0x6B4226, FHL: 0x7B5236,
                LEG: 0x5A3216, FEET: 0x9A755A };

    // ── 狂发 (wild spiky hair) ──
    g.fillStyle(C.HAIR, 1);       g.fillRect(6, 0, 12, 6);    // main mass
    g.fillStyle(C.HAIR, 1);       g.fillRect(4, 1, 3, 2);     // left tuft
    g.fillStyle(C.HAIR, 1);       g.fillRect(17, 1, 3, 3);    // right tuft
    g.fillStyle(C.HAIR, 1);       g.fillRect(7, 0, 2, 2);     // left spike
    g.fillStyle(C.HAIR, 1);       g.fillRect(15, 0, 2, 1);    // right spike
    g.fillStyle(C.HHL, 1);        g.fillRect(9, 1, 2, 2);     // highlight
    g.fillStyle(C.HHL, 1);        g.fillRect(14, 2, 2, 2);

    // ── 面部 (dark skin + war paint) ──
    g.fillStyle(C.SKIN, 1);       g.fillRect(8, 6, 8, 6);
    g.fillStyle(C.BNSD, 1);       g.fillRect(9, 8, 2, 1);     // eye white (left)
    g.fillStyle(C.BNSD, 1);       g.fillRect(13, 8, 2, 1);    // eye white (right)
    g.fillStyle(C.EYE, 1);        g.fillRect(9, 8, 2, 1);     // fierce red eye
    g.fillStyle(C.EYE, 1);        g.fillRect(13, 8, 2, 1);
    // 朱砂战纹 (horizontal + vertical war stripes)
    g.fillStyle(C.WARP, 1);       g.fillRect(7, 7, 10, 1);
    g.fillStyle(C.WARP, 1);       g.fillRect(11, 6, 1, 9);

    // ── 骨饰项链 (bone necklace) ──
    g.fillStyle(C.BONE, 1);       g.fillRect(8, 13, 2, 2);
    g.fillStyle(C.BONE, 1);       g.fillRect(11, 13, 2, 2);
    g.fillStyle(C.BONE, 1);       g.fillRect(14, 13, 2, 2);

    // ── 皮革甲 (leather vest / bare chest) ──
    g.fillStyle(C.LTHR, 1);       g.fillRect(5, 15, 14, 7);
    g.fillStyle(C.LTHL, 1);       g.fillRect(9, 16, 6, 4);    // chest highlight
    // bare arms
    g.fillStyle(C.SKIN, 1);       g.fillRect(3, 15, 3, 7);
    g.fillStyle(C.SKIN, 1);       g.fillRect(18, 15, 3, 7);
    g.fillStyle(C.SSHD, 1);       g.fillRect(4, 19, 2, 2);    // arm shadow

    // ── 兽皮裙 (fur skirt with jagged bottom) ──
    g.fillStyle(C.FUR, 1);        g.fillRect(5, 22, 14, 5);
    g.fillStyle(C.FHL, 1);        g.fillRect(6, 22, 4, 2);    // fur tufts
    g.fillStyle(C.FHL, 1);        g.fillRect(12, 22, 5, 2);
    // jagged hem
    g.fillStyle(C.LEG, 1);        g.fillRect(5, 26, 3, 1);
    g.fillStyle(C.LEG, 1);        g.fillRect(10, 26, 4, 1);
    g.fillStyle(C.LEG, 1);        g.fillRect(16, 26, 3, 1);

    // ── 绑腿 (wrap leggings) ──
    g.fillStyle(C.LEG, 1);        g.fillRect(6, 27, 5, 7);
    g.fillStyle(C.LEG, 1);        g.fillRect(13, 27, 5, 7);
    g.fillStyle(C.FHL, 1);        g.fillRect(6, 28, 5, 1);    // wrap stripes
    g.fillStyle(C.FHL, 1);        g.fillRect(6, 31, 5, 1);
    g.fillStyle(C.FHL, 1);        g.fillRect(13, 28, 5, 1);
    g.fillStyle(C.FHL, 1);        g.fillRect(13, 31, 5, 1);

    // ── 赤足 (bare feet) ──
    g.fillStyle(C.FEET, 1);       g.fillRect(5, 34, 6, 6);
    g.fillStyle(C.FEET, 1);       g.fillRect(13, 34, 6, 6);
    g.fillStyle(C.SKIN, 1);       g.fillRect(6, 35, 4, 3);    // foot highlight
    g.fillStyle(C.SKIN, 1);       g.fillRect(14, 35, 4, 3);
  }

  // ═══════════════════════════════════════════════════════════
  // 像素三国角色 — 骑象孟获 Boss (64×80)
  // 上半：南蛮王孟获 (铜盔 0xB45309 + 红羽 + 皮甲 + 怒目)
  // 下半：南中战象 (灰皮 0x787878 + 象牙 0xF5F5DC + 朱鞍 0xDC2626)
  // ═══════════════════════════════════════════════════════════
  private drawMengHuoOnElephant(g: Phaser.GameObjects.Graphics): void {
    const C = { BRNZ: 0xB45309, BHL: 0xCC5A14, BSHD: 0x93420A, FEATH: 0xDC2626, FSHD: 0xB91C1C,
                SKIN: 0xC4956A, DBEARD: 0x451A03, EYE: 0xDC2626, EYEW: 0xF5F5DC,
                ARMR: 0x78350F, AHL: 0x92400E, SADL: 0xDC2626, GOLD: 0xF59E0B,
                ELG: 0x787878, ELHL: 0x969696, ELSHD: 0x585858, IVORY: 0xF5F5DC, IVSD: 0xE5E5CC,
                FOOT: 0xD1D5DB, EYE_B: 0x1A1A1A };

    // ═══════════ 上半：南蛮王孟获 ═══════════
    // ── 铜盔 (bronze helmet dome) ──
    g.fillStyle(C.BRNZ, 1);       g.fillRect(22, 0, 20, 8);
    g.fillStyle(C.BHL, 1);        g.fillRect(24, 1, 4, 4);
    g.fillStyle(C.BHL, 1);        g.fillRect(38, 1, 2, 3);
    g.fillStyle(C.BSHD, 1);       g.fillRect(22, 6, 20, 2);

    // ── 红羽冠 (red feather plume) ──
    g.fillStyle(C.FEATH, 1);      g.fillRect(30, 0, 4, 14);
    g.fillStyle(C.FSHD, 1);       g.fillRect(33, 5, 1, 9);
    g.fillStyle(C.FEATH, 1);      g.fillRect(28, 1, 2, 3);    // side feather
    g.fillStyle(C.FEATH, 1);      g.fillRect(35, 2, 3, 2);

    // ── 怒目面庞 (fierce face) ──
    g.fillStyle(C.SKIN, 1);       g.fillRect(23, 8, 16, 8);
    // eyebrows (thick dark)
    g.fillStyle(C.DBEARD, 1);     g.fillRect(25, 7, 5, 2);
    g.fillStyle(C.DBEARD, 1);     g.fillRect(33, 7, 5, 2);
    // fierce red eyes
    g.fillStyle(C.EYEW, 1);       g.fillRect(26, 10, 3, 2);
    g.fillStyle(C.EYEW, 1);       g.fillRect(34, 10, 3, 2);
    g.fillStyle(C.EYE, 1);        g.fillRect(26, 10, 3, 1);
    g.fillStyle(C.EYE, 1);        g.fillRect(34, 10, 3, 1);
    // nose / mouth
    g.fillStyle(C.SKIN, 1);       g.fillRect(29, 13, 2, 2);
    g.fillStyle(C.DBEARD, 1);     g.fillRect(27, 16, 9, 3);   // beard

    // ── 皮甲身躯 (leather armored body) ──
    g.fillStyle(C.ARMR, 1);       g.fillRect(20, 19, 22, 14);
    g.fillStyle(C.AHL, 1);        g.fillRect(26, 20, 10, 5);
    g.fillStyle(C.AHL, 1);        g.fillRect(26, 26, 10, 2);
    // arm armor bands
    g.fillStyle(C.BRNZ, 1);       g.fillRect(18, 23, 4, 3);
    g.fillStyle(C.BRNZ, 1);       g.fillRect(40, 23, 4, 3);

    // ── 朱红马鞍 (red howdah saddle + gold trim) ──
    g.fillStyle(C.SADL, 1);       g.fillRect(14, 33, 34, 7);
    g.fillStyle(C.GOLD, 1);       g.fillRect(14, 33, 34, 1);   // top gold trim
    g.fillStyle(C.GOLD, 1);       g.fillRect(14, 39, 34, 1);   // bottom gold trim
    g.fillStyle(C.FSHD, 1);       g.fillRect(14, 36, 34, 2);   // middle shadow

    // ═══════════ 下半：南中战象 ═══════════
    // ── 象头 (elephant head, front-facing) ──
    g.fillStyle(C.ELG, 1);        g.fillRect(32, 40, 30, 14);
    g.fillStyle(C.ELHL, 1);       g.fillRect(34, 41, 6, 7);
    // elephant eye
    g.fillStyle(C.EYE_B, 1);      g.fillRect(46, 42, 4, 3);
    g.fillStyle(C.EYEW, 1);       g.fillRect(47, 42, 2, 1);
    // ear flap
    g.fillStyle(C.ELG, 1);        g.fillRect(60, 41, 4, 10);
    g.fillStyle(C.ELHL, 1);       g.fillRect(61, 42, 2, 3);

    // ── 象牙 (ivory tusks) ──
    g.fillStyle(C.IVORY, 1);      g.fillRect(24, 46, 16, 4);
    g.fillStyle(C.IVORY, 1);      g.fillRect(22, 44, 6, 3);
    g.fillStyle(C.IVSD, 1);       g.fillRect(24, 49, 16, 1);

    // ── 象鼻 (trunk curving down-right) ──
    g.fillStyle(C.ELG, 1);        g.fillRect(42, 52, 14, 5);
    g.fillStyle(C.ELG, 1);        g.fillRect(48, 56, 10, 7);
    g.fillStyle(C.ELG, 1);        g.fillRect(53, 62, 6, 8);
    g.fillStyle(C.ELHL, 1);       g.fillRect(44, 53, 4, 2);   // trunk highlight
    g.fillStyle(C.ELHL, 1);       g.fillRect(50, 57, 3, 4);

    // ── 象身 (main body) ──
    g.fillStyle(C.ELG, 1);        g.fillRect(8, 43, 28, 20);
    g.fillStyle(C.ELHL, 1);       g.fillRect(10, 46, 18, 8);
    g.fillStyle(C.ELSHD, 1);      g.fillRect(10, 58, 24, 4);   // belly shadow
    // body rivet/armor plates (war elephant)
    g.fillStyle(C.GOLD, 1);       g.fillRect(12, 44, 3, 3);
    g.fillStyle(C.GOLD, 1);       g.fillRect(22, 44, 3, 3);
    g.fillStyle(C.GOLD, 1);       g.fillRect(12, 54, 3, 3);
    g.fillStyle(C.GOLD, 1);       g.fillRect(22, 54, 3, 3);

    // ── 四柱象腿 (4 legs, 2 visible front + 2 back) ──
    // 左后腿 (back-left, darker)
    g.fillStyle(C.ELSHD, 1);      g.fillRect(10, 63, 9, 14);
    // 右后腿 (back-right)
    g.fillStyle(C.ELG, 1);        g.fillRect(21, 63, 9, 14);
    g.fillStyle(C.ELHL, 1);       g.fillRect(21, 63, 9, 2);
    // 左前腿 (front-left, darker)
    g.fillStyle(C.ELSHD, 1);      g.fillRect(34, 63, 9, 14);
    // 右前腿 (front-right)
    g.fillStyle(C.ELG, 1);        g.fillRect(45, 63, 9, 14);
    g.fillStyle(C.ELHL, 1);       g.fillRect(45, 63, 9, 2);

    // ── 象蹄 (feet/toenails) ──
    g.fillStyle(C.FOOT, 1);       g.fillRect(10, 77, 9, 2);
    g.fillStyle(C.FOOT, 1);       g.fillRect(21, 77, 9, 2);
    g.fillStyle(C.FOOT, 1);       g.fillRect(34, 77, 9, 2);
    g.fillStyle(C.FOOT, 1);       g.fillRect(45, 77, 9, 2);

    // ── 象尾 (tail, left side) ──
    g.fillStyle(C.ELG, 1);        g.fillRect(4, 54, 6, 3);
    g.fillStyle(C.ELSHD, 1);      g.fillRect(2, 56, 3, 2);
    g.fillStyle(C.DBEARD, 1);     g.fillRect(1, 57, 2, 1);    // tail tuft
  }
}
