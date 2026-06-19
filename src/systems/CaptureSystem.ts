// ============================================================
// CaptureSystem.ts — 擒获状态机（Batch 7 · 核心差异化系统）
// 职责：管理 Boss 被击败 → 擒获演出 → 对话 → 释放的完整流程
// 驱动方式：Phaser.Scene.time.delayedCall 阶段计时 + EventBus 事件通信
// ============================================================

import Phaser from 'phaser';
import { CaptureState } from '../types/system.types';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';
import type { BossMengHuoL1 } from '../entities/BossMengHuoL1';
import type { DialogSystem } from './DialogSystem';

// ─── 阶段延迟配置（ms）─────────────────────────
const CONFIG = {
  /** Boss 击败白闪后 → 擒获动画的等待时间 */
  bossDefeatedDelay: 800,
  /** 擒获动画 → 对话的等待时间（enterCaptured tween yoyo 约 800ms + 100ms 余量） */
  captureAnimDelay: 900,
};

export class CaptureSystem {
  private _phase: CaptureState = CaptureState.IDLE;
  private bus = EventBus.getInstance();
  private scene: Phaser.Scene;
  private _bossRef: BossMengHuoL1 | null = null;
  private _dialogSys: DialogSystem | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // 自主监听 DIALOG_END，不依赖 Scene 处理器
    this.bus.on(GameEvent.DIALOG_END, this._onDialogEnd);
  }

  /** 由 Scene 注入 DialogSystem 引用，必须在任何对话开始前调用 */
  setDialogSys(ds: DialogSystem | null): void {
    if (!ds) {
      console.error('[CaptureSystem] setDialogSys 收到 null/undefined！擒获流程将无法自动推进');
      return;
    }
    this._dialogSys = ds;
  }

  // ── 只读状态 ────────────────────────────────────
  get phase(): CaptureState { return this._phase; }

  get isActive(): boolean {
    return this._phase !== CaptureState.IDLE
        && this._phase !== CaptureState.COMPLETE;
  }

  // ── 自主推进：DialogBox 打字完成 → DIALOG_END → 自检并推进
  //    （不依赖 Level1Scene 的处理器，防止逃逸）
  private _onDialogEnd = (): void => {
    if (!this._dialogSys) {
      console.warn('[CaptureSystem] _onDialogEnd: _dialogSys 未注入，跳过');
      return;
    }
    if (this.isActive && !this._dialogSys.isActive) {
      console.log(`[CaptureSystem] DIALOG_END → advance() (phase=${this._phase})`);
      this.advance();
    }
  };

  // ═══════════════════════════════════════════════════
  // 启动擒获流程（由 Scene 的 BOSS_DEFEATED 处理器调用）
  // ═══════════════════════════════════════════════════
  startCapture(boss: BossMengHuoL1): void {
    if (this._phase !== CaptureState.IDLE) {
      console.warn('[CaptureSystem] 已在擒获流程中，忽略');
      return;
    }

    this._bossRef = boss;
    this._phase = CaptureState.BOSS_DEFEATED;
    console.log('[CaptureSystem] 🎬 擒获流程启动 — Phase: BOSS_DEFEATED');

    // 通知外部系统擒获开始（镜头锁/震动由本系统统一管理）
    this.bus.emit(GameEvent.CAPTURE_START, { bossId: 'level_01_boss' });

    // 锁定镜头到 Boss 位置 + 剧烈震动
    this.bus.emit(GameEvent.CAMERA_LOCK, {
      target: { x: boss.x, y: boss.y - 40 },
      duration: 4000,
    });
    this.bus.emit(GameEvent.CAMERA_SHAKE, { intensity: 40, duration: 500 });

    // 延迟 → 进入擒获动画阶段
    this.scene.time.delayedCall(CONFIG.bossDefeatedDelay, () => this.advance());
  }

  // ═══════════════════════════════════════════════════
  // 推进到下一阶段（由 Scene 按事件/时序调用）
  // ═══════════════════════════════════════════════════
  advance(): void {
    switch (this._phase) {
      // ── BOSS_DEFEATED → CAPTURE_ANIM ──────────
      case CaptureState.BOSS_DEFEATED:
        this._phase = CaptureState.CAPTURE_ANIM;
        console.log('[CaptureSystem] → Phase: CAPTURE_ANIM');

        if (this._bossRef) {
          this._bossRef.enterCaptured();
        }

        this.scene.time.delayedCall(CONFIG.captureAnimDelay, () => this.advance());
        break;

      // ── CAPTURE_ANIM → DIALOG_PLAYING ──────────
      case CaptureState.CAPTURE_ANIM:
        this._phase = CaptureState.DIALOG_PLAYING;
        console.log('[CaptureSystem] → Phase: DIALOG_PLAYING (孟获台词)');

        this.bus.emit(GameEvent.CAPTURE_DIALOG_START, {
          dialogId: 'boss_defeat',
        });
        break;

      // ── DIALOG_PLAYING → RELEASE_ANIM ──────────
      case CaptureState.DIALOG_PLAYING:
        this._phase = CaptureState.RELEASE_ANIM;
        console.log('[CaptureSystem] → Phase: RELEASE_ANIM (诸葛亮台词)');

        this.bus.emit(GameEvent.CAPTURE_RELEASE_START, {
          dialogId: 'release',
        });
        break;

      // ── RELEASE_ANIM → COMPLETE ────────────────
      case CaptureState.RELEASE_ANIM:
        this._phase = CaptureState.COMPLETE;
        console.log('[CaptureSystem] ✅ Phase: COMPLETE');

        // 隐藏 Boss（淡出 + 销毁）
        if (this._bossRef) {
          this.scene.tweens.add({
            targets: this._bossRef,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 600,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this._bossRef?.destroy();
            },
          });
        }

        this.bus.emit(GameEvent.CAMERA_UNLOCK, {});
        this.bus.emit(GameEvent.CAPTURE_COMPLETE, {
          levelId: 'level_01',
        });
        break;

      default:
        console.warn(`[CaptureSystem] advance() 在非法阶段调用: ${this._phase}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // 重置（场景销毁时调用）
  // ═══════════════════════════════════════════════════
  reset(): void {
    this._phase = CaptureState.IDLE;
    this._bossRef = null;
    this.bus.off(GameEvent.DIALOG_END, this._onDialogEnd);
  }
}
