// src/components/Hex.tsx
import React from 'react'
import type { GameState, HexData } from '../types'
import type { GameAction } from '../actions'

interface HexProps {
  hexData: HexData
  dispatch: React.Dispatch<GameAction>
  gameState: GameState
}

export const Hex: React.FC<HexProps> = ({ hexData, dispatch, gameState }) => {
  const handleClick = () => {
    if (gameState.isPlacingTrap) {
      // 設置モード中の場合
      dispatch({ type: 'PLACE_TRAP', payload: { pos: { q: hexData.q, r: hexData.r } } })
    } else {
      // 通常移動の場合
      dispatch({ type: 'MOVE_PLAYER', payload: { pos: { q: hexData.q, r: hexData.r } } })
    }
  }

  return <div className="hex" onClick={handleClick}></div>
}
