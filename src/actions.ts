// src/actions.ts
import type { AxialCoord, ItemType } from './types'

// ゲームで発生しうるすべてのアクションを定義
export type GameAction =
  | { type: 'RESTART_GAME'; payload: { radius: number } }
  | { type: 'PLACE_TRAP'; payload: { pos: AxialCoord } }
  | { type: 'MOVE_PLAYER'; payload: { pos: AxialCoord } }
  | { type: 'USE_ITEM'; payload: { type: ItemType } }
  | { type: 'TOGGLE_DANGER_VISIBILITY' }
  | { type: 'NEXT_TURN' } // モンスターのターンを進めるためのアクション
