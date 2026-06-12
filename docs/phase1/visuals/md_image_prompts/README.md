# 《七擒孟获》AI 图像生成提示词 · 精修版

> 本版将原始“AI 图像生成提示词”升级为更适合生成精致游戏画面的**美术规格 + 精确提示词 + 构图约束 + 检查清单**。适用于让 AI 直接生成更精致、更统一的游戏概念图、界面图与设定图。

---

## 0. 全局美术规范

### 项目定位

- 游戏名：《七擒孟获》 / Seven Captures of Meng Huo
- 题材：三国历史幻想、南中战役、横版动作游戏
- 视觉风格：16 位复古像素风 + 中国风 UI + 类《魂斗罗》街机动作感 + 暗色电影感
- 关键词：Three Kingdoms, Nanman campaign, retro arcade, Contra-like action feel, 16-bit pixel art, Chinese ornamental UI, CRT scanlines

### 全局图像生成约束

- 所有图必须生成为**独立完整图片**，不能依赖后期拼贴、外部素材或额外图层补绘。
- 主菜单 / HUD / 对话场景：推荐画布尺寸为 `1280×720`。
- 七关色彩矩阵：推荐画布尺寸为 `1920×1080`。
- 使用以清晰像素块、硬边轮廓、阶梯状边缘与分层块面来强化像素感。
- 中文文字必须准确可读，不要伪字、乱码或过小文字。
- 如模型支持清晰文字，请优先使用块状像素中文字风格，避免乱码与伪字。
- 可使用光晕、渐变和透明叠层增强质感，但不要让画面变成光滑矢量插画；所有主要物体仍需保持像素块面与 16 位街机感。

### 全局配色

| 用途 | 色值 | 说明 |
|---|---|---|
| 深藏青背景 | `#0F172A` | 夜空、主底色 |
| 近景黑蓝 | `#0B1120` | 前景剪影、暗角 |
| 深蓝灰 | `#1E293B` | HUD 面板、山体 |
| 中蓝灰 | `#334155` | 远山、小地图 |
| 朱砂红 | `#DC2626` | 标题、边框、警示 |
| 亮红 | `#EF4444` | HP 血条 |
| 琥珀金 | `#F59E0B` | 标签、标题辅助 |
| 金色高光 | `#FBBF24` | 光晕、火光、装饰 |
| 火橙 | `#EA580C` | 篝火、火星 |
| 翠绿 | `#22C55E` | 开始按钮、弹药条 |
| 奶油白 | `#FEF3C7` | 对话文字 |

### 全局负面约束

```text
no photorealism, no 3D render, no smooth glossy modern UI, no mobile app glassmorphism, no anime chibi style, no blurred text, no pseudo-Chinese characters, no illegible typography, no external raster images, no random color palette, no overly clean flat vector style
```

---

## 01 — 主菜单界面 · 一键精修提示词

```text
Create a single standalone image title screen for a retro 16-bit pixel-art side-scrolling action game named "七擒孟获" / "SEVEN CAPTURES OF MENG HUO". Use a 1280x720 landscape canvas with crisp integer-coordinate pixel shapes.

Composition: deep navy night battlefield background (#0F172A), three jagged parallax mountain layers, smoky horizontal mist strips, and a huge blood-red moon in the upper-right around x=1010 y=145. The moon is #991B1B with muted red glow and square pixel craters, partly covered by thin pixel clouds.

Foreground: two Han Dynasty soldier silhouettes at the lower left and lower middle, facing right. They must have recognizable helmet crest, lamellar armor blocks, spear, and square shield, with tiny amber rim-light pixels.

War banners: two tall poles with stepped red cloth banners displaying "漢" and "蜀" in pale gold. Banner folds are jagged pixel steps, not smooth curves.

Main title: "七 擒 孟 获" centered in the upper-middle, roughly x=300..980 y=175..295. Use the largest blocky pixel Chinese characters, vermilion red #DC2626, dark 8px drop shadow, and gold #FBBF24 outline/inner glow. It must be the clearest visual element.

Subtitle: "SEVEN CAPTURES OF MENG HUO" centered below the title around y=320, amber #F59E0B, small pixel font with wide tracking.

Start button: bottom center around x=470..810 y=575..635. Text "[ 开 始 游 戏 ]" in emerald #22C55E, double pixel border, blinking corner blocks.

Decor: low-contrast pixel auspicious-cloud motifs in all four corners, 30-45 square ember particles rising from the bottom, CRT scanlines, subtle vignette. Keep the atmosphere dark, solemn, retro arcade, Contra-like action feel, and Chinese historical.

Negative: no photorealism, no 3D title, no modern glossy UI, no illegible Chinese, no overcrowding.
```

