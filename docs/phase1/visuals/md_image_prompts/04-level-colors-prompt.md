# 04 — 七关色彩氛围矩阵 · 精修提示词 / 图像生成规格

> 目标：生成《七擒孟获》7 个关卡的视觉设计参考图片。重点是**七张卡片信息完整、色彩递进清楚、每关有具体场景剪影、底部情绪弧线可读**。

---

## A. 统一生成约束（必须遵守）

- 输出形式：**单张独立图片**，不可依赖后期拼贴。
- 画布：`viewBox="0 0 1920 1080"`，16:9 横向设计稿。
- 布局：7 张等宽竖卡从左到右排列，卡片之间留 18-24px 间距。
- 信息层级：每卡必须包含：关卡编号、中文关卡名、英文小标题/说明、主色块、场景剪影、孟获心态图标或像素表情、氛围词。
- 像素风：卡片边框、图标、场景剪影都使用硬边像素形状；不要纯抽象色块，也不要写实插画。
- 禁止项：不要漏掉任意关卡；不要让文字堆叠不可读；不要使用真实 emoji 字体导致风格不统一，优先绘制“像素表情脸”。

---

## B. 精修 English Prompt

```text
Create a standalone image professional pixel-art visual design reference sheet for the 7-level atmosphere and color progression of the Three Kingdoms action game "七擒孟获". Canvas 1920x1080, crisp 16-bit pixel-art look, no collage, no external image dependency.

Overall layout:
1. Dark document background #0F172A with a subtle pixel grid and CRT scanlines.
2. Header at the top: title "七擒孟获 · 七关色彩氛围矩阵" in vermilion and gold, plus small subtitle "Color & Mood Progression / Meng Huo Emotional Arc".
3. Seven vertical cards arranged left to right across the middle. Suggested card size: w≈238 h≈660, top y≈145, with 20px gaps. Each card has a pixel-art decorative border matching its dominant color, a dark inner panel, and a small Chinese seal/stamp motif.
4. Inside each card: top large level number using Chinese numerals 第壹关..第柒关; below it the Chinese level name; then a small atmospheric pixel landscape illustration; then a pixel facial expression representing Meng Huo's mental state; then the mood label in Chinese.

Card content:
CARD 1 — 第壹关 / 西洱河初战 / First Battle at Xier River
- Dominant color #166534 emerald green; accent #F59E0B gold.
- Scene: wide river, bamboo rafts, distant green mountains, soft morning mist.
- Pixel face: arrogant raised brow / angry confidence.
- Mood label: "轻敌傲慢".

CARD 2 — 第贰关 / 锦带山夜袭 / Night Raid at Jindai Mountain
- Dominant color #4C1D95 deep purple; accent #94A3B8 silver moonlight.
- Scene: narrow mountain pass at night, full moon, cliff torches.
- Pixel face: defensive side-eye.
- Mood label: "诡辩不服".

CARD 3 — 第叁关 / 泸水渡河 / Crossing Lu River
- Dominant color #0F766E teal; accent #FEF3C7 white foam.
- Scene: rapids, wooden bridge, steep gorge walls, splashing water blocks.
- Pixel face: confused frown.
- Mood label: "困惑动摇".

CARD 4 — 第肆关 / 秃龙洞突围 / Breakout at Tulong Cave
- Dominant color #78350F dark amber brown; accent #EA580C torch orange.
- Scene: underground cave, stalactites, torchlight, glowing fungi.
- Pixel face: stubborn anger.
- Mood label: "固执顽抗".

CARD 5 — 第伍关 / 银坑山决战 / Battle at Silver Pit Mountain
- Dominant color #475569 iron slate; accent #CBD5E1 silver ore.
- Scene: mining pit, wooden scaffolds, silver vein glints, dust.
- Pixel face: anxious struggle.
- Mood label: "挣扎犹疑".

CARD 6 — 第陆关 / 盘蛇谷困局 / Snake Valley Trap
- Dominant color #991B1B deep crimson; accent #1C1917 black smoke.
- Scene: winding valley gorge, smoke, fire, dead trees, trap-like path.
- Pixel face: reflective doubt.
- Mood label: "反思动摇".

CARD 7 — 第柒关 / 南中归心 / Surrender at Nanzhong
- Dominant color #B45309 warm gold; accent #D97706 peaceful amber.
- Scene: sunrise plain, two figures facing each other, lowered banners, calm horizon.
- Pixel face: peaceful acceptance.
- Mood label: "心悦诚服".

Bottom section:
1. A long horizontal segmented color gradient bar from x≈180 to x≈1740 y≈865 h≈34. It must transition through all seven dominant colors in order, with small labels below each segment.
2. Under the gradient, draw a narrative emotional arc curve labeled "孟获心态弧线". The curve starts high at "抵抗", dips through "困惑 / 挣扎", rises toward "反思", and ends calmly at "折服". Use amber line and small square control points.
3. Add connecting arrows between cards showing progression from Level 1 to Level 7.

Mood: professional game art bible reference sheet, not a gameplay screenshot. Clear typography, clean grid, dense but readable information.

Negative constraints: no missing card, no photorealism, no soft infographic icons, no real emoji font, no unreadable Chinese, no random colors outside the specified palette.
```

---

## C. 中文精确提示词

