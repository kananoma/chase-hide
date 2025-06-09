// src/components/TrapPiece.tsx
import React from 'react'

export const TrapPiece: React.FC = () => {
  const pieceSize = 28
  const style = { width: `${pieceSize}px`, height: `${pieceSize}px` }
  return (
    <div className="piece trap-piece is-visible" style={style}>
      S
    </div>
  )
}
