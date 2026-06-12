# 《七擒孟获》项目长期记忆

## 项目基本信息

- **项目名称**：《七擒孟获》横版动作游戏
- **参赛活动**：腾讯云黑客松 · 叙事类游戏赛道
- **游戏类型**：横版动作（类魂斗罗）+ 叙事驱动
- **关卡数量**：7关，对应七擒孟获历史故事
- **目标平台**：Web（浏览器运行）
- **部署平台**：腾讯云 CloudBase

## 技术决策

- **推荐技术栈**：Phaser 3 + TypeScript + Vite（黑客松首选，部署最简单）
- **备选方案**：Cocos Creator（腾讯生态，移动端好）/ Godot 4（功能全但构建重）
- **AI集成想法**：腾讯云混元LLM生成诸葛亮计谋台词（根据玩家风格动态生成）

## 关卡设计

| 关卡 | 名称 | 核心机制 |
|------|------|---------|
| 第1擒 | 西洱河初战 | 入门教学 |
| 第2擒 | 泸水天险 | 跳跃+水流 |
| 第3擒 | 紫荆山伏兵 | 潜入+射击 |
| 第4擒 | 秃龙洞毒雾 | 环境障碍 |
| 第5擒 | 蛮族联军 | 多波次 |
| 第6擒 | 木兽炎阵 | 机关+火焰 |
| 第7擒 | 银坑洞决战 | 最终Boss |

## 用户偏好 & 工作风格

- 喜欢用 Ardot 进行 UI/UX 设计
- 需要工作流文档作为参考，以便后续 AI 协作时有背景上下文
- 项目工作空间：`D:\TCHGameDesign\七擒孟获`

## 已确认决策（Phase 1）

- [x] 画风方向：**像素三国** — 像素风为基底，水墨/国风元素点缀
- [x] 玩家视角：**汉军无名士卒**，诸葛亮为 NPC 指挥官
- [x] 叙事介入方式：**图文过场 + 对话框结合** — 关键节点过场，过程对话框
- [x] 技术栈：**Phaser 3 + TypeScript + Vite + CloudBase**

## 文档版本（重要）

**当前权威版本：Phase 1 v1.1** — 今后所有开发以 v1.1 文档为唯一依据

