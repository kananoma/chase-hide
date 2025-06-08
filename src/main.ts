import { spawnNewMob } from './game'
import { setGameState } from './state'
import { drawBoard, mapSizeSelector, restartButton, updateInfo, updateInventoryUI, updateMessage } from './ui'
import type { GameState, HexData } from './types'
import { HEXES_PER_ITEM, HEXES_PER_INITIAL_MOB, HEXES_PER_MAX_MOB } from './constants'

function initGame(selectedRadius: number): void {
  // 新しいGameStateオブジェクトを作成
  const initialState: GameState = {
    gridRadius: selectedRadius,
    grid: new Map<string, HexData>(),
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
    initialMobs: 0,
    minSpawnDistance: 0,
    minSpawnDistanceFromOtherMobs: 0,
    maxItemsOnBoard: 0,
    minItemSpawnDistanceFromPlayer: 0,
  }

  // グローバルなgameStateを更新
  setGameState(initialState)

  const baseRadiusForBalance = 5
  const radiusRatio = Math.max(0.5, selectedRadius / baseRadiusForBalance)

  initialState.minSpawnDistance = Math.max(3, Math.floor(3 * radiusRatio))
  initialState.minSpawnDistanceFromOtherMobs = Math.max(1, Math.floor(2 * radiusRatio))
  const totalHexes = 3 * selectedRadius * (selectedRadius + 1) + 1
  initialState.maxItemsOnBoard = Math.max(1, Math.round(totalHexes / HEXES_PER_ITEM))
  initialState.minItemSpawnDistanceFromPlayer = Math.max(1, Math.floor(2 * radiusRatio))
  initialState.initialMobs = Math.max(2, Math.round(totalHexes / HEXES_PER_INITIAL_MOB))
  initialState.maxMobCapacity = Math.max(5, Math.round(totalHexes / HEXES_PER_MAX_MOB))

  let newHexSize = 40
  if (selectedRadius >= 7) newHexSize = 30
  else if (selectedRadius >= 6) newHexSize = 35
  newHexSize = Math.max(15, newHexSize)
  document.documentElement.style.setProperty('--hex-size', `${newHexSize}px`)

  for (let q = -initialState.gridRadius; q <= initialState.gridRadius; q++) {
    for (let r = -initialState.gridRadius; r <= initialState.gridRadius; r++) {
      if (Math.abs(q + r) > initialState.gridRadius) continue
      initialState.grid.set(`${q},${r}`, { q, r, el: null })
    }
  }

  for (let i = 0; i < initialState.initialMobs; i++) {
    spawnNewMob(true)
  }

  function drawBoardWhenReady() {
    const currentHexSizeStyle = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
    if (Math.abs(currentHexSizeStyle - newHexSize) < 0.1) {
      drawBoard()
      if (initialState.player.el) {
        initialState.player.el.classList.add('is-visible')
      }
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

// 初期ゲーム開始
requestAnimationFrame(() => initGame(parseInt(mapSizeSelector.value, 10)))
