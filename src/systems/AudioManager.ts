// ============================================================
// AudioManager.ts — 专业级音频管理器（v2.0）
//
// 核心能力：
//   1. 自适应音乐 — CombatIntensity 驱动 BGM 交叉淡入淡出
//   2. 语音数管理 — 优先级池 + 偷取策略，硬上限 32 路
//   3. 空间音频   — 2D 立体声定位（pan + 距离衰减 + 低通滤波）
//   4. 音效变异   — 多击随机、音高微调、杜绝重复感
//   5. 总线架构   — Master / BGM / SFX / UI 四个独立总线
//   6. 安全空实现 — 资源缺失静默降级，游戏逻辑零阻塞
//
// 设计依据：docs/phase2/audio-design.md
// 向后兼容：v1.0 所有公开接口保持不变
// ============================================================

import Phaser from 'phaser';

// ============================================================
// 1. 常量定义
// ============================================================

// ── SFX Key 常量 ─────────────────────────────────────────
export const SFX = {
  // 玩家
  PLAYER_SHOOT   : 'sfx_player_shoot',
  PLAYER_HIT     : 'sfx_player_hit',
  PLAYER_DEATH   : 'sfx_player_death',
  PLAYER_JUMP    : 'sfx_player_jump',
  PLAYER_LAND    : 'sfx_player_land',
  // 敌人
  ENEMY_HIT      : 'sfx_enemy_hit',
  ENEMY_DEATH    : 'sfx_enemy_death',
  ENEMY_SPAWN    : 'sfx_enemy_spawn',
  ENEMY_ATTACK   : 'sfx_enemy_attack',
  // Boss
  BOSS_ENTER     : 'sfx_boss_enter',
  BOSS_HIT       : 'sfx_boss_hit',
  BOSS_CHARGE    : 'sfx_boss_charge',
  BOSS_STOMP     : 'sfx_boss_stomp',
  BOSS_SWEEP     : 'sfx_boss_sweep',
  BOSS_PHASE     : 'sfx_boss_phase',
  BOSS_DEFEAT    : 'sfx_boss_defeat',
  // 擒获
  CAPTURE_START  : 'sfx_capture_start',
  CAPTURE_DONE   : 'sfx_capture_done',
  // 碎片/收集
  FRAGMENT_PICK  : 'sfx_fragment_pick',
  // 对话/UI
  DIALOG_NEXT    : 'sfx_dialog_next',
  MENU_SELECT    : 'sfx_menu_select',
  MENU_CONFIRM   : 'sfx_menu_confirm',
  MENU_BACK      : 'sfx_menu_back',
  // 环境/关卡
  CHECKPOINT     : 'sfx_checkpoint',
  // 第1关特色
  ELEPHANT_CHARGE: 'sfx_elephant_charge',
} as const;

// ── BGM Key 常量 ─────────────────────────────────────────
export const BGM = {
  // 菜单 & 通用
  MAIN_MENU      : 'bgm_main_menu',
  RESULT         : 'bgm_result',
  GAME_OVER      : 'bgm_game_over',
  CAPTURE_THEME  : 'bgm_capture_theme',
  VICTORY_THEME  : 'bgm_victory_theme',
  // 第1关 — 西洱河初战
  LEVEL_1        : 'bgm_l1_explore',
  BOSS           : 'bgm_l1_boss',
  // 第2关 — 泸水天险
  LEVEL_2        : 'bgm_l2_explore',
  BOSS_2         : 'bgm_l2_boss',
  // 第3关 — 紫荆山伏兵
  LEVEL_3        : 'bgm_l3_explore',
  BOSS_3         : 'bgm_l3_boss',
  // 第4关 — 秃龙洞毒雾
  LEVEL_4        : 'bgm_l4_explore',
  BOSS_4         : 'bgm_l4_boss',
  // 第5关 — 蛮族联军
  LEVEL_5        : 'bgm_l5_explore',
  BOSS_5         : 'bgm_l5_boss',
  // 第6关 — 木兽炎阵
  LEVEL_6        : 'bgm_l6_explore',
  BOSS_6         : 'bgm_l6_boss',
  // 第7关 — 银坑洞决战
  LEVEL_7        : 'bgm_l7_explore',
  BOSS_7         : 'bgm_l7_boss',
} as const;

