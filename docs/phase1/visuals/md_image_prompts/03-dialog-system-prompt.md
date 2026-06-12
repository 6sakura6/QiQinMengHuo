# 03 — 对话框叙事场景 · 精修提示词 / 图像生成规格

> 目标：生成《七擒孟获》过场叙事画面。重点是**上半部军营氛围 + 下半部对话框 UI + 诸葛亮肖像**三者同时精致，而不是只画一个普通文本框。

---

## A. 统一生成约束（必须遵守）

- 输出形式：**单张独立图片**，不可依赖后期拼贴。
- 画布：`viewBox="0 0 1280 720"`。
- 构图比例：上方场景约 68%-70%，下方对话框约 30%-32%。保留黑色电影遮幅。
- 像素风：使用块状阴影、硬边矩形、阶梯状火光、像素粒子；避免平滑写实插画。
- 文字必须准确：`汉 · 丞相`、`南蛮之地，瘴气弥漫。孟获虽败，必不甘心。`、`士卒视角`、`▼`。
- 禁止项：不要现代聊天气泡、不要圆角卡片 App 风、不要把诸葛亮画成现代人物、不要让主对话文字过小或乱码。

---

## B. 精修 English Prompt

```text
Create a standalone image cinematic narrative dialog scene for a retro 16-bit pixel-art Three Kingdoms Chinese action game "七擒孟获". Canvas 1280x720, crisp pixel shapes, no external images.

Composition:
1. Use black cinematic letterbox bars: top bar y=0..48, bottom bar y=672..720. The visible upper scene occupies roughly y=48..500. The dialog UI occupies roughly y=490..670.
2. Upper scene: a night military camp. Background sky is deep navy (#0F172A) with sparse square stars. Add bamboo groves framing left and right edges, several Chinese war tents with sloped roofs in the background, hanging lanterns on wooden poles, and "漢" banners partly lit by fire.
3. Campfire: place a central campfire around x=640 y=395. Make it the light source. Use layered square/stepped flames in amber (#FBBF24), orange (#EA580C), and red (#DC2626). Add a warm radial glow using blocky transparent rectangles, not smooth airbrush. Put logs and small sparks around it.
4. Atmospheric details: add stacked spears, a rolled war map on a low table, sleeping soldier silhouettes near tents, and subtle firefly/spark pixels. Keep them small but readable.
5. Dialog box: place a large ornate Chinese-style pixel dialog panel at x=80 y=500 w=1120 h=150. Background deep wood #1C1917. Border: double-line vermilion #DC2626 with gold corner flourishes and cloud/wave pixel motifs.
6. Portrait area: on the left of the dialog box, x=110 y=515 w=145 h=120. Draw Zhuge Liang's pixel portrait inside a circular/medallion frame: white robe with blue trim, traditional headwrap, long black beard, wise intense eyes, and a white crane-feather fan held near his face. Use cream highlights and blue shadows.
7. Text area: right side of dialog box from x=285 to x=1140. Top label "汉 · 丞相" in amber #F59E0B at y≈528. Main text below in cream #FEF3C7, large and readable: "南蛮之地，瘴气弥漫。孟获虽败，必不甘心。". Add subtle warm shadow behind text.
8. Add "士卒视角" as a small tag in the top-right of the dialog text area, and a blinking triangle "▼" at bottom-right.
9. Overlay low-opacity CRT scanlines and a subtle vignette, but do not obscure the dialog.

Mood: solemn strategy at night; warm campfire light contrasts with cold navy darkness. The scene should feel like a polished retro game cutscene still, not a flat UI mockup.

Negative constraints: no modern UI, no photorealism, no anime-style glossy portrait, no unreadable text, no smooth gradients dominating the image, no empty background.
```

---

## C. 中文精确提示词

