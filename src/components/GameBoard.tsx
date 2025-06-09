import React, { useMemo } from 'react'
import type { GameState, AxialCoord } from '../types'
import type { GameAction } from '../actions'
import { Hex } from './Hex'
import { PlayerPiece } from './PlayerPiece'
import { MobPiece } from './MobPiece'
import { TrapPiece } from './TrapPiece'
import { ItemPiece } from './ItemPiece' // ItemPieceも作成する必要があります

interface GameBoardProps {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, dispatch }) => {
  const boardLayout = useMemo(() => {
    console.log('Recalculating board layout...')

    // TODO: ヘクスサイズをCSS変数から動的に取得する
    const hexSize = 40
    const hexFullHeight = hexSize * Math.sqrt(3)
    const hexFullWidth = hexSize * 2

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    Array.from(gameState.grid.values()).forEach((hexData) => {
      const centerX = hexSize * 1.5 * hexData.q
      const centerY = hexFullHeight * (hexData.r + hexData.q / 2)
      minX = Math.min(minX, centerX - hexSize)
      maxX = Math.max(maxX, centerX + hexSize)
      minY = Math.min(minY, centerY - hexFullHeight / 2)
      maxY = Math.max(maxY, centerY + hexFullHeight / 2)
    })

    const boardContentWidth = maxX - minX
    const boardContentHeight = maxY - minY
    const boardPadding = hexSize * 2

    const hexPositions = new Map<string, { top: number; left: number }>()
    Array.from(gameState.grid.values()).forEach((hexData) => {
      const centerX = hexSize * 1.5 * hexData.q
      const centerY = hexFullHeight * (hexData.r + hexData.q / 2)
      const key = `${hexData.q},${hexData.r}`
      hexPositions.set(key, {
        top: centerY - minY + boardPadding - hexFullHeight / 2,
        left: centerX - minX + boardPadding - hexSize,
      })
    })

    return {
      boardStyle: {
        width: `${boardContentWidth + boardPadding * 2}px`,
        height: `${boardContentHeight + boardPadding * 2}px`,
      },
      hexPositions,
      hexFullWidth,
      hexFullHeight,
    }
  }, [gameState.gridRadius])

  const getPieceStyle = (pos: AxialCoord, pieceSize: number): React.CSSProperties => {
    const key = `${pos.q},${pos.r}`
    const hexPos = boardLayout.hexPositions.get(key)
    if (!hexPos) return { display: 'none' }

    return {
      position: 'absolute',
      top: `${hexPos.top + boardLayout.hexFullHeight / 2 - pieceSize / 2}px`,
      left: `${hexPos.left + boardLayout.hexFullWidth / 2 - pieceSize / 2}px`,
      transition: 'top 0.1s ease-in-out, left 0.1s ease-in-out',
    }
  }

  return (
    <div id="game-board" style={boardLayout.boardStyle}>
      <div id="board-overlay">
        <div className="board-info board-info-score">
          スコア: <span>{gameState.score}</span>
        </div>
        <div className="board-info board-info-turn">
          ターン: <span>{gameState.turn}</span>
        </div>
      </div>

      {Array.from(gameState.grid.values()).map((hexData) => {
        const key = `${hexData.q},${hexData.r}`
        const position = boardLayout.hexPositions.get(key)
        return (
          <div key={key} style={{ position: 'absolute', top: `${position?.top}px`, left: `${position?.left}px` }}>
            <Hex hexData={hexData} dispatch={dispatch} gameState={gameState} />
          </div>
        )
      })}

      {/* --- ピースの描画 --- */}
      <div style={getPieceStyle(gameState.player.pos, 32)}>
        <PlayerPiece />
      </div>
      {gameState.mobs.map((mob) => (
        <div key={mob.id} style={getPieceStyle(mob.pos, 32)}>
          <MobPiece mobData={mob} />
        </div>
      ))}
      {/* ★★★ ここからが追加箇所 ★★★ */}
      {gameState.itemsOnBoard.map((item) => (
        <div key={item.id} style={getPieceStyle(item.pos, 28)}>
          <ItemPiece itemData={item} />
        </div>
      ))}
      {gameState.trapsOnBoard.map((trap) => (
        <div key={trap.id} style={getPieceStyle(trap.pos, 28)}>
          <TrapPiece />
        </div>
      ))}
      {/* ★★★ ここまでが追加箇所 ★★★ */}
    </div>
  )
}
