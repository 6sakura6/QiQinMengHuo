"""
TDD-GREEN: 生成彩色像素精灵表
解决 AI 生成精灵表质量问题（全灰度/空白帧）

生成三个精灵表:
  - Player (汉军士兵): 48×48 帧, 红/蓝配色, 6种动画
  - Enemy (蛮兵): 32×32 帧, 绿/褐配色, 3种动画
  - Boss (孟获): 96×96 帧, 金/红配色, 5种动画
"""

from PIL import Image
import math, os

# ═══════════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════════

def create_spritesheet(fw: int, fh: int, cols: int, rows: int) -> Image.Image:
    """创建空精灵表画布 RGBA"""
    return Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))


def paste_frame(sheet: Image.Image, frame_img: Image.Image, frame_num: int, fw: int, cols: int):
    """将单帧图像 paste 到精灵表指定位置"""
    col = frame_num % cols
    row = frame_num // cols
    fh = frame_img.height
    x, y = col * fw, row * fh
    sheet.paste(frame_img, (x, y))


def save_sheet(sheet: Image.Image, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path)
    print(f'  ✓ {path} ({sheet.width}×{sheet.height})')


def clear_canvas(fw: int, fh: int) -> Image.Image:
    return Image.new('RGBA', (fw, fh), (0, 0, 0, 0))


# ═══════════════════════════════════════════════════════
# 像素绘图基元
# ═══════════════════════════════════════════════════════

def rect(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple):
    """画实心矩形"""
    for dy in range(h):
        for dx in range(w):
            px, py = x + dx, y + dy
            if 0 <= px < img.width and 0 <= py < img.height:
                img.putpixel((px, py), color)


def rect_rounded(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple, r: int = 2):
    """画圆角矩形"""
    rect(img, x + r, y, w - 2 * r, h, color)
    rect(img, x, y + r, w, h - 2 * r, color)
    # 四个角用圆形近似
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                for cx, cy in [(x + r, y + r), (x + w - r - 1, y + r),
                                (x + r, y + h - r - 1), (x + w - r - 1, y + h - r - 1)]:
                    px, py = cx + dx, cy + dy
                    if 0 <= px < img.width and 0 <= py < img.height:
                        img.putpixel((px, py), color)


def pixel(img: Image.Image, x: int, y: int, color: tuple):
    """画单个像素"""
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def line_h(img: Image.Image, x: int, y: int, w: int, color: tuple):
    """水平线"""
    rect(img, x, y, w, 1, color)


def line_v(img: Image.Image, x: int, y: int, h: int, color: tuple):
    """竖直线"""
    rect(img, x, y, 1, h, color)


# ═══════════════════════════════════════════════════════
# 颜色定义
# ═══════════════════════════════════════════════════════

C_TRANS   = (0, 0, 0, 0)

# Player — 汉军士兵（红蓝配色）
C_P_SKIN      = (255, 210, 170, 255)  # 肤色
C_P_SKIN_DARK = (220, 170, 130, 255)  # 暗肤色
C_P_ARMOR     = (180, 30, 30, 255)    # 红甲
C_P_ARMOR_LT  = (220, 60, 50, 255)    # 亮红
C_P_ARMOR_DK  = (130, 20, 20, 255)    # 暗红
C_P_CLOTH     = (30, 50, 140, 255)    # 蓝衣
C_P_CLOTH_LT  = (60, 90, 180, 255)    # 亮蓝
C_P_HAIR      = (40, 25, 15, 255)     # 深褐发
C_P_BELT      = (160, 120, 40, 255)   # 皮带金
C_P_BOOTS     = (60, 40, 20, 255)     # 棕靴
C_P_WEAPON    = (180, 180, 190, 255)  # 武器银
C_P_EYE       = (255, 255, 255, 255)  # 眼白
C_P_PUPIL     = (20, 20, 20, 255)     # 瞳孔
C_P_MOUTH     = (80, 30, 20, 255)     # 嘴

# Enemy — 蛮兵
C_E_SKIN      = (200, 160, 120, 255)
C_E_CLOTH     = (60, 100, 40, 255)    # 绿衣
C_E_CLOTH_LT  = (90, 140, 60, 255)
C_E_CLOTH_DK  = (40, 70, 25, 255)
C_E_HAIR      = (30, 20, 10, 255)
C_E_BELT      = (140, 100, 30, 255)
C_E_BOOTS     = (50, 35, 20, 255)
C_E_PUPIL     = (20, 20, 20, 255)
C_E_EYE       = (255, 255, 255, 255)

