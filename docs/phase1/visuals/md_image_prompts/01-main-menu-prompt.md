# 01 — 主菜单界面 · 精修提示词 / 图像生成规格

> 目标：生成《七擒孟获》复古横版动作游戏的主菜单 图片。重点不是单纯“像素风”，而是**可读性强、层次清楚、具有三国战争史诗感的 16 位像素 UI 画面**。

---

## A. 统一生成约束（必须遵守）

- 输出形式：**单张独立图片**，不要引用外部图片、外部字体、滤镜库或远程资源。
- 画布：`viewBox="0 0 1280 720"`，16:9 横版。
- 像素感实现：所有主要图形使用整数坐标、直角矩形、阶梯边缘、低分辨率块面；避免柔滑矢量插画感。
- 字体建议：优先 `"Zpix", "SimSun", "Microsoft YaHei", monospace`；中文标题保持可编辑文字层，同时用像素块投影增强像素感。
- 风格关键词：16-bit pixel art、retro arcade、Chinese Three Kingdoms、dark battlefield、CRT scanlines、cinematic title screen。
- 禁止项：不要现代 UI、不要 3D 渲染、不要写实照片、不要卡通圆润 Q 版、不要复杂渐变堆满画面、不要让标题难以辨认。

---

## B. 精修 English Prompt

```text
Create a single standalone image title screen for a retro 16-bit pixel-art side-scrolling action game named "七擒孟获" / "SEVEN CAPTURES OF MENG HUO". Use a 1280x720 landscape canvas with crisp integer-coordinate pixel shapes.

Composition:
1. Background layer: a deep navy night battlefield (#0F172A) with three parallax layers of jagged mountain silhouettes. The far mountains are smoky blue-gray (#334155), the middle mountains are dark slate (#1E293B), and the foreground ridge is nearly black (#0B1120). Add low mist bands as semi-transparent horizontal pixel strips.
2. Upper-right focal point: a huge blood-red moon, about 170px diameter, placed around x=1010 y=145. Use dark crimson core (#991B1B), muted red outer glow, and a few square pixel craters. Keep the moon partly behind thin pixel clouds.
3. Foreground: two Han Dynasty soldier silhouettes at the lower left and lower middle, facing right. Each soldier must have recognizable helmet crest, lamellar armor blocks, spear, and square shield. Use black/navy silhouettes with small amber rim-light pixels from below.
4. War banners: two tall vertical banner poles, one left and one right of the title zone. The red banners display the Chinese characters "漢" and "蜀" in pale gold. The banner cloth should be jagged and stepped like pixel folds, not smooth curves.
5. Main title: place "七 擒 孟 获" centered in the upper-middle, occupying roughly x=300..980, y=175..295. Use large blocky pixel Chinese characters in vermilion red (#DC2626), with a dark drop shadow shifted 8px down-right and a golden inner glow / outline (#FBBF24). The title must be the clearest element in the image.
6. Subtitle: below the title, set "SEVEN CAPTURES OF MENG HUO" in small amber pixel font (#F59E0B), centered around y=320, with wide tracking.
7. Start button: bottom center, around x=470..810 y=575..635. Text: "[ 开 始 游 戏 ]" in emerald green (#22C55E), with a two-layer decorative pixel border and small blinking corner blocks. The button should look interactive but not modern.
8. Chinese decorative motifs: add pixel-style auspicious cloud patterns in all four corners. Use low-contrast muted gold/red so they decorate without stealing focus.
9. Atmosphere: add 30-45 tiny ember particles rising from the bottom edge, varying from orange (#EA580C) to amber (#FBBF24). Add a subtle vignette made from dark rectangular edge bands.
10. CRT effect: overlay evenly spaced 2px horizontal scanlines with low opacity across the full screen and a very subtle pixel grid.

Color discipline: keep the image dark and atmospheric. Main colors are deep navy/charcoal, vermilion red, amber gold, emerald green. Maintain strong readability for all Chinese text.

Negative constraints: no photorealism, no smooth painterly gradients, no 3D text, no modern glossy UI, no anime characters, no illegible pseudo-Chinese text, no overcrowding.
```

---

## C. 中文精确提示词

