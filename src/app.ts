// --- 型定義 ---

interface AxialCoord {
  q: number
  r: number
}

interface HexData extends AxialCoord {
  el: HTMLDivElement | null
}

const ITEM_TYPES = ['boots', 'cloak', 'snare_trap'] as const
type ItemType = (typeof ITEM_TYPES)[number]

interface ItemOnBoard {
  id: string
  pos: AxialCoord
  el: HTMLDivElement | null
  type: ItemType
}

interface TrapOnBoard {
  id: string
  pos: AxialCoord
  type: 'snare_trap'
  el: HTMLDivElement | null
  turnsLeft: number
  triggered: boolean
}

interface InventoryItem {
  type: ItemType
  quantity: number
  name: string
  icon: string
}

interface Player {
  pos: AxialCoord
  el: HTMLDivElement | null
  inventory: InventoryItem[]
  remainingMovesThisTurn: number
  cloakTurnsLeft: number
}

interface Mob {
  id: string
  pos: AxialCoord
  el: HTMLDivElement | null
  level: number
  stunnedTurns: number
}

interface GameState {
  gridRadius: number
  grid: Map<string, HexData>
  player: Player
  mobs: Mob[]
  itemsOnBoard: ItemOnBoard[]
  trapsOnBoard: TrapOnBoard[]
  score: number
  turn: number
  isPlayerTurn: boolean
  isGameOver: boolean
  nextMobId: number
  nextItemId: number
  nextTrapId: number
  isPlacingTrap: ItemType | null
  initialMobs: number
  minSpawnDistance: number
  minSpawnDistanceFromOtherMobs: number
  maxItemsOnBoard: number
  minItemSpawnDistanceFromPlayer: number
  maxMobCapacity?: number
}

// --- ゲーム設定 ---
const ITEM_SPAWN_CHANCE = 0.1
const CLOAK_DURATION = 3
const CLOAK_EVASION_CHANCE = 0.7
const SNARE_TRAP_DURATION = 5
const SNARE_TRAP_STUN_TURNS = 2
const MOB_SPAWN_CHANCE_PER_TURN = 1.0

const MOB_STATS: { [key: number]: { detectionRange: number; color: string; score: number } } = {
  1: { detectionRange: 2, color: '#f1c40f', score: 5 },
  2: { detectionRange: 3, color: '#e67e22', score: 10 },
  3: { detectionRange: 4, color: '#e74c3c', score: 20 },
  4: { detectionRange: 5, color: '#c0392b', score: 40 },
  5: { detectionRange: 6, color: '#922b21', score: 75 },
}

const MOB_LEVEL_SPAWN_PARAMS: { [key: number]: { baseAttractiveness: number; scoreMultiplier: number } } = {
  1: { baseAttractiveness: 200, scoreMultiplier: -0.2 },
  2: { baseAttractiveness: 80, scoreMultiplier: -0.1 },
  3: { baseAttractiveness: 30, scoreMultiplier: 0.1 },
  4: { baseAttractiveness: 10, scoreMultiplier: 0.2 },
  5: { baseAttractiveness: 2, scoreMultiplier: 0.1 },
}

// --- DOM要素 ---
const gameBoard = document.getElementById('game-board') as HTMLDivElement
const scoreEl = document.getElementById('score') as HTMLSpanElement
const turnEl = document.getElementById('turn') as HTMLSpanElement
const messageEl = document.getElementById('message-area') as HTMLDivElement
const restartButton = document.getElementById('restart-button') as HTMLButtonElement
const inventoryArea = document.getElementById('inventory-area') as HTMLDivElement
const gameContainerEl = document.querySelector('.game-container') as HTMLDivElement
const mapSizeSelector = document.getElementById('map-size-selector') as HTMLSelectElement

let gameState: GameState

