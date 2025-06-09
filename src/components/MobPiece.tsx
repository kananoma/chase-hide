// src/components/MobPiece.tsx
import React, { useEffect, useState } from 'react'
import type { Mob } from '../types'
import { MOB_STATS } from '../constants'

interface MobPieceProps {
  mobData: Mob
}

export const MobPiece: React.FC<MobPieceProps> = ({ mobData }) => {
  const [isMounted, setIsMounted] = useState(false)
  const pieceSize = 32

  useEffect(() => {
    // コンポーネントがマウントされた後に isMounted を true に設定してアニメーションを開始
    setIsMounted(true)
  }, []) // 空の依存配列でマウント時にのみ実行

  const style: React.CSSProperties = {
    width: `${pieceSize}px`,
    height: `${pieceSize}px`,
    backgroundColor: MOB_STATS[mobData.level].color,
    // マウント状態と気絶状態に基づいて opacity を設定
    opacity: isMounted ? (mobData.stunnedTurns > 0 ? 0.5 : 1) : 0,
    // マウント状態に基づいて transform を設定
    transform: isMounted ? 'scale(1)' : 'scale(0.5)',
    // opacity と transform の変化にトランジションを適用
    transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
  }
  return (
    <div className="piece mob is-visible" style={style}>
      <span className="mob-level">{mobData.level}</span>
    </div>
  )
}
