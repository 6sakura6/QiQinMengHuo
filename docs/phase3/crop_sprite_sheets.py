"""
crop_sprite_sheets.py — 裁掉精灵表右侧/底部不能被帧尺寸整除的冗余像素

背景问题：
- Phaser spritesheet 用 floor(width/frameWidth) × floor(height/frameHeight) 算帧数
- 多余像素自动丢弃，不影响运行，但 AI 可能把内容画到了边缘区域
- 提前裁掉冗余边距 → 帧边界精确对齐，避免最后一列/行显示不完整

操作范围：public/assets/ 中已拷贝的资源
"""

from PIL import Image
from pathlib import Path

PUBLIC = Path('../../public/assets')

CROPS = [
    # (relative_path,              frame_w, frame_h, 说明)
    ('sprites/player/player.png',               48, 48, '玩家精灵表'),
    ('sprites/enemy/enemy_barbarian.png',       32, 32, '蛮兵精灵表'),
    ('sprites/boss/boss_menghuo.png',           96, 96, 'Boss 孟获精灵表'),
]


def main():
    print('=== Cropping Sprite Sheets to Frame-Aligned Dimensions ===\n')

    for rel, fw, fh, label in CROPS:
        path = PUBLIC / rel
        img = Image.open(path)
        w, h = img.size

        # 计算对齐后的宽高
        new_w = (w // fw) * fw
        new_h = (h // fh) * fh

        if w == new_w and h == new_h:
            print(f'  ✅ {label}: 已对齐 {w}×{h}，无需裁剪')
            continue

        right_cut = w - new_w
        bottom_cut = h - new_h

        print(f'  ✂️  {label}: {w}×{h} → {new_w}×{new_h}  (裁去右侧{right_cut}px + 底部{bottom_cut}px)')

        # 左上角对齐裁剪，保留有效帧区域
        cropped = img.crop((0, 0, new_w, new_h))
        cropped.save(path)
        print(f'       cols={new_w // fw}×rows={new_h // fh}  模式={cropped.mode}')

    print('\n=== Done ===')


if __name__ == '__main__':
    main()
