# 02 — 游戏 HUD 界面 · 精修提示词 / 图像生成规格

> 目标：生成《七擒孟获》的横版动作游戏实机截图式 HUD。重点是**游戏场景与 UI 叠加层都要清楚、可读、可执行绘制**，避免只有装饰而缺少真正游戏界面信息。

---

## A. 统一生成约束（必须遵守）

- 输出形式：**单张独立图片**，不可使用外部图片。
- 画布：`viewBox="0 0 1280 720"`，16:9 横版游戏截图。
- 像素单位：主要对象使用 4px 或 8px 的块面节奏；UI 边框、血条、弹药条尽量使用矩形块。
- 视觉优先级：Boss 血条与关卡名最靠上，玩家角色和敌人位于中景，底部对话预览不遮挡角色脚部太多。
- 字体建议：`"Zpix", "SimSun", "Microsoft YaHei", monospace`。
- 禁止项：不要现代手游玻璃拟态、不要写实战争、不要复杂透视导致角色很小、不要让 HUD 文字挤在一起。

---

## B. 精修 English Prompt

```text
Create a standalone image in-game HUD screenshot for a 16-bit pixel-art side-scrolling action game set in Three Kingdoms China, titled "七擒孟获". Canvas 1280x720, crisp integer coordinates, no external images.

Scene layer:
1. Background: warm orange dusk sky near the horizon, fading into muted slate. Add distant mountain silhouettes, bamboo forest clusters on both sides, a winding river in the far-middle background, and two small wooden watchtowers.
2. Ground: a horizontal dirt battlefield path across the lower half, with pixel stones, broken arrows, small grass clumps, and dust blocks.
3. Player character: position center-left around x=390 y=445. A Han Dynasty foot soldier in pixel style, wearing lamellar armor made of small rectangular plates, red headband, dark boots, and holding a repeating crossbow aimed right. Add a few square motion/dust pixels near his feet.
4. Enemies: three Nanman warriors approaching from the right at x≈790, 900, 1010. They should have feather headdresses, bone necklaces, darker tribal armor, and weapons such as mace or curved blade. Keep silhouettes readable and not too tiny.

HUD layer:
1. Boss health bar at the very top, x=250 y=20 w=780 h=44. Ornate Chinese pixel border in dark navy and gold. Left skull icon, label "孟获", bright red segmented HP fill at about 85%, small golden dragon/cloud corner motifs.
2. Top-left player panel, x=24 y=24 w=250 h=96. Include a square player portrait frame, segmented red HP bar, tiny armor icon, and ammo display "∞". Use dark slate panel background (#1E293B) with vermilion double border.
3. Top-center level title under the boss bar: "第壹关 — 西洱河初战" in amber pixel text, centered and readable.
4. Top-right mini-map, x=1040 y=26 w=210 h=110. Dark map panel with simplified terrain line, player green dot, three red enemy dots, and river blue strip.
5. Bottom-center dialog preview, x=260 y=585 w=660 h=105. Dark wood panel with ornate red border. Left small portrait of Zhuge Liang with white feather fan; text: "将士们，随我擒拿孟获！" in cream/amber pixel text.
6. Bottom-right weapon panel, x=960 y=585 w=280 h=105. Label "连弩", a small pixel repeating-crossbow icon, and an emerald green ammo/charge bar.
7. Add CRT scanlines and a subtle vignette, but keep all UI text readable.

Color discipline: gameplay scene uses warm orange-brown and bamboo green; UI panels use deep navy/dark wood backgrounds, vermilion red borders, amber labels, red HP bars, green ammo bars.

Negative constraints: no photorealistic rendering, no modern sci-fi HUD, no blurred UI, no unreadable pseudo-text, no overdecorated panels that hide gameplay.
```

---

## C. 中文精确提示词

