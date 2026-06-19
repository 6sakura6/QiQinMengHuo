#!/usr/bin/env python3
"""
TDD GREEN v3: 精细化像素精灵表生成器
- 逐像素手绘风格模板，非方块拼接
- 每个颜色至少 3-4 级渐变（暗面/中间/亮面/高光）
- 角色比例正确，动画平滑过渡
"""
import os, math
import numpy as np
from PIL import Image

OUTPUT_DIR = 'D:/TCHGameDesign/七擒孟获/public/assets/sprites'

# ============================================================
# 工具函数
# ============================================================
def blank(w: int, h: int) -> np.ndarray:
    return np.zeros((h, w, 4), dtype=np.uint8)

def put(arr, ox, oy, pixels, color):
    """绘制像素集"""
    for py, px in pixels:
        ny, nx = oy + py, ox + px
        if 0 <= ny < arr.shape[0] and 0 <= nx < arr.shape[1]:
            arr[ny, nx] = color

def outline(arr, ox, oy, pixels, color):
    """给像素集描边（在像素集外圈画暗色）"""
    # 收集所有坐标
    coords = set()
    for py, px in pixels:
        coords.add((oy + py, ox + px))
    # 描边：检查每个像素的8邻域
    checked = set()
    for py, px in pixels:
        ny, nx = oy + py, ox + px
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                sy, sx = ny + dy, nx + dx
                if (sy, sx) not in coords and (sy, sx) not in checked:
                    checked.add((sy, sx))
                    if 0 <= sy < arr.shape[0] and 0 <= sx < arr.shape[1]:
                        arr[sy, sx] = color

def shade(outline_c, mid_c, light_c, highlight_c):
    """返回4级渐变"""
    return outline_c, mid_c, light_c, highlight_c

# ============================================================
# 颜色调色板（每色4级渐变）
# ============================================================
# 皮肤
SK = shade((180,130,100,255), (210,160,130,255), (235,195,170,255), (250,225,210,255))
# 红甲
RD = shade((120,20,20,255), (170,40,35,255), (210,65,55,255), (245,100,85,255))
# 深蓝甲（汉代配色）
BL = shade((20,25,60,255), (40,50,90,255), (60,75,120,255), (100,120,170,255))
# 金色
GD = shade((130,90,20,255), (180,135,35,255), (220,175,70,255), (250,220,150,255))
# 深裤
DK = shade((30,30,45,255), (50,50,70,255), (70,70,95,255), (100,100,125,255))
# 靴子
BT = shade((50,30,15,255), (80,55,35,255), (110,85,60,255), (150,120,90,255))
# 头发
HR = shade((10,5,5,255), (25,15,10,255), (45,30,25,255), (70,50,40,255))
# 红缨
PL = shade((150,20,20,255), (210,40,30,255), (245,70,55,255), (255,130,120,255))
# 武器木柄
WD = shade((80,60,35,255), (120,95,60,255), (160,135,100,255), (200,175,145,255))
# 金属
MT = shade((60,60,70,255), (100,100,110,255), (150,150,160,255), (200,200,210,255))
# 弓弦
ST = shade((120,100,70,255), (170,150,120,255), (200,180,155,255), (230,215,195,255))
# 箭矢
AR = shade((80,55,30,255), (120,90,55,255), (170,135,95,255), (210,180,145,255))

# 敌人颜色
EN_SK = shade((130,95,65,255), (165,125,85,255), (195,155,115,255), (225,195,160,255))
EN_AR = shade((70,45,25,255), (105,70,40,255), (140,100,60,255), (175,135,95,255))
EN_PT = shade((35,40,30,255), (55,60,48,255), (80,85,70,255), (110,115,100,255))
EN_FR = shade((130,20,15,255), (185,35,30,255), (225,60,50,255), (250,110,100,255))
EN_FY = shade((140,100,15,255), (190,145,30,255), (235,185,60,255), (255,225,140,255))

# Boss颜色
EL_G = shade((70,70,80,255), (105,105,120,255), (145,145,160,255), (185,185,195,255))
EL_D = shade((40,40,50,255), (65,65,80,255), (95,95,110,255), (130,130,145,255))
EL_T = shade((180,175,165,255), (215,210,200,255), (240,235,225,255), (255,252,248,255))

# ============================================================
# 像素模板层
# ============================================================