---

## 02 — 游戏 HUD 界面 · 一键精修提示词

```text
Create a standalone image in-game HUD screenshot for a 16-bit pixel-art Three Kingdoms side-scrolling action game "七擒孟获". Canvas 1280x720, crisp 16-bit pixel-art look, no collage, no external image dependency.

Scene: warm orange dusk battlefield with distant mountains, bamboo forests, winding river, wooden watchtowers, and a dirt path in the lower half. Add stones, broken arrows, grass blocks, and dust pixels.

Player: at center-left x≈390 y≈445, a Han foot soldier with rectangular lamellar armor plates, red headband, boots, and a repeating crossbow aimed right. Add square dust/motion pixels around feet.

Enemies: three Nanman warriors approaching from the right at x≈790, 900, 1010. They have feather headdresses, bone necklaces, tribal armor, and mace/curved blade silhouettes.

HUD: top boss bar x=250 y=20 w=780 h=44 with ornate Chinese pixel border, skull icon, label "孟获", red segmented HP fill at about 85%, and gold dragon/cloud corner motifs. Top-left player panel x=24 y=24 w=250 h=96: portrait frame, segmented red HP, armor icon, ammo "∞". Top-center level title: "第壹关 — 西洱河初战" in amber. Top-right mini-map x=1040 y=26 w=210 h=110 with terrain line, river strip, green player dot, three red enemy dots. Bottom-center dialog preview x=260 y=585 w=660 h=105 with Zhuge Liang portrait and text "将士们，随我擒拿孟获！". Bottom-right weapon panel x=960 y=585 w=280 h=105 with "连弩", crossbow icon, and green ammo/charge bar.

Style: dark navy/dark wood UI panels, vermilion borders, amber labels, red HP bars, green ammo bars, CRT scanlines, readable text.

Negative: no modern sci-fi HUD, no blurred UI, no unreadable pseudo-text, no photorealism.
```

---

## 03 — 对话框叙事场景 · 一键精修提示词

```text
Create a standalone image cinematic narrative dialog scene for a retro 16-bit pixel-art Three Kingdoms game "七擒孟获". Canvas 1280x720. Keep all text legible and all characters recognizable at a glance.

Use black cinematic letterbox bars y=0..48 and y=672..720. Upper scene y=48..500: night military camp under deep navy sky #0F172A with square stars, bamboo groves at both edges, Chinese war tents, hanging lanterns, and "漢" banners.

Place a central campfire around x=640 y=395 as the main light source. Flames are stepped pixel blocks in #FBBF24, #EA580C, #DC2626; add logs, sparks, and blocky warm glow. Add small narrative details: sleeping soldier silhouettes, stacked spears, a low table with war map, firefly pixels.

Dialog box x=80 y=500 w=1120 h=150: deep wood background #1C1917, double-line vermilion border #DC2626, gold corner flourishes, cloud/wave pixel motifs. Left portrait area x=110 y=515 w=145 h=120: Zhuge Liang in a circular frame, white robe with blue trim, traditional headwrap, long black beard, wise eyes, white crane-feather fan near his face.

Right text area: label "汉 · 丞相" in amber #F59E0B, main text "南蛮之地，瘴气弥漫。孟获虽败，必不甘心。" in large cream #FEF3C7, small tag "士卒视角" top-right, blinking "▼" bottom-right. Add CRT scanlines and subtle vignette without obscuring text.

Mood: solemn strategy at night, warm firelight versus cold darkness, polished retro game cutscene still.

Negative: no modern chat bubble, no app-like rounded card, no photorealism, no anime glossy portrait, no unreadable text.
```

