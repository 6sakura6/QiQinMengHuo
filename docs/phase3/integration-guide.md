# Phase 3 美术资源 → 第1关 逐步替换流程

> **文档版本**: 2.0（经代码审查修订）  
> **创建日期**: 2026-06-19  
> **修订日期**: 2026-06-19（v2.0 修正 4 个 P0 技术错误 + 4 个 P1 遗漏）  
> **目标**: 将 `docs/phase3/assets/` 中的 v2 美术资源逐步集成到 `src/` Phase 2 代码中，替换第1关所有灰盒占位  
> **前置条件**: Phase 3 资源已验收（77项通过），P0 问题已修复（manifest v2 + RGBA 透明通道）

---

## 总览

| # | 步骤 | 影响范围 | 复杂度 | 可独立验证 |
|---|------|---------|--------|-----------|
| 1 | 拷贝+重命名资源到 `public/assets/` | 文件系统 | ⭐ 低 | 文件存在即可 |
| 2 | 实现 `BootScene.preload()` + 加载完成守卫 | BootScene.ts | ⭐⭐ 中 | 控制台加载日志 |
| 3 | 替换 Player 精灵 | Player.ts + Level1Scene.ts | ⭐⭐ 中 | 玩家显示像素角色 |
| 4 | 替换 Enemy 精灵 | Enemy.ts + Level1Scene.ts | ⭐⭐ 中 | 蛮兵显示像素角色 |
| 5 | 替换 Boss 精灵 | BossMengHuoL1.ts + Level1Scene.ts | ⭐⭐⭐ 较高 | Boss 显示像素角色 |
| 6 | 替换 HUD + UI（Python 预切片） | HUD.ts, DialogBox.ts 等 | ⭐⭐⭐ 较高 | UI 显示国风组件 |
| 7 | 替换 Tileset 地图 | Level1Scene.ts | ⭐⭐⭐⭐ 高 | 地图显示真实场景 |
| 8 | 集成音频 | AudioManager | ⭐⭐ 中 | 有声效播放 |
| 9 | NPC 肖像 + 碎片标记 + 背景天空 | DialogBox.ts, Level1Scene.ts | ⭐⭐ 中 | 对话显示头像 |

---

## 关键约束

1. **每一步完成 → 立即 `npm run build` → 无编译错误**，不积累问题
2. **灰度上线原则**: 先换精灵实体，后换地图 tileset（精灵替换失败容易排查；tileset 涉及地图重排，放最后）
3. **保留灰盒 fallback**: 不删除灰盒代码，用 `this.textures.exists(key)` 判断——有真实纹理用真实，没有自动退化为灰盒。这符合架构约定"缺失自动退化灰盒"
4. **动画帧声明以 manifest 为准**: `docs/phase3/data/asset-manifest.json` 是帧划分唯一依据
5. **文件路径用相对路径引用**: Phaser `this.load.image(key, 'assets/sprites/...')` 基于 `public/`
6. **动画注册集中在 `Level1Scene.create()`**: 不在 Entity 构造函数中注册，避免 `scene.restart()` 后重复创建

---

## 文件对照表

| 实体 | 灰盒 key | 灰盒尺寸 | Phase 3 尺寸 | Phase 3 帧数 | 拷贝后短文件名 | 灰盒是否保留 |
|------|---------|---------|-------------|------------|--------------|-------------|
| Player | `player_placeholder` | 24×40 | **48×48** | 32 | `player.png` | ✅ fallback |
| Enemy | `enemy_placeholder` | 24×40 | **32×32** | 18 | `enemy_barbarian.png` | ✅ fallback |
| Boss | `boss_meng_huo_placeholder` | 64×80 | **96×96** | 35 | `boss_menghuo.png` | ✅ fallback |
| Bullet | `bullet_placeholder` | 8×4 | ✅ 暂不改 | - | - | ✅ 保留灰盒 |
| 碎片标记 | `fragment_marker` | 16×16 | ⚠️ 无 Phase 3 资源 | - | - | ✅ 保留灰盒 |
| 背景天空 | `sky_bg` | 5000×540 | tileset 含 mountains(32-35) | - | `tileset_l1.png` | ✅ fallback |
| Tileset | `ground_tile` | 32×32 | **32×32** (40 tiles) | - | `tileset_l1.png` | ✅ fallback |
| UI 组件包 | (无灰盒) | - | 1024×943 | - | `ui_kit.png` → 预切片 | - |

> **⚠️ 尺寸变化需同步调整**: Player 24×40 → 48×48，碰撞体 `body.setSize()` 和 `setOffset()` 需要重新计算

---

## 步骤详解

---

