// ============================================================
// data.types.ts — 数据配置相关类型（JSON 驱动的关卡/Boss/碎片）
// ============================================================

// ============ 关卡配置 ============
export interface LevelConfig {
  id: string;
  name: string;
  captureIndex: number;
  theme: string;
  mengHuoMindset: string;
  colorTheme: [string, string];
  music: string;
  map: string;
  boss: string;
  newMechanics: string[];
  dialogSequence: string[];
  storyFragment: string;
  playerWeaponUnlock: string | null;
  parTimeSec: number;
}

// ============ 关卡记录 ============
export interface LevelRecord {
  levelId: string;
  completed: boolean;
  timeSec: number;
  score: number;
  deaths: number;
  fragmentsCollected: string[];
  playStyle: string;
}

// ============ Boss 行为模板 ============
export interface BossPattern {
  id: string;
  attacks: BossAttack[];
  phaseTransitions: BossPhaseTransition[];
}

export interface BossAttack {
  name: string;
  type: 'charge' | 'stomp' | 'swipe' | 'projectile' | 'summon';
  cooldownMs: number;
  warningMs: number;           // 前摇预警时间
  damage: number;
  telegraph?: string;          // 预警特效 key
}

export interface BossPhaseTransition {
  hpPercent: number;
  newAttacks: string[];        // 解锁新招式
  speedMultiplier: number;
  dialogueId: string;          // 阶段台词 ID
}

// ============ 故事碎片 ============
export interface StoryFragment {
  id: string;
  levelId: string;
  title: string;
  text: string;
  unlockHint: string;
}

// ============ AI 策略建议 ============
export interface StrategyAdvice {
  playStyle: string;
  text: string;
}

// ============ 资源清单 ============
export interface AssetManifest {
  version: string;
  sprites: AssetEntry[];
  tilesets: AssetEntry[];
  ui: AssetEntry[];
  audio: AssetEntry[];
  cutscenes: AssetEntry[];
}

export interface AssetEntry {
  key: string;
  path: string;
  type: 'image' | 'spritesheet' | 'audio' | 'json';
  fallback?: string;          // 灰盒占位（Rectangle fallback）
  frameWidth?: number;        // spritesheet 专用
  frameHeight?: number;
}
