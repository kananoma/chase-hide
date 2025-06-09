import React, { useEffect, useRef } from 'react'
import type { GameState } from '../types'
import type { GameAction } from '../actions'
import { GameBoard } from './GameBoard'
import { Inventory } from './Inventory'

// Gameコンポーネントが受け取るPropsの型を定義
interface GameProps {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

// Gameコンポーネント本体
export const Game: React.FC<GameProps> = ({ gameState, dispatch }) => {
  // DOM要素を直接参照するためのuseRefフック
  const mapSizeSelectorRef = useRef<HTMLSelectElement>(null)
  const dangerToggleRef = useRef<HTMLInputElement>(null)

  // --- イベントハンドラ ---

  const handleRestart = () => {
    if (mapSizeSelectorRef.current) {
      const radius = parseInt(mapSizeSelectorRef.current.value, 10)
      dispatch({ type: 'RESTART_GAME', payload: { radius } })
    }
  }

  const handleToggleDanger = () => {
    dispatch({ type: 'TOGGLE_DANGER_VISIBILITY' })
  }

  // ---副作用フック (useEffect) ---

  useEffect(() => {
    // ゲームの現在の状態をUIに反映させる
    if (mapSizeSelectorRef.current) {
      mapSizeSelectorRef.current.value = String(gameState.gridRadius)
    }
    if (dangerToggleRef.current) {
      dangerToggleRef.current.checked = gameState.isDangerVisible
    }
  }, [gameState.gridRadius, gameState.isDangerVisible])

  useEffect(() => {
    if (gameState.isGameOver || gameState.isPlayerTurn) {
      return
    }

    const timer = setTimeout(() => {
      dispatch({ type: 'NEXT_TURN' })
    }, 500)

    return () => clearTimeout(timer)
  }, [gameState.isPlayerTurn, gameState.turn, dispatch, gameState.isGameOver])

  // --- レンダリング ---

  return (
    <div className="game-container">
      {/* ★★★ ここからが修正箇所 ★★★ */}
      {/* isGameOverがtrueの時だけ、ゲームオーバーメッセージを表示する */}
      {gameState.isGameOver && (
        <div className="game-over-message">
          ゲームオーバー！
          <br />
          最終スコア: {gameState.score}
        </div>
      )}
      {/* ★★★ ここまでが修正箇所 ★★★ */}

      <h1>Chase＆Hide</h1>

      <GameBoard gameState={gameState} dispatch={dispatch} />

      <div id="message-area" className="message-area">
        {/* TODO: メッセージもgameStateから受け取る */}
        あなたのターンです。
      </div>

      <Inventory gameState={gameState} dispatch={dispatch} />

      <div className="game-controls">
        <button id="restart-button" onClick={handleRestart}>
          ゲームをリセット
        </button>
        <div>
          <label htmlFor="map-size-selector">マップサイズ (半径): </label>
          <select id="map-size-selector" ref={mapSizeSelectorRef} defaultValue="5">
            <option value="3">極小 (3)</option>
            <option value="4">小 (4)</option>
            <option value="5">中 (5)</option>
            <option value="6">大 (6)</option>
            <option value="7">特大 (7)</option>
            <option value="8">巨大 (8)</option>
            <option value="9">超巨大 (9)</option>
          </select>
        </div>
        <div className="toggle-switch">
          <input type="checkbox" id="danger-toggle" ref={dangerToggleRef} onChange={handleToggleDanger} />
          <label htmlFor="danger-toggle" className="toggle-label"></label>
          <span>危険度表示</span>
        </div>
      </div>
    </div>
  )
}