### 步骤 1: 拷贝+重命名资源到 `public/assets/` ⭐ 低

**目的**: Phase 3 v2 资源从 `docs/phase3/assets/` 部署到 `public/assets/`，**同时重命名为短文件名**，避免代码中出现 60 字符长的路径字符串

**操作**:

```bash
# Windows (PowerShell) — 拷贝 + 重命名
robocopy "docs/phase3/assets" "public/assets" /E /NFL /NDL

# 然后重命名 v2 文件为短名（手动或用脚本）
```

**重命名映射表**:

| 原始文件名（v2） | 重命名为 |
|-----------------|---------|
| `sprites/player/Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-56-41.png` | `sprites/player/player.png` |
| `sprites/boss/Pixel_art_sprite_sheet_for_Bos_2026-06-16T04-56-47.png` | `sprites/boss/boss_menghuo.png` |
| `sprites/enemy/Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-56-52.png` | `sprites/enemy/enemy_barbarian.png` |
| `sprites/npc/Pixel_art_portrait_of_Zhuge_Li_2026-06-16T04-58-01.png` | `sprites/npc/zhugeliang.png` |
| `sprites/npc/Pixel_art_NPC_portrait_of_elde_2026-06-16T04-58-35.png` | `sprites/npc/zhangbo.png` |
| `tilesets/Pixel_art_tileset_for_Level_1__2026-06-16T04-57-23.png` | `tilesets/tileset_l1.png` |
| `ui/Pixel_art_UI_component_kit_for_2026-06-16T04-57-28.png` | `ui/ui_kit.png` |

> v1 原始文件可保留在目录中备查，不影响加载（代码只引用短名）

**验证标准**:
- `public/assets/sprites/player/player.png` 存在
- `public/assets/tilesets/tileset_l1.png` 存在
- 文件数: 至少 7 张 v2 RGBA 精灵图 + 14 个音频文件

---

### 步骤 2: 实现 `BootScene.preload()` + 加载完成守卫 ⭐⭐ 中

**当前状态**: `BootScene.preload()` 为空，资源加载完全在 `Level1Scene.buildGrayboxTextures()` 中生成

**目标**: 在 `BootScene` 中集中加载所有 Phase 3 外部文件，**且必须等待加载完成后才跳转场景**

**⚠️ 关键问题**: 当前 BootScene 用固定 1.2s tween 然后跳转 MainMenuScene（L44-54），不等待 `load.complete`。如果外部资源没加载完就跳转，纹理缓存为空 → Level1Scene 崩溃。

**操作**:

修改 `src/scenes/BootScene.ts`：

```typescript
preload(): void {
  const A = 'assets';  // 短前缀

  // ── 精灵表（sprite sheets） ─────────────────────
  this.load.spritesheet('player',         `${A}/sprites/player/player.png`,         { frameWidth: 48, frameHeight: 48 });
  this.load.spritesheet('enemy_barbarian',`${A}/sprites/enemy/enemy_barbarian.png`, { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('boss_menghuo',   `${A}/sprites/boss/boss_menghuo.png`,     { frameWidth: 96, frameHeight: 96 });

  // ── 肖像（单帧图片） ─────────────────────────────
  this.load.image('portrait_zhugeliang', `${A}/sprites/npc/zhugeliang.png`);
  this.load.image('portrait_zhangbo',    `${A}/sprites/npc/zhangbo.png`);

  // ── Tileset ─────────────────────────────────────
  this.load.image('tileset_l1', `${A}/tilesets/tileset_l1.png`);

  // ── UI 组件包 ────────────────────────────────────
  this.load.image('ui_kit', `${A}/ui/ui_kit.png`);

  // ── 音频 ────────────────────────────────────────
  this.load.audio('bgm_level_01',      `${A}/audio/bgm/bgm_level_01.wav`);
  this.load.audio('bgm_level_01_boss', `${A}/audio/bgm/bgm_level_01_boss.wav`);
  this.load.audio('sfx_shoot',         `${A}/audio/sfx/shoot.wav`);
  this.load.audio('sfx_hit',           `${A}/audio/sfx/hit.wav`);
  this.load.audio('sfx_jump',          `${A}/audio/sfx/jump.wav`);
  this.load.audio('sfx_boss_charge',   `${A}/audio/sfx/boss_charge.wav`);
  this.load.audio('sfx_boss_stomp',    `${A}/audio/sfx/boss_stomp.wav`);
  this.load.audio('sfx_dialog_popup',  `${A}/audio/sfx/dialog_popup.wav`);
  this.load.audio('sfx_capture',       `${A}/audio/sfx/capture.wav`);
  this.load.audio('sfx_victory',       `${A}/audio/sfx/victory.wav`);
}
```

