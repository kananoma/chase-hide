export const ITEM_SPAWN_CHANCE = 0.1
/**
 * アイテムの出現密度。
 * このマス数あたりに1個のアイテムが存在することを目標に上限が計算される。
 */
export const HEXES_PER_ITEM = 30;
/**
 * 初期配置される敵の密度。
 * このマス数あたりに1体の敵が初期配置される。
 */
export const HEXES_PER_INITIAL_MOB = 25;
/**
 * 盤面上の敵の最大許容量の密度。
 * このマス数あたりに1体の敵が存在することを最大数としてスポーン率が調整される。
 */
export const HEXES_PER_MAX_MOB = 10;
export const CLOAK_DURATION = 3
export const CLOAK_EVASION_CHANCE = 0.7
// トラップの持続ターン数。-1 は永続を意味する
export const SNARE_TRAP_DURATION = -1
export const SNARE_TRAP_STUN_TURNS = 2
export const MOB_SPAWN_CHANCE_PER_TURN = 1.0
/** スポーン確率の最低保証値 (例: 0.05 = 5%) */
export const MIN_SPAWN_CHANCE = 0.05;
/** スポーン確率の最大値 (例: 0.95 = 95%) */
export const MAX_SPAWN_CHANCE = 0.95;


export const MOB_STATS: { [key: number]: { detectionRange: number; color: string; score: number } } = {
  1: { detectionRange: 2, color: '#f1c40f', score: 5 },
  2: { detectionRange: 3, color: '#e67e22', score: 10 },
  3: { detectionRange: 4, color: '#e74c3c', score: 20 },
  4: { detectionRange: 5, color: '#c0392b', score: 40 },
  5: { detectionRange: 6, color: '#922b21', score: 75 },
}

export const MOB_LEVEL_SPAWN_PARAMS: { [key: number]: { baseAttractiveness: number; scoreMultiplier: number } } = {
  1: { baseAttractiveness: 200, scoreMultiplier: -0.2 },
  2: { baseAttractiveness: 80, scoreMultiplier: -0.1 },
  3: { baseAttractiveness: 30, scoreMultiplier: 0.1 },
  4: { baseAttractiveness: 10, scoreMultiplier: 0.2 },
  5: { baseAttractiveness: 2, scoreMultiplier: 0.1 },
}