# Phase 3 资产详细规格文档

> 《七擒孟获》横版动作游戏
> 版本: v1.0 | 更新日期: 2026-06-16

---

## 1. 文档目的

本文档提供 Phase 3 所有资产的**技术规格、使用方式和集成指南**，供程序、美术和策划团队参考。

---

## 2. 角色精灵规格

### 2.1 玩家角色 (Player)

| 属性 | 规格 |
|---|---|
| 资源ID | `player_sprite_sheet` |
| 尺寸 | 48×48 像素/帧 |
| 总帧数 | ~32 帧 |
| 文件格式 | PNG (透明背景) |

#### 动画帧布局

```
帧 0-3:   Idle（站立待机）     - 4帧, 6fps
帧 4-9:   Run（跑步）          - 6帧, 10fps
帧 10-13: Jump（跳跃）        - 4帧, 8fps
帧 14-17: Shoot（射击）       - 4帧, 12fps
帧 18-19: Hurt（受击）        - 2帧, 8fps
帧 20-25: Die（死亡）         - 6帧, 10fps
```

#### 视觉设计要点
- **甲胄**: 矩形鳞甲片，深灰色 (#334155)，清晰可见单片轮廓
- **头带**: 朱砂红 (#DC2626)，作为视觉识别点
- **武器**: 连弩，朝右为默认朝向
- **配色方案**:
  ```
  主装甲: #334155 (深蓝灰)
  头带:   #DC2626 (朱砂红)
  皮肤:   #FBBF24 (琥珀金)
  靴子:   #1E293B (近景黑蓝)
  武器:   #64748B (中蓝灰)
  ```

### 2.2 孟获Boss (Boss - 第1关)

| 属性 | 规格 |
|---|---|
| 资源ID | `boss_menghuo_l1_sprite_sheet` |
| 尺寸 | 96×96 像素/帧 |
| 总帧数 | ~35 帧 |
| 文件格式 | PNG (透明背景) |

#### 动画帧布局

```
帧 0-3:   Idle（骑象待机）      - 4帧, 5fps
帧 4-9:   Charge（冲锋）        - 6帧, 10fps
帧 10-13: Stomp（踏地）        - 4帧, 8fps
帧 14-17: Sweep（象鼻横扫）    - 4帧, 10fps
帧 18-19: Hurt（受击）         - 2帧, 8fps
帧 20-25: Fall（被击落）       - 6帧, 12fps
帧 26-29: Captured（被擒获）   - 4帧, 6fps
```

#### Boss 行为与动画对应关系

| 行为名称 | 使用动画 | 说明 |
|---|---|---|
| 待机循环 | idle | 战斗间隙的默认状态 |
| 冲锋攻击 | charge | 直线快速移动，玩家需跳跃躲避 |
| 范围攻击 | stomp | 原地踩踏，全屏震动，需远距离 |
| 横扫攻击 | sweep | 象鼻横向扫过，需蹲下或跳跃 |
| 受击反馈 | hurt | 被玩家命中时的短暂硬直 |
| 击败序列 | fall → captured | 血量归零后播放的擒获演出 |

#### 视觉设计要点
- **孟获**: 铜色皮肤 (#D97706)，绿色羽毛头饰 (#166534)，骨制饰品 (#FEF3C7)
- **战象**: 灰蓝色 (#64748B)，深色斑纹 (#334155)，白色象牙
- **整体印象**: 庞大、威猛、有压迫感但不是邪恶感

### 2.3 蛮兵敌人 (Enemy)

| 属性 | 规格 |
|---|---|
| 资源ID | `enemy_barbarian_sprite_sheet` |
| 尺寸 | 32×32 像素/帧 |
| 总帧数 | ~18 帧 |
| 文件格式 | PNG (透明背景) |

#### 动画帧布局

```
帧 0-3:   Patrol（巡逻/待机）    - 4帧, 5fps
帧 4-9:   Attack（攻击）         - 6帧, 10fps
帧 10-12: Hurt（受击）          - 3帧, 8fps
帧 13-17: Death（死亡）         - 5帧, 10fps
```

#### 视觉设计要点
- **种族特征**: 明显的南蛮部族风格，区别于汉军
- **头饰**: 彩色羽毛 (青绿 #0F766E + 红 #DC2626)
- **护甲**: 兽皮/毛皮质感 (#78350F 深褐)
- **武器**: 石质/骨制 (米白 #FEF3C7 或灰 #64748B)

---

## 3. NPC肖像规格

### 3.1 诸葛亮

| 属性 | 规格 |
|---|---|
| 资源ID | `npc_zhuge_liang_portrait` |
| 尺寸 | 256×256 像素 |
| 用途 | 对话框头像、释放过场立绘 |

**视觉特征**:
- 白袍蓝边 (#F8FAFC + #3B82F6)
- 黑色纶巾 + 长髯
- 白色鹤羽扇 (标志性道具)
- 表情: 沉稳、睿智、温和而坚定

**表情变体需求** (后续可扩展):
- `zhuge_liang_normal`: 正常谈话表情
- `zhuge_liang_calm`: 平静释然（释放孟获时使用）
- `zhuge_liang_serious`: 严肃思考
- `zhuge_liang_slight_smile`: 微笑赞许

### 3.2 老兵张伯

| 属性 | 规格 |
|---|---|
| 资源ID | `npc_zhang_bo_portrait` |
| 尺寸 | 256×256 像素 |
| 用途 | 战斗提示对话框头像 |

**视觉特征**:
- 年老疲惫的面容，有伤疤
- 斑白胡须
- 磨损的旧铠甲
- 表情: 粗鲁但关怀

---

## 4. Tileset规格

### 4.1 第1关Tileset (西洱河初战)

| 属性 | 规格 |
|---|---|
| 资源ID | `tileset_level01_ground` |
| Tile尺寸 | 32×32 像素 |
| 总Tile数 | ~40 个 |
| 文件格式 | PNG (透明背景) |

#### Tile类型分布

```
行1 (索引 0-7):   草地变体 (Grass variations)
行2 (索引 8-11):  泥土小路 (Dirt path)
                  过渡到水边 (Water edge transitions)
行3 (索引 12-15): 水面 (Water surface)
行4 (索引 16-19): 木平台 (Wooden platforms)
                  石平台 (Stone platforms)
                  斜坡 (Slopes)
行5 (索引 20-23): 装饰物 - 竹子 (Bamboo clusters)
行6 (索引 24-27): 装饰物 - 石块、草丛 (Rocks, Grass clumps)
行7 (索引 28-31): 装饰物 - 断箭、旗帜底座 (Battle debris)
行8 (索引 32-35): 背景层 - 远山剪影 (Background mountains)
行9 (索引 36-39): 背景层 - 云雾 (Clouds/Mist)
```

#### 配色规范 (第1关)

```
主色调:   #166534 (翠绿) - 草地、竹林
辅助色:   #0EA5E9 (天蓝) - 水面、天空点缀
泥土色:   #78350F (暗褐) - 小路、平台木质
石头色:   #64748B (灰蓝) - 石质地形
装饰高光: #F59E0B (琥珀金) - 花朵、特殊标记
```

---

## 5. UI组件规格

### 5.1 HUD组件包

| 组件 | 尺寸 | 位置(1280x720画布) | 说明 |
|---|---|---|---|
| 玩家HP条容器 | 200×24 | 左上 (24, 24) | 含头像框位置 |
| Boss HP条容器 | 780×44 | 顶部居中偏左 (250, 20) | 华丽中式边框 |
| 关卡标题栏 | 自适应 | Boss HP下方居中 | 显示当前关卡名 |
| 对话框 | 1120×150 | 底部居中 (80, 500) | 中式像素边框 |
| 武器面板 | 280×105 | 右下 (960, 585) | 弹药/能量显示 |
| 结算面板 | 800×600 | 屏幕中央 | 胜利/失败共用框架 |

### 5.2 对话框结构

```
┌─────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════╗ │
│ ║ [头像区: 120×120] │ 标签: "汉·丞相"             ║ │
│ ║    圆形/徽章框     │                             ║ │
│ ║                    │ 正文文字区域                ║ │
│ ║                    │ (奶油白 #FEF3C7)            ║ │
│ ║                    │                     [士卒视角]║ │
│ ║                    │                              ▼ ║ │
│ ╚═════════════════════════════════════════════════╝ │
│              [ 跳过: SPACE ]                         └─ 底部黑色遮幅
└─────────────────────────────────────────────────────────┘
```

#### 对话框样式属性
- **背景色**: `#1C1917` (深木色)
- **边框**: 双线朱砂红 `#DC2626`
- **角落装饰**: 金色云纹/回纹 `#FBBF24`
- **角色名标签色**: 琥珀金 `#F59E0B`
- **正文色**: 奶油白 `#FEF3C7`
- **跳过提示色**: 半透明白色

---

## 6. 叙事数据格式规范

### 6.1 对话数据结构

```typescript
interface DialogData {
  id: string;              // 唯一标识符, 格式: l{关卡}_{场景}_{角色}_{序号}
  levelId: string;         // 所属关卡
  trigger: string;         // 触发条件
  speaker: string;         // 说话人名称
  speakerTitle: string;    // 说话人头衔/身份
  portrait: string;        // 头像资源名
  text: string;            // 对话正文
  skippable: boolean;      // 是否可跳过
  firstPlayLockSec: number; // 首通锁定秒数(不可跳过的最短时间)
  nextDialog?: string;     // 下一段对话ID (null表示结束)
  audioCue?: string;       // 音效提示
  isInnerMonologue?: boolean; // 是否内心独白
  displayType?: 'full' | 'bubble_fade' | 'result_banner';
  cameraEffect?: string;   // 相机效果
  sceneEffect?: string;    // 场景特效
  bgmChange?: string;      // BGM切换
}
```

### 6.2 过场数据结构

```typescript
interface CutsceneScene {
  type: 'screen_fade' | 'camera_move' | 'camera_zoom' | 'camera_focus'
      | 'dialog_show' | 'animation_play' | 'boss_appear' | 'boss_activate_ai'
      | 'show_boss_hp_bar' | 'boss_state_change' | 'effect_screen_flash'
      | 'effect_particles' | 'screen_shake' | 'npc_enter' | 'npc_exit'
      | 'npc_face' | 'npc_action' | 'disable_player_control'
      | 'enable_player_control' | 'show_result_screen'
      | 'check_fragment_unlock' | 'show_next_level_hint'
      | 'screen_tint';
  data: Record<string, any>;
}

interface CutsceneData {
  id: string;
  levelId: string;
  trigger: string;
  title: string;
  durationSec: number;
  skippable: boolean;
  firstPlayLockSec: number;
  scenes: CutsceneScene[];
  bgm?: {
    start?: string;
    transitionTo?: string;
    fadeDuration: number;
  };
}
```

### 6.3 故事碎片数据结构

```typescript
interface FragmentData {
  id: string;
  unlockLevel: string;
  category: '历史背景' | '地理环境' | '战略思想' | '文化背景' | '战略分析' | '军事技术' | '历史结局';
  title: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  content: string;
  unlockCondition: string;
  relatedDialogs?: string[];
  flavorText: string;
  source: string;
}
```

---

## 7. 音频资源规划

> 注: Phase 3 音频资源为占位规划，实际音频文件需另行制作或采购。

### 7.1 BGM列表

| ID | 名称 | 时长 | 循环 | 使用场景 | 情绪 |
|---|---|---|---|---|---|
| bgm_main_menu | 主菜单BGM | ~60s | 是 | 主菜单 | 史诗肃穆 |
| bgm_level_01 | 第1关战斗BGM | ~90s | 是 | 第1关探索+战斗 | 紧张激昂 |
| bgm_level_01_boss | Boss战BGM | ~60s | 是 | 孟获Boss战 | 史诗对决 |
| bgm_cutscene_tense | 紧张过场BGM | ~30s | 是 | 擒获等紧张时刻 | 戏剧张力 |
| bgm_cutscene_calm | 平静过场BGM | ~45s | 是 | 释放等沉思时刻 | 宁静反思 |
| bgm_victory_fanfare | 胜利号角 | ~8s | 否 | 关卡胜利 | 凯旋喜悦 |

### 7.2 SFX列表

| ID | 名称 | 使用时机 |
|---|---|---|
| sfx_shoot | 射击音效 | 玩家开火 |
| sfx_hit | 命中音效 | 子弹击中目标 |
| sfx_jump | 跳跃音效 | 玩家跳跃 |
| sfx_boss_charge | Boss冲锋 | 孟获冲锋起始 |
| sfx_boss_stomp | Boss踏地 | 地面踩踏攻击 |
| sfx_dialog_popup | 对话弹出 | 对话框出现 |
| sfx_capture | 擒获音效 | Boss进入被擒状态 |
| sfx_victory | 胜利音效 | 关卡完成提示 |

### 7.3 音频格式建议

- **BGM**: OGG Vorbis (压缩好, Web兼容佳)
- **SFX**: WAV (短音效) 或 OGG (较长音效)
- **采样率**: 44100 Hz
- **声道**: Stereo (BGM), Mono (SFX)

---

## 8. 七关扩展资产方向

以下为第2-7关的资产制作方向指导，供后续Phase 4开发参考：

### 8.1 各关新增资产需求

| 关卡 | 新增/修改资产 | 重点说明 |
|---|---|---|
| 第2关 | 水流Tileset、浮桥、月夜背景、战船Boss部件 | 深蓝+银灰主色调 |
| 第3关 | 密林Tileset、藤蔓陷阱、伏击敌人变种 | 墨绿+褐黄主色调 |
| 第4关 | 洞窟Tileset、毒雾粒子、火把光源 | 暗紫+荧光绿主色调 |
| 第5关 | 营寨建筑、双Boss(木鹿)、精英兵种 | 赭红+土黄主色调 |
| 第6关 | 要塞机关、木兽Boss、火焰陷阱 | 深红+铁灰主色调 |
| 第7关 | 王庭场景、祭火、最终Boss三阶段模型 | 金+深棕主色调 |

### 8.2 孟获各关外观变化建议

虽然同一角色，但每关可微调以体现心态变化：
- **第1关**: 完整战甲，傲慢姿态，鲜艳色彩
- **第2-3关**: 开始出现战斗痕迹，表情更警觉
- **第4-5关**: 护甲破损，有绷带/伤疤，表情焦虑
- **第6关**: 重整装备但神态凝重，开始反思
- **第7关**: 卸下部分武装，表情平静，准备对话而非死战

---

## 9. 集成检查清单

程序在集成Phase 3资产时，应确认以下项目：

### 9.1 资源加载验证
- [ ] 所有图片路径正确，无404错误
- [ ] 图片尺寸与manifest一致
- [ ] 透明通道正常工作（无异常黑边）
- [ ] 动画帧数和帧率配置正确

### 9.2 角色显示验证
- [ ] 玩家角色所有动作正常播放
- [ ] Boss所有阶段行为正常
- [ ] 敌人AI和受击反应正常
- [ ] NPC肖像在对话框中正常显示

### 9.3 UI验证
- [ ] HP条数值变化视觉准确
- [ ] 对话框文字不溢出边界
- [ ] 对话框不遮挡关键游戏区域
- [ ] 跳过功能响应正常

### 9.4 数据验证
- [ ] dialogs.json 可正确解析
- [ ] 对话触发条件逻辑正确
- [ ] cutscenes.json 序列按顺序执行
- [ ] fragments.json 解锁逻辑正确
- [ ] asset-manifest.json 与实际文件匹配

---

## 10. 版本历史

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-06-16 | 初始版本，包含第1关完整资产规格 |

---

*本文档随Phase 3资产制作进度同步更新*
