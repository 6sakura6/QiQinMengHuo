#!/usr/bin/env python3
"""
slice_ui_fills.py — Step 6b: 从 HP 条切片中提取填充条区域

分析结果:
- HP Bar fill: x=4, y=23, 235×37 (亮红渐变填充)
- Boss HP Bar fill: 需要扫描
"""
from PIL import Image
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path("public/assets/ui")

def extract_fill(name, src_path, fill_x, fill_y, fill_w, fill_h):
    """从源图中提取填充区域并保存"""
    img = Image.open(src_path)
    fill = img.crop((fill_x, fill_y, fill_x + fill_w, fill_y + fill_h))
    out = OUTPUT_DIR / f"{name}.png"
    fill.save(out, "PNG", optimize=True)
    
    arr = np.array(fill)
    if arr.shape[2] == 4:
        non_alpha = np.sum(arr[:,:,3] > 20)
        pct = 100 * non_alpha / (fill_w * fill_h)
    else:
        pct = 100
    print(f"  {name}: ({fill_x},{fill_y}) {fill_w}×{fill_h} → {out.name} ({pct:.0f}% fill)")

# ── 玩家血条填充 ──
# 从 ui_hp_bar.png (342×174) 中提取填充条: x=4, y=23, 235×37
extract_fill("ui_hp_fill", "public/assets/ui/ui_hp_bar.png", 4, 23, 235, 37)

# ── Boss 血条填充 ──
# 先扫描 ui_boss_hp_bar.png (564×174) 找到填充区域
boss = np.array(Image.open("public/assets/ui/ui_boss_hp_bar.png"))
bh, bw = boss.shape[:2]
print(f"\nBoss HP Bar: {bw}×{bh}")

# 找连续高 alpha 行中的红色区域
for y in range(bh):
    row_alpha = boss[y, :, 3]
    high = row_alpha > 200
    if np.sum(high) > bw * 0.2:
        changes = np.diff(high.astype(int))
        starts = np.where(changes == 1)[0] + 1
        ends = np.where(changes == -1)[0]
        if high[0]: starts = np.insert(starts, 0, 0)
        if high[-1]: ends = np.append(ends, bw - 1)
        for s, e in zip(starts[:len(ends)], ends[:len(starts)]):
            if e - s > 50:
                seg = boss[y, s:e+1]
                r, g, b = np.mean(seg[:, 0]), np.mean(seg[:, 1]), np.mean(seg[:, 2])
                # 找红色为主的区域
                if r > 100 and r > g * 1.3:
                    print(f"  boss row[{y:3d}] x[{s:3d}-{e:3d}] len={e-s:3d} rgb=({r:.0f},{g:.0f},{b:.0f})")

# Boss HP fill: 行31-71是主填充区, x=6-561, 宽555, 高40
extract_fill("ui_boss_hp_fill", "public/assets/ui/ui_boss_hp_bar.png", 6, 31, 555, 40)

print("\n填充切片完成。")
