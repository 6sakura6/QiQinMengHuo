// ============================================================
// ProceduralAudio.ts — 程序化音频合成引擎（v1.0）
//
// 使用 Web Audio API 实时合成所有游戏音效和 BGM。
// 零外部音频文件，零加载时间，零网络请求。
//
// 核心策略：
//   - SFX：短促合成（0.05-1.5s），OscillatorNode + GainNode + Filter
//   - BGM：节奏循环（4-8s），pentatonic 音阶 + 打击节奏
//   - 环境音：噪声过滤层（2-4s 循环）
//   - 生成后注册到 Phaser 音频缓存，AudioManager 可无缝使用
//
// 使用方式：
//   const procAudio = new ProceduralAudio();
//   await procAudio.generateAll(scene);  // 在 BootScene 中调用
// ============================================================

import Phaser from 'phaser';
import { SFX, BGM, AMBIENCE } from './AudioManager';

// ============================================================
// 类型定义
// ============================================================

type AudioKey = string;

// ============================================================
// 音效配置接口
// ============================================================

interface SfxTemplate {
  /** 持续时间（秒） */
  duration: number;
  /** 采样率 */
  sampleRate: number;
  /** 生成器函数 */
  generator: (ctx: OfflineAudioContext) => AudioNode;
}

// ============================================================
// 音频工具函数
// ============================================================

/** 创建线性 ramp（volume envelope） */
function linearRamp(
  param: AudioParam,
  startTime: number,
  endTime: number,
  startValue: number,
  endValue: number
): void {
  param.setValueAtTime(startValue, startTime);
  param.linearRampToValueAtTime(endValue, endTime);
}

/** 创建指数 ramp（更适合音量衰减） */
function expRamp(
  param: AudioParam,
  startTime: number,
  endTime: number,
  startValue: number,
  endValue: number
): void {
  const safeStart = Math.max(startValue, 0.0001);
  param.setValueAtTime(safeStart, startTime);
  param.exponentialRampToValueAtTime(Math.max(endValue, 0.0001), endTime);
}