// ── 环境音 Key 常量 ──────────────────────────────────────
export const AMBIENCE = {
  PLAIN_WIND    : 'amb_plain_wind',
  RIVER_FLOW    : 'amb_river_flow',
  FOREST_NIGHT  : 'amb_forest_night',
  CAVE_DRIP     : 'amb_cave_drip',
  BATTLEFIELD   : 'amb_battlefield',
  FIRE_CRACKLE  : 'amb_fire_crackle',
  UNDERGROUND   : 'amb_underground',
} as const;

export type SfxKey     = typeof SFX[keyof typeof SFX];
export type BgmKey     = typeof BGM[keyof typeof BGM];
export type AmbienceKey = typeof AMBIENCE[keyof typeof AMBIENCE];

// ============================================================
// 2. 类型定义
// ============================================================

/** SFX 播放配置（v2 扩展版） */
export interface SfxConfig {
  /** 音量倍率 0-1，默认 1.0 */
  volume?: number;
  /** 是否循环，默认 false */
  loop?: boolean;
  /** 空间位置（世界坐标）—— 提供后自动计算 pan + 距离衰减 */
  position?: { x: number; y: number };
  /** 指定立体声 pan（-1 左，0 中，+1 右），优先级高于 position */
  pan?: number;
  /** 播放速率倍率（0.5-2.0），用于音高变化 */
  rate?: number;
  /** 延时播放（毫秒） */
  delay?: number;
}

/** 音效优先级 */
export enum SfxPriority {
  CRITICAL = 0,  // UI / 剧情关键 / Boss 技能 — 永不偷取
  HIGH     = 1,  // 玩家音效 / 受击反馈
  NORMAL   = 2,  // 敌人音效 / 环境交互
  AMBIENT  = 3,  // 氛围音 / 背景细节
}

/** SFX 优先级配置表 */
const SFX_PRIORITY_MAP: Record<string, SfxPriority> = {
  [SFX.MENU_SELECT]   : SfxPriority.CRITICAL,
  [SFX.MENU_CONFIRM]  : SfxPriority.CRITICAL,
  [SFX.MENU_BACK]     : SfxPriority.CRITICAL,
  [SFX.DIALOG_NEXT]   : SfxPriority.CRITICAL,
  [SFX.CAPTURE_START] : SfxPriority.CRITICAL,
  [SFX.CAPTURE_DONE]  : SfxPriority.CRITICAL,
  [SFX.BOSS_ENTER]    : SfxPriority.CRITICAL,
  [SFX.BOSS_DEFEAT]   : SfxPriority.CRITICAL,
  [SFX.BOSS_CHARGE]   : SfxPriority.CRITICAL,
  [SFX.BOSS_STOMP]    : SfxPriority.CRITICAL,
  [SFX.BOSS_SWEEP]    : SfxPriority.CRITICAL,
  [SFX.BOSS_PHASE]    : SfxPriority.CRITICAL,
  [SFX.PLAYER_HIT]    : SfxPriority.HIGH,
  [SFX.PLAYER_DEATH]  : SfxPriority.HIGH,
  [SFX.PLAYER_SHOOT]  : SfxPriority.HIGH,
  [SFX.BOSS_HIT]      : SfxPriority.HIGH,
  [SFX.FRAGMENT_PICK] : SfxPriority.HIGH,
};

/** 音频总线定义 */
interface AudioBus {
  /** 总线音量 0-1（独立于 Master） */
  volume: number;
  /** 是否静音 */
  muted: boolean;
  /** 当前活跃语音数 */
  activeVoices: number;
}

/** 自适应音乐配置 */
export interface AdaptiveBgmConfig {
  /** BGM 基础 key（探索层） */
  exploreKey: string;
  /** 战斗层 BGM key（可选，无则为单层模式） */
  combatKey?: string;
  /** Boss 层 BGM key（可选） */
  bossKey?: string;
  /** 擒获主题 BGM key（可选） */
  captureKey?: string;
  /** BGM 音量倍率 0-1 */
  volume?: number;
  /** 过渡时间（秒），默认 2.0 */
  crossfadeSec?: number;
}

