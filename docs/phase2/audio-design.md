# 《七擒孟获》游戏音频设计文档

> 版本：v1.0 | 日期：2026-06-20
> 关联文档：architecture.md / GDD v1.1 / level-narrative v1.1
> 技术栈：Phaser 3 Web Audio API（无中间件，纯浏览器实现）

---

## 目录

1. [Sonic Identity — 声音身份](#1-sonic-identity)
2. [音频架构总览](#2-音频架构总览)
3. [七关音画矩阵](#3-七关音画矩阵)
4. [自适应音乐系统](#4-自适应音乐系统)
5. [SFX 事件映射表](#5-sfx-事件映射表)
6. [空间音频设计](#6-空间音频设计)
7. [音频性能预算](#7-音频性能预算)
8. [音频资源配置清单](#8-音频资源配置清单)
9. [实施路线图](#9-实施路线图)

---

## 1. Sonic Identity

### 1.1 声音三词描述

**磅礴 · 智谋 · 渐悟**

| 关键词 | 音色方向 | 体现方式 |
|--------|---------|---------|
| **磅礴** | 战鼓、号角、金铁交鸣 | Boss 战铜管+打击乐，大规模战场氛围 |
| **智谋** | 古琴、箫、水声、纸张 | 诸葛亮对话配乐、过场、碎片收集 |
| **渐悟** | 音乐从激昂到克制的情感弧线 | 孟获心态弧线的音乐镜像：狂妄→困惑→折服 |

### 1.2 音频设计原则

```
1. 叙事优先 — 音频永远服务于"七擒七纵"的情感节奏，不是单纯的听感盛宴
2. 参数驱动 — 所有音乐过渡由战斗强度参数驱动，不硬编码场景切换
3. 空安全 — 所有音频资源缺失时静默降级，游戏逻辑不阻塞
4. Web 优先 — 面向浏览器 Web Audio API，考虑移动端解码性能和自动播放策略
```

### 1.3 情感节奏 vs 音频响应

```
玩家状态        音频层反应
─────────────────────────────────────────────────
探索/行军       → 民族打击乐+环境音，轻松前进感
遭遇敌人        → 鼓点加速，低频增强
Boss 登场       → 铜管/号角起，音量+3dB
Boss 血量70%    → 弦乐织体增厚，节奏加密
Boss 血量30%    → 全部乐器进入，鼓声最大
擒获成功        → 打击乐骤停，古琴独奏淡入
释放孟获        → 古琴+箫，悠远克制
过关结算        → 凯旋鼓点，明亮铜管
```

---

## 2. 音频架构总览

### 2.1 分层架构（Phaser Web Audio 实现）

```
┌──────────────────────────────────────────────────────┐
│                    AudioManager                       │
│                   (System 层单例)                      │
├──────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  BGM Engine  │  │  SFX Engine  │  │  Ambience   │  │
│  │  自适应音乐   │  │  事件驱动音效  │  │  环境氛围    │  │
│  │  分层混音    │  │  优先级管理   │  │  空间定位   │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬─────┘  │
│         │                │                  │         │
│  ┌──────▼────────────────▼──────────────────▼─────┐  │
│  │              Phaser.SoundManager               │  │
│  │         (Web Audio API / HTML5 Audio)           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 2.2 核心参数表

| 参数名 | 范围 | 更新频率 | 来源 |
|--------|------|---------|------|
| `CombatIntensity` | 0.0–1.0 | 每 0.5s | 敌人数量+距离聚合 |
| `BossPhase` | 0–3 | 事件驱动 | Boss血量阶段 |
| `PlayerHealth` | 0.0–1.0 | 事件驱动 | Player.hp/maxHp |
| `CaptureState` | enum | 事件驱动 | CaptureSystem.phase |
| `LevelContext` | string | 场景切换 | LevelConfig |
| `TimeElapsed` | seconds | 每 1s | 场景计时器 |

### 2.3 通信模式

```
Scene → AudioManager:      直接调用 playBgm() / playSfx()
Entity → AudioManager:    Entity 发事件 → Scene 监听 → 调用 AudioManager
GameEvent → AudioManager:  AUDIO_BGM_PLAY / AUDIO_SFX_PLAY 通过 EventBus
参数更新 → AudioManager:   Scene.update() 每帧传递 combatIntensity
```

---

## 3. 七关音画矩阵

### 3.1 关卡音频配置总览

| 关卡 | 名称 | BGM 情绪 | 核心乐器 | 环境音 | 孟获心态 | BPM |
|------|------|---------|---------|--------|---------|-----|
| **第1擒** | 西洱河初战 | 磅礴开场 | 战鼓+铜管 | 平原风声 | 傲慢 😤 | 120 |
| **第2擒** | 泸水天险 | 紧张急促 | 弦乐+木管 | 流水声 | 辩解 🤨 | 135 |
| **第3擒** | 紫荆山伏兵 | 诡异悬疑 | 箫+低音提琴 | 山林鸟鸣 | 困惑 😕 | 110 |
| **第4擒** | 秃龙洞毒雾 | 压抑沉重 | 大鼓+管风琴 | 洞窟滴水 | 倔强 😠 | 100 |
| **第5擒** | 蛮族联军 | 史诗混战 | 全编制交响 | 战场厮杀 | 挣扎 😰 | 140 |
| **第6擒** | 木兽炎阵 | 炽热焦灼 | 琵琶+铜钹 | 火焰噼啪 | 反思 🤔 | 125 |
| **第7擒** | 银坑洞决战 | 终极对决 | 编钟+全管弦 | 地底轰鸣 | 折服 😌 | 150 |

### 3.2 每关音频详情

#### 第1擒 — 西洱河初战（教学关）

| 音频层 | Key | 描述 | 时长 |
|--------|-----|------|------|
| BGM_Explore | `bgm_l1_explore` | 轻快战鼓+竹笛，南中风土 | 2min loop |
| BGM_Boss | `bgm_l1_boss` | 象吼采样+重鼓，威胁感 | 1.5min loop |
| BGM_Capture | `bgm_capture_theme` | 古琴独奏，克制深沉 | 30s |
| Ambience | `amb_plain_wind` | 平原微风 | 1min loop |
| SFX 特色 | `sfx_elephant_charge` | 战象冲锋（低频+沙尘） | 2-4s 随机 |

#### 第2擒 — 泸水天险

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l2_explore` | 快速弦乐，水流般的急促感 |
| BGM_Boss | `bgm_l2_boss` | 水战鼓点，波浪式节奏 |
| Ambience | `amb_river_flow` | 泸水奔流声 |
| SFX 特色 | `sfx_water_splash` | 涉水溅射 |

#### 第3擒 — 紫荆山伏兵

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l3_explore` | 低音提琴+箫，可疑的寂静 |
| BGM_Boss | `bgm_l3_boss` | 突然的铜管爆发，伏兵杀出 |
| Ambience | `amb_forest_night` | 夜林虫鸣+远鸟 |
| SFX 特色 | `sfx_ambush_alert` | 伏兵触发警报 |

#### 第4擒 — 秃龙洞毒雾

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l4_explore` | 管风琴+低频嗡鸣，压迫窒息 |
| BGM_Boss | `bgm_l4_boss` | 大鼓独奏，每一步都是生死 |
| Ambience | `amb_cave_drip` | 洞窟滴水+回声 |
| SFX 特色 | `sfx_poison_gas` | 毒雾喷发声 |

#### 第5擒 — 蛮族联军

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l5_explore` | 全编制交响，大战在即 |
| BGM_Boss | `bgm_l5_boss` | 铜管齐奏+人声战吼 |
| Ambience | `amb_battlefield` | 远处厮杀声+战旗猎猎 |
| SFX 特色 | `sfx_war_horn` | 蛮族战号 |

#### 第6擒 — 木兽炎阵

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l6_explore` | 琵琶急奏+金属撞击，机关重重 |
| BGM_Boss | `bgm_l6_boss` | 编钟+铜钹，火焰主题 |
| Ambience | `amb_fire_crackle` | 火焰燃烧+木材崩裂 |
| SFX 特色 | `sfx_flame_trap` | 火焰机关触发 |

#### 第7擒 — 银坑洞决战

| 音频层 | Key | 描述 |
|--------|-----|------|
| BGM_Explore | `bgm_l7_explore` | 静默+低频心跳，终极前奏 |
| BGM_Boss | `bgm_l7_boss` | 编钟+全管弦+战鼓齐鸣，史诗终章 |
| BGM_Victory | `bgm_victory_theme` | 凯旋铜管+古琴收尾，七纵之后 |
| Ambience | `amb_underground` | 地底轰鸣+钟乳石滴水 |
| SFX 特色 | `sfx_final_capture` | 终极擒获特殊音效 |

---

## 4. 自适应音乐系统

### 4.1 参数驱动架构

```
                    ┌──────────────────┐
                    │  Gameplay State   │
                    │  (entities+scene) │
                    └────────┬─────────┘
                             │ 每0.5s 聚合
                    ┌────────▼─────────┐
                    │ CombatIntensity   │
                    │   0.0 ──→ 1.0    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌─────▼────┐
   │ Layer 1 │         │ Layer 2 │         │  Layer 3  │
   │ 探索层   │         │ 交战层   │         │ Boss 层   │
   │ 0.0-0.3 │         │ 0.3-0.7 │         │  0.7-1.0  │
   │ vol:1.0 │         │ vol:1.0 │         │  vol:1.0  │
   └─────────┘         └─────────┘         └──────────┘
```

### 4.2 音乐层定义

| 层 | 名称 | CombatIntensity | 音量曲线 | 乐器 |
|----|------|----------------|---------|------|
| **L0 环境** | 纯氛围 | 0.0 | `max(0, 1 - intensity*3)` | 环境音+风声 |
| **L1 探索** | 行军主题 | 0.0–0.3 | `1.0` | 竹笛+轻鼓+古筝 |
| **L2 交战** | 战斗变奏 | 0.3–0.7 | `smoothstep(0.3,0.7)` | +弦乐+战鼓 |
| **L3 Boss** | Boss 主题 | 0.7–1.0 | `1.0` | +铜管+全编制 |

### 4.3 过渡规则

```
1. 强度上升（探索→战斗）：在下一个强拍切换，延迟不超过 1 拍
2. 强度下降（战斗→探索）：在当前乐句结束切换，允许最长 4 拍
3. Boss 登场/退场：2 小节 crossfade，不能硬切
4. 擒获触发：所有战斗层在 1 秒内 fade out，古琴主题 2 秒 fade in
5. 玩家死亡：所有层立即静音 0.5s，然后在复活点以 L1 层重启
```

### 4.4 实现方式（Phaser Web Audio）

由于 Phaser 原生不支持多轨同步播放+实时混音，我们采用以下方案：

```
方案：多 Sound 实例 + 独立音量控制

bgm_explore  → Phaser.Sound 实例 A (loop=true, volume 动态)
bgm_combat   → Phaser.Sound 实例 B (loop=true, volume 动态)
bgm_boss     → Phaser.Sound 实例 C (loop=true, volume 动态)
bgm_capture  → Phaser.Sound 实例 D (loop=false, 一次性)

所有 BGM 音频文件需使用相同 BPM 和拍号，确保同时播放时节奏同步。
CombatIntensity 变化 → 实时更新各 Sound 实例的 volume。
```

---

## 5. SFX 事件映射表

### 5.1 事件→音效完整映射

| 游戏事件 | SFX Key | 优先级 | 音量 | 空间化 | 变化 |
|----------|---------|--------|------|--------|------|
| **玩家** | | | | | |
| PLAYER_SHOOT | `sfx_player_shoot` | 1 | 0.7 | ❌ 2D | pitch ±5% |
| PLAYER_HIT | `sfx_player_hit` | 1 | 0.9 | ❌ 2D | 多击 3 变体 |
| PLAYER_DEATH | `sfx_player_death` | 1 | 1.0 | ❌ 2D | — |
| PLAYER_JUMP | `sfx_player_jump` | 2 | 0.5 | ❌ 2D | pitch ±3% |
| PLAYER_LAND | `sfx_player_land` | 2 | 0.4 | ✅ 3D | 地面材质变体 |
| **敌人** | | | | | |
| ENEMY_SPAWNED | `sfx_enemy_spawn` | 2 | 0.6 | ✅ 3D | — |
| ENEMY_HIT | `sfx_enemy_hit` | 2 | 0.7 | ✅ 3D | 2 变体随机 |
| ENEMY_DEATH | `sfx_enemy_death` | 2 | 0.8 | ✅ 3D | pitch ±5% |
| ENEMY_ATTACK | `sfx_enemy_attack` | 2 | 0.6 | ✅ 3D | — |
| **Boss** | | | | | |
| BOSS_SPAWNED | `sfx_boss_enter` | 0 | 1.0 | ❌ 2D | — |
| BOSS_DAMAGED | `sfx_boss_hit` | 1 | 0.9 | ❌ 2D | 3 变体 |
| BOSS_CHARGE | `sfx_boss_charge` | 0 | 0.8 | ✅ 3D | — |
| BOSS_STOMP | `sfx_boss_stomp` | 0 | 1.0 | ❌ 2D | — |
| BOSS_SWEEP | `sfx_boss_sweep` | 0 | 0.85 | ✅ 3D | — |
| BOSS_PHASE_CHANGE | `sfx_boss_phase` | 0 | 0.9 | ❌ 2D | — |
| BOSS_DEFEATED | `sfx_boss_defeat` | 0 | 1.0 | ❌ 2D | — |
| **擒获流程** | | | | | |
| CAPTURE_START | `sfx_capture_start` | 0 | 0.9 | ❌ 2D | — |
| CAPTURE_DONE | `sfx_capture_done` | 0 | 0.8 | ❌ 2D | — |
| **碎片收集** | | | | | |
| FRAGMENT_COLLECTED | `sfx_fragment_pick` | 0 | 0.7 | ❌ 2D | 3 音调递进 |
| **UI** | | | | | |
| DIALOG_NEXT | `sfx_dialog_next` | 0 | 0.4 | ❌ 2D | — |
| MENU_SELECT | `sfx_menu_select` | 0 | 0.35 | ❌ 2D | — |
| MENU_CONFIRM | `sfx_menu_confirm` | 0 | 0.45 | ❌ 2D | — |
| MENU_BACK | `sfx_menu_back` | 0 | 0.3 | ❌ 2D | — |
| **环境** | | | | | |
| CHECKPOINT | `sfx_checkpoint` | 1 | 0.6 | ✅ 3D | — |

### 5.2 优先级说明

| 优先级 | 说明 | 最大同时数 | 偷取策略 |
|--------|------|-----------|---------|
| **0 (Critical)** | UI、剧情关键音效、Boss 技能 | 8 | 不偷取 |
| **1 (High)** | 玩家音效、受击反馈 | 16 | 偷最安静 |
| **2 (Normal)** | 敌人音效、环境交互 | 24 | 偷最远 |

---

## 6. 空间音频设计

### 6.1 2D 横版空间化策略

虽然是 2D 游戏，但使用立体声可以实现左右空间定位：

```
屏幕坐标系 → 立体声定位

X 轴: 0 ────────────────────────────────→ 1920 (屏幕宽度)
      左声道 100%                        右声道 100%
      pan = -1.0        center          pan = +1.0

规则:
- 玩家在屏幕中央 → 玩家 SFX 在中心 (pan=0)
- 敌人在玩家左侧 → 敌人 SFX 偏左 (pan=-0.5 到 -1.0)
- 敌人在玩家右侧 → 敌人 SFX 偏右 (pan=+0.5 到 +1.0)
- 屏幕外的敌人 → 极左/极右 + 低通滤波(-6dB > 1kHz)
```

### 6.2 距离衰减

```
距离 (px)   音量    低通截止
──────────────────────────────
0-200       1.0     全频段
200-400     0.7     12kHz
400-600     0.4     8kHz
600+        0.15    4kHz
```

### 6.3 "类遮挡"模拟

在 2D 游戏中，当音源在平台/墙壁另一侧时：
```typescript
interface OcclusionState {
  occluded: boolean;    // 是否被遮挡
  lowpassCutoff: number; // 400Hz（全遮挡）→ 22050Hz（无遮挡）
  volumeReduction: number; // -12dB（全遮挡）→ 0dB（无遮挡）
}
```

---

## 7. 音频性能预算

### 7.1 Web 平台预算

| 指标 | 预算值 | 说明 |
|------|--------|------|
| **同时语音数** | 32（硬上限） | 超出时按优先级偷取 |
| **BGM 同时层数** | 4 | 探索+交战+Boss+擒获 |
| **环境音同时数** | 2 | 风声+特殊环境 |
| **SFX 缓冲池** | 预加载 24 | 常用 SFX 常驻内存 |
| **音频总内存** | < 16 MB | 面向移动端和慢网速 |
| **单文件上限** | BGM ≤ 2MB, SFX ≤ 200KB | 保证加载速度 |

### 7.2 音频格式

| 格式 | 用途 | 压缩 |
|------|------|------|
| **WebM (Vorbis)** | BGM、长环境音 | ~96kbps |
| **MP3** | SFX | ~128kbps |
| **WAV** | UI 音效（零延迟） | 不压缩，< 50KB |

### 7.3 加载策略

```
Phase 1（BootScene 预加载）:
  ├── UI SFX: menu_select, menu_confirm, menu_back
  └── 过场/通用: dialog_next

Phase 2（MainMenuScene 空闲加载）:
  └── bgm_main_menu

Phase 3（关卡开始时延迟加载）:
  ├── 当前关 BGM（explore + boss + capture）
  ├── 当前关环境音
  └── 当前关特殊 SFX

Phase 4（运行时按需）:
  └── 非关键 SFX 可在触发时懒加载（需预判 500ms）
```

---

## 8. 音频资源配置清单

### 8.1 BGM 资源清单（需制作 24 首）

```
public/assets/audio/bgm/
├── bgm_main_menu.webm          # 主菜单 BGM
├── bgm_l1_explore.webm         # 第1关探索
├── bgm_l1_boss.webm            # 第1关 Boss
├── bgm_l2_explore.webm
├── bgm_l2_boss.webm
├── bgm_l3_explore.webm
├── bgm_l3_boss.webm
├── bgm_l4_explore.webm
├── bgm_l4_boss.webm
├── bgm_l5_explore.webm
├── bgm_l5_boss.webm
├── bgm_l6_explore.webm
├── bgm_l6_boss.webm
├── bgm_l7_explore.webm
├── bgm_l7_boss.webm
├── bgm_capture_theme.webm      # 擒获通用主题（7关共用）
├── bgm_victory_theme.webm      # 第7关通关凯旋
├── bgm_result.webm             # 结算界面
└── bgm_game_over.webm          # 游戏结束/阵亡
```

### 8.2 SFX 资源清单（需制作 30+ 个）

```
public/assets/audio/sfx/
├── player/
│   ├── sfx_player_shoot.mp3
│   ├── sfx_player_hit.mp3     (3 变体)
│   ├── sfx_player_death.mp3
│   ├── sfx_player_jump.mp3
│   └── sfx_player_land.mp3    (3 变体: 草地/石板/泥地)
├── enemy/
│   ├── sfx_enemy_spawn.mp3
│   ├── sfx_enemy_hit.mp3      (2 变体)
│   ├── sfx_enemy_death.mp3
│   └── sfx_enemy_attack.mp3
├── boss/
│   ├── sfx_boss_enter.mp3
│   ├── sfx_boss_hit.mp3       (3 变体)
│   ├── sfx_boss_charge.mp3
│   ├── sfx_boss_stomp.mp3
│   ├── sfx_boss_sweep.mp3
│   ├── sfx_boss_phase.mp3
│   └── sfx_boss_defeat.mp3
├── capture/
│   ├── sfx_capture_start.mp3
│   └── sfx_capture_done.mp3
├── environment/
│   ├── sfx_fragment_pick.mp3
│   ├── sfx_checkpoint.mp3
│   ├── sfx_elephant_charge.mp3
│   ├── sfx_water_splash.mp3
│   ├── sfx_ambush_alert.mp3
│   ├── sfx_poison_gas.mp3
│   ├── sfx_war_horn.mp3
│   ├── sfx_flame_trap.mp3
│   └── sfx_final_capture.mp3
└── ui/
    ├── sfx_dialog_next.wav
    ├── sfx_menu_select.wav
    ├── sfx_menu_confirm.wav
    └── sfx_menu_back.wav
```

### 8.3 环境音资源清单（7 个）

```
public/assets/audio/ambience/
├── amb_plain_wind.webm         # 第1关：平原风
├── amb_river_flow.webm         # 第2关：泸水流
├── amb_forest_night.webm       # 第3关：夜林
├── amb_cave_drip.webm          # 第4关：洞窟
├── amb_battlefield.webm        # 第5关：战场
├── amb_fire_crackle.webm       # 第6关：火焰
└── amb_underground.webm        # 第7关：地底
```

---

## 9. 实施路线图

### 9.1 当前阶段（Phase 2 — 代码层完成）

| 步骤 | 内容 | 状态 |
|------|------|------|
| ✅ Batch 11 | AudioManager 空实现占位 | 已完成 |
| ⬜ **本文档** | 音频设计文档 | **本次完成** |
| ⬜ AudioManager v2 | 专业级实现（自适应+优先级+空间化） | **下次** |
| ⬜ 事件系统更新 | 新增 adaptive 参数事件 | **下次** |

### 9.2 中期（Phase 3 — 音效制作）

| 步骤 | 内容 |
|------|------|
| 1 | 制作 UI SFX（4个）+ 通用 SFX（8个） |
| 2 | 制作第1关全套音频（BGM ×3 + SFX ×5 + Ambience） |
| 3 | 第1关音频接入测试，验证自适应音乐系统 |
| 4 | 第2-7关音频渐进制作（可在后续 Phase 并行） |

### 9.3 后期（Phase 4+ — 润色）

| 步骤 | 内容 |
|------|------|
| 1 | 全 7 关音频接入 |
| 2 | 混音平衡（LUFS 标准化，-16 LUFS 目标） |
| 3 | 移动端性能优化（降低码率、懒加载） |
| 4 | 无障碍模式：音频可视化提示（为听力障碍玩家） |

---

## 附录 A：Phaser Web Audio 性能注意事项

```
1. iOS Safari 自动播放限制：
   - 所有音频必须在用户首次触摸屏幕后才能播放
   - AudioManager.init() 时调用 scene.sound.unlock()
   - 提供"点击开始"按钮作为音频解锁触发器

2. 音频解码开销：
   - 大 BGM 文件首次播放前需要解码（WebM 在移动端可能需要 2-3s）
   - 应在关卡切换时预解码，而非战斗中途

3. AudioContext 限制：
   - 浏览器最多 6 个 AudioContext
   - Phaser 默认使用 1 个共享 AudioContext，语音数限制 32
   - 超出限制时 Phaser 会自动停止最老的音频

4. 格式兼容性：
   - 所有浏览器支持 MP3
   - WebM 在 Safari 不支持 → 需提供 AAC fallback
   - 推荐同时提供 .mp3 和 .webm，让 Phaser 自动选择
```

## 附录 B：占位音效生成方案

在没有专业音效师的情况下，可以使用以下工具链快速生成占位音效：

| 工具 | 用途 | 输出 |
|------|------|------|
| **jsfxr** (Web) | 8-bit 复古 SFX | WAV |
| **sfxr** / **bfxr** | 经典游戏音效合成 | WAV |
| **ChipTone** (Web) | 芯片音色合成 | WAV |
| **Audacity** | 编辑/混音/降噪 | WAV/MP3 |
| **Sonic Pi** | 编程式音乐生成 | WAV |

推荐流程：bfxr → 生成所有占位 SFX → 后续替换为专业录音/合成版本。

---

*本文档为《七擒孟获》音频系统的权威设计参考。所有音频实施决策应以本文档为依据。*
