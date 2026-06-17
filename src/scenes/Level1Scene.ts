// ============================================================
// Level1Scene.ts — 第 1 关「西洱河初战」场景（Batch 1 灰盒版）
// 当前进度：灰盒地图 + Player 移动跳跃
// Batch 2 追加：WeaponSystem + 射击
// Batch 3 追加：Enemy 实体（巡逻/追击/受击/死亡）
// Batch 4 追加：CameraSystem + HUD（正式血条/冷却条/敌人计数/分数）
// Batch 5 追加：BossMengHuoL1 + Boss 血条 + Boss 触发/碰撞
// Batch 6 追加：DialogSystem
// Batch 7 追加：CaptureSystem
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
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config/constants';
import dialogsData from '../data/dialogs.json';

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

    this.bus.emit(GameEvent.LEVEL_START, { levelId: 'level_01' });
    console.log('[Level1Scene] ✅ Batch 7 — 地图 + Player + 射击 + 敌人 + Camera + HUD + Boss + 对话 + 擒获 就绪');
    console.log('  WASD/方向键移动，Space/W/↑ 跳跃，J/Z 射击（八方向弩箭）');
    console.log(`  敌人数：${this._totalEnemies}`);
  }

  // ─────────────────────────────────────────────────
  // update — 每帧驱动 InputManager + Player
  // ─────────────────────────────────────────────────
  update(_time: number, delta: number): void {
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
    // 关卡重启（玩家死亡触发）
    this.bus.on(GameEvent.LEVEL_RESTART, (_payload) => {
      this.bus.clear();
      this.scene.restart();
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
    });

    // ── 对话状态管理（Batch 6）─────────────────────
    this.bus.on(GameEvent.DIALOG_START, (_payload) => {
      this._dialogActive = true;
      this.player.lockForCutscene();
      this.physics.pause();  // ⚠️ 冻结所有物理体（敌人/玩家/子弹），防对话中敌人移动
    });

    this.bus.on(GameEvent.DIALOG_END, (_payload) => {
      // ⚠️ 关键守卫：DIALOG_END 后可能同步触发 chained next 或 CaptureSystem 推进，
      //    此时 dialogSys.isActive 已变为 true（新对话已开始）。
      //    只在对话链真正结束时才重置状态，否则会覆写新对话的激活标志。
      if (this.dialogSys.isActive) {
        // 链式对话或擒获流程触发了下一句——什么都不做
        return;
      }

      this._dialogActive = false;
      this.player.unlockFromCutscene();
      this.physics.resume();   // 恢复物理模拟
      this.inputMgr.reset();   // ⚠️ 清除残留按键，防止对话中按着的 Space 触发跳跃
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

    // 擒获完成 → 场景跳转（延迟以等待 Boss 淡出动画完成）
    this.bus.on(GameEvent.CAPTURE_COMPLETE, (_payload) => {
      console.log('[Level1Scene] 🏆 擒获完成，0.8s 后跳转结算');
      this.time.delayedCall(800, () => {
        this.scene.start('ResultScene', {
          levelId: 'level_01',
          score: this._score,
        });
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
      console.log('[Level1Scene] 👑 Boss 激活！孟获·骑象登场');
      // 延迟触发 Boss 登场台词
      this.time.delayedCall(800, () => {
        this.dialogSys.triggerByEvent(DialogTrigger.BOSS_INTRO);
      });
    }

    if (this.boss.active && this.boss.isActive) {
      this.boss.updateBoss(delta, this.player.x, this.player.y);
    }
  }

  // ─────────────────────────────────────────────────
  // 场景销毁时清理
  // ─────────────────────────────────────────────────
  shutdown(): void {
    this.inputMgr?.destroy();
    this.weaponSys?.destroy();
    this.cameraSys?.destroy();
    this.hud?.destroy();
    this.bossHealthBar?.destroy();
    this.dialogBox?.destroy();
    this.dialogSys?.reset();
    this.captureSys?.reset();
    this.enemyGroup?.destroy(true);
    this.boss?.destroy();
    this.bus.clear();
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
