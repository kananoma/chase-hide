import { gameState } from './state'
import { MOB_STATS } from './constants'
import { onHexClick, onHexMouseEnter, onHexMouseLeave, useBootsItem, useCloakItem, useSnareTrapItem } from './game'
import type { AxialCoord, HexData, ItemOnBoard, ItemType, Mob, Player, TrapOnBoard } from './types'
import { Axial } from './utils'

// --- DOM要素 ---
export const gameBoard = document.getElementById('game-board') as HTMLDivElement
export const messageEl = document.getElementById('message-area') as HTMLDivElement
export const restartButton = document.getElementById('restart-button') as HTMLButtonElement
export const inventoryArea = document.getElementById('inventory-area') as HTMLDivElement
export const gameContainerEl = document.querySelector('.game-container') as HTMLDivElement
export const mapSizeSelector = document.getElementById('map-size-selector') as HTMLSelectElement
export const dangerToggle = document.getElementById('danger-toggle') as HTMLInputElement

// --- UI更新関数 ---

/**
 * ゲーム盤の上にスコアとターンを表示するオーバーレイ要素を作成・追加する
 */
export function createBoardOverlay(): void {
  // 既に存在すれば何もしない（リセット時の重複作成を防ぐ）
  if (document.getElementById('board-overlay')) return

  const overlayContainer = document.createElement('div')
  overlayContainer.id = 'board-overlay'

  const scoreDisplay = document.createElement('div')
  scoreDisplay.className = 'board-info board-info-score'
  scoreDisplay.innerHTML = 'スコア: <span id="board-score">0</span>'

  const turnDisplay = document.createElement('div')
  turnDisplay.className = 'board-info board-info-turn'
  turnDisplay.innerHTML = 'ターン: <span id="board-turn">1</span>'

  overlayContainer.appendChild(scoreDisplay)
  overlayContainer.appendChild(turnDisplay)

  gameBoard.appendChild(overlayContainer)
}

export function drawBoard(): void {
  // 盤面をクリア
  gameBoard.innerHTML = ''

  // オーバーレイを（再）生成する
  createBoardOverlay()

  // ヘクスの基本サイズを取得
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const hexFullHeight = hexSize * Math.sqrt(3)

  // --- 盤面の大きさを計算 ---
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  const hexPositions: { hexData: HexData; centerX: number; centerY: number }[] = []

  gameState.grid.forEach((hexData) => {
    const centerX = hexSize * 1.5 * hexData.q
    const centerY = hexFullHeight * (hexData.r + hexData.q / 2)
    hexPositions.push({ hexData, centerX, centerY })

    minX = Math.min(minX, centerX - hexSize)
    maxX = Math.max(maxX, centerX + hexSize)
    minY = Math.min(minY, centerY - hexFullHeight / 2)
    maxY = Math.max(maxY, centerY + hexFullHeight / 2)
  })

  const boardContentWidth = maxX - minX
  const boardContentHeight = maxY - minY
  const boardPadding = hexSize * 2

  const boardWidth = boardContentWidth + boardPadding * 2
  const boardHeight = boardContentHeight + boardPadding * 2

  // 計算したサイズをゲーム盤のスタイルに適用
  gameBoard.style.width = `${boardWidth}px`
  gameBoard.style.height = `${boardHeight}px`

  // --- 各ヘクスを描画 ---
  hexPositions.forEach(({ hexData, centerX, centerY }) => {
    const hexEl = document.createElement('div')
    hexEl.className = 'hex'
    hexEl.style.left = `${centerX - minX + boardPadding - hexSize}px`
    hexEl.style.top = `${centerY - minY + boardPadding - hexFullHeight / 2}px`
    hexEl.dataset.q = hexData.q.toString()
    hexEl.dataset.r = hexData.r.toString()

    hexEl.addEventListener('click', () => onHexClick(hexData.q, hexData.r))
    hexEl.addEventListener('mouseenter', () => onHexMouseEnter(hexData))
    hexEl.addEventListener('mouseleave', () => onHexMouseLeave())

    hexData.el = hexEl
    gameBoard.appendChild(hexEl)
  })

  // --- 盤面上のピースを描画 ---
  createOrUpdatePiece(gameState.player, 'player')
  gameState.mobs.forEach((mob) => createOrUpdatePiece(mob, 'mob'))
  gameState.itemsOnBoard.forEach((item) => createOrUpdateItemPiece(item))
  gameState.trapsOnBoard.forEach((trap) => createOrUpdateTrapPiece(trap))
  updateHighlights()
}

