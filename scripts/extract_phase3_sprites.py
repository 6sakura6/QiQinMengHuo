"""
Phase 3 精灵表提取与重组工具
从 AI 生成的噪声精灵表中提取角色帧，重组为干净动画精灵表

策略：
1. 用多重质量评分找到角色帧（色彩多样性 + 边缘密度 + 透明度）
2. 按动画帧位置要求提取连续帧段
3. 裁剪到精确可整除尺寸
4. 输出到 public/assets/sprites/
"""

from PIL import Image
import os, math, shutil
from collections import defaultdict

# ─── 配置 ───────────────────────────────────────────

FW_PLAYER, FH_PLAYER = 48, 48
FW_ENEMY, FH_ENEMY = 32, 32

ANIM_PLAYER = {
    'idle':  (0, 3, 4),     # start, end, count
    'run':   (4, 9, 6),
    'jump':  (10, 13, 4),
    'shoot': (14, 17, 4),
    'hurt':  (18, 19, 2),
    'die':   (20, 25, 6),
}

ANIM_ENEMY = {
    'patrol': (0, 3, 4),
    'hurt':   (4, 6, 3),
    'death':  (7, 11, 5),
}

# ─── 质量评分 ────────────────────────────────────────

def frame_score(frame):
    """综合质量评分：角色帧 vs 噪声帧"""
    pixels = list(frame.getdata())
    if not pixels:
        return 0, {}
    
    # 检查是否有 alpha 通道
    has_alpha = len(pixels[0]) >= 4
    total = len(pixels)
    
    if has_alpha:
        opaque = [(r,g,b,a) for r,g,b,a in pixels if a > 30]
    else:
        opaque = [(r,g,b) for r,g,b in pixels]
    
    fill = len(opaque) / total
    
    if fill < 0.05:
        return -1, {'fill': fill}
    
    # 色彩多样性（32级量化）
    colors32 = set()
    colors16 = set()
    for r,g,b,*_ in opaque:
        colors32.add((r//32*32, g//32*32, b//32*32))
        colors16.add((r//16*16, g//16*16, b//16*16))
    
    # 非灰度像素占比
    non_gray = 0
    for r,g,b,*_ in opaque:
        if abs(r-g) > 30 or abs(g-b) > 30 or abs(r-b) > 30:
            non_gray += 1
    non_gray_pct = non_gray / len(opaque) if opaque else 0
    
    # 边缘密度（角色轮廓通常有清晰边缘）
    fw, fh = frame.size
    edges = 0
    for y in range(fh):
        for x in range(fw-1):
            if has_alpha:
                p1 = frame.getpixel((x, y))
                p2 = frame.getpixel((x+1, y))
            else:
                p1 = frame.getpixel((x, y))
                p2 = frame.getpixel((x+1, y))
            if len(p1) >= 3 and len(p2) >= 3:
                diff = abs(p1[0]-p2[0]) + abs(p1[1]-p2[1]) + abs(p1[2]-p2[2])
                if diff > 120:
                    edges += 1
    
    edge_density = edges / (fw * fh)
    
    # 综合评分
    color_score = min(len(colors16) / 40, 1.0) * 50
    ng_score = min(non_gray_pct * 80, 80)
    edge_score = min(edge_density * 200, 70)
    fill_score = min(fill * 40, 40)
    
    total_score = fill_score + color_score + ng_score + edge_score
    
    return total_score, {
        'fill': fill, 'colors16': len(colors16), 'colors32': len(colors32),
        'non_gray_pct': non_gray_pct, 'edge_density': edge_density,
        'fill_score': fill_score, 'color_score': color_score,
        'ng_score': ng_score, 'edge_score': edge_score
    }

# ─── 帧质量排名 ──────────────────────────────────────

def rank_frames(img, fw, fh):
    """对所有帧评分并排序"""
    cols = img.width // fw
    rows = img.height // fh
    total = cols * rows
    
    ranked = []
    for fn in range(total):
        col, row = fn % cols, fn // cols
        x, y = col * fw, row * fh
        frame = img.crop((x, y, x+fw, y+fh))
        score, details = frame_score(frame)
        ranked.append((fn, row, col, score, details))
    
    ranked.sort(key=lambda x: -x[3])
    return ranked, cols, rows

# ─── 从源精灵表提取指定帧到新精灵表 ──────────────────

def extract_frames_to_sheet(source_path, fw, fh, frame_indices, dest_path, cols_per_row=21):
    """从源精灵表提取指定索引的帧，生成新精灵表"""
    source = Image.open(source_path)
    source_cols = source.width // fw
    
    # 裁剪到精确可整除尺寸
    exact_w = cols_per_row * fw
    exact_h = math.ceil(len(frame_indices) / cols_per_row) * fh
    
    dest = Image.new('RGBA', (exact_w, exact_h), (0, 0, 0, 0))
    
    for dest_fn, src_fn in enumerate(frame_indices):
        src_col = src_fn % source_cols
        src_row = src_fn // source_cols
        sx, sy = src_col * fw, src_row * fh
        
        dest_col = dest_fn % cols_per_row
        dest_row = dest_fn // cols_per_row
        dx, dy = dest_col * fw, dest_row * fh
        
        frame = source.crop((sx, sy, sx+fw, sy+fh))
        # Convert to RGBA if needed
        if frame.mode != 'RGBA':
            frame = frame.convert('RGBA')
        dest.paste(frame, (dx, dy))
    
    dest.save(dest_path)
    return dest.size

# ─── 主流程 ──────────────────────────────────────────

def process_player():
    """处理 Player 精灵表"""
    print("=" * 60)
    print("🎮 处理 Player 精灵表")
    print("=" * 60)
    
    source = 'docs/phase3/assets/sprites/player/Pixel_art_sprite_sheet_for_a_H_2026-06-16T04-44-46.png'
    
    # 1. 对所有帧评分
    img = Image.open(source)
    ranked, cols, rows = rank_frames(img, FW_PLAYER, FH_PLAYER)
    
    print(f"\n📊 质量扫描: {len(ranked)} 帧")
    print(f"   Top 20 帧:")
    for fn, row, col, score, det in ranked[:20]:
        ng = det.get('non_gray_pct', 0)
        c16 = det.get('colors16', 0)
        ed = det.get('edge_density', 0)
        print(f"   #{fn} (r{row},c{col}): score={score:.1f} ng={ng:.0%} colors={c16} edges={ed:.3f}")
    
    # 2. 按动画类型分配帧
    # 策略：从最佳帧中选择合适的连续帧段作为动画
    # 如果找不到连续段，使用最佳单帧填充
    
    total_needed = sum(cnt for _, _, cnt in ANIM_PLAYER.values())
    print(f"\n🔧 需要 {total_needed} 帧用于 6 个动画")
    
    # 找到所有高分帧
    good_frames = [(fn, sc) for fn, _, _, sc, det in ranked if sc > 30 and det.get('non_gray_pct', 0) > 0.1]
    print(f"🐱 高质量角色帧 (score>30, non-gray>10%): {len(good_frames)}")
    
    # 查找连续帧段
    good_set = set(fn for fn, _ in good_frames)
    consecutive_groups = []
    for fn, _ in good_frames:
        # 检查是否已被某组合并
        if any(fn in g for g in consecutive_groups):
            continue
        # 查找包含此帧的连续段
        group = {fn}
        # 向前扩展
        curr = fn - 1
        while curr in good_set:
            group.add(curr)
            curr -= 1
        # 向后扩展
        curr = fn + 1
        while curr in good_set:
            group.add(curr)
            curr += 1
        consecutive_groups.append(sorted(group))
    
    consecutive_groups.sort(key=len, reverse=True)
    print(f"👪 连续帧段: {len(consecutive_groups)} 个, 最长 {len(consecutive_groups[0]) if consecutive_groups else 0} 帧")
    for i, g in enumerate(consecutive_groups[:8]):
        print(f"   Group {i+1}: frames {g[0]}-{g[-1]} ({len(g)} frames)")
    
    # 3. 构建新精灵表
    # 动画顺序: idle(4) + run(6) + jump(4) + shoot(4) + hurt(2) + die(6) = 26帧
    all_frames = []
    
    # 为每个动画分配帧：优先使用连续段，不足则用最佳单帧
    for anim_name, (req_start, req_end, req_count) in ANIM_PLAYER.items():
        needed = req_count
        assigned = []
        
        # 找一个连续的帧段能容纳这个动画
        for group in consecutive_groups:
            if len(group) >= needed and not any(fn in all_frames for fn in group[:needed]):
                assigned = group[:needed]
                # 从可用池中移除
                for fn in assigned:
                    if fn in good_set:
                        good_set.remove(fn)
                break
        
        # 如果找不到连续段，用最佳单个帧
        if len(assigned) < needed:
            remaining = needed - len(assigned)
            for fn, sc in good_frames:
                if fn not in all_frames:
                    assigned.append(fn)
                    remaining -= 1
                    if remaining == 0:
                        break
        
        all_frames.extend(assigned)
        print(f"   {anim_name}: 分配了 {len(assigned)}/{needed} 帧 -> {assigned[:4]}...")
    
    # 裁剪到实际使用的帧数
    all_frames = all_frames[:total_needed]
    
    # 4. 写入新精灵表
    dest = 'public/assets/sprites/player/player.png'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    
    # 备份旧文件
    if os.path.exists(dest):
        shutil.copy2(dest, dest + '.phase3_backup')
        print(f"\n📦 已备份旧精灵表到 {dest}.phase3_backup")
    
    w, h = extract_frames_to_sheet(source, FW_PLAYER, FH_PLAYER, all_frames, dest)
    print(f"\n✅ Player 新精灵表: {dest} ({w}x{h}, {len(all_frames)} 帧)")
    
    # 打印动画帧映射（供 Level1Scene 使用）
    print(f"\n📋 动画帧映射（Level1Scene.ts）:")
    offset = 0
    for anim_name, (_, _, count) in ANIM_PLAYER.items():
        print(f"   {anim_name}: frames {offset}-{offset+count-1} ({count}帧)")
        offset += count


def process_enemy():
    """处理 Enemy 精灵表"""
    print("\n" + "=" * 60)
    print("👹 处理 Enemy 精灵表")
    print("=" * 60)
    
    source = 'docs/phase3/assets/sprites/enemy/Pixel_art_sprite_sheet_for_Nan_2026-06-16T04-45-08.png'
    
    # 1. 对所有帧评分
    img = Image.open(source)
    ranked, cols, rows = rank_frames(img, FW_ENEMY, FH_ENEMY)
    
    print(f"\n📊 质量扫描: {len(ranked)} 帧")
    print(f"   Top 20 帧:")
    for fn, row, col, score, det in ranked[:20]:
        ng = det.get('non_gray_pct', 0)
        c16 = det.get('colors16', 0)
        print(f"   #{fn} (r{row},c{col}): score={score:.1f} ng={ng:.0%} colors={c16}")
    
    total_needed = sum(cnt for _, _, cnt in ANIM_ENEMY.values())
    
    # 2. 查找高质量帧和连续段
    good_frames = [(fn, sc) for fn, _, _, sc, det in ranked if sc > 30 and det.get('non_gray_pct', 0) > 0.1]
    print(f"\n🐱 高质量角色帧: {len(good_frames)}")
    
    good_set = set(fn for fn, _ in good_frames)
    consecutive_groups = []
    for fn, _ in good_frames:
        if any(fn in g for g in consecutive_groups):
            continue
        group = {fn}
        curr = fn - 1
        while curr in good_set:
            group.add(curr)
            curr -= 1
        curr = fn + 1
        while curr in good_set:
            group.add(curr)
            curr += 1
        consecutive_groups.append(sorted(group))
    
    consecutive_groups.sort(key=len, reverse=True)
    print(f"👪 连续帧段: {len(consecutive_groups)} 个")
    for i, g in enumerate(consecutive_groups[:8]):
        print(f"   Group {i+1}: frames {g[0]}-{g[-1]} ({len(g)} frames)")
    
    # 3. 分配帧
    all_frames = []
    for anim_name, (req_start, req_end, req_count) in ANIM_ENEMY.items():
        needed = req_count
        assigned = []
        
        for group in consecutive_groups:
            if len(group) >= needed and not any(fn in all_frames for fn in group[:needed]):
                assigned = group[:needed]
                for fn in assigned:
                    if fn in good_set:
                        good_set.discard(fn)
                break
        
        if len(assigned) < needed:
            remaining = needed - len(assigned)
            for fn, sc in good_frames:
                if fn not in all_frames:
                    assigned.append(fn)
                    remaining -= 1
                    if remaining == 0:
                        break
        
        all_frames.extend(assigned)
        print(f"   {anim_name}: 分配了 {len(assigned)}/{needed} 帧 -> {assigned}")
    
    all_frames = all_frames[:total_needed]
    
    # 4. 写入
    dest = 'public/assets/sprites/enemy/enemy_barbarian.png'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    
    if os.path.exists(dest):
        shutil.copy2(dest, dest + '.phase3_backup')
        print(f"\n📦 已备份旧精灵表")
    
    w, h = extract_frames_to_sheet(source, FW_ENEMY, FH_ENEMY, all_frames, dest, cols_per_row=32)
    print(f"\n✅ Enemy 新精灵表: {dest} ({w}x{h}, {len(all_frames)} 帧)")
    
    offset = 0
    print(f"\n📋 动画帧映射（Level1Scene.ts）:")
    for anim_name, (_, _, count) in ANIM_ENEMY.items():
        print(f"   {anim_name}: frames {offset}-{offset+count-1} ({count}帧)")
        offset += count


if __name__ == '__main__':
    process_player()
    print()
    process_enemy()
    
    print("\n" + "=" * 60)
    print("🎉 提取完成！")
    print("=" * 60)
    print("备份: player.png.phase3_backup / enemy_barbarian.png.phase3_backup")
