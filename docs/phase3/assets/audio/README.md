# 音频资产说明

## 概述

Phase 3 音频资产包含 **6 首 BGM** 和 **8 个 SFX**，均为 Python 数学合成（无版权问题），用于游戏开发集成测试。

## 目录结构

```
audio/
├── bgm/
│   ├── bgm_main_menu.wav         (60s)  主菜单 - 史诗肃穆
│   ├── bgm_level_01.wav          (90s)  第1关战斗 - 紧张激昂
│   ├── bgm_level_01_boss.wav     (60s)  Boss战 - 史诗对决
│   ├── bgm_cutscene_tense.wav    (30s)  紧张过场 - 戏剧张力
│   ├── bgm_cutscene_calm.wav     (45s)  平静过场 - 宁静反思
│   └── bgm_victory_fanfare.wav   (4s)   胜利号角 - 凯旋
├── sfx/
│   ├── shoot.wav                 (0.08s) 射击 - 短促高频
│   ├── hit.wav                   (0.06s) 命中 - 中频击打
│   ├── jump.wav                  (0.12s) 跳跃 - 上升音阶
│   ├── boss_charge.wav           (1.0s)  Boss冲锋 - 低沉轰鸣
│   ├── boss_stomp.wav            (0.8s)  Boss踏地 - 低频冲击
│   ├── dialog_popup.wav          (0.2s)  对话弹出 - 清脆提示
│   ├── capture.wav               (1.5s)  擒获 - 戏剧下降
│   └── victory.wav               (0.7s)  胜利 - 凯旋号角
└── README.md (本文件)
```

## 技术规格

| 属性 | 值 |
|---|---|
| 格式 | WAV (PCM 16-bit) |
| 采样率 | 44100 Hz |
| 声道 | Mono |
| 来源 | 数学合成（`generate_placeholder_audio.py`） |
| 版权 | 无版权限制，可自由使用 |

## 使用方式

### Web (HTML5 Audio)

```html
<audio id="bgm" src="assets/audio/bgm/bgm_level_01.wav" loop></audio>
<audio id="sfx_shoot" src="assets/audio/sfx/shoot.wav"></audio>
```

### JavaScript

```js
const bgm = new Audio('assets/audio/bgm/bgm_level_01.wav');
bgm.loop = true;
bgm.volume = 0.5;

function playShoot() {
    const sfx = new Audio('assets/audio/sfx/shoot.wav');
    sfx.volume = 0.3;
    sfx.play();
}
```

### 引擎 (Phaser/Unity/Godot)

通过 `asset-manifest.json` 中的路径引用即可。所有路径均为相对于 `phase3/` 目录的相对路径。

## 升级建议

当前为**功能占位音频**，正式版建议替换为：

### 免费音效资源站
| 站点 | 许可 |
|---|---|
| [Freesound.org](https://freesound.org/) | CC0/CC-BY |
| [OpenGameArt.org](https://opengameart.org/) | CC0/CC-BY |
| [Zapsplat.com](https://www.zapsplat.com/) | 免费账号 |
| [Pixabay Sound Effects](https://pixabay.com/sound-effects/) | 免费 |

### 替换方法
1. 下载同名替换音频
2. 如需 `.ogg` 格式，用 `ffmpeg` 转换：
   ```bash
   ffmpeg -i shoot.wav -c:a libvorbis -q:a 4 shoot.ogg
   ```
3. 更新 `asset-manifest.json` 中的路径扩展名

## 重新生成

如需调整音频，修改 `generate_placeholder_audio.py` 后重新运行：

```bash
python generate_placeholder_audio.py
```
