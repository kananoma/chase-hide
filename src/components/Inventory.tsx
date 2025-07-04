// src/components/Inventory.tsx
import React from 'react'
import type { GameState, ItemType } from '../types'
import type { GameAction } from '../actions'

interface InventoryProps {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

export const Inventory: React.FC<InventoryProps> = ({ gameState, dispatch }) => {
  const handleUseItem = (type: ItemType) => {
    dispatch({ type: 'USE_ITEM', payload: { type } })
  }

  return (
    <div
      id="inventory-area"
      className="w-full max-w-4xl flex flex-wrap justify-center gap-[15px] p-2.5 bg-gray-100 rounded-lg"
    >
      {gameState.player.inventory.map((item) => {
        // ★★★ ボタンを無効化する条件を計算 ★★★
        let isDisabled = gameState.isGameOver || !gameState.isPlayerTurn || item.quantity <= 0
        if (item.type === 'boots') {
          if (gameState.player.remainingMovesThisTurn > 1) isDisabled = true
        }
        if (item.type === 'cloak') {
          if (gameState.player.cloakTurnsLeft > 0) isDisabled = true
        }

        return (
          <div
            key={item.type}
            className="inventory-item-container"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div className="inventory-item inventory-item font-medium flex items-center">
              <span className="item-icon">{item.icon}</span>
              <span>
                {item.name}: {item.quantity}個
              </span>
              {item.type === 'cloak' && gameState.player.cloakTurnsLeft > 0 && (
                <span> (効果中: 残り{gameState.player.cloakTurnsLeft}ターン)</span>
              )}
            </div>
            <button
              className="bg-player text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer transition-all duration-200 shadow-md hover:bg-player-hover hover:-translate-y-0.5 disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
              onClick={() => handleUseItem(item.type)}
              disabled={isDisabled}
            >
              {item.type === 'snare_trap' ? '設置' : '使用'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
