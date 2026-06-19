"""
Phase 3 占位音频生成脚本
生成功能性占位 BGM 和 SFX，用于游戏集成测试。
所有音频为原创生成（数学合成），非版权素材，可安全用于任何用途。
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 44100
BITS_PER_SAMPLE = 16
MAX_AMP = 32767 * 0.8  # 防削波

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SFX_DIR = os.path.join(BASE_DIR, "assets", "audio", "sfx")
BGM_DIR = os.path.join(BASE_DIR, "assets", "audio", "bgm")


def make_dirs():
    os.makedirs(SFX_DIR, exist_ok=True)
    os.makedirs(BGM_DIR, exist_ok=True)


def lerp(a, b, t):
    return a + (b - a) * t


def write_wav(path, samples, channels=1):
    """将浮点采样样本写入 16-bit PCM WAV 文件"""
    with wave.open(path, "w") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(BITS_PER_SAMPLE // 8)
        wf.setframerate(SAMPLE_RATE)
        data = []
        for s in samples:
            val = max(-1.0, min(1.0, s))
            data.append(int(val * MAX_AMP))
        wf.writeframes(struct.pack(f"<{len(data)}h", *data))


def envelope(total, attack_pct, decay_pct, release_pct):
    """生成 ADSR 包络数组"""
    env = []
    n = len(total)
    attack_end = int(n * attack_pct)
    decay_end = int(n * (attack_pct + decay_pct))
    release_start = int(n * (1.0 - release_pct))

    for i in range(n):
        if i < attack_end:
            env.append(i / max(1, attack_end))
        elif i < decay_end:
            t = (i - attack_end) / max(1, decay_end - attack_end)
            env.append(lerp(1.0, 0.7, t))
        elif i >= release_start:
            t = (i - release_start) / max(1, n - release_start)
            env.append(lerp(0.7, 0.0, t))
        else:
            env.append(0.7)
    return env


def sine_wave(freq, duration_sec):
    """生成纯正弦波"""
    n = int(SAMPLE_RATE * duration_sec)
    return [math.sin(2.0 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]


def square_wave(freq, duration_sec, duty=0.5):
    """生成方波"""
    n = int(SAMPLE_RATE * duration_sec)
    period = SAMPLE_RATE / freq
    return [1.0 if (i % period) < period * duty else -1.0 for i in range(n)]


def sawtooth(freq, duration_sec):
    """生成锯齿波"""
    n = int(SAMPLE_RATE * duration_sec)
    period = SAMPLE_RATE / freq
    return [2.0 * ((i % period) / period) - 1.0 for i in range(n)]


def triangle_wave(freq, duration_sec):
    """生成三角波"""
    n = int(SAMPLE_RATE * duration_sec)
    period = SAMPLE_RATE / freq
    result = []
    for i in range(n):
        phase = (i % period) / period
        if phase < 0.5:
            result.append(4.0 * phase - 1.0)
        else:
            result.append(3.0 - 4.0 * phase)
    return result


def noise(duration_sec):
    """生成白噪声"""
    import random
    n = int(SAMPLE_RATE * duration_sec)
    return [random.uniform(-1.0, 1.0) for _ in range(n)]


def mix(*tracks):
    """混合多个音轨（等量混合）"""
    if not tracks:
        return []
    n = len(tracks[0])
    result = [0.0] * n
    for t in tracks:
        for i in range(min(n, len(t))):
            result[i] += t[i]
    mx = max(max(abs(v) for v in result), 0.01)
    return [v / (mx * len(tracks)) for v in result]


def apply_envelope(samples, env):
    n = min(len(samples), len(env))
    return [samples[i] * env[i] for i in range(n)]


def repeat_loop(samples, duration_sec):
    """将采样循环到指定时长"""
    n = int(SAMPLE_RATE * duration_sec)
    result = []
    while len(result) < n:
        result.extend(samples[:n - len(result)])
    return result[:n]


def generate_bass_note(freq, duration_sec):
    """生成低音音符（有泛音）"""
    fund = sine_wave(freq, duration_sec)
    harm1 = sine_wave(freq * 2, duration_sec)
    harm2 = sine_wave(freq * 3, duration_sec)
    return mix(fund, [h * 0.3 for h in harm1], [h * 0.1 for h in harm2])


def generate_melody_note(freq, duration_sec):
    """生成旋律音符（三角波 + 泛音）"""
    tri = triangle_wave(freq, duration_sec)
    harm = sine_wave(freq * 2, duration_sec)
    return mix(tri, [h * 0.2 for h in harm])


def note_to_freq(note, octave=4):
    """音名转频率 (A4 = 440 Hz)"""
    notes = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4,
             "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    semitones = notes.get(note.upper(), 0) + (octave - 4) * 12
    return 440.0 * (2.0 ** (semitones / 12.0))


def play_note(note_name, duration_sec, wave_func=sine_wave):
    """生成单个音符"""
    freq = note_to_freq(note_name.split("_")[0],
                        int(note_name.split("_")[1]) if "_" in note_name else 4)
    return wave_func(freq, duration_sec)


def play_sequence(notes, duration_per_note, wave_func=sine_wave):
    """按序列生成旋律"""
    result = []
    for note_name in notes:
        if note_name == "REST":
            result.extend([0.0] * int(SAMPLE_RATE * duration_per_note))
        else:
            result.extend(play_note(note_name, duration_per_note, wave_func))
    return result


# ========================
#  SFX 音效生成
# ========================

def generate_shoot():
    """射击音效: 短促高频冲击"""
    t = 0.08
    samples = square_wave(800, t)
    # 渐弱
    env = [1.0 - i / len(samples) for i in range(len(samples))]
    return apply_envelope(samples, env)


def generate_hit():
    """命中音效: 中频击打 + 噪声"""
    impact = sine_wave(200, 0.06)
    noise_burst = noise(0.04)
    n = len(impact)
    noise_padded = noise_burst + [0.0] * (n - len(noise_burst))
    mixed = mix([s * 0.6 for s in impact], [s * 0.4 for s in noise_padded])
    env = [max(0, 1.0 - i / n) ** 2 for i in range(n)]
    return apply_envelope(mixed, env)


def generate_jump():
    """跳跃音效: 快速上升音阶"""
    t = 0.12
    total = int(SAMPLE_RATE * t)
    result = []
    for i in range(total):
        f = lerp(300, 900, i / total)
        result.append(math.sin(2.0 * math.pi * f * i / SAMPLE_RATE) * 0.5)
    env = [1.0 - (i / total) ** 0.5 for i in range(total)]
    return apply_envelope(result, env)


def generate_boss_charge():
    """Boss冲锋: 低沉轰鸣渐强"""
    t = 1.0
    low_rumble = sine_wave(60, t)
    mid_growl = sawtooth(45, t)
    mixed = mix(low_rumble, [s * 0.3 for s in mid_growl])
    env = [min(1.0, i / len(mixed) * 3) for i in range(len(mixed))]
    return apply_envelope(mixed, env)


def generate_boss_stomp():
    """Boss踏地: 沉重低频冲击 + 地震感"""
    t = 0.8
    # 初始冲击
    impact = sine_wave(30, 0.15)
    impact_env = [1.0 - i / len(impact) for i in range(len(impact))]
    impact = apply_envelope(impact, impact_env)
    # 低频余震
    n = int(SAMPLE_RATE * t)
    rumble = [math.sin(2.0 * math.pi * 25 * i / SAMPLE_RATE) * 0.3 for i in range(n)]
    slow_env = [max(0, 1.0 - i / n) ** 1.5 for i in range(n)]
    rumble = apply_envelope(rumble, slow_env)
    # 补零让冲击在前
    impact_padded = impact + [0.0] * (n - len(impact))
    return mix(impact_padded, rumble)


def generate_dialog_popup():
    """对话弹出音效: 清脆提示音"""
    t = 0.2
    n = int(SAMPLE_RATE * t)
    result = []
    for i in range(n):
        f = lerp(1200, 800, i / n)
        result.append(math.sin(2.0 * math.pi * f * i / SAMPLE_RATE) * 0.4 +
                      math.sin(2.0 * math.pi * f * 2 * i / SAMPLE_RATE) * 0.15)
    env = [max(0, 1.0 - i / n) ** 1.5 for i in range(n)]
    return apply_envelope(result, env)


def generate_capture():
    """擒获音效: 戏剧性下降音符 + 回响"""
    t = 1.5
    n = int(SAMPLE_RATE * t)
    result = []
    for i in range(n):
        f = lerp(500, 80, (i / n) ** 0.7)
        result.append(math.sin(2.0 * math.pi * f * i / SAMPLE_RATE) * 0.5)
    env = [max(0, 1.0 - i / n) ** 0.8 for i in range(n)]
    return apply_envelope(result, env)


def generate_victory_sfx():
    """胜利音效: 上行的凯旋号角"""
    notes = [("D", 5, 0.12), ("F#", 5, 0.12), ("A", 5, 0.12), ("D", 6, 0.3)]
    result = []
    for note, octave, dur in notes:
        freq = note_to_freq(note, octave)
        n = int(SAMPLE_RATE * dur)
        for i in range(n):
            result.append(math.sin(2.0 * math.pi * freq * i / SAMPLE_RATE) * 0.4 +
                          math.sin(2.0 * math.pi * freq * 3 * i / SAMPLE_RATE) * 0.1)
    env = []
    attack_pct = 0.05
    total = len(result)
    for i in range(total):
        if i < total * attack_pct:
            env.append(i / (total * attack_pct))
        else:
            env.append(max(0, 1.0 - (i - total * attack_pct) / (total * 0.95)))
    return apply_envelope(result, env)


# ========================
#  BGM 生成
# ========================

def generate_bgm_main_menu():
    """主菜单BGM: 史诗肃穆，慢节奏五声音阶"""
    pentatonic = ["D_3", "E_3", "G_3", "A_3", "D_4", "E_4", "G_4", "A_4"]
    melody = []
    bass = []
    dur = 0.6
    seq = ["D_4", "E_4", "G_4", "A_4", "G_4", "E_4", "D_4", "REST",
           "D_4", "A_3", "E_4", "D_4", "REST", "G_3", "E_4", "D_4"]
    melody = play_sequence(seq, dur, triangle_wave)

    # 低音线条
    bass_seq = ["D_3", "D_3", "G_3", "D_3", "E_3", "G_3", "D_3", "D_3"]
    bass_notes = play_sequence(bass_seq, dur * 2, sine_wave)
    bass_notes = [b * 0.5 for b in bass_notes]

    total_len = min(len(melody), len(bass_notes))
    melody = melody[:total_len]
    bass_notes = bass_notes[:total_len]
    loop = mix(melody, bass_notes)
    # 循环到 60 秒
    return repeat_loop(loop, 60.0)


def generate_bgm_level_01():
    """第1关战斗BGM: 紧张激昂，快速节奏"""
    dur = 0.3
    melody = play_sequence(
        ["E_4", "G_4", "A_4", "B_4", "A_4", "G_4", "E_4", "D_4",
         "E_4", "G_4", "A_4", "D_5", "A_4", "G_4", "E_4", "REST",
         "A_4", "B_4", "D_5", "E_5", "D_5", "B_4", "A_4", "G_4",
         "E_5", "D_5", "B_4", "A_4", "G_4", "E_4", "D_4", "E_4"],
        dur, square_wave
    )
    # 节奏打击
    n = len(melody)
    perc = [square_wave(180, dur * 0.05) for _ in range(int(n / (SAMPLE_RATE * dur)))]
    perc_flat = []
    for p in perc:
        perc_flat.extend(p)
        perc_flat.extend([0.0] * int(SAMPLE_RATE * dur * 0.95))
    perc_flat = perc_flat[:n]
    mixed = mix(melody, [p * 0.3 for p in perc_flat])
    return repeat_loop(mixed, 90.0)


def generate_bgm_level_01_boss():
    """Boss战BGM: 史诗对决，低沉压迫感"""
    dur = 0.4
    # 低音威胁线
    bass = play_sequence(
        ["D_2", "D_2", "E_2", "F_2", "D_2", "E_2", "F_2", "G_2",
         "D_2", "D_2", "E_2", "F_2", "D_2", "G_2", "D_2", "D_2"],
        dur, sawtooth
    )
    bass = [b * 0.4 for b in bass]
    # 高音旋律
    high = play_sequence(
        ["D_4", "REST", "E_4", "REST", "F_4", "G_4", "A_4", "REST",
         "D_5", "REST", "A_4", "G_4", "F_4", "E_4", "D_4", "REST"],
        dur, square_wave
    )
    high = [h * 0.3 for h in high]
    n = min(len(bass), len(high))
    mixed = mix(bass[:n], high[:n])
    return repeat_loop(mixed, 60.0)


def generate_bgm_cutscene_tense():
    """紧张过场BGM: 戏剧张力，持续弦乐"""
    dur = 0.5
    # 不和谐和弦持续音
    n_total = int(SAMPLE_RATE * 30)
    result = []
    for i in range(n_total):
        f1 = 130.81  # C3
        f2 = 164.81  # E3
        f3 = 196.00  # G3
        t = i / SAMPLE_RATE
        vibrato = math.sin(2.0 * math.pi * 5 * t) * 2
        val = (math.sin(2.0 * math.pi * (f1 + vibrato) * t) * 0.3 +
               math.sin(2.0 * math.pi * (f2 + vibrato) * t) * 0.2 +
               math.sin(2.0 * math.pi * (f3 + vibrato) * t) * 0.15)
        result.append(val * 0.5)
    return result


def generate_bgm_cutscene_calm():
    """平静过场BGM: 宁静反思，柔和五声音阶"""
    dur = 0.8
    melody = play_sequence(
        ["D_4", "G_4", "A_4", "D_5", "A_4", "G_4", "E_4", "D_4",
         "G_4", "A_4", "D_5", "E_5", "D_5", "A_4", "G_4", "D_4"],
        dur, triangle_wave
    )
    melody = [m * 0.4 for m in melody]
    # 柔和琶音
    arp = play_sequence(
        ["D_3", "D_4", "G_3", "G_4", "A_3", "A_4", "D_4", "D_5",
         "A_3", "A_4", "G_3", "G_4", "E_3", "E_4", "D_3", "D_4"],
        dur / 2, sine_wave
    )
    arp = [a * 0.2 for a in arp]
    n = min(len(melody), len(arp))
    mixed = mix(melody[:n], arp[:n])
    return repeat_loop(mixed, 45.0)


def generate_bgm_victory_fanfare():
    """胜利号角: 凯旋，单次播放"""
    notes = [
        ("D", 4, 0.2), ("F#", 4, 0.2), ("A", 4, 0.2), ("D", 5, 0.4),
        ("E", 5, 0.2), ("F#", 5, 0.2), ("G", 5, 0.2), ("A", 5, 0.6),
        ("REST", 0, 0.1),
        ("D", 5, 0.15), ("C#", 5, 0.15), ("D", 5, 0.15), ("E", 5, 0.3),
        ("D", 5, 1.0)
    ]
    result = []
    for note, octave, dur in notes:
        if note == "REST":
            result.extend([0.0] * int(SAMPLE_RATE * dur))
        else:
            freq = note_to_freq(note, octave)
            n = int(SAMPLE_RATE * dur)
            for i in range(n):
                val = (math.sin(2.0 * math.pi * freq * i / SAMPLE_RATE) * 0.35 +
                       math.sin(2.0 * math.pi * freq * 3 * i / SAMPLE_RATE) * 0.12 +
                       math.sin(2.0 * math.pi * freq * 5 * i / SAMPLE_RATE) * 0.05)
                result.append(val)
    # 包络
    total = len(result)
    env = []
    for i in range(total):
        if i < total * 0.1:
            env.append(i / (total * 0.1))
        elif i > total * 0.8:
            env.append(max(0, 1.0 - (i - total * 0.8) / (total * 0.2)))
        else:
            env.append(1.0)
    return apply_envelope(result, env)


# ========================
#  主执行
# ========================

AUDIO_CONFIGS = {
    # SFX
    "shoot": (generate_shoot, SFX_DIR, "shoot.wav"),
    "hit": (generate_hit, SFX_DIR, "hit.wav"),
    "jump": (generate_jump, SFX_DIR, "jump.wav"),
    "boss_charge": (generate_boss_charge, SFX_DIR, "boss_charge.wav"),
    "boss_stomp": (generate_boss_stomp, SFX_DIR, "boss_stomp.wav"),
    "dialog_popup": (generate_dialog_popup, SFX_DIR, "dialog_popup.wav"),
    "capture": (generate_capture, SFX_DIR, "capture.wav"),
    "victory": (generate_victory_sfx, SFX_DIR, "victory.wav"),
    # BGM
    "bgm_main_menu": (generate_bgm_main_menu, BGM_DIR, "bgm_main_menu.wav"),
    "bgm_level_01": (generate_bgm_level_01, BGM_DIR, "bgm_level_01.wav"),
    "bgm_level_01_boss": (generate_bgm_level_01_boss, BGM_DIR, "bgm_level_01_boss.wav"),
    "bgm_cutscene_tense": (generate_bgm_cutscene_tense, BGM_DIR, "bgm_cutscene_tense.wav"),
    "bgm_cutscene_calm": (generate_bgm_cutscene_calm, BGM_DIR, "bgm_cutscene_calm.wav"),
    "bgm_victory_fanfare": (generate_bgm_victory_fanfare, BGM_DIR, "bgm_victory_fanfare.wav"),
}


def main():
    make_dirs()
    total = len(AUDIO_CONFIGS)
    for idx, (name, (gen_func, out_dir, filename)) in enumerate(AUDIO_CONFIGS.items(), 1):
        path = os.path.join(out_dir, filename)
        print(f"[{idx}/{total}] 生成中: {filename} ...", end=" ", flush=True)
        try:
            samples = gen_func()
            write_wav(path, samples)
            dur = len(samples) / SAMPLE_RATE
            print(f"OK ({dur:.1f}s)")
        except Exception as e:
            print(f"失败: {e}")

    print(f"\n全部完成! 共生成 {total} 个音频文件")
    print(f"  SFX: {SFX_DIR}")
    print(f"  BGM: {BGM_DIR}")
    print("\n注意: 这些是数学合成的功能占位音频，可供开发测试使用。")
    print("正式版建议替换为专业制作的音效素材。")


if __name__ == "__main__":
    main()