**修改 `create()` — 加载完成守卫**:

```typescript
create(): void {
  // ... 现有 SaveSystem 初始化 + 文本显示 ...

  // ⚠️ 关键: 等待加载完成后才跳转
  if (this.load.isLoading()) {
    this.load.once('complete', () => {
      this.transitionToMenu();
    });
    // 如果加载卡住（极端情况），5s 后强制跳转
    this.time.delayedCall(5000, () => {
      if (this.scene.isActive()) this.transitionToMenu();
    });
  } else {
    // 没有外部资源需要加载（灰盒模式），直接走原有 tween 流程
    this.tweens.add({
      targets: sub,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.transitionToMenu(),
    });
  }
}

private transitionToMenu(): void {
  this.scene.start('MainMenuScene');
}
```

**验证标准**:
- `npm run build` 编译通过
- 启动游戏，控制台无 "Missing texture key" 错误
- 加载完成后才跳转到 MainMenuScene（不是固定 1.2s 后跳）
- 浏览器 Network 面板可见所有资源请求 200

---

### 步骤 3: 替换 Player 精灵 ⭐⭐ 中

**影响文件**: `src/entities/Player.ts` + `src/scenes/Level1Scene.ts`

**核心变化**:

```typescript
// ── BEFORE (Player.ts 第 37 行) ──
super(scene, x, y, 'player_placeholder');

// ── AFTER (带 fallback 守卫) ──
const texKey = scene.textures.exists('player') ? 'player' : 'player_placeholder';
super(scene, x, y, texKey);
```

```typescript
// ── BEFORE (Player.ts 第 42-43 行) ──
body.setSize(24, 40);
body.setOffset(4, 8);

// ── AFTER (48×48 sprite → 碰撞体略小于视觉，居中) ──
// body 尺寸 30×44，offset = ((48-30)/2, (48-44)/2) = (9, 2)
body.setSize(30, 44);
body.setOffset(9, 2);
```

**⚠️ 动画状态缺口**: Player 状态机有 8 个状态（`PlayerState` 枚举），但 manifest 只定义了 6 种动画：

| PlayerState | manifest 动画 | 处理方式 |
|-------------|--------------|---------|
| IDLE | `idle` (0-3) | ✅ 直接映射 |
| RUN | `run` (4-9) | ✅ 直接映射 |
| JUMP | `jump` (10-13) | ✅ 直接映射 |
| SHOOT | `shoot` (14-17) | ✅ 直接映射 |
| HURT | `hurt` (18-19) | ✅ 直接映射 |
| DIE | `die` (20-25) | ✅ 直接映射 |
| **FALL** | ❌ 无 | 复用 `jump` 最后一帧（静态） |
| **CUTSCENE_LOCK** | ❌ 无 | 复用 `idle` 动画 |

**动画注册**（在 `Level1Scene.create()` 中集中注册，不在 Entity 构造函数中）:

```typescript
// Level1Scene.create() 中新增:
private registerAnimations(): void {
  // ── Player 动画 ──
  if (!this.anims.exists('player_idle')) {
    this.anims.create({ key: 'player_idle',  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),  frameRate: 6,  repeat: -1 });
    this.anims.create({ key: 'player_run',   frames: this.anims.generateFrameNumbers('player', { start: 4, end: 9 }),  frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'player_jump',  frames: this.anims.generateFrameNumbers('player', { start: 10, end: 13 }), frameRate: 8,  repeat: 0 });
    this.anims.create({ key: 'player_shoot', frames: this.anims.generateFrameNumbers('player', { start: 14, end: 17 }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'player_hurt',  frames: this.anims.generateFrameNumbers('player', { start: 18, end: 19 }), frameRate: 8,  repeat: 0 });
    this.anims.create({ key: 'player_die',   frames: this.anims.generateFrameNumbers('player', { start: 20, end: 25 }), frameRate: 10, repeat: 0 });
  }
  // Enemy / Boss 动画同理（见步骤 4/5）
}
```

**播放逻辑**（修改 `Player.setPlayerState()`，当前 L137-149）:

