// ============================================================
// ScreenShake.ts — 屏幕震动系统（Batch 9）
// 职责：四级便捷震动接口，通过 CAMERA_SHAKE 事件驱动 CameraSystem
// 接口：light / medium / heavy / custom
// 尊重 SaveSystem 中 screenShakeIntensity 用户设置
// ============================================================

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import { SaveSystem } from './SaveSystem';

// ─── 预设震动参数 ──────────────────────────────────
// intensity 为归一化值（0-100），由 CameraSystem.shake() 映射到实际像素
const PRESETS = {
  light:  { intensity: 5,  duration: 120 },   // 命中反馈（弩箭命中 / 轻受击）
  medium: { intensity: 15, duration: 250 },   // 中等受击 / Boss 横扫
  heavy:  { intensity: 35, duration: 400 },   // Boss 踏地 / 转阶段 / 玩家死亡
  boss_entrance: { intensity: 40, duration: 500 }, // Boss 登场
};

export class ScreenShake {
  private scene: Phaser.Scene;
  private bus = EventBus.getInstance();
  private saveSys = SaveSystem.getInstance();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** 获取用户设置中的震动强度系数（0-1） */
  private get intensityMultiplier(): number {
    return this.saveSys.data.settings.screenShakeIntensity;
  }

  // ── 公开接口 ──────────────────────────────────────

  /** 轻微震动 — 命中反馈 */
  light(): void {
    this.emit(PRESETS.light);
  }

  /** 中等震动 — 受击 */
  medium(): void {
    this.emit(PRESETS.medium);
  }

  /** 强烈震动 — Boss 踏地 / 玩家死亡 */
  heavy(): void {
    this.emit(PRESETS.heavy);
  }

  /** Boss 登场专用震动 */
  bossEntrance(): void {
    this.emit(PRESETS.boss_entrance);
  }

  /** 自定义震动 */
  custom(intensity: number, duration: number): void {
    this.emit({ intensity, duration });
  }

  // ── 内部 ──────────────────────────────────────────

  private emit(preset: { intensity: number; duration: number }): void {
    const mul = this.intensityMultiplier;
    if (mul <= 0) return; // 用户禁用震动

    const finalIntensity = preset.intensity * mul;
    this.bus.emit(GameEvent.CAMERA_SHAKE, {
      intensity: finalIntensity,
      duration: preset.duration,
    });
  }
}
