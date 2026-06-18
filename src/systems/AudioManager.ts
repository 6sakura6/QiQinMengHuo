// ============================================================
// AudioManager.ts — 音频管理器（Batch 11）
// 职责：BGM / SFX 播放、音量控制、静音切换
// 设计原则：
//   1. 单例模式 — 跨场景保持同一实例
//   2. 安全空实现 — 资源未加载时静默忽略，不抛异常
//   3. 占位接口 — 音频 key 与调用点均已预留，接入真实音频只需
//      在 BootScene.preload() 加载对应 key 即可，业务代码无需改动
//
// 接入真实音频的步骤（Phase 4 时）：
//   1. 在 BootScene.preload() 加载音频文件：
//      this.load.audio('bgm_level1', 'assets/audio/bgm_level1.ogg');
//   2. 在 AudioManager.init(scene) 后调用，其余业务代码不变。
// ============================================================

import Phaser from 'phaser';

// ── SFX Key 常量 ─────────────────────────────────────────────
// 统一管理所有音效标识，方便资源接入时一次性替换
export const SFX = {
  // 玩家
  PLAYER_SHOOT   : 'sfx_player_shoot',
  PLAYER_HIT     : 'sfx_player_hit',
  PLAYER_DEATH   : 'sfx_player_death',
  PLAYER_JUMP    : 'sfx_player_jump',
  // 敌人
  ENEMY_HIT      : 'sfx_enemy_hit',
  ENEMY_DEATH    : 'sfx_enemy_death',
  // Boss
  BOSS_ENTER     : 'sfx_boss_enter',
  BOSS_HIT       : 'sfx_boss_hit',
  BOSS_CHARGE    : 'sfx_boss_charge',
  BOSS_STOMP     : 'sfx_boss_stomp',
  BOSS_SWEEP     : 'sfx_boss_sweep',
  // 系统
  CAPTURE_START  : 'sfx_capture_start',
  CAPTURE_DONE   : 'sfx_capture_done',
  FRAGMENT_PICK  : 'sfx_fragment_pick',
  DIALOG_NEXT    : 'sfx_dialog_next',
  MENU_SELECT    : 'sfx_menu_select',
  MENU_CONFIRM   : 'sfx_menu_confirm',
} as const;

// ── BGM Key 常量 ─────────────────────────────────────────────
export const BGM = {
  MAIN_MENU : 'bgm_main_menu',
  LEVEL_1   : 'bgm_level1',
  BOSS      : 'bgm_boss',
  RESULT    : 'bgm_result',
} as const;

type SfxKey = typeof SFX[keyof typeof SFX];
type BgmKey = typeof BGM[keyof typeof BGM];

// ── SFX 播放配置 ─────────────────────────────────────────────
interface SfxConfig {
  volume?: number;   // 0-1，默认 1
  loop?  : boolean;  // 默认 false
}

// ── 音频管理器 ─────────────────────────────────────────────
export class AudioManager {
  // ── 单例 ──────────────────────────────────────────────────
  private static _instance: AudioManager | null = null;

  static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  // ── 状态 ──────────────────────────────────────────────────
  private _scene   : Phaser.Scene | null = null;
  private _muted   : boolean = false;
  private _volume  : number  = 0.8;         // 主音量 0-1
  private _bgmKey  : BgmKey | null = null;  // 当前播放的 BGM key
  private _bgmSound: Phaser.Sound.BaseSound | null = null;

  private constructor() {}

  // ─────────────────────────────────────────────────────────
  // 初始化：注入 Phaser.Scene 引用（每次场景切换后重新注入）
  // ─────────────────────────────────────────────────────────
  init(scene: Phaser.Scene): void {
    this._scene = scene;
    console.log('[AudioManager] ✅ 初始化完成（静音模式：无音频资源时安全运行）');
  }