# Boss — 孟获（大型金甲）
C_B_SKIN      = (230, 180, 140, 255)
C_B_SKIN_DK   = (190, 140, 100, 255)
C_B_ARMOR     = (200, 160, 40, 255)   # 金甲
C_B_ARMOR_LT  = (240, 200, 80, 255)
C_B_ARMOR_DK  = (150, 110, 20, 255)
C_B_CLOTH     = (140, 30, 30, 255)    # 红袍
C_B_CLOTH_DK  = (100, 20, 20, 255)
C_B_HAIR      = (20, 15, 10, 255)
C_B_BELT      = (180, 140, 50, 255)
C_B_WEAPON    = (200, 200, 210, 255)  # 大斧银
C_B_BOOTS     = (60, 40, 20, 255)     # 棕靴
C_B_PUPIL     = (10, 10, 10, 255)
C_B_EYE       = (255, 255, 255, 255)


# ═══════════════════════════════════════════════════════
# PLAYER (48×48) — 汉军士兵
# 动画帧: idle(0-3), run(4-9), jump(10-13), shoot(14-17), hurt(18-19), die(20-25)
# ═══════════════════════════════════════════════════════

def draw_player_body(img: Image.Image, leg_offset: tuple = (0, 0), arm_angle: str = 'down',
                     head_bob: int = 0, facing: str = 'right', armor_bright: bool = False,
                     hurt_tint: bool = False, dead: bool = False):
    """
    leg_offset: (左腿dx, 右腿dx) 相对偏移
    arm_angle: 'down' | 'up' | 'shoot' | 'hurt'
    """
    fw, fh = img.width, img.height
    armor_c = C_P_ARMOR_LT if armor_bright else C_P_ARMOR
    cloth_c = C_P_CLOTH_LT if armor_bright else C_P_CLOTH

    if hurt_tint:
        armor_c = (255, 180, 180, 255)  # 泛红
        cloth_c = (180, 180, 255, 255)

    if dead:
        armor_c = (100, 80, 80, 255)
        cloth_c = (80, 80, 100, 255)

    # ── 坐标系: 原点为脚底中心 ──
    # 转换: 画布坐标 = 原点坐标 + body_part_relative_offset
    ox = fw // 2   # 画布原点 X（脚底中心）
    oy = fh - 3    # 画布原点 Y（脚底 ≈ 地面）

    # ── 腿 (靴子 + 裤腿) ──
    lx, rx = leg_offset if isinstance(leg_offset, tuple) else (leg_offset, -leg_offset)

    # 左腿
    rect(img, ox - 10 + lx, oy - 12, 7, 12, C_P_BOOTS)
    rect(img, ox - 10 + lx, oy - 18, 7, 6, cloth_c)
    # 右腿
    rect(img, ox + 3 + rx, oy - 12, 7, 12, C_P_BOOTS)
    rect(img, ox + 3 + rx, oy - 18, 7, 6, cloth_c)

    # ── 身体/铠甲 ──
    body_top = oy - 32 + head_bob
    rect_rounded(img, ox - 9, body_top, 18, 17, armor_c, r=2)
    # 铠甲纹理
    line_h(img, ox - 7, body_top + 8, 14, armor_c if armor_bright else C_P_ARMOR_DK)
    # 腰带
    line_h(img, ox - 9, body_top + 14, 18, C_P_BELT)

    # 下摆
    rect(img, ox - 9, oy - 20, 18, 8, cloth_c)

    # ── 头 ──
    head_y = body_top - 11
    # 脸
    rect_rounded(img, ox - 6, head_y, 12, 10, C_P_SKIN, r=1)
    # 头盔/头发
    rect(img, ox - 7, head_y - 2, 14, 4, C_P_ARMOR_DK)
    rect(img, ox - 6, head_y - 3, 12, 2, armor_c)
    # 盔缨
    rect(img, ox - 2, head_y - 6, 4, 4, C_P_CLOTH_LT)

    # ── 脸 ──
    if not dead:
        # 眼睛
        eye_y = head_y + 3
        if facing == 'right':
            pixel(img, ox + 3, eye_y, C_P_EYE)
            pixel(img, ox + 3, eye_y + 1, C_P_EYE)
            pixel(img, ox + 4, eye_y, C_P_PUPIL)
            pixel(img, ox + 4, eye_y + 1, C_P_PUPIL)
        else:
            pixel(img, ox - 4, eye_y, C_P_EYE)
            pixel(img, ox - 4, eye_y + 1, C_P_EYE)
            pixel(img, ox - 3, eye_y, C_P_PUPIL)
            pixel(img, ox - 3, eye_y + 1, C_P_PUPIL)
        # 嘴
        mouth_x = ox + 2 if facing == 'right' else ox - 2
        pixel(img, mouth_x, head_y + 6, C_P_MOUTH)
    else:
        # 死状: X眼
        for dx, dy in [(2, 3), (3, 2), (4, 3), (3, 4)]:
            pixel(img, ox + dx, head_y + dy, C_P_PUPIL)

    # ── 手臂 ──
    if arm_angle == 'down':
        # 自然下垂
        rect(img, ox - 12, body_top + 3, 5, 12, armor_c)   # 左臂
        rect(img, ox + 7, body_top + 3, 5, 12, armor_c)    # 右臂
        # 手（肤色）
        rect(img, ox - 11, body_top + 14, 3, 3, C_P_SKIN)
        rect(img, ox + 8, body_top + 14, 3, 3, C_P_SKIN)

    elif arm_angle == 'shoot':
        # 射击姿势: 右臂前伸
        rect(img, ox - 12, body_top + 3, 5, 12, armor_c)   # 左臂下垂
        rect(img, ox - 11, body_top + 14, 3, 3, C_P_SKIN)
        # 右臂前伸持弩
        rect(img, ox + 6, body_top + 2, 12, 4, armor_c)    # 手臂水平
        rect(img, ox + 17, body_top + 1, 3, 4, C_P_SKIN)   # 手
        # 弩
        rect(img, ox + 14, body_top - 1, 12, 3, C_P_WEAPON)
        rect(img, ox + 24, body_top - 2, 2, 5, C_P_WEAPON) # 弩头

    elif arm_angle == 'up':
        # 跳跃/举臂
        rect(img, ox - 12, body_top - 2, 5, 12, armor_c)
        rect(img, ox + 7, body_top - 2, 5, 12, armor_c)
        rect(img, ox - 11, body_top - 4, 3, 3, C_P_SKIN)
        rect(img, ox + 8, body_top - 4, 3, 3, C_P_SKIN)

    elif arm_angle == 'hurt':
        # 受伤: 双臂上抬
        rect(img, ox - 13, body_top - 3, 5, 12, armor_c)
        rect(img, ox + 8, body_top - 3, 5, 12, armor_c)
        rect(img, ox - 12, body_top - 5, 3, 3, C_P_SKIN)
        rect(img, ox + 9, body_top - 5, 3, 3, C_P_SKIN)