```typescript
private setPlayerState(next: PlayerState): void {
  if (next === this._playerState) return;
  const prev = this._playerState;
  this._playerState = next;

  // ── 播放动画（有真实纹理时） ──
  if (this.scene.textures.exists('player')) {
    switch (next) {
      case PlayerState.IDLE:           this.play('player_idle', true); break;
      case PlayerState.RUN:            this.play('player_run', true); break;
      case PlayerState.JUMP:           this.play('player_jump', true); break;
      case PlayerState.FALL:           this.anims.play('player_jump', true); this.anims.pause(); break; // 复用 jump 末帧
      case PlayerState.SHOOT:          this.play('player_shoot', true); break;
      case PlayerState.HURT:           this.play('player_hurt', true); break;
      case PlayerState.DEATH:          this.play('player_die', true); break;
      case PlayerState.CUTSCENE_LOCK:  this.play('player_idle', true); break; // 复用 idle
    }
  }

  // 受伤闪烁（现有逻辑：alpha 切换，保留不变）
  this.setAlpha(next === PlayerState.HURT ? 0.5 : 1);

  this.bus.emit(GameEvent.PLAYER_STATE_CHANGE, { from: prev, to: next });
}
```

> **注意**: 当前代码 L143 动画播放被注释掉了（`// this.anims.play(...)`），需要取消注释并替换为上面的 switch 逻辑。

**验证标准**:
- `npm run build` 编译通过
- 进入第1关，玩家显示为像素汉军士卒（蓝色调 + 鳞甲 + 头带）
- idle / 跑动 / 跳跃 / 射击 动画正确切换
- FALL 状态复用 jump 末帧，不会消失或闪烁
- 受伤 alpha 闪烁不变（现有逻辑无需改动）
- 死亡动画播放后进入重生流程正常

---

### 步骤 4: 替换 Enemy 精灵 ⭐⭐ 中

**影响文件**: `src/entities/Enemy.ts` + `src/scenes/Level1Scene.ts`

**核心变化**:

```typescript
// ── BEFORE (Enemy.ts 第 55 行) ──
super(scene, x, y, 'enemy_placeholder');

// ── AFTER (带 fallback) ──
const texKey = scene.textures.exists('enemy_barbarian') ? 'enemy_barbarian' : 'enemy_placeholder';
super(scene, x, y, texKey);
```

尺寸从 24×40 变为 32×32，碰撞体调整:

```typescript
// 32×32 sprite → 碰撞体 28×28，居中
// offset = ((32-28)/2, (32-28)/2) = (2, 2)
body.setSize(28, 28);
body.setOffset(2, 2);
```

**动画注册**（在 `Level1Scene.registerAnimations()` 中）:

```typescript
if (!this.anims.exists('enemy_patrol')) {
  this.anims.create({ key: 'enemy_patrol', frames: this.anims.generateFrameNumbers('enemy_barbarian', { start: 0, end: 3 }),  frameRate: 5,  repeat: -1 });
  this.anims.create({ key: 'enemy_attack', frames: this.anims.generateFrameNumbers('enemy_barbarian', { start: 4, end: 9 }),  frameRate: 10, repeat: -1 });
  this.anims.create({ key: 'enemy_hurt',   frames: this.anims.generateFrameNumbers('enemy_barbarian', { start: 10, end: 12 }), frameRate: 8,  repeat: 0 });
  this.anims.create({ key: 'enemy_death',  frames: this.anims.generateFrameNumbers('enemy_barbarian', { start: 13, end: 17 }), frameRate: 10, repeat: 0 });
}
```

**⚠️ 关于受伤闪烁**: Enemy.ts L95 **已经使用 alpha 闪烁**（`this.setAlpha(Math.floor(this._hurtTimer / 50) % 2 === 0 ? 0.4 : 1)`），不使用 `setTint`。因此**无需额外修改闪烁逻辑**——真实精灵图上的 alpha 闪烁效果同样有效。

**播放逻辑**（在 Enemy 状态切换处添加动画播放）:

```typescript
// 在 Enemy 的状态切换中添加:
if (this.scene.textures.exists('enemy_barbarian')) {
  switch (newState) {
    case EnemyState.PATROL: this.play('enemy_patrol', true); break;
    case EnemyState.CHASE:  this.play('enemy_patrol', true); break; // 复用巡逻
    case EnemyState.ATTACK: this.play('enemy_attack', true); break;
    case EnemyState.HURT:   this.play('enemy_hurt', true); break;
    case EnemyState.DEATH:  this.play('enemy_death', true); break;
  }
}
```

---

### 步骤 5: 替换 Boss 精灵 ⭐⭐⭐ 较高

**影响文件**: `src/entities/BossMengHuoL1.ts` + `src/scenes/Level1Scene.ts`

**核心变化**:

```typescript
// ── BEFORE (BossMengHuoL1.ts 第 108 行) ──
super(scene, x, y, 'boss_meng_huo_placeholder');

// ── AFTER (带 fallback) ──
const texKey = scene.textures.exists('boss_menghuo') ? 'boss_menghuo' : 'boss_meng_huo_placeholder';
super(scene, x, y, texKey);
```