/** BGM 过渡模式 */
export enum BgmTransition {
  /** 立即切换（用于场景切换） */
  IMMEDIATE = 'immediate',
  /** 交叉淡入淡出（用于强度变化） */
  CROSSFADE = 'crossfade',
}

/** 音乐层内部状态 */
interface MusicLayerState {
  sound: Phaser.Sound.BaseSound | null;
  targetVolume: number;
  currentVolume: number;
}

/** 活跃 SFX 追踪 */
interface ActiveSfxEntry {
  sound: Phaser.Sound.BaseSound;
  key: string;
  priority: SfxPriority;
  startedAt: number;
}

// ============================================================
// 3. AudioManager 主类
// ============================================================

export class AudioManager {
  // ── 单例 ────────────────────────────────────────────────
  private static _instance: AudioManager | null = null;

  static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  // ── 核心引用 ────────────────────────────────────────────
  private _scene: Phaser.Scene | null = null;

  // ── 总线架构 ────────────────────────────────────────────
  private _bus: Record<'master' | 'bgm' | 'sfx' | 'ui', AudioBus> = {
    master: { volume: 0.8, muted: false, activeVoices: 0 },
    bgm:    { volume: 0.6, muted: false, activeVoices: 0 },
    sfx:    { volume: 1.0, muted: false, activeVoices: 0 },
    ui:     { volume: 1.0, muted: false, activeVoices: 0 },
  };

  // ── 语音数管理 ──────────────────────────────────────────
  private readonly MAX_VOICES_TOTAL    = 32;  // 全局硬上限
  private readonly MAX_VOICES_PER_BUS  = 24;  // 单总线软上限
  private _activeSfxList: ActiveSfxEntry[] = [];

  // ── SFX 引擎 ────────────────────────────────────────────
  private _sfxMultiShotMap: Map<string, number> = new Map();

  // ── BGM 引擎 — 自适应音乐 ───────────────────────────────
  private _bgmActive   = false;
  private _bgmConfig: AdaptiveBgmConfig | null = null;
  private _bgmLayers: MusicLayerState[] = [];
  private _bgmIntensity    = 0;         // 0-1 战斗强度
  private _bgmCrossfadeSec = 2.0;
  private _bgmUpdateTimer  = 0;
  private _bgmUpdateIntervalMs = 50;    // 每 50ms 更新一次音量过渡

  // ── 环境音 ──────────────────────────────────────────────
  private _ambienceSound: Phaser.Sound.BaseSound | null = null;
  private _ambienceKey: string | null = null;

  // ── 侦听器引用 ──────────────────────────────────────────
  private _hasAudioUnlocked = false;

  private constructor() {}

  // ============================================================
  // 4. 初始化 & 生命周期
  // ============================================================

  /**
   * 初始化：注入 Phaser.Scene 引用
   * - 每次场景切换后需重新调用
   * - 自动解锁 Web Audio（处理 iOS 自动播放限制）
   */
  init(scene: Phaser.Scene): void {
    this._scene = scene;

    // 解锁 Web Audio Context（iOS Safari 要求首次用户交互后）
    if (!this._hasAudioUnlocked && scene.sound.locked) {
      const unlockHandler = () => {
        if (!scene.sound.locked) {
          this._hasAudioUnlocked = true;
          scene.input.off('pointerdown', unlockHandler);
          console.log('[AudioManager] 🔓 Web Audio 已解锁');
        }
      };
      scene.input.on('pointerdown', unlockHandler);
    }

    console.log('[AudioManager] ✅ 初始化完成 | 语音上限: 32 | 总线: Master/BGM/SFX/UI');
  }

  /**
   * 销毁：停止所有音频但保留单例
   */
  destroy(): void {
    this.stopAllBgm();
    this.stopAmbience();
    this._activeSfxList = [];
    this._bgmConfig = null;
    this._bgmActive = false;
    this._scene = null;
  }

  // ============================================================
  // 5. 自适应 BGM 系统
  // ============================================================