```text
生成一张 1280×720 独立图片 横版动作游戏实机 HUD 截图，主题为三国题材《七擒孟获》，整体 16 位像素风。画面需要同时体现“真实可玩的场景”和“清晰可读的游戏 UI”。

游戏场景：
1. 背景为橙色黄昏天空，靠近地平线偏暖金，远处有层叠山峦剪影。两侧有竹林，中远景有蜿蜒河流，远处放两座木制瞭望塔。
2. 下半部是土路战场，加入小石块、断箭、草丛、尘土方块。
3. 玩家位于左中部 x≈390 y≈445，是汉军士卒，穿鳞甲，甲片用小矩形块表现；红色额带；手持连弩并朝右瞄准；脚边有尘土/移动像素。
4. 右侧三名南蛮战士从右向左逼近，位置约 x=790/900/1010。要能看出羽毛头饰、骨制项链、部族护甲、狼牙棒或弯刀。

HUD 叠加层：
1. 顶部 Boss 血条：x=250 y=20 w=780 h=44，华丽中式像素边框，左侧骷髅图标，文字“孟获”，红色分段血量约 85%，边角加金色龙纹/云纹小装饰。
2. 左上玩家面板：x=24 y=24 w=250 h=96，包含方形玩家头像框、分段红色 HP、护甲小图标、弹药“∞”。背景 #1E293B，朱砂红双线边框。
3. 顶部中央关卡名：“第壹关 — 西洱河初战”，琥珀金像素字，位于 Boss 血条下方，居中可读。
4. 右上小地图：x=1040 y=26 w=210 h=110，深色面板，包含简化地形线、蓝色河流条、绿色玩家点、三个红色敌点。
5. 底部中央对话预览：x=260 y=585 w=660 h=105，深木色面板，朱砂红华丽边框，左侧小诸葛亮头像（白色羽扇），文字“将士们，随我擒拿孟获！”。
6. 右下武器面板：x=960 y=585 w=280 h=105，显示“连弩”、连弩像素图标、翠绿色弹药/蓄力条。
7. 全屏叠加低透明度 CRT 扫描线和轻微暗角，但不能影响文字识别。

整体要求：角色、敌人、Boss 血条、玩家血条、小地图、对话框、武器栏全部出现；UI 面板是中式像素纹饰，不要现代玻璃 UI；场景与 HUD 层次分明。
```

---

## D. 图像生成规格

| 区域 | 坐标建议 | 说明 |
|---|---:|---|
| Boss 血条 | `x=250 y=20 w=780 h=44` | 85% 红色分段血量，左侧“孟获” |
| 玩家面板 | `x=24 y=24 w=250 h=96` | 头像、HP、∞ 弹药 |
| 关卡名 | `center x=640 y=92` | “第壹关 — 西洱河初战” |
| 小地图 | `x=1040 y=26 w=210 h=110` | 地形、河流、红点 |
| 玩家角色 | `x≈390 y≈445` | 朝右，连弩明显 |
| 三名敌人 | `x≈790/900/1010 y≈455` | 朝左逼近 |
| 对话预览 | `x=260 y=585 w=660 h=105` | 诸葛亮头像 + 文本 |
| 武器面板 | `x=960 y=585 w=280 h=105` | 连弩 + 绿色条 |

---

## E. 关键色板

| 用途 | 色值 |
|---|---|
| HUD 面板背景 | `#1E293B` |
| 深木色面板 | `#1C1917` |
| HUD 边框朱砂红 | `#DC2626` |
| 金色装饰/标题 | `#F59E0B` |
| HP 底色 | `#0F172A` |
| HP 填充 | `#EF4444` |
| 玩家 HP 填充 | `#DC2626` |
| 小地图底 | `#334155` |
| 弹药/武器绿 | `#22C55E` |
| 对话文字 | `#FEF3C7` |

---

## F. 检查清单

- [ ] Boss 血条在顶部最醒目，显示“孟获”和约 85% 血量。
- [ ] 左上玩家头像、HP、∞ 弹药完整。
- [ ] 右上小地图含玩家点和敌点。
- [ ] 玩家手持连弩朝右，右侧三名敌人朝左。
- [ ] 底部对话和武器栏不互相重叠。
- [ ] UI 和场景都保持像素风，文字可读。