尺寸从 64×80 变为 96×96，碰撞体调整:

```typescript
// BEFORE: body.setSize(58, 74); body.setOffset(3, 3);
// AFTER (96×96 sprite，大象底部宽、骑手占上部):
// 大象身体约占下半部分 60px 高，宽度约 80px
// offset X = (96-80)/2 = 8, offset Y = 96-60 = 36（底部对齐）
body.setSize(80, 60);
body.setOffset(8, 36);
```

> **⚠️ 大象碰撞体需要实测调整**: `setOffset(8, 36)` 是估计值。建议在第一次运行后打开 `physics.config.debug = true` 可视化碰撞框，根据骑手/大象实际像素占比微调。

**动画注册**（在 `Level1Scene.registerAnimations()` 中）:

```typescript
if (!this.anims.exists('boss_idle')) {
  this.anims.create({ key: 'boss_idle',     frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 0, end: 3 }),   frameRate: 5,  repeat: -1 });
  this.anims.create({ key: 'boss_charge',   frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 4, end: 9 }),   frameRate: 10, repeat: 0 });
  this.anims.create({ key: 'boss_stomp',    frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 10, end: 13 }), frameRate: 8,  repeat: 0 });
  this.anims.create({ key: 'boss_sweep',    frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 14, end: 17 }), frameRate: 10, repeat: 0 });
  this.anims.create({ key: 'boss_hurt',     frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 18, end: 19 }), frameRate: 8,  repeat: 0 });
  this.anims.create({ key: 'boss_fall',     frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 20, end: 25 }), frameRate: 12, repeat: 0 });
  this.anims.create({ key: 'boss_captured', frames: this.anims.generateFrameNumbers('boss_menghuo', { start: 26, end: 29 }), frameRate: 6,  repeat: 0 });
}
```

**状态机 → 动画映射**（在 `BossMengHuoL1` 的状态切换处）:

| BossState | 动画 key | 
|-----------|---------|
| IDLE | `boss_idle` |
| CHARGING | `boss_charge` |
| STOMP | `boss_stomp` |
| SWIPE | `boss_sweep` |
| HURT | `boss_hurt` |
| DEFEATED | `boss_fall` |
| CAPTURED | `boss_captured` |

```typescript
// 在 Boss 状态切换中添加:
if (this.scene.textures.exists('boss_menghuo')) {
  switch (newState) {
    case BossState.IDLE:      this.play('boss_idle', true); break;
    case BossState.CHARGING:  this.play('boss_charge', true); break;
    case BossState.STOMP:     this.play('boss_stomp', true); break;
    case BossState.SWIPE:     this.play('boss_sweep', true); break;
    case BossState.HURT:      this.play('boss_hurt', true); break;
    case BossState.DEFEATED:  this.play('boss_fall', true); break;
    case BossState.CAPTURED:  this.play('boss_captured', true); break;
  }
}
```

**特别注意**: Boss 的 `triggerDefeat()` 不再淡出消失（Batch 7 已移除），改为播放 `boss_captured` 动画 — 现在有真实动画了，直接 `play('boss_captured')` 即可。

**验证标准**:
- Boss 在 `BOSS_TRIGGER_X=3200` 处触发后显示骑象孟获（紫色调 + 金饰）
- 所有 7 种动画正确映射（charge/stomp/sweep 攻击动画与碰撞判定同步）
- 擒获流程播放 `captured` 动画后正确过渡到 ResultScene

---

### 步骤 6: 替换 HUD + UI（Python 预切片方案） ⭐⭐⭐ 较高

**当前状态**: HUD 用 Graphics API 画矩形（血条红绿、冷却条灰橙），DialogBox 用 `rexUI` 或类似方法

**⚠️ v1 版的 `setCrop` 方案是错误的**: Phaser 的 `setCrop` 是裁剪 Image 的可见区域，不是从大图里提取子纹理。按 setCrop 写法会把整张 1024×943 的 UI 图放在 HUD 位置然后只显示一小块——坐标和缩放全乱。

**正确方案: Python 预切片为独立 PNG**

**UI 精灵表布局**（来自 manifest）:

| 组件 | 坐标 (x,y) | 尺寸 (w×h) | 输出文件名 |
|------|-----------|-----------|-----------|
| player_hp_bar | (24, 24) | 200×24 | `ui_hp_bar.png` |
| boss_hp_bar | (250, 20) | 780×44 | `ui_boss_hp_bar.png` |
| dialog_box | (80, 500) | 1120×150 | `ui_dialog_box.png` |
| weapon_panel | (960, 585) | 280×105 | `ui_weapon_panel.png` |