| 文档类型 | v1.1 路径 |
|---------|---------|
| 工作流 | `游戏研发工作流文档_v1.1_叙事强化配套版.md`（根目录） |
| GDD | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/GDD.md` |
| 世界观圣经 | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/world-bible.md` |
| 关卡叙事大纲 | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/level-narrative.md` |
| 角色设定表 | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/character-sheets.md` |
| 入口索引 | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/README.md` |

**v1.1 关键约束**：
- Phase 2 MVP = 第1关纵切（先纵切后铺量，不可同时做7关）
- AI 台词本地 fallback 模板优先，不允许 API 阻塞主流程
- 每关完成 = 满足5项验收标准（机制/Boss台词/擒获台词/诸葛亮回应/心态一致）
- 最终周只修Bug，不新增功能

## Phase 1 交付物（v1.0 旧版，已被 v1.1 取代）

| 文档 | 路径 |
|------|------|
| GDD | `docs/phase1/GDD.md` |
| 世界观圣经 | `docs/phase1/world-bible.md` |
| 关卡叙事大纲 | `docs/phase1/level-narrative.md` |
| 角色设定表 | `docs/phase1/character-sheets.md` |
| Phase 1 索引 | `docs/phase1/README.md` |

## 视觉概念定稿（GPT 生成版）

| 文件 | 体积 | 说明 |
|------|------|------|
| `docs/phase1/visuals/01-main-menu.svg` | 5.9MB | 主菜单界面 |
| `docs/phase1/visuals/02-game-hud.svg` | 6.5MB | 游戏HUD |
| `docs/phase1/visuals/03-dialog-scene.svg` | 5.6MB | 对话场景 |
| `docs/phase1/visuals/04-level-color-matrix.svg` | 7.3MB | 七关色彩矩阵 |

- 格式：SVG壳 + base64 PNG（1672×941），AI图像生成
- 提示词来源：`docs/phase1/visuals/enhanced_md_prompts/`

## Phase 2 模块架构（5层分层）

> 设计文档：`docs/phase2/architecture.md` | 设计日期：2026-06-12  
> 核心原则：场景即入口 / System 无状态 / Entity 自包含 / Data 驱动 / 接口先于实现

### 第1层 — Scenes（场景层，5个模块）
| 模块 | 职责 | Phase 2 覆盖度 |
|------|------|---------------|
| **BootScene** | 启动加载、进度条、跳转主菜单 | 完整 |
| **MainMenuScene** | 主菜单、开始游戏 | 基础 |
| **Level1Scene** | 第1关场景组装与生命周期 | ⭐ 完整（核心） |
| **CutScene** | 图文过场播放 | 完整 |
| **ResultScene** | 结算展示 | 完整 |

### 第2层 — UI（界面层，4个模块）
| 模块 | 职责 | Phase 2 覆盖度 |
|------|------|---------------|
| **HUD** | 血条/武器/碎片显示 | 完整 |
| **DialogBox** | 对话框渲染 | 完整 |
| **BossHealthBar** | Boss 血条 | 完整 |
| **ResultScreen** | 结算面板 | 完整 |

### 第3层 — Systems（系统服务层，9个模块）
| 模块 | 职责 | Phase 2 覆盖度 |
|------|------|---------------|
| **InputManager** | 键盘输入统一管理 | 完整 |
| **DialogSystem** | 对话触发/显示/跳过 | 完整 |
| **WeaponSystem** | 武器切换/弹幕管理 | 基础（仅基础弩箭） |
| **CaptureSystem** | 擒获状态机 | ⭐ 完整（核心差异化） |
| **SaveSystem** | LocalStorage 存取 | 完整 |
| **StorySystem** | 碎片收集/图鉴 | 基础（1个碎片） |
| **CameraSystem** | 镜头跟随/锁镜头 | 完整 |
| **AudioManager** | 音效播放（含空实现占位） | 基础 |
| **ScreenShake** | 屏幕震动 | 完整 |

### 第4层 — Entities（实体层，3个模块）
| 模块 | 职责 | Phase 2 覆盖度 |
|------|------|---------------|
| **Player** | 移动/跳跃/射击/状态机 | ⭐ 完整（核心） |
| **Enemy** | 蛮兵基类：巡逻/受击/死亡 | 完整 |
| **BossMengHuoL1** | 骑象 Boss：冲锋/踏地/横扫 | ⭐ 完整（核心） |

### 第5层 — Core/Utils（核心基础设施层，3个模块）
| 模块 | 职责 | Phase 2 覆盖度 |
|------|------|---------------|
| **EventBus** | 全局事件发布/订阅，解耦模块通信 | 完整 |
| **AssetLoader** | 资源加载 + 灰盒 fallback | 完整 |
| **GameContext** | 全局上下文（存档引用、系统引用） | 完整 |

### 架构约束（四大通信模式）
- Entity → UI：Entity 发事件 → Scene 监听 → 更新 UI
- Scene → System：Scene 直接调用 System 方法
- System → Scene：System 发事件 → Scene 监听
- Entity → Entity：通过 EventBus 间接通信

### 开发批次（11个 Batch）
- Batch 0：工程搭建 + EventBus
- Batch 1-2：Player 移动 + 射击（操作闭环）
- Batch 3：Enemy + 灰盒地图
- Batch 4-5：Camera + HUD + Boss（可并行 Batch 6）
- Batch 6：DialogSystem
- Batch 7：CaptureSystem ← 核心集成点
- Batch 8-11：Save + Result + Menu + Audio

### 四大接口约定
1. **对话 ID 触发**：`DIALOG_TRIGGER_L1_INTRO` 等常量触发对话
2. **Manifest 登记**：所有资源在 `asset-manifest.json` 登记，缺失自动退化灰盒
3. **配置化**：地图/敌人/Boss 行为全部从 JSON 加载，不硬编码
4. **AI fallback**：AI 台词有本地模板兜底，不允许 API 阻塞主流程

## Ardot 设计

- 文件：七擒孟获-像素三国视觉概念
- 配色：Primary #DC2626 / Background #0F172A / Accent #22C55E
- 字体：Press Start 2P (标题) + VT323 (正文)