/** 创建噪声缓冲区 */
function createNoiseBuffer(ctx: BaseAudioContext, duration: number, sampleRate?: number): AudioBuffer {
  const sr = sampleRate ?? ctx.sampleRate;
  const length = Math.floor(sr * duration);
  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ============================================================
// ProceduralAudio 主类
// ============================================================

export class ProceduralAudio {
  private _ctx: AudioContext | null = null;
  private _generated = false;

  /** 获取或创建 AudioContext */
  private getCtx(): AudioContext {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  // ============================================================
  // 公共入口：生成所有音频并注册到 Phaser
  // ============================================================

  /**
   * 生成所有游戏音频并注册到 Phaser 音频缓存。
   * 应在 BootScene 或 MainMenuScene 中调用一次。
   *
   * @param scene Phaser 场景（用于访问音频缓存）
   * @param keys  要生成的音频 key 列表，默认生成全部
   */
  async generateAll(
    scene: Phaser.Scene,
    keys?: AudioKey[]
  ): Promise<{ generated: string[]; skipped: string[] }> {
    if (this._generated && !keys) {
      console.log('[ProceduralAudio] ⏭️  音频已生成，跳过');
      return { generated: [], skipped: [] };
    }

    const ctx = this.getCtx();
    console.log(`[ProceduralAudio] 🎛️  开始合成 | AudioContext: ${ctx.sampleRate}Hz`);

    const toGenerate = keys ?? this._getAllKeys();
    const generated: string[] = [];
    const skipped: string[] = [];

    // 注册空音频到缓存（让 AudioManager 的 _hasAudio 立即通过）
    // 然后逐个异步合成替换
    for (const key of toGenerate) {
      if (scene.cache.audio.has(key)) {
        skipped.push(key);
        continue;
      }

      try {
        const template = this._getTemplate(key);
        if (!template) {
          skipped.push(key);
          continue;
        }

        const buffer = await this._synthesize(ctx, template);
        scene.cache.audio.add(key, buffer);
        generated.push(key);
      } catch (e) {
        console.warn(`[ProceduralAudio] ❌ "${key}" 合成失败:`, e);
        // 注册静音占位，保证 _hasAudio 返回 true
        const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
        scene.cache.audio.add(key, silent);
        generated.push(key); // 也算"生成"了（静音占位）
      }
    }

    this._generated = true;
    console.log(`[ProceduralAudio] ✅ 合成完成: ${generated.length} 个 (${skipped.length} 个跳过)`);
    return { generated, skipped };
  }

  /**
   * 为单个 key 生成音频（用于延迟加载或热更新）
   */
  async generateOne(scene: Phaser.Scene, key: AudioKey): Promise<boolean> {
    const template = this._getTemplate(key);
    if (!template) {
      console.warn(`[ProceduralAudio] "${key}" 无合成模板`);
      return false;
    }

    try {
      const ctx = this.getCtx();
      const buffer = await this._synthesize(ctx, template);
      scene.cache.audio.add(key, buffer);
      return true;
    } catch (e) {
      console.warn(`[ProceduralAudio] ❌ "${key}" 合成失败:`, e);
      return false;
    }
  }

  /** 销毁 AudioContext（释放资源） */
  destroy(): void {
    if (this._ctx && this._ctx.state !== 'closed') {
      this._ctx.close();
    }
    this._ctx = null;
    this._generated = false;
  }

  // ============================================================
  // 内部：音频合成核心
  // ============================================================

  private async _synthesize(
    ctx: AudioContext,
    template: SfxTemplate
  ): Promise<AudioBuffer> {
    const { duration, sampleRate, generator } = template;
    const sr = sampleRate ?? ctx.sampleRate;
    const offline = new OfflineAudioContext(1, Math.ceil(sr * duration), sr);

    const source = generator(offline);
    source.connect(offline.destination);

    const buffer = await offline.startRendering();
    return buffer;
  }

  // ============================================================
  // 内部：音效合成模板映射
  // ============================================================

  private _getTemplate(key: AudioKey): SfxTemplate | null {
    const templates: Record<string, SfxTemplate> = this._allTemplates();
    return templates[key] ?? null;
  }

  private _getAllKeys(): AudioKey[] {
    return Object.keys(this._allTemplates());
  }

  /** 所有音效合成模板 */
  private _allTemplates(): Record<string, SfxTemplate> {
    // 使用箭头函数避免 this 绑定问题
    const make = (dur: number, gen: (ctx: OfflineAudioContext) => AudioNode, sr?: number): SfxTemplate =>
      ({ duration: dur, sampleRate: sr ?? 44100, generator: gen });

    return {
      // ========================================================
      // 玩家 SFX
      // ========================================================

      // 弩箭射击：高频起始 + 快速衰减 → 锐利有力的射击声
      [SFX.PLAYER_SHOOT]: make(0.15, (ctx) => {
        const now = ctx.currentTime;

        // 冲击层：短脉冲
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.4, now);
        expRamp(gain1.gain, now, now + 0.12, 0.4, 0.001);

        osc1.connect(gain1);

        // 弦响层：金属余音
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.2, now);
        expRamp(gain2.gain, now, now + 0.15, 0.2, 0.001);

        osc2.connect(gain2);

        const merger = ctx.createGain();
        gain1.connect(merger);
        gain2.connect(merger);

        osc1.start(now);
        osc1.stop(now + 0.15);
        osc2.start(now);
        osc2.stop(now + 0.15);

        return merger;
      }),

      // 玩家受击：低沉撞击 + 高频闪烁
      [SFX.PLAYER_HIT]: make(0.2, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        expRamp(gain.gain, now, now + 0.18, 0.5, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 0.2);

        return gain;
      }),

      // 玩家死亡：下降音调 + 低频嗡鸣
      [SFX.PLAYER_DEATH]: make(0.6, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.setValueAtTime(0.6, now + 0.1);
        expRamp(gain.gain, now + 0.1, now + 0.6, 0.6, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 0.6);

        return gain;
      }),

      // 跳跃：快速音高上升
      [SFX.PLAYER_JUMP]: make(0.12, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        expRamp(gain.gain, now, now + 0.12, 0.3, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);

        return gain;
      }),

      // 落地：低沉短促
      [SFX.PLAYER_LAND]: make(0.1, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        expRamp(gain.gain, now, now + 0.1, 0.4, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);

        return gain;
      }),

      // ========================================================
      // 敌人 SFX
      // ========================================================

      // 敌人受击：中频撞击
      [SFX.ENEMY_HIT]: make(0.15, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        expRamp(gain.gain, now, now + 0.15, 0.35, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);

        return gain;
      }),

      // 敌人死亡：下降 + 破碎
      [SFX.ENEMY_DEATH]: make(0.35, (ctx) => {
        const now = ctx.currentTime;

        // 主体：下降音
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + 0.3);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.3, now);
        expRamp(gain1.gain, now, now + 0.35, 0.3, 0.001);

        osc1.connect(gain1);

        // 破碎噪声
        const noiseBuf = createNoiseBuffer(ctx, 0.15);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        expRamp(noiseGain.gain, now + 0.05, now + 0.15, 0.2, 0.001);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        const merger = ctx.createGain();
        gain1.connect(merger);
        noiseGain.connect(merger);

        osc1.start(now);
        osc1.stop(now + 0.35);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.15);

        return merger;
      }),

      // 敌人生成：上升音调
      [SFX.ENEMY_SPAWN]: make(0.25, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
        expRamp(gain.gain, now + 0.15, now + 0.25, 0.25, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);

        return gain;
      }),

      // 敌人攻击：呼啸
      [SFX.ENEMY_ATTACK]: make(0.2, (ctx) => {
        const now = ctx.currentTime;

        const noiseBuf = createNoiseBuffer(ctx, 0.2);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        filter.Q.setValueAtTime(1.5, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        expRamp(gain.gain, now + 0.05, now + 0.2, 0.25, 0.001);

        noiseSrc.connect(filter);
        filter.connect(gain);

        noiseSrc.start(now);
        noiseSrc.stop(now + 0.2);

        return gain;
      }),

      // ========================================================
      // Boss SFX（第1关：孟获骑象）
      // ========================================================

      // Boss 登场：低音轰鸣 + 号角
      [SFX.BOSS_ENTER]: make(1.2, (ctx) => {
        const now = ctx.currentTime;

        // 低频轰鸣
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.setValueAtTime(80, now + 0.6);
        osc1.frequency.linearRampToValueAtTime(60, now + 1.0);

        const filter1 = ctx.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.setValueAtTime(200, now);
        filter1.frequency.linearRampToValueAtTime(100, now + 1.0);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.5, now + 0.3);
        gain1.gain.setValueAtTime(0.5, now + 0.8);
        expRamp(gain1.gain, now + 0.8, now + 1.2, 0.5, 0.001);

        osc1.connect(filter1);
        filter1.connect(gain1);

        // 号角声
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(400, now + 0.2);
        osc2.frequency.setValueAtTime(500, now + 0.4);
        osc2.frequency.setValueAtTime(400, now + 0.6);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2, now + 0.3);
        expRamp(gain2.gain, now + 0.6, now + 1.0, 0.2, 0.001);

        osc2.connect(gain2);

        const merger = ctx.createGain();
        gain1.connect(merger);
        gain2.connect(merger);

        osc1.start(now);
        osc1.stop(now + 1.2);
        osc2.start(now);
        osc2.stop(now + 1.2);

        return merger;
      }),

      // Boss 受击：重击
      [SFX.BOSS_HIT]: make(0.25, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        expRamp(gain.gain, now, now + 0.25, 0.5, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);

        return gain;
      }),

      // Boss 冲撞：渐强呼啸
      [SFX.BOSS_CHARGE]: make(0.5, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.4);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 0.35);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
        expRamp(gain.gain, now + 0.35, now + 0.5, 0.4, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 0.5);

        return gain;
      }),

      // Boss 踏地：深沉撞击
      [SFX.BOSS_STOMP]: make(0.4, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        expRamp(gain.gain, now, now + 0.4, 0.7, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 0.4);

        return gain;
      }),

      // Boss 横扫：快速呼啸
      [SFX.BOSS_SWEEP]: make(0.25, (ctx) => {
        const now = ctx.currentTime;

        const noiseBuf = createNoiseBuffer(ctx, 0.25);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
        filter.Q.setValueAtTime(2, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        expRamp(gain.gain, now + 0.15, now + 0.25, 0.3, 0.001);

        noiseSrc.connect(filter);
        filter.connect(gain);

        noiseSrc.start(now);
        noiseSrc.stop(now + 0.25);

        return gain;
      }),

      // Boss 阶段转换：上升增强
      [SFX.BOSS_PHASE]: make(0.6, (ctx) => {
        const now = ctx.currentTime;

        // 低频脉冲
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(60, now);
        osc1.frequency.setValueAtTime(60, now + 0.3);
        osc1.frequency.linearRampToValueAtTime(120, now + 0.5);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.setValueAtTime(0.4, now + 0.25);
        expRamp(gain1.gain, now + 0.4, now + 0.6, 0.4, 0.001);

        osc1.connect(gain1);

        // 高音过渡
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.linearRampToValueAtTime(800, now + 0.5);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2, now + 0.2);
        expRamp(gain2.gain, now + 0.4, now + 0.6, 0.2, 0.001);

        osc2.connect(gain2);

        const merger = ctx.createGain();
        gain1.connect(merger);
        gain2.connect(merger);

        osc1.start(now);
        osc1.stop(now + 0.6);
        osc2.start(now);
        osc2.stop(now + 0.6);

        return merger;
      }),

      // Boss 击败：长下降 + 戏剧终结
      [SFX.BOSS_DEFEAT]: make(1.0, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(400, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.9);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.15);
        gain.gain.setValueAtTime(0.5, now + 0.5);
        expRamp(gain.gain, now + 0.5, now + 1.0, 0.5, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 1.0);

        return gain;
      }),

      // ========================================================
      // 擒获 SFX
      // ========================================================

      // 擒获开始：戏剧性短促
      [SFX.CAPTURE_START]: make(0.5, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);       // C5
        osc.frequency.setValueAtTime(659, now + 0.1); // E5
        osc.frequency.setValueAtTime(784, now + 0.2); // G5
        osc.frequency.setValueAtTime(1047, now + 0.3);// C6

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.setValueAtTime(0.3, now + 0.35);
        expRamp(gain.gain, now + 0.35, now + 0.5, 0.3, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.5);

        return gain;
      }),

      // 擒获完成：胜利号角
      [SFX.CAPTURE_DONE]: make(0.8, (ctx) => {
        const now = ctx.currentTime;

        // 大和弦：C-E-G
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523, now); // C5

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659, now); // E5

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(784, now); // G5

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
        gain.gain.setValueAtTime(0.35, now + 0.5);
        expRamp(gain.gain, now + 0.5, now + 0.8, 0.35, 0.001);

        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);

        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
        osc3.stop(now + 0.8);

        return gain;
      }),

      // ========================================================
      // 碎片/收集 SFX
      // ========================================================

      // 碎片拾取：清脆闪光
      [SFX.FRAGMENT_PICK]: make(0.3, (ctx) => {
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);  // A5
        osc1.frequency.setValueAtTime(880, now + 0.08);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.3, now);
        expRamp(gain1.gain, now + 0.05, now + 0.2, 0.3, 0.001);

        osc1.connect(gain1);

        // 闪光尾音
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.3);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.1);
        expRamp(gain2.gain, now + 0.15, now + 0.3, 0.15, 0.001);

        osc2.connect(gain2);

        const merger = ctx.createGain();
        gain1.connect(merger);
        gain2.connect(merger);

        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now);
        osc2.stop(now + 0.3);

        return merger;
      }),

      // ========================================================
      // 对话/UI SFX
      // ========================================================

      // 对话下一句：轻柔点击
      [SFX.DIALOG_NEXT]: make(0.05, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.04);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        expRamp(gain.gain, now, now + 0.05, 0.2, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.05);

        return gain;
      }),

      // 菜单选择：清脆滴答
      [SFX.MENU_SELECT]: make(0.06, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        expRamp(gain.gain, now, now + 0.06, 0.2, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.06);

        return gain;
      }),

      // 菜单确认：双音确认
      [SFX.MENU_CONFIRM]: make(0.15, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);   // C5
        osc.frequency.setValueAtTime(784, now + 0.07); // G5

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        expRamp(gain.gain, now + 0.07, now + 0.15, 0.25, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);

        return gain;
      }),

      // 菜单返回：低音回退
      [SFX.MENU_BACK]: make(0.08, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.07);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        expRamp(gain.gain, now, now + 0.08, 0.2, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.08);

        return gain;
      }),

      // ========================================================
      // 环境/关卡 SFX
      // ========================================================

      // 检查点：确认号角
      [SFX.CHECKPOINT]: make(0.4, (ctx) => {
        const now = ctx.currentTime;

        // C5-E5-G5 上行
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        expRamp(gain.gain, now + 0.25, now + 0.4, 0.3, 0.001);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.4);

        return gain;
      }),

      // 战象冲撞：低沉冲击
      [SFX.ELEPHANT_CHARGE]: make(0.6, (ctx) => {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.4);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(1000, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
        expRamp(gain.gain, now + 0.4, now + 0.6, 0.5, 0.001);

        osc.connect(filter);
        filter.connect(gain);

        osc.start(now);
        osc.stop(now + 0.6);

        return gain;
      }),

      // ========================================================
      // 环境音
      // ========================================================

      // 西洱河水流（第1关）
      [AMBIENCE.RIVER_FLOW]: make(2.0, (ctx) => {
        const now = ctx.currentTime;
        const duration = 2.0;

        // 过滤白噪声模拟水流
        const noiseBuf = createNoiseBuffer(ctx, duration);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(0.5, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);

        noiseSrc.connect(filter);
        filter.connect(gain);

        noiseSrc.start(now);
        noiseSrc.stop(now + duration);

        return gain;
      }),

      // ========================================================
      // BGM — 菜单
      // ========================================================

      // 主菜单 BGM
      [BGM.MAIN_MENU]: make(4.0, (ctx) => {
        const now = ctx.currentTime;
        // 使用五声音阶 G-A-B-D-E (G宫)
        const scale = [392, 440, 494, 587, 659, 784, 880];
        const melody = [0, 2, 3, 5, 3, 2, 0, 2, 3, 5, 3, 2, 1, 0];
        const noteLen = 4.0 / melody.length;

        const merger = ctx.createGain();

        for (let i = 0; i < melody.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(scale[melody[i]], now + i * noteLen);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * noteLen);
          gain.gain.linearRampToValueAtTime(0.15, now + i * noteLen + 0.02);
          gain.gain.setValueAtTime(0.15, now + i * noteLen + noteLen * 0.7);
          expRamp(gain.gain, now + i * noteLen + noteLen * 0.7, now + (i + 1) * noteLen, 0.15, 0.005);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * noteLen);
          osc.stop(now + (i + 1) * noteLen);
        }

        return merger;
      }),

      // 第1关探索 BGM
      [BGM.LEVEL_1]: make(4.0, (ctx) => {
        const now = ctx.currentTime;
        // 五声音阶 E-G-A-B-D
        const scale = [330, 392, 440, 494, 587, 659];
        const melody = [0, 1, 2, 3, 1, 0, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0];
        const noteLen = 4.0 / melody.length;

        const merger = ctx.createGain();

        // 旋律层
        for (let i = 0; i < melody.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(scale[melody[i]], now + i * noteLen);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * noteLen);
          gain.gain.linearRampToValueAtTime(0.12, now + i * noteLen + 0.02);
          gain.gain.setValueAtTime(0.12, now + i * noteLen + noteLen * 0.7);
          expRamp(gain.gain, now + i * noteLen + noteLen * 0.7, now + (i + 1) * noteLen, 0.12, 0.005);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * noteLen);
          osc.stop(now + (i + 1) * noteLen);
        }

        // 低频节奏层（每拍）
        for (let i = 0; i < 16; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(scale[0] / 2, now + i * 0.25);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * 0.25);
          gain.gain.linearRampToValueAtTime(0.1, now + i * 0.25 + 0.005);
          expRamp(gain.gain, now + i * 0.25 + 0.1, now + (i + 1) * 0.25, 0.1, 0.001);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * 0.25);
          osc.stop(now + (i + 1) * 0.25);
        }

        return merger;
      }),

      // 第1关 Boss BGM：更强节奏 + 更低音
      [BGM.BOSS]: make(4.0, (ctx) => {
        const now = ctx.currentTime;
        const scale = [220, 262, 330, 392, 440, 523]; // A-C-E-G-A-C (更低的五声)
        const melody = [0, 3, 5, 3, 0, 3, 5, 4, 3, 2, 0, 1, 0, 3, 5, 3];
        const noteLen = 4.0 / melody.length;

        const merger = ctx.createGain();

        // 主旋律（sawtooth 更激烈）
        for (let i = 0; i < melody.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = i % 4 === 0 ? 'sawtooth' : 'square';
          osc.frequency.setValueAtTime(scale[melody[i]], now + i * noteLen);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * noteLen);
          gain.gain.linearRampToValueAtTime(0.18, now + i * noteLen + 0.01);
          gain.gain.setValueAtTime(0.18, now + i * noteLen + noteLen * 0.6);
          expRamp(gain.gain, now + i * noteLen + noteLen * 0.6, now + (i + 1) * noteLen, 0.18, 0.005);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * noteLen);
          osc.stop(now + (i + 1) * noteLen);
        }

        // 战鼓层（8分音符密集打击）
        for (let i = 0; i < 32; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(scale[0] / 3, now + i * 0.125);

          const gain = ctx.createGain();
          const accent = (i % 4 === 0) ? 0.25 : 0.1; // 每拍加重
          gain.gain.setValueAtTime(0, now + i * 0.125);
          gain.gain.linearRampToValueAtTime(accent, now + i * 0.125 + 0.005);
          expRamp(gain.gain, now + i * 0.125 + 0.06, now + (i + 1) * 0.125, accent, 0.001);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * 0.125);
          osc.stop(now + (i + 1) * 0.125);
        }

        return merger;
      }),

      // 擒获主题 BGM：庄重肃穆
      [BGM.CAPTURE_THEME]: make(4.0, (ctx) => {
        const now = ctx.currentTime;
        // 五声音阶：古琴风格
        const scale = [262, 294, 330, 392, 440, 523]; // C-D-E-G-A
        const melody = [0, 2, 3, 5, 3, 2, 1, 0, 5, 3, 2, 1, 0];
        const noteLen = 4.0 / melody.length;

        const merger = ctx.createGain();

        for (let i = 0; i < melody.length; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(scale[melody[i]], now + i * noteLen);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * noteLen);
          gain.gain.linearRampToValueAtTime(0.15, now + i * noteLen + 0.04);
          gain.gain.setValueAtTime(0.15, now + i * noteLen + noteLen * 0.8);
          expRamp(gain.gain, now + i * noteLen + noteLen * 0.8, now + (i + 1) * noteLen, 0.15, 0.003);

          // 每隔一个音加泛音
          if (i % 3 === 0) {
            const overtone = ctx.createOscillator();
            overtone.type = 'sine';
            overtone.frequency.setValueAtTime(scale[melody[i]] * 2, now + i * noteLen);

            const overtoneGain = ctx.createGain();
            overtoneGain.gain.setValueAtTime(0, now + i * noteLen);
            overtoneGain.gain.linearRampToValueAtTime(0.06, now + i * noteLen + 0.04);
            expRamp(overtoneGain.gain, now + i * noteLen + noteLen * 0.5, now + (i + 1) * noteLen, 0.06, 0.001);

            overtone.connect(overtoneGain);
            overtoneGain.connect(merger);

            overtone.start(now + i * noteLen);
            overtone.stop(now + (i + 1) * noteLen);
          }

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * noteLen);
          osc.stop(now + (i + 1) * noteLen);
        }

        return merger;
      }),

      // 胜利主题 BGM：辉煌号角
      [BGM.VICTORY_THEME]: make(4.0, (ctx) => {
        const now = ctx.currentTime;
        // C 大调上行
        const scale = [262, 330, 392, 523, 659, 784, 1047]; // C-E-G-C-E-G-C
        const melody = [0, 2, 3, 5, 6, 5, 3, 5, 6, 5, 3, 2, 0, 3, 5, 6];
        const noteLen = 4.0 / melody.length;

        const merger = ctx.createGain();

        for (let i = 0; i < melody.length; i++) {
          const osc = ctx.createOscillator();
          // 使用三角形波模仿号角
          osc.type = i < 8 ? 'triangle' : 'sawtooth';
          osc.frequency.setValueAtTime(scale[melody[i]], now + i * noteLen);

          const gain = ctx.createGain();
          const vol = i >= 8 && i < 12 ? 0.22 : 0.16;
          gain.gain.setValueAtTime(0, now + i * noteLen);
          gain.gain.linearRampToValueAtTime(vol, now + i * noteLen + 0.03);
          gain.gain.setValueAtTime(vol, now + i * noteLen + noteLen * 0.65);
          expRamp(gain.gain, now + i * noteLen + noteLen * 0.65, now + (i + 1) * noteLen, vol, 0.005);

          osc.connect(gain);
          gain.connect(merger);

          osc.start(now + i * noteLen);
          osc.stop(now + (i + 1) * noteLen);
        }

        return merger;
      }),
    };
  }
}