**切片脚本**（在步骤 1 拷贝后运行）:

```python
from PIL import Image
from pathlib import Path

ui_kit = Image.open("public/assets/ui/ui_kit.png")

regions = [
    ("ui_hp_bar",       24,  24,  200, 24),
    ("ui_boss_hp_bar",  250, 20,  780, 44),
    ("ui_dialog_box",   80,  500, 1120, 150),
    ("ui_weapon_panel", 960, 585, 280, 105),
]

out_dir = Path("public/assets/ui")
for name, x, y, w, h in regions:
    crop = ui_kit.crop((x, y, x + w, y + h))
    crop.save(out_dir / f"{name}.png", "PNG", optimize=True)
    print(f"  {name}.png: {w}x{h} -> {crop.size}")
```

**BootScene.preload() 追加**:

```typescript
// UI 组件（预切片后的独立文件）
this.load.image('ui_hp_bar',       `${A}/ui/ui_hp_bar.png`);
this.load.image('ui_boss_hp_bar',  `${A}/ui/ui_boss_hp_bar.png`);
this.load.image('ui_dialog_box',   `${A}/ui/ui_dialog_box.png`);
this.load.image('ui_weapon_panel', `${A}/ui/ui_weapon_panel.png`);
```

**HUD 修改** (`src/ui/HUD.ts`): 将 Graphics 矩形替换为 Image + 裁剪宽度实现血量变化:

```typescript
// 血条背景
const hpBg = scene.add.image(HP_BAR_X, HP_BAR_Y, 'ui_hp_bar')
  .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
// 血条前景（用 setDisplaySize 按比例缩放宽度）
const hpFill = scene.add.image(HP_BAR_X, HP_BAR_Y, 'ui_hp_bar')
  .setOrigin(0, 0).setScrollFactor(0).setDepth(101)
  .setCrop(0, 0, HP_BAR_W, HP_BAR_H);  // 初始满血

// 更新血量时:
updateHp(currentHp: number, maxHp: number): void {
  const ratio = currentHp / maxHp;
  hpFill.setDisplaySize(HP_BAR_W * ratio, HP_BAR_H);
}
```

> **⚠️ 为什么 `setDisplaySize` 可以而 `setCrop` 不行**: `setDisplaySize` 缩放整个 Image 的显示尺寸，适合做血条缩短效果。`setCrop` 是裁剪可见区域但不改变 Image 在场景中的定位锚点，用于从大图提取子纹理是错误用法。

**建议**: 这一步**单独作为一个子批次**，不和其他步骤混做。

---

### 步骤 7: 替换 Tileset 地图 ⭐⭐⭐⭐ 高

**当前状态**: 地面和平台由 `Level1Scene.buildMap()` 用 `ground_tile` + `PLATFORM_CONFIGS` 代码生成灰盒矩形

**tileset 规格**（来自 manifest）:

| 属性 | 值 |
|------|-----|
| 文件 | `tileset_l1.png` (拷贝重命名后) |
| 尺寸 | 1024×943 |
| Tile 尺寸 | 32×32 |
| 列数 | 16 |
| 总 tile 数 | 40 |
| Tile 类型 | grass(0-3), dirt_path(4-5), water(8-11), wood_platform(16-17), stone_platform(18-19), bamboo(24-26), rocks(27-28), mountains(32-35) |

**分两阶段**:

#### 7a. 最小可用方案（TileSprite 平铺地面）

保留当前的 `PLATFORM_CONFIGS` 数组和平台物理体布局，只把 `ground_tile` 灰盒换成 tileset 中的 `grass` tile 作为地面贴图。

**⚠️ v1 版的 `setCrop` 逐 tile 铺设是错误的**: 5000px 地图会产生数百个 Image 对象，性能炸裂。

**正确做法: 用 `TileSprite` 平铺**:

```typescript
// 地面: 用 TileSprite 平铺 grass tile（从 tileset 中切出第 0 号 tile）
// 先从 tileset 中提取 grass tile 为独立纹理
if (!this.textures.exists('grass_tile')) {
  this.textures.addImage('grass_tile',
    this.textures.get('tileset_l1').get(0).source
  ); // TODO: 需要进一步裁剪到 32x32
}

// 更简洁的方式: 直接用 TileSprite 引用 tileset 纹理
const ground = this.add.tileSprite(0, GROUND_Y, MAP_WIDTH, TILE_SIZE * 3, 'tileset_l1')
  .setOrigin(0, 0)
  .setDepth(0);
// TileSprite 会自动平铺整张 tileset 图——这不精确
// 精确方案见 7b
```

