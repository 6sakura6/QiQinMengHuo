// ============================================================
// Player.ts — 玩家实体（Batch 1：移动 + 跳跃 + 状态机）
// Batch 2 追加：射击
// ============================================================

import Phaser from 'phaser';
import { PlayerState } from '../types/entity.types';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';
import type { InputSnapshot } from '../systems/InputManager';

// ─────────────────── 玩家参数常量 ───────────────────
const PLAYER_SPEED       = 200;   // px/s 水平速度
const JUMP_VELOCITY      = -520;  // px/s 起跳纵速（负值 = 向上）
const MAX_HP             = 5;
const INVINCIBLE_MS      = 800;   // 受伤后无敌时间
const COYOTE_TIME_MS     = 100;   // 土狼时间（离地后仍可起跳的宽容窗口）
const JUMP_BUFFER_MS     = 100;   // 跳跃缓冲（落地前提前按跳也生效）
const SHOOT_DISPLAY_MS   = 200;   // 射击状态持续 ms（视觉反馈窗口）

export class Player extends Phaser.Physics.Arcade.Sprite {
  // ── 状态 ──────────────────────────────────────────
  // 🔧 初始值用空字符串做 sentinel，确保首帧 setPlayerState(IDLE) 不会因
  //    next===_playerState 短路，从而正确触发 anims.play('player_idle')
  private _playerState: PlayerState = '__uninit__' as PlayerState;
  private _hp = MAX_HP;
  private _facingRight = true;
  private _invincibleTimer = 0;   // 无敌剩余 ms
  private _coyoteTimer     = 0;   // 土狼时间剩余 ms
  private _jumpBufferTimer = 0;   // 跳跃缓冲剩余 ms
  private _shootTimer      = 0;   // 射击表态剩余 ms（Batch 2）
  private _wasOnGround     = false;

  private bus = EventBus.getInstance();

  // ─────────────────────────────────────────────────
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 🔧 修复：Phaser spritesheet 的正确引用方式是 (textureKey, frameIndex)
    //   'player_sheet_0' 不是有效纹理名，必须用 'player_sheet' + frame 0
    //   TypeScript 不允许 super 在 if/else 中，所以先计算参数
    const [texKey, frame] = scene.textures.exists('player_sheet')
      ? ['player_sheet', 0] as const
      : ['player_idle_0', undefined] as const;
    super(scene, x, y, texKey, frame);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    // 真实精灵图 330×283 → 缩放到合理游戏尺寸（约 72×62 显示）
    // 灰盒 24×40 保持原始比例
    if (scene.textures.exists('player_sheet')) {
      this.setScale(0.22);  // 330×283 × 0.22 ≈ 73×62 像素
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    // 碰撞盒适配（纹理坐标系，scale 0.22 后自动缩放）
    // 灰盒：24×40 offset(4,8)
    // 真精灵：纹理 330×283，角色脚部 y≈265，水平中心 x≈164
    //   → 碰撞盒 109×182 offset(110,83)
    //   → scale 0.22 后世界尺寸 24×40，底部对齐脚部
    const bw = scene.textures.exists('player_sheet') ? 109 : 24;
    const bh = scene.textures.exists('player_sheet') ? 182 : 40;
    body.setSize(bw, bh);
    body.setOffset(scene.textures.exists('player_sheet') ? 110 : 4, scene.textures.exists('player_sheet') ? 83 : 8);
    body.setMaxVelocityX(PLAYER_SPEED);
    body.setGravityY(0);           // 由世界重力提供，不再单独设置
    this.setDepth(10);

    // 动画由 Scene.spawnPlayer() 创建后统一启动，避免构造时 anims 状态不一致
  }

  // ─────────────────────────────────────────────────
  // 每帧主循环（由 Level1Scene.update() 调用）
  // ─────────────────────────────────────────────────
  updatePlayer(delta: number, input: Readonly<InputSnapshot>): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;

    // ── 计时器倒计 ──
    this._invincibleTimer = Math.max(0, this._invincibleTimer - delta);
    if (!onGround && this._wasOnGround) {
      this._coyoteTimer = COYOTE_TIME_MS;  // 刚离地，开始土狼计时
    }
    this._coyoteTimer     = Math.max(0, this._coyoteTimer - delta);
    this._wasOnGround     = onGround;

    if (input.jumpJustPressed) {
      this._jumpBufferTimer = JUMP_BUFFER_MS;
    }
    this._jumpBufferTimer = Math.max(0, this._jumpBufferTimer - delta);
    this._shootTimer      = Math.max(0, this._shootTimer - delta);
    if (input.shootJustPressed) {
      this._shootTimer = SHOOT_DISPLAY_MS;
    }

    // ── 水平移动 ──
    if (input.left) {
      body.setVelocityX(-PLAYER_SPEED);
      this._facingRight = false;
      this.setFlipX(true);
    } else if (input.right) {
      body.setVelocityX(PLAYER_SPEED);
      this._facingRight = true;
      this.setFlipX(false);
    } else {
      // 摩擦减速（不硬置 0，保留小惯性感）
      body.setVelocityX(body.velocity.x * 0.75);
      if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
    }

