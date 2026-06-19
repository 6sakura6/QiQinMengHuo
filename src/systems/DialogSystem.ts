// ============================================================
// DialogSystem.ts — 对话系统（Batch 6）
// 职责：加载关卡对话数据，按 trigger / ID 查询，管理对话链
// ============================================================

import { DialogTrigger } from '../types/system.types';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../types/events.types';

// JSON 数据条目（dialogs.json 格式）
export interface DialogDataEntry {
  id: string;
  trigger: DialogTrigger;
  speaker: string;
  text: string;
  skippable: boolean;
  firstPlayLockSec: number;    // 首次播放时强制显示秒数
  next?: string;               // 链式下一句对话 ID
}

export class DialogSystem {
  private dialogs: Map<string, DialogDataEntry> = new Map();
  private bus = EventBus.getInstance();
  private seen: Set<string> = new Set();
  private _currentId: string | null = null;

  // 是否在对话中
  get isActive(): boolean {
    return this._currentId !== null;
  }

  constructor() {
    // 自动链式推进：当 DialogBox 发出 DIALOG_END 时检查是否有下一句
    // ⚠️ 同步触发（无 setTimeout），保证 resume/pause 在同一调用栈，不留物理空隙
    this.bus.on(GameEvent.DIALOG_END, (payload) => {
      const p = payload as { dialogId: string };
      const current = this.getById(p.dialogId);
      this._currentId = null;
      if (current?.next) {
        this.trigger(current.next);
      }
    });
  }

  // ─────────────────────────────────────────────────
  // 数据加载
  // ─────────────────────────────────────────────────
  load(entries: DialogDataEntry[]): void {
    this.dialogs.clear();
    for (const e of entries) {
      this.dialogs.set(e.id, e);
    }
    console.log(`[DialogSystem] 已加载 ${entries.length} 条对话`);
  }

  // ─────────────────────────────────────────────────
  // 查询
  // ─────────────────────────────────────────────────
  getById(id: string): DialogDataEntry | null {
    return this.dialogs.get(id) ?? null;
  }

  getByTrigger(trigger: DialogTrigger): DialogDataEntry | null {
    for (const d of this.dialogs.values()) {
      if (d.trigger === trigger) return d;
    }
    return null;
  }

  getSequence(): string[] {
    // 返回所有对话 ID（用于调试/验证）
    return Array.from(this.dialogs.keys());
  }

  // ─────────────────────────────────────────────────
  // 触发对话
  // ─────────────────────────────────────────────────
  trigger(dialogId: string): void {
    const entry = this.getById(dialogId);
    if (!entry) {
      console.warn(`[DialogSystem] 对话不存在: ${dialogId}`);
      return;
    }
    this._showEntry(entry);
  }

  triggerByEvent(trigger: DialogTrigger): boolean {
    const entry = this.getByTrigger(trigger);
    if (!entry) return false;
    this._showEntry(entry);
    return true;
  }

  // ─────────────────────────────────────────────────
  // 首次播放追踪
  // ─────────────────────────────────────────────────
  isFirstPlay(id: string): boolean {
    return !this.seen.has(id);
  }

  markSeen(id: string): void {
    this.seen.add(id);
  }

  // ─────────────────────────────────────────────────
  // 内部方法
  // ─────────────────────────────────────────────────
  private _showEntry(entry: DialogDataEntry): void {
    this._currentId = entry.id;
    const isFirst = this.isFirstPlay(entry.id);

    this.bus.emit(GameEvent.DIALOG_START, {
      dialog: {
        id: entry.id,
        trigger: entry.trigger,
        speaker: entry.speaker,
        text: entry.text,
        skippable: entry.skippable,
        firstPlayLockSec: isFirst ? entry.firstPlayLockSec : 0,
      },
    });

    // 标记已播放
    this.markSeen(entry.id);
  }

  // ─────────────────────────────────────────────────
  // 重置
  // ─────────────────────────────────────────────────
  reset(): void {
    this._currentId = null;
    this.dialogs.clear();
    this.seen.clear();
  }
}