def draw_body(img, ox, oy, color, width=12, height=14):
    """躯干 + 铠甲纹理"""
    o, m, l, h = color
    body = []
    for ry in range(height):
        for rx in range(width):
            if ry < 2 and (rx < 2 or rx > width-3):
                continue  # 肩部内收
            body.append((ry, rx))
    put(img, ox, oy, body, m)
    # 侧边阴影
    for ry in range(height):
        put(img, ox, oy, [(ry, 0)], o)
        put(img, ox, oy, [(ry, width-1)], o)
    # 铠甲中线
    for ry in range(2, height, 2):
        put(img, ox, oy, [(ry, width//2-1)], l)
        put(img, ox, oy, [(ry, width//2)], h)
    # 腰带
    for rx in range(width):
        put(img, ox, oy, [(height-2, rx)], o)
        put(img, ox, oy, [(height-3, rx)], l)
    # 护心镜
    cx = width // 2
    for ry in range(3, 7):
        for rx in range(cx-3, cx+3):
            if abs(ry-5) + abs(rx-cx+0.5) < 3.5:
                put(img, ox, oy, [(ry, rx)], h)
    put(img, ox, oy, [(4, cx-1), (4, cx+1)], o)

def draw_legs(img, ox, oy, color, boot_color, stance=0):
    """双腿 + 靴子，stance=-1左前,0立正,1右前"""
    pt_o, pt_m, pt_l, pt_h = color
    bt_o, bt_m, bt_l, bt_h = boot_color
    lw, rw = 4, 4
    if stance == -1:
        for ry in range(10):
            put(img, ox, oy, [(ry, 0), (ry, 1), (ry, 2), (ry, 3)], pt_m)
            put(img, ox, oy, [(ry, 7), (ry, 8), (ry, 9), (ry, 10)], pt_m)
        # 阴影
        for ry in range(10):
            put(img, ox, oy, [(ry, 0)], pt_o)
            put(img, ox, oy, [(ry, 10)], pt_o)
        # 靴子
        put(img, ox, oy, [(10, 0), (10, 1), (10, 2), (10, 3), (10, 4)], bt_m)
        put(img, ox, oy, [(10, 7), (10, 8), (10, 9), (10, 10), (10, 11)], bt_m)
    elif stance == 1:
        for ry in range(10):
            put(img, ox, oy, [(ry, 0), (ry, 1), (ry, 2), (ry, 3)], pt_m)
            put(img, ox, oy, [(ry, 6), (ry, 7), (ry, 8), (ry, 9)], pt_m)
        for ry in range(10):
            put(img, ox, oy, [(ry, 0)], pt_o)
            put(img, ox, oy, [(ry, 9)], pt_o)
        put(img, ox, oy, [(10, 0), (10, 1), (10, 2), (10, 3), (10, 4)], bt_m)
        put(img, ox, oy, [(10, 6), (10, 7), (10, 8), (10, 9), (10, 10)], bt_m)
    else:
        for ry in range(10):
            put(img, ox, oy, [(ry, 1), (ry, 2), (ry, 3), (ry, 4)], pt_m)
            put(img, ox, oy, [(ry, 7), (ry, 8), (ry, 9), (ry, 10)], pt_m)
        for ry in range(10):
            put(img, ox, oy, [(ry, 1)], pt_o)
            put(img, ox, oy, [(ry, 10)], pt_o)
        put(img, ox, oy, [(10, 1), (10, 2), (10, 3), (10, 4), (10, 5)], bt_m)
        put(img, ox, oy, [(10, 7), (10, 8), (10, 9), (10, 10), (10, 11)], bt_m)

def draw_head(img, ox, oy, skin_color, hair_color):
    """7×8 头部 + 眼睛 + 嘴"""
    sk_o, sk_m, sk_l, sk_h = skin_color
    hr_o, hr_m, hr_l, hr_h = hair_color
    # 脸部
    face = []
    for ry in range(9):
        for rx in range(8):
            if ry == 0 and (rx < 2 or rx > 5): continue
            if ry == 1 and (rx < 1 or rx > 6): continue
            face.append((ry, rx))
    put(img, ox, oy, face, sk_m)
    # 脸侧阴影
    put(img, ox, oy, [(0,0),(0,1),(1,0)], sk_o)
    put(img, ox, oy, [(0,6),(0,7),(1,7)], sk_o)
    put(img, ox, oy, [(8,0),(8,1),(8,6),(8,7)], sk_o)
    # 眼睛
    put(img, ox, oy, [(3,2),(3,3)], hr_o)
    put(img, ox, oy, [(3,5),(3,6)], hr_o)
    # 眉毛
    put(img, ox, oy, [(2,2),(2,3)], hr_m)
    put(img, ox, oy, [(2,5),(2,6)], hr_m)
    # 嘴
    put(img, ox, oy, [(6,3),(6,4)], sk_o)
    # 鼻子
    put(img, ox, oy, [(4,3),(4,4)], sk_l)

def draw_helmet(img, ox, oy, armor_color, plume_color):
    """头盔 + 红缨"""
    ar_o, ar_m, ar_l, ar_h = armor_color
    pl_o, pl_m, pl_l, pl_h = plume_color
    # 盔顶
    for ry in range(-3, 1):
        for rx in range(-1, 9):
            if ry == -3 and (rx < 1 or rx > 6): continue
            put(img, ox, oy, [(ry, rx)], ar_m)
    put(img, ox, oy, [(-3,0),(-3,7)], ar_o)
    put(img, ox, oy, [(-2,0),(-2,-1),(-1,-1),(0,-1)], ar_o)
    put(img, ox, oy, [(0,1),(0,6)], ar_l)
    # 护颊
    for ry in range(1, 6):
        put(img, ox, oy, [(ry, -1)], ar_o)
        put(img, ox, oy, [(ry, 8)], ar_o)
    # 红缨
    plume = [
        (-4,3),(-4,4),
        (-5,3),(-5,4),(-5,5),
        (-6,3),(-6,4),(-6,5),
        (-7,4),
    ]
    put(img, ox, oy, plume, pl_m)
    put(img, ox, oy, [(-4,3),(-5,3),(-6,3)], pl_l)
    put(img, ox, oy, [(-4,4),(-5,4)], pl_h)

def draw_arms(img, ox, oy, skin_color, l_angle=0, r_angle=0):
    """手臂，angle: -1举起, 0自然, 1前伸"""
    sk_o, sk_m, sk_l, sk_h = skin_color
    
    # 左臂
    if l_angle == -1:  # 举高
        for ry in range(-4, 3):
            for rx in range(3):
                put(img, ox, oy, [(ry, -2-rx)], sk_m)
    elif l_angle == 1:  # 前伸
        for rx in range(6):
            for ry in range(3):
                put(img, ox, oy, [(ry, -3-rx)], sk_m)
    else:  # 自然下垂
        for ry in range(6):
            for rx in range(3):
                put(img, ox, oy, [(ry, -2-rx)], sk_m)
    
    # 右臂
    if r_angle == -1:
        for ry in range(-4, 3):
            for rx in range(3):
                put(img, ox, oy, [(ry, 12+rx)], sk_m)
    elif r_angle == 1:
        for rx in range(6):
            for ry in range(3):
                put(img, ox, oy, [(ry, 12+rx)], sk_m)
    else:
        for ry in range(6):
            for rx in range(3):
                put(img, ox, oy, [(ry, 12+rx)], sk_m)

def draw_crossbow(img, ox, oy, weapon_color, string_color, arrow_color, angle=0):
    """弩弓 - angle=0水平, 1斜上"""
    wd_o, wd_m, wd_l, wd_h = weapon_color
    st_o, st_m, st_l, st_h = string_color
    ar_o, ar_m, ar_l, ar_h = arrow_color
    
    if angle == 0:
        # 弓臂水平
        for rx in range(12):
            put(img, ox, oy, [(0, rx)], wd_m)
        put(img, ox, oy, [(0,0),(0,11)], wd_o)
        put(img, ox, oy, [(0,1),(0,10)], wd_l)
        # 弓身
        for ry in range(1, 8):
            put(img, ox, oy, [(ry, 5)], wd_m)
            put(img, ox, oy, [(ry, 6)], wd_m)
        put(img, ox, oy, [(1,5),(7,6)], wd_o)
        put(img, ox, oy, [(2,5),(6,6)], wd_l)
        # 弦
        put(img, ox, oy, [(1,1),(2,1),(5,1),(6,1)], st_m)
        put(img, ox, oy, [(1,10),(2,10),(5,10),(6,10)], st_m)
        # 箭
        for rx in range(10):
            put(img, ox, oy, [(4, rx+2)], ar_m)
        put(img, ox, oy, [(4,2)], ar_o)
        put(img, ox, oy, [(4,3)], ar_l)
    else:
        # 斜上射击
        for rx in range(10):
            ry = -rx // 2
            put(img, ox, oy, [(ry, rx)], wd_m)
        put(img, ox, oy, [(-5,0),(0,9)], wd_o)
        for rx in range(5):
            ry = -rx - 1
            put(img, ox, oy, [(ry, 3)], st_m)
        for rx in range(8):
            ry = -rx // 3
            put(img, ox, oy, [(ry-1, rx+1)], ar_m)

# ============================================================
# Player 帧生成 (48×48)
# ============================================================

def player_idle(frame):
    """待机 4帧：呼吸 + 轻微摇摆"""
    img = blank(48, 48)
    breath = [0, 1, 0, -1][frame % 4]
    body_y = 18 + breath
    
    draw_legs(img, 14, 34, DK, BT, 0)
    draw_body(img, 14, body_y, RD)
    draw_head(img, 18, 2 + breath, SK, HR)
    draw_helmet(img, 17, 2 + breath, RD, PL)
    draw_arms(img, 14, body_y+2, SK, 0, 0)
    draw_crossbow(img, 26, body_y+4, WD, ST, AR, 0)
    return img

def player_run(frame):
    """跑步 6帧：腿交错 + 身体倾斜"""
    img = blank(48, 48)
    phase = frame % 6
    # 身体弹跳
    bounce = [0, -1, -2, -1, 0, 1][phase]
    body_y = 18 + bounce
    
    # 腿动画
    leg_l_y = [34, 30, 28, 30, 32, 34][phase]
    leg_r_y = [30, 32, 34, 30, 28, 34][phase]
    pt_o, pt_m, pt_l, pt_h = DK
    bt_o, bt_m, bt_l, bt_h = BT
    for ry in range(10):
        put(img, 14, leg_l_y, [(ry, 1), (ry, 2), (ry, 3), (ry, 4)], pt_m)
        put(img, 14, leg_r_y, [(ry, 7), (ry, 8), (ry, 9), (ry, 10)], pt_m)
    put(img, 14, leg_l_y, [(10, 1), (10, 2), (10, 3), (10, 4), (10, 5)], bt_m)
    put(img, 14, leg_r_y, [(10, 7), (10, 8), (10, 9), (10, 10), (10, 11)], bt_m)
    
    # 身体前倾
    tilt = [0, 1, 2, 1, 0, -1][phase]
    draw_body(img, 14 + tilt, body_y, RD)
    
    # 手臂摆动
    arm_fwd = phase % 3
    if arm_fwd == 0:
        draw_arms(img, 14 + tilt, body_y + 2, SK, -1, 1)
    elif arm_fwd == 1:
        draw_arms(img, 14 + tilt, body_y + 2, SK, 0, -1)
    else:
        draw_arms(img, 14 + tilt, body_y + 2, SK, 1, 0)
    
    draw_head(img, 18 + tilt, 2 + bounce, SK, HR)
    draw_helmet(img, 17 + tilt, 2 + bounce, RD, PL)
    draw_crossbow(img, 26 + tilt, body_y + 3, WD, ST, AR, 0)
    return img

def player_jump(frame):
    """跳跃 4帧：起跳→空中→下落→落地"""
    img = blank(48, 48)
    if frame == 0:
        # 蓄力起跳
        body_y = 12
        for ry in range(6):
            put(img, 14, 36, [(ry, 1),(ry,2),(ry,3),(ry,4)], DK[1])
            put(img, 14, 34, [(ry, 7),(ry,8),(ry,9),(ry,10)], DK[1])
        put(img, 14, 36, [(6,1),(6,2),(6,3),(6,4),(6,5)], BT[1])
        put(img, 14, 34, [(6,7),(6,8),(6,9),(6,10),(6,11)], BT[1])
        draw_body(img, 14, body_y, RD)
        draw_arms(img, 14, body_y+2, SK, -1, -1)
    elif frame in (1, 2):
        # 空中
        body_y = 8 - frame * 2
        for ry in range(6):
            put(img, 14, 34, [(ry, 1),(ry,2),(ry,3),(ry,4)], DK[1])
        for ry in range(4):
            put(img, 14, 36, [(ry, 7),(ry,8),(ry,9),(ry,10)], DK[1])
        draw_body(img, 14, body_y, RD)
        draw_arms(img, 14, body_y+2, SK, -1, -1)
    else:
        # 落地缓冲
        body_y = 18
        for ry in range(8):
            put(img, 14, 34, [(ry, 1),(ry,2),(ry,3),(ry,4)], DK[1])
            put(img, 14, 34, [(ry, 7),(ry,8),(ry,9),(ry,10)], DK[1])
        put(img, 14, 34, [(8,1),(8,2),(8,3),(8,4),(8,5)], BT[1])
        put(img, 14, 34, [(8,7),(8,8),(8,9),(8,10),(8,11)], BT[1])
        draw_body(img, 14, body_y, RD)
        draw_arms(img, 14, body_y+2, SK, 0, 0)
    
    draw_head(img, 18, max(0, 2 - frame), SK, HR)
    draw_helmet(img, 17, max(0, 2 - frame), RD, PL)
    draw_crossbow(img, 26, body_y + 4, WD, ST, AR, 0)
    return img

def player_shoot(frame):
    """射击 4帧：举弩→瞄准→发射→后坐"""
    img = blank(48, 48)
    body_y = 18
    
    draw_legs(img, 14, 34, DK, BT, 1)
    draw_body(img, 14, body_y, RD)
    draw_head(img, 18, 2, SK, HR)
    draw_helmet(img, 17, 2, RD, PL)
    
    if frame < 2:
        draw_arms(img, 14, body_y+2, SK, 1, 1)
        draw_crossbow(img, 20, body_y-4, WD, ST, AR, 1)
    else:
        draw_arms(img, 14, body_y+2, SK, 1, 0)
        draw_crossbow(img, 20, body_y-5, WD, ST, AR, 1)
        # 发射效果
        if frame == 2:
            ar_o, ar_m, ar_l, ar_h = AR
            for rx in range(8):
                put(img, 8, body_y-2, [(0, rx)], ar_l)
            put(img, -2, body_y-2, [(0, 0), (0, 1)], AR[3])
    
    return img

def player_hurt(frame):
    """受击 2帧：后仰 + 退步"""
    img = blank(48, 48)
    knock = [2, 4][frame]
    body_y = 16
    
    draw_legs(img, 14 + knock, 32, DK, BT, -1 if frame == 0 else 0)
    draw_body(img, 14 + knock, body_y, RD)
    draw_arms(img, 14 + knock, body_y + 2, SK, -1, -1)
    draw_head(img, 18 + knock, 0, SK, HR)
    draw_helmet(img, 17 + knock - 2, 0, RD, PL)
    
    # 痛苦表情
    sk_o = SK[0]
    put(img, 18 + knock, 0, [(3, 2)], sk_o)  # > <
    put(img, 18 + knock, 0, [(3, 5)], sk_o)
    return img

def player_die(frame):
    """死亡 4帧：倒地→平躺→消失"""
    img = blank(48, 48)
    if frame == 0:
        body_y = 20
        draw_body(img, 14, body_y, RD)
        draw_head(img, 18, 4, SK, HR)
        draw_arms(img, 14, body_y+2, SK, 0, -1)
    elif frame == 1:
        body_y = 30
        draw_body(img, 14, body_y, RD)
        draw_head(img, 18, 14, SK, HR)
        draw_arms(img, 14, body_y+2, SK, 1, 1)
    else:
        alpha_fade = [200, 100][frame-2]
        body_y = 36
        col = (RD[1][0], RD[1][1], RD[1][2], alpha_fade)
        col2 = (SK[1][0], SK[1][1], SK[1][2], alpha_fade)
        for ry in range(6):
            for rx in range(20):
                put(img, 14, 36, [(ry, rx)], col)
        for ry in range(6):
            for rx in range(8):
                put(img, 20, 32, [(ry, rx)], col2)
    return img

# ============================================================
# Enemy 帧生成 (32×32)
# ============================================================

def enemy_patrol(frame):
    img = blank(32, 32)
    phase = frame % 4
    body_y = 10 + (phase % 2)
    
    # 腿
    leg_l = 8 + (2 if phase % 2 == 0 else 0)
    leg_r = 8 + (2 if phase % 2 == 1 else 0)
    for ry in range(leg_l):
        put(img, 8, 22, [(ry, 1), (ry, 2), (ry, 3)], EN_PT[1])
    for ry in range(leg_r):
        put(img, 8, 22, [(ry, 6), (ry, 7), (ry, 8)], EN_PT[1])
    
    # 身体皮甲
    for ry in range(10):
        for rx in range(10):
            put(img, 5, body_y, [(ry, rx)], EN_AR[1])
    put(img, 5, body_y, [(0, 0), (0, 9)], EN_AR[0])
    put(img, 5, body_y, [(9, 0), (9, 9)], EN_AR[0])
    # 甲片
    for ry in range(2, 8, 2):
        put(img, 5, body_y, [(ry, 4)], EN_AR[2])
        put(img, 5, body_y, [(ry, 5)], EN_AR[3])
    
    # 手臂
    arm_y = body_y + 2
    for ry in range(3):
        put(img, 5, arm_y, [(ry, -2), (ry, -1), (ry, 0)], EN_SK[1])
        put(img, 5, arm_y, [(ry, 10), (ry, 11), (ry, 12)], EN_SK[1])
    
    # 头部
    for ry in range(7):
        for rx in range(6):
            put(img, 7, 2, [(ry, rx)], EN_SK[1])
    put(img, 7, 2, [(2, 1), (2, 4)], HR[3])  # 眼睛
    put(img, 7, 2, [(4, 2), (4, 3)], EN_SK[0])  # 嘴
    
    # 羽毛头饰
    for rx in range(8):
        put(img, 7, 0, [(0, rx)], EN_AR[0])
    put(img, 7, 0, [(1, 1), (1, 6)], EN_AR[2])
    # 红羽毛
    for ry in range(4):
        put(img, 7, 0, [(-ry-1, 3)], EN_FR[1])
    put(img, 7, 0, [(-1, 2), (-1, 4)], EN_FR[2])
    # 黄羽毛
    for ry in range(3):
        put(img, 7, 0, [(-ry-1, 5)], EN_FY[1])
    return img

def enemy_hurt(frame):
    """受击 3帧：后仰+盔甲飞溅"""
    img = blank(32, 32)
    knock = (frame + 1) * 2
    body_y = 12
    
    # 腿后退
    for ry in range(6):
        put(img, 8 + knock, 22, [(ry, 1), (ry, 2), (ry, 3)], EN_PT[1])
        put(img, 8 + knock, 22, [(ry, 6), (ry, 7), (ry, 8)], EN_PT[1])
    # 腿内侧阴影
    for ry in range(6):
        put(img, 8 + knock, 22, [(ry, 1)], EN_PT[0])
        put(img, 8 + knock, 22, [(ry, 8)], EN_PT[0])
    
    # 身体皮甲 + 纹理
    for ry in range(10):
        for rx in range(10):
            put(img, 5 + knock, body_y, [(ry, rx)], EN_AR[1])
    put(img, 5 + knock, body_y, [(0, 0), (0, 9)], EN_AR[0])
    put(img, 5 + knock, body_y, [(9, 0), (9, 9)], EN_AR[0])
    # 甲片高光
    for ry in range(2, 8, 2):
        put(img, 5 + knock, body_y, [(ry, 4)], EN_AR[2])
        put(img, 5 + knock, body_y, [(ry, 5)], EN_AR[3])
    
    # 手臂甩开
    for ry in range(3):
        put(img, 5 + knock, body_y + 2, [(ry, -3), (ry, -2), (ry, -1)], EN_SK[1])
        put(img, 5 + knock, body_y + 2, [(ry, 9), (ry, 10), (ry, 11)], EN_SK[1])
    
    # 头部 + 痛苦表情
    for ry in range(7):
        for rx in range(6):
            put(img, 7 + knock, 3, [(ry, rx)], EN_SK[1])
    put(img, 7 + knock, 3, [(1, 1), (1, 4)], EN_SK[2])  # 眉毛高光
    put(img, 7 + knock, 3, [(2, 1), (2, 4)], HR[3])      # 眼睛
    put(img, 7 + knock, 3, [(4, 1), (4, 3)], HR[2])      # 张嘴
    # 头侧阴影
    put(img, 7 + knock, 3, [(0, 0), (0, 5)], EN_SK[0])
    put(img, 7 + knock, 3, [(6, 0), (6, 5)], EN_SK[0])
    
    # 羽毛头饰（歪了）
    for rx in range(7):
        put(img, 7 + knock - 1, 1, [(0, rx)], EN_AR[0])
    put(img, 7 + knock - 1, 1, [(1, 1), (1, 5)], EN_AR[2])
    for ry in range(3):
        put(img, 7 + knock - 1, 1, [(-ry-1, 2)], EN_FR[1])
    put(img, 7 + knock - 1, 1, [(-1, 1), (-1, 3)], EN_FR[2])
    for ry in range(2):
        put(img, 7 + knock - 1, 1, [(-ry-1, 4)], EN_FY[1])
    
    # 受击特效（血滴）
    if frame == 1:
        for dy, dx in [(-2, -2), (-4, 5), (-1, 12)]:
            put(img, 0, 0, [(dy+body_y+5, dx+knock)], EN_FR[3])
            put(img, 0, 0, [(dy+body_y+6, dx+knock)], EN_FR[2])
    return img

def enemy_death(frame):
    """死亡 4帧：后倒→倒地→消失"""
    img = blank(32, 32)
    if frame == 0:
        # 后仰倒地
        tilt = 3
        body_y = 14
        for ry in range(8):
            for rx in range(10):
                put(img, 4 + tilt, body_y, [(ry, rx)], EN_AR[1])
        put(img, 4 + tilt, body_y, [(0, 0), (0, 9)], EN_AR[0])
        put(img, 4 + tilt, body_y, [(7, 0), (7, 9)], EN_AR[0])
        # 甲片仍可见
        for ry in range(2, 6, 2):
            put(img, 4 + tilt, body_y, [(ry, 4)], EN_AR[2])
            put(img, 4 + tilt, body_y, [(ry, 5)], EN_AR[3])
        # 腿
        for ry in range(8):
            put(img, 6 + tilt, body_y + 8, [(ry, 1), (ry, 2), (ry, 3)], EN_PT[1])
            put(img, 6 + tilt, body_y + 8, [(ry, 6), (ry, 7), (ry, 8)], EN_PT[1])
        # 头
        for ry in range(6):
            for rx in range(6):
                put(img, 6 + tilt, body_y - 6, [(ry, rx)], EN_SK[1])
        put(img, 6 + tilt, body_y - 6, [(1, 2), (1, 4)], EN_SK[2])
        put(img, 6 + tilt, body_y - 6, [(2, 2), (2, 4)], HR[3])
        # 羽毛
        for rx in range(6):
            put(img, 5 + tilt, body_y - 8, [(0, rx)], EN_AR[0])
        for ry in range(2):
            put(img, 5 + tilt, body_y - 8, [(-ry-1, 2)], EN_FR[1])
        for ry in range(2):
            put(img, 5 + tilt, body_y - 8, [(-ry-1, 4)], EN_FY[1])
    elif frame == 1:
        # 平躺
        for ry in range(5):
            for rx in range(20):
                put(img, 4, 26, [(ry, rx)], EN_AR[1])
        put(img, 4, 26, [(0, 0), (0, 19)], EN_AR[0])
        put(img, 4, 26, [(4, 0), (4, 19)], EN_AR[0])
        for ry in range(4):
            for rx in range(10):
                put(img, 8, 22, [(ry, rx)], EN_SK[1])
        put(img, 8, 22, [(1, 2), (1, 6)], EN_SK[2])
        put(img, 8, 22, [(2, 2), (2, 6)], HR[3])
    else:
        # 渐隐
        alpha = [160, 60][frame-2]
        col = (EN_AR[1][0], EN_AR[1][1], EN_AR[1][2], alpha)
        for ry in range(4):
            for rx in range(20):
                put(img, 4, 26, [(ry, rx)], col)
        col2 = (EN_SK[1][0], EN_SK[1][1], EN_SK[1][2], max(alpha-40, 0))
        for ry in range(3):
            for rx in range(10):
                put(img, 8, 22, [(ry, rx)], col2)
    return img

# ============================================================
# Boss 帧生成 (96×96)
# ============================================================

def boss_idle(frame):
    img = blank(96, 96)
    breath = [0, 1, 0, -1][frame % 4]
    body_y = 40 + breath
    
    # 象腿（4条，有纹理）
    for lx, ly in [(16, 72), (28, 72), (52, 72), (64, 72)]:
        for ry in range(20):
            for rx in range(10):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
        put(img, lx, ly, [(0, 0), (0, 9)], EL_G[0])
        # 膝盖纹理
        put(img, lx, ly+18, [(0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 8)], EL_G[2])
        # 腿内侧阴影
        for ry in range(8, 18):
            put(img, lx, ly, [(ry, 8)], EL_G[0])
        # 脚趾
        put(img, lx, ly+18, [(1, 1), (1, 2), (1, 7)], EL_G[2])
        put(img, lx, ly+18, [(1, 3), (1, 4), (1, 5), (1, 6)], EL_G[3])
    
    # 象身（含皮肤皱纹纹理）
    for ry in range(32):
        for rx in range(52):
            put(img, 14, body_y, [(ry, rx)], EL_G[1])
    put(img, 14, body_y, [(0, 0), (0, 51)], EL_G[0])
    put(img, 14, body_y, [(31, 0), (31, 51)], EL_G[0])
    # 皮肤皱纹
    for ry in range(4, 28, 5):
        for rx in range(4, 48, 6):
            put(img, 14, body_y, [(ry, rx)], EL_G[0])
            put(img, 14, body_y, [(ry, rx+1)], EL_G[2])
    # 背弧高光
    for rx in range(44):
        put(img, 18, body_y - 4, [(0, rx)], EL_G[2])
    # 腹部渐亮
    for ry in range(16, 24):
        for rx in range(10, 42):
            if (ry + rx) % 3 == 0:
                put(img, 14, body_y, [(ry, rx)], EL_G[2])
    # 装饰金布
    for ry in range(14):
        for rx in range(40):
            put(img, 20, body_y + 12, [(ry, rx)], GD[1])
    for rx in range(40):
        put(img, 20, body_y + 12, [(0, rx)], GD[3])
    # 金布花纹
    for rx in range(6, 36, 8):
        put(img, 20, body_y + 12, [(3, rx), (3, rx+1)], GD[3])
        put(img, 20, body_y + 12, [(10, rx), (10, rx+1)], GD[3])
    # 鞍
    for ry in range(6):
        for rx in range(28):
            put(img, 26, body_y - 2, [(ry, rx)], GD[0])
    for rx in range(28):
        put(img, 26, body_y - 2, [(0, rx)], GD[3])
    put(img, 26, body_y - 2, [(2, 4), (2, 22)], GD[3])
    
    # 象头
    head_x, head_y = 56, body_y + 6
    for ry in range(20):
        for rx in range(22):
            put(img, head_x, head_y, [(ry, rx)], EL_G[1])
    put(img, head_x, head_y, [(0, 0), (0, 21)], EL_G[0])
    # 额头皱纹
    for rx in range(6, 16, 3):
        put(img, head_x, head_y, [(3, rx)], EL_G[0])
    # 眼睛
    put(img, head_x, head_y, [(5, 10)], EL_D[3])
    put(img, head_x, head_y, [(5, 14)], EL_D[3])
    put(img, head_x, head_y, [(5, 11), (5, 15)], (0,0,0,255))
    put(img, head_x, head_y, [(4, 10), (4, 14)], EL_D[1])  # 眼眶阴影
    # 象鼻（有褶皱）
    for ry in range(16):
        for rx in range(6):
            put(img, head_x + 16, head_y + 8, [(ry, rx)], EL_G[1])
    put(img, head_x + 16, head_y + 8, [(15, 0), (15, 5)], EL_G[0])
    put(img, head_x + 16, head_y + 8, [(0, 0)], EL_G[2])
    # 鼻褶
    for ry in range(4, 14, 3):
        put(img, head_x + 16, head_y + 8, [(ry, 0), (ry, 1)], EL_G[0])
        put(img, head_x + 16, head_y + 8, [(ry, 4), (ry, 5)], EL_G[2])
    # 象牙
    for rx in range(5):
        put(img, head_x + 14, head_y + 16, [(0, rx)], EL_T[1])
    put(img, head_x + 14, head_y + 16, [(0, 0), (0, 4)], EL_T[3])
    put(img, head_x + 14, head_y + 16, [(0, 2)], EL_T[0])
    # 象耳
    for ry in range(12):
        for rx in range(8):
            put(img, head_x - 7, head_y + 2, [(ry, rx)], EL_D[1])
    put(img, head_x - 7, head_y + 2, [(0, 0), (0, 7)], EL_D[0])
    put(img, head_x - 7, head_y + 2, [(5, 2), (5, 5)], EL_D[2])
    
    # 孟获
    meng_y = body_y - 20
    # 腿
    for ry in range(8):
        put(img, 34, meng_y + 14, [(ry, 0), (ry, 1), (ry, 2), (ry, 3)], DK[1])
        put(img, 34, meng_y + 14, [(ry, 18), (ry, 19), (ry, 20), (ry, 21)], DK[1])
    for ry in range(8):
        put(img, 34, meng_y + 14, [(ry, 0)], DK[0])
        put(img, 34, meng_y + 14, [(ry, 21)], DK[0])
    # 金甲
    for ry in range(16):
        for rx in range(26):
            if ry < 2 and (rx < 3 or rx > 22): continue
            put(img, 28, meng_y, [(ry, rx)], GD[1])
    put(img, 28, meng_y, [(0, 0), (0, 25)], GD[0])
    put(img, 28, meng_y, [(15, 0), (15, 25)], GD[0])
    # 铠甲鳞片纹理
    for ry in range(2, 14, 3):
        for rx in range(1, 24, 4):
            put(img, 28, meng_y, [(ry, rx)], GD[0])
            put(img, 28, meng_y, [(ry, rx+1)], GD[3])
    # 护心镜
    for ry in range(6):
        for rx in range(8):
            put(img, 37, meng_y + 3, [(ry, rx)], GD[3])
    put(img, 40, meng_y + 6, [(0, 3)], GD[0])
    put(img, 40, meng_y + 6, [(0, 4)], (250,250,250,255))  # 高光点
    # 手臂
    for ry in range(5):
        put(img, 28, meng_y + 2, [(ry, -3), (ry, -2), (ry, -1)], SK[1])
        put(img, 28, meng_y + 2, [(ry, 22), (ry, 23), (ry, 24)], SK[1])
    put(img, 28, meng_y + 2, [(0, -3), (0, 24)], SK[0])
    # 大刀
    for ry in range(14):
        put(img, 28, meng_y - 4, [(ry, 22)], WD[1])
    for rx in range(24):
        put(img, 28, meng_y - 6, [(0, rx-2)], WD[2])
    put(img, 28, meng_y - 6, [(0, 21)], WD[3])
    put(img, 28, meng_y - 6, [(0, 0)], WD[0])  # 刀柄暗面
    # 头
    for ry in range(12):
        for rx in range(18):
            put(img, 32, meng_y - 10, [(ry, rx)], SK[1])
    put(img, 32, meng_y - 10, [(0, 0), (0, 17)], SK[0])
    put(img, 32, meng_y - 10, [(3, 3), (3, 14)], HR[3])
    put(img, 32, meng_y - 10, [(2, 3), (2, 14)], HR[1])
    put(img, 32, meng_y - 10, [(6, 8), (6, 9)], SK[0])
    put(img, 32, meng_y - 10, [(8, 6), (8, 10)], SK[2])  # 下巴高光
    # 金盔
    for ry in range(5):
        for rx in range(22):
            put(img, 30, meng_y - 14, [(ry, rx)], GD[1])
    for rx in range(24):
        put(img, 30, meng_y - 16, [(0, rx)], GD[0])
    put(img, 30, meng_y - 14, [(2, 2), (2, 19)], GD[3])
    # 红缨
    for ry in range(5):
        put(img, 30, meng_y - 14, [(-ry-1, 10)], PL[1])
        put(img, 30, meng_y - 14, [(-ry-1, 11)], PL[2])
    put(img, 30, meng_y - 14, [(-1, 9), (-1, 12)], PL[0])
    return img

def boss_charge(frame):
    img = blank(96, 96)
    fwd = frame * 3
    body_y = 42
    
    for lx, ly in [(16+fwd, 74), (28+fwd, 74), (52+fwd, 70), (64+fwd, 70)]:
        lh = 16 if lx > 52+fwd else 18
        for ry in range(lh):
            for rx in range(10):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
    
    for ry in range(32):
        for rx in range(52):
            put(img, 14+fwd, body_y, [(ry, rx)], EL_G[1])
    put(img, 14+fwd, body_y, [(0, 0), (0, 51)], EL_G[0])
    
    for ry in range(14):
        for rx in range(40):
            put(img, 20+fwd, body_y+12, [(ry, rx)], GD[1])
    for rx in range(40):
        put(img, 20+fwd, body_y+12, [(0, rx)], GD[3])
    
    # 象头前伸
    head_x, head_y = 60+fwd, body_y+4
    for ry in range(20):
        for rx in range(22):
            put(img, head_x, head_y, [(ry, rx)], EL_G[1])
    put(img, head_x, head_y, [(5, 12), (5, 16)], (0,0,0,255))
    for ry in range(14):
        for rx in range(5):
            put(img, head_x+17, head_y+10, [(ry, rx)], EL_G[1])
    put(img, head_x+14, head_y+17, [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4)], EL_T[1])
    
    # 孟获前倾
    meng_y = body_y - 18
    for ry in range(16):
        for rx in range(26):
            if ry < 2 and (rx < 3 or rx > 22): continue
            put(img, 30+fwd, meng_y, [(ry, rx)], GD[1])
    for ry in range(5):
        put(img, 30+fwd, meng_y+2, [(ry, -3), (ry, -2), (ry, -1)], SK[1])
    for ry in range(14):
        put(img, 30+fwd, meng_y-6, [(ry, 22)], WD[1])
    for rx in range(22):
        put(img, 30+fwd, meng_y-8, [(0, rx)], WD[2])
    
    for ry in range(12):
        for rx in range(18):
            put(img, 34+fwd, meng_y-8, [(ry, rx)], SK[1])
    for ry in range(5):
        for rx in range(22):
            put(img, 32+fwd, meng_y-12, [(ry, rx)], GD[1])
    for ry in range(4):
        put(img, 32+fwd, meng_y-12, [(-ry-1, 10)], PL[1])
    return img

def boss_stomp(frame):
    img = blank(96, 96)
    raised = frame < 2
    body_y = 36 if raised else 44
    
    # 后腿支撑
    for lx, ly in [(16, 68), (28, 68)]:
        for ry in range(24):
            for rx in range(10):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
    
    if raised:
        for lx, ly in [(52, 56), (64, 56)]:
            for ry in range(14):
                for rx in range(10):
                    put(img, lx, ly, [(ry, rx)], EL_G[1])
    else:
        for lx, ly in [(52, 78), (64, 78)]:
            for ry in range(14):
                for rx in range(10):
                    put(img, lx, ly, [(ry, rx)], EL_G[1])
        if frame == 2:
            # 冲击波
            for rx in range(20, 80, 3):
                put(img, rx, 86, [(0, 0)], GD[3])
                put(img, rx, 87, [(0, 0)], GD[2])
    
    for ry in range(32):
        for rx in range(52):
            put(img, 14, body_y, [(ry, rx)], EL_G[1])
    
    for ry in range(14):
        for rx in range(40):
            put(img, 20, body_y+12, [(ry, rx)], GD[1])
    
    # 象头抬高
    for ry in range(20):
        for rx in range(22):
            put(img, 56, body_y-2, [(ry, rx)], EL_G[1])
    put(img, 56, body_y-2, [(5, 12), (5, 16)], (0,0,0,255))
    for ry in range(12):
        for rx in range(5):
            put(img, 74, body_y-10, [(ry, rx)], EL_G[1])
    
    # 孟获高举大刀
    meng_y = body_y - 24
    for ry in range(16):
        for rx in range(26):
            if ry < 2 and (rx < 3 or rx > 22): continue
            put(img, 28, meng_y, [(ry, rx)], GD[1])
    for ry in range(18):
        put(img, 28, meng_y-14, [(ry, 12)], WD[1])
    for rx in range(28):
        put(img, 28, meng_y-16, [(0, rx-2)], WD[2])
    for ry in range(12):
        for rx in range(18):
            put(img, 32, meng_y-4, [(ry, rx)], SK[1])
    for ry in range(5):
        for rx in range(22):
            put(img, 30, meng_y-8, [(ry, rx)], GD[1])
    return img

def boss_sweep(frame):
    img = blank(96, 96)
    sweep = [0, 3, 6, 3][frame]
    
    for lx, ly in [(16, 74), (28, 74), (52, 74), (64, 74)]:
        for ry in range(18):
            for rx in range(10):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
    
    for ry in range(32):
        for rx in range(52):
            put(img, 14, 42, [(ry, rx)], EL_G[1])
    for ry in range(14):
        for rx in range(40):
            put(img, 20, 54, [(ry, rx)], GD[1])
    
    head_x = 56 + sweep
    for ry in range(20):
        for rx in range(22):
            put(img, head_x, 44, [(ry, rx)], EL_G[1])
    put(img, head_x, 44, [(5, 12), (5, 16)], (0,0,0,255))
    # 象鼻横扫
    for ry in range(6):
        for rx in range(20):
            put(img, head_x+14, 52, [(ry, rx)], EL_G[1])
    
    meng_y = 18
    for ry in range(16):
        for rx in range(26):
            if ry < 2 and (rx < 3 or rx > 22): continue
            put(img, 28, meng_y, [(ry, rx)], GD[1])
    
    blade_x = 54 - sweep
    for rx in range(26):
        put(img, 28, meng_y+2, [(0, rx-blade_x+28)], WD[2])
    for ry in range(8):
        put(img, 28, meng_y+2, [(ry, 28-blade_x+28)], WD[1])
    
    for ry in range(12):
        for rx in range(18):
            put(img, 32, meng_y-4, [(ry, rx)], SK[1])
    for ry in range(5):
        for rx in range(22):
            put(img, 30, meng_y-8, [(ry, rx)], GD[1])
    return img

# ─── 新增 Boss 动画: hurt / fall / captured ───

def boss_hurt(frame):
    """受击动画 2 帧: 象后仰 + 孟获倾斜"""
    img = blank(96, 96)
    tilt = [2, 5][frame]
    flash_alpha = [200, 120][frame]
    
    # 象身（微后仰）
    body_y = 44 + tilt
    for ry in range(30):
        for rx in range(52):
            put(img, 14, body_y, [(ry, rx)], EL_G[1])
    put(img, 14, body_y, [(0, 0), (0, 51)], EL_G[0])
    
    # 象腿
    for lx, ly in [(16, 74+tilt), (28, 74+tilt), (52, 74+tilt), (64, 74+tilt)]:
        for ry in range(18):
            for rx in range(10):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
    
    # 金布
    for ry in range(12):
        for rx in range(38):
            put(img, 22, body_y+14, [(ry, rx)], GD[1])
    
    # 象头（后仰）
    head_x, head_y = 58 + tilt, body_y + 2
    for ry in range(18):
        for rx in range(20):
            put(img, head_x, head_y, [(ry, rx)], EL_G[1])
    # 受伤闭眼
    put(img, head_x, head_y, [(6, 10), (6, 14)], HR[3])
    put(img, head_x, head_y, [(6, 11), (6, 15)], (0,0,0,255))
    # 象鼻垂落
    for ry in range(14):
        for rx in range(5):
            put(img, head_x+14, head_y+10, [(ry, rx)], EL_G[1])
    
    # 孟获（被击退）
    meng_y = body_y - 18 + tilt
    # 身体后仰
    for ry in range(14):
        for rx in range(24):
            put(img, 30+tilt, meng_y, [(ry, rx)], GD[1])
    put(img, 30+tilt, meng_y, [(0, 0), (0, 23)], GD[0])
    # 护心镜偏移
    for ry in range(5):
        for rx in range(7):
            put(img, 38+tilt, meng_y+2, [(ry, rx)], GD[3])
    # 受伤表情
    for ry in range(10):
        for rx in range(16):
            put(img, 34+tilt, meng_y-6, [(ry, rx)], SK[1])
    put(img, 34+tilt, meng_y-6, [(3, 3), (3, 12)], HR[3])
    put(img, 34+tilt, meng_y-6, [(6, 7)], (0,0,0,255))
    # 金盔歪斜
    for ry in range(4):
        for rx in range(20):
            put(img, 32+tilt+2, meng_y-10, [(ry, rx)], GD[1])
    
    # 受伤闪烁覆盖（半透明白色）
    if frame == 0:
        for y in range(96):
            for x in range(96):
                if img[y, x, 3] > 128:
                    img[y, x] = (255, 200, 200, flash_alpha)
    return img

def boss_fall(frame):
    """战败动画 6 帧: 象倒地 + 孟获摔落"""
    img = blank(96, 96)
    stages = [
        (0, 0, 'stumble'),    # 0: 摇晃
        (3, 2, 'kneel'),      # 1: 前膝跪地
        (5, 6, 'collapse'),   # 2: 身体下沉
        (6, 10, 'side'),      # 3: 侧倒
        (7, 14, 'flat'),      # 4: 完全倒地
        (7, 16, 'dust'),      # 5: 尘土+静止
    ]
    dx, dy, name = stages[min(frame, 5)]
    
    body_y = 44 + dy
    
    # 尘土粒子（倒地后）
    if frame >= 4:
        import random
        rng = random.Random(frame * 137)
        dust_c = [(210,180,140,220), (190,160,120,180), (170,140,100,140)]
        for _ in range(30):
            dx2 = rng.randint(0, 70)
            dy2 = rng.randint(body_y-10, 90)
            sz = rng.randint(3, 8)
            col = rng.choice(dust_c)
            for py in range(sz):
                for px in range(sz):
                    put(img, dx2, dy2, [(py, px)], col)
    
    # 象身
    for ry in range(26 - dy//2):
        for rx in range(48 + dx):
            put(img, 16+dx, body_y, [(ry, rx)], EL_G[1])
    put(img, 16+dx, body_y, [(0, 0)], EL_G[0])
    
    # 象腿（逐渐折叠）
    leg_states = [
        [(16,72),(28,72),(52,72),(64,72)],  # 0
        [(18,68),(30,70),(50,70),(62,68)],  # 1
        [(20,62),(32,66),(48,66),(60,62)],  # 2
        [(22,58),(34,62),(46,62),(58,58)],  # 3
        [(26,56),(38,58),(44,58),(56,56)],  # 4
        [(26,56),(38,58),(44,58),(56,56)],  # 5
    ]
    for i, (lx, ly) in enumerate(leg_states[frame]):
        lh = [18, 14, 10, 8, 6, 4][frame]
        for ry in range(lh):
            for rx in range(8):
                put(img, lx, ly, [(ry, rx)], EL_G[1])
    
    # 象头（逐渐低垂）
    head_x, head_y = 58+dx, body_y+4+dy//2
    head_sizes = [(20,22), (18,20), (16,18), (14,16), (12,14), (10,12)]
    hw, hh = head_sizes[frame]
    for ry in range(hh):
        for rx in range(hw):
            put(img, head_x, head_y, [(ry, rx)], EL_G[1])
    # 闭眼
    if frame >= 2:
        put(img, head_x, head_y, [(hh//3, hw//2-2), (hh//3, hw//2+1)], (0,0,0,200))
    else:
        put(img, head_x, head_y, [(hh//3, hw//2-2), (hh//3, hw//2+1)], (0,0,0,255))
    # 象鼻
    if frame < 3:
        for ry in range(12 - frame*2):
            for rx in range(5):
                put(img, head_x+hw-4, head_y+hh-2, [(ry, rx)], EL_G[1])
    
    # 孟获（摔落）
    meng_y = body_y - 18 + dy
    if frame < 4:
        # 还在象背上（挣扎）
        for ry in range(12):
            for rx in range(22):
                put(img, 28+dx*2, meng_y-dx, [(ry, rx)], GD[1])
        for ry in range(8):
            for rx in range(14):
                put(img, 32+dx*2, meng_y-dx-6, [(ry, rx)], SK[1])
        # 金盔掉落中
        if frame >= 3:
            for ry in range(4):
                for rx in range(12):
                    put(img, 40, meng_y+10, [(ry, rx)], GD[1])
    else:
        # 摔在地上
        for ry in range(8):
            for rx in range(26):
                put(img, 20, meng_y+14, [(ry, rx)], GD[1])
        for ry in range(6):
            for rx in range(12):
                put(img, 46, meng_y+8, [(ry, rx)], SK[1])
    
    return img

def boss_captured(frame):
    """擒获动画 4 帧: 象跪伏 + 孟获绳索特效"""
    img = blank(96, 96)
    breath = [0, -1, 0, 1][frame]
    
    body_y = 50
    
    # 象身（趴低）
    for ry in range(20):
        for rx in range(52):
            put(img, 12, body_y, [(ry, rx)], EL_G[1])
    put(img, 12, body_y, [(0, 0), (0, 51)], EL_G[0])
    put(img, 12, body_y, [(19, 0), (19, 51)], EL_G[0])
    
    # 象前腿（跪地）
    for ry in range(8):
        for rx in range(10):
            put(img, 18, body_y+18, [(ry, rx)], EL_G[1])
            put(img, 48, body_y+18, [(ry, rx)], EL_G[1])
    # 象牙（象征性）
    for rx in range(6):
        put(img, 62, body_y+12, [(0, rx)], EL_T[1])
    put(img, 62, body_y+12, [(0, 0), (0, 5)], EL_T[3])
    
    # 象头（低垂）
    head_x, head_y = 58, body_y + 4
    for ry in range(16):
        for rx in range(20):
            put(img, head_x, head_y, [(ry, rx)], EL_G[1])
    # 温顺眯眼
    put(img, head_x, head_y, [(5, 8), (5, 12)], HR[2])
    put(img, head_x, head_y, [(5, 9), (5, 13)], (0,0,0,180))
    # 象鼻卷曲
    for ry in range(10):
        for rx in range(5):
            put(img, head_x+16, head_y+8, [(ry, rx)], EL_G[1])
    
    # 金布（散落地面）
    for ry in range(6):
        for rx in range(36):
            put(img, 20, body_y+18, [(ry, rx)], GD[1])
    put(img, 20, body_y+18, [(0, 0), (0, 35)], GD[0])
    
    # 孟获（跪坐）
    meng_y = body_y - 10 + breath
    # 腿
    for ry in range(6):
        put(img, 38, meng_y+10, [(ry, 0), (ry, 1), (ry, 2)], DK[1])
        put(img, 38, meng_y+10, [(ry, 17), (ry, 18), (ry, 19)], DK[1])
    # 金甲（暗淡）
    for ry in range(14):
        for rx in range(22):
            if ry < 2 and (rx < 2 or rx > 19): continue
            put(img, 30, meng_y, [(ry, rx)], GD[1])
    put(img, 30, meng_y, [(0, 0), (0, 21)], GD[0])
    # 护心镜
    for ry in range(5):
        for rx in range(6):
            put(img, 38, meng_y+3, [(ry, rx)], GD[3])
    # 头（低垂）
    for ry in range(10):
        for rx in range(16):
            put(img, 33, meng_y-6, [(ry, rx)], SK[1])
    # 悔恨表情
    put(img, 33, meng_y-6, [(3, 3), (3, 12)], HR[2])
    put(img, 33, meng_y-6, [(6, 7)], (0,0,0,200))
    # 金盔（歪在一边）
    for ry in range(3):
        for rx in range(14):
            put(img, 34, meng_y-10, [(ry, rx)], GD[1])
    
    # 蓝色绳索特效（被擒标记）
    if frame >= 2:
        for pt in [(35, meng_y+2), (40, meng_y+4), (45, meng_y+2), 
                    (48, meng_y+6), (43, meng_y+8), (38, meng_y+6)]:
            for ry in range(2):
                for rx in range(2):
                    put(img, pt[0], pt[1], [(ry, rx)], (68, 136, 255, 200))
    
    # 蓝光呼吸效果
    if frame % 2 == 0:
        alpha_val = 80
    else:
        alpha_val = 40
    col_blue = (68, 136, 255, alpha_val)
    for y in range(96):
        for x in range(96):
            if img[y, x, 3] < 10:
                continue
            if y < body_y - 5 or y > body_y + 30:
                continue
            r, g, b, a = img[y, x]
            if a > 100:
                img[y, x] = (
                    min(255, r + col_blue[0]//4),
                    min(255, g + col_blue[1]//4),
                    min(255, b + col_blue[2]//4),
                    a
                )
    
    return img

# ============================================================
# 生成入口
# ============================================================

def generate_player():
    FW, FH = 48, 48
    frames = []
    for i in range(4): frames.append(player_idle(i))
    for i in range(6): frames.append(player_run(i))
    for i in range(4): frames.append(player_jump(i))
    for i in range(4): frames.append(player_shoot(i))
    for i in range(2): frames.append(player_hurt(i))
    for i in range(4): frames.append(player_die(i))
    
    sheet = np.zeros((FH, FW * len(frames), 4), dtype=np.uint8)
    for i, frame in enumerate(frames):
        sheet[:, i*FW:(i+1)*FW] = frame
    out = f'{OUTPUT_DIR}/player/player.png'
    Image.fromarray(sheet).save(out)
    print(f'[GREEN] Player: {out} ({sheet.shape[1]}×{sheet.shape[0]}, {len(frames)} frames)')
    return out

def generate_enemy():
    FW, FH = 32, 32
    frames = []
    for i in range(4): frames.append(enemy_patrol(i))
    for i in range(3): frames.append(enemy_hurt(i))
    for i in range(4): frames.append(enemy_death(i))
    
    sheet = np.zeros((FH, FW * len(frames), 4), dtype=np.uint8)
    for i, frame in enumerate(frames):
        sheet[:, i*FW:(i+1)*FW] = frame
    out = f'{OUTPUT_DIR}/enemy/enemy_barbarian.png'
    Image.fromarray(sheet).save(out)
    print(f'[GREEN] Enemy: {out} ({sheet.shape[1]}×{sheet.shape[0]}, {len(frames)} frames)')
    return out

def generate_boss():
    FW, FH = 96, 96
    frames = []
    # idle: 0-3, charge: 4-9, stomp: 10-13, sweep: 14-17
    for i in range(4):  frames.append(boss_idle(i))
    for i in range(6):  frames.append(boss_charge(i))
    for i in range(4):  frames.append(boss_stomp(i))
    for i in range(4):  frames.append(boss_sweep(i))
    # hurt: 18-19, fall: 20-25, captured: 26-29
    for i in range(2):  frames.append(boss_hurt(i))
    for i in range(6):  frames.append(boss_fall(i))
    for i in range(4):  frames.append(boss_captured(i))
    
    sheet = np.zeros((FH, FW * len(frames), 4), dtype=np.uint8)
    for i, frame in enumerate(frames):
        sheet[:, i*FW:(i+1)*FW] = frame
    out = f'{OUTPUT_DIR}/boss/boss_menghuo.png'
    Image.fromarray(sheet).save(out)
    print(f'[GREEN] Boss: {out} ({sheet.shape[1]}×{sheet.shape[0]}, {len(frames)} frames)')
    return out

def validate():
    print('\n[TDD-VALIDATE]')
    all_pass = True
    for name, path, fw, fh, expected in [
        ('Player', f'{OUTPUT_DIR}/player/player.png', 48, 48, 24),
        ('Enemy', f'{OUTPUT_DIR}/enemy/enemy_barbarian.png', 32, 32, 11),
        ('Boss', f'{OUTPUT_DIR}/boss/boss_menghuo.png', 96, 96, 30),
    ]:
        img = Image.open(path)
        arr = np.array(img)
        n = img.width // fw
        transparent = np.sum(arr[:,:,3] < 128)
        total_px = arr.shape[0] * arr.shape[1]
        fill_pct = 100 * (total_px - transparent) / total_px
        
        frame_colors = []
        for i in range(n):
            frame = arr[:, i*fw:(i+1)*fw]
            visible = frame[frame[:,:,3] > 128]
            n_colors = len(np.unique(visible.reshape(-1, 4), axis=0)) if len(visible) > 0 else 0
            frame_colors.append(n_colors)
        
        print(f'  {name}: {img.width}x{img.height}, {n} frames, fill={fill_pct:.1f}%')
        print(f'    颜色数: min={min(frame_colors)} max={max(frame_colors)} avg={sum(frame_colors)/len(frame_colors):.0f}')
        
        low_detail = sum(1 for c in frame_colors if c < 8)
        if low_detail > n // 3:
            print(f'    RED-FAIL: {low_detail}/{n} frames low detail')
            all_pass = False
        elif fill_pct > 80:
            print(f'    RED-FAIL: fill too high')
            all_pass = False
        else:
            print(f'    GREEN-PASS ✅')
    
    if all_pass:
        print('\n[TDD-PASS] All GREEN ✅')
    return all_pass

if __name__ == '__main__':
    os.makedirs(f'{OUTPUT_DIR}/player', exist_ok=True)
    os.makedirs(f'{OUTPUT_DIR}/enemy', exist_ok=True)
    os.makedirs(f'{OUTPUT_DIR}/boss', exist_ok=True)
    generate_player()
    generate_enemy()
    generate_boss()
    validate()
    print('\n[TDD-DONE] v3 精细化像素精灵表生成完成')
