#!/usr/bin/env python3
"""
slice_ui_kit.py — Step 6: 从 UI Kit 预切片 UI 组件

集成指南坐标有误，使用实际坐标（通过 alpha 扫描获得）
"""
from PIL import Image
from pathlib import Path

UI_KIT = "public/assets/ui/ui_kit.png"
OUTPUT_DIR = Path("public/assets/ui")

# 实际检测到的组件坐标
REGIONS = [
    ("ui_hp_bar",       47,   82,  342, 174),   # 玩家血条（带装饰边框）
    ("ui_boss_hp_bar", 408,   82,  564, 174),   # Boss 血条（金龙边框）
    ("ui_weapon_panel", 45,  260,  188, 362),   # 武器/冷却面板
    ("ui_dialog_box",  255,  260,  709, 362),   # 对话框（含头像位）
    ("ui_frame_small", 650,  651,  313, 232),   # 小型装饰框架
    ("ui_green_bar",   717,  895,  235,  47),   # 绿色进度条
]

def main():
    img = Image.open(UI_KIT)
    w, h = img.size
    print(f"UI Kit: {w}x{h}, mode={img.mode}")
    print("-" * 60)

    for name, x, y, rw, rh in REGIONS:
        if x + rw > w or y + rh > h:
            print(f"[SKIP] {name}: out of bounds ({x}+{rw} > {w} or {y}+{rh} > {h})")
            continue

        crop = img.crop((x, y, x + rw, y + rh))
        out_path = OUTPUT_DIR / f"{name}.png"
        crop.save(out_path, "PNG", optimize=True)

        # 验证
        arr = crop.getchannel('A')
        non_alpha = sum(1 for p in arr.getdata() if p > 20)
        fill_pct = 100 * non_alpha / (rw * rh)

        print(f"[OK] {name}: ({x},{y}) {rw}x{rh} → {out_path.name} ({fill_pct:.0f}% fill)")

    print("-" * 60)
    print("UI 切片完成。生成以下文件:")
    for name, _, _, _, _ in REGIONS:
        if (OUTPUT_DIR / f"{name}.png").exists():
            print(f"  - {name}.png")

if __name__ == "__main__":
    main()
