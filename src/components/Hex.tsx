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

  // CSS変数 --hex-size の値 (例: 40) に基づいて計算
  // GameBoard.tsx の hexSize と合わせる必要があります。
  // 本来は props で渡すか、CSS変数から動的に取得するのが望ましいです。
  const hexSize = 40 // この値は var(--hex-size) と一致させる
  const svgWidth = hexSize * 2
  const svgHeight = hexSize * Math.sqrt(3)

  // 六角形の頂点座標を計算 (SVGのviewBox内)
  //   P1 -- P2
  //  /        \
  // P6          P3
  //  \        /
  //   P5 -- P4
  const points = [
    `${hexSize * 0.5},0`, // P1
    `${hexSize * 1.5},0`, // P2
    `${hexSize * 2},${svgHeight / 2}`, // P3
    `${hexSize * 1.5},${svgHeight}`, // P4
    `${hexSize * 0.5},${svgHeight}`, // P5
    `0,${svgHeight / 2}`, // P6
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="hex"
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      <polygon points={points} fill="var(--hex-bg-color, white)" stroke="gray" strokeWidth="1" />
    </svg>
  )
}