> **更实际的 7a 方案**: 用 Python 从 tileset 中提取 grass tile (0-3) 为独立文件 `grass.png`，然后:
> ```typescript
> const ground = this.add.tileSprite(0, GROUND_Y, MAP_WIDTH, TILE_SIZE * 3, 'grass')
>   .setOrigin(0, 0).setDepth(0);
> ```

#### 7b. 完整方案（用 Tiled 编辑器重做地图）

1. 把 tileset PNG（v2 RGBA 版本）导入 Tiled Map Editor
2. 按 `level01-config.json` 中的地形指引和 `PLATFORM_CONFIGS` 坐标，在 Tiled 中铺设地图
3. 导出为 `level01.json`，放到 `public/assets/maps/`
4. 在 `BootScene.preload()` 追加: `this.load.tilemapTiledJSON('level01_map', 'assets/maps/level01.json')`
5. 在 `Level1Scene.create()` 中:
   ```typescript
   const map = this.make.tilemap({ key: 'level01_map' });
   const tileset = map.addTilesetImage('tileset_l1', 'tileset_l1');
   const ground = map.createLayer('ground', tileset!, 0, 0);
   const platforms = map.createLayer('platforms', tileset!, 0, 0);
   platforms.setCollisionByProperty({ collides: true });
   this.physics.add.collider(this.player, platforms);
   ```

> **推荐先做 7a**（Python 提取 grass tile → TileSprite 平铺），后续再迭代到 7b。

---

### 步骤 8: 集成音频 ⭐⭐ 中

**当前状态**: `AudioManager` 已实现，但 `preload` 没有加载真实音频文件

**操作**:
- 步骤 2 已在 `BootScene.preload()` 中加载所有音频，此处只需验证 `AudioManager` 的 key 映射

```typescript
// AudioManager 中确保 key 对应:
private keyMap: Record<SFX | BGM, string> = {
  [BGM.LEVEL_01]:      'bgm_level_01',
  [BGM.LEVEL_01_BOSS]: 'bgm_level_01_boss',
  [SFX.SHOOT]:         'sfx_shoot',
  [SFX.HIT]:           'sfx_hit',
  [SFX.JUMP]:          'sfx_jump',
  [SFX.BOSS_CHARGE]:   'sfx_boss_charge',
  [SFX.BOSS_STOMP]:    'sfx_boss_stomp',
  [SFX.DIALOG_POPUP]:  'sfx_dialog_popup',
  [SFX.CAPTURE]:       'sfx_capture',
  [SFX.VICTORY]:       'sfx_victory',
};
```

**注意事项**: Phase 3 音频为**数学合成占位音效**（无版权），可用于开发测试。上线前建议替换为专业音效素材。当前阶段的功能是**验证音效管道畅通**。

---

### 步骤 9: NPC 肖像 + 碎片标记 + 背景天空 ⭐⭐ 中

> **v1 遗漏修正**: 原文只提到 NPC 肖像，遗漏了 `fragment_marker` 和 `sky_bg` 两个灰盒纹理

#### 9a. NPC 肖像（对话系统）

```typescript
// DialogBox.ts
private showPortrait(speakerId: string): void {
  const key = speakerId === 'zhugeliang' ? 'portrait_zhugeliang' 
            : speakerId === 'zhangbo'     ? 'portrait_zhangbo'
            : null;
  if (key && this.scene.textures.exists(key)) {
    this.portraitImage = this.scene.add.image(100, GAME_HEIGHT - 85, key)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDisplaySize(64, 64)
      .setDepth(200);
  }
}
```

#### 9b. 碎片标记

Phase 3 **没有提供**碎片专用精灵。当前 `fragment_marker`（16×16 金色方块）继续保留灰盒即可，或用 tileset 中的 `bamboo` tile (24-26) 临时替代。

#### 9c. 背景天空

当前 `sky_bg` 是 5000×540 纯色矩形。可用 tileset 中的 `mountains` tiles (32-35) 制作视差背景层:

```typescript
// 远景山脉（视差滚动，速度 0.3）
const mountains = this.add.tileSprite(0, GROUND_Y - 200, MAP_WIDTH, 200, 'tileset_l1')
  .setOrigin(0, 0)
  .setDepth(-5)
  .setScrollFactor(0.3);  // 视差速度
```

> 需要先用 Python 从 tileset 中提取 mountains 区域为独立纹理，或直接用 TileSprite + tileset。

---

## 执行顺序建议

