// ============================================================
// CameraSystem.ts — 相机系统（Batch 4）
// 职责：平滑跟随、死区、震动、锁定/解锁
// 通过 EventBus 监听 CAMERA_SHAKE / CAMERA_LOCK / CAMERA_UNLOCK
// ============================================================

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import type { Vec2 } from '../types/entity.types';

export interface CameraConfig {
  /** 世界边界（pixel） */
  worldBounds: Phaser.Geom.Rectangle;
  /** 跟随平滑系数（0=瞬移, 1=不跟，推荐 0.08~0.12） */
  lerpX?: number;
  lerpY?: number;
  /** 死区大小（pixel） */
  deadzoneW?: number;
  deadzoneH?: number;
}

const DEFAULT_LERP    = 0.08;
const DEFAULT_DEAD_W  = 80;
const DEFAULT_DEAD_H  = 40;

export class CameraSystem {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private bus = EventBus.getInstance();
  private _following: Phaser.GameObjects.GameObject | null = null;
  private _config: CameraConfig;
  private _locked = false;
  private _lockTimer = 0;

  constructor(private scene: Phaser.Scene, config: CameraConfig) {
    this.cam  = scene.cameras.main;
    this._config = {
      lerpX: config.lerpX ?? DEFAULT_LERP,
      lerpY: config.lerpY ?? DEFAULT_LERP,
      deadzoneW: config.deadzoneW ?? DEFAULT_DEAD_W,
      deadzoneH: config.deadzoneH ?? DEFAULT_DEAD_H,
      worldBounds: config.worldBounds,
    };

    this.setup();
  }

  // ─────────────────────────────────────────────────
  // 初始化相机参数
  // ─────────────────────────────────────────────────
  private setup(): void {
    this.cam.setBounds(
      this._config.worldBounds.x,
      this._config.worldBounds.y,
      this._config.worldBounds.width,
      this._config.worldBounds.height,
    );

    // 监听事件
    this.bus.on(GameEvent.CAMERA_SHAKE, this._onShake, this);
    this.bus.on(GameEvent.CAMERA_LOCK, this._onLock, this);
    this.bus.on(GameEvent.CAMERA_UNLOCK, this._onUnlock, this);
  }

  // ── EventBus 回调（绑定 this，便于 off 清理） ──
  private _onShake(payload: unknown): void {
    const p = payload as any;
    this.shake(p.intensity ?? 5, p.duration ?? 200);
  }

  private _onLock(payload: unknown): void {
    const p = payload as any;
    this.lock(p.target, p.duration ?? 2000);
  }

  private _onUnlock(): void {
    this.unlock();
  }

  // ─────────────────────────────────────────────────
  // 跟随目标（每帧由 Scene.update() 调用）
  // ─────────────────────────────────────────────────
  follow(target: Phaser.GameObjects.GameObject): void {
    if (!this._following) {
      this.cam.startFollow(
        target, true,
        this._config.lerpX!,
        this._config.lerpY!,
      );
      this.cam.setDeadzone(this._config.deadzoneW!, this._config.deadzoneH!);
    }
    this._following = target;
  }

  // ─────────────────────────────────────────────────
  // 每帧更新（处理锁定计时 + 摇镜回中）
  // ─────────────────────────────────────────────────
  update(delta: number): void {
    if (this._locked && this._lockTimer > 0) {
      this._lockTimer -= delta;
      if (this._lockTimer <= 0) {
        this.unlock();
      }
    }
  }

  // ─────────────────────────────────────────────────
  // 震动效果（受到伤害 / Boss 砸地等）
  // ─────────────────────────────────────────────────
  shake(intensity = 5, duration = 200): void {
    // Phaser Camera.shake() 的 intensity 是相机尺寸的比例值(0~1)
    // 载荷 intensity 为归一化值（0-100），除以 1000 映射到 0-0.1 范围
    // 典型：5→0.005≈4px（微震），15→0.015≈12px（中震），40→0.04≈32px（强震）
    // ⚠️ BUGFIX: 之前 /10 导致 15→1.5 = 相机尺寸150% = 1200px疯狂抖动
    this.cam.shake(duration, intensity / 1000, true);
  }

  // ─────────────────────────────────────────────────
  // 锁定镜头（过场 / 对话 / Boss 出场）
  // ─────────────────────────────────────────────────
  lock(target: Vec2, duration: number): void {
    this._locked    = true;
    this._lockTimer = duration;
    this.cam.stopFollow();

    // 平滑移到锁定位置
    this.scene.tweens.add({
      targets: this.cam,
      scrollX: target.x - this.cam.width / 2,
      scrollY: target.y - this.cam.height / 2,
      duration: 600,
      ease: 'Sine.easeInOut',
    });
  }

  unlock(): void {
    this._locked    = false;
    this._lockTimer = 0;
    if (this._following) {
      this.cam.startFollow(
        this._following, true,
        this._config.lerpX!,
        this._config.lerpY!,
      );
      this.cam.setDeadzone(this._config.deadzoneW!, this._config.deadzoneH!);
    }
  }

  // ── Accessors ────────────────────────────────────
  get isLocked(): boolean { return this._locked; }

  // ─────────────────────────────────────────────────
  destroy(): void {
    this.bus.off(GameEvent.CAMERA_SHAKE, this._onShake, this);
    this.bus.off(GameEvent.CAMERA_LOCK, this._onLock, this);
    this.bus.off(GameEvent.CAMERA_UNLOCK, this._onUnlock, this);
    this._following = null;
    this.cam.stopFollow();
  }
}