```text
生成一张独立图片 游戏主菜单，画布 1280×720，16:9。主题为三国题材横版动作游戏《七擒孟获》，整体为 16 位复古像素风，深色战争史诗氛围。

画面分层：
1. 背景为深藏青夜空 #0F172A，三层远近山峦剪影，远山 #334155，中景 #1E293B，近景接近黑色 #0B1120。山体边缘使用锯齿像素阶梯，不要平滑曲线。加入几条低透明度横向雾带。
2. 右上角放置巨大血红月亮，约 170px 直径，中心 #991B1B，外圈暗红光晕，月面加少量方形像素斑点，并让几片像素云从前方掠过。
3. 前景左下与中下方放两名汉军士卒剪影，朝右站立。必须能看出头盔、甲片、长矛、方盾，用深黑蓝剪影表现，边缘加少量琥珀色火光像素。
4. 左右各一面古代战旗，红色旗布、黑色旗边，旗上分别写“漢”“蜀”，文字用淡金色。旗布飘动用阶梯折线表现，不要使用平滑布料曲线。
5. 主标题“七 擒 孟 获”位于画面中上部，约 x=300..980，y=175..295。字体必须最大、最清楚，朱砂红 #DC2626，带 8px 深色投影和 #FBBF24 金色描边/内光。
6. 副标题“SEVEN CAPTURES OF MENG HUO”位于标题下方，y≈320，琥珀金 #F59E0B，小号像素字，字距拉开。
7. 底部中央按钮“[ 开 始 游 戏 ]”，位置约 x=470..810，y=575..635，翠绿 #22C55E，双层像素边框，四角带闪烁方块感。
8. 四角添加低对比度祥云像素纹样，作为中国风装饰，不要抢主标题视觉中心。
9. 底部向上漂浮 30-45 个火星粒子，颜色 #EA580C/#FBBF24，大小为 2-5px 方块。
10. 全屏覆盖低透明度 CRT 扫描线与轻微像素网格，边缘加入暗角。

整体要求：主标题一眼可读；画面暗、肃杀、复古街机；像素块清晰；所有元素用整数坐标与硬边图形绘制。
```

---

## D. 图像生成规格

| 层级 | 建议 ID | 内容 | 绘制要求 |
|---|---|---|---|
| 1 | `bg-sky` | 夜空底色 | 整块矩形 #0F172A |
| 2 | `moon` | 血月、像素斑点、云 | 圆 + 方块斑点 + 阶梯云 |
| 3 | `mountains` | 三层山峦 | 多边形必须锯齿化 |
| 4 | `mist` | 雾带 | 横向半透明像素条 |
| 5 | `banners` | “漢”“蜀”旗 | 红旗、黑边、淡金字 |
| 6 | `soldiers` | 汉军剪影 | 头盔/甲片/矛/盾必须可识别 |
| 7 | `title` | 主标题与副标题 | 标题最大、红金配色、双层投影 |
| 8 | `start-button` | 开始按钮 | 双层边框、绿色文字 |
| 9 | `decor-clouds` | 祥云角花 | 低对比度像素纹样 |
| 10 | `particles` | 火星 | 方块粒子，不用圆点 |
| 11 | `crt-overlay` | 扫描线/暗角 | 低透明度，不能遮挡文字 |

---

## E. 关键色板

| 用途 | 色值 |
|---|---|
| 夜空背景 | `#0F172A` |
| 近景黑蓝 | `#0B1120` |
| 山峦远景 | `#334155` |
| 山峦中景 | `#1E293B` |
| 主标题朱砂红 | `#DC2626` |
| 金色描边/光 | `#FBBF24` |
| 副标题琥珀金 | `#F59E0B` |
| 开始按钮翠绿 | `#22C55E` |
| 血月 | `#991B1B` |
| 火星橙 | `#EA580C` |

---

## F. 检查清单

- [ ] 标题“七 擒 孟 获”清晰、居中、最大。
- [ ] “漢”“蜀”旗帜明确出现。
- [ ] 右上血月醒目但不压过标题。
- [ ] 两名士卒能看出矛、盾、甲胄。
- [ ] 开始按钮位于底部中央且可读。
- [ ] 全局像素风统一，没有现代按钮或写实质感。
