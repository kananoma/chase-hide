import type { GameState } from './types'

export let gameState: GameState

// gameStateを外部から設定するための関数
export function setGameState(newState: GameState): void {
  gameState = newState
}