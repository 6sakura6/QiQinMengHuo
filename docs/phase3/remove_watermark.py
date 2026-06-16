"""
Phase 3 美术资源水印清理脚本
移除AI生成图片右下角的"图片由AI生成"水印
"""

import os
from PIL import Image, ImageDraw

# Phase 3 资源目录
BASE_DIR = r"E:\codebuddytest\比赛\QiQinMengHuo\docs\phase3\assets"

# 需要处理的图片文件列表 (新生成的无水印版请求的输出)
IMAGE_FILES = [
    # Player sprite
    os.path.join(BASE_DIR, "sprites", "player", "Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-56-41.png"),
    # Boss sprite  
    os.path.join(BASE_DIR, "sprites", "boss", "Pixel_art_sprite_sheet_for_Bos_2026-06-16T04-56-47.png"),
    # Enemy sprite
    os.path.join(BASE_DIR, "sprites", "enemy", "Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-56-52.png"),
    # Tileset
    os.path.join(BASE_DIR, "tilesets", "Pixel_art_tileset_for_Level_1__2026-06-16T04-57-23.png"),
    # UI kit
    os.path.join(BASE_DIR, "ui", "Pixel_art_UI_component_kit_for_2026-06-16T04-57-28.png"),
    # NPC portraits
    os.path.join(BASE_DIR, "sprites", "npc", "Pixel_art_portrait_of_Zhuge_Li_2026-06-16T04-58-01.png"),
    os.path.join(BASE_DIR, "sprites", "npc", "Pixel_art_NPC_portrait_of_elde_2026-06-16T04-58-35.png"),
]

def remove_watermark(image_path: str) -> bool:
    """
    移除图片右下角的AI水印
    水印通常位于图片底部约5%-8%的区域
    """
    if not os.path.exists(image_path):
        print(f"[跳过] 文件不存在: {image_path}")
        return False
    
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        # 水印位于右下角，约占高度6-8%
        # 根据观察，水印文字约在底部40-60像素范围内
        crop_height = int(height * 0.08)  # 裁剪底部8%
        
        # 创建新图像（带alpha通道）
        if img.mode == 'RGBA':
            new_img = img.crop((0, 0, width, height - crop_height))
        else:
            # 对于非透明图片，直接裁剪
            new_img = img.crop((0, 0, width, height - crop_height))
        
        # 保存回原文件（覆盖）
        new_img.save(image_path, optimize=True)
        print(f"[完成] {os.path.basename(image_path)} - 原尺寸 {width}x{height} -> 新尺寸 {new_img.size[0]}x{new_img.size[1]}")
        return True
    
    except Exception as e:
        print(f"[错误] 处理失败 {os.path.basename(image_path)}: {e}")
        return False


def main():
    print("=" * 60)
    print("Phase 3 美术资源 - AI水印清理工具")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    for image_path in IMAGE_FILES:
        if remove_watermark(image_path):
            success_count += 1
        else:
            fail_count += 1
    
    print("=" * 60)
    print(f"处理完成! 成功: {success_count}, 失败/跳过: {fail_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
