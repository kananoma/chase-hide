import { calculateAndVisualizeDanger, clearDangerVisualization, lastDangerMap } from './danger'
import {
  CLOAK_DURATION,
  CLOAK_EVASION_CHANCE,
  ITEM_SPAWN_CHANCE,
  MAX_SPAWN_CHANCE,
  MIN_SPAWN_CHANCE,
  MOB_LEVEL_SPAWN_PARAMS,
  MOB_SPAWN_CHANCE_PER_TURN,
  MOB_STATS,
  SNARE_TRAP_DURATION,
  SNARE_TRAP_STUN_TURNS,
} from './constants'
import { gameState } from './state'
import {
  canPlaceTrapAt,
  clearDetectionHighlights,
  createOrUpdateItemPiece,
  createOrUpdatePiece,
  createOrUpdateTrapPiece,
  gameBoard,
  updateHighlights,
  updateInfo,
  updateInventoryUI,
  updateMessage,
} from './ui'
// 値のインポート
import { ITEM_TYPES } from './types'
// 型のインポート
import type { AxialCoord, HexData, ItemType, Mob, TrapOnBoard } from './types'
import { Axial } from './utils'

export function onHexClick(q: number, r: number): void {
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

export function onHexMouseEnter(hexData: HexData): void {
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

export function onHexMouseLeave(): void {
  if (gameState.isGameOver) return
  clearDetectionHighlights()
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

export function captureMob(mobIndex: number): void {
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

export function useBootsItem(): void {
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

export function useCloakItem(): void {
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

export function useSnareTrapItem(): void {
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

export function spawnNewMob(isInitial: boolean = false): void {
  const occupiedKeys = new Set<string>([`${gameState.player.pos.q},${gameState.player.pos.r}`])
  gameState.mobs.forEach((m) => occupiedKeys.add(`${m.pos.q},${m.pos.r}`))
  gameState.itemsOnBoard.forEach((i) => occupiedKeys.add(`${i.pos.q},${i.pos.r}`))
  gameState.trapsOnBoard.forEach((t) => occupiedKeys.add(`${t.pos.q},${t.pos.r}`))

  let candidateHexes = Array.from(gameState.grid.values()).filter((hex) => {
    // 占有されておらず、かつプレイヤーから一定距離離れている
    const isOccupied = occupiedKeys.has(`${hex.q},${hex.r}`)
    const isFarEnough = Axial.distance(gameState.player.pos, hex) >= gameState.minSpawnDistance
    return !isOccupied && isFarEnough
  })
  // もし十分に離れた適切なマスがなければ、占有されていないすべてのマスを候補にする
  if (candidateHexes.length === 0) {
    candidateHexes = Array.from(gameState.grid.values()).filter((hex) => !occupiedKeys.has(`${hex.q},${hex.r}`))
  }
  if (candidateHexes.length === 0) return

  let finalCandidateLocation: AxialCoord | undefined = undefined

  if (isInitial || lastDangerMap.size === 0) {
    // 初期スポーン時、または危険度マップが未計算の場合は、従来通りプレイヤーから遠い場所を選ぶ
    let initialCandidates = candidateHexes.filter(
      (hex) => Axial.distance(gameState.player.pos, hex) >= gameState.minSpawnDistance
    )
    if (initialCandidates.length === 0) initialCandidates = candidateHexes

    finalCandidateLocation = initialCandidates[Math.floor(Math.random() * initialCandidates.length)]
  } else {
    // 通常スポーン時は危険度に基づいて場所を決定
    let maxDanger = 0
    lastDangerMap.forEach((danger) => {
      if (danger > maxDanger) maxDanger = danger
    })
    maxDanger += 1 // 最も危険なマスでも最低1の重みを持つように

    const weightedCandidates: { hex: AxialCoord; weight: number }[] = []
    let totalWeight = 0

    for (const hex of candidateHexes) {
      const key = `${hex.q},${hex.r}`
      const danger = lastDangerMap.get(key) || 0
      const weight = maxDanger - danger

      weightedCandidates.push({ hex, weight })
      totalWeight += weight
    }

    if (totalWeight > 0) {
      let randomValue = Math.random() * totalWeight
      for (const candidate of weightedCandidates) {
        if (randomValue < candidate.weight) {
          finalCandidateLocation = candidate.hex
          break
        }
        randomValue -= candidate.weight
      }
    }

    // フォールバック: 重み計算の結果などで選ばれなかった場合
    if (!finalCandidateLocation) {
      finalCandidateLocation = candidateHexes[Math.floor(Math.random() * candidateHexes.length)]
    }
  }

  // finalCandidateLocationがundefinedでないことを保証
  if (!finalCandidateLocation) return

  const mobLevel = isInitial ? 1 : getWeightedRandomLevel(gameState.score)
  const newMob: Mob = {
    id: `mob-${gameState.nextMobId++}`,
    pos: { q: finalCandidateLocation.q, r: finalCandidateLocation.r },
    el: null,
    level: mobLevel,
    stunnedTurns: 0,
  }
  gameState.mobs.push(newMob)
  if (!isInitial) {
    createOrUpdatePiece(newMob, 'mob')
  }
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
  const newItem = {
    id: `item-${gameState.nextItemId++}`,
    pos: { q, r },
    el: null,
    type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
  }
  gameState.itemsOnBoard.push(newItem)
  createOrUpdateItemPiece(newItem)
}

function endPlayerTurn(): void {
  gameState.isPlayerTurn = false
  updateMessage('モンスターのターン...')
  updateHighlights()
  clearDetectionHighlights()
  // 危険度表示がONの場合のみヒートマップをクリア
  if (gameState.isDangerVisible) {
    clearDangerVisualization()
  }
  setTimeout(mobsTurn, 500)
}

export function endGame(): void {
  gameState.isPlayerTurn = false
  gameState.isGameOver = true
  updateMessage(`ゲームオーバー！最終スコア: ${gameState.score}`, 'gameover')
  gameState.grid.forEach((hex) => {
    hex.el?.classList.remove('highlight', 'detection-highlight', 'placeable-trap-highlight')
  })
  updateInventoryUI()
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
    const totalHexes = gameState.totalHexes ?? 1
    const maxCapacity = gameState.maxMobCapacity || Math.max(5, Math.floor(gameState.gridRadius * 2))
    const occupancyRate = Math.min(1.0, mobCount / maxCapacity)
    const exponent = 2
    const dynamicSpawnChance = MOB_SPAWN_CHANCE_PER_TURN * Math.pow(1 - occupancyRate, exponent)
    const finalSpawnChance = Math.max(MIN_SPAWN_CHANCE, Math.min(MAX_SPAWN_CHANCE, dynamicSpawnChance))

    if (Math.random() < finalSpawnChance) {
      spawnNewMob()
    }

    let trapMessages: string[] = []
    gameState.trapsOnBoard = gameState.trapsOnBoard.filter((trap) => {
      if (trap.triggered) return false

      if (trap.turnsLeft > 0) {
        trap.turnsLeft--
        if (trap.turnsLeft <= 0) {
          if (trap.el?.parentNode === gameBoard) {
            gameBoard.removeChild(trap.el)
          }
          trapMessages.push(`トラップの効果が切れた。`)
          return false
        }
      }
      return true
    })

    gameState.turn++
    gameState.isPlayerTurn = true
    gameState.player.remainingMovesThisTurn = 1
    updateInfo()
    updateInventoryUI()
    updateHighlights()

    console.log(`--- Turn ${gameState.turn - 1} End ---`)
    console.log(`Score: ${gameState.score}`)
    console.log(`Mob Count: ${mobCount} / ${maxCapacity} (${(occupancyRate * 100).toFixed(1)}%)`)
    if (mobCount > 0) {
      console.log(`Current Mob Density: 1体あたり約 ${(totalHexes / mobCount).toFixed(1)} マス`)
    } else {
      console.log(`Current Mob Density: (No Mobs)`)
    }
    console.log(`Next Mob Spawn Chance: ${(finalSpawnChance * 100).toFixed(1)}%`)
    console.log('-----------------------')

    let turnEndMessage = [...mobMessages, ...trapMessages].join(' ')
    if (gameState.player.cloakTurnsLeft > 0) {
      turnEndMessage += ` あなたのターンです。(隠れ蓑: 残り${gameState.player.cloakTurnsLeft}ターン)`
    } else {
      turnEndMessage += ' あなたのターンです。移動したいマスを選択してください。'
    }
    updateMessage(turnEndMessage.trim())

    calculateAndVisualizeDanger()
  }
}
