// ============================================================
// BossMengHuoL1.ts — 第 1 关孟获 Boss「骑象孟获」（Batch 5 + Batch 7）
// 状态机：IDLE → CHARGING/STOMP/SWIPE → HURT → DEFEATED → CAPTURED → PHASE_TRANSITION
// 三阶段：Phase 1(100-70%)走近战 / Phase 2(70-30%)解锁冲锋 / Phase 3(30-0%)解锁踏地+横扫 1.3x速
// Batch 7: triggerDefeat() 不再淡出消失，改为保持可见等待擒获状态机接管；新增 enterCaptured()
// ============================================================

import Phaser from 'phaser';
import { BossState, BossPhase, BossConfig } from '../types/entity.types';
import { GameEvent } from '../types/events.types';
import { EventBus } from '../core/EventBus';

// ─── 攻击定义（每招 = 类型 + CD + 前摇 + 伤害 + 参数）──────
interface AttackDef {
  name: string;
  state: BossState;
  cooldownMs: number;
  warningMs: number;
  damage: number;
  /** CHARGE 专用：冲锋速度 */
  chargeSpeed?: number;
  /** STOMP/SWIPE 专用：判定半径 */
  radius?: number;
  /** 最低距离（低于此值才可用）<0 表示无限制 */
  maxDist?: number;
  /** 最低距离（高于此值才有权重加成）*/
  minDist?: number;
}

const ATTACK_TABLE: Record<string, AttackDef> = {
  charge: {
    name: 'charge', state: BossState.CHARGING,
    cooldownMs: 4000, warningMs: 800, damage: 2,
    chargeSpeed: 280, minDist: 200,
  },
  stomp: {
    name: 'stomp', state: BossState.STOMP,
    cooldownMs: 3000, warningMs: 600, damage: 1,
    radius: 120, maxDist: 180,
  },
  swipe: {
    name: 'swipe', state: BossState.SWIPE,
    cooldownMs: 2500, warningMs: 500, damage: 1,
    radius: 90, maxDist: 130,
  },
};

// ─── 默认 BossConfig ─────────────────────────────────
const DEFAULT_CONFIG: BossConfig = {
  id: 'menghuo_elephant',
  name: '孟获·骑象',
  maxHp: 30,
  phases: [BossPhase.PHASE_1, BossPhase.PHASE_2, BossPhase.PHASE_3],
  speed: 60,
  scoreValue: 500,
};

// 阶段阈值 (hpPercent, newAttacks[], speedMul)
interface PhaseDef {
  threshold: number;
  unlockAttacks: string[];
  speedMul: number;
}
const PHASE_DEFS: PhaseDef[] = [
  { threshold: 1.00, unlockAttacks: [],               speedMul: 0.6  },  // Phase 1: 纯走近战
  { threshold: 0.70, unlockAttacks: ['charge'],        speedMul: 1.0  },  // Phase 2: +冲锋
  { threshold: 0.30, unlockAttacks: ['stomp', 'swipe'],speedMul: 1.3  },  // Phase 3: +踏地 +横扫 +加速
];

// ─── 时间常量 ──────────────────────────────────────
const HURT_FLASH_MS   = 300;   // 受伤闪烁时长
const PHASE_TRANS_MS  = 1000;  // 转阶段无敌时长

export class BossMengHuoL1 extends Phaser.Physics.Arcade.Sprite {
  // ── 配置 & 状态 ──────────────────────────────────
  private _cfg: BossConfig;
  private _state: BossState = BossState.IDLE;
  private _hp: number;
  private _maxHp: number;
  private _currentPhase = BossPhase.PHASE_1;
  private _facingRight = false;

  // ── 攻击冷却（按 attack name）────────────────────
  private _cooldowns: Record<string, number> = {};

  // ── 当前攻击计时器 ──────────────────────────────
  private _attackTimer   = 0;   // 当前攻击已执行时间
  private _telegraphDone = false;
  private _activeAttack: AttackDef | null = null;

  // ── 受伤 / 转阶段计时器 ─────────────────────────
  private _hurtTimer       = 0;   // >0 表示受伤/无敌帧中
  private _phaseTransTimer = 0;

  // ── 内部标记 ─────────────────────────────────────
  private _isActive = false;     // 激活后才开始 AI（触发前为静态摆件）
  private _isDefeated = false;

  private bus = EventBus.getInstance();

