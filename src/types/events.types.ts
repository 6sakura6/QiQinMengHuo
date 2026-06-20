// ============================================================
// events.types.ts — 全局事件系统类型定义
// 所有模块间通信通过 EventBus + GameEvent 枚举完成
// ============================================================

import type { PlayerState, WeaponType, EnemyType, Vec2 } from './entity.types';
import type { DialogNode } from './system.types';
import type { LevelRecord } from './data.types';

// ============ 事件名称枚举 ============
export enum GameEvent {
  // ---- 玩家 ----
  PLAYER_DAMAGED = 'player:damaged',
  PLAYER_DEATH = 'player:death',
  PLAYER_SHOOT = 'player:shoot',
  PLAYER_STATE_CHANGE = 'player:stateChange',

  // ---- 敌人 ----
  ENEMY_DEFEATED = 'enemy:defeated',
  ENEMY_SPAWNED = 'enemy:spawned',
  ALL_ENEMIES_CLEARED = 'enemies:allCleared',

  // ---- Boss ----
  BOSS_SPAWNED = 'boss:spawned',
  BOSS_PHASE_CHANGE = 'boss:phaseChange',
  BOSS_DEFEATED = 'boss:defeated',
  BOSS_DAMAGED = 'boss:damaged',

  // ---- 对话 ----
  DIALOG_TRIGGER = 'dialog:trigger',
  DIALOG_START = 'dialog:start',
  DIALOG_END = 'dialog:end',

  // ---- 擒获 ----
  CAPTURE_START = 'capture:start',
  CAPTURE_DIALOG_START = 'capture:dialogStart',
  CAPTURE_RELEASE_START = 'capture:releaseStart',
  CAPTURE_COMPLETE = 'capture:complete',

  // ---- 关卡 ----
  LEVEL_START = 'level:start',
  LEVEL_CHECKPOINT = 'level:checkpoint',
  LEVEL_COMPLETE = 'level:complete',
  LEVEL_RESTART = 'level:restart',

  // ---- 碎片 ----
  FRAGMENT_COLLECTED = 'fragment:collected',

  // ---- UI ----
  HP_CHANGED = 'ui:hpChanged',
  SCORE_CHANGED = 'ui:scoreChanged',
  WEAPON_CHANGED = 'ui:weaponChanged',
  BOSS_HP_CHANGED = 'ui:bossHpChanged',

  // ---- 镜头 ----
  CAMERA_SHAKE = 'camera:shake',
  CAMERA_LOCK = 'camera:lock',
  CAMERA_UNLOCK = 'camera:unlock',

  // ---- 音频（v2 自适应音乐系统）----
  AUDIO_BGM_PLAY          = 'audio:bgmPlay',
  AUDIO_BGM_STOP          = 'audio:bgmStop',
  AUDIO_SFX_PLAY          = 'audio:sfxPlay',
  AUDIO_INTENSITY_CHANGE  = 'audio:intensityChange',   // 战斗强度变化 → 驱动 BGM 过渡
  AUDIO_CAPTURE_THEME     = 'audio:captureTheme',      // 触发擒获音乐主题
  AUDIO_AMBIENCE_PLAY     = 'audio:ambiencePlay',      // 播放环境音
  AUDIO_AMBIENCE_STOP     = 'audio:ambienceStop',      // 停止环境音
}

// ============ 事件 Payload 类型映射 ============
export interface EventPayloadMap {
  [GameEvent.PLAYER_DAMAGED]: { currentHp: number; maxHp: number; source: string };
  [GameEvent.PLAYER_DEATH]: { cause: string; position: Vec2 };
  [GameEvent.PLAYER_SHOOT]: { weaponType: WeaponType; direction: Vec2 };
  [GameEvent.PLAYER_STATE_CHANGE]: { from: PlayerState; to: PlayerState };

  [GameEvent.ENEMY_DEFEATED]: { enemyType: EnemyType; position: Vec2; scoreValue: number };
  [GameEvent.ENEMY_SPAWNED]: { enemyType: EnemyType; position: Vec2 };
  [GameEvent.ALL_ENEMIES_CLEARED]: { count: number };

  [GameEvent.BOSS_SPAWNED]: { bossId: string };
  [GameEvent.BOSS_PHASE_CHANGE]: { phase: number; hpPercent: number };
  [GameEvent.BOSS_DEFEATED]: { bossId: string; scoreValue: number };
  [GameEvent.BOSS_DAMAGED]: { currentHp: number; maxHp: number };

  [GameEvent.DIALOG_TRIGGER]: { dialogId: string };
  [GameEvent.DIALOG_START]: { dialog: DialogNode };
  [GameEvent.DIALOG_END]: { dialogId: string };

  [GameEvent.CAPTURE_START]: { bossId: string };
  [GameEvent.CAPTURE_DIALOG_START]: { dialogId: string };
  [GameEvent.CAPTURE_RELEASE_START]: { dialogId: string };
  [GameEvent.CAPTURE_COMPLETE]: { levelId: string };

  [GameEvent.LEVEL_START]: { levelId: string };
  [GameEvent.LEVEL_CHECKPOINT]: { checkpointId: string };
  [GameEvent.LEVEL_COMPLETE]: { levelId: string; stats: LevelRecord };
  [GameEvent.LEVEL_RESTART]: { levelId: string };

  [GameEvent.FRAGMENT_COLLECTED]: { fragmentId: string };

  [GameEvent.HP_CHANGED]: { currentHp: number; maxHp: number };
  [GameEvent.SCORE_CHANGED]: { score: number };
  [GameEvent.WEAPON_CHANGED]: { weaponType: WeaponType };
  [GameEvent.BOSS_HP_CHANGED]: { currentHp: number; maxHp: number };

  [GameEvent.CAMERA_SHAKE]: { intensity: number; duration: number };
  [GameEvent.CAMERA_LOCK]: { target: Vec2; duration: number };
  [GameEvent.CAMERA_UNLOCK]: Record<string, never>;

  // ---- 音频（v2 自适应音乐系统）----
  [GameEvent.AUDIO_BGM_PLAY]         : { key: string };
  [GameEvent.AUDIO_BGM_STOP]         : Record<string, never>;
  [GameEvent.AUDIO_SFX_PLAY]         : { key: string; volume?: number; position?: { x: number; y: number } };
  [GameEvent.AUDIO_INTENSITY_CHANGE] : { intensity: number };    // 0.0-1.0 战斗强度
  [GameEvent.AUDIO_CAPTURE_THEME]    : Record<string, never>;
  [GameEvent.AUDIO_AMBIENCE_PLAY]    : { key: string; volume?: number };
  [GameEvent.AUDIO_AMBIENCE_STOP]    : Record<string, never>;
}
