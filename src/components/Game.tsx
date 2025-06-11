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
  // const dangerToggleRef = useRef<HTMLInputElement>(null) // 制御されたコンポーネントにするため削除

  // --- イベントハンドラ ---

  const handleRestart = () => {
    if (mapSizeSelectorRef.current) {
      const radius = parseInt(mapSizeSelectorRef.current.value, 10)
      dispatch({ type: 'RESTART_GAME', payload: { radius } })
    }
  }

  const handleToggleDanger = () => {
    console.log('handleToggleDanger called. Current isDangerVisible:', gameState.isDangerVisible)
    dispatch({ type: 'TOGGLE_DANGER_VISIBILITY' })
  }

  // ---副作用フック (useEffect) ---

  useEffect(() => {
    // ゲームの現在の状態をUIに反映させる
    if (mapSizeSelectorRef.current) {
      mapSizeSelectorRef.current.value = String(gameState.gridRadius)
    }
  }, [gameState.gridRadius]) // gameState.isDangerVisible の依存を削除

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
    <div className="game-container inline-flex flex-col items-center gap-3 p-5 bg-white rounded-2xl shadow-main">
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

      <h1 className="w-full max-w-4xl text-center mb-2 text-2xl font-bold">Chase＆Hide</h1>

      <GameBoard gameState={gameState} dispatch={dispatch} />

      <div
        id="message-area"
        className="w-full max-w-4xl h-auto leading-tight text-base text-gray-600 font-medium text-center p-2 border border-gray-300 rounded bg-gray-200"
      >
        {/* TODO: メッセージもgameStateから受け取る */}
        あなたのターンです。
      </div>

      <Inventory gameState={gameState} dispatch={dispatch} />

      <div className="game-controls w-full max-w-4xl flex flex-wrap justify-center items-center gap-5">
        <button
          id="restart-button"
          className="bg-player text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer transition-all duration-200 shadow-md hover:bg-player-hover hover:-translate-y-0.5 disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
          onClick={handleRestart}
        >
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
        {/* Tailwind CSS を使用したトグルスイッチ */}
        <div className="flex items-center">
          {/* labelを全体のコンテナにする */}
          <label htmlFor="danger-toggle" className="relative inline-flex items-center cursor-pointer">
            {/* input（peer）をlabelの中に入れる */}
            <input
              type="checkbox"
              id="danger-toggle"
              checked={gameState.isDangerVisible}
              onChange={handleToggleDanger}
              className="sr-only peer"
            />
            {/* スタイルを適用したいdivもlabelの中に入れ、inputの兄弟にする */}
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            {/* ラベルテキストもlabelの中に入れる */}
            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">危険度表示</span>
          </label>
        </div>
      </div>
    </div>
  )
}
