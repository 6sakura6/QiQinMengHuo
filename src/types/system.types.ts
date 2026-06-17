// ============================================================
// system.types.ts — 系统层相关类型
// ============================================================

import type { LevelRecord } from './data.types';

// ============ 对话系统 ============
export enum DialogSpeaker {
  ZHUGE = 'zhuge',
  MENG_HUO = 'menghuo',
  SOLDIER = 'soldier',
  NARRATOR = 'narrator',
}

export enum DialogTrigger {
  LEVEL_INTRO = 'level_intro',
  COMBAT_BARK = 'combat_bark',
  BOSS_INTRO = 'boss_intro',
  BOSS_PHASE = 'boss_phase',
  BOSS_DEFEAT = 'boss_defeat',
  CAPTURE = 'capture',
  RELEASE = 'release',
  LEVEL_OUTRO = 'level_outro',
  FRAGMENT_FOUND = 'fragment_found',
  CHECKPOINT = 'checkpoint',
}

export interface DialogNode {
  id: string;
  trigger: DialogTrigger;
  speaker: string;           // 说话人名称（如 "诸葛亮"、"孟获"）
  text: string;
  skippable: boolean;
  firstPlayLockSec: number;  // 首次播放时强制显示秒数
  emotion?: string;
  next?: string;             // 下一句对话 ID
  choice?: DialogChoice[];
  action?: DialogAction;
  delayMs?: number;          // 打字机效果速度
}

export interface DialogChoice {
  text: string;
  next: string;
  styleTag?: string;        // 关联到 playStyle
}

export interface DialogAction {
  type: 'camera' | 'sfx' | 'shake' | 'wait' | 'highlight';
  params: Record<string, unknown>;
}

// ============ 擒获系统 ============
export enum CaptureState {
  IDLE = 'idle',
  BOSS_DEFEATED = 'boss_defeated',
  APPROACHING = 'approaching',
  CAPTURE_ANIM = 'capture_anim',
  DIALOG_PLAYING = 'dialog_playing',
  RELEASE_ANIM = 'release_anim',
  COMPLETE = 'complete',
}

// ============ 存档系统 ============
export interface SaveData {
  version: number;
  timestamp: number;
  currentLevel: string;
  unlockedLevels: string[];
  collectedFragments: string[];
  playStyle: string;
  settings: GameSettings;
  levelRecords: Record<string, LevelRecord[]>;
}

export enum PlayStyle {
  AGGRESSIVE = 'aggressive',
  STEADY = 'steady',
  STRUGGLING = 'struggling',
  EXPLORER = 'explorer',
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  screenShakeIntensity: number;
  textSpeed: 'slow' | 'normal' | 'fast';
}

// ============ 镜头系统 ============
export interface CameraEffect {
  type: 'shake' | 'zoom' | 'lock' | 'follow';
  intensity?: number;
  duration?: number;
  target?: { x: number; y: number };
}
