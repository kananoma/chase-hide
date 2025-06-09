import {
  CLOAK_DURATION,
  HEXES_PER_INITIAL_MOB,
  HEXES_PER_ITEM,
  HEXES_PER_MAX_MOB,
  MOB_STATS,
  SNARE_TRAP_DURATION,
} from '../constants'
import type { GameState, Mob, TrapOnBoard } from '../types'
import type { GameAction } from '../actions'
import { Axial } from '../utils'
import { processMobsTurn } from '../gameLogic/mobs'

export function createInitialState(radius: number): GameState {
  const totalHexes = 3 * radius * (radius + 1) + 1
  const initialMobsCount = Math.max(2, Math.round(totalHexes / HEXES_PER_INITIAL_MOB))
  const maxMobCapacity = Math.max(5, Math.round(totalHexes / HEXES_PER_MAX_MOB))
  const maxItemsOnBoard = Math.max(1, Math.round(totalHexes / HEXES_PER_ITEM))
  const radiusRatio = Math.max(0.5, radius / 5)
  const minSpawnDistance = Math.max(3, Math.floor(3 * radiusRatio))
  const minSpawnDistanceFromOtherMobs = Math.max(1, Math.floor(2 * radiusRatio))
  const minItemSpawnDistanceFromPlayer = Math.max(1, Math.floor(2 * radiusRatio))

  const initialState: GameState = {
    gridRadius: radius,
    grid: new Map(),
    totalHexes: totalHexes,
    player: {
      pos: { q: 0, r: 0 },
      el: null,
      inventory: [
        { type: 'boots', quantity: 1, name: 'ダッシュブーツ', icon: 'B' },
        { type: 'cloak', quantity: 1, name: '隠れ蓑', icon: 'C' },
        { type: 'snare_trap', quantity: 1, name: 'スネアトラップ', icon: 'S' },
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
    isDangerVisible: false,
    initialMobs: initialMobsCount,
    minSpawnDistance: minSpawnDistance,
    minSpawnDistanceFromOtherMobs: minSpawnDistanceFromOtherMobs,
    maxItemsOnBoard: maxItemsOnBoard,
    minItemSpawnDistanceFromPlayer: minItemSpawnDistanceFromPlayer,
    maxMobCapacity: maxMobCapacity,
  }

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue
      initialState.grid.set(`${q},${r}`, { q, r, el: null })
    }
  }

  const occupiedKeys = new Set<string>([`0,0`])
  for (let i = 0; i < initialState.initialMobs; i++) {
    const emptyHexes = Array.from(initialState.grid.values()).filter((hex) => !occupiedKeys.has(`${hex.q},${hex.r}`))
    const candidates = emptyHexes.filter((hex) => Axial.distance({ q: 0, r: 0 }, hex) >= initialState.minSpawnDistance)
    if (candidates.length > 0) {
      const pos = candidates[Math.floor(Math.random() * candidates.length)]
      const newMob: Mob = {
        id: `mob-${initialState.nextMobId++}`,
        pos: { q: pos.q, r: pos.r },
        el: null,
        level: 1,
        stunnedTurns: 0,
      }
      initialState.mobs.push(newMob)
      occupiedKeys.add(`${pos.q},${pos.r}`)
    }
  }

  console.log('--- Game Initialized: Debug Info ---')
  console.log(`マップ半径: ${radius}`)
  console.log(`総マス数: ${totalHexes}`)
  console.log(`初期敵数: ${initialState.initialMobs}体`)
  console.log('------------------------------------')

  return initialState
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESTART_GAME':
      return createInitialState(action.payload.radius)

    case 'TOGGLE_DANGER_VISIBILITY':
      return { ...state, isDangerVisible: !state.isDangerVisible }

    case 'PLACE_TRAP': {
      if (state.isGameOver || !state.isPlayerTurn || !state.isPlacingTrap) return state

      const targetPos = action.payload.pos
      const trapType = state.isPlacingTrap

      const isAdjacent = Axial.distance(state.player.pos, targetPos) === 1
      const isOccupied =
        state.mobs.some((m) => m.pos.q === targetPos.q && m.pos.r === targetPos.r) ||
        state.itemsOnBoard.some((i) => i.pos.q === targetPos.q && i.pos.r === targetPos.r) ||
        state.trapsOnBoard.some((t) => t.pos.q === targetPos.q && t.pos.r === targetPos.r)

      if (!isAdjacent || isOccupied) {
        return { ...state, isPlacingTrap: null }
      }

      const inventorySlot = state.player.inventory.find((i) => i.type === trapType)
      if (!inventorySlot || inventorySlot.quantity <= 0) return state

      const newTrap: TrapOnBoard = {
        id: `trap-${state.nextTrapId}`,
        pos: targetPos,
        type: 'snare_trap',
        el: null,
        turnsLeft: SNARE_TRAP_DURATION,
        triggered: false,
      }

      return {
        ...state,
        player: {
          ...state.player,
          inventory: state.player.inventory.map((item) =>
            item.type === trapType ? { ...item, quantity: item.quantity - 1 } : item
          ),
          remainingMovesThisTurn: 1,
        },
        trapsOnBoard: [...state.trapsOnBoard, newTrap],
        nextTrapId: state.nextTrapId + 1,
        isPlacingTrap: null,
        isPlayerTurn: false,
      }
    }

    case 'MOVE_PLAYER': {
      if (state.isGameOver || !state.isPlayerTurn) return state

      const targetPos = action.payload.pos
      if (Axial.distance(state.player.pos, targetPos) !== 1) return state

      let newScore = state.score
      let newItems = [...state.itemsOnBoard]
      let newMobs = state.mobs.map((m) => ({ ...m }))
      let newInventory = state.player.inventory.map((i) => ({ ...i }))

      const itemIndex = newItems.findIndex((item) => item.pos.q === targetPos.q && item.pos.r === targetPos.r)
      if (itemIndex !== -1) {
        const pickedUpItem = newItems.splice(itemIndex, 1)[0]
        const inventorySlot = newInventory.find((slot) => slot.type === pickedUpItem.type)
        if (inventorySlot) inventorySlot.quantity++
      }

      const mobIndex = newMobs.findIndex((mob) => mob.pos.q === targetPos.q && mob.pos.r === targetPos.r)
      if (mobIndex !== -1) {
        const capturedMob = newMobs.splice(mobIndex, 1)[0]
        newScore += MOB_STATS[capturedMob.level].score
      }

      const remainingMoves = state.player.remainingMovesThisTurn - 1
      const isTurnEnd = remainingMoves <= 0

      return {
        ...state,
        player: {
          ...state.player,
          pos: targetPos,
          inventory: newInventory,
          remainingMovesThisTurn: isTurnEnd ? 1 : remainingMoves,
          cloakTurnsLeft:
            isTurnEnd && state.player.cloakTurnsLeft > 0
              ? state.player.cloakTurnsLeft - 1
              : state.player.cloakTurnsLeft,
        },
        mobs: newMobs,
        itemsOnBoard: newItems,
        score: newScore,
        isPlayerTurn: !isTurnEnd,
      }
    }

    case 'NEXT_TURN': {
      if (state.isPlayerTurn) return state
      return processMobsTurn(state)
    }

    case 'USE_ITEM': {
      if (state.isGameOver || !state.isPlayerTurn) return state

      const itemType = action.payload.type
      const inventorySlot = state.player.inventory.find((slot) => slot.type === itemType)
      if (!inventorySlot || inventorySlot.quantity <= 0) return state

      switch (itemType) {
        case 'boots':
          if (state.player.remainingMovesThisTurn > 1) return state
          return {
            ...state,
            player: {
              ...state.player,
              inventory: state.player.inventory.map((i) =>
                i.type === 'boots' ? { ...i, quantity: i.quantity - 1 } : i
              ),
              remainingMovesThisTurn: 2,
            },
          }
        case 'cloak':
          if (state.player.cloakTurnsLeft > 0) return state
          return {
            ...state,
            player: {
              ...state.player,
              inventory: state.player.inventory.map((i) =>
                i.type === 'cloak' ? { ...i, quantity: i.quantity - 1 } : i
              ),
              cloakTurnsLeft: CLOAK_DURATION,
            },
          }
        case 'snare_trap':
          return {
            ...state,
            isPlacingTrap: state.isPlacingTrap === 'snare_trap' ? null : 'snare_trap',
          }
      }
      return state
    }

    default:
      return state
  }
}
