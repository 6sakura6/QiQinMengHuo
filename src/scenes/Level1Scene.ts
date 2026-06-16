// ============================================================
// Level1Scene.ts — 第 1 关「西洱河初战」场景（Batch 1 灰盒版）
// 当前进度：灰盒地图 + Player 移动跳跃
// Batch 2 追加：WeaponSystem + 射击
// Batch 3 追加：Enemy 实体（巡逻/追击/受击/死亡）
// Batch 4 追加：Camera / HUD
// Batch 6 追加：DialogSystem
// Batch 7 追加：CaptureSystem
// ============================================================

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { InputManager } from '../systems/InputManager';
import { WeaponSystem } from '../systems/WeaponSystem';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config/constants';

// ─── 灰盒地图布局常量 ─────────────────────────────────────────
const MAP_WIDTH  = GAME_WIDTH * 3;   // 关卡宽度 = 屏幕 3 倍
const GROUND_Y   = GAME_HEIGHT - 40; // 地面 Y
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
];

export class Level1Scene extends Phaser.Scene {
  // ── 模块引用 ──────────────────────────────────────
  private player!: Player;
  private inputMgr!: InputManager;
  private weaponSys!: WeaponSystem;
  private bus = EventBus.getInstance();

  // ── 物理组 ────────────────────────────────────────
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private _totalEnemies = 0;
  private _liveEnemies   = 0;

  // ── 调试 UI ───────────────────────────────────────
  private debugText!: Phaser.GameObjects.Text;

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
    this.buildGrayboxTextures();
    this.buildMap();
    this.spawnPlayer();
    this.setupWeaponSystem();
    this.spawnEnemies();
    this.setupCamera();
    this.setupCollisions();
    this.setupEventListeners();
    this.buildDebugUI();

    this.bus.emit(GameEvent.LEVEL_START, { levelId: 'level_01' });
    console.log('[Level1Scene] ✅ Batch 3 — 地图 + Player + 射击 + 敌人就绪');
    console.log('  WASD/方向键移动，Space/W/↑ 跳跃，J/Z 射击（八方向弩箭）');
    console.log(`  敌人数：${this._totalEnemies}`);
  }

  // ─────────────────────────────────────────────────
  // update — 每帧驱动 InputManager + Player
  // ─────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    this.inputMgr.update();
    const input = this.inputMgr.snapshot;
    this.player.updatePlayer(delta, input);
    this.weaponSys.update(
      delta, input,
      this.player.x, this.player.y,
      this.player.facingRight,
    );
    this.updateEnemies(delta);
    this.updateDebugUI();
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
    // processCallback 防御：确保双方 active 且敌人未死亡
    this.physics.add.overlap(
      this.weaponSys.getBulletGroup(),
      this.enemyGroup,
      (bullet, enemy) => {
        const b = bullet as unknown as Bullet;
        const e = enemy as unknown as Enemy;
        e.takeDamage(b.damage);
        b.onHit();
      },
      (bullet, enemy) => {
        const b = bullet as unknown as Bullet;
        const e = enemy as unknown as Enemy;
        return b.active && e.active && !e.isDefeated;
      },
      this,
    );

    // 子弹 ↔ 平台（命中即销毁）
    this.physics.add.collider(
      this.weaponSys.getBulletGroup(),
      this.platforms,
      (bullet) => {
        (bullet as unknown as Bullet).onHit();
      },
    );

    // 子弹 ↔ 世界边界（越界即销毁）
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      const go = body.gameObject;
      if (go instanceof Bullet) {
        go.destroy();
      }
    });
  }

  // ─────────────────────────────────────────────────
  // 摄像机（Batch 1 基础版，Batch 4 由 CameraSystem 接管）
  // ─────────────────────────────────────────────────
  private setupCamera(): void {
    this.cameras.main.setBounds(0, -GAME_HEIGHT, MAP_WIDTH, GAME_HEIGHT * 3);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(80, 40);
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

    // 敌人击杀——追踪全清
    this.bus.on(GameEvent.ENEMY_DEFEATED, () => {
      this._liveEnemies = Math.max(0, this._liveEnemies - 1);
      if (this._liveEnemies <= 0) {
        this.bus.emit(GameEvent.ALL_ENEMIES_CLEARED, {
          count: this._totalEnemies,
        });
        console.log('[Level1Scene] 🎉 所有敌人已消灭！');
      }
    });
  }

  // ─────────────────────────────────────────────────
  // 开发调试 UI
  // ─────────────────────────────────────────────────
  private buildDebugUI(): void {
    this.debugText = this.add
      .text(10, 10, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#00ff88',
        backgroundColor: '#00000066',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)  // 固定在屏幕左上，不随镜头移动
      .setDepth(100);

    // 提示操作键
    this.add.text(10, GAME_HEIGHT - 20,
      'WASD / ← →  移动 | Space 跳跃 | J / Z 射击（八方向弩箭）',
      { fontFamily: 'monospace', fontSize: '10px', color: '#667788' }
    ).setScrollFactor(0).setDepth(100);
  }

  private updateDebugUI(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const cd = this.weaponSys.cooldownPercent;
    const cdBar = cd > 0
      ? `[${'='.repeat(Math.round((1 - cd) * 10))}${' '.repeat(Math.round(cd * 10))}]`
      : '[==========]';
    this.debugText.setText([
      `[Batch 3] 西洱河初战 — 移动+射击+敌人`,
      `State: ${this.player.playerState}`,
      `Pos:   ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
      `Vel:   ${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)}`,
      `OnGnd: ${body.blocked.down}`,
      `HP:    ${this.player.hp} / ${this.player.maxHp}`,
      `Shot:  ${cdBar}`,
      `Enemy: ${this._liveEnemies} / ${this._totalEnemies}`,
    ]);
  }

  // ─────────────────────────────────────────────────
  // 场景销毁时清理
  // ─────────────────────────────────────────────────
  shutdown(): void {
    this.inputMgr?.destroy();
    this.weaponSys?.destroy();
    this.enemyGroup?.destroy(true);
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
