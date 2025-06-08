import { gameState } from './state'
import { MOB_STATS } from './constants'
import { onHexClick, onHexMouseEnter, onHexMouseLeave, useBootsItem, useCloakItem, useSnareTrapItem } from './game'
import type { AxialCoord, HexData, ItemOnBoard, ItemType, Mob, Player, TrapOnBoard } from './types'
import { Axial } from './utils'

// --- DOM要素 ---
export const gameBoard = document.getElementById('game-board') as HTMLDivElement
export const scoreEl = document.getElementById('score') as HTMLSpanElement
export const turnEl = document.getElementById('turn') as HTMLSpanElement
export const messageEl = document.getElementById('message-area') as HTMLDivElement
export const restartButton = document.getElementById('restart-button') as HTMLButtonElement
export const inventoryArea = document.getElementById('inventory-area') as HTMLDivElement
export const gameContainerEl = document.querySelector('.game-container') as HTMLDivElement
export const mapSizeSelector = document.getElementById('map-size-selector') as HTMLSelectElement

// --- UI更新関数 ---

function applyTransform(el: HTMLElement, pos: AxialCoord, size: number, isVisible: boolean): void {
  const hexKey = `${pos.q},${pos.r}`;
  const hexOnBoard = gameState.grid.get(hexKey);
  if (!hexOnBoard || !hexOnBoard.el) {
    // もし対応するヘクスがなければ非表示にする
    el.style.opacity = '0';
    el.style.transform = 'scale(0)';
    return;
  }
  
  const hexEl = hexOnBoard.el;
  const targetX = hexEl.offsetLeft + hexEl.offsetWidth / 2 - size / 2;
  const targetY = hexEl.offsetTop + hexEl.offsetHeight / 2 - size / 2;
  const scale = isVisible ? 1 : 0;
  
  el.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;
}

export function updateMessage(text: string, type: 'info' | 'error' | 'success' | 'warning' | 'gameover' = 'info'): void {
  messageEl.textContent = text
  messageEl.className = `message-area message-${type}`
}

export function updateInfo(): void {
  scoreEl.textContent = gameState.score.toString()
  turnEl.textContent = gameState.turn.toString()
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


export function createOrUpdatePiece(pieceData: Player | Mob, type: 'player' | 'mob'): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'));
  const pieceSize = hexSize * 0.8;

  if (!pieceData.el) {
    // --- 新規作成 ---
    const el = document.createElement('div');
    el.className = `piece ${type}`;
    el.style.width = `${pieceSize}px`;
    el.style.height = `${pieceSize}px`;
    pieceData.el = el;
    gameBoard.appendChild(el);

    // 見えない状態で正しい位置に配置
    applyTransform(el, pieceData.pos, pieceSize, false);

    // 次のフレームで表示状態にする
    requestAnimationFrame(() => {
      el.classList.add('is-visible');
      applyTransform(el, pieceData.pos, pieceSize, true);
    });
  } else {
    // --- 更新 ---
    applyTransform(pieceData.el, pieceData.pos, pieceSize, true);
  }
  
  if (type === 'mob' && 'level' in pieceData) {
    const mob = pieceData as Mob;
    const stats = MOB_STATS[mob.level];
    mob.el!.style.backgroundColor = stats.color;

    let levelEl = mob.el!.querySelector('.mob-level') as HTMLSpanElement;
    if (!levelEl) {
      levelEl = document.createElement('span');
      levelEl.className = 'mob-level';
      mob.el!.appendChild(levelEl);
    }
    levelEl.textContent = mob.level.toString();
    // スタン状態は transform とは別に opacity を直接上書き
    if(mob.stunnedTurns > 0) {
        mob.el!.style.opacity = '0.5';
    } else {
        mob.el!.style.opacity = '1';
    }
  }
}
  
export function createOrUpdateItemPiece(itemData: ItemOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'));
  const pieceSize = hexSize * 0.7;

  if (!itemData.el) {
    const el = document.createElement('div');
    el.className = 'piece item-piece';
    el.style.width = `${pieceSize}px`;
    el.style.height = `${pieceSize}px`;

    if (itemData.type === 'boots') el.textContent = 'B';
    else if (itemData.type === 'cloak') el.textContent = 'C';
    else if (itemData.type === 'snare_trap') el.textContent = 'S';
    
    itemData.el = el;
    gameBoard.appendChild(el);

    applyTransform(el, itemData.pos, pieceSize, false);

    requestAnimationFrame(() => {
      el.classList.add('is-visible');
      applyTransform(el, itemData.pos, pieceSize, true);
    });
  }
}
  
export function createOrUpdateTrapPiece(trapData: TrapOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'));
  const pieceSize = hexSize * 0.7;

  if (!trapData.el) {
    const el = document.createElement('div');
    el.className = 'piece trap-piece';
    el.style.width = `${pieceSize}px`;
    el.style.height = `${pieceSize}px`;
    el.textContent = 'S';

    trapData.el = el;
    gameBoard.appendChild(el);

    applyTransform(el, trapData.pos, pieceSize, false);

    requestAnimationFrame(() => {
      el.classList.add('is-visible');
      applyTransform(el, trapData.pos, pieceSize, true);
    });
  }
}

export function drawBoard(): void {
    gameBoard.innerHTML = ''
    const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
    const hexFullHeight = hexSize * Math.sqrt(3)
  
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
    const boardPadding = hexSize * 4
  
    const boardWidth = boardContentWidth + boardPadding * 2
    const boardHeight = boardContentHeight + boardPadding * 2
  
    gameBoard.style.width = `${boardWidth}px`
    gameBoard.style.height = `${boardHeight}px`
  
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
  
    const gameInfoHeight = (document.querySelector('.game-info') as HTMLElement).offsetHeight
    const messageAreaHeight = messageEl.offsetHeight
    const inventoryAreaHeight = inventoryArea.offsetHeight
    const restartButtonHeight = restartButton.offsetHeight
    const containerGap = parseFloat(getComputedStyle(gameContainerEl).gap) || 10
    const containerPaddingVertical =
      parseFloat(getComputedStyle(gameContainerEl).paddingTop) +
      parseFloat(getComputedStyle(gameContainerEl).paddingBottom)
  
    gameContainerEl.style.height = `${
      boardHeight +
      gameInfoHeight +
      messageAreaHeight +
      inventoryAreaHeight +
      restartButtonHeight +
      containerGap * 4 +
      containerPaddingVertical
    }px`
  
    createOrUpdatePiece(gameState.player, 'player')
    gameState.mobs.forEach((mob) => createOrUpdatePiece(mob, 'mob'))
    gameState.itemsOnBoard.forEach((item) => createOrUpdateItemPiece(item))
    gameState.trapsOnBoard.forEach((trap) => createOrUpdateTrapPiece(trap))
    updateHighlights()
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