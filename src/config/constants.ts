// ============================================================
// constants.ts — 全局常量（游戏尺寸、物理参数等）
// 从 gameConfig.ts 中拆分出来，避免循环依赖
// ============================================================

/** 游戏画布尺寸 */
export const GAME_WIDTH  = 960;
export const GAME_HEIGHT = 540;

/** 物理世界常量 */
export const GRAVITY  = 980;
export const TILE_SIZE = 32;
