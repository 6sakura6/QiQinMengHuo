// ============================================================
// SaveSystem.ts — LocalStorage 存档系统（Batch 8）
// 职责：持久化玩家进度（关卡解锁 / 通关记录 / 设置）
// 存储策略：单 key "qiqin_menghuo_save" → JSON
// ============================================================

import type { SaveData, GameSettings } from '../types/system.types';
import type { LevelRecord } from '../types/data.types';
import { PlayStyle } from '../types/system.types';

const STORAGE_KEY = 'qiqin_menghuo_save';
const VERSION = 1;

/** 默认设置 */
function defaultSettings(): GameSettings {
  return {
    musicVolume: 0.7,
    sfxVolume: 1.0,
    screenShakeIntensity: 0.8,
    textSpeed: 'normal',
  };
}

/** 空白存档 */
function blankSave(): SaveData {
  return {
    version: VERSION,
    timestamp: Date.now(),
    currentLevel: 'level_01',
    unlockedLevels: ['level_01'],
    collectedFragments: [],
    playStyle: '',
    settings: defaultSettings(),
    levelRecords: {},
  };
}

export class SaveSystem {
  private static instance: SaveSystem;
  private _data!: SaveData;

  private constructor() {
    this._data = this.loadFromStorage();
  }

  /** 单例获取 */
  static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }

  // ── 内部 ──────────────────────────────────────────

  private loadFromStorage(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        console.log('[SaveSystem] 无存档，创建新存档');
        const blank = blankSave();
        this.persist(blank);
        return blank;
      }

      const parsed = JSON.parse(raw) as SaveData;

      // 兼容旧版本
      if (!parsed.levelRecords) parsed.levelRecords = {};
      if (!parsed.collectedFragments) parsed.collectedFragments = [];
      if (!parsed.unlockedLevels || parsed.unlockedLevels.length === 0) {
        parsed.unlockedLevels = ['level_01'];
      }
      if (!parsed.settings) parsed.settings = defaultSettings();
      parsed.version = VERSION;

      console.log(`[SaveSystem] 存档加载 — 已解锁 ${parsed.unlockedLevels.length} 关 | ${Object.keys(parsed.levelRecords).length} 条通关记录`);
      return parsed;
    } catch (err) {
      console.error('[SaveSystem] 加载存档失败，使用空白存档:', err);
      const blank = blankSave();
      this.persist(blank);
      return blank;
    }
  }

  private persist(data: SaveData): void {
    try {
      data.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[SaveSystem] 保存失败:', err);
    }
  }

  // ── 公开接口 ──────────────────────────────────────

  /** 获取完整存档数据（只读） */
  get data(): Readonly<SaveData> {
    return this._data;
  }

  /** 合并保存（部分更新） */
  save(partial: Partial<SaveData>): void {
    this._data = { ...this._data, ...partial };
    this.persist(this._data);
  }

  /** 判断关卡是否已解锁 */
  isLevelUnlocked(levelId: string): boolean {
    return this._data.unlockedLevels.includes(levelId);
  }

  /** 解锁关卡 */
  unlockLevel(levelId: string): void {
    if (!this._data.unlockedLevels.includes(levelId)) {
      this._data.unlockedLevels.push(levelId);
      this._data.currentLevel = levelId;
      this.persist(this._data);
      console.log(`[SaveSystem] ✅ 解锁关卡: ${levelId}`);
    }
  }

  /** 记录关卡通关数据 */
  recordLevelCompletion(record: LevelRecord): void {
    // 推断游玩风格
    const style = this.inferPlayStyle(record);
    record.playStyle = style;
    record.completed = true;

    // 追加到该关卡的历史记录（保留最多 10 条）
    const records = this._data.levelRecords[record.levelId] ?? [];
    records.push(record);
    if (records.length > 10) records.shift();
    this._data.levelRecords[record.levelId] = records;

    // 更新全局风格（取最近一次）
    this._data.playStyle = style;

    this.persist(this._data);
    console.log(`[SaveSystem] 📝 通关记录 — ${record.levelId} | 得分 ${record.score} | 风格 ${style}`);
  }

  /** 获取某关最新通关记录 */
  getLevelRecord(levelId: string): LevelRecord | null {
    const records = this._data.levelRecords[levelId];
    if (!records || records.length === 0) return null;
    return records[records.length - 1];
  }

  /** 获取上一关的玩家统计（用于 AI 分析） */
  getLastLevelStats(): LevelRecord | null {
    const ids = Object.keys(this._data.levelRecords);
    if (ids.length === 0) return null;
    const lastId = ids[ids.length - 1];
    const records = this._data.levelRecords[lastId];
    return records[records.length - 1] ?? null;
  }

  /** 清除所有数据（慎用） */
  resetAll(): void {
    this._data = blankSave();
    this.persist(this._data);
    console.log('[SaveSystem] 🗑️ 全部数据已清除');
  }

  // ── 辅助 ──────────────────────────────────────────

  /**
   * 根据通关数据推断玩家风格
   * AGGRESSIVE: 快速通关 + 低死亡
   * STEADY:    中等时间 + 低死亡
   * STRUGGLING:高死亡
   * EXPLORER:  长时间 + 低死亡
   */
  private inferPlayStyle(record: LevelRecord): string {
    const { timeSec, deaths } = record;

    if (deaths >= 3) return PlayStyle.STRUGGLING;
    if (timeSec < 180 && deaths <= 1) return PlayStyle.AGGRESSIVE;
    if (timeSec >= 360 && deaths <= 1) return PlayStyle.EXPLORER;
    return PlayStyle.STEADY;
  }
}