def generate_player() -> Image.Image:
    """生成 Player 精灵表: 21 cols × 2 rows (42 帧), 实际使用 26 帧"""
    FW, FH = 48, 48
    COLS = 21  # pixels ÷ frame_width
    sheet = Image.new('RGBA', (FW * COLS, FH * 2), (0, 0, 0, 0))

    frame = 0

    # ── idle (0-3): 呼吸起伏 ──
    bobs = [0, -1, 0, 1]
    for i in range(4):
        img = clear_canvas(FW, FH)
        draw_player_body(img, head_bob=bobs[i], armor_bright=(i % 2 == 0))
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── run (4-9): 跑动循环 ──
    leg_phases = [
        ((-5, 0, 5), (-3, 0, 3)),   # 左前右后
        ((-2, 0, 2), (-6, 0, 6)),   # 过渡
        ((0, 0, 0), (0, 0, 0)),     # 中间
        ((2, 0, -2), (6, 0, -6)),   # 过渡
        ((5, 0, -5), (3, 0, -3)),   # 右前左后
        ((0, 0, 0), (0, 0, 0)),     # 中间
    ]
    for i in range(6):
        l_off = leg_phases[i][0]
        r_off = leg_phases[i][1]
        img = clear_canvas(FW, FH)
        draw_player_body(img, leg_offset=(l_off[0], r_off[0]), head_bob=-2)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── jump (10-13): 跳跃 ──
    for i in range(4):
        img = clear_canvas(FW, FH)
        draw_player_body(img, leg_offset=(-3 + i, 3 - i),
                         arm_angle='up', head_bob=-1)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── shoot (14-17): 射击 ──
    for i in range(4):
        img = clear_canvas(FW, FH)
        muzzle = (i == 1)  # frame 1 有枪口闪光
        draw_player_body(img, arm_angle='shoot', armor_bright=muzzle)
        if muzzle:
            # 枪口闪光
            rect(img, 38, 18, 4, 3, (255, 255, 100, 255))
            rect(img, 40, 17, 2, 5, (255, 200, 50, 255))
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── hurt (18-19): 受伤 ──
    for i in range(2):
        img = clear_canvas(FW, FH)
        draw_player_body(img, arm_angle='hurt', hurt_tint=True,
                         head_bob=-1, armor_bright=(i == 0))
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── die (20-25): 死亡 ──
    for i in range(6):
        img = clear_canvas(FW, FH)
        # 逐帧倒下
        lean = min(i * 3, 10)
        off_x = lean
        # 简单绘制倒地
        draw_player_body(img, arm_angle='hurt', dead=True, head_bob=-4 + i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    print(f'  Player: {frame} 帧 (需要 26)')
    return sheet


# ═══════════════════════════════════════════════════════
# ENEMY (32×32) — 蛮兵
# 动画帧: patrol(0-3), hurt(4-6), death(7-11)
# 注: 将动画帧放到 0 开始，不走 AI 精灵表偏移
# ═══════════════════════════════════════════════════════

def draw_enemy_body(img: Image.Image, leg_offset: tuple = (0, 0),
                    arm_offset: int = 0, head_bob: int = 0,
                    hurt_tint: bool = False, dead: bool = False,
                    frame_variant: int = 0):
    FW, FH = img.width, img.height
    cloth_c = (255, 150, 150, 255) if hurt_tint else C_E_CLOTH
    cloth_lt = (220, 120, 120, 255) if hurt_tint else C_E_CLOTH_LT

    if dead:
        cloth_c = (80, 70, 60, 255)
        cloth_lt = (60, 50, 40, 255)

    ox = FW // 2
    oy = FH - 2

    # ── 腿 ──
    lx, rx = leg_offset if isinstance(leg_offset, tuple) else (leg_offset, -leg_offset)
    rect(img, ox - 7 + lx, oy - 8, 5, 8, C_E_BOOTS)
    rect(img, ox - 7 + lx, oy - 11, 5, 3, cloth_c)
    rect(img, ox + 2 + rx, oy - 8, 5, 8, C_E_BOOTS)
    rect(img, ox + 2 + rx, oy - 11, 5, 3, cloth_c)

    # ── 身体 ──
    body_top = oy - 22 + head_bob
    rect_rounded(img, ox - 6, body_top, 12, 13, cloth_c, r=1)
    # 兽皮纹理
    line_h(img, ox - 4, body_top + 6, 8, cloth_lt)
    line_h(img, ox - 6, body_top + 11, 12, C_E_BELT)

    # ── 头 ──
    head_y = body_top - 8
    rect_rounded(img, ox - 4, head_y, 8, 7, C_E_SKIN, r=1)
    # 头发/头巾
    rect(img, ox - 5, head_y - 2, 10, 4, C_E_CLOTH_DK)
    rect(img, ox - 4, head_y - 3, 8, 2, cloth_c)

    if not dead:
        # 眼
        pixel(img, ox + 2, head_y + 2, C_E_EYE)
        pixel(img, ox + 2, head_y + 3, C_E_EYE)
        pixel(img, ox + 2, head_y + 2, C_E_PUPIL)

    # ── 手臂 ──
    arm_y = body_top + 3
    rect(img, ox - 9, arm_y + arm_offset, 4, 8, cloth_c)
    rect(img, ox - 8, arm_y + arm_offset + 7, 2, 2, C_E_SKIN)
    rect(img, ox + 5, arm_y + arm_offset, 4, 8, cloth_c)
    rect(img, ox + 6, arm_y + arm_offset + 7, 2, 2, C_E_SKIN)


def generate_enemy() -> Image.Image:
    """生成 Enemy 精灵表: 8 cols × 4 rows (32 帧), 动画从 0 开始"""
    FW, FH = 32, 32
    COLS = 8
    ROWS = 4
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS), (0, 0, 0, 0))

    frame = 0

    # ── patrol (0-3) ──
    for i in range(4):
        img = clear_canvas(FW, FH)
        bob = -1 if i % 2 == 0 else 0
        draw_enemy_body(img, leg_offset=(1 if i % 2 == 0 else -1, -1 if i % 2 == 0 else 1),
                        head_bob=bob, frame_variant=i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── hurt (4-6) ──
    for i in range(3):
        img = clear_canvas(FW, FH)
        draw_enemy_body(img, arm_offset=-3, hurt_tint=True, head_bob=-1)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── death (7-11) ──
    for i in range(5):
        img = clear_canvas(FW, FH)
        draw_enemy_body(img, dead=True, head_bob=-4 + i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    print(f'  Enemy: {frame} 帧 (需要 12)')
    return sheet


# ═══════════════════════════════════════════════════════
# BOSS (96×96) — 孟获
# 动画帧: idle(0-2), charge(3-5), stomp(6-8), hurt(9-10), defeat(11-13)
# ═══════════════════════════════════════════════════════

def draw_boss_body(img: Image.Image, pose: str = 'idle', frame_idx: int = 0,
                   hurt_tint: bool = False, dead: bool = False):
    FW, FH = img.width, img.height
    armor_c = (255, 200, 200, 255) if hurt_tint else C_B_ARMOR
    armor_lt = (255, 180, 180, 255) if hurt_tint else C_B_ARMOR_LT
    armor_dk = (180, 130, 130, 255) if hurt_tint else C_B_ARMOR_DK
    cloth_c = C_B_CLOTH

    if dead:
        armor_c = (120, 100, 80, 255)
        cloth_c = (80, 60, 50, 255)

    ox = FW // 2
    oy = FH - 5

    # ── 腿 (粗壮) ──
    leg_w = 10
    leg_h = 22
    lx_off = -12
    rx_off = 2
    if pose == 'charge':
        lx_off = -18; rx_off = 8
    elif pose == 'stomp':
        lx_off = -14; rx_off = 4
        leg_w = 12  # 扎马步

    rect(img, ox + lx_off, oy - leg_h, leg_w, leg_h, C_B_BOOTS if not dead else (80, 60, 50, 255))
    rect(img, ox + rx_off, oy - leg_h, leg_w, leg_h, C_B_BOOTS if not dead else (80, 60, 50, 255))
    # 裤腿
    rect(img, ox + lx_off, oy - leg_h - 4, leg_w, 4, cloth_c)
    rect(img, ox + rx_off, oy - leg_h - 4, leg_w, 4, cloth_c)

    # ── 披风 ──
    rect(img, ox - 22, oy - 50, 44, 15, cloth_c)

    # ── 身体 (金甲) ──
    body_top = oy - 52
    bod_w = 30 if pose == 'stomp' else 26
    rect_rounded(img, ox - bod_w // 2, body_top, bod_w, 26, armor_c, r=3)
    # 护心镜
    rect_rounded(img, ox - 6, body_top + 6, 12, 12, armor_lt, r=2)
    line_h(img, ox - bod_w // 2, body_top + 13, bod_w, armor_dk)
    # 腰带
    line_h(img, ox - bod_w // 2, body_top + 22, bod_w, C_B_BELT)

    # ── 裙甲 ──
    rect(img, ox - bod_w // 2 + 2, oy - 28, bod_w - 4, 6, armor_dk)

    # ── 头 ──
    head_y = body_top - 18
    face_w = 18 if dead else 16
    rect_rounded(img, ox - face_w // 2, head_y, face_w, 16, C_B_SKIN, r=2)
    # 头盔
    rect(img, ox - face_w // 2 - 2, head_y - 4, face_w + 4, 6, armor_dk)
    rect(img, ox - face_w // 2, head_y - 6, face_w, 4, armor_c)
    # 盔尖
    rect(img, ox - 3, head_y - 10, 6, 5, armor_lt)
    pixel(img, ox - 1, head_y - 12, armor_lt)

    if not dead:
        # 眼睛
        pixel(img, ox - 5, head_y + 4, C_B_EYE)
        pixel(img, ox - 5, head_y + 5, C_B_EYE)
        pixel(img, ox - 5, head_y + 4, C_B_PUPIL)
        pixel(img, ox - 4, head_y + 4, C_B_PUPIL)

        pixel(img, ox + 4, head_y + 4, C_B_EYE)
        pixel(img, ox + 4, head_y + 5, C_B_EYE)
        pixel(img, ox + 4, head_y + 4, C_B_PUPIL)
        pixel(img, ox + 5, head_y + 4, C_B_PUPIL)
        # 胡子
        rect(img, ox - 4, head_y + 10, 8, 4, (60, 50, 40, 255))
        # 嘴
        line_h(img, ox - 2, head_y + 9, 4, (120, 40, 30, 255))
    else:
        # 死状: XX眼
        for ddx, ddy in [(-4, 4), (-3, 5), (-5, 4), (-4, 5),
                         (4, 4), (5, 5), (3, 4), (4, 5)]:
            pixel(img, ox + ddx, head_y + ddy, C_B_PUPIL)

    # ── 手臂 ──
    arm_off = 0
    if pose == 'charge':
        arm_off = -6
    elif pose == 'stomp':
        arm_off = 4
    elif pose == 'hurt':
        arm_off = -8

    arm_y = body_top + 4
    arm_w = 8
    arm_h = 16
    rect(img, ox - bod_w // 2 - arm_w - 2, arm_y + arm_off, arm_w, arm_h, armor_c)
    rect(img, ox + bod_w // 2 + 2, arm_y + arm_off, arm_w, arm_h, armor_c)
    # 手
    rect(img, ox - bod_w // 2 - arm_w - 1, arm_y + arm_off + arm_h - 1, 6, 4, C_B_SKIN)
    rect(img, ox + bod_w // 2 + 3, arm_y + arm_off + arm_h - 1, 6, 4, C_B_SKIN)

    # ── 武器 (大斧) ──
    if pose == 'charge':
        # 举起大斧
        rect(img, ox + bod_w // 2 + 4, arm_y - 8, 4, 16, C_B_WEAPON)  # 斧柄
        rect(img, ox + bod_w // 2 - 4, arm_y - 12, 16, 8, C_B_WEAPON)  # 斧刃
        rect(img, ox + bod_w // 2 + 2, arm_y - 14, 4, 6, C_B_WEAPON)


def generate_boss() -> Image.Image:
    """生成 Boss 精灵表: 10 cols × 3 rows (30 帧), 动画从 0 开始"""
    FW, FH = 96, 96
    COLS = 10
    ROWS = 3
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS), (0, 0, 0, 0))

    frame = 0

    # ── idle (0-2): 傲然站立 ──
    for i in range(3):
        img = clear_canvas(FW, FH)
        draw_boss_body(img, 'idle', i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── charge (3-5): 冲锋 ──
    for i in range(3):
        img = clear_canvas(FW, FH)
        draw_boss_body(img, 'charge', i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── stomp (6-8): 踏地 ──
    for i in range(3):
        img = clear_canvas(FW, FH)
        draw_boss_body(img, 'stomp', i)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── hurt (9-10): 受伤 ──
    for i in range(2):
        img = clear_canvas(FW, FH)
        draw_boss_body(img, 'hurt', i, hurt_tint=True)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    # ── defeat (11-13): 战败倒地 ──
    for i in range(3):
        img = clear_canvas(FW, FH)
        draw_boss_body(img, 'stomp', i, dead=True)
        paste_frame(sheet, img, frame, FW, COLS)
        frame += 1

    print(f'  Boss: {frame} 帧 (需要 14)')
    return sheet


# ═══════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════

def main():
    base = 'public/assets/sprites'

    print('🟢 GREEN Phase: 生成彩色像素精灵表')
    print('=' * 50)

    # Player
    print('\n📦 生成 Player 精灵表...')
    sheet = generate_player()
    save_sheet(sheet, f'{base}/player/player.png')

    # Enemy
    print('\n📦 生成 Enemy 精灵表...')
    sheet = generate_enemy()
    save_sheet(sheet, f'{base}/enemy/enemy_barbarian.png')

    # Boss
    print('\n📦 生成 Boss 精灵表...')
    sheet = generate_boss()
    save_sheet(sheet, f'{base}/boss/boss_menghuo.png')

    print('\n' + '=' * 50)
    print('✅ 精灵表生成完成！')


if __name__ == '__main__':
    main()
