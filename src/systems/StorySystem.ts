// ============================================================
// StorySystem.ts — 故事碎片系统（Batch 9）
// 职责：收集/查询故事碎片，集成 SaveSystem 持久化
// 接口：collect / isCollected / getCollected / getFragment
// ============================================================

import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';
import { SaveSystem } from './SaveSystem';
import type { StoryFragment } from '../types/data.types';

// 碎片数据将在 BootScene 或 LevelScene 中通过 loadFragments() 注入
let fragmentRegistry: Map<string, StoryFragment> = new Map();

export class StorySystem {
  private static instance: StorySystem;
  private bus = EventBus.getInstance();
  private saveSys = SaveSystem.getInstance();

  private constructor() {
    console.log('[StorySystem] 初始化');
  }

  static getInstance(): StorySystem {
    if (!StorySystem.instance) {
      StorySystem.instance = new StorySystem();
    }
    return StorySystem.instance;
  }

  // ─────────────────────────────────────────────────
  // 数据加载（由 Scene 在 create 时调用）
  // ─────────────────────────────────────────────────
  static loadFragments(fragments: StoryFragment[]): void {
    fragmentRegistry.clear();
    for (const f of fragments) {
      fragmentRegistry.set(f.id, f);
    }
    console.log(`[StorySystem] 已注册 ${fragments.length} 个故事碎片`);
  }

  // ─────────────────────────────────────────────────
  // 收集碎片
  // ─────────────────────────────────────────────────
  collect(fragmentId: string): boolean {
    if (this.isCollected(fragmentId)) {
      console.log(`[StorySystem] 碎片已收集，跳过: ${fragmentId}`);
      return false;
    }

    // 持久化到 SaveSystem
    this.saveSys.save({
      collectedFragments: [...this.saveSys.data.collectedFragments, fragmentId],
    });

    // 通知 UI / Scene
    this.bus.emit(GameEvent.FRAGMENT_COLLECTED, { fragmentId });

    const frag = this.getFragment(fragmentId);
    console.log(`[StorySystem] 📜 收集碎片: ${fragmentId} — "${frag?.title ?? '未知'}"`);
    return true;
  }

  // ─────────────────────────────────────────────────
  // 查询
  // ─────────────────────────────────────────────────
  isCollected(fragmentId: string): boolean {
    return this.saveSys.data.collectedFragments.includes(fragmentId);
  }

  getCollected(): string[] {
    return [...this.saveSys.data.collectedFragments];
  }

  getFragment(fragmentId: string): StoryFragment | null {
    return fragmentRegistry.get(fragmentId) ?? null;
  }

  /** 获取当前关卡的所有碎片（已收集 + 未收集） */
  getFragmentsForLevel(levelId: string): StoryFragment[] {
    const results: StoryFragment[] = [];
    for (const f of fragmentRegistry.values()) {
      if (f.levelId === levelId) results.push(f);
    }
    return results;
  }

  /** 获取当前关卡已收集的碎片 */
  getCollectedForLevel(levelId: string): string[] {
    const collected = this.saveSys.data.collectedFragments;
    return this.getFragmentsForLevel(levelId)
      .filter(f => collected.includes(f.id))
      .map(f => f.id);
  }

  // ─────────────────────────────────────────────────
  // 重置（测试用）
  // ─────────────────────────────────────────────────
  reset(): void {
    fragmentRegistry.clear();
  }
}
