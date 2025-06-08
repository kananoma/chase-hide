import { spawnNewMob } from './game'
import { setGameState } from './state'
// initializeContainerObserver をインポートリストから削除
import { drawBoard, mapSizeSelector, restartButton, updateInfo, updateInventoryUI, updateMessage } from './ui'
import type { GameState, HexData } from './types'
import { HEXES_PER_ITEM, HEXES_PER_INITIAL_MOB, HEXES_PER_MAX_MOB } from './constants'

function initGame(selectedRadius: number): void {
  // --- ステップ1: 先にすべての動的パラメータを計算する ---
  const totalHexes = 3 * selectedRadius * (selectedRadius + 1) + 1
  const initialMobs = Math.max(2, Math.round(totalHexes / HEXES_PER_INITIAL_MOB))
  const maxMobCapacity = Math.max(5, Math.round(totalHexes / HEXES_PER_MAX_MOB))
  const maxItemsOnBoard = Math.max(1, Math.round(totalHexes / HEXES_PER_ITEM))
  const radiusRatio = Math.max(0.5, selectedRadius / 5)
  const minSpawnDistance = Math.max(3, Math.floor(3 * radiusRatio))
  const minSpawnDistanceFromOtherMobs = Math.max(1, Math.floor(2 * radiusRatio))
  const minItemSpawnDistanceFromPlayer = Math.max(1, Math.floor(2 * radiusRatio))

  // 新しいGameStateオブジェクトを作成
  const initialState: GameState = {
    gridRadius: selectedRadius,
    grid: new Map<string, HexData>(),
    totalHexes: totalHexes,
    player: {
      pos: { q: 0, r: 0 },
      el: null,
      inventory: [
        { type: 'boots', quantity: 0, name: 'ダッシュブーツ', icon: 'B' },
        { type: 'cloak', quantity: 0, name: '隠れ蓑', icon: 'C' },
        { type: 'snare_trap', quantity: 0, name: 'スネアトラップ', icon: 'S' },
      ],
      remainingMovesThisTurn: 1,
      cloakTurnsLeft: 0,
    },
    mobs: [],
    itemsOnBoard: [],
    trapsOnBoard: [],
    score: 0,
    turn: 1,
    isPlayerTurn: true,
    isGameOver: false,
    nextMobId: 0,
    nextItemId: 0,
    nextTrapId: 0,
    isPlacingTrap: null,
    initialMobs: initialMobs, // 計算済みの値を使用
    minSpawnDistance: minSpawnDistance, // 計算済みの値を使用
    minSpawnDistanceFromOtherMobs: minSpawnDistanceFromOtherMobs, // 計算済みの値を使用
    maxItemsOnBoard: maxItemsOnBoard, // 計算済みの値を使用
    minItemSpawnDistanceFromPlayer: minItemSpawnDistanceFromPlayer, // 計算済みの値を使用
    maxMobCapacity: maxMobCapacity, // 計算済みの値を使用
  }

  // グローバルなgameStateを更新
  setGameState(initialState)

  // const totalHexes = 3 * selectedRadius * (selectedRadius + 1) + 1;
  initialState.totalHexes = totalHexes

  initialState.initialMobs = Math.max(2, Math.round(totalHexes / HEXES_PER_INITIAL_MOB))
  initialState.maxMobCapacity = Math.max(5, Math.round(totalHexes / HEXES_PER_MAX_MOB))
  initialState.maxItemsOnBoard = Math.max(1, Math.round(totalHexes / HEXES_PER_ITEM))

  // const radiusRatio = Math.max(0.5, selectedRadius / 5);
  initialState.minSpawnDistance = Math.max(3, Math.floor(3 * radiusRatio))
  initialState.minSpawnDistanceFromOtherMobs = Math.max(1, Math.floor(2 * radiusRatio))
  initialState.minItemSpawnDistanceFromPlayer = Math.max(1, Math.floor(2 * radiusRatio))

  // デバッグ情報出力
  console.log('--- Game Initialized: Debug Info ---')
  console.log(`マップ半径: ${selectedRadius}`)
  console.log(`総マス数: ${totalHexes}`)
  console.log('---')
  console.log(`初期敵数: ${initialState.initialMobs}体`)
  console.log(`敵の最大許容量: ${initialState.maxMobCapacity}体`)
  console.log(`初期敵の密度: 1体あたり約 ${(totalHexes / initialState.initialMobs).toFixed(1)} マス`)
  console.log(`最大敵の密度: 1体あたり約 ${(totalHexes / initialState.maxMobCapacity).toFixed(1)} マス`)
  console.log('------------------------------------')

  // ヘクスサイズの調整
  let newHexSize = 40
  if (selectedRadius >= 9) {
    newHexSize = 25
  } else if (selectedRadius >= 8) {
    newHexSize = 30
  } else if (selectedRadius >= 7) {
    newHexSize = 32
  } else if (selectedRadius >= 6) {
    newHexSize = 35
  }
  newHexSize = Math.max(15, newHexSize)
  document.documentElement.style.setProperty('--hex-size', `${newHexSize}px`)

  // グリッド初期化
  for (let q = -initialState.gridRadius; q <= initialState.gridRadius; q++) {
    for (let r = -initialState.gridRadius; r <= initialState.gridRadius; r++) {
      if (Math.abs(q + r) > initialState.gridRadius) continue
      initialState.grid.set(`${q},${r}`, { q, r, el: null })
    }
  }

  // 初期モンスター生成
  for (let i = 0; i < initialState.initialMobs; i++) {
    spawnNewMob(true)
  }

  // 描画処理
  function drawBoardWhenReady() {
    const currentHexSizeStyle = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
    if (Math.abs(currentHexSizeStyle - newHexSize) < 0.1) {
      drawBoard()
      updateInfo()
      updateInventoryUI()
      updateMessage('あなたのターンです。移動したいマスを選択してください。')
    } else {
      requestAnimationFrame(drawBoardWhenReady)
    }
  }
  requestAnimationFrame(drawBoardWhenReady)
}

// --- イベントリスナーと初期化 ---

restartButton.addEventListener('click', () => {
  const selectedRadius = parseInt(mapSizeSelector.value, 10)
  requestAnimationFrame(() => initGame(selectedRadius))
})

// initializeContainerObserver() の呼び出しを削除

// 初期ゲーム開始
requestAnimationFrame(() => initGame(parseInt(mapSizeSelector.value, 10)))
