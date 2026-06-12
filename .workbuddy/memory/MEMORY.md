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
| GDD | `docs/phase1/qiqinmenghuo_phase1_narrative_docs_v1.1/qiqinmenghuo_docs_v1.1_enhanced/GDD.md` |
| 世界观圣经 | `...enhanced/world-bible.md` |
| 关卡叙事大纲 | `...enhanced/level-narrative.md` |
| 角色设定表 | `...enhanced/character-sheets.md` |
| 入口索引 | `...enhanced/README.md` |

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

## Ardot 设计

- 文件：七擒孟获-像素三国视觉概念
- 配色：Primary #DC2626 / Background #0F172A / Accent #22C55E
- 字体：Press Start 2P (标题) + VT323 (正文)
