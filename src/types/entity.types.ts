// ============================================================
// entity.types.ts — 实体相关类型（Player / Enemy / Boss）
// ============================================================

// ============ 基础类型 ============
export interface Vec2 {
  x: number;
  y: number;
}

// ============ 玩家状态机 ============
export enum PlayerState {
  IDLE = 'idle',
  RUN = 'run',
  JUMP = 'jump',
  FALL = 'fall',
  SHOOT = 'shoot',
  HURT = 'hurt',
  DEATH = 'death',
  CUTSCENE_LOCK = 'cutscene_lock',
}

export interface PlayerConfig {
  speed: number;
  jumpForce: number;
  maxHp: number;
  invincibleMs: number;
}

// ============ 武器类型 ============
export enum WeaponType {
  CROSSBOW = 'crossbow',
  REPEATING_CROSSBOW = 'repeating_crossbow',
  FIRE_ARROW = 'fire_arrow',
  POISON_DART = 'poison_dart',
}

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  fireRate: number;        // 射击间隔 ms
  bulletSpeed: number;
  damage: number;
  bulletCount: number;     // 每次射出弹丸数
  spreadAngle: number;     // 散布角度（度）
}

// ============ 敌人类型 ============
export enum EnemyType {
  SOLDIER = 'soldier',           // 普通蛮兵
  AXE_THROWER = 'axe_thrower',   // 投斧兵
  SHIELD_BEARER = 'shield_bearer', // 盾兵
}

export enum EnemyState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  HURT = 'hurt',
  DEATH = 'death',
}

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  patrolRange: number;
  detectRange: number;
}

// ============ Boss 状态 ============
export enum BossState {
  IDLE = 'idle',
  CHARGING = 'charging',
  STOMP = 'stomp',
  SWIPE = 'swipe',
  HURT = 'hurt',
  DEFEATED = 'defeated',
  PHASE_TRANSITION = 'phase_transition',
}

export enum BossPhase {
  PHASE_1 = 1,
  PHASE_2 = 2,
  PHASE_3 = 3,
}

export interface BossConfig {
  id: string;
  name: string;
  maxHp: number;
  phases: BossPhase[];
  speed: number;
  scoreValue: number;   // 击败后获得的积分
}

// ============ 子弹 ============
export interface BulletConfig {
  speed: number;
  damage: number;
  lifetimeMs: number;
  sprite: string;
}
