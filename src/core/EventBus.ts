// ============================================================
// EventBus.ts — 全局事件总线（单例模式）
// 所有模块间通信的唯一渠道，禁止模块间直接 import
// ============================================================

import type { GameEvent, EventPayloadMap } from '../types/events.types';

type CallbackFn = (...args: unknown[]) => void;

interface Subscriber {
  callback: CallbackFn;
  context?: object;
  once: boolean;
}

export class EventBus {
  private static instance: EventBus;
  private subscribers = new Map<GameEvent, Subscriber[]>();

  private constructor() {}

  /** 获取单例 */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /** 订阅事件（持续监听） */
  on<K extends GameEvent>(
    event: K,
    callback: (payload: EventPayloadMap[K]) => void,
    context?: object,
  ): void {
    const subs = this.subscribers.get(event) ?? [];
    subs.push({ callback: callback as CallbackFn, context, once: false });
    this.subscribers.set(event, subs);
  }

  /** 单次订阅（触发后自动取消） */
  once<K extends GameEvent>(
    event: K,
    callback: (payload: EventPayloadMap[K]) => void,
    context?: object,
  ): void {
    const subs = this.subscribers.get(event) ?? [];
    subs.push({ callback: callback as CallbackFn, context, once: true });
    this.subscribers.set(event, subs);
  }

  /** 取消订阅 */
  off<K extends GameEvent>(
    event: K,
    callback: (payload: EventPayloadMap[K]) => void,
    context?: object,
  ): void {
    const subs = this.subscribers.get(event);
    if (!subs) return;

    const filtered = subs.filter(
      (s) => s.callback !== callback || s.context !== context,
    );
    if (filtered.length === 0) {
      this.subscribers.delete(event);
    } else {
      this.subscribers.set(event, filtered);
    }
  }

  /** 发布事件 */
  emit<K extends GameEvent>(event: K, payload: EventPayloadMap[K]): void {
    const subs = this.subscribers.get(event);
    if (!subs || subs.length === 0) return;

    // 拷贝后再遍历，避免 once 回调中 splice 导致跳过下一个
    const snapshot = [...subs];
    const toRemove: Subscriber[] = [];

    for (const sub of snapshot) {
      try {
        sub.callback.call(sub.context ?? null, payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
      if (sub.once) {
        toRemove.push(sub);
      }
    }

    // 移除 once 订阅
    if (toRemove.length > 0) {
      const remaining = snapshot.filter((s) => !toRemove.includes(s));
      if (remaining.length === 0) {
        this.subscribers.delete(event);
      } else {
        this.subscribers.set(event, remaining);
      }
    }
  }

  /** 清除所有订阅（场景切换时调用） */
  clear(): void {
    this.subscribers.clear();
  }

  /** 调试：查看当前订阅数 */
  debugCount(): number {
    let count = 0;
    this.subscribers.forEach((subs) => (count += subs.length));
    return count;
  }
}