function applyTransform(el: HTMLElement, pos: AxialCoord, size: number, isVisible: boolean): void {
  const hexKey = `${pos.q},${pos.r}`
  const hexOnBoard = gameState.grid.get(hexKey)
  if (!hexOnBoard || !hexOnBoard.el) {
    el.style.opacity = '0'
    el.style.transform = 'scale(0)'
    return
  }

  const hexEl = hexOnBoard.el
  const targetX = hexEl.offsetLeft + hexEl.offsetWidth / 2 - size / 2
  const targetY = hexEl.offsetTop + hexEl.offsetHeight / 2 - size / 2
  const scale = isVisible ? 1 : 0

  el.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`
}

export function createOrUpdatePiece(pieceData: Player | Mob, type: 'player' | 'mob'): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.8

  if (!pieceData.el) {
    const el = document.createElement('div')
    el.className = `piece ${type}`
    el.style.width = `${pieceSize}px`
    el.style.height = `${pieceSize}px`
    pieceData.el = el
    gameBoard.appendChild(el)

    applyTransform(el, pieceData.pos, pieceSize, false)

    requestAnimationFrame(() => {
      el.classList.add('is-visible')
      applyTransform(el, pieceData.pos, pieceSize, true)
    })
  } else {
    applyTransform(pieceData.el, pieceData.pos, pieceSize, true)
  }

  if (type === 'mob' && 'level' in pieceData) {
    const mob = pieceData as Mob
    const stats = MOB_STATS[mob.level]
    mob.el!.style.backgroundColor = stats.color

    let levelEl = mob.el!.querySelector('.mob-level') as HTMLSpanElement
    if (!levelEl) {
      levelEl = document.createElement('span')
      levelEl.className = 'mob-level'
      mob.el!.appendChild(levelEl)
    }
    levelEl.textContent = mob.level.toString()
    if (mob.stunnedTurns > 0) {
      mob.el!.style.opacity = '0.5'
    } else {
      mob.el!.style.opacity = ''
    }
  }
}

export function createOrUpdateItemPiece(itemData: ItemOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.7

  if (!itemData.el) {
    const el = document.createElement('div')
    el.className = 'piece item-piece'
    el.style.width = `${pieceSize}px`
    el.style.height = `${pieceSize}px`

    if (itemData.type === 'boots') el.textContent = 'B'
    else if (itemData.type === 'cloak') el.textContent = 'C'
    else if (itemData.type === 'snare_trap') el.textContent = 'S'

    itemData.el = el
    gameBoard.appendChild(el)

    applyTransform(el, itemData.pos, pieceSize, false)

    requestAnimationFrame(() => {
      el.classList.add('is-visible')
      applyTransform(el, itemData.pos, pieceSize, true)
    })
  }
}

export function createOrUpdateTrapPiece(trapData: TrapOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.7

  if (!trapData.el) {
    const el = document.createElement('div')
    el.className = 'piece trap-piece'
    el.style.width = `${pieceSize}px`
    el.style.height = `${pieceSize}px`
    el.textContent = 'S'

    trapData.el = el
    gameBoard.appendChild(el)

    applyTransform(el, trapData.pos, pieceSize, false)

    requestAnimationFrame(() => {
      el.classList.add('is-visible')
      applyTransform(el, trapData.pos, pieceSize, true)
    })
  }
}

export function updateMessage(
  text: string,
  type: 'info' | 'error' | 'success' | 'warning' | 'gameover' = 'info'
): void {
  messageEl.textContent = text
  messageEl.className = `message-area message-${type}`
}

export function updateInfo(): void {
  // オーバーレイ上の新しい要素のみを更新する
  const boardScoreEl = document.getElementById('board-score')
  const boardTurnEl = document.getElementById('board-turn')

  if (boardScoreEl) boardScoreEl.textContent = gameState.score.toString()
  if (boardTurnEl) boardTurnEl.textContent = gameState.turn.toString()
}

export function canPlaceTrapAt(hexPos: AxialCoord, _trapType: ItemType): boolean {
  if (Axial.distance(gameState.player.pos, hexPos) !== 1) return false
  const hexKey = `${hexPos.q},${hexPos.r}`
  if (!gameState.grid.has(hexKey)) return false
  if (gameState.mobs.some((m) => m.pos.q === hexPos.q && m.pos.r === hexPos.r)) return false
  if (gameState.itemsOnBoard.some((i) => i.pos.q === hexPos.q && i.pos.r === hexPos.r)) return false
  if (gameState.trapsOnBoard.some((t) => t.pos.q === hexPos.q && t.pos.r === hexPos.r)) return false
  return true
}

export function updateHighlights(): void {
  gameState.grid.forEach((hex) => {
    if (hex.el) {
      hex.el.classList.remove('highlight', 'placeable-trap-highlight')

      if (gameState.isPlacingTrap && canPlaceTrapAt(hex, gameState.isPlacingTrap)) {
        hex.el.classList.add('placeable-trap-highlight')
      } else if (gameState.isPlayerTurn && Axial.distance(gameState.player.pos, hex) === 1) {
        hex.el.classList.add('highlight')
      }
    }
  })
}

export function clearDetectionHighlights(): void {
  gameState.grid.forEach((hex) => {
    if (hex.el) {
      hex.el.classList.remove('detection-highlight')
    }
  })
  if (gameState.isPlayerTurn) updateHighlights()
}

export function updateInventoryUI(): void {
  inventoryArea.innerHTML = ''
  gameState.player.inventory.forEach((item) => {
    if (!item) return

    const itemContainer = document.createElement('div')
    itemContainer.className = 'inventory-item-container'
    itemContainer.style.display = 'flex'
    itemContainer.style.alignItems = 'center'
    itemContainer.style.gap = '8px'

    const itemInfoDiv = document.createElement('div')
    itemInfoDiv.className = 'inventory-item'

    const iconSpan = document.createElement('span')
    iconSpan.className = 'item-icon'
    iconSpan.textContent = item.icon || ''
    itemInfoDiv.appendChild(iconSpan)

    const textSpan = document.createElement('span')
    let itemText = `${item.name}: ${item.quantity}個`
    if (item.type === 'cloak' && gameState.player.cloakTurnsLeft > 0) {
      itemText += ` (効果中: 残り${gameState.player.cloakTurnsLeft}ターン)`
    }
    textSpan.textContent = itemText
    itemInfoDiv.appendChild(textSpan)

    itemContainer.appendChild(itemInfoDiv)

    if (item.type === 'boots' || item.type === 'cloak' || item.type === 'snare_trap') {
      const useButton = document.createElement('button')
      let isDisabled = false

      switch (item.type) {
        case 'boots':
          useButton.textContent = '使用'
          useButton.onclick = useBootsItem
          isDisabled =
            gameState.isGameOver ||
            !gameState.isPlayerTurn ||
            gameState.player.remainingMovesThisTurn > 1 ||
            item.quantity === 0 ||
            !!gameState.isPlacingTrap
          break
        case 'cloak':
          useButton.textContent = '使用'
          useButton.onclick = useCloakItem
          isDisabled =
            gameState.isGameOver ||
            !gameState.isPlayerTurn ||
            gameState.player.cloakTurnsLeft > 0 ||
            item.quantity === 0 ||
            !!gameState.isPlacingTrap
          break
        case 'snare_trap':
          useButton.textContent = gameState.isPlacingTrap === 'snare_trap' ? 'キャンセル' : '設置'
          useButton.onclick = useSnareTrapItem
          isDisabled =
            gameState.isGameOver ||
            !gameState.isPlayerTurn ||
            (item.quantity === 0 && gameState.isPlacingTrap !== 'snare_trap')
          break
      }
      useButton.disabled = isDisabled
      itemContainer.appendChild(useButton)
    }

    inventoryArea.appendChild(itemContainer)
  })
}