const Axial = {
  add: (a: AxialCoord, b: AxialCoord): AxialCoord => ({ q: a.q + b.q, r: a.r + b.r }),
  subtract: (a: AxialCoord, b: AxialCoord): AxialCoord => ({ q: a.q - b.q, r: a.r - b.r }),
  distance: (a: AxialCoord, b: AxialCoord): number => {
    const vec = Axial.subtract(a, b)
    return (Math.abs(vec.q) + Math.abs(vec.q + vec.r) + Math.abs(vec.r)) / 2
  },
  neighbors: (hex: AxialCoord): AxialCoord[] => [
    { q: hex.q + 1, r: hex.r },
    { q: hex.q - 1, r: hex.r },
    { q: hex.q, r: hex.r + 1 },
    { q: hex.q, r: hex.r - 1 },
    { q: hex.q + 1, r: hex.r - 1 },
    { q: hex.q - 1, r: hex.r + 1 },
  ],
}

function initGame(selectedRadius: number): void {
  gameState = {
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
    // バランス調整用のプロパティ
    initialMobs: 0,
    minSpawnDistance: 0,
    minSpawnDistanceFromOtherMobs: 0,
    maxItemsOnBoard: 0,
    minItemSpawnDistanceFromPlayer: 0,
  }

  const baseRadiusForBalance = 5
  const radiusRatio = Math.max(0.5, selectedRadius / baseRadiusForBalance)

  gameState.initialMobs = Math.max(2, Math.floor(4 * radiusRatio))
  gameState.minSpawnDistance = Math.max(3, Math.floor(3 * radiusRatio))
  gameState.minSpawnDistanceFromOtherMobs = Math.max(1, Math.floor(2 * radiusRatio))
  gameState.maxItemsOnBoard = Math.max(1, Math.floor(3 * radiusRatio))
  gameState.minItemSpawnDistanceFromPlayer = Math.max(1, Math.floor(2 * radiusRatio))
  gameState.maxMobCapacity = Math.max(5, Math.floor(gameState.gridRadius * 2))

  let newHexSize = 40
  if (selectedRadius >= 7) newHexSize = 30
  else if (selectedRadius >= 6) newHexSize = 35
  newHexSize = Math.max(15, newHexSize)
  document.documentElement.style.setProperty('--hex-size', `${newHexSize}px`)

  for (let q = -gameState.gridRadius; q <= gameState.gridRadius; q++) {
    for (let r = -gameState.gridRadius; r <= gameState.gridRadius; r++) {
      if (Math.abs(q + r) > gameState.gridRadius) continue
      gameState.grid.set(`${q},${r}`, { q, r, el: null })
    }
  }

  for (let i = 0; i < gameState.initialMobs; i++) {
    spawnNewMob(true)
  }

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

function drawBoard(): void {
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

function createOrUpdatePiece(pieceData: Player | Mob, type: 'player' | 'mob'): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.8

  if (!pieceData.el) {
    pieceData.el = document.createElement('div')
    pieceData.el.className = `piece ${type}`
    pieceData.el.style.width = `${pieceSize}px`
    pieceData.el.style.height = `${pieceSize}px`
    gameBoard.appendChild(pieceData.el)
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
    mob.el!.style.opacity = mob.stunnedTurns > 0 ? '0.5' : '1'
  }

  const hexKey = `${pieceData.pos.q},${pieceData.pos.r}`
  const hexOnBoard = gameState.grid.get(hexKey)
  if (!hexOnBoard || !hexOnBoard.el) return

  const hexEl = hexOnBoard.el
  const targetX = hexEl.offsetLeft + hexEl.offsetWidth / 2 - pieceSize / 2
  const targetY = hexEl.offsetTop + hexEl.offsetHeight / 2 - pieceSize / 2
  pieceData.el!.style.transform = `translate(${targetX}px, ${targetY}px)`
}

function createOrUpdateItemPiece(itemData: ItemOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.7

  if (!itemData.el) {
    itemData.el = document.createElement('div')
    itemData.el.className = 'piece item-piece'
    itemData.el.style.width = `${pieceSize}px`
    itemData.el.style.height = `${pieceSize}px`
    if (itemData.type === 'boots') itemData.el.textContent = 'B'
    else if (itemData.type === 'cloak') itemData.el.textContent = 'C'
    else if (itemData.type === 'snare_trap') itemData.el.textContent = 'S'
    gameBoard.appendChild(itemData.el)
  }

  const hexKey = `${itemData.pos.q},${itemData.pos.r}`
  const hexOnBoard = gameState.grid.get(hexKey)
  if (!hexOnBoard || !hexOnBoard.el) return

  const hexEl = hexOnBoard.el
  const targetX = hexEl.offsetLeft + hexEl.offsetWidth / 2 - pieceSize / 2
  const targetY = hexEl.offsetTop + hexEl.offsetHeight / 2 - pieceSize / 2
  itemData.el.style.transform = `translate(${targetX}px, ${targetY}px)`
}

function createOrUpdateTrapPiece(trapData: TrapOnBoard): void {
  const hexSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hex-size'))
  const pieceSize = hexSize * 0.7

  if (!trapData.el) {
    trapData.el = document.createElement('div')
    trapData.el.className = 'piece trap-piece'
    trapData.el.style.width = `${pieceSize}px`
    trapData.el.style.height = `${pieceSize}px`
    trapData.el.textContent = 'S'
    gameBoard.appendChild(trapData.el)
  }
  const hexKey = `${trapData.pos.q},${trapData.pos.r}`
  const hexOnBoard = gameState.grid.get(hexKey)
  if (!hexOnBoard || !hexOnBoard.el) return

  const hexEl = hexOnBoard.el
  const targetX = hexEl.offsetLeft + hexEl.offsetWidth / 2 - pieceSize / 2
  const targetY = hexEl.offsetTop + hexEl.offsetHeight / 2 - pieceSize / 2
  trapData.el.style.transform = `translate(${targetX}px, ${targetY}px)`
}

function onHexClick(q: number, r: number): void {
  if (!gameState.isPlayerTurn) return
  const targetHex: AxialCoord = { q, r }

  if (gameState.isPlacingTrap) {
    const trapType = gameState.isPlacingTrap
    if (trapType === 'snare_trap' && canPlaceTrapAt(targetHex, trapType)) {
      placeTrap(targetHex, trapType)
    } else {
      updateMessage('ここにはトラップを設置できません。', 'error')
    }
  } else if (Axial.distance(gameState.player.pos, targetHex) === 1) {
    movePlayer(targetHex)
  } else {
    updateMessage('隣接するマスにのみ移動できます。', 'error')
  }
}

function updateMessage(text: string, type: 'info' | 'error' | 'success' | 'warning' | 'gameover' = 'info'): void {
  messageEl.textContent = text
  messageEl.className = `message-area message-${type}`
}

function updateHighlights(): void {
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

function canPlaceTrapAt(hexPos: AxialCoord, _trapType: ItemType): boolean {
  if (Axial.distance(gameState.player.pos, hexPos) !== 1) return false
  const hexKey = `${hexPos.q},${hexPos.r}`
  if (!gameState.grid.has(hexKey)) return false
  if (gameState.mobs.some((m) => m.pos.q === hexPos.q && m.pos.r === hexPos.r)) return false
  if (gameState.itemsOnBoard.some((i) => i.pos.q === hexPos.q && i.pos.r === hexPos.r)) return false
  if (gameState.trapsOnBoard.some((t) => t.pos.q === hexPos.q && t.pos.r === hexPos.r)) return false
  return true
}

function onHexMouseEnter(hexData: HexData): void {
  if (gameState.isGameOver || !gameState.isPlayerTurn) return
  const mobOnThisHex = gameState.mobs.find((mob) => mob.pos.q === hexData.q && mob.pos.r === hexData.r)
  if (mobOnThisHex) {
    const stats = MOB_STATS[mobOnThisHex.level]
    const detectionRange = stats.detectionRange
    gameState.grid.forEach((hex) => {
      if (
        hex.el &&
        Axial.distance(mobOnThisHex.pos, hex) <= detectionRange &&
        Axial.distance(mobOnThisHex.pos, hex) > 0
      ) {
        hex.el.classList.add('detection-highlight')
      }
    })
  }
}

function onHexMouseLeave(): void {
  if (gameState.isGameOver) return
  clearDetectionHighlights()
}

function clearDetectionHighlights(): void {
  gameState.grid.forEach((hex) => {
    if (hex.el) {
      hex.el.classList.remove('detection-highlight')
    }
  })
  if (gameState.isPlayerTurn) updateHighlights()
}

function startPlacingTrap(trapType: ItemType): void {
  if (!gameState.isPlayerTurn || gameState.isPlacingTrap) return
  const trapItem = gameState.player.inventory.find((item) => item.type === trapType)
  if (trapItem && trapItem.quantity > 0) {
    gameState.isPlacingTrap = trapType
    updateMessage(`${trapItem.name}を設置する場所を選んでください。`, 'info')
    updateHighlights()
    updateInventoryUI()
  }
}

function placeTrap(targetPos: AxialCoord, trapType: 'snare_trap'): void {
  const trapItem = gameState.player.inventory.find((item) => item.type === trapType)
  if (!trapItem || trapItem.quantity <= 0) return

  trapItem.quantity--
  const newTrap: TrapOnBoard = {
    id: `trap-${gameState.nextTrapId++}`,
    pos: { ...targetPos },
    type: trapType,
    el: null,
    turnsLeft: SNARE_TRAP_DURATION,
    triggered: false,
  }
  gameState.trapsOnBoard.push(newTrap)
  createOrUpdateTrapPiece(newTrap)

  gameState.isPlacingTrap = null
  gameState.player.remainingMovesThisTurn = 0
  updateMessage(`${trapItem.name}を設置しました。モンスターのターン...`, 'info')
  endPlayerTurn()
}

function movePlayer(targetPos: AxialCoord): void {
  gameState.player.pos = targetPos
  createOrUpdatePiece(gameState.player, 'player')

  const itemIndex = gameState.itemsOnBoard.findIndex((item) => item.pos.q === targetPos.q && item.pos.r === targetPos.r)
  if (itemIndex !== -1) pickUpItem(itemIndex)

  const mobIndex = gameState.mobs.findIndex((mob) => mob.pos.q === targetPos.q && mob.pos.r === targetPos.r)
  if (mobIndex !== -1) captureMob(mobIndex)

  gameState.player.remainingMovesThisTurn--

  if (gameState.isGameOver) return

  if (gameState.player.remainingMovesThisTurn > 0) {
    updateMessage('続けて移動できます。')
    updateHighlights()
  } else {
    if (gameState.player.cloakTurnsLeft > 0) {
      gameState.player.cloakTurnsLeft--
    }
    updateInventoryUI()
    endPlayerTurn()
  }
}

function endPlayerTurn(): void {
  gameState.isPlayerTurn = false
  updateMessage('モンスターのターン...')
  updateHighlights()
  clearDetectionHighlights()
  setTimeout(mobsTurn, 500)
}

function pickUpItem(itemIndex: number): void {
  const pickedUpItemData = gameState.itemsOnBoard.splice(itemIndex, 1)[0]
  if (pickedUpItemData?.el?.parentNode === gameBoard) {
    gameBoard.removeChild(pickedUpItemData.el)
  }
  if (!pickedUpItemData) return

  const inventorySlot = gameState.player.inventory.find((slot) => slot.type === pickedUpItemData.type)
  if (inventorySlot) {
    inventorySlot.quantity++
    updateMessage(`${inventorySlot.name}を取得！`, 'success')
  } else {
    updateMessage(`不明なアイテム (${pickedUpItemData.type}) を取得！`, 'warning')
  }
  updateInventoryUI()
}

function captureMob(mobIndex: number): void {
  const capturedMob = gameState.mobs.splice(mobIndex, 1)[0]

  if (!capturedMob) {
    return
  }

  const mobElement = capturedMob.el

  if (mobElement) {
    mobElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
    mobElement.style.transform += ' scale(0)'
    mobElement.style.opacity = '0'

    setTimeout(() => {
      if (mobElement.parentNode === gameBoard) {
        gameBoard.removeChild(mobElement)
      }
    }, 300)
  }

  const mobScore = MOB_STATS[capturedMob.level].score
  gameState.score += mobScore
  updateMessage(`LV${capturedMob.level}モンスターを捕獲！ (+${mobScore}スコア)`, 'success')
  updateInfo()
}

function getWeightedRandomLevel(currentScore: number): number {
  const weights: { level: number; weight: number }[] = []
  let totalWeight = 0

  for (const levelStr in MOB_LEVEL_SPAWN_PARAMS) {
    const level = parseInt(levelStr)
    const params = MOB_LEVEL_SPAWN_PARAMS[level]
    const calculatedAttractiveness = params.baseAttractiveness + currentScore * params.scoreMultiplier
    const weight = Math.max(1, calculatedAttractiveness)
    weights.push({ level, weight })
    totalWeight += weight
  }

  let randomValue = Math.random() * totalWeight
  for (const item of weights) {
    if (randomValue < item.weight) return item.level
    randomValue -= item.weight
  }
  return weights[weights.length - 1].level
}

function spawnNewMob(isInitial: boolean = false): void {
  const occupiedKeys = new Set<string>([`${gameState.player.pos.q},${gameState.player.pos.r}`])
  gameState.mobs.forEach((m) => occupiedKeys.add(`${m.pos.q},${m.pos.r}`))
  gameState.itemsOnBoard.forEach((i) => occupiedKeys.add(`${i.pos.q},${i.pos.r}`))
  gameState.trapsOnBoard.forEach((t) => occupiedKeys.add(`${t.pos.q},${t.pos.r}`))

  let allEmptyHexes = Array.from(gameState.grid.keys()).filter((k) => !occupiedKeys.has(k))
  let candidateLocations = allEmptyHexes.filter((key) => {
    const [q, r] = key.split(',').map(Number)
    return Axial.distance(gameState.player.pos, { q, r }) >= gameState.minSpawnDistance
  })

  if (candidateLocations.length > 0) {
    const furtherFiltered = candidateLocations.filter((key) => {
      const [q, r] = key.split(',').map(Number)
      const newMobPos = { q, r }
      return gameState.mobs.every(
        (existingMob) => Axial.distance(existingMob.pos, newMobPos) >= gameState.minSpawnDistanceFromOtherMobs
      )
    })
    if (furtherFiltered.length > 0) candidateLocations = furtherFiltered
  } else if (allEmptyHexes.length > 0) {
    candidateLocations = allEmptyHexes
  }

  if (candidateLocations.length === 0) return

  const mobLevel = isInitial ? 1 : getWeightedRandomLevel(gameState.score)
  const mobKey = candidateLocations[Math.floor(Math.random() * candidateLocations.length)]
  const [q, r] = mobKey.split(',').map(Number)
  const newMob: Mob = {
    id: `mob-${gameState.nextMobId++}`,
    pos: { q, r },
    el: null,
    level: mobLevel,
    stunnedTurns: 0,
  }
  gameState.mobs.push(newMob)
  if (!isInitial) createOrUpdatePiece(newMob, 'mob')
}

function spawnItem(): void {
  if (Math.random() >= ITEM_SPAWN_CHANCE || gameState.itemsOnBoard.length >= gameState.maxItemsOnBoard) return

  const occupiedKeys = new Set<string>([`${gameState.player.pos.q},${gameState.player.pos.r}`])
  gameState.mobs.forEach((m) => occupiedKeys.add(`${m.pos.q},${m.pos.r}`))
  gameState.itemsOnBoard.forEach((i) => occupiedKeys.add(`${i.pos.q},${i.pos.r}`))
  gameState.trapsOnBoard.forEach((t) => occupiedKeys.add(`${t.pos.q},${t.pos.r}`))

  let allEmptyHexes = Array.from(gameState.grid.keys()).filter((k) => !occupiedKeys.has(k))
  let candidateLocations = allEmptyHexes.filter((key) => {
    const [q, r] = key.split(',').map(Number)
    return Axial.distance(gameState.player.pos, { q, r }) >= gameState.minItemSpawnDistanceFromPlayer
  })

  if (candidateLocations.length === 0 && allEmptyHexes.length > 0) candidateLocations = allEmptyHexes
  if (candidateLocations.length === 0) return

  const itemKey = candidateLocations[Math.floor(Math.random() * candidateLocations.length)]
  const [q, r] = itemKey.split(',').map(Number)
  const newItem: ItemOnBoard = {
    id: `item-${gameState.nextItemId++}`,
    pos: { q, r },
    el: null,
    type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
  }
  gameState.itemsOnBoard.push(newItem)
  createOrUpdateItemPiece(newItem)
}

function useBootsItem(): void {
  if (
    gameState.isGameOver ||
    !gameState.isPlayerTurn ||
    gameState.player.remainingMovesThisTurn > 1 ||
    gameState.isPlacingTrap
  )
    return
  const boots = gameState.player.inventory.find((item) => item.type === 'boots')
  if (boots && boots.quantity > 0) {
    boots.quantity--
    gameState.player.remainingMovesThisTurn = 2
    updateMessage(`${boots.name}を使用！2回移動できます。`, 'info')
    updateInventoryUI()
  }
}

function useCloakItem(): void {
  if (gameState.isGameOver || !gameState.isPlayerTurn || gameState.player.cloakTurnsLeft > 0 || gameState.isPlacingTrap)
    return
  const cloak = gameState.player.inventory.find((item) => item.type === 'cloak')
  if (cloak && cloak.quantity > 0) {
    cloak.quantity--
    gameState.player.cloakTurnsLeft = CLOAK_DURATION
    updateMessage(`${cloak.name}を使用！${CLOAK_DURATION}ターンの間、見つかりにくくなります。`, 'info')
    updateInventoryUI()
  }
}

function useSnareTrapItem(): void {
  if (gameState.isGameOver || !gameState.isPlayerTurn) return
  if (gameState.isPlacingTrap) {
    gameState.isPlacingTrap = null
    updateMessage('トラップ設置をキャンセルしました。', 'info')
    updateHighlights()
    updateInventoryUI()
  } else {
    startPlacingTrap('snare_trap')
  }
}

function mobsTurn(): void {
  if (gameState.isGameOver) return
  let isGameOver = false
  let mobMessages: string[] = []

  gameState.mobs.forEach((mob) => {
    if (mob.stunnedTurns > 0) {
      mob.stunnedTurns--
      if (mob.stunnedTurns === 0) mobMessages.push(`LV${mob.level}モンスターがスタンから回復した！`)
      else mobMessages.push(`LV${mob.level}モンスターは動けない (残り${mob.stunnedTurns}ターン)`)
      createOrUpdatePiece(mob, 'mob')
      return
    }

    let canDetectPlayer = gameState.player.cloakTurnsLeft === 0 || Math.random() > CLOAK_EVASION_CHANCE
    const distanceToPlayer = Axial.distance(mob.pos, gameState.player.pos)

    let bestMove = mob.pos
    if (canDetectPlayer && distanceToPlayer <= MOB_STATS[mob.level].detectionRange) {
      let minDistance = distanceToPlayer
      let bestMoves = [mob.pos]
      const neighbors = Axial.neighbors(mob.pos)
      for (const neighbor of neighbors) {
        if (
          gameState.grid.has(`${neighbor.q},${neighbor.r}`) &&
          !gameState.mobs.some((m) => m.pos.q === neighbor.q && m.pos.r === neighbor.r && m.id !== mob.id)
        ) {
          const d = Axial.distance(neighbor, gameState.player.pos)
          if (d < minDistance) {
            minDistance = d
            bestMoves = [neighbor]
          } else if (d === minDistance && d < distanceToPlayer) {
            bestMoves.push(neighbor)
          }
        }
      }
      if (bestMoves.length > 0 && bestMoves[0] !== mob.pos) {
        bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)]
      }
    } else {
      const neighbors = Axial.neighbors(mob.pos).filter(
        (n) =>
          gameState.grid.has(`${n.q},${n.r}`) &&
          !gameState.mobs.some((m) => m.pos.q === n.q && m.pos.r === n.r && m.id !== mob.id)
      )
      if (neighbors.length > 0) {
        bestMove = neighbors[Math.floor(Math.random() * neighbors.length)]
      }
    }

    const previousPos = { ...mob.pos }
    mob.pos = bestMove

    const trapIndexOnCurrentHex = gameState.trapsOnBoard.findIndex(
      (trap) => trap.pos.q === mob.pos.q && trap.pos.r === mob.pos.r && !trap.triggered && trap.type === 'snare_trap'
    )

    if (trapIndexOnCurrentHex !== -1 && (mob.pos.q !== previousPos.q || mob.pos.r !== previousPos.r)) {
      const trap = gameState.trapsOnBoard[trapIndexOnCurrentHex]
      trap.triggered = true
      mob.stunnedTurns = SNARE_TRAP_STUN_TURNS
      mobMessages.push(`LV${mob.level}モンスターがスネアトラップにかかった！ (${SNARE_TRAP_STUN_TURNS}ターン行動不能)`)
      if (trap.el?.parentNode === gameBoard) gameBoard.removeChild(trap.el)
      gameState.trapsOnBoard.splice(trapIndexOnCurrentHex, 1)
    }

    createOrUpdatePiece(mob, 'mob')
    if (Axial.distance(mob.pos, gameState.player.pos) === 0) isGameOver = true
  })

  if (isGameOver) {
    setTimeout(endGame, 300)
    updateInventoryUI()
    return
  }

  if (!gameState.isGameOver) {
    spawnItem()

    const mobCount = gameState.mobs.length
    const maxCapacity = gameState.maxMobCapacity || Math.max(5, Math.floor(gameState.gridRadius * 2))
    const occupancyRate = Math.min(1.0, mobCount / maxCapacity)
    const exponent = 2
    let dynamicSpawnChance = MOB_SPAWN_CHANCE_PER_TURN * Math.pow(1 - occupancyRate, exponent)

    if (Math.random() < Math.max(0.05, Math.min(0.95, dynamicSpawnChance))) {
      spawnNewMob()
    }

    let trapMessages: string[] = []
    gameState.trapsOnBoard = gameState.trapsOnBoard.filter((trap) => {
      if (trap.triggered) return false
      trap.turnsLeft--
      if (trap.turnsLeft <= 0) {
        if (trap.el?.parentNode === gameBoard) gameBoard.removeChild(trap.el)
        trapMessages.push(`トラップの効果が切れた。`)
        return false
      }
      return true
    })

    gameState.turn++
    gameState.isPlayerTurn = true
    gameState.player.remainingMovesThisTurn = 1
    updateInfo()
    updateInventoryUI()
    updateHighlights()

    let turnEndMessage = [...mobMessages, ...trapMessages].join(' ')
    if (gameState.player.cloakTurnsLeft > 0) {
      turnEndMessage += ` あなたのターンです。(隠れ蓑: 残り${gameState.player.cloakTurnsLeft}ターン)`
    } else {
      turnEndMessage += ' あなたのターンです。移動したいマスを選択してください。'
    }
    updateMessage(turnEndMessage.trim())
  }
}

