import { gameState } from './state'
import { MOB_STATS } from './constants'
import { Axial } from './utils'

// 計算された危険度マップを保持する変数
let lastDangerMap: Map<string, number> = new Map()

/**
 * 盤面全体の危険度を計算し、ヒートマップとして可視化するメイン関数
 */
export function calculateAndVisualizeDanger(): void {
  // 1. 危険度マップを初期化
  const dangerMap: Map<string, number> = new Map()
  gameState.grid.forEach((_, key) => {
    dangerMap.set(key, 0)
  })

  // 2. 全モンスターからの危険度を加算
  for (const mob of gameState.mobs) {
    const stats = MOB_STATS[mob.level]
    const detectionRange = stats.detectionRange
    const dangerFactor = mob.level * 5 // レベルに応じた危険係数

    // 索敵範囲内のマスに危険度を加算
    for (let q = -detectionRange; q <= detectionRange; q++) {
      for (let r = -detectionRange; r <= detectionRange; r++) {
        if (Math.abs(q + r) > detectionRange) continue

        const targetHexPos = Axial.add(mob.pos, { q, r })
        const targetKey = `${targetHexPos.q},${targetHexPos.r}`

        if (dangerMap.has(targetKey)) {
          const distance = Axial.distance(mob.pos, targetHexPos)
          // 近いほどスコアが高くなるように計算
          const scoreToAdd = (detectionRange - distance + 1) * dangerFactor

          dangerMap.set(targetKey, (dangerMap.get(targetKey) || 0) + scoreToAdd)
        }
      }
    }
  }

  // 計算結果を保存
  lastDangerMap = dangerMap

  // 3. 危険度を盤面に可視化
  if (gameState.isDangerVisible) {
    visualizeDangerMap()
  }

  // 4. プレイヤーの位置の危険度をコンソールに出力
  logPlayerDanger()
}

/**
 * 危険度マップに基づいて盤面のヘクスの色を更新する
 */
function visualizeDangerMap(): void {
  if (!gameState.isDangerVisible) {
    clearDangerVisualization()
    return
  }
  let maxScore = 0
  lastDangerMap.forEach((score) => {
    if (score > maxScore) {
      maxScore = score
    }
  })
  // 最大スコアが0だとゼロ除算になるので、最低でも1とする
  const normalizationFactor = Math.max(1, maxScore)

  lastDangerMap.forEach((score, key) => {
    const hexData = gameState.grid.get(key)
    if (hexData?.el) {
      if (score > 0) {
        // スコアを正規化(0-1の範囲に)して透明度(alpha)として使用
        const alpha = Math.min(1, score / normalizationFactor)
        hexData.el.style.backgroundColor = `rgba(255, 69, 0, ${alpha * 0.7})` // 赤オレンジ色で表示
      } else {
        // 危険度0のマスは色をリセット
        hexData.el.style.backgroundColor = ''
      }
    }
  })
}

/**
 * プレイヤーの現在地の危険度スコアをコンソールに出力する
 */
function logPlayerDanger(): void {
  const playerKey = `${gameState.player.pos.q},${gameState.player.pos.r}`
  const playerScore = lastDangerMap.get(playerKey) || 0
  console.log(`Player's Position Danger Score: ${playerScore.toFixed(0)}`)
}

/**
 * 盤面のヒートマップ表示をクリアする
 */
export function clearDangerVisualization(): void {
  gameState.grid.forEach((hexData) => {
    if (hexData.el) {
      hexData.el.style.backgroundColor = ''
    }
  })
}