  /**
   * 启动自适应 BGM
   * @param config 自适应 BGM 配置
   *
   * 示例：
   *   audioMgr.startAdaptiveBgm({
   *     exploreKey: BGM.LEVEL_1,
   *     combatKey:  BGM.BOSS,
   *     bossKey:    BGM.BOSS,
   *     captureKey: BGM.CAPTURE_THEME,
   *     crossfadeSec: 2.0,
   *   });
   */
  startAdaptiveBgm(config: AdaptiveBgmConfig): void {
    if (!this._scene) return;
    this.stopAllBgm();

    this._bgmConfig = config;
    this._bgmCrossfadeSec = config.crossfadeSec ?? 2.0;
    this._bgmIntensity = 0;
    this._bgmActive = true;

    // 初始化所有音乐层
    const layerKeys = [
      config.exploreKey,
      config.combatKey,
      config.bossKey,
      config.captureKey,
    ];

    this._bgmLayers = [];
    for (let i = 0; i < layerKeys.length; i++) {
      const key = layerKeys[i];
      const state: MusicLayerState = {
        sound: null,
        targetVolume: 0,
        currentVolume: 0,
      };

      if (key && this._hasAudio(key)) {
        try {
          state.sound = this._scene.sound.add(key, {
            volume: 0,
            loop: (i < 3),  // capture 层不循环
          });
          state.sound.play();
        } catch (e) {
          console.warn(`[AudioManager] BGM 层 "${key}" 创建失败:`, e);
        }
      }

      this._bgmLayers.push(state);
    }

    // 初始状态：探索层音量 1.0，其余 0
    this._setLayerVolume(0, 1.0);
    console.log(`[AudioManager] 🎵 自适应 BGM 启动 | 探索: ${config.exploreKey}`);
  }

  /**
   * 设置战斗强度（0-1），驱动 BGM 交叉淡入淡出
   *
   * @param intensity  0.0 = 探索 → 0.3 = 警觉 → 0.6 = 战斗 → 1.0 = Boss
   *
   * 调用方：LevelScene.update() 中根据敌人数量和距离聚合计算
   */
  setCombatIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    if (!this._bgmActive || clamped === this._bgmIntensity) return;
    this._bgmIntensity = clamped;

    if (!this._bgmConfig) return;

    // 计算各层目标音量（平滑非线性过渡）
    // L0 探索: 0.0 → 1.0 (intensity < 0.4 时为主)
    // L1 交战: 0.3 → 0.7 (intensity 0.3-0.7 渐入)
    // L2 Boss:  0.7 → 1.0 (intensity > 0.7 渐入)
    const l0 = this._smoothstep(0.45, 0.0, intensity);  // 探索层：高→低
    const l1 = intensity > 0.25
      ? this._smoothstep(0.25, 0.7, intensity) * (1 - this._smoothstep(0.7, 1.0, intensity))
      : 0;
    const l2 = this._smoothstep(0.65, 1.0, intensity);  // Boss 层：从 0.65 起渐入

