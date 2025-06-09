import React from 'react'
import type { ItemOnBoard } from '../types'

interface ItemPieceProps {
  itemData: ItemOnBoard
}

export const ItemPiece: React.FC<ItemPieceProps> = ({ itemData }) => {
  const pieceSize = 28 // 40 * 0.7
  const style: React.CSSProperties = {
    width: `${pieceSize}px`,
    height: `${pieceSize}px`,
  }

  let icon = '?'
  if (itemData.type === 'boots') icon = 'B'
  else if (itemData.type === 'cloak') icon = 'C'
  else if (itemData.type === 'snare_trap') icon = 'S'

  return (
    <div className="piece item-piece is-visible" style={style}>
      {icon}
    </div>
  )
}