```text
生成一张 1280×720 独立图片 叙事对话场景，主题为《七擒孟获》三国游戏过场。画面必须有电影遮幅、夜间军营、诸葛亮肖像、华丽中式对话框。

构图：
1. 顶部黑色电影遮幅 y=0..48，底部黑色遮幅 y=672..720。上方场景区域约 y=48..500，下方对话框约 y=500..650。
2. 上方军营：深藏青夜空 #0F172A，少量方形星点；左右竹林框景；背景放中式坡顶军帐；木杆灯笼发出琥珀光；插有“漢”字战旗。
3. 篝火在画面中央偏下，x≈640 y≈395，是主要光源。火焰由 #FBBF24、#EA580C、#DC2626 的阶梯像素块组成，周围有木柴、火星、方块状暖光晕。
4. 细节：军帐旁加入睡卧士卒剪影、武器架/长矛、矮桌上的作战地图、少量萤火/火星像素，提升叙事感。
5. 对话框：x=80 y=500 w=1120 h=150，深木色背景 #1C1917，朱砂红 #DC2626 双线边框，四角加金色云纹/回纹/波纹像素装饰。
6. 左侧肖像区：x=110 y=515 w=145 h=120，圆形或徽章式边框。绘制诸葛亮像素肖像：白袍蓝边、纶巾、黑色长髯、睿智眼神、白色鹤羽扇靠近脸侧。
7. 右侧文本区：x=285..1140。顶部标签“汉 · 丞相”，琥珀金 #F59E0B；主文本“南蛮之地，瘴气弥漫。孟获虽败，必不甘心。”，奶油白 #FEF3C7，必须大而清晰。
8. 文本区右上角放小标签“士卒视角”，右下角放闪烁提示“▼”。
9. 全屏添加低透明度 CRT 扫描线和暗角，不能遮挡对话文字。

整体氛围：凝重、运筹帷幄、寒夜与篝火形成冷暖对比；像一张精致的 16 位复古游戏过场截图。
```

---

## D. 图像生成规格

| 区域 | 坐标建议 | 绘制重点 |
|---|---:|---|
| 顶部遮幅 | `y=0 h=48` | 纯黑 |
| 底部遮幅 | `y=672 h=48` | 纯黑 |
| 场景区域 | `y=48..500` | 夜空、竹林、帐篷、灯笼、旗帜 |
| 篝火 | `x≈640 y≈395` | 阶梯火焰 + 方块光晕 |
| 对话框 | `x=80 y=500 w=1120 h=150` | 深木底 + 朱砂双线边框 |
| 诸葛亮肖像 | `x=110 y=515 w=145 h=120` | 白袍、蓝边、纶巾、长髯、羽扇 |
| 标签 | `x≈285 y≈528` | “汉 · 丞相” |
| 主文本 | `x≈285 y≈572` | 一行或两行，必须可读 |
| 视角标签 | `x≈1030 y≈528` | “士卒视角” |
| 继续提示 | `x≈1148 y≈625` | “▼” |

---

## E. 关键色板

| 用途 | 色值 |
|---|---|
| 夜空 | `#0F172A` |
| 远景暗蓝 | `#1E293B` |
| 帐篷深棕 | `#78350F` |
| 灯笼/火光金 | `#FBBF24` |
| 火焰橙 | `#EA580C` |
| 火焰红 | `#DC2626` |
| 对话框背景 | `#1C1917` |
| 对话框边框 | `#DC2626` |
| 标签文字 | `#F59E0B` |
| 对话文字 | `#FEF3C7` |
| 诸葛亮白袍 | `#F8FAFC` |
| 袍服蓝边 | `#3B82F6` |

---

## F. 检查清单

- [ ] 有明显电影遮幅。
- [ ] 上方军营不是空背景，包含帐篷、灯笼、竹林、旗帜、篝火。
- [ ] 篝火是主要光源，冷暖对比明显。
- [ ] 对话框中式边框足够精致。
- [ ] 诸葛亮具备羽扇、纶巾、长髯、白袍蓝边。
- [ ] 四段文字全部准确且可读。