```
┌─────────────────────────────────────────────┐
│ 阶段 A: 基础设施（不可跳过）                   │
│  [1] 拷贝+重命名+UI切片  → [2] BootScene     │
│  ↓ npm run build 必须通过                    │
│  ↓ 验证: 加载完成后才跳转场景                  │
├─────────────────────────────────────────────┤
│ 阶段 B: 核心实体（依次替换）                   │
│  [3] Player → [4] Enemy → [5] Boss          │
│  ↓ 每个完成后可单独验证视觉效果                 │
│  ↓ 动画在 Level1Scene.create() 集中注册       │
├─────────────────────────────────────────────┤
│ 阶段 C: 体验层                                │
│  [6] UI 组件(预切片) → [8] 音频              │
├─────────────────────────────────────────────┤
│ 阶段 D: 地图（高风险，最后做）                  │
│  [7a] TileSprite 平铺 → [7b] Tiled 完整地图  │
├─────────────────────────────────────────────┤
│ 阶段 E: 收尾                                  │
│  [9] NPC 肖像 + 背景天空 + 碎片标记           │
└─────────────────────────────────────────────┘
```

---

## 灰盒代码清理清单

完成所有步骤后，从以下位置移除灰盒相关代码:

- [ ] `Level1Scene.buildGrayboxTextures()` — 整个方法可删除
- [ ] `Level1Scene.preload()` — 删除 "在 create 阶段用 generateTexture" 注释
- [ ] `Level1Scene.create()` — 删除 `this.buildGrayboxTextures()` 调用
- [ ] `src/data/asset-manifest.json` — 替换为 Phase 3 版本或删除
- [ ] 所有 Entity 中的 `textures.exists()` fallback 守卫 — 确认无缺失资源后移除
- [ ] `Player.ts` L143 注释掉的动画播放 — 替换为正式 `play()` 调用

> **⚠️ 清理前提**: 所有 Phase 3 资源确认稳定加载后才删除 fallback。建议保留 fallback 至少到最终测试通过。

---

## 回滚策略

每步操作前:

```bash
# 创建快照
git stash
git tag pre-phase3-stepN
```

如果某一步失败:

```bash
# 回到上一步的快照状态
git stash pop  # 或 git checkout pre-phase3-stepN
```

文件拷贝操作 (`robocopy`) 不可逆，但 `public/assets/` 当前为空，新拷贝的文件不会覆盖任何现有内容。

---

## 验收总标准

所有步骤完成后的 smoke test:

1. `npm run build` — 无任何 TS 错误
2. 启动 `npm run dev`，测试流程:
   - BootScene → 等待加载完成 → MainMenu → 点击开始 → Level1Scene
   - Player 显示像素角色，idle/run/jump/fall/shoot/hurt/die 动画齐全
   - 蛮兵 patrol/attack/hurt/death 动画正常
   - Boss 在 3200px 处触发，7 种动画正确播放
   - HUD 血条/武器冷却显示国风 UI（预切片 PNG）
   - 对话弹出时显示诸葛亮/张伯像素肖像
   - 击破 Boss → 擒获流程 → BGM 切换 → 结算
   - 地面显示真实 tileset 而非灰盒
3. 性能: 加载时间 < 3s（外部资源第一次加载），60fps 无掉帧
4. **Fallback 验证**: 临时重命名一个资源文件 → 游戏不崩溃，退化为灰盒显示

---

## v2.0 修订记录

| 修订项 | v1 问题 | v2 修正 |
|--------|--------|---------|
| 步骤 6 UI 切割 | `setCrop` 用法错误，会显示整张大图 | 改为 Python 预切片为独立 PNG |
| 步骤 7a 地面铺设 | `setCrop` 逐 tile 产生数百 Image 对象 | 改为 `TileSprite` 平铺 |
| 步骤 2 加载时序 | 固定 1.2s tween 不等待 `load.complete` | 添加 `load.once('complete')` 守卫 |
| 步骤 3 动画缺口 | 漏了 FALL / CUTSCENE_LOCK 两个状态 | 补充复用方案 |
| 灰盒纹理遗漏 | 只列了 5 种，漏了 fragment_marker / sky_bg | 补充到文件对照表 + 步骤 9 |
| Enemy 闪烁描述 | 误称 Enemy 用 `setTint`，实际已是 alpha | 删除错误描述，确认无需改动 |
| Fallback 策略 | 直接删灰盒，无退化 | 全部保留 `textures.exists()` fallback |
| 动画注册位置 | 在 Entity 构造函数中注册 | 改为 `Level1Scene.create()` 集中注册 |
| 文件名 | 硬编码 60 字符长文件名 | 步骤 1 统一重命名为短名 |
| Player body offset | `setOffset(9, 4)` 计算有误 | 修正为 `setOffset(9, 2)`（居中公式） |