---

## 04 — 七关色彩氛围矩阵 · 一键精修提示词

```text
Create a standalone image professional pixel-art visual design reference sheet for the 7-level atmosphere and color progression of the Three Kingdoms action game "七擒孟获". Canvas 1920x1080, crisp 16-bit pixel art, no external images.

Background: dark navy #0F172A with subtle pixel grid and CRT scanlines. Header: "七擒孟获 · 七关色彩氛围矩阵" in vermilion/gold, subtitle "Color & Mood Progression / Meng Huo Emotional Arc".

Arrange seven vertical cards left to right, each about w≈238 h≈660, y≈145, gap≈20. Each card has a pixel decorative border matching its dominant color, dark inner panel, Chinese seal/cloud motif, level number, Chinese level name, English subtitle, small pixel landscape, pixel facial expression, and Chinese mood label.

Cards:
1. 第壹关 / 西洱河初战 / First Battle at Xier River — #166534 + #F59E0B — wide river, bamboo rafts, green mountains, morning mist — arrogant raised-brow pixel face — "轻敌傲慢".
2. 第贰关 / 锦带山夜袭 / Night Raid at Jindai Mountain — #4C1D95 + #94A3B8 — night mountain pass, full moon, cliff torches — defensive side-eye face — "诡辩不服".
3. 第叁关 / 泸水渡河 / Crossing Lu River — #0F766E + #FEF3C7 — rapids, wooden bridge, gorge, foam blocks — confused frown — "困惑动摇".
4. 第肆关 / 秃龙洞突围 / Breakout at Tulong Cave — #78350F + #EA580C — underground cave, stalactites, torchlight, glowing fungi — stubborn angry face — "固执顽抗".
5. 第伍关 / 银坑山决战 / Battle at Silver Pit Mountain — #475569 + #CBD5E1 — mining pit, scaffolds, silver ore glints, dust — anxious struggle face — "挣扎犹疑".
6. 第陆关 / 盘蛇谷困局 / Snake Valley Trap — #991B1B + #1C1917 — winding gorge, smoke, fire, dead trees, trap path — reflective doubt face — "反思动摇".
7. 第柒关 / 南中归心 / Surrender at Nanzhong — #B45309 + #D97706 — sunrise plain, two figures facing each other, lowered banners — peaceful acceptance face — "心悦诚服".

Bottom section: long segmented color progression bar x≈180..1740 y≈865 h≈34 using all seven dominant colors in order with small level labels. Below it, draw "孟获心态弧线": starts high at "抵抗", dips through "困惑 / 挣扎", rises at "反思", ends at "折服". Use amber line and square node points. Add small arrows between cards.

Negative: no missing card, no real emoji font, no photorealism, no unreadable Chinese, no random colors, no pure abstract blocks.
```

---

## 文件对应关系

| 文件 | 用途 | 推荐出图尺寸 |
|---|---|---|
| `01-main-menu-prompt.md` | 主菜单界面 | 1280×720 |
| `02-game-hud-prompt.md` | 游戏实机 HUD | 1280×720 |
| `03-dialog-system-prompt.md` | 叙事对话场景 | 1280×720 |
| `04-level-colors-prompt.md` | 七关色彩矩阵 | 1920×1080 |

---

## 使用建议

1. 如果让图像模型生成，优先使用每个文件中的 **English Prompt** 或 README 的“一键精修提示词”。
2. 如果让代码模型生成 图片，优先使用每个文件中的 **图片 实现规格** 和 **检查清单**。
3. 如果生成结果“不够精致”，不要只加“more detailed”，应指定：边框纹样、角色局部、场景叙事物件、坐标位置、文字字号与图层优先级。
