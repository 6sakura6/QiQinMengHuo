#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《七擒孟获》游戏介绍PPT — 优化版生成脚本
基于 v1.1 游戏文档内容深度优化
"""
from pptx import Presentation
from pptx.util import Pt, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
import os

# ── Unicode shorthand ──
LQ = '\u201c'  # Left double quote "
RQ = '\u201d'  # Right double quote "
LS = '\u2018'  # Left single quote '
RS = '\u2019'  # Right single quote '
EM = '\u2014'  # Em dash —
MD = '\u00b7'  # Middle dot ·
AR = '\u2192'  # Arrow →

# ── 配色方案：像素三国主题 ──
C_PRIMARY     = RGBColor(0xDC, 0x26, 0x26)
C_DARK        = RGBColor(0x0F, 0x17, 0x2A)
C_ACCENT_GOLD = RGBColor(0xD4, 0xA0, 0x1E)
C_ACCENT_GREEN= RGBColor(0x22, 0xC5, 0x5E)
C_INK_GREEN   = RGBColor(0x1A, 0x3C, 0x2A)
C_PURPLE      = RGBColor(0x7C, 0x3A, 0xED)
C_DEEP_BLUE   = RGBColor(0x1E, 0x3A, 0x5F)
C_WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
C_LIGHT_GRAY  = RGBColor(0xF1, 0xF0, 0xEB)
C_MID_GRAY    = RGBColor(0x9C, 0xA3, 0xAF)
C_DARK_GRAY   = RGBColor(0x37, 0x41, 0x51)
C_TEXT_DARK   = RGBColor(0x1F, 0x29, 0x37)
C_TEXT_BODY   = RGBColor(0x4B, 0x55, 0x63)

LEVEL_COLORS = [
    RGBColor(0x4A, 0x90, 0x3C),
    RGBColor(0x3B, 0x82, 0xC4),
    RGBColor(0x5C, 0x7A, 0x3A),
    RGBColor(0x8B, 0x4F, 0xA8),
    RGBColor(0xC4, 0x5A, 0x3C),
    RGBColor(0x8B, 0x2E, 0x2E),
    RGBColor(0xC4, 0x9A, 0x3C),
]

FONT_CN = 'Microsoft YaHei'
FONT_TITLE = 'SimHei'
FONT_EN = 'Georgia'

# ── 辅助函数 ──
def set_slide_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def tb(slide, l, t, w, h, text, fs=14, color=C_TEXT_BODY, bold=False,
       align=PP_ALIGN.LEFT, fn=FONT_CN):
    """add_text_box shortcut"""
    box = slide.shapes.add_textbox(Cm(l), Cm(t), Cm(w), Cm(h))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(fs)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = fn
    p.alignment = align
    for run in p.runs:
        run._r.get_or_add_rPr().set(qn('a:eaTypeface'), fn)
    return box

def mb(slide, l, t, w, h, lines, fn=FONT_CN):
    """add_multiline_box — each line is (text, size, color, bold)"""
    box = slide.shapes.add_textbox(Cm(l), Cm(t), Cm(w), Cm(h))
    tf = box.text_frame
    tf.word_wrap = True
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        text, fs, c, b = ln[0], ln[1] if len(ln)>1 else 12, ln[2] if len(ln)>2 else C_TEXT_BODY, ln[3] if len(ln)>3 else False
        p.text = text
        p.font.size = Pt(fs)
        p.font.color.rgb = c
        p.font.bold = b
        p.font.name = fn
        p.space_after = Pt(2)
        for run in p.runs:
            run._r.get_or_add_rPr().set(qn('a:eaTypeface'), fn)
    return box

def rect(slide, l, t, w, h, fill, border=None, radius=False):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Cm(l), Cm(t), Cm(w), Cm(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if border:
        shape.line.color.rgb = border
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape

def line(slide, l, t, w, color=C_MID_GRAY, thick=1):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Cm(l), Cm(t), Cm(w), Cm(thick*0.004))
    shape.fill.solid(); shape.fill.fore_color.rgb = color
    shape.line.fill.background()

def pn(slide, n, total=14):
    tb(slide, 22.5, 18.2, 3, 0.6, f'七擒孟获 {MD} 游戏介绍  {n:02d} / {total:02d}', fs=7, color=C_MID_GRAY, align=PP_ALIGN.RIGHT)

def hdr(slide, num, title):
    rect(slide, 0, 0, 0.3, 19.05, C_PRIMARY)
    tb(slide, 1.2, 0.8, 3, 1.0, f'{num:02d}', fs=42, color=C_PRIMARY, bold=True, fn=FONT_EN)
    tb(slide, 3.5, 0.8, 15, 1.0, title, fs=26, color=C_TEXT_DARK, bold=True)
    line(slide, 1.2, 1.9, 22, C_PRIMARY, 3)

def sub(slide, text, top=2.2):
    tb(slide, 1.2, top, 22.5, 0.7, text, fs=13, color=C_DARK_GRAY)

# ═══════════════════════════════════════════════
# 开始生成 PPT
# ═══════════════════════════════════════════════
prs = Presentation()
prs.slide_width = Cm(25.4)
prs.slide_height = Cm(19.05)
BL = prs.slide_layouts[6]  # blank

# ── Page 1: Cover ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_DARK)
rect(s, 0, 0, 25.4, 0.15, C_PRIMARY)
rect(s, 0, 0, 7.5, 19.05, C_PRIMARY)
tb(s, 1.2, 3.5, 5.5, 2.5, '七擒\n孟获', fs=52, color=C_WHITE, bold=True, fn=FONT_TITLE)
tb(s, 1.2, 9.5, 5.5, 1.2, '像素三国\n横版动作叙事游戏', fs=16, color=RGBColor(0xFF,0xE0,0xE0))
tb(s, 1.2, 15.5, 5.5, 2.0, '打败 Boss 不是终点，\n而是故事的开始。', fs=12, color=RGBColor(0xFF,0xC0,0xC0))
mb(s, 9.5, 6.0, 14, 6, [
    ('腾讯云黑客松 ' + MD + ' 叙事类游戏赛道', 14, C_MID_GRAY),
    ('', 8, C_MID_GRAY),
    ('横版射击 \u00d7 七擒七纵 \u00d7 攻心为上', 18, C_ACCENT_GOLD, True),
    ('', 10, C_MID_GRAY),
    ('Phase 2 MVP ' + EM + ' Phaser 3 + TypeScript + Vite', 12, C_MID_GRAY),
    ('Web 可玩 Demo，浏览器直跑', 12, C_MID_GRAY),
    ('', 10, C_MID_GRAY),
    ('技术栈：Phaser 3 ' + MD + ' TypeScript ' + MD + ' CloudBase ' + MD + ' 腾讯混元 AI', 10, RGBColor(0x6B,0x72,0x80)),
])
tb(s, 9.5, 17.0, 14, 0.6, 'v1.1 ' + MD + ' 2026.06 ' + MD + ' 像素三国视觉概念', fs=8, color=C_MID_GRAY)
rect(s, 0, 18.9, 25.4, 0.15, C_PRIMARY)

# ── Page 2: TOC ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 0, '目录')
toc = [
    ('01','作品定位','核心价值主张'),('02','故事背景','公元225年南中之战'),
    ('03','核心循环','擒而不杀的游戏机制'),('04','七关概览','七擒七纵关卡设计'),
    ('05','心态弧线','孟获七阶段变化'),('06','角色弧线','三条成长线交织'),
    ('07','叙事创新','与传统动作游戏的对比'),('08','美术方向','像素三国视觉体系'),
    ('09','技术方案','Phaser 3 + AI 增强'),('10','MVP 演示','第1关完整纵切'),
    ('11','研发进度','Phase 1~4 路线图'),('12','结尾','核心理念与 Q&A'),
]
for i,(num,title,desc) in enumerate(toc):
    r,c = i//2, i%2
    x,y = 1.2+c*12.0, 3.2+r*2.4
    tb(s,x,y,1.5,1.0,num,fs=28,color=C_PRIMARY,bold=True,fn=FONT_EN)
    tb(s,x+2.0,y,8,0.8,title,fs=15,color=C_TEXT_DARK,bold=True)
    tb(s,x+2.0,y+0.7,8,0.6,desc,fs=9,color=C_MID_GRAY)

# ── Page 3: 作品定位 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 1, '作品定位')
sub(s, '动作游戏的胜利，被改写成叙事起点')
rect(s, 1.2, 3.0, 22.5, 2.5, C_WHITE, C_PRIMARY, True)
mb(s, 1.8, 3.2, 21.3, 2.2, [
    ('核心定义', 12, C_PRIMARY, True),
    ('一款像素三国风格的横版动作游戏，以' + LQ + '擒而不杀、纵而再战' + RQ + '的七擒七纵循环为叙事引擎，', 14, C_TEXT_DARK),
    ('让玩家扮演汉军无名士卒，在诸葛亮的计谋指引下，经历七场与蛮王孟获的宿命对决。', 14, C_TEXT_DARK),
])
dims = [
    ('战斗感','魂斗罗式横版射击\n爽快直接，像素子弹横飞'),
    ('叙事感','七擒七纵循环结构\n每场Boss战结束才是故事开始'),
    ('文化感','三国智慧+蛮夷文化\n立体呈现，非标签式古装'),
    ('成长感','孟获从傲慢到折服\n玩家亲身见证心态弧线'),
]
for i,(t,d) in enumerate(dims):
    x=1.2+i*5.9; y=6.5
    rect(s,x,y,5.4,4.5,C_WHITE,radius=True)
    tb(s,x+0.4,y+0.3,4.6,0.8,t,fs=18,color=C_PRIMARY,bold=True)
    tb(s,x+0.4,y+1.3,4.6,2.5,d,fs=12,color=C_TEXT_BODY)
rect(s,1.2,12.0,22.5,1.5,C_DARK)
mb(s,1.8,12.2,21.3,1.2,[
    ('差异化定位', 11, C_ACCENT_GOLD, True),
    (LQ + '大多数动作游戏的 Boss 打倒即结束。《七擒孟获》的独特性在于：打倒 Boss 只是故事的开始。' + RQ, 12, C_LIGHT_GRAY),
])
tags=[('擒而不杀',C_PRIMARY),('纵而再战',C_DEEP_BLUE),('小兵视角',C_INK_GREEN),('AI计谋',C_PURPLE)]
for i,(tag,clr) in enumerate(tags):
    x=1.2+i*5.9
    rect(s,x,14.2,5.4,1.0,clr)
    tb(s,x,14.4,5.4,0.6,tag,fs=13,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
pn(s,1)

# ── Page 4: 故事背景 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 2, '故事背景')
sub(s, '公元225年：南中之战，真正的战场在人心')
tl = [
    ('223年','刘备白帝城托孤\n刘禅继位，诸葛亮辅政'),
    ('225年\n春','南中蛮族叛乱\n诸葛亮率军南征'),
    ('225年\n夏','进入南中腹地\n七擒七纵交锋'),
    ('225年\n秋','孟获折服归降\n南中平定'),
    ('225年\n冬','班师回成都\n奠定北伐基础'),
]
for i,(yr,ev) in enumerate(tl):
    x=1.2+i*4.6; y=3.0
    dot=s.shapes.add_shape(MSO_SHAPE.OVAL,Cm(x+1.2),Cm(y),Cm(1.6),Cm(1.6))
    dot.fill.solid(); dot.fill.fore_color.rgb=LEVEL_COLORS[i] if i<7 else C_PRIMARY
    dot.line.fill.background()
    tb(s,x+0.2,y+0.1,3.5,0.6,yr,fs=11,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
    tb(s,x+0.2,y+0.7,3.5,0.6,str(i+1),fs=9,color=RGBColor(0xFF,0xFF,0xFF),align=PP_ALIGN.CENTER)
    if i<4: rect(s,x+3.0,y+0.75,1.8,0.06,LEVEL_COLORS[i])
    tb(s,x,y+2.2,3.8,2.0,ev,fs=10,color=C_TEXT_BODY,align=PP_ALIGN.CENTER)
rect(s,1.2,6.5,22.5,3.8,C_DARK)
mb(s,1.8,6.7,21.3,3.5,[
    ('史书记载 ' + EM + ' 《三国志' + MD + '蜀书' + MD + '诸葛亮传》裴松之注引《汉晋春秋》', 11, C_ACCENT_GOLD, True),
    ('', 6, C_LIGHT_GRAY),
    (LQ + '亮至南中，所在战捷。闻孟获者，为夷、汉所服，募生致之。' + RQ, 13, C_LIGHT_GRAY),
    ('既得，使观于营阵之间，问曰：' + LS + '此军何如？' + RS, 13, C_LIGHT_GRAY),
    ('获对曰：' + LS + '向者不知虚实，故败。' + RS + '亮笑，纵使更战。', 13, C_LIGHT_GRAY),
    ('七纵七禽，而亮犹遣获。获止不去，曰：' + LS + '公，天威也，南人不复反矣。' + RS, 13, C_LIGHT_GRAY),
])
mb(s,1.2,11.2,22.5,3.0,[
    ('历史还原度取舍原则', 12, C_PRIMARY, True),
    ('核心事件严格遵循 ' + MD + ' 具体战斗艺术加工 ' + MD + ' 蛮夷文化立体呈现 ' + MD + ' 人物基于史实延伸 ' + MD + ' 台词整体创作', 10, C_TEXT_BODY),
])
rect(s,1.2,14.5,22.5,1.5,C_WHITE)
mb(s,1.6,14.6,21.8,1.2,[
    ('游戏舞台：南中地理', 11, C_INK_GREEN, True),
    ('西洱河（平原）' + AR + ' 泸水（天险）' + AR + ' 紫荆山（密林）' + AR + ' 秃龙洞（洞窟）' + AR + ' 蛮族营寨 ' + AR + ' 要塞 ' + AR + ' 银坑洞王庭', 10, C_TEXT_BODY),
])
pn(s,2)

# ── Page 5: 核心循环 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 3, '核心循环')
sub(s, '擒而不杀，纵而再战 ' + EM + ' 每一次' + LQ + '打赢' + RQ + '都是新故事的开始')
loop = [
    ('开场叙事','诸葛亮授计\nAI动态台词',C_PRIMARY),
    ('关卡战斗','横版射击\n中途叙事对话',C_DEEP_BLUE),
    ('Boss 战','孟获登场\n独特战斗机制',C_INK_GREEN),
    ('擒获叙事','孟获反应\n释放抉择',C_PURPLE),
    ('关卡结算','评价系统\n解锁碎片',RGBColor(0xC4,0x5A,0x3C)),
]
for i,(step,desc,clr) in enumerate(loop):
    x=1.2+i*4.8; y=3.2
    rect(s,x,y,4.3,3.8,C_WHITE,radius=True)
    rect(s,x+1.2,y-0.5,1.9,1.0,clr)
    tb(s,x+1.2,y-0.4,1.9,0.6,f'0{i+1}',fs=16,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
    tb(s,x+0.3,y+0.8,3.7,0.8,step,fs=16,color=clr,bold=True,align=PP_ALIGN.CENTER)
    tb(s,x+0.3,y+1.8,3.7,1.5,desc,fs=11,color=C_TEXT_BODY,align=PP_ALIGN.CENTER)
    if i<4: tb(s,x+3.8,y+1.3,1.2,1.0,AR,fs=28,color=C_MID_GRAY,bold=True,align=PP_ALIGN.CENTER)
rect(s,1.2,8.0,22.5,2.2,C_DARK)
mb(s,1.8,8.2,21.3,1.8,[
    ('核心循环 \u00d7 7 次', 13, C_ACCENT_GOLD, True),
    ('[主菜单] ' + AR + ' [选关/继续] ' + AR + ' 开场叙事 ' + AR + ' 关卡战斗 ' + AR + ' Boss战 ' + AR + ' 擒获叙事 ' + AR + ' 关卡结算 ' + AR + ' 返回选关', 12, C_LIGHT_GRAY),
    ('循环 7 次后 ' + AR + ' 终章' + MD + '第七擒' + MD + '折服 ' + AR + ' 结局过场 ' + AR + ' 制作名单', 12, C_LIGHT_GRAY),
])
rect(s,1.2,11.0,10.5,4.5,C_WHITE)
mb(s,1.6,11.2,9.8,4.0,[
    ('叙事介入方式', 13, C_PRIMARY, True),
    ('图文过场（关键节点）: 每关开场/擒获后', 10, C_TEXT_BODY),
    ('对话框（过程叙述）: 关卡中途/Boss战前', 10, C_TEXT_BODY),
    ('时长设计: 过场15-60秒 / 对话框2-3秒', 10, C_TEXT_BODY),
    ('可跳过性: 除首通擒获过场外，均可跳过', 10, C_TEXT_BODY),
    ('', 6, C_TEXT_BODY),
    ('武器渐进: 基础弩' + AR + '连弩(第3关)' + AR + '火箭(第5关)' + AR + '诸葛连弩(第7关)', 10, C_PRIMARY, True),
])
rect(s,13.0,11.0,10.7,4.5,C_WHITE)
mb(s,13.4,11.2,10.0,4.0,[
    ('战斗操作（魂斗罗式）', 13, C_DEEP_BLUE, True),
    ('移动：左右横移，标准平台移动', 10, C_TEXT_BODY),
    ('跳跃：单段跳 + 空中微调', 10, C_TEXT_BODY),
    ('射击：八方向射击（上下左右+斜向）', 10, C_TEXT_BODY),
    ('闪避：短无敌帧翻滚（第2关解锁）', 10, C_TEXT_BODY),
    ('', 6, C_TEXT_BODY),
    ('故事碎片：每关隐藏1块，集齐7块解锁完整史书记载', 10, C_INK_GREEN, True),
])
pn(s,3)

# ── Page 6: 七关概览 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 4, '七关概览')
sub(s, '每关机制变化反映孟获心态变化 ' + EM + ' 关卡即叙事')
lvls = [
    ('第1擒','西洱河初战','平原','翠绿+天蓝','\u2605','基础教学：移动/跳跃/射击','孟获骑象，轻敌冒进'),
    ('第2擒','泸水天险','河岸','深蓝+灰白','\u2605\u2605','跳跃挑战：水流+浮水平台','乘船水战，利用地形'),
    ('第3擒','紫荆山伏兵','密林','墨绿+褐黄','\u2605\u2605\u2605','视野遮挡+伏击+隐身识别','丛林猎手，设伏偷袭'),
    ('第4擒','秃龙洞毒雾','洞窟','暗紫+荧光绿','\u2605\u2605\u2605\u2605','环境伤害+视野黑暗+资源管理','联合祝融夫人，毒雾'),
    ('第5擒','蛮族联军','营寨','赭红+土黄','\u2605\u2605\u2605\u2605','多波次敌兵+双Boss战','倾巢而出，赌上一切'),
    ('第6擒','木兽炎阵','要塞','深红+铁灰','\u2605\u2605\u2605\u2605\u2605','火焰陷阱+木兽机关+反制','出奇制胜，用尽底牌'),
    ('第7擒','银坑洞决战','王庭','金+深棕','\u2605\u2605\u2605\u2605\u2605','全机制综合+三阶段Boss','背水一战，最终折服'),
]
hds = ['关卡','名称','场景','色调','难度','核心机制','Boss战特色']
cws = [2.2,3.0,1.8,2.8,1.5,5.0,6.0]
cx = 1.2; ys = 3.0
for j,(h,cw) in enumerate(zip(hds,cws)):
    rect(s,cx,ys,cw,1.0,C_DARK)
    tb(s,cx+0.15,ys+0.15,cw-0.3,0.7,h,fs=9,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
    cx += cw
for i,(lv,nm,sc,tn,df,mc,bs) in enumerate(lvls):
    y = ys+1.0+i*1.4
    bg = C_WHITE if i%2==0 else RGBColor(0xF8,0xF7,0xF3)
    cx = 1.2
    vals = [lv,nm,sc,tn,df,mc,bs]
    szs = [10,11,9,8,8,8,8]
    for j,(v,cw,sz) in enumerate(zip(vals,cws,szs)):
        rect(s,cx,y,cw,1.3,bg)
        if j==0: rect(s,cx,y,0.2,1.3,LEVEL_COLORS[i])
        clr = C_TEXT_DARK if j<=1 else C_TEXT_BODY
        bld = j<=1
        tb(s,cx+0.3,y+0.1,cw-0.5,1.1,v,fs=sz,color=clr,bold=bld,align=PP_ALIGN.CENTER if j<4 else PP_ALIGN.LEFT)
        cx += cw
pn(s,4)

# ── Page 7: 孟获心态弧线 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 5, '孟获心态弧线')
sub(s, '从傲慢到折服 ' + EM + ' 七擒七纵的本质是让对手' + LQ + '被理解' + RQ + '，而非' + LQ + '被击败' + RQ)
moods = [
    ('第1擒\n傲慢', LQ + '诡计！汉人狡诈！\n我不服！' + RQ, LEVEL_COLORS[0]),
    ('第2擒\n辩解', LQ + '此乃地利之失，\n非战之罪！' + RQ, LEVEL_COLORS[1]),
    ('第3擒\n困惑', LQ + '……汝究竟\n欲如何？' + RQ, LEVEL_COLORS[2]),
    ('第4擒\n倔强', LQ + '纵我七次，\n我也不降！' + RQ, LEVEL_COLORS[3]),
    ('第5擒\n挣扎', LQ + '我蛮族男儿，\n岂能降汉！' + RQ, LEVEL_COLORS[4]),
    ('第6擒\n反思', LQ + '你是妖魔吗？\n你们来做什么？' + RQ, LEVEL_COLORS[5]),
    ('第7擒\n折服', LQ + '公，天威也。\n南人不复反矣。' + RQ, LEVEL_COLORS[6]),
]
for i,(st,qt,clr) in enumerate(moods):
    x=1.2+i*3.4; y=3.2
    rect(s,x,y,3.1,7.5,C_WHITE,radius=True)
    rect(s,x,y,3.1,0.5,clr)
    tb(s,x,y+0.7,3.1,1.5,st,fs=14,color=clr,bold=True,align=PP_ALIGN.CENTER)
    tb(s,x+1.0,y+2.5,1.0,0.6,'\u2193',fs=16,color=clr,align=PP_ALIGN.CENTER)
    tb(s,x+0.2,y+3.2,2.7,3.0,qt,fs=10,color=C_TEXT_BODY,align=PP_ALIGN.CENTER)
rect(s,1.2,11.5,22.5,3.5,C_DARK)
mb(s,1.8,11.7,21.3,3.0,[
    ('设计洞察', 12, C_ACCENT_GOLD, True),
    ('', 6, C_LIGHT_GRAY),
    ('孟获反抗的根本原因不是好战，而是恐惧 ' + EM + ' 恐惧南中失去独立，恐惧族人被奴役。', 13, C_LIGHT_GRAY),
    ('诸葛亮最终降服的，不是孟获的武力，而是他的恐惧。', 13, C_LIGHT_GRAY, True),
    ('', 6, C_LIGHT_GRAY),
    ('核心叙事钩子：为什么打赢了还要放人？' + AR + ' 答案随7关逐步揭晓。', 11, RGBColor(0x6B,0x72,0x80)),
])
pn(s,5)

# ── Page 8: 三条角色弧线 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 6, '三条角色弧线')
sub(s, '诸葛亮、孟获、玩家小卒共同完成' + LQ + '心战' + RQ + '的闭环')
chars = [
    {
        'title': '玩家小卒', 'subtitle': '汉军无名士卒 ' + EM + ' 玩家化身', 'color': C_PRIMARY,
        'desc': '一个普通蜀中青年，应征入伍。\n他不是名将之后，没有显赫家世' + EM + '\n就是在成都街巷里长大的普通人。\n被诸葛亮选为前锋斥候，亲历\n七擒孟获的每一个关键时刻。',
        'arc': '困惑 ' + AR + ' 思考 ' + AR + ' 共情 ' + AR + ' 见证',
        'quote': LQ + '丞相为何放走敌人？' + RQ + '\n' + AR + ' 好像有点理解了\n' + AR + ' 孟获也是个有血有肉的人\n' + AR + ' 我见证了历史',
    },
    {
        'title': '诸葛亮', 'subtitle': '蜀汉丞相 ' + MD + ' 南征统帅', 'color': C_DEEP_BLUE,
        'desc': '45岁。羽扇纶巾，深蓝色长袍。\n不是一个全知全能的' + LQ + '神仙' + RQ + '，\n而是一个有智慧、有远见、\n有温度的人。善于观察和分析，\n但也会面临不确定性。',
        'arc': '战略导师 ' + MD + ' 不神化\n以耐心换和平',
        'quote': LQ + '攻心为上，攻城为下。\n心战为上，兵战为下。' + RQ + '\n\n相信人心可以被感化。\n真正的胜利不是杀戮，\n是让对方心甘情愿。',
    },
    {
        'title': '孟获', 'subtitle': '南中蛮族联盟领袖 ' + MD + ' Boss', 'color': C_INK_GREEN,
        'desc': '约40岁。虎背熊腰，赤膊纹身，\n头戴兽骨盔，手持战斧。\n不是一个被' + LQ + '打败' + RQ + '的Boss，\n而是一个被' + LQ + '理解' + RQ + '的人。\n勇武且有自尊，有部落荣誉感。',
        'arc': '对手 ' + AR + ' 宿敌 ' + AR + ' 伙伴\n从抗拒到理解到归心',
        'quote': LQ + '我不是不相信他。\n我只是不相信汉人。' + RQ + '\n\n最终说出：\n' + LQ + '公，天威也。\n南人不复反矣。' + RQ,
    },
]
for i,ch in enumerate(chars):
    x=1.2+i*8.0; y=3.0
    rect(s,x,y,7.5,7.5,C_WHITE,radius=True)
    rect(s,x,y,7.5,0.4,ch['color'])
    tb(s,x+0.5,y+0.6,6.5,0.8,ch['title'],fs=20,color=ch['color'],bold=True)
    tb(s,x+0.5,y+1.3,6.5,0.5,ch['subtitle'],fs=9,color=C_MID_GRAY)
    tb(s,x+0.5,y+2.0,6.5,3.0,ch['desc'],fs=9,color=C_TEXT_BODY)
    rect(s,x+0.5,y+4.8,6.5,0.8,RGBColor(0xF0,0xEF,0xEA))
    tb(s,x+0.7,y+4.9,6.1,0.6,ch['arc'],fs=9,color=ch['color'],bold=True)
    tb(s,x+0.5,y+5.8,6.5,1.5,ch['quote'],fs=8,color=C_DARK_GRAY)
rect(s,1.2,11.5,22.5,1.8,C_DARK)
mb(s,1.8,11.7,21.3,1.4,[
    ('三条线交织 ' + EM + ' 共同完成' + LQ + '心战' + RQ + '的闭环', 12, C_ACCENT_GOLD, True),
    ('诸葛亮（授计者）' + AR + ' 玩家小卒（执行者/见证者）' + AR + ' 孟获（被感化者）', 10, C_LIGHT_GRAY),
    ('师徒式关系：诸葛亮对玩家的解释，也是在对所有玩家' + LQ + '授课' + RQ + '。第7关那句' + LQ + '你可明白了？' + RQ + '同时问向角色与玩家。', 10, C_LIGHT_GRAY),
])
pn(s,6)

# ── Page 9: 叙事创新 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 7, '叙事创新')
sub(s, '把' + LQ + '攻心为上' + RQ + '从台词，变成可见、可玩、可验证的机制')
rect(s,1.2,3.2,10.5,5.0,RGBColor(0xF0,0xEF,0xEA))
tb(s,1.8,3.4,9.3,0.6,'传统动作游戏',fs=16,color=C_MID_GRAY,bold=True)
mb(s,1.8,4.2,9.3,3.5,[
    ('Boss 被打倒', 14, C_MID_GRAY, True),
    ('\u2193', 14, C_MID_GRAY),
    ('死亡 / 爆炸 / 通关画面', 14, C_MID_GRAY, True),
    ('\u2193', 14, C_MID_GRAY),
    ('下一关', 14, C_MID_GRAY, True),
    ('', 8, C_MID_GRAY),
    ('叙事 = 战斗的句号', 12, C_DARK_GRAY, True),
])
tb(s,10.5,5.0,4.4,1.2,'VS',fs=40,color=C_PRIMARY,bold=True,align=PP_ALIGN.CENTER)
rect(s,13.0,3.2,10.7,5.0,C_DARK)
tb(s,13.6,3.4,9.5,0.6,'《七擒孟获》',fs=16,color=C_ACCENT_GOLD,bold=True)
mb(s,13.6,4.2,9.5,3.5,[
    ('Boss 被打倒', 14, C_ACCENT_GOLD, True),
    ('\u2193', 14, C_ACCENT_GOLD),
    ('被擒获 ' + MD + ' 诸葛亮释放', 14, C_ACCENT_GOLD, True),
    ('\u2193', 14, C_ACCENT_GOLD),
    ('孟获带新理由再战', 14, C_ACCENT_GOLD, True),
    ('', 8, C_ACCENT_GOLD),
    ('叙事 = 新故事的开始', 12, C_PRIMARY, True),
])
invs = [
    ('擒而不杀','每次战胜孟获后触发释放叙事节点。诸葛亮下令松绑，孟获震惊、困惑、反思' + EM + '这些情绪变化成为下一步关卡设计的动机。'),
    ('纵而再战','下次相遇时孟获更强、更狡猾，关卡机制同步深化。第1关轻敌' + AR + '第7关全力以赴，难度和复杂度与心态弧线同步增长。'),
    ('玩家追问','首通不可跳过的擒获过场确保玩家亲历' + LQ + '为什么放他走' + RQ + '的困惑。验收标准：玩家通关后能主动说出' + EM + LQ + '我打赢了，但故事还没结束。' + RQ),
    ('AI计谋增强','腾讯混元大模型根据玩家上关行为（用时/死亡/受伤）动态生成诸葛亮计谋台词，有本地 fallback 保证不阻塞主流程。'),
]
for i,(t,d) in enumerate(invs):
    x=1.2+(i%2)*12.0; y=8.8+(i//2)*2.8
    rect(s,x,y,11.0,2.5,C_WHITE,radius=True)
    tb(s,x+0.4,y+0.2,10.2,0.6,t,fs=14,color=C_PRIMARY if i<2 else C_DEEP_BLUE,bold=True)
    tb(s,x+0.4,y+0.9,10.2,1.4,d,fs=9,color=C_TEXT_BODY)
pn(s,7)

# ── Page 10: 美术方向 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 8, '美术方向：像素三国')
sub(s, '复古街机的动作感 + 国风水墨的历史质感')
stys = [
    ('像素基底','16\u00d716 或 32\u00d732 Sprite，保持魂斗罗式的爽快感。角色与战斗保持清晰可读。',C_PRIMARY),
    ('国风点缀','UI 边框：水墨笔触纹理\n标题/关卡名：毛笔手写字体\n过场插画：水墨渲染 + 像素角色\n粒子效果：墨滴飞溅替代传统火花',C_INK_GREEN),
    ('低饱和调色','朱砂红、墨绿、古铜、深蓝为主色调，避免高饱和' + LQ + '游戏感' + RQ + '。营造历史的厚重与沉淀。',C_DEEP_BLUE),
    ('色调叙事','七关从翠绿到金棕，环境色调映射孟获心态从轻浮到沉淀的变化。',C_PURPLE),
]
for i,(t,d,clr) in enumerate(stys):
    y=3.0+i*3.0; x=1.2
    rect(s,x,y,0.3,2.5,clr)
    tb(s,x+0.8,y+0.1,3.5,0.6,t,fs=16,color=clr,bold=True)
    tb(s,x+0.8,y+0.8,10.0,1.6,d,fs=10,color=C_TEXT_BODY)
rect(s,13.0,3.0,11.0,12.0,C_DARK)
tb(s,13.5,3.3,10.0,0.6,'七关环境色调',fs=13,color=C_ACCENT_GOLD,bold=True)
lt = [
    ('第1擒','西洱河平原','翠绿+天蓝',LEVEL_COLORS[0],'开阔、初战、轻敌'),
    ('第2擒','泸水河岸','深蓝+灰白',LEVEL_COLORS[1],'险峻、湍急、沉着'),
    ('第3擒','紫荆山密林','墨绿+褐黄',LEVEL_COLORS[2],'压抑、伏击、智斗'),
    ('第4擒','秃龙洞洞窟','暗紫+荧光绿',LEVEL_COLORS[3],'诡异、毒雾、坚持'),
    ('第5擒','蛮族联盟营寨','赭红+土黄',LEVEL_COLORS[4],'宏大、联战、暗流'),
    ('第6擒','蛮夷要塞','深红+铁灰',LEVEL_COLORS[5],'烈火、机关、反制'),
    ('第7擒','银坑洞王庭','金+深棕',LEVEL_COLORS[6],'壮阔、决战、折服'),
]
for i,(lv,sc,tn,clr,md) in enumerate(lt):
    y=4.2+i*1.5
    rect(s,13.5,y,0.8,1.2,clr)
    tb(s,14.5,y+0.05,2.5,0.5,lv,fs=10,color=C_LIGHT_GRAY,bold=True)
    tb(s,14.5,y+0.55,2.5,0.4,sc,fs=8,color=C_MID_GRAY)
    tb(s,17.0,y+0.05,2.5,0.5,tn,fs=9,color=C_ACCENT_GOLD)
    tb(s,17.0,y+0.55,6.5,0.4,md,fs=8,color=C_MID_GRAY)
pn(s,8)

# ── Page 11: 技术方案 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 9, '技术方案')
sub(s, 'Web 可玩 Demo：Phaser 3 + TypeScript + Vite + CloudBase')
tstk = [
    ('Phaser 3.60+','游戏引擎','零安装，浏览器直跑\n评审官零门槛\n2D 游戏框架成熟稳定',C_PRIMARY),
    ('TypeScript 5.0+','编程语言','类型安全，大型项目可维护\n代码提示友好\n重构安全',C_DEEP_BLUE),
    ('Vite 5.0+','构建工具','极速 HMR，开发体验好\n秒级冷启动\n天然支持 TypeScript',C_INK_GREEN),
    ('CloudBase','部署平台','腾讯云静态托管\n一键部署\n腾讯生态深度集成',C_PURPLE),
]
for i,(nm,rl,ds,clr) in enumerate(tstk):
    x=1.2+i*6.0; y=3.2
    rect(s,x,y,5.5,4.5,C_WHITE,radius=True)
    rect(s,x,y,5.5,0.4,clr)
    tb(s,x+0.3,y+0.6,4.9,0.8,nm,fs=18,color=clr,bold=True)
    tb(s,x+0.3,y+1.3,4.9,0.5,rl,fs=10,color=C_MID_GRAY)
    tb(s,x+0.3,y+2.0,4.9,2.0,ds,fs=10,color=C_TEXT_BODY)
rect(s,1.2,8.5,22.5,4.5,C_DARK)
mb(s,1.8,8.7,21.3,4.0,[
    ('AI 动态计谋系统（加分项）', 13, C_ACCENT_GOLD, True),
    ('', 6, C_LIGHT_GRAY),
    ('流程：玩家上关数据（用时/死亡/受伤）' + AR + ' 行为分析（激进/稳健/快/慢）' + AR + ' 腾讯混元大模型 ' + AR + ' 诸葛亮计谋台词', 11, C_LIGHT_GRAY),
    ('', 6, C_LIGHT_GRAY),
    ('设计原则', 11, C_PRIMARY, True),
    (MD + ' AI 只生成非关键短建议（战术/心性提醒），主线剧情由人类写定', 10, C_LIGHT_GRAY),
    (MD + ' 本地 fallback 模板优先，不允许 API 阻塞主流程', 10, C_LIGHT_GRAY),
    (MD + ' 诸葛亮语气约束：战前严肃简洁 / 日常温和有洞察 / 关键节点厚重有分量', 10, C_LIGHT_GRAY),
    ('', 6, C_LIGHT_GRAY),
    ('架构：5层分层（Scenes' + MD + 'UI' + MD + 'Systems' + MD + 'Entities' + MD + 'Core/Utils），场景即入口，System无状态，Entity自包含，Data驱动', 10, RGBColor(0x6B,0x72,0x80)),
])
pn(s,9)

# ── Page 12: MVP 演示 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 10, 'MVP 演示范围')
sub(s, '先做第1关' + LQ + '西洱河初战' + RQ + '完整纵切，证明核心体验')
scr = [
    ('01','诸葛亮授计',LQ + '此战所求，非杀戮，乃归心。我要活的。' + RQ,C_PRIMARY),
    ('02','基础教学','玩家学习移动、跳跃、射击（魂斗罗式八方向）',C_DEEP_BLUE),
    ('03','关卡推进','平原行军' + AR + '河岸遭遇战，蛮兵增多',C_INK_GREEN),
    ('04','Boss 战','孟获骑战象登场：象鼻横扫/踏地震击/冲锋',C_PURPLE),
    ('05','击败 Boss','孟获台词：' + LS + '什么？！这不可能' + EM + EM + RS + ' 玩家以为自己通关',RGBColor(0xC4,0x5A,0x3C)),
    ('06','擒获释放','诸葛亮下令松绑：' + LS + '将军勇则勇矣，然未识天时。' + RS,C_PRIMARY),
    ('07','关卡结算','第一擒完成，第二擒解锁。历史碎片收集。',C_DEEP_BLUE),
]
for i,(num,t,ds,clr) in enumerate(scr):
    x=1.2+(i%4)*5.9; y=3.2+(i//4)*3.8
    rect(s,x,y,5.4,3.3,C_WHITE,radius=True)
    rect(s,x+0.3,y+0.3,1.2,0.8,clr)
    tb(s,x+0.3,y+0.35,1.2,0.6,num,fs=16,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
    tb(s,x+1.8,y+0.35,3.3,0.6,t,fs=13,color=clr,bold=True)
    tb(s,x+0.3,y+1.3,4.8,1.8,ds,fs=10,color=C_TEXT_BODY)
rect(s,1.2,11.5,22.5,2.0,C_DARK)
mb(s,1.8,11.7,21.3,1.6,[
    ('验收标准', 13, C_ACCENT_GOLD, True),
    ('玩家通关后能主动说出 ' + EM + ' ' + LQ + '我打赢了，但故事还没结束。' + RQ, 14, C_LIGHT_GRAY, True),
    ('技术验收：30秒内学会移动+跳跃+射击 / 2分钟内遇首个叙事节点 / 5分钟内完成首次Boss战', 10, RGBColor(0x6B,0x72,0x80)),
])
pn(s,10)

# ── Page 13: 研发进度 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_LIGHT_GRAY)
hdr(s, 11, '研发进度与下一步')
sub(s, 'Phase 2 MVP 已搭建完成，核心战斗可玩')
phs = [
    ('Phase 1','\u2705 已完成','产品定义 & 叙事设计','GDD / 世界观圣经 / 关卡叙事大纲 / 角色设定表 / 视觉概念定稿',C_PRIMARY),
    ('Phase 2','\U0001F504 进行中','MVP 第1关纵切原型','5层模块架构 / Player+Enemy+Boss 实体 / 全部核心系统（含 CaptureSystem）',C_DEEP_BLUE),
    ('Phase 3','\U0001F4CB 计划中','第2-7关铺量','基于第1关模板批量生产 ' + MD + ' 每关独特机制 + 叙事变体',C_INK_GREEN),
    ('Phase 4','\U0001F4CB 计划中','AI 集成 + 打磨','混元LLM 动态台词 / 像素美术资产 / 音效BGM / 多语言',C_PURPLE),
]
for i,(ps,st,t,dt,clr) in enumerate(phs):
    y=3.0+i*3.5; x=1.2
    rect(s,x,y,0.3,3.0,clr)
    tb(s,x+0.8,y+0.1,6.0,0.7,ps+'  '+st,fs=15,color=clr,bold=True)
    tb(s,x+0.8,y+0.8,6.0,0.5,t,fs=12,color=C_TEXT_DARK,bold=True)
    tb(s,x+0.8,y+1.4,20.0,1.2,dt,fs=10,color=C_TEXT_BODY)
rect(s,1.2,15.5,22.5,1.5,C_WHITE)
mb(s,1.6,15.6,21.8,1.2,[
    ('11个开发批次（Batch 0-11）' + MD + ' 四大通信模式解耦 ' + MD + ' 配置化驱动 ' + MD + ' 本地 fallback 优先', 10, C_TEXT_BODY),
])
pn(s,11)

# ── Page 14: 结尾 ──
s = prs.slides.add_slide(BL)
set_slide_bg(s, C_DARK)
rect(s,0,0,25.4,0.15,C_PRIMARY)
tb(s,2.0,3.5,21.4,3.0,'真正的胜利，\n不是消灭敌人。',fs=44,color=C_WHITE,bold=True,fn=FONT_TITLE,align=PP_ALIGN.CENTER)
tb(s,2.0,7.5,21.4,3.0,'而是让冲突双方\n找到共同秩序。',fs=44,color=C_ACCENT_GOLD,bold=True,fn=FONT_TITLE,align=PP_ALIGN.CENTER)
rect(s,8.0,11.0,9.4,0.1,C_ACCENT_GOLD)
tb(s,3.0,11.5,19.4,1.5,'《七擒孟获》将' + LQ + '七擒七纵、攻心为上' + RQ + '做成关卡循环、Boss 机制和玩家情绪体验。',fs=14,color=C_MID_GRAY,align=PP_ALIGN.CENTER)
tags2=['横版射击','七擒七纵','小兵视角','攻心为上']
for i,tg in enumerate(tags2):
    x=5.0+i*4.2
    rect(s,x,13.5,3.5,1.0,C_DARK,C_ACCENT_GOLD,True)
    tb(s,x,13.65,3.5,0.7,tg,fs=12,color=C_ACCENT_GOLD,bold=True,align=PP_ALIGN.CENTER)
tb(s,2.0,16.0,21.4,1.0,'Q & A',fs=28,color=C_WHITE,bold=True,align=PP_ALIGN.CENTER)
tb(s,2.0,17.2,21.4,0.6,'腾讯云黑客松 ' + MD + ' 叙事类游戏赛道 ' + MD + ' Phaser 3 + TypeScript + Vite + CloudBase',fs=9,color=C_MID_GRAY,align=PP_ALIGN.CENTER)
rect(s,0,18.9,25.4,0.15,C_PRIMARY)
pn(s,12)

# ── Save ──
out = os.path.join(os.path.dirname(__file__), '七擒孟获_游戏介绍PPT_优化版.pptx')
prs.save(out)
print(f'Done! {len(prs.slides)} slides -> {out}')
