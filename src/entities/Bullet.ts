// ============================================================
// Bullet.ts — 子弹实体（Batch 2）
// 简单的物理投射物：飞行、超时销毁、边界销毁
// ============================================================

import Phaser from 'phaser';

const DEFAULT_LIFETIME_MS = 2000;   // 600px/s × 2s = 1200px 射程，确保能打到 Boss
export const BULLET_DAMAGE = 1;

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  // ⚠️ BUGFIX: esbuild 编译后 class extends Phaser.Sprite 的 instance
  //    在 physics.add.overlap 回调中 instanceof 检测会失败（原型链断裂）。
  //    因此不用 class field，改用 Phaser 内置 setData() 存储伤害值。
  //    setData 是 GameObject 上的普通 JS 字典，不依赖原型链。

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

    // 碰撞体：上下大幅延伸避免垂直不重叠（敌人身体可能偏下）
    // 14×20 覆盖玩家枪口高度到敌人躯干高度的大范围
    body.setSize(14, 20);
    body.setOffset(-3, -8);

    this.setDepth(9);
    this._lifetimeMs = lifetimeMs;
  }

  /** 发射：设置速度 + 箭矢朝向 + 存储伤害值到 Phaser Data 层 */
  launch(vx: number, vy: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    // 将伤害值存到 Phaser 内置 Data 字典（不依赖 JS prototype chain）
    this.setData('damage', BULLET_DAMAGE);
    // 弩箭朝向：向左飞则翻转，向右保持正向
    if (vx < 0) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }
    // 斜向射击给箭矢加旋转角
    if (vy !== 0 && vx !== 0) {
      this.setAngle(Math.atan2(vy, vx) * (180 / Math.PI));
    } else if (vy !== 0) {
      this.setAngle(vy < 0 ? -90 : 90);
    }
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

}
