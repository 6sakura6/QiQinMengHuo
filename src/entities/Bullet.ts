// ============================================================
// Bullet.ts — 子弹实体（Batch 2）
// 简单的物理投射物：飞行、超时销毁、边界销毁
// ============================================================

import Phaser from 'phaser';

const DEFAULT_LIFETIME_MS = 800;
const BULLET_DAMAGE       = 1;

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private _damage = BULLET_DAMAGE;
  private _elapsed = 0;
  private readonly _lifetimeMs: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    lifetimeMs = DEFAULT_LIFETIME_MS,
  ) {
    super(scene, x, y, 'bullet_placeholder');
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true); // 越界即触发 worldbounds 事件
    this.setDepth(9);
    this._lifetimeMs = lifetimeMs;
  }

  /** 发射：设置速度（必须在 add 到 Group 之后调用，否则速度被清零） */
  launch(vx: number, vy: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  // ── 由 WeaponSystem.update() 每帧调用 ──────────────
  updateBullet(delta: number): boolean {
    this._elapsed += delta;
    if (this._elapsed >= this._lifetimeMs) {
      this.destroy();
      return false;
    }
    return true;
  }

  /** 碰撞回调：命中任何物体立即销毁 */
  onHit(): void {
    this.destroy();
  }

  // ── Getters ──────────────────────────────────────
  get damage(): number { return this._damage; }
}
