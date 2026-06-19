// ============================================================
// Enemy.ts — 蛮兵基类（Batch 3）
// 状态机：IDLE → PATROL ←→ CHASE → HURT → DEATH
// 行为：巡逻左右往返 / 检测玩家追击 / 受击闪烁击退 / 死亡淡出
// ============================================================

import Phaser from 'phaser';
import { EnemyState, EnemyType, EnemyConfig } from '../types/entity.types';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';

// ─── 默认配置 ────────────────────────────────────────
const DEFAULT_CONFIG: EnemyConfig = {
  type: EnemyType.SOLDIER,
  hp: 3,
  speed: 60,
  damage: 1,
  scoreValue: 100,
  patrolRange: 80,
  detectRange: 200,
};

// ─── 状态时长 ────────────────────────────────────────
const HURT_FLASH_MS   = 250;   // 受击闪烁时长
const DEATH_FADE_MS   = 500;   // 死亡淡出时长
const CHASE_SPEED_MUL = 1.6;   // 追击速度倍率

// ─── 追击判定参数 ─────────────────────────────────────
const VERTICAL_CHASE_MAX   = 80;  // 垂直超出此值不追击（防跨平台误追）
const CHASE_LEAVE_MARGIN   = 40;  // 脱离追击的额外余量（防边界抖动）

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  // ── 配置 & 状态 ──────────────────────────────────
  private _cfg: EnemyConfig;
  private _state: EnemyState = EnemyState.PATROL;
  private _hp: number;
  private _facingRight = false;

  // ── 计时器 ────────────────────────────────────────
  private _hurtTimer = 0;
  private _deathTimer = DEATH_FADE_MS;

  // ── 出生点（巡逻中心） ─────────────────────────────
  private readonly _spawnX: number;

  private bus = EventBus.getInstance();

  // ─────────────────────────────────────────────────
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<EnemyConfig>,
  ) {
    super(scene, x, y, 'enemy_idle_0');
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    this._cfg    = { ...DEFAULT_CONFIG, ...config };
    this._hp     = this._cfg.hp;
    this._spawnX = x;

    const body = this.body as Phaser.Physics.Arcade.Body;
    // 碰撞体覆盖近全 sprite (24×40)，仅留 1px 边距
    // 垂直居中：避免子弹从头顶飞过 或 从脚下穿过
    body.setSize(22, 38);
    body.setOffset(1, 1);
    body.setMaxVelocityX(this._cfg.speed * CHASE_SPEED_MUL);
    body.setCollideWorldBounds(true);  // 不走出世界边界
    this.setDepth(8);

    // 动画由 Scene.spawnEnemies() 创建后统一启动

    this.bus.emit(GameEvent.ENEMY_SPAWNED, {
      enemyType: this._cfg.type,
      position: { x, y },
    });
  }

  // ─────────────────────────────────────────────────
  // 每帧更新（由 Level1Scene.update() 调用）
  // ─────────────────────────────────────────────────
  updateEnemy(delta: number, playerX: number, playerY: number): void {
    // ── 死亡态：倒计时后 destroy ──
    if (this._state === EnemyState.DEATH) {
      this._deathTimer -= delta;
      if (this._deathTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // ── 受击态：闪烁后恢复巡逻 ──
    if (this._state === EnemyState.HURT) {
      this._hurtTimer -= delta;
      // 闪烁效果（高频 alpha 切换）
      this.setAlpha(Math.floor(this._hurtTimer / 50) % 2 === 0 ? 0.4 : 1);
      if (this._hurtTimer <= 0) {
        this._state = EnemyState.PATROL;
        this.setAlpha(1);
      }
      return;
    }

    // ── 状态切换：水平距离 + 垂直阈值判断追击 ──
    // ⚠️ 用水平距离替代 2D 欧氏距离，避免玩家在平台上时
    //    垂直分量导致敌人误入 CHASE 态（被 platform 挡住原地抽搐）
    const distX = Math.abs(this.x - playerX);
    const distY = Math.abs(this.y - playerY);

    if (this._state === EnemyState.CHASE) {
      // 已在追击态 → 用稍大的脱离范围（迟滞）防边界抖动
      if (
        distX > this._cfg.detectRange + CHASE_LEAVE_MARGIN ||
        distY > VERTICAL_CHASE_MAX + CHASE_LEAVE_MARGIN
      ) {
        this._state = EnemyState.PATROL;
      }
    } else {
      // 巡逻态 → 判断是否应转入追击
      if (distX < this._cfg.detectRange && distY < VERTICAL_CHASE_MAX) {
        this._state = EnemyState.CHASE;
      }
    }

    // ── 行为执行 ──
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this._state) {
      case EnemyState.PATROL:
        this.doPatrol(body);
        this.playAnimSafe('enemy_walk');
        break;
      case EnemyState.CHASE:
        this.doChase(body, playerX);
        this.playAnimSafe('enemy_chase');
        break;
    }
  }

  // ─────────────────────────────────────────────────
  // 安全播放动画
  // ─────────────────────────────────────────────────
  private playAnimSafe(key: string): void {
    if (this.anims.exists(key) && (!this.anims.currentAnim || this.anims.currentAnim.key !== key)) {
      this.anims.play(key);
    }
  }

  // ─────────────────────────────────────────────────
  // PATROL：在出生点左右 patrolRange 范围内往返
  // ─────────────────────────────────────────────────
  private doPatrol(body: Phaser.Physics.Arcade.Body): void {
    const leftBound  = this._spawnX - this._cfg.patrolRange;
    const rightBound = this._spawnX + this._cfg.patrolRange;

    if (this._facingRight) {
      body.setVelocityX(this._cfg.speed);
      this.setFlipX(false);            // 朝右 = 不翻转
      if (this.x >= rightBound) {
        this._facingRight = false;
      }
    } else {
      body.setVelocityX(-this._cfg.speed);
      this.setFlipX(true);             // 朝左 = 水平镜像
      if (this.x <= leftBound) {
        this._facingRight = true;
      }
    }
  }

  // ─────────────────────────────────────────────────
  // CHASE：朝玩家方向加速移动
  // ─────────────────────────────────────────────────
  private doChase(body: Phaser.Physics.Arcade.Body, playerX: number): void {
    const chaseSpd = this._cfg.speed * CHASE_SPEED_MUL;

    if (playerX > this.x) {
      body.setVelocityX(chaseSpd);
      this._facingRight = true;
      this.setFlipX(false);            // 朝右 = 不翻转
    } else {
      body.setVelocityX(-chaseSpd);
      this._facingRight = false;
      this.setFlipX(true);             // 朝左 = 水平镜像
    }
  }

  // ─────────────────────────────────────────────────
  // 受击（由碰撞回调调用）
  // ─────────────────────────────────────────────────
  takeDamage(amount: number): void {
    if (this._state === EnemyState.DEATH) return;
    if (this._state === EnemyState.HURT) return; // 受击硬直中不重复受击

    this._hp = Math.max(0, this._hp - amount);

    if (this._hp <= 0) {
      this.die();
    } else {
      this._state    = EnemyState.HURT;
      this._hurtTimer = HURT_FLASH_MS;
      this.playAnimSafe('enemy_hurt');

      // 击退
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(0);
    }
  }

  // ─────────────────────────────────────────────────
  // 死亡
  // ─────────────────────────────────────────────────
  private die(): void {
    this._state = EnemyState.DEATH;
    this._deathTimer = DEATH_FADE_MS;

    this.playAnimSafe('enemy_death');

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, -120);  // 轻微上跳再落下
    body.setAllowGravity(true);

    this.bus.emit(GameEvent.ENEMY_DEFEATED, {
      enemyType: this._cfg.type,
      position: { x: this.x, y: this.y },
      scoreValue: this._cfg.scoreValue,
    });

    // 淡出动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: DEATH_FADE_MS,
    });
  }

  // ── Getters ──────────────────────────────────────
  get hp(): number          { return this._hp; }
  get enemyState(): EnemyState { return this._state; }
  get config(): Readonly<EnemyConfig> { return this._cfg; }
  get isDefeated(): boolean { return this._state === EnemyState.DEATH; }
}
