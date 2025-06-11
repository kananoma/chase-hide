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

  // SVGのviewBoxとポリゴンポイントの基準寸法を定義します。
  // これは六角形の内部座標系の基本単位として機能します。
  // 実際の表示サイズは、親コンテナのCSS（通常var(--hex-size)を使用）と
  // SVGのstyle={{ width: '100%', height: '100%' }}によって決定されます。
  // この内部的な 'canonicalRadius' はCSSから動的に取得する必要はなく、
  // viewBoxの比率を定義するだけの値です。
  const canonicalRadius = 40 // 内部計算用の基準半径
  const svgWidth = canonicalRadius * 2
  const svgHeight = canonicalRadius * Math.sqrt(3)

  // 六角形の頂点座標を計算 (SVGのviewBox内)
  //   P1 -- P2
  //  /        \
  // P6          P3
  //  \        /
  //   P5 -- P4
  const points = [
    `${canonicalRadius * 0.5},0`, // P1
    `${canonicalRadius * 1.5},0`, // P2
    `${canonicalRadius * 2},${svgHeight / 2}`, // P3
    `${canonicalRadius * 1.5},${svgHeight}`, // P4
    `${canonicalRadius * 0.5},${svgHeight}`, // P5
    `0,${svgHeight / 2}`, // P6
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="hex"
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      <polygon
        points={points}
        className="hex-polygon" // スタイル (fill, stroke, stroke-width) はCSSで管理
      />
    </svg>
  )
}