```text
生成一张 1920×1080 独立图片 视觉设计参考表，主题为《七擒孟获》七个关卡的色彩与情绪递进。整体是 16 位像素风 + 专业游戏美术设定集页面，不是普通信息图。

整体布局：
1. 背景为深藏青 #0F172A，叠加低透明度像素网格和 CRT 扫描线。
2. 顶部标题：“七擒孟获 · 七关色彩氛围矩阵”，朱砂红与金色组合；副标题：“Color & Mood Progression / Meng Huo Emotional Arc”。
3. 中部横向排列 7 张竖卡，每张约 w=238 h=660，顶部 y≈145，卡片间距 20px。每张卡有匹配主色的像素装饰边框、深色内底、小型印章/云纹装饰。
4. 每张卡内部必须包含：关卡编号（第壹关至第柒关）、中文关卡名、英文小标题、小型场景像素剪影、孟获像素表情脸、中文氛围词。

七张卡内容：
1. 第壹关 / 西洱河初战 / First Battle at Xier River
   主色 #166534，辅色 #F59E0B。场景：宽阔河流、竹筏、远山、晨雾。表情：傲慢挑眉/自信怒脸。氛围词：“轻敌傲慢”。
2. 第贰关 / 锦带山夜袭 / Night Raid at Jindai Mountain
   主色 #4C1D95，辅色 #94A3B8。场景：夜间山隘、满月、崖壁火把。表情：斜眼防御、不服。氛围词：“诡辩不服”。
3. 第叁关 / 泸水渡河 / Crossing Lu River
   主色 #0F766E，辅色 #FEF3C7。场景：激流、木桥、峡谷、水沫像素块。表情：困惑皱眉。氛围词：“困惑动摇”。
4. 第肆关 / 秃龙洞突围 / Breakout at Tulong Cave
   主色 #78350F，辅色 #EA580C。场景：地下洞穴、钟乳石、火把、发光菌菇。表情：固执怒视。氛围词：“固执顽抗”。
5. 第伍关 / 银坑山决战 / Battle at Silver Pit Mountain
   主色 #475569，辅色 #CBD5E1。场景：矿坑、木架、银矿闪光、尘土。表情：焦虑挣扎。氛围词：“挣扎犹疑”。
6. 第陆关 / 盘蛇谷困局 / Snake Valley Trap
   主色 #991B1B，辅色 #1C1917。场景：蜿蜒峡谷、黑烟、火光、枯树、陷阱路径。表情：反思怀疑。氛围词：“反思动摇”。
7. 第柒关 / 南中归心 / Surrender at Nanzhong
   主色 #B45309，辅色 #D97706。场景：日出平原、两人相对、旗帜低垂、平静地平线。表情：平和接受。氛围词：“心悦诚服”。

底部信息区：
1. 在 x≈180..1740 y≈865 放一条长色彩递进条，按 7 个主色分段过渡，每段下方标注对应关卡。
2. 色条下方绘制“孟获心态弧线”：从“抵抗”高点开始，经过“困惑 / 挣扎”的低谷，向“反思”回升，最后到“折服”。曲线用琥珀金线条，节点用方形像素点。
3. 卡片之间加入小箭头，表示从第壹关到第柒关的推进。

整体要求：每张卡信息齐全且文字可读；表情不要直接使用系统 emoji，改为统一风格的像素表情脸；场景必须是具体剪影，不要只画抽象色块。
```

---

## D. 图像生成规格

| 元素 | 坐标/尺寸建议 | 说明 |
|---|---:|---|
| 画布 | `1920×1080` | 16:9 设计稿 |
| 主标题 | `x=960 y=70` | 居中，红金像素字 |
| 副标题 | `x=960 y=108` | 小号英文说明 |
| 卡片区 | `y=145 h=660` | 7 张等宽竖卡 |
| 单卡尺寸 | `w≈238 h≈660` | 间距 20px |
| 场景剪影 | 单卡中部 `h≈220` | 每关不同场景 |
| 像素表情 | 单卡下部 | 不用真实 emoji 字体 |
| 色彩递进条 | `x=180 y=865 w=1560 h=34` | 七色分段 |
| 情绪弧线 | `y≈940..1015` | 抵抗 → 困惑/挣扎 → 反思 → 折服 |

---

## E. 七关色彩编码表

| 关卡 | 关卡名 | 主色 | 辅色 | 表情语义 | 氛围词 |
|---|---|---|---|---|---|
| 1 | 西洱河初战 | `#166534` | `#F59E0B` | 傲慢 | 轻敌傲慢 |
| 2 | 锦带山夜袭 | `#4C1D95` | `#94A3B8` | 不服 | 诡辩不服 |
| 3 | 泸水渡河 | `#0F766E` | `#FEF3C7` | 困惑 | 困惑动摇 |
| 4 | 秃龙洞突围 | `#78350F` | `#EA580C` | 固执 | 固执顽抗 |
| 5 | 银坑山决战 | `#475569` | `#CBD5E1` | 挣扎 | 挣扎犹疑 |
| 6 | 盘蛇谷困局 | `#991B1B` | `#1C1917` | 反思 | 反思动摇 |
| 7 | 南中归心 | `#B45309` | `#D97706` | 接受 | 心悦诚服 |

---

## F. 检查清单

- [ ] 7 张卡片都出现，顺序正确。
- [ ] 每卡有编号、中文名、英文名、场景、表情、氛围词。
- [ ] 底部有七色递进条。
- [ ] 底部有“孟获心态弧线”。
- [ ] 每关场景不重复，主色与设定表一致。
- [ ] 整体像专业游戏美术设定集页面。
