"""Phase 3 验证脚本"""
import json, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
errors = []
warnings = []
ok_count = 0

def check(condition, msg, severity="error"):
    global ok_count
    if condition:
        ok_count += 1
        print(f"  ✅ {msg}")
    else:
        if severity == "error":
            errors.append(msg)
            print(f"  ❌ {msg}")
        else:
            warnings.append(msg)
            print(f"  ⚠️ {msg}")

# ===== 1. JSON 可解析性 =====
print("\n" + "="*60)
print("1. JSON 文件可解析性")
print("="*60)

data_dir = os.path.join(BASE, "data")
json_files = ["asset-manifest.json", "level01-config.json", "dialogs.json", "cutscenes.json", "fragments.json"]
parsed = {}
for fname in json_files:
    fpath = os.path.join(data_dir, fname)
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            parsed[fname] = json.load(f)
        check(True, f"{fname} 解析成功")
    except json.JSONDecodeError as e:
        check(False, f"{fname} 解析失败: {e}")

# ===== 2. 对话ID交叉验证 =====
print("\n" + "="*60)
print("2. level01 dialogSequence ↔ dialogs.json 交叉验证")
print("="*60)

if "level01-config.json" in parsed and "dialogs.json" in parsed:
    config = parsed["level01-config.json"]
    dialogs = parsed["dialogs.json"]
    dialog_ids = set(d["id"] for d in dialogs["dialogs"])
    
    for did in config.get("dialogSequence", []):
        check(did in dialog_ids, f"对话ID存在: {did}")

# ===== 3. 过场ID验证 =====
print("\n" + "="*60)
print("3. level01 cutscenes ↔ cutscenes.json 交叉验证")
print("="*60)

if "level01-config.json" in parsed and "cutscenes.json" in parsed:
    config = parsed["level01-config.json"]
    cutscenes = parsed["cutscenes.json"]
    cs_ids = set(c["id"] for c in cutscenes["cutscenes"])
    
    for cid in config.get("cutscenes", []):
        check(cid in cs_ids, f"过场ID存在: {cid}")

# ===== 4. 拼写错误检查 =====
print("\n" + "="*60)
print("4. 常见拼写错误检查")
print("="*60)

if "level01-config.json" in parsed:
    config = parsed["level01-config.json"]
    raw = json.dumps(config)
    check("zuge" not in raw, "无 'zuge' 拼写错误 (应为 zhuge)")
    check("zhue" not in raw, "无 'zhue' 拼写错误 (应为 zhuge)")

# ===== 5. teachingTriggers 字段名检查 =====
print("\n" + "="*60)
print("5. level01 teachingTriggers 字段完整性")
print("="*60)

if "level01-config.json" in parsed:
    config = parsed["level01-config.json"]
    for i, trigger in enumerate(config.get("teachingTriggers", [])):
        # Check for keys with leading spaces
        for k in trigger.keys():
            check(not k.startswith(" "), f"trigger[{i}] 字段 '{k}' 无前导空格")
        check("trigger" in trigger, f"trigger[{i}] 有 'trigger' 字段")
        check("lesson" in trigger, f"trigger[{i}] 有 'lesson' 字段")
        if "dialogId" in trigger:
            if trigger["dialogId"]:
                check(trigger["dialogId"] in dialog_ids, f"trigger[{i}] dialogId '{trigger['dialogId']}' 存在")

# ===== 6. 资产文件存在性 =====
print("\n" + "="*60)
print("6. 资产文件存在性检查")
print("="*60)

if "asset-manifest.json" in parsed:
    manifest = parsed["asset-manifest.json"]
    
    # 图片资产
    for img in manifest["assets"].get("sprites", []):
        path = os.path.join(BASE, img["path"])
        check(os.path.exists(path), f"Sprite: {img['id']} ({img['path']})")
    
    for img in manifest["assets"].get("tilesets", []):
        path = os.path.join(BASE, img["path"])
        check(os.path.exists(path), f"Tileset: {img['id']} ({img['path']})")
    
    for ui in manifest["assets"].get("ui", []):
        path = os.path.join(BASE, ui["path"])
        check(os.path.exists(path), f"UI: {ui['id']} ({ui['path']})")
    
    # 音频资产
    for bgm in manifest["assets"]["audio"].get("bgm", []):
        path = os.path.join(BASE, bgm["path"])
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        check(exists and size > 0, f"BGM: {bgm['id']} ({bgm['durationSec']}s, {size/1024:.0f}KB)")
    
    for sfx in manifest["assets"]["audio"].get("sfx", []):
        path = os.path.join(BASE, sfx["path"])
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        check(exists and size > 0, f"SFX: {sfx['id']} ({sfx.get('durationSec','?')}s, {size/1024:.0f}KB)")

# ===== 7. 目录结构检查 =====
print("\n" + "="*60)
print("7. 目录结构检查")
print("="*60)

expected_dirs = [
    "assets/sprites/player",
    "assets/sprites/boss", 
    "assets/sprites/enemy",
    "assets/sprites/npc",
    "assets/tilesets",
    "assets/ui",
    "assets/audio/bgm",
    "assets/audio/sfx",
    "data",
]
for d in expected_dirs:
    check(os.path.isdir(os.path.join(BASE, d)), f"目录存在: {d}/")

# ===== 8. Git 状态 =====
print("\n" + "="*60)
print("8. Git 推送状态")
print("="*60)

import subprocess
try:
    result = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=BASE)
    local_commit = result.stdout.strip()[:8]
    print(f"  本地提交: {local_commit}")
    
    result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd=BASE)
    if result.stdout.strip():
        warnings.append(f"有未提交的更改: {result.stdout.strip()[:200]}")
        print(f"  ⚠️ 有未提交的更改")
    else:
        print(f"  ✅ 工作区干净")
        
except Exception as e:
    print(f"  ⚠️ 无法检查 git 状态: {e}")

# ===== 汇总 =====
print("\n" + "="*60)
print("验收汇总")
print("="*60)
print(f"  ✅ 通过: {ok_count}")
print(f"  ⚠️ 警告: {len(warnings)}")
print(f"  ❌ 错误: {len(errors)}")

if warnings:
    print("\n警告详情:")
    for w in warnings:
        print(f"  - {w}")

if errors:
    print("\n错误详情:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\n🎉 所有检查通过！")