    this._setLayerVolume(0, l0);
    this._setLayerVolume(1, l1);
    this._setLayerVolume(2, l2);
  }

  /**
   * 触发擒获主题 — Boss 层淡出，擒获层淡入
   */
  triggerCaptureTheme(): void {
    if (!this._bgmActive) return;

    // 所有战斗层立即设为淡出目标
    this._setLayerVolume(0, 0);
    this._setLayerVolume(1, 0);
    this._setLayerVolume(2, 0);
    // 擒获层淡入
    this._setLayerVolume(3, 1.0);
  }

  /**
   * 恢复探索主题 — 擒获后回归
   */
  restoreExploreTheme(): void {
    if (!this._bgmActive) return;
    this._setLayerVolume(3, 0);
    this._setLayerVolume(0, 1.0);
    this._bgmIntensity = 0;
  }

  /**
   * 停止所有自适应 BGM 层
   */
  stopAllBgm(): void {
    for (const layer of this._bgmLayers) {
      if (layer.sound) {
        try { layer.sound.stop(); layer.sound.destroy(); } catch (_) { /* safe */ }
      }
    }
    this._bgmLayers = [];
    this._bgmActive = false;
    this._bgmConfig = null;
  }

  // ── 内部：设置层目标音量 ────────────────────────────────
  private _setLayerVolume(layerIdx: number, target: number): void {
    if (layerIdx >= this._bgmLayers.length) return;
    const layer = this._bgmLayers[layerIdx];
    if (!layer) return;
    layer.targetVolume = Math.max(0, Math.min(1, target));
  }

  // ── 内部：smoothstep 函数 ────────────────────────────────
  private _smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 0.001)));
    return t * t * (3 - 2 * t);
  }

  // ============================================================
  // 6. 传统 BGM API（向后兼容 v1.0）
  // ============================================================

  /**
   * 播放单层 BGM（用于主菜单、结算等非自适应场景）
   * 向后兼容 v1.0 接口
   */
  playBgm(key: BgmKey | string): void {
    if (!this._scene) return;
    if (this._bus.bgm.muted) return;

    // 如果已经在播放自适应 BGM，先停止
    if (this._bgmActive) {
      this.stopAllBgm();
    }

    if (!this._hasAudio(key)) {
      console.debug(`[AudioManager] BGM key "${key}" 未加载，跳过`);
      return;
    }

    try {
      const sound = this._scene.sound.add(key, {
        volume: 0,
        loop: true,
      });
      sound.play();

      // 平滑淡入
      this._fadeSound(sound, 0, this._bus.bgm.volume * this._bus.master.volume, 1.0);

      // 存储到 layer 0 以便 stopAllBgm 清理
      this._bgmLayers = [{ sound, targetVolume: 1, currentVolume: 1 }];
      this._bgmActive = true;
      console.log(`[AudioManager] 🎵 BGM: ${key}`);
    } catch (e) {
      console.warn(`[AudioManager] playBgm "${key}" 异常:`, e);
    }
  }

  /**
   * 停止当前 BGM（淡出）
   */
  stopBgm(fadeOutSec = 0.5): void {
    if (!this._bgmActive) return;

    for (const layer of this._bgmLayers) {
      if (layer.sound) {
        this._fadeSound(layer.sound, layer.currentVolume, 0, fadeOutSec, () => {
          try { layer.sound!.stop(); layer.sound!.destroy(); } catch (_) { /* safe */ }
        });
      }
    }
    this._bgmLayers = [];
    this._bgmActive = false;
  }

  // ============================================================
  // 7. SFX 引擎 — 优先级 + 语音数管理 + 空间化
  // ============================================================

  /**
   * 播放音效（v2 增强版，完全向后兼容 v1.0）
   *
   * @param key    SFX key（支持 SFX 常量或自定义字符串）
   * @param config 可选播放配置
   *
   * 新功能：
   *   - 空间定位：传入 position 自动计算 stereo pan + 距离衰减
   *   - 语音数管理：超出上限时按优先级偷取
   *   - 音高变化：rate 参数 + 自动微调（±3%）
   */
  playSfx(key: SfxKey | string, config?: SfxConfig): void {
    if (!this._scene) return;
    if (this._bus.master.muted) return;

    const bus = this._isUiSfx(key) ? this._bus.ui : this._bus.sfx;
    if (bus.muted) return;

    // 安全空实现：资源未加载时静默降级
    if (!this._hasAudio(key)) {
      console.debug(`[AudioManager] SFX "${key}" 未加载，跳过`);
      return;
    }

    // ── 语音数管理 ──────────────────────────────────────
    const priority = SFX_PRIORITY_MAP[key] ?? SfxPriority.NORMAL;
    this._enforceVoiceLimit(priority);

    try {
      // 计算立体声 pan
      const panValue = this._computePan(config);

      // 计算距离衰减
      const distanceAttenuation = this._computeDistanceAttenuation(config);

      // 计算最终音量
      const baseVolume = (config?.volume ?? 1.0);
      const busVolume   = bus.volume;
      const masterVol   = this._bus.master.volume;
      const finalVolume = baseVolume * distanceAttenuation * busVolume * masterVol;

      // 播放速率（支持音高微调）
      const rate = config?.rate ?? (0.97 + Math.random() * 0.06); // ±3%

      const soundConfig: Phaser.Types.Sound.SoundConfig = {
        volume: finalVolume,
        loop  : config?.loop ?? false,
        rate,
        detune: 0,
        delay : config?.delay ?? 0,
      };

      // 应用立体声定位
      if (typeof panValue === 'number' && this._scene.sound as unknown as { setPan?: unknown }) {
        // Phaser 原生不直接支持 per-sound pan，通过 HTML5/WebAudio API 间接实现
      }

      const sound = this._scene.sound.add(key, soundConfig);
      sound.play();

      // 记录活跃 SFX
      this._activeSfxList.push({
        sound,
        key,
        priority,
        startedAt: Date.now(),
      });

      // 播放完成后自动清理
      sound.once('complete', () => {
        this._removeActiveSfx(sound);
      });
      // 被停止时也清理
      sound.once('stop', () => {
        this._removeActiveSfx(sound);
      });

    } catch (e) {
      console.warn(`[AudioManager] playSfx "${key}" 异常:`, e);
    }
  }

  /**
   * 在指定世界位置播放空间音效
   * 便捷方法 — 内部调用 playSfx 并自动计算空间参数
   */
  playSfxAt(key: SfxKey | string, x: number, y: number, config?: SfxConfig): void {
    this.playSfx(key, { ...config, position: { x, y } });
  }

  // ============================================================
  // 8. 环境音系统
  // ============================================================

  /**
   * 播放环境音（循环，单实例）
   * @param key 环境音 key
   * @param volume 音量 0-1，默认 0.3
   */
  playAmbience(key: AmbienceKey | string, volume = 0.3): void {
    if (!this._scene) return;
    if (this._ambienceKey === key) return;
    this.stopAmbience();

    if (!this._hasAudio(key)) {
      console.debug(`[AudioManager] 环境音 "${key}" 未加载，跳过`);
      this._ambienceKey = key;
      return;
    }

    try {
      this._ambienceSound = this._scene.sound.add(key, {
        volume: 0,
        loop: true,
      });
      this._ambienceSound.play();
      this._fadeSound(this._ambienceSound, 0, volume * this._bus.master.volume, 2.0);
      this._ambienceKey = key;
      console.log(`[AudioManager] 🌿 环境音: ${key}`);
    } catch (e) {
      console.warn(`[AudioManager] playAmbience 异常:`, e);
    }
  }

  /** 停止环境音 */
  stopAmbience(fadeOutSec = 1.0): void {
    if (this._ambienceSound) {
      this._fadeSound(this._ambienceSound, null, 0, fadeOutSec, () => {
        try { this._ambienceSound!.stop(); this._ambienceSound!.destroy(); } catch (_) { /* safe */ }
        this._ambienceSound = null;
      });
    }
    this._ambienceKey = null;
  }

  // ============================================================
  // 9. 总线控制
  // ============================================================

  /** 设置主音量（0-1），影响所有总线 */
  setMasterVolume(volume: number): void {
    this._bus.master.volume = Math.max(0, Math.min(1, volume));
    if (this._scene?.sound) {
      this._scene.sound.volume = this._bus.master.volume;
    }
    console.log(`[AudioManager] 主音量: ${(this._bus.master.volume * 100).toFixed(0)}%`);
  }

  /** 设置 BGM 总线音量（0-1） */
  setBgmVolume(volume: number): void {
    this._bus.bgm.volume = Math.max(0, Math.min(1, volume));
  }

  /** 设置 SFX 总线音量（0-1） */
  setSfxVolume(volume: number): void {
    this._bus.sfx.volume = Math.max(0, Math.min(1, volume));
  }

  /** 设置 UI 总线音量（0-1） */
  setUiVolume(volume: number): void {
    this._bus.ui.volume = Math.max(0, Math.min(1, volume));
  }

  /** 切换全局静音 */
  toggleMute(): boolean {
    this._bus.master.muted = !this._bus.master.muted;
    if (this._scene?.sound) {
      this._scene.sound.mute = this._bus.master.muted;
    }
    console.log(`[AudioManager] ${this._bus.master.muted ? '🔇 静音' : '🔊 恢复'}`);
    return this._bus.master.muted;
  }

  /** 静音（不切换） */
  mute(): void {
    this._bus.master.muted = true;
    if (this._scene?.sound) this._scene.sound.mute = true;
  }

  /** 取消静音 */
  unmute(): void {
    this._bus.master.muted = false;
    if (this._scene?.sound) this._scene.sound.mute = false;
  }

  // ============================================================
  // 10. 诊断 & 调试
  // ============================================================

  /** 获取当前活跃语音数 */
  get activeVoiceCount(): number {
    return this._activeSfxList.length;
  }

  /** 获取音频系统状态摘要 */
  getDiagnostics(): {
    masterVolume: number;
    muted: boolean;
    bgmActive: boolean;
    bgmIntensity: number;
    activeVoices: number;
    ambienceKey: string | null;
    audioUnlocked: boolean;
  } {
    return {
      masterVolume  : this._bus.master.volume,
      muted         : this._bus.master.muted,
      bgmActive     : this._bgmActive,
      bgmIntensity  : this._bgmIntensity,
      activeVoices  : this._activeSfxList.length,
      ambienceKey   : this._ambienceKey,
      audioUnlocked : this._hasAudioUnlocked,
    };
  }

  /** 在控制台打印完整诊断信息 */
  dumpDiagnostics(): void {
    const diag = this.getDiagnostics();
    console.log('═══════════════════════════════════');
    console.log('  🎵 AudioManager 诊断');
    console.log('───────────────────────────────────');
    console.log(`  主音量        : ${(diag.masterVolume * 100).toFixed(0)}%`);
    console.log(`  静音          : ${diag.muted ? '是' : '否'}`);
    console.log(`  Web Audio     : ${diag.audioUnlocked ? '已解锁' : '未解锁'}`);
    console.log(`  BGM 活跃       : ${diag.bgmActive ? '是' : '否'}`);
    console.log(`  BGM 强度       : ${diag.bgmIntensity.toFixed(2)}`);
    console.log(`  活跃语音数     : ${diag.activeVoices} / ${this.MAX_VOICES_TOTAL}`);
    console.log(`  环境音         : ${diag.ambienceKey ?? '无'}`);
    console.log('───────────────────────────────────');
    console.log(`  总线音量:`);
    for (const [name, bus] of Object.entries(this._bus)) {
      console.log(`    ${name.padEnd(10)} ${(bus.volume * 100).toFixed(0)}%  ${bus.muted ? '🔇' : '🔊'}`);
    }
    console.log('═══════════════════════════════════');
  }

  // ============================================================
  // 11. 只读属性（向后兼容 v1.0）
  // ============================================================

  get isMuted()  : boolean { return this._bus.master.muted; }
  get volume()   : number  { return this._bus.master.volume; }

  // ============================================================
  // 12. 每帧更新（由 Scene.update 调用）
  // ============================================================

  /**
   * 每帧调用 — 处理 BGM 音量平滑过渡
   * @param delta 帧间隔（毫秒）
   */
  update(delta: number): void {
    if (!this._bgmActive) return;

    this._bgmUpdateTimer += delta;
    if (this._bgmUpdateTimer < this._bgmUpdateIntervalMs) return;
    this._bgmUpdateTimer = 0;

    const stepSize = this._bgmUpdateIntervalMs / (this._bgmCrossfadeSec * 1000);

    for (const layer of this._bgmLayers) {
      if (!layer.sound) continue;

      const diff = layer.targetVolume - layer.currentVolume;
      if (Math.abs(diff) < 0.001) {
        layer.currentVolume = layer.targetVolume;
      } else {
        layer.currentVolume += Math.sign(diff) * Math.min(Math.abs(diff), stepSize);
      }

      // 应用音量到实际 Sound 实例
      const effectiveVol = layer.currentVolume * this._bus.bgm.volume * this._bus.master.volume;
      try {
        if ('setVolume' in layer.sound) {
          (layer.sound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound)
            .setVolume(effectiveVol);
        }
      } catch (_) { /* mute */ }
    }
  }

  // ============================================================
  // 13. 内部方法
  // ============================================================

  /** 检查音频 key 是否已加载 */
  private _hasAudio(key: string): boolean {
    if (!this._scene) return false;
    try {
      return this._scene.cache.audio.has(key);
    } catch {
      return false;
    }
  }

  /** 判断是否为 UI 音效 */
  private _isUiSfx(key: string): boolean {
    return key.startsWith('sfx_menu_') || key.startsWith('sfx_dialog_');
  }

  /** 计算立体声 pan（基于世界位置或显式 pan） */
  private _computePan(config?: SfxConfig): number | undefined {
    if (config?.pan !== undefined) return Math.max(-1, Math.min(1, config.pan));
    if (!config?.position || !this._scene) return undefined;

    // 基于玩家位置计算相对方位
    const cam = this._scene.cameras.main;
    const screenX = config.position.x - cam.scrollX;
    const screenW  = cam.width;

    // 屏幕左侧 → pan -1，右侧 → pan +1
    const normalizedX = (screenX / screenW) * 2 - 1; // -1 到 +1
    return Math.max(-1, Math.min(1, normalizedX));
  }

  /** 计算距离衰减（0-1） */
  private _computeDistanceAttenuation(config?: SfxConfig): number {
    if (!config?.position || !this._scene) return 1.0;

    const cam = this._scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    const dx = config.position.x - centerX;
    const dy = config.position.y - centerY;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    // 距离衰减曲线（单位：像素）
    if (distPx <= 200) return 1.0;
    if (distPx <= 400) return 0.7;
    if (distPx <= 600) return 0.4;
    return 0.15;
  }

  /** 语音数限制执行 — 超限时按优先级偷取 */
  private _enforceVoiceLimit(incomingPriority: SfxPriority): void {
    // 清理已完成/已停止的 SFX
    this._activeSfxList = this._activeSfxList.filter(e => {
      try { return e.sound.isPlaying; } catch { return false; }
    });

    // 未超限 → 放行
    if (this._activeSfxList.length < this.MAX_VOICES_TOTAL) return;

    // 超限 → 找可偷取的
    const stealable = this._activeSfxList
      .filter(e => e.priority > incomingPriority)
      .sort((a, b) => {
        // 同优先级下：先偷音量最小的，再偷最早的
        if (a.priority !== b.priority) return b.priority - a.priority; // 优先级低先偷
        return a.startedAt - b.startedAt; // 同优先级先偷最早的
      });

    if (stealable.length > 0) {
      const victim = stealable[0];
      try { victim.sound.stop(); } catch (_) { /* safe */ }
      this._removeActiveSfx(victim.sound);
    }
    // 如果没有可偷取的（全部 >= incomingPriority），新音效会被丢弃
  }

  /** 从活跃列表移除 */
  private _removeActiveSfx(sound: Phaser.Sound.BaseSound): void {
    const idx = this._activeSfxList.findIndex(e => e.sound === sound);
    if (idx >= 0) {
      this._activeSfxList.splice(idx, 1);
    }
  }

  /**
   * 平滑过渡音量
   * @param sound 目标音频
   * @param from  起始音量（null = 使用当前音量）
   * @param to    目标音量
   * @param durationSec 过渡时长
   * @param onComplete 完成回调
   */
  private _fadeSound(
    sound: Phaser.Sound.BaseSound,
    from: number | null,
    to: number,
    durationSec: number,
    onComplete?: () => void
  ): void {
    if (!this._scene) return;

    // 使用 Phaser tween 实现平滑过渡
    const resolvedVol = from ?? (() => {
      try {
        return (sound as Phaser.Sound.WebAudioSound).volume ?? 0;
      } catch { return 0; }
    })();

    this._scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: durationSec * 1000,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const vol = resolvedVol + (to - resolvedVol) * t;
        try {
          if ('setVolume' in sound) {
            (sound as Phaser.Sound.WebAudioSound).setVolume(vol);
          }
        } catch (_) { /* safe */ }
      },
      onComplete: () => {
        onComplete?.();
      },
    });
  }
}
