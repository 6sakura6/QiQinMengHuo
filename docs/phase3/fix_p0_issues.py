"""
Phase 3 P0 问题修复脚本
1. 更新 asset-manifest.json 路径为 v2 版本
2. 批量处理精灵图 RGB→RGBA，去除背景色
"""
import json
import os
from pathlib import Path
from PIL import Image
import shutil

BASE_DIR = Path(__file__).parent
ASSETS_DIR = BASE_DIR / 'assets'

# ========== v1 → v2 路径映射 ==========
PATH_MAPPING = {
    # Player
    'Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-44-46.png':
    'Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-56-41.png',
    # Boss
    'Pixel_art_sprite_sheet_for_Bos_2026-06-16T04-45-04.png':
    'Pixel_art_sprite_sheet_for_Bos_2026-06-16T04-56-47.png',
    # Enemy
    'Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-45-08.png':
    'Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-56-52.png',
    # Zhuge Liang portrait
    'Pixel_art_portrait_of_Zhuge_Li_2026-06-16T04-46-28.png':
    'Pixel_art_portrait_of_Zhuge_Li_2026-06-16T04-58-01.png',
    # Zhang Bo portrait
    'Pixel_art_NPC_portrait_of_vete_2026-06-16T04-47-01.png':
    'Pixel_art_NPC_portrait_of_elde_2026-06-16T04-58-35.png',
    # Tileset
    'Pixel_art_tileset_for_Level_1__2026-06-16T04-45-43.png':
    'Pixel_art_tileset_for_Level_1__2026-06-16T04-57-23.png',
    # UI
    'Pixel_art_UI_component_kit_for_2026-06-16T04-45-51.png':
    'Pixel_art_UI_component_kit_for_2026-06-16T04-57-28.png',
}

# ========== Step 1: 更新 manifest ==========
def update_manifest():
    manifest_path = BASE_DIR / 'data' / 'asset-manifest.json'

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    updated_count = 0
    # 递归替换所有 path 字段
    def replace_paths(obj, depth=0):
        nonlocal updated_count
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == 'path' and isinstance(value, str):
                    for old_name, new_name in PATH_MAPPING.items():
                        if old_name in value:
                            new_path = value.replace(old_name, new_name)
                            obj[key] = new_path
                            updated_count += 1
                            print(f"  [manifest] {old_name[-30:]} → {new_name[-30:]}")
                            break
                else:
                    replace_paths(value, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                replace_paths(item, depth + 1)

    replace_paths(manifest)

    # 备份原始文件
    backup_path = manifest_path.with_suffix('.json.v1_backup')
    if not backup_path.exists():
        shutil.copy2(manifest_path, backup_path)
        print(f"\n  [backup] 原始 manifest 已备份到 {backup_path.name}")

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n  ✅ manifest 更新完成: {updated_count} 条路径已切换到 v2")
    return updated_count


# ========== Step 2: 精灵图透明化处理 ==========
def detect_background_color(img: Image.Image) -> tuple:
    """
    智能检测背景色:
    1. 采样四个角落 5x5 区域
    2. 统计最常见颜色作为背景色
    """
    w, h = img.size
    corners = [
        (0, 0),           # 左上
        (w - 5, 0),       # 右上
        (0, h - 5),       # 左下
        (w - 5, h - 5),   # 右下
    ]

    from collections import Counter
    color_counter = Counter()

    for cx, cy in corners:
        for dx in range(5):
            for dy in range(5):
                px, py = cx + dx, cy + dy
                if 0 <= px < w and 0 <= py < h:
                    color = img.getpixel((px, py))
                    color_counter[color[:3]] += 1  # Only RGB part

    if color_counter:
        bg_color = color_counter.most_common(1)[0][0]
        return bg_color
    return (0, 0, 0)


def remove_background(img_path: Path, tolerance: int = 30):
    """
    移除背景色，将 RGB 转为 RGBA
    使用容差匹配，避免像素艺术边缘问题
    """
    img = Image.open(img_path)

    # 如果已经有 alpha 通道，跳过
    if img.mode == 'RGBA':
        print(f"  [skip] {img_path.name} - 已是 RGBA")
        return False

    bg_color = detect_background_color(img)
    print(f"  [处理] {img_path.name} | 大小:{img.size} | 背景色:{bg_color}")

    # 转换为 RGBA
    img = img.convert('RGBA')
    pixels = img.load()
    w, h = img.size

    br, bg, bb = bg_color

    # 将背景色像素设为透明
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # 颜色在容差范围内匹配背景色
            if (abs(r - br) <= tolerance and
                abs(g - bg) <= tolerance and
                abs(b - bb) <= tolerance):
                pixels[x, y] = (r, g, b, 0)

    img.save(img_path, 'PNG', optimize=True)
    return True


def process_all_sprites():
    """处理所有 v2 精灵图为透明背景"""
    print("\n" + "=" * 60)
    print("Step 2: 精灵图 RGB → RGBA 透明化处理")
    print("=" * 60)

    # 所有 v2 版本的精灵图
    v2_files = [
        ASSETS_DIR / 'sprites/player/Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-56-41.png',
        ASSETS_DIR / 'sprites/boss/Pixel_art_sprite_sheet_for_Bos_2026-06-16T04-56-47.png',
        ASSETS_DIR / 'sprites/enemy/Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-56-52.png',
        ASSETS_DIR / 'sprites/npc/Pixel_art_portrait_of_Zhuge_Li_2026-06-16T04-58-01.png',
        ASSETS_DIR / 'sprites/npc/Pixel_art_NPC_portrait_of_elde_2026-06-16T04-58-35.png',
        ASSETS_DIR / 'tilesets/Pixel_art_tileset_for_Level_1__2026-06-16T04-57-23.png',
        ASSETS_DIR / 'ui/Pixel_art_UI_component_kit_for_2026-06-16T04-57-28.png',
    ]

    processed = 0
    skipped = 0

    for fpath in v2_files:
        if not fpath.exists():
            print(f"  [警告] 文件不存在: {fpath}")
            continue

        old_size = fpath.stat().st_size / 1024
        result = remove_background(fpath, tolerance=30)
        new_size = fpath.stat().st_size / 1024

        if result:
            processed += 1
            print(f"    {old_size:.0f}KB → {new_size:.0f}KB | ✅ 透明化完成")
        else:
            skipped += 1

    print(f"\n  ✅ 处理完成: {processed} 张已透明化, {skipped} 张跳过")


# ========== Main ==========
if __name__ == '__main__':
    print("=" * 60)
    print("Phase 3 P0 问题修复")
    print("=" * 60)

    # Step 1
    print("\n[Step 1] 更新 asset-manifest.json 路径为 v2 版本")
    print("-" * 40)
    count = update_manifest()

    # Step 2
    process_all_sprites()

    print("\n" + "=" * 60)
    print("全部 P0 问题修复完成!")
    print(f"  - manifest: {count} 条路径已切换到 v2")
    print(f"  - 精灵图: 所有 v2 资源已处理为 RGBA 透明背景")
    print("=" * 60)
