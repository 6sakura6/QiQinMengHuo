# Phase 2 — 第1关纵切原型 · 模块架构与接口设计

> 版本：v1.0 | 日期：2026-06-12  
> 对应阶段：Phase 2 — 第 1 关纵切原型  
> 关联文档：GDD v1.1 / level-narrative v1.1 / character-sheets v1.1 / 研发工作流 v1.1

---

## 目录

1. [架构总览](#1-架构总览)
2. [目录结构](#2-目录结构)
3. [模块分解与职责](#3-模块分解与职责)
4. [接口定义](#4-接口定义)
5. [事件总线设计](#5-事件总线设计)
6. [数据流设计](#6-数据流设计)
7. [数据规范](#7-数据规范)
8. [场景流转设计](#8-场景流转设计)
9. [开发顺序建议](#9-开发顺序建议)
10. [验收清单](#10-验收清单)

---

## 1. 架构总览

### 1.1 分层架构

```
┌─────────────────────────────────────────────────┐
│                   Scenes Layer                    │
│  Boot → MainMenu → Level1Game → CutScene → Result│
├─────────────────────────────────────────────────┤
│                    UI Layer                       │
│        HUD | DialogBox | BossBar | ResultScreen  │
├─────────────────────────────────────────────────┤
│                  Systems Layer                    │
│  DialogSystem | WeaponSystem | CaptureSystem     │
│  SaveSystem   | StorySystem  | CameraSystem     │
│  InputManager | AudioManager | ScreenShake       │
├─────────────────────────────────────────────────┤
│                  Entities Layer                   │
│        Player | Enemy | BossMengHuoL1            │
├─────────────────────────────────────────────────┤
│                   Data Layer                      │
│  levels.json | dialogs.json | fragments.json     │
│  boss-patterns.json | strategy-advice.json       │
├─────────────────────────────────────────────────┤
│                  Core / Utils                     │
│  EventBus | Constants | Types | AssetLoader      │
└─────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **场景即入口** | 每个 Scene 是独立的状态容器，通过 EventBus 与 System 通信 |
| **System 无状态** | System 为单例服务，不持有场景特定状态 |
| **Entity 自包含** | Entity 封装自身状态机、动画、碰撞，通过 EventBus 上报事件 |
| **Data 驱动** | 所有文本、配置、Boss 行为从 JSON 加载，不硬编码 |
| **接口先于实现** | 模块间依赖接口（interface），不依赖具体实现 |

---

## 2. 目录结构

```
七擒孟获/
├── index.html                          # 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                         # 游戏入口，Phaser.Game 初始化
│   ├── config/
│   │   └── gameConfig.ts               # Phaser 配置 + 全局常量
│   ├── core/
│   │   ├── EventBus.ts                 # 全局事件总线
│   │   ├── AssetLoader.ts              # 资源加载器（含灰盒 fallback）
│   │   └── GameContext.ts              # 全局上下文（存档引用、系统引用）
│   ├── types/
│   │   ├── index.ts                    # 类型汇总导出
│   │   ├── entity.types.ts             # 实体相关类型
│   │   ├── system.types.ts             # 系统相关类型
│   │   ├── data.types.ts               # 数据配置相关类型
│   │   └── events.types.ts             # 事件名称与 payload 类型
│   ├── scenes/
│   │   ├── BootScene.ts                # 启动加载场景
│   │   ├── MainMenuScene.ts            # 主菜单场景
│   │   ├── Level1Scene.ts              # 第1关游戏场景
│   │   ├── CutScene.ts                 # 过场动画场景
│   │   └── ResultScene.ts              # 结算场景
│   ├── entities/
│   │   ├── Player.ts                   # 玩家实体
│   │   ├── Enemy.ts                    # 蛮兵基类
│   │   └── BossMengHuoL1.ts            # 第1关孟获 Boss
│   ├── systems/
│   │   ├── DialogSystem.ts             # 对话系统
│   │   ├── WeaponSystem.ts             # 武器系统
│   │   ├── CaptureSystem.ts            # 擒获状态机
│   │   ├── SaveSystem.ts               # 存档系统（LocalStorage）
│   │   ├── StorySystem.ts              # 故事碎片系统
│   │   ├── CameraSystem.ts             # 镜头控制系统
│   │   ├── InputManager.ts             # 输入管理器
│   │   ├── AudioManager.ts             # 音频管理器
│   │   └── ScreenShake.ts              # 屏幕震动效果
│   ├── ui/
│   │   ├── HUD.ts                      # 血条/武器/碎片 HUD
│   │   ├── DialogBox.ts                # 对话框 UI
│   │   ├── BossHealthBar.ts            # Boss 血条
│   │   └── ResultScreen.ts             # 结算界面 UI
│   └── data/
│       ├── levels.json                 # 关卡配置
│       ├── dialogs.json                # 对话数据
│       ├── boss-patterns.json          # Boss 行为模板
│       ├── fragments.json              # 故事碎片
│       ├── strategy-advice.json        # AI 本地 fallback 模板
│       └── asset-manifest.json         # 资源清单
├── public/
│   └── assets/
│       ├── sprites/                    # 精灵图（含灰盒占位方块）
│       ├── tilesets/                   # 环境图块
│       ├── ui/                         # UI 素材
│       ├── audio/                      # 音效/BGM
│       └── cutscenes/                  # 过场图片
```

---

## 3. 模块分解与职责

### 3.1 模块总览

| 模块 | 类型 | 核心职责 | Phase 2 覆盖度 |
|------|------|----------|---------------|
| **EventBus** | Core | 全局事件发布/订阅，解耦模块通信 | 完整 |
| **AssetLoader** | Core | 资源加载 + 灰盒 fallback | 完整 |
| **BootScene** | Scene | 启动加载、进度条、跳转主菜单 | 完整 |
| **MainMenuScene** | Scene | 主菜单、开始游戏 | 基础 |
| **Level1Scene** | Scene | 第1关场景组装与生命周期 | **完整**（核心） |
| **CutScene** | Scene | 图文过场播放 | 完整 |
| **ResultScene** | Scene | 结算展示 | 完整 |
| **Player** | Entity | 移动/跳跃/射击/状态机 | **完整**（核心） |
| **Enemy** | Entity | 蛮兵基类：巡逻/受击/死亡 | 完整 |
| **BossMengHuoL1** | Entity | 骑象 Boss：冲锋/踏地/横扫 | **完整**（核心） |
| **InputManager** | System | 键盘输入统一管理 | 完整 |
| **DialogSystem** | System | 对话触发/显示/跳过 | 完整 |
| **WeaponSystem** | System | 武器切换/弹幕管理 | 基础（仅基础弩箭） |
| **CaptureSystem** | System | 擒获状态机 | **完整**（核心差异） |
| **SaveSystem** | System | LocalStorage 存取 | 完整 |
| **StorySystem** | System | 碎片收集/图鉴 | 基础（1个碎片） |
| **CameraSystem** | System | 镜头跟随/锁镜头 | 完整 |
| **AudioManager** | System | 音效播放（含空实现） | 基础（占位） |
| **ScreenShake** | System | 屏幕震动 | 完整 |
| **HUD** | UI | 血条/武器/碎片显示 | 完整 |
| **DialogBox** | UI | 对话框渲染 | 完整 |
| **BossHealthBar** | UI | Boss 血条 | 完整 |
| **ResultScreen** | UI | 结算面板 | 完整 |

### 3.2 模块依赖关系

```
                    ┌──────────────┐
                    │   EventBus   │  ← 所有模块通过 EventBus 通信
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Scenes    │ │   Systems   │ │  Entities   │
    │ (组装者)     │ │ (服务层)     │ │ (游戏对象)   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │   UI Layer  │  ← 仅被 Scenes 引用
                    └─────────────┘
```

**规则：**
- Scenes 依赖 Systems 和 Entities，Scenes 是"组装者"
- Systems 不依赖 Scenes，通过 EventBus 收发消息
- Entities 不依赖 Scenes/Systems，通过 EventBus 上报状态
- UI 只被 Scene 直接创建和操作

---

## 4. 接口定义

### 4.1 核心类型 (`src/types/`)

#### `entity.types.ts`

```typescript
// ============ 玩家状态机 ============
export enum PlayerState {
  IDLE = 'idle',
  RUN = 'run',
  JUMP = 'jump',
  FALL = 'fall',
  SHOOT = 'shoot',
  HURT = 'hurt',
  DEATH = 'death',
  CUTSCENE_LOCK = 'cutscene_lock',
}

export interface PlayerConfig {
  speed: number;
  jumpForce: number;
  maxHp: number;
  shootCooldown: number;
  bulletSpeed: number;
  bulletDamage: number;
}

// ============ 敌人状态机 ============
export enum EnemyState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  HURT = 'hurt',
  DEATH = 'death',
}

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  patrolRange: number;
  detectionRange: number;
  scoreValue: number;
}

export enum EnemyType {
  BASIC_SOLDIER = 'basic_soldier',      // 普通蛮兵
}

// ============ Boss 状态机 ============
export enum BossState {
  IDLE = 'idle',
  CHARGE = 'charge',         // 冲锋
  STOMP = 'stomp',           // 踏地
  SWIPE = 'swipe',           // 横扫
  HURT = 'hurt',
  DEFEATED = 'defeated',     // 被击败 → 触发擒获
  CAPTURED = 'captured',     // 被擒获
}

export interface BossConfig {
  maxHp: number;
  phaseThresholds: number[];    // 血量阶段阈值 [0.7, 0.3]
  chargeSpeed: number;
  stompRadius: number;
  swipeRange: number;
}

// ============ 武器类型 ============
export enum WeaponType {
  CROSSBOW = 'crossbow',         // 基础弩箭（Phase 2 唯一）
}

export interface WeaponConfig {
  type: WeaponType;
  fireRate: number;              // 每秒射速
  bulletSpeed: number;
  bulletDamage: number;
  bulletCount: number;           // 单次射击子弹数
  spreadAngle: number;           // 散射角度（0 = 直线）
}

// ============ 通用几何 ============
export interface Vec2 {
  x: number;
  y: number;
}
```

#### `system.types.ts`

```typescript
// ============ 对话系统 ============
export enum DialogTrigger {
  LEVEL_START = 'level_start',
  COMBAT_BARK = 'combat_bark',
  BOSS_PRE = 'boss_pre',
  BOSS_MID = 'boss_mid',        // Boss 血量过半
  CAPTURE = 'capture',
  RELEASE = 'release',
  STORY_FRAGMENT = 'story_fragment',
}

export interface DialogNode {
  id: string;
  levelId: string;
  trigger: DialogTrigger;
  speaker: string;
  portrait: string;
  text: string;
  skippable: boolean;
  firstPlayLockSec: number;      // 首次播放时强制显示多少秒
  position: 'center' | 'top_right' | 'bottom';
}

// ============ 擒获系统 ============
export enum CapturePhase {
  NONE = 'none',
  BOSS_DEFEATED = 'boss_defeated',     // Boss 血量归零
  CAPTURE_ANIM = 'capture_anim',       // 擒获动画播放中
  DIALOG_PLAYING = 'dialog_playing',   // 擒获对话播放中
  RELEASE_ANIM = 'release_anim',       // 释放动画播放中
  COMPLETE = 'complete',               // 释放完成
}

export interface CaptureConfig {
  bossDefeatedLockTime: number;        // 击败后镜头锁定时长(ms)
  captureDialogDelay: number;          // 擒获对话延迟(ms)
  releaseDialogDelay: number;          // 释放对话延迟(ms)
  playerControlRestoreDelay: number;   // 恢复操控延迟(ms)
}

// ============ 存档系统 ============
export interface SaveData {
  version: string;
  lastUpdated: string;
  unlockedLevels: string[];
  completedLevels: LevelRecord[];
  collectedFragments: string[];
  settings: GameSettings;
}

export interface LevelRecord {
  levelId: string;
  completed: boolean;
  clearTimeSec: number;
  deathCount: number;
  damageTaken: number;
  enemiesDefeated: number;
  bossHitRate: number;
  fragmentCollected: boolean;
  playStyle: PlayStyle;
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
```

#### `data.types.ts`

```typescript
// ============ 关卡配置 ============
export interface LevelConfig {
  id: string;
  name: string;
  captureIndex: number;
  theme: string;
  mengHuoMindset: string;
  colorTheme: [string, string];
  music: string;
  map: string;
  boss: string;
  newMechanics: string[];
  dialogSequence: string[];
  storyFragment: string;
  playerWeaponUnlock: string | null;
  parTimeSec: number;
}

// ============ Boss 行为模板 ============
export interface BossPattern {
  id: string;
  attacks: BossAttack[];
  phaseTransitions: BossPhaseTransition[];
}

export interface BossAttack {
  name: string;
  type: 'charge' | 'stomp' | 'swipe' | 'projectile' | 'summon';
  cooldownMs: number;
  warningMs: number;           // 前摇预警时间
  damage: number;
  telegraph?: string;          // 预警特效 key
}

export interface BossPhaseTransition {
  hpPercent: number;
  newAttacks: string[];        // 解锁新招式
  speedMultiplier: number;
  dialogueId: string;          // 阶段台词 ID
}

// ============ 故事碎片 ============
export interface StoryFragment {
  id: string;
  levelId: string;
  title: string;
  text: string;
  unlockHint: string;
}

// ============ AI 策略建议 ============
export interface StrategyAdvice {
  playStyle: PlayStyle;
  text: string;
}
```

#### `events.types.ts`

```typescript
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

  // ---- 场景 ----
  SCENE_TRANSITION = 'scene:transition',
}

// ============ 事件 Payload 类型 ============
export interface EventPayloadMap {
  [GameEvent.PLAYER_DAMAGED]: { currentHp: number; maxHp: number; source: string };
  [GameEvent.PLAYER_DEATH]: { cause: string; position: Vec2 };
  [GameEvent.PLAYER_SHOOT]: { weaponType: WeaponType; direction: Vec2 };
  [GameEvent.PLAYER_STATE_CHANGE]: { from: PlayerState; to: PlayerState };

  [GameEvent.ENEMY_DEFEATED]: { enemyType: EnemyType; position: Vec2; scoreValue: number };
  [GameEvent.ENEMY_SPAWNED]: { enemyType: EnemyType; position: Vec2 };

  [GameEvent.BOSS_SPAWNED]: { bossId: string };
  [GameEvent.BOSS_PHASE_CHANGE]: { phase: number; hpPercent: number };
  [GameEvent.BOSS_DEFEATED]: { bossId: string };
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

  [GameEvent.SCENE_TRANSITION]: { targetScene: string; data?: Record<string, unknown> };
}
```

### 4.2 EventBus 接口

```typescript
// src/core/EventBus.ts

export class EventBus {
  private static instance: EventBus;
  
  static getInstance(): EventBus;
  
  /** 订阅事件 */
  on<K extends GameEvent>(
    event: K, 
    callback: (payload: EventPayloadMap[K]) => void, 
    context?: object
  ): void;
  
  /** 单次订阅 */
  once<K extends GameEvent>(
    event: K, 
    callback: (payload: EventPayloadMap[K]) => void, 
    context?: object
  ): void;
  
  /** 取消订阅 */
  off<K extends GameEvent>(
    event: K, 
    callback: (payload: EventPayloadMap[K]) => void, 
    context?: object
  ): void;
  
  /** 发布事件 */
  emit<K extends GameEvent>(event: K, payload: EventPayloadMap[K]): void;
  
  /** 清除所有订阅 */
  clear(): void;
}
```

### 4.3 各 System 公开接口

```typescript
// ============ DialogSystem ============
interface IDialogSystem {
  /** 加载关卡对话数据 */
  loadLevelDialogs(levelId: string): void;
  /** 根据触发器获取对话节点 */
  getDialogByTrigger(trigger: DialogTrigger): DialogNode | null;
  /** 根据 ID 获取对话节点 */
  getDialogById(dialogId: string): DialogNode | null;
  /** 获取对话序列 */
  getSequence(levelId: string): string[];
}

// ============ CaptureSystem ============
interface ICaptureSystem {
  /** 当前擒获阶段 */
  readonly phase: CapturePhase;
  /** 启动擒获流程 */
  startCapture(bossId: string): void;
  /** 推进到下一阶段 */
  advance(): void;
  /** 是否处于擒获流程中 */
  isActive(): boolean;
  /** 重置 */
  reset(): void;
}

// ============ SaveSystem ============
interface ISaveSystem {
  /** 加载存档 */
  load(): SaveData;
  /** 保存存档 */
  save(data: Partial<SaveData>): void;
  /** 判断关卡是否解锁 */
  isLevelUnlocked(levelId: string): boolean;
  /** 解锁关卡 */
  unlockLevel(levelId: string): void;
  /** 记录关卡通关数据 */
  recordLevelCompletion(record: LevelRecord): void;
  /** 获取关卡记录 */
  getLevelRecord(levelId: string): LevelRecord | null;
  /** 获取上一关玩家统计（用于 AI 分析） */
  getLastLevelStats(): LevelRecord | null;
  /** 清除所有数据 */
  resetAll(): void;
}

// ============ StorySystem ============
interface IStorySystem {
  /** 收集碎片 */
  collect(fragmentId: string): void;
  /** 是否已收集 */
  isCollected(fragmentId: string): boolean;
  /** 获取已收集列表 */
  getCollected(): string[];
  /** 获取碎片内容 */
  getFragment(fragmentId: string): StoryFragment | null;
}

// ============ WeaponSystem ============
interface IWeaponSystem {
  /** 当前武器 */
  readonly currentWeapon: WeaponType;
  /** 切换武器 */
  switchWeapon(type: WeaponType): void;
  /** 射击（由 Player 每帧调用） */
  fire(origin: Vec2, direction: Vec2, group: Phaser.Physics.Arcade.Group): void;
  /** 解锁武器 */
  unlockWeapon(type: WeaponType): void;
  /** 获取武器配置 */
  getWeaponConfig(type: WeaponType): WeaponConfig;
}

// ============ CameraSystem ============
interface ICameraSystem {
  /** 设置跟随目标 */
  follow(target: Phaser.GameObjects.Sprite): void;
  /** 锁定镜头到指定位置 */
  lockOn(position: Vec2, duration: number): void;
  /** 解锁镜头 */
  unlock(): void;
  /** 屏幕震动 */
  shake(intensity: number, duration: number): void;
  /** 设置边界 */
  setBounds(x: number, y: number, width: number, height: number): void;
}

// ============ InputManager ============
interface IInputManager {
  /** 左方向是否按下 */
  readonly isLeft: boolean;
  /** 右方向是否按下 */
  readonly isRight: boolean;
  /** 跳跃是否刚按下（仅当前帧） */
  readonly isJumpJustDown: boolean;
  /** 射击是否按下 */
  readonly isShoot: boolean;
  /** 射击方向（弧度） */
  readonly aimAngle: number;
  /** 交互键是否刚按下 */
  readonly isInteractJustDown: boolean;
  /** 暂停键是否刚按下 */
  readonly isPauseJustDown: boolean;
  /** 每帧更新（由 Scene update 调用） */
  update(): void;
}

// ============ AudioManager ============
interface IAudioManager {
  /** 播放音效（若资源未加载则静默忽略） */
  playSfx(key: string, config?: { volume?: number; loop?: boolean }): void;
  /** 播放 BGM */
  playBgm(key: string): void;
  /** 停止 BGM */
  stopBgm(): void;
  /** 设置主音量 */
  setMasterVolume(volume: number): void;
  /** 静音切换 */
  toggleMute(): void;
}

// ============ ScreenShake ============
interface IScreenShake {
  /** 轻微震动（命中反馈） */
  light(): void;
  /** 中等震动（受击） */
  medium(): void;
  /** 强烈震动（Boss 登场/踏地） */
  heavy(): void;
  /** 自定义震动 */
  custom(intensity: number, duration: number): void;
}
```

### 4.4 Entity 公开接口

```typescript
// ============ Player ============
interface IPlayer {
  readonly state: PlayerState;
  readonly hp: number;
  readonly maxHp: number;
  
  /** 造成伤害 */
  takeDamage(amount: number, source: string): void;
  /** 治疗 */
  heal(amount: number): void;
  /** 锁定玩家控制（过场时） */
  lockControl(): void;
  /** 解锁玩家控制 */
  unlockControl(): void;
  /** 设置位置（用于检查点复活） */
  setPosition(x: number, y: number): void;
  /** 设置无敌状态 */
  setInvincible(duration: number): void;
}

// ============ Enemy ============
interface IEnemy {
  readonly config: EnemyConfig;
  readonly state: EnemyState;
  readonly hp: number;
  
  /** 激活敌人（进入玩家视野） */
  activate(): void;
  /** 造成伤害 */
  takeDamage(amount: number): void;
  /** 停用并回收 */
  deactivate(): void;
}

// ============ BossMengHuoL1 ============
interface IBossMengHuoL1 {
  readonly state: BossState;
  readonly hp: number;
  readonly maxHp: number;
  readonly currentPhase: number;
  
  /** 激活 Boss */
  activate(): void;
  /** 造成伤害 */
  takeDamage(amount: number): void;
  /** 进入被击败状态 → 触发擒获 */
  triggerDefeat(): void;
  /** 进入擒获状态 */
  enterCaptured(): void;
}
```

---

## 5. 事件总线设计

### 5.1 事件通信规范

```
所有模块间通信遵循以下规则：

1. Entity → UI：      通过 EventBus 发射事件
   例：Player 受击 → emit(PLAYER_DAMAGED, {currentHp, maxHp})
        → HUD 订阅 PLAYER_DAMAGED → 更新血条

2. Scene → System：   直接调用 System 方法
   例：Level1Scene.create() → dialogSystem.loadLevelDialogs('level_01')

3. System → Scene：   通过 EventBus 发射事件
   例：CaptureSystem → emit(CAPTURE_COMPLETE, {levelId})
        → Level1Scene 订阅 → 切换到 ResultScene

4. Entity → Entity：  通过 Scene 的 Physics 系统处理碰撞
                      需要特殊逻辑时通过 EventBus
```

### 5.2 Phase 2 关键事件流

#### 关卡完整事件流

```
LEVEL_START
  → DIALOG_TRIGGER (开场对话)
    → DIALOG_START → DIALOG_END
  → 玩家操控开始
  → ENEMY_DEFEATED × N
  → BOSS_SPAWNED
  → CAMERA_LOCK (Boss 登场)
  → CAMERA_UNLOCK
  → BOSS_PHASE_CHANGE (70% HP)
  → BOSS_PHASE_CHANGE (30% HP)
  → BOSS_DEFEATED
  → CAPTURE_START
    → CAMERA_LOCK
    → BOSS 状态: DEFEATED → CAPTURED
    → CAPTURE_DIALOG_START → DIALOG_END (孟获台词)
    → CAPTURE_RELEASE_START → DIALOG_END (诸葛亮台词)
    → CAMERA_UNLOCK
  → CAPTURE_COMPLETE
  → LEVEL_COMPLETE
  → SCENE_TRANSITION → ResultScene
```

#### 玩家死亡重开流

```
PLAYER_DEATH
  → Level1Scene 收到
  → 可选：显示 "阵亡" 提示
  → 重置玩家到最近检查点
  → 恢复敌人生成
```

---

## 6. 数据流设计

### 6.1 资源加载流

```
index.html
  ↓
main.ts → new Phaser.Game(config)
  ↓
BootScene.preload()
  ├── 显示 "加载中..." 进度条
  ├── AssetLoader.loadManifest() → asset-manifest.json
  ├── 加载必需的 Sprite/Tileset（若文件不存在，用灰盒方块占位）
  └── 加载所有 JSON 数据文件
  ↓
BootScene.create()
  ├── 初始化所有 System 单例
  ├── SaveSystem.load() → 恢复存档
  └── scene.start('MainMenuScene')
```

### 6.2 第 1 关运行时数据流

```
MainMenuScene → 点击"开始游戏"
  ↓
Level1Scene.create()
  ├── 读取 levels.json 中 level_01 配置
  ├── DialogSystem.loadLevelDialogs('level_01') → dialogs.json
  ├── WeaponSystem.unlockWeapon('crossbow')
  ├── 创建 Tilemap (灰盒或正式 Tileset)
  ├── 创建 Player
  ├── 创建 Enemy 群组
  ├── 创建 BossMengHuoL1（初始不可见）
  ├── 创建 HUD、DialogBox、BossHealthBar
  ├── 设置 CameraSystem.follow(player)
  ├── 设置物理碰撞
  └── 触发 LEVEL_START → DIALOG_TRIGGER(开场对话)
  ↓
Level1Scene.update(time, delta) [每帧]
  ├── InputManager.update()
  ├── Player.update() ← 读取 InputManager 状态
  ├── Enemy.update() × N
  ├── BossMengHuoL1.update() [激活后]
  ├── CaptureSystem 状态检查
  └── CameraSystem 跟随/锁定
```

### 6.3 擒获流程数据流（核心差异化）

```
BOSS_DEFEATED 事件发射
  ↓
CaptureSystem.startCapture('menghuo_elephant')
  ├── phase = BOSS_DEFEATED
  ├── BossMengHuoL1.triggerDefeat()
  │     └── state: DEFEATED → 不播放死亡动画
  ├── emit(CAMERA_LOCK, {target: boss.position, duration: 2000})
  ├── 延迟 500ms
  ├── phase = CAPTURE_ANIM
  ├── BossMengHuoL1.enterCaptured()
  │     └── state: DEFEATED → CAPTURED（播放被擒动画）
  ├── 延迟 1500ms
  ├── phase = DIALOG_PLAYING
  ├── emit(CAPTURE_DIALOG_START, {dialogId: 'l1_capture_menghuo_01'})
  │     └── DialogSystem → DialogBox 显示孟获台词
  ├── 对话完成
  ├── emit(CAPTURE_RELEASE_START, {dialogId: 'l1_release_zhuge_01'})
  │     └── DialogSystem → DialogBox 显示诸葛亮台词
  ├── 对话完成
  ├── phase = COMPLETE
  ├── CameraSystem.unlock()
  └── emit(CAPTURE_COMPLETE, {levelId: 'level_01'})
        └── Level1Scene → SaveSystem.recordLevelCompletion()
        └── Level1Scene → SaveSystem.unlockLevel('level_02')
        └── 切换到 ResultScene
```

---

## 7. 数据规范

### 7.1 `levels.json` — 关卡配置

```json
{
  "levels": [
    {
      "id": "level_01",
      "name": "西洱河初战",
      "captureIndex": 1,
      "theme": "open_plain",
      "mengHuoMindset": "傲慢",
      "colorTheme": ["#4CAF50", "#64B5F6"],
      "music": "bgm_level_01",
      "map": "tilemap_level_01",
      "boss": "menghuo_elephant",
      "newMechanics": ["基础移动", "基础射击"],
      "dialogSequence": [
        "l1_opening_zhuge_advice",
        "l1_old_soldier_tip",
        "l1_boss_intro",
        "l1_capture_menghuo_01",
        "l1_release_zhuge_01"
      ],
      "storyFragment": "fragment_01",
      "playerWeaponUnlock": null,
      "parTimeSec": 600,
      "checkpoints": [
        {"id": "cp_01", "x": 800, "y": 400},
        {"id": "cp_02", "x": 2400, "y": 400}
      ],
      "enemySpawns": [
        {"type": "basic_soldier", "x": 600, "y": 400, "patrolRange": 100},
        {"type": "basic_soldier", "x": 900, "y": 400, "patrolRange": 150},
        {"type": "basic_soldier", "x": 1200, "y": 400, "patrolRange": 120},
        {"type": "basic_soldier", "x": 1600, "y": 380, "patrolRange": 100},
        {"type": "basic_soldier", "x": 2000, "y": 400, "patrolRange": 180}
      ],
      "bossTriggerX": 3200,
      "mapWidth": 4800,
      "mapHeight": 600
    }
  ]
}
```

### 7.2 `dialogs.json` — 第1关对话数据

```json
{
  "level_01": {
    "l1_opening_zhuge_advice": {
      "id": "l1_opening_zhuge_advice",
      "levelId": "level_01",
      "trigger": "level_start",
      "speaker": "诸葛亮",
      "portrait": "zhuge_liang",
      "text": "南中不平，北伐无以为继。此战所求，非杀戮，乃归心。",
      "skippable": true,
      "firstPlayLockSec": 0,
      "position": "center",
      "next": "l1_opening_zhuge_advice_02"
    },
    "l1_opening_zhuge_advice_02": {
      "id": "l1_opening_zhuge_advice_02",
      "levelId": "level_01",
      "trigger": "level_start",
      "speaker": "诸葛亮",
      "portrait": "zhuge_liang",
      "text": "你随我出征以来，屡立战功。此去西洱河，孟获必轻敌冒进。记住——我要活的。",
      "skippable": true,
      "firstPlayLockSec": 0,
      "position": "center",
      "next": null
    },
    "l1_old_soldier_tip": {
      "id": "l1_old_soldier_tip",
      "levelId": "level_01",
      "trigger": "combat_bark",
      "speaker": "张伯",
      "portrait": "zhang_bo",
      "text": "小子，别只顾往前冲，南中人的箭可不慢。",
      "skippable": true,
      "firstPlayLockSec": 0,
      "position": "top_right",
      "next": null
    },
    "l1_boss_intro": {
      "id": "l1_boss_intro",
      "levelId": "level_01",
      "trigger": "boss_pre",
      "speaker": "孟获",
      "portrait": "menghuo_angry",
      "text": "汉人小儿，也敢犯我南中！",
      "skippable": true,
      "firstPlayLockSec": 0,
      "position": "center",
      "next": null
    },
    "l1_boss_mid": {
      "id": "l1_boss_mid",
      "levelId": "level_01",
      "trigger": "boss_mid",
      "speaker": "孟获",
      "portrait": "menghuo_angry",
      "text": "哼……有几分本事。但还不够！",
      "skippable": true,
      "firstPlayLockSec": 0,
      "position": "center",
      "next": null
    },
    "l1_capture_menghuo_01": {
      "id": "l1_capture_menghuo_01",
      "levelId": "level_01",
      "trigger": "capture",
      "speaker": "孟获",
      "portrait": "menghuo_captured",
      "text": "诡计！汉人狡诈，我不服！若堂堂正正一战，胜负未可知！",
      "skippable": false,
      "firstPlayLockSec": 2.0,
      "position": "center",
      "next": null
    },
    "l1_release_zhuge_01": {
      "id": "l1_release_zhuge_01",
      "levelId": "level_01",
      "trigger": "release",
      "speaker": "诸葛亮",
      "portrait": "zhuge_liang",
      "text": "将军勇则勇矣，然未识天时。请回营整军，改日再战。",
      "skippable": false,
      "firstPlayLockSec": 2.0,
      "position": "center",
      "next": "l1_release_zhuge_02"
    },
    "l1_release_zhuge_02": {
      "id": "l1_release_zhuge_02",
      "levelId": "level_01",
      "trigger": "release",
      "speaker": "诸葛亮",
      "portrait": "zhuge_liang",
      "text": "一擒不足以服其心。你做得很好——去歇息吧。",
      "skippable": false,
      "firstPlayLockSec": 1.5,
      "position": "center",
      "next": null
    }
  }
}
```

### 7.3 `boss-patterns.json` — Boss 行为模板

```json
{
  "menghuo_elephant": {
    "id": "menghuo_elephant",
    "attacks": [
      {
        "name": "charge",
        "type": "charge",
        "cooldownMs": 4000,
        "warningMs": 800,
        "damage": 2,
        "telegraph": "boss_warning_charge"
      },
      {
        "name": "stomp",
        "type": "stomp",
        "cooldownMs": 3000,
        "warningMs": 600,
        "damage": 1,
        "telegraph": "boss_warning_stomp"
      },
      {
        "name": "swipe",
        "type": "swipe",
        "cooldownMs": 2500,
        "warningMs": 500,
        "damage": 1,
        "telegraph": "boss_warning_swipe"
      }
    ],
    "phaseTransitions": [
      {
        "hpPercent": 0.7,
        "newAttacks": ["charge"],
        "speedMultiplier": 1.0,
        "dialogueId": "l1_boss_mid"
      },
      {
        "hpPercent": 0.3,
        "newAttacks": ["stomp", "swipe"],
        "speedMultiplier": 1.3,
        "dialogueId": null
      }
    ]
  }
}
```

### 7.4 `fragments.json` — 故事碎片

```json
{
  "fragments": [
    {
      "id": "fragment_01",
      "levelId": "level_01",
      "title": "诸葛亮南征背景",
      "text": "建兴三年（公元225年），蜀汉丞相诸葛亮率军南征。南中诸郡自先主刘备去世后叛乱不断，其中益州郡大姓雍闿、牂柯太守朱褒、越嶲夷王高定相继起兵。诸葛亮以'攻心为上，攻城为下'为策，深入不毛之地，开启了七擒七纵的传奇。",
      "unlockHint": "隐藏在西洱河岸边的一处石碑旁"
    }
  ]
}
```

### 7.5 `strategy-advice.json` — AI Fallback 模板

```json
{
  "advice": [
    {
      "playStyle": "aggressive",
      "text": "你锐气可嘉，然南中地势诡谲。下关切记：勇不可无，躁不可有。"
    },
    {
      "playStyle": "steady",
      "text": "你能稳步推进，已得用兵之要。前路更险，仍须先观其势，再发其箭。"
    },
    {
      "playStyle": "struggling",
      "text": "胜败乃兵家常事。南中之险，不在一敌一阵，而在不熟其地。慢行，细看。"
    },
    {
      "playStyle": "explorer",
      "text": "你善察细节，此为良习。战场之中，往往一处火把、一段足迹，便是破局之机。"
    }
  ]
}
```

### 7.6 `asset-manifest.json` — 资源清单

```json
{
  "sprites": [
    {
      "id": "player_idle",
      "type": "sprite_sheet",
      "path": "assets/sprites/player/player_idle.png",
      "frameWidth": 32,
      "frameHeight": 48,
      "frames": 4,
      "fallback": "rect_32x48_green"
    },
    {
      "id": "player_run",
      "type": "sprite_sheet",
      "path": "assets/sprites/player/player_run.png",
      "frameWidth": 32,
      "frameHeight": 48,
      "frames": 6,
      "fallback": "rect_32x48_green"
    }
  ],
  "fallbacks": {
    "rect_32x48_green": { "width": 32, "height": 48, "color": 0x4caf50 },
    "rect_32x32_red": { "width": 32, "height": 32, "color": 0xf44336 },
    "rect_96x64_purple": { "width": 96, "height": 64, "color": 0x9c27b0 },
    "rect_16x16_gray": { "width": 16, "height": 16, "color": 0x9e9e9e }
  }
}
```

---

## 8. 场景流转设计

### 8.1 第 1 关纵切完整场景图

```
                    ┌─────────────┐
                    │  BootScene  │  加载资源 + 初始化系统
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │MainMenuScene│  标题 + "开始游戏"
                    └──────┬──────┘
                           │ 点击开始
                    ┌──────▼──────┐
              ┌─────│ Level1Scene │
              │     └──────┬──────┘
              │            │
              │     ┌──────▼──────┐
              │     │ 玩家探索/战斗│  ← 死亡 → 检查点复活
              │     └──────┬──────┘
              │            │ 到达 Boss 区
              │     ┌──────▼──────┐
              │     │  Boss 战    │  ← 死亡 → 回到 Boss 区入口
              │     └──────┬──────┘
              │            │ Boss 血量归零
              │     ┌──────▼──────┐
              │     │ 擒获演出     │  CameraSystem 锁定
              │     │ 孟获台词     │  DialogBox
              │     └──────┬──────┘
              │            │
              │     ┌──────▼──────┐
              │     │ 释放演出     │  诸葛亮台词
              │     └──────┬──────┘
              │            │
              │     ┌──────▼──────┐
              │     │ ResultScene │  结算 + 下一关解锁
              │     └──────┬──────┘
              │            │
              └────────────┘ 返回主菜单
```

### 8.2 场景切换接口

```typescript
// 所有 Scene 切换都应通过此统一方法
interface ISceneTransition {
  /**
   * 切换到目标场景
   * @param targetScene 目标场景 key
   * @param data 传递的数据
   * @param effect 过渡效果（可选）
   */
  goTo(
    targetScene: string, 
    data?: Record<string, unknown>,
    effect?: 'fade' | 'none'
  ): void;
}
```

---

## 9. 开发顺序建议

按照依赖关系和风险递减原则，Phase 2 实现顺序如下：

| 批次 | 任务 | 依赖 | 验收方式 |
|------|------|------|---------|
| **Batch 0** | 工程搭建 + EventBus + Types | 无 | `npm run dev` 浏览器看到空 Phaser 场景 |
| **Batch 1** | InputManager + Player (移动+跳跃) | Batch 0 | 方块在场景中移动跳跃 |
| **Batch 2** | WeaponSystem + Player (射击) | Batch 1 | 方块能八方向发射子弹方块 |
| **Batch 3** | Enemy + 灰盒地图 | Batch 2 | 蛮兵方块巡逻，可被击杀 |
| **Batch 4** | CameraSystem + HUD | Batch 3 | 镜头跟随，血条显示 |
| **Batch 5** | BossMengHuoL1 | Batch 4 | Boss 三种攻击，血条变化 |
| **Batch 6** | DialogSystem + DialogBox | Batch 3 | 对话可触发、显示、跳过 |
| **Batch 7** | CaptureSystem + Boss 击败不死亡 | Batch 5+6 | **核心验证：Boss 击败后进入擒获** |
| **Batch 8** | SaveSystem + ResultScene | Batch 7 | 通关后存档，结算显示 |
| **Batch 9** | StorySystem (碎片) + ScreenShake | Batch 8 | 隐藏碎片收集，打击感增强 |
| **Batch 10** | MainMenuScene + 场景串联 | Batch 8 | 完整流程走通 |
| **Batch 11** | AudioManager + 基础音效占位 | Batch 10 | 无音频也不报错 |

### 并行开发建议

- **Batch 1-3** 可串行（基础操作闭环必须先通）
- **Batch 4-5** 与 **Batch 6** 可并行（Camera/HUD/Boss 与 Dialog 独立）
- **Batch 7** 是核心集成点，必须串行并充分测试
- **Batch 8-11** 可部分并行

---

## 10. 验收清单

### 10.1 架构验收

- [ ] EventBus 作为唯一跨模块通信渠道，无直接模块间 import
- [ ] 所有 JSON 数据文件可在不修改代码的情况下替换内容
- [ ] 每个 Entity 有独立的状态机
- [ ] 每个 System 是单例，通过 GameContext 获取
- [ ] Scene 之间无直接引用，通过 scene.start(key, data) 切换
- [ ] 任何美术资源缺失时自动使用灰盒方块 fallback

### 10.2 接口验收

- [ ] 所有 System 公开接口在 `interface` 中定义
- [ ] 所有事件在 `events.types.ts` 中枚举
- [ ] 事件 Payload 类型完整，无 `any`
- [ ] Module A 调用 Module B 的方法前，B 已完成初始化

### 10.3 功能验收（对应工作流 Phase 2 阶段门）

- [ ] 玩家 30 秒内理解移动、跳跃、射击
- [ ] 玩家 8-10 分钟内完整通关第 1 关
- [ ] Boss 被击败后不死亡，进入"擒获"演出
- [ ] 诸葛亮释放孟获的演出完整出现
- [ ] 通关后明确感受："打赢不是结束，故事才刚开始"
- [ ] 对话系统可跳过（关键擒获过场首次不可跳）
- [ ] 无 P0 阻塞 Bug

---

*此架构文档对应 Phase 2 "第1关纵切原型"，后续 Phase 4 扩展 7 关时将在此架构基础上扩展 Enemy 类型和 Boss 变体。*
