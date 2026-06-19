// ============================================================
// WeaponSystem.ts — 武器系统（Batch 2）
// 职责：弹幕池管理、射击冷却、子弹生命周期
// 架构：Scene 调用 update(), 读取 InputSnapshot + Player 位置
// ============================================================

import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { WeaponType } from '../types/entity.types';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';
import type { InputSnapshot } from './InputManager';

// ─── 武器参数（后续从 WeaponConfig JSON 加载） ────────
const CROSSBOW_FIRE_RATE  = 400;   // ms 射击间隔
const CROSSBOW_BULLET_SPD = 420;   // px/s 箭矢飞行速度
const DIAGONAL_SPD        = 297;   // 420/√2 ≈ 297，斜向保持笛卡尔速度一致
const BULLET_LIFETIME_MS  = 800;   // ms 超时销毁（约 3.5 屏幕距离）

export class WeaponSystem {
  private bullets: Phaser.Physics.Arcade.Group;
  private cooldownTimer = 0;
  private _lastFacing = 1;              // 记录最后朝向（1=右, -1=左）
  private bus = EventBus.getInstance();

  // ── 子弹孵化偏移（从 Player 中心出发） ──────────────
  private readonly gunDist = 16;       // 枪口距角色中心距离（水平 & 对角）
  private readonly gunHeight = -8;     // 枪口高度（↖ 屏幕坐标，负值=偏上）

  constructor(private scene: Phaser.Scene) {
    this.bullets = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 30,           // 对象池上限
      allowGravity: false,
      runChildUpdate: false, // 手动迭代，精细控制
    });
  }

  // ─────────────────────────────────────────────────
  // 每帧更新（由 Level1Scene.update() 调用）
  // ─────────────────────────────────────────────────
  update(
    delta: number,
    input: Readonly<InputSnapshot>,
    playerX: number,
    playerY: number,
    facingRight: boolean,
  ): void {
    // 记录最后朝向（用于无方向输入时的默认射击方向）
    if (facingRight) this._lastFacing = 1;
    else this._lastFacing = -1;

    // 冷却倒计
    this.cooldownTimer = Math.max(0, this.cooldownTimer - delta);

    // 射击判定
    if (input.shootJustPressed && this.cooldownTimer <= 0) {
      this.fire(playerX, playerY, input);
    }

    // 迭代所有存活子弹，清理超时 / 越界的
    // ⚠️ 销毁子弹后必须从 Group 移除（Phaser 不会自动清理），
    //    否则 children 数组累积到 maxSize 后 group.add() 静默失败
    const children = this.bullets.getChildren() as Bullet[];
    const toCleanup: Bullet[] = [];

    for (const bullet of children) {
      if (!bullet.active) {
        toCleanup.push(bullet);
        continue;
      }
      bullet.updateBullet(delta);
    }

    for (const b of toCleanup) {
      // ⚠️ BUGFIX: 必须完整销毁（remove from group + scene + physics world）
      //    之前用 remove(b, false, false) 仅从 Group 移除但不销毁，
      //    导致 body 仍留在 physics.world.bodies → 调试渲染器持续画碰撞盒（方框+绿线）
      this.bullets.remove(b, true, true);
    }
  }

  // ─────────────────────────────────────────────────
  // 发射（八方向：↑↗→↘↓↙←↖）
  // ─────────────────────────────────────────────────
  private fire(x: number, y: number, input: Readonly<InputSnapshot>): void {
    // 计算射击方向
    let dirX = 0;
    if (input.right) dirX += 1;
    if (input.left)  dirX -= 1;
    let dirY = 0;
    if (input.up)    dirY -= 1;
    if (input.down)  dirY += 1;

    // 无方向输入 → 默认朝角色面向方向水平射击
    if (dirX === 0 && dirY === 0) {
      dirX = this._lastFacing ?? 1;
    }

    // 速度计算（斜向归一化，保持总速率一致）
    const isDiagonal = dirX !== 0 && dirY !== 0;
    const spd = isDiagonal ? DIAGONAL_SPD : CROSSBOW_BULLET_SPD;
    const vx = dirX * spd;
    const vy = dirY * spd;

    const spawnX = x + dirX * this.gunDist;
    // 🔽 垂直偏移：dirY≠0 用方向 × 枪距；否则默认枪口高度
    const spawnY = y + (dirY !== 0 ? dirY * this.gunDist : this.gunHeight);

    const bullet = new Bullet(this.scene, spawnX, spawnY, BULLET_LIFETIME_MS);
    this.bullets.add(bullet);            // ⚠️ 先 add 到 Group
    bullet.launch(vx, vy);              // ✅ 再设速度（Group.add 会重置体）
    this.cooldownTimer = CROSSBOW_FIRE_RATE;

    this.bus.emit(GameEvent.PLAYER_SHOOT, {
      weaponType: WeaponType.CROSSBOW,
      direction: { x: dirX, y: dirY },
    });
  }

  // ── Accessors ────────────────────────────────────
  getBulletGroup(): Phaser.Physics.Arcade.Group {
    return this.bullets;
  }

  get cooldownPercent(): number {
    return this.cooldownTimer / CROSSBOW_FIRE_RATE;
  }

  destroy(): void {
    this.bullets.destroy(true);
  }
}