  // ─────────────────────────────────────────────────
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<BossConfig>,
  ) {
    // Phase 3 集成：优先使用真实精灵表，加载失败则退化到灰盒占位
    const texKey = scene.textures.exists('boss_menghuo') ? 'boss_menghuo' : 'boss_meng_huo_placeholder';
    console.log(`[BossMengHuoL1] 纹理选择: ${texKey} (boss_menghuo 存在=${scene.textures.exists('boss_menghuo')})`);
    super(scene, x, y, texKey);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    this._cfg   = { ...DEFAULT_CONFIG, ...config };
    this._hp    = this._cfg.maxHp;
    this._maxHp = this._cfg.maxHp;

    // Phase 3 96×96 精灵: 碰撞体 80×60，底部对齐
    const body = this.body as Phaser.Physics.Arcade.Body;
    // 大象身体约占下半部分 60px 高，宽度约 80px
    // offset X = (96-80)/2 = 8, offset Y = 96-60 = 36（底部对齐）
    body.setSize(80, 60);
    body.setOffset(8, 36);
    body.setMaxVelocity(400, 600);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(true);
    this.setDepth(10);

    // 初始化冷却
    for (const key of Object.keys(ATTACK_TABLE)) {
      this._cooldowns[key] = 0;
    }

    // 初始不可见 / 不可交互（等待 activate）
    // ⚠️ BUGFIX: 不禁用 body.enable，否则 physics.add.collider 注册失效
    //    用 setActive(false) + setAlpha(0) 即可阻止所有交互
    this.setAlpha(0);
    this.setActive(false);
  }

  // ─────────────────────────────────────────────────
  // 激活（玩家到达触发点时调用）
  // ─────────────────────────────────────────────────
  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this.setAlpha(1);
    this.setActive(true);
    this._state = BossState.IDLE;
    this.playAnim(BossState.IDLE);

    this.bus.emit(GameEvent.BOSS_SPAWNED, { bossId: this._cfg.id });
    this.bus.emit(GameEvent.BOSS_HP_CHANGED, {
      currentHp: this._hp,
      maxHp: this._maxHp,
    });
  }

  // ─────────────────────────────────────────────────
  // 每帧更新
  // ─────────────────────────────────────────────────
  updateBoss(delta: number, playerX: number, playerY: number): void {
    if (!this._isActive || this._isDefeated) return;
    if (!this.active) return;

    // ── 更新冷却 ──
    for (const key of Object.keys(this._cooldowns)) {
      if (this._cooldowns[key] > 0) {
        this._cooldowns[key] = Math.max(0, this._cooldowns[key] - delta);
      }
    }

    // ── 转阶段计时 ──
    if (this._phaseTransTimer > 0) {
      this._phaseTransTimer -= delta;
      // 闪烁效果（转阶段视觉提示，频率适中不过于刺眼）
      this.setAlpha(Math.floor(this._phaseTransTimer / 150) % 2 === 0 ? 0.65 : 1);
      if (this._phaseTransTimer <= 0) {
        this._state = BossState.IDLE;
        this.setAlpha(1);
      }
      return;
    }

    // ── 受伤态 ──
    if (this._state === BossState.HURT) {
      this._hurtTimer -= delta;
      // ⚠️ BUGFIX: 闪烁频率从 50ms 改为 100ms，alpha 从 0.4 改为 0.6
      //    原版 50ms/0.4 = 20Hz 频闪 + 极端明暗差 → 看起来像屏幕闪烁
      this.setAlpha(Math.floor(this._hurtTimer / 100) % 2 === 0 ? 0.6 : 1);
      if (this._hurtTimer <= 0) {
        this._state = BossState.IDLE;
        this.setAlpha(1);
        // 冻结速度
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);
      }
      return;
    }

    // ── 检测阶段切换 ──
    this.checkPhaseTransition();

    // ── 朝向玩家 ──
    this._facingRight = playerX > this.x;
    this.setFlipX(!this._facingRight);

    // ── 根据状态分发 ──
    switch (this._state) {
      case BossState.IDLE:
        this.doIdle(playerX, playerY, delta);
        break;
      case BossState.CHARGING:
        this.doCharge(delta, playerX);
        break;
      case BossState.STOMP:
        this.doStomp(delta, playerX, playerY);
        break;
      case BossState.SWIPE:
        this.doSwipe(delta, playerX);
        break;
    }
  }

  // ═══════════════════════════════════════════════════
  // IDLE：选择行动
  // ═══════════════════════════════════════════════════
  private doIdle(playerX: number, playerY: number, delta: number): void {
    const distX = Math.abs(this.x - playerX);
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 获取当前阶段可用的攻击列表
    const available = this.getAvailableAttacks(distX);
    const phaseDef = this.getCurrentPhaseDef();

    if (available.length > 0) {
      // 有可用攻击 → 权重随机选择
      const chosen = this.weightedPick(available, distX);
      if (chosen) {
        this.startAttack(chosen);
        return;
      }
    }

    // 无可攻击 → 朝玩家缓慢靠近（Phase 1 主要行为）
    const spd = this._cfg.speed * phaseDef.speedMul;
    if (distX > 60) {
      body.setVelocityX(this._facingRight ? spd : -spd);
    } else {
      body.setVelocityX(0);
    }
  }

  // ═══════════════════════════════════════════════════
  // CHARGING：冲锋
  // ═══════════════════════════════════════════════════
  private doCharge(delta: number, playerX: number): void {
    this._attackTimer += delta;
    const def = this._activeAttack!;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this._telegraphDone) {
      // 前摇：闪红警告
      if (this._attackTimer >= def.warningMs) {
        this._telegraphDone = true;
        this._attackTimer = 0;
        this.clearTint();
      } else {
        this.setTint(0xff4444);
      }
      return;
    }

    // 冲锋执行：朝玩家方向高速移动
    const dir = this._facingRight ? 1 : -1;
    body.setVelocityX(def.chargeSpeed! * dir);

    // 冲锋持续 600ms 或碰到边界
    if (this._attackTimer > 600 || body.blocked.left || body.blocked.right) {
      this.finishAttack();
    }
  }

  // ═══════════════════════════════════════════════════
  // STOMP：踏地 AOE
  // ═══════════════════════════════════════════════════
  private doStomp(delta: number, playerX: number, playerY: number): void {
    this._attackTimer += delta;
    const def = this._activeAttack!;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (!this._telegraphDone) {
      // 前摇：闪红 + 微抬
      if (this._attackTimer >= def.warningMs) {
        this._telegraphDone = true;
        this._attackTimer = 0;
        this.clearTint();
        // 执行踏地
        this.executeStomp(playerX, playerY);
      } else {
        this.setTint(0xff8800);
      }
      return;
    }

    // 踏地后硬直 400ms
    if (this._attackTimer > 400) {
      this.finishAttack();
    }
  }

  private executeStomp(playerX: number, playerY: number): void {
    // 震动镜头
    this.bus.emit(GameEvent.CAMERA_SHAKE, { intensity: 30, duration: 300 });

    // 判断玩家是否在 AOE 范围内
    const def = this._activeAttack!;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist <= def.radius!) {
      this.bus.emit(GameEvent.PLAYER_DAMAGED, {
        currentHp: -1,       // 由 Player 侧处理
        maxHp: -1,
        source: 'boss_stomp',
      });
    }

    // 灰盒 AOE 视觉：扩大的圆圈
    this.drawAOEIndicator(def.radius!);
  }

  // ═══════════════════════════════════════════════════
  // SWIPE：横扫
  // ═══════════════════════════════════════════════════
  private doSwipe(delta: number, playerX: number): void {
    this._attackTimer += delta;
    const def = this._activeAttack!;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (!this._telegraphDone) {
      if (this._attackTimer >= def.warningMs) {
        this._telegraphDone = true;
        this._attackTimer = 0;
        this.clearTint();
        // 执行横扫
        this.executeSwipe(playerX);
      } else {
        this.setTint(0xffaa00);
      }
      return;
    }

    if (this._attackTimer > 350) {
      this.finishAttack();
    }
  }

  private executeSwipe(playerX: number): void {
    const def = this._activeAttack!;
    const dir = this._facingRight ? 1 : -1;
    // 判定：玩家在 Boss 前方且距离在范围内
    const dx = playerX - this.x;
    const inFront = dir > 0 ? dx > 0 : dx < 0;
    const distX = Math.abs(dx);
    if (inFront && distX <= def.radius!) {
      this.bus.emit(GameEvent.PLAYER_DAMAGED, {
        currentHp: -1,
        maxHp: -1,
        source: 'boss_swipe',
      });
    }

    // 横扫视觉：面前画一条短线
    this.drawSwipeIndicator(dir);
  }

  // ═══════════════════════════════════════════════════
  // 受击
  // ═══════════════════════════════════════════════════
  takeDamage(amount: number): void {
    if (this._isDefeated) return;
    if (this._state === BossState.HURT) return;   // 硬直中不可重复受击
    if (this._phaseTransTimer > 0) return;          // 转阶段无敌
    if (!this._isActive) return;

    this._hp = Math.max(0, this._hp - amount);

    this.bus.emit(GameEvent.BOSS_DAMAGED, {
      currentHp: this._hp,
      maxHp: this._maxHp,
    });
    this.bus.emit(GameEvent.BOSS_HP_CHANGED, {
      currentHp: this._hp,
      maxHp: this._maxHp,
    });

    if (this._hp <= 0) {
      this.triggerDefeat();
      return;
    }

    // 受伤硬直
    this._state = BossState.HURT;
    this._hurtTimer = HURT_FLASH_MS;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    this.playAnim(BossState.HURT);

    // 微击退
    const dir = this._facingRight ? -1 : 1;
    body.setVelocityX(40 * dir);
  }

  // ═══════════════════════════════════════════════════
  // 击败 → 触发擒获（Batch 7: 不再淡出消失，保持可见）
  // ═══════════════════════════════════════════════════
  triggerDefeat(): void {
    if (this._isDefeated) return;
    this._isDefeated = true;
    this._state = BossState.DEFEATED;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    // ⚠️ Batch 7: 不再 remove body / fadeOut — 保持可见，等待 CaptureSystem 接管
    // 注意：physics.debug=true 时 body.enable=false 仍可能渲染紫色碰撞盒轮廓，
    // 此为 Phaser 调试渲染器的已知行为，生产环境无影响。

    // 击败视觉：播放战败动画（有真实纹理时），否则用 tint 退化为灰色
    if (this.scene.textures.exists('boss_menghuo')) {
      this.playAnim(BossState.DEFEATED);
      this.clearTint();
    } else {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(400, () => {
        if (this._state === BossState.DEFEATED && this.active) {
          this.setTint(0x666666);
        }
      });
    }

    this.bus.emit(GameEvent.BOSS_DEFEATED, {
      bossId: this._cfg.id,
      scoreValue: this._cfg.scoreValue,
    });
    // CAMERA_LOCK / CAMERA_SHAKE 已移至 CaptureSystem 统一管理
  }

  // ═══════════════════════════════════════════════════
  // 进入擒获状态（Batch 7: 由 CaptureSystem 调用）
  // ═══════════════════════════════════════════════════
  enterCaptured(): void {
    this._state = BossState.CAPTURED;
    this.clearTint();
    this.playAnim(BossState.CAPTURED);

    // 被擒缩放演出
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 400,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  // ═══════════════════════════════════════════════════
  // 阶段切换检测
  // ═══════════════════════════════════════════════════
  private checkPhaseTransition(): void {
    const hpPct = this._hp / this._maxHp;
    const newPhase = this.getPhaseByHp(hpPct);
    if (newPhase !== this._currentPhase) {
      this._currentPhase = newPhase;
      this._state = BossState.PHASE_TRANSITION;
      this._phaseTransTimer = PHASE_TRANS_MS;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(0);
      this.playAnim(BossState.PHASE_TRANSITION);

      this.bus.emit(GameEvent.BOSS_PHASE_CHANGE, {
        phase: newPhase,
        hpPercent: hpPct,
      });
      this.bus.emit(GameEvent.CAMERA_SHAKE, { intensity: 15, duration: 300 });
    }
  }

  private getPhaseByHp(hpPct: number): BossPhase {
    if (hpPct > 0.70) return BossPhase.PHASE_1;
    if (hpPct > 0.30) return BossPhase.PHASE_2;
    return BossPhase.PHASE_3;
  }

  // ═══════════════════════════════════════════════════
  // AI 辅助方法
  // ═══════════════════════════════════════════════════
  private getCurrentPhaseDef(): PhaseDef {
    return PHASE_DEFS[this._currentPhase - 1] ?? PHASE_DEFS[0];
  }

  private getAvailableAttacks(distX: number): AttackDef[] {
    const phaseDef = this.getCurrentPhaseDef();
    const results: AttackDef[] = [];
    for (const name of phaseDef.unlockAttacks) {
      const def = ATTACK_TABLE[name];
      if (!def) continue;
      if (this._cooldowns[name] > 0) continue;
      // 距离检查
      if (def.maxDist !== undefined && distX > def.maxDist) continue;
      results.push(def);
    }
    return results;
  }

  private weightedPick(attacks: AttackDef[], distX: number): AttackDef | null {
    if (attacks.length === 0) return null;

    // 简单加权：minDist 高的在距离远时权重更大
    const weighted: { def: AttackDef; weight: number }[] = attacks.map((def) => {
      let w = 1;
      // 距离越远，minDist 高的攻击权重越大（如 charge 远距离更有利）
      if (def.minDist && distX > def.minDist) w += 2;
      return { def, weight: w };
    });

    const total = weighted.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const item of weighted) {
      r -= item.weight;
      if (r <= 0) return item.def;
    }
    return weighted[weighted.length - 1].def;
  }

  private startAttack(def: AttackDef): void {
    this._state = def.state;
    this._activeAttack = def;
    this._attackTimer = 0;
    this._telegraphDone = false;
    this._cooldowns[def.name] = def.cooldownMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    this.playAnim(def.state);
  }

  private finishAttack(): void {
    this._state = BossState.IDLE;
    this._activeAttack = null;
    this._attackTimer = 0;
    this._telegraphDone = false;
    this.clearTint();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    this.playAnim(BossState.IDLE);
  }

  // ═══════════════════════════════════════════════════
  // 视觉辅助（灰盒）
  // ═══════════════════════════════════════════════════
  private drawAOEIndicator(radius: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(50);
    gfx.lineStyle(3, 0xff6600, 0.8);
    gfx.strokeCircle(this.x, this.y, radius);
    gfx.fillStyle(0xff6600, 0.15);
    gfx.fillCircle(this.x, this.y, radius);

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 500,
      onComplete: () => gfx.destroy(),
    });
  }

  private drawSwipeIndicator(dir: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(50);
    const len = 90;
    const x1 = this.x;
    const x2 = this.x + len * dir;
    const y = this.y - 10;
    gfx.lineStyle(4, 0xffcc00, 0.8);
    gfx.lineBetween(x1, y, x2, y);

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 400,
      onComplete: () => gfx.destroy(),
    });
  }

  // ═══════════════════════════════════════════════════
  // 动画播放（Phase 3 集成，带 fallback）
  // ═══════════════════════════════════════════════════
  private playAnim(state: BossState): void {
    if (!this.scene.textures.exists('boss_menghuo')) return;
    try {
      switch (state) {
        case BossState.IDLE:            this.play('boss_idle', true); break;
        case BossState.CHARGING:        this.play('boss_charge', true); break;
        case BossState.STOMP:           this.play('boss_stomp', true); break;
        case BossState.SWIPE:           this.play('boss_sweep', true); break;
        case BossState.HURT:            this.play('boss_hurt', true); break;
        case BossState.DEFEATED:        this.play('boss_fall', true); break;
        case BossState.CAPTURED:        this.play('boss_captured', true); break;
        // PHASE_TRANSITION 复用 idle（转阶段闪白期间播放 idle 即可）
        case BossState.PHASE_TRANSITION: this.play('boss_idle', true); break;
      }
    } catch (_) {
      // 动画 key 不存在时静默退化（如 animation 未注册）
    }
  }

  // ═══════════════════════════════════════════════════
  // 对玩家的接触伤害（由碰撞回调调用）
  // ═══════════════════════════════════════════════════
  dealContactDamage(): number {
    // 冲锋中伤害更高
    if (this._state === BossState.CHARGING && this._telegraphDone) {
      return this._activeAttack?.damage ?? 2;
    }
    return 1; // 普通接触伤害
  }

  // ── Getters ──────────────────────────────────────
  get hp(): number              { return this._hp; }
  get maxHp(): number           { return this._maxHp; }
  get bossState(): BossState    { return this._state; }
  get currentPhase(): BossPhase { return this._currentPhase; }
  get isDefeated(): boolean     { return this._isDefeated; }
  get isActive(): boolean       { return this._isActive; }
  get isVulnerable(): boolean   {
    return this._isActive && !this._isDefeated &&
           this._state !== BossState.HURT &&
           this._phaseTransTimer <= 0;
  }
}