  // ─────────────────────────────────────────────────────────
  // SFX — 播放音效
  // ─────────────────────────────────────────────────────────
  playSfx(key: SfxKey | string, config?: SfxConfig): void {
    if (!this._scene) {
      // 未初始化场景时静默忽略（不打印 warn，避免污染日志）
      return;
    }
    if (this._muted) return;
    if (!this._hasAudio(key)) {
      // 资源未加载 → 静默忽略（控制台仅 debug 级别，不影响游戏逻辑）
      console.debug(`[AudioManager] SFX key "${key}" 未加载，跳过（占位调用）`);
      return;
    }
    try {
      this._scene.sound.play(key, {
        volume: (config?.volume ?? 1) * this._volume,
        loop  : config?.loop ?? false,
      });
    } catch (e) {
      // 播放失败不崩溃
      console.warn(`[AudioManager] playSfx "${key}" 异常:`, e);
    }
  }

  // ─────────────────────────────────────────────────────────
  // BGM — 播放背景音乐（自动停止前一首）
  // ─────────────────────────────────────────────────────────
  playBgm(key: BgmKey | string): void {
    if (!this._scene) return;
    if (this._bgmKey === key) return;  // 同一首不重复播放
    this.stopBgm();                    // 停止当前 BGM

    if (this._muted) {
      this._bgmKey = key as BgmKey;
      return;
    }

    if (!this._hasAudio(key)) {
      console.debug(`[AudioManager] BGM key "${key}" 未加载，跳过（占位调用）`);
      this._bgmKey = key as BgmKey;
      return;
    }

    try {
      this._bgmSound = this._scene.sound.add(key, {
        volume: this._volume * 0.6,  // BGM 音量通常比 SFX 低
        loop  : true,
      });
      this._bgmSound.play();
      this._bgmKey = key as BgmKey;
      console.log(`[AudioManager] 🎵 BGM 开始播放: ${key}`);
    } catch (e) {
      console.warn(`[AudioManager] playBgm "${key}" 异常:`, e);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 停止 BGM
  // ─────────────────────────────────────────────────────────
  stopBgm(): void {
    if (this._bgmSound) {
      try {
        this._bgmSound.stop();
        this._bgmSound.destroy();
      } catch (e) {
        console.warn('[AudioManager] stopBgm 异常:', e);
      }
      this._bgmSound = null;
    }
    this._bgmKey = null;
  }

  // ─────────────────────────────────────────────────────────
  // 主音量控制（0-1）
  // ─────────────────────────────────────────────────────────
  setMasterVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    // 实时更新正在播放的 BGM 音量
    if (this._bgmSound && 'setVolume' in this._bgmSound) {
      try {
        (this._bgmSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound)
          .setVolume(this._volume * 0.6);
      } catch (_) { /* 静默忽略 */ }
    }
    if (this._scene?.sound) {
      this._scene.sound.volume = this._volume;
    }
    console.log(`[AudioManager] 音量设置为 ${(this._volume * 100).toFixed(0)}%`);
  }

  // ─────────────────────────────────────────────────────────
  // 静音切换
  // ─────────────────────────────────────────────────────────
  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this._scene?.sound) {
      this._scene.sound.mute = this._muted;
    }
    console.log(`[AudioManager] ${this._muted ? '🔇 静音' : '🔊 恢复'}`);
    return this._muted;
  }

  // ── 只读状态 ──────────────────────────────────────────────
  get isMuted()   : boolean { return this._muted;   }
  get volume()    : number  { return this._volume;   }
  get currentBgm(): string | null { return this._bgmKey; }

  // ─────────────────────────────────────────────────────────
  // 内部：检查音频 key 是否已加载（安全检查，不抛异常）
  // ─────────────────────────────────────────────────────────
  private _hasAudio(key: string): boolean {
    if (!this._scene) return false;
    try {
      return this._scene.cache.audio.has(key);
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // 销毁（场景销毁时调用，保留单例本身）
  // ─────────────────────────────────────────────────────────
  destroy(): void {
    this.stopBgm();
    this._scene = null;
  }
}
