// src/components/PlayerPiece.tsx
import React from 'react'
// Player型は使わないのでインポートも不要

// ★★★ Propsを受け取らないように修正 ★★★
// interface PlayerPieceProps {
//   playerData: Player;
// }

export const PlayerPiece: React.FC = () => {
  const pieceSize = 32 // 40 * 0.8
  const style = { width: `${pieceSize}px`, height: `${pieceSize}px` }
  return <div className="piece player is-visible" style={style}></div>
}