    // ── 跳跃（土狼时间 + 缓冲）──
    const canJump = onGround || this._coyoteTimer > 0;
    if (this._jumpBufferTimer > 0 && canJump) {
      body.setVelocityY(JUMP_VELOCITY);
      this._coyoteTimer     = 0;
      this._jumpBufferTimer = 0;
    }

    // ── 可变跳高（松开跳跃键提前截断） ──
    if (!input.jump && body.velocity.y < -200) {
      body.setVelocityY(body.velocity.y * 0.88);
    }

    // ── 状态机更新 ──
    this.updateState(onGround, input);
  }

  // ─────────────────────────────────────────────────
  // 状态机
  // ─────────────────────────────────────────────────
  private updateState(onGround: boolean, input: Readonly<InputSnapshot>): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let next: PlayerState;

    if (this._playerState === PlayerState.DEATH || this._playerState === PlayerState.CUTSCENE_LOCK) {
      return; // 终态，不再切换
    }

    if (this._playerState === PlayerState.HURT && this._invincibleTimer > INVINCIBLE_MS * 0.6) {
      return; // 受伤硬直前半段锁状态
    }

    const moving = Math.abs(body.velocity.x) > 10;

    if (this._shootTimer > 0) {
      next = PlayerState.SHOOT;       // 射击态优先（瞬时覆盖）
    } else if (!onGround && body.velocity.y < 0) {
      next = PlayerState.JUMP;
    } else if (!onGround && body.velocity.y > 50) {
      next = PlayerState.FALL;
    } else if (moving) {
      next = PlayerState.RUN;
    } else {
      next = PlayerState.IDLE;
    }

    this.setPlayerState(next);
  }

  private setPlayerState(next: PlayerState): void {
    if (next === this._playerState) return;
    const prev = this._playerState;
    this._playerState = next;

    // 播放逐帧动画（30fps 精灵动画）
    const animKey = `player_${next}`;
    // 🔧 根因修复：必须用 scene.anims.exists() 检查全局动画管理器！
    //   sprite.anims.exists() 检查的是精灵专属动画（this.anims 是 null，
    //   除非用 sprite.anims.create() 创建），所以永远返回 false，
    //   导致 this.play() 从未被调用 → 动画卡在 idle [0,0,1,1] = 只有2帧
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    }

    // 更新闪烁效果（无敌状态）
    this.setAlpha(next === PlayerState.HURT ? 0.5 : 1);

    this.bus.emit(GameEvent.PLAYER_STATE_CHANGE, { from: prev, to: next });
  }

  // ─────────────────────────────────────────────────
  // 受伤 / 死亡（由 Level1Scene 的碰撞回调调用）
  // ─────────────────────────────────────────────────
  takeDamage(amount: number, source = 'enemy'): void {
    if (this._invincibleTimer > 0) return;        // 无敌帧内免伤
    if (this._playerState === PlayerState.DEATH) return;

    this._hp = Math.max(0, this._hp - amount);
    this._invincibleTimer = INVINCIBLE_MS;

    this.bus.emit(GameEvent.PLAYER_DAMAGED, {
      currentHp: this._hp,
      maxHp: MAX_HP,
      source,
    });
    this.bus.emit(GameEvent.HP_CHANGED, { currentHp: this._hp, maxHp: MAX_HP });

    if (this._hp <= 0) {
      this.die();
    } else {
      this.setPlayerState(PlayerState.HURT);
      // 受伤弹退
      const body = this.body as Phaser.Physics.Arcade.Body;
      const knockDir = this._facingRight ? -1 : 1;
      body.setVelocity(knockDir * 120, -200);
    }
  }

  die(): void {
    this._hp = 0;
    this.setPlayerState(PlayerState.DEATH);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, -200);

    this.bus.emit(GameEvent.PLAYER_DEATH, {
      cause: 'damage',
      position: { x: this.x, y: this.y },
    });

    // 🔧 热修复: 不再使用 tween（避免 onComplete 回调中调用 scene.restart()
    //    时与 TweenManager 迭代器冲突导致冻屏）。
    //    改为即时半透明 + 纯延时后重启。
    this.setAlpha(0.35);
    this.scene.time.delayedCall(1200, () => {
      // 守卫：防止 Player 已被销毁（极边缘情况）
      if (!this.scene) return;
      this.bus.emit(GameEvent.LEVEL_RESTART, { levelId: 'level_01' });
    });
  }

  /** 由 CutScene / DialogSystem 调用，锁定玩家输入 */
  lockForCutscene(): void { this.setPlayerState(PlayerState.CUTSCENE_LOCK); }
  unlockFromCutscene(): void { this.setPlayerState(PlayerState.IDLE); }

  // ── Getters ──────────────────────────────────────
  get playerState(): PlayerState { return this._playerState; }
  get hp(): number           { return this._hp; }
  get maxHp(): number        { return MAX_HP; }
  get facingRight(): boolean { return this._facingRight; }
  get isInvincible(): boolean { return this._invincibleTimer > 0; }
}
