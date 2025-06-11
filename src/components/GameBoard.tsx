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

  // Tailwind CSS を使用するために、クラス名とスタイルオブジェクトを返すように変更
  const getPieceProps = (pos: AxialCoord, pieceSize: number): { className: string; style: React.CSSProperties } => {
    const key = `${pos.q},${pos.r}`
    const hexPos = boardLayout.hexPositions.get(key)
    if (!hexPos) {
      return { className: 'hidden', style: {} } // 表示しない場合は 'hidden' クラスを返す
    }

    return {
      className: 'absolute transition-all duration-100 ease-in-out', // Tailwind CSS のクラス
      style: {
        // top と left は動的に計算されるため、style属性で指定
        top: `${hexPos.top + boardLayout.hexFullHeight / 2 - pieceSize / 2}px`,
        left: `${hexPos.left + boardLayout.hexFullWidth / 2 - pieceSize / 2}px`,
      },
    }
  }

  return (
    // boardLayout.boardStyle も Tailwind で表現可能なら置き換えることを検討
    <div id="game-board" className="relative bg-board-bg rounded-xl overflow-hidden" style={boardLayout.boardStyle}>
      {' '}
      {/* 親要素に relative が必要 */}
      <div id="board-overlay absolute inset-0 p-4 px-6 box-border pointer-events-none z-10">
        <div className="board-info board-info absolute top-4 left-6 ">
          スコア: <span>{gameState.score}</span>
        </div>
        <div className="board-info board-info absolute top-4 right-6">
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
      {(() => {
        const { className, style } = getPieceProps(gameState.player.pos, 32)
        return (
          <div className={className} style={style}>
            <PlayerPiece />
          </div>
        )
      })()}
      {gameState.mobs.map((mob) => {
        const { className, style } = getPieceProps(mob.pos, 32)
        return (
          <div key={mob.id} className={className} style={style}>
            <MobPiece mobData={mob} />
          </div>
        )
      })}
      {gameState.itemsOnBoard.map((item) => {
        const { className, style } = getPieceProps(item.pos, 28)
        return (
          <div key={item.id} className={className} style={style}>
            <ItemPiece itemData={item} />
          </div>
        )
      })}
      {gameState.trapsOnBoard.map((trap) => {
        const { className, style } = getPieceProps(trap.pos, 28)
        return (
          <div key={trap.id} className={className} style={style}>
            <TrapPiece />
          </div>
        )
      })}
    </div>
  )
}