function endGame(): void {
  gameState.isPlayerTurn = false
  gameState.isGameOver = true
  updateMessage(`ゲームオーバー！最終スコア: ${gameState.score}`, 'gameover')
  gameState.grid.forEach((hex) => {
    hex.el?.classList.remove('highlight', 'detection-highlight', 'placeable-trap-highlight')
  })
  updateInventoryUI()
}

function updateInfo(): void {
  scoreEl.textContent = gameState.score.toString()
  turnEl.textContent = gameState.turn.toString()
}

function updateInventoryUI(): void {
  inventoryArea.innerHTML = ''
  gameState.player.inventory.forEach((item) => {
    if (!item) return

    // 各アイテムを包むコンテナを作成
    const itemContainer = document.createElement('div')
    itemContainer.className = 'inventory-item-container' // スタイリング用にクラスを追加しても良い
    itemContainer.style.display = 'flex'
    itemContainer.style.alignItems = 'center'
    itemContainer.style.gap = '8px'

    // アイコンとテキスト部分
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

    // ボタン部分
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

// --- イベントリスナーと初期化 ---

restartButton.addEventListener('click', () => {
  const selectedRadius = parseInt(mapSizeSelector.value, 10)
  requestAnimationFrame(() => initGame(selectedRadius))
})

requestAnimationFrame(() => initGame(parseInt(mapSizeSelector.value, 10)))
