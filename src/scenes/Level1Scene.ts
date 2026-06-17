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

    this.bus.emit(GameEvent.LEVEL_START, { levelId: 'level_01' });
    console.log('[Level1Scene] ✅ Batch 9 — 地图 + Player + 射击 + 敌人 + Camera + HUD + Boss + 对话 + 擒获 + SaveSystem + 碎片 + 震动 就绪');
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
  // 灰盒贴图（程序生成，Batch 3 替换为真实精灵图）
  // ─────────────────────────────────────────────────
  private buildGrayboxTextures(): void {
    const makeRect = (
      key: string, w: number, h: number,
      fill: number, border?: number,
    ) => {
      if (this.textures.exists(key)) {
        console.log(`[纹理] ${key} 已存在，跳过`);
        return;
      }
      try {
        const g = this.add.graphics();
        g.fillStyle(fill, 1);
        g.fillRect(0, 0, w, h);
        if (border !== undefined) {
          g.lineStyle(2, border, 1);
          g.strokeRect(1, 1, w - 2, h - 2);
        }
        g.generateTexture(key, w, h);
        g.destroy();
        const ok = this.textures.exists(key);
        console.log(`[纹理] ${key} ${w}×${h} 生成${ok ? '成功' : '失败!!'}`);
      } catch (e) {
        console.error(`[纹理] ${key} 生成异常:`, e);
      }
    };

    console.log('[纹理] 开始生成灰盒贴图...');
    // 玩家占位：深蓝色 24×40，白色边框
    makeRect('player_placeholder', 24, 40, 0x2255cc, 0xaaaaff);
    // 地面/平台：深绿灰
    makeRect('ground_tile', TILE_SIZE, TILE_SIZE, 0x2d4a3e, 0x4a7a64);
    // 背景天空
    makeRect('sky_bg', MAP_WIDTH, GAME_HEIGHT, 0x0a1a2a);
    // 子弹：亮黄色 8×4
    makeRect('bullet_placeholder', 8, 4, 0xffdd44);
    // 敌人：暗红色 24×40，橙色边框
    makeRect('enemy_placeholder', 24, 40, 0xaa2222, 0xff6644);
    // Boss 占位：深紫 64×80，金框（象 + 骑手）
    makeRect('boss_meng_huo_placeholder', 64, 80, 0x6A1B9A, 0xFFD700);
    // 故事碎片标记：金色发光小方块 16×16（Batch 9）
    makeRect('fragment_marker', 16, 16, 0xFFD700, 0xFFF8C0);
    console.log('[纹理] 灰盒贴图生成完毕');
  }

  // ─────────────────────────────────────────────────
  // 构建灰盒地图（地面 + 平台）
  // ─────────────────────────────────────────────────
  private buildMap(): void {
    // 背景
    this.add.image(0, 0, 'sky_bg').setOrigin(0, 0).setDepth(-10);

    // 网格辅助线（开发期，关闭时注释掉即可）
    this.drawDevGrid();

    // 地面（静态物理组）
    this.platforms = this.physics.add.staticGroup();
    const tilesX = Math.ceil(MAP_WIDTH / TILE_SIZE) + 1;

    for (let i = 0; i < tilesX; i++) {
      // 地面：铺满 3 行
      for (let row = 0; row < 3; row++) {
        this.platforms.create(
          i * TILE_SIZE + TILE_SIZE / 2,
          GROUND_Y + row * TILE_SIZE,
          'ground_tile',
        );
      }
    }

    // 跳台
    for (const cfg of PLATFORM_CONFIGS) {
      const tileCount = Math.ceil(cfg.w / TILE_SIZE);
      for (let i = 0; i < tileCount; i++) {
        this.platforms.create(
          cfg.x + i * TILE_SIZE + TILE_SIZE / 2,
          cfg.y,
          'ground_tile',
        );
      }
    }

    // 左右隐形边界墙（防止玩家走出世界）
    const wallL = this.physics.add.staticImage(-16, GAME_HEIGHT / 2, 'ground_tile');
    const wallR = this.physics.add.staticImage(MAP_WIDTH + 16, GAME_HEIGHT / 2, 'ground_tile');
    wallL.setVisible(false);
    wallR.setVisible(false);
    wallL.body.setSize(32, GAME_HEIGHT);
    wallR.body.setSize(32, GAME_HEIGHT);
    this.platforms.add(wallL);
    this.platforms.add(wallR);

    // 世界边界
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
    });

    // Batch 9: 玩家死亡 → 强烈震动
    this.bus.on(GameEvent.PLAYER_DEATH, (_payload) => {
      this.screenShake.heavy();
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
    try { this.bus.clear(); } catch (e) { console.error('[Level1Scene] bus.clear 异常:', e); }
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
}
