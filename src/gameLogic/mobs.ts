import type { GameState, Mob, ItemOnBoard, AxialCoord, TrapOnBoard } from '../types'
import {
  MOB_STATS,
  CLOAK_EVASION_CHANCE,
  SNARE_TRAP_STUN_TURNS,
  ITEM_SPAWN_CHANCE,
  MOB_SPAWN_CHANCE_PER_TURN,
  MIN_SPAWN_CHANCE,
  MAX_SPAWN_CHANCE,
  MOB_LEVEL_SPAWN_PARAMS,
} from '../constants'
import { ITEM_TYPES } from '../types'
import { Axial } from '../utils'
import { lastDangerMap } from '../danger'

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

export function processMobsTurn(state: GameState): GameState {
  let isGameOver = false

  // --- 状態のワーキングコピーを作成 (JSON.parseを使用しない安全な方法) ---
  // mapとスプレッド構文でディープコピーすることで、元のstateのデータを保護する
  const nextMobs: Mob[] = state.mobs.map((m) => ({
    ...m,
    pos: { ...m.pos },
  }))
  const nextTraps: TrapOnBoard[] = state.trapsOnBoard.map((t) => ({
    ...t,
    pos: { ...t.pos },
  }))

  // --- ステップ1: 各モンスターの行動処理 ---
  // forEachループを使い、各モンスターの処理をループ内で完結させる
  nextMobs.forEach((mob) => {
    // 1. スタン状態の確認と更新
    // モンスターがスタンしている場合、スタンターンを1減らしてこのモンスターの行動を終了する
    if (mob.stunnedTurns > 0) {
      mob.stunnedTurns--
      return // forEachの次のループへ
    }

    // 2. 移動処理
    const previousPos = { ...mob.pos }
    let bestMove = mob.pos

    // (元のコードから移動ロジックをそのまま使用)
    const canDetectPlayer = state.player.cloakTurnsLeft === 0 || Math.random() > CLOAK_EVASION_CHANCE
    if (canDetectPlayer && Axial.distance(mob.pos, state.player.pos) <= MOB_STATS[mob.level].detectionRange) {
      let minDistance = Axial.distance(mob.pos, state.player.pos)
      let bestMoves: AxialCoord[] = [mob.pos]
      const neighbors = Axial.neighbors(mob.pos)
      for (const neighbor of neighbors) {
        const isOccupied = nextMobs.some((m) => m.id !== mob.id && m.pos.q === neighbor.q && m.pos.r === neighbor.r)
        if (!isOccupied && state.grid.has(`${neighbor.q},${neighbor.r}`)) {
          const d = Axial.distance(neighbor, state.player.pos)
          if (d < minDistance) {
            minDistance = d
            bestMoves = [neighbor]
          } else if (d === minDistance) {
            bestMoves.push(neighbor)
          }
        }
      }
      if (bestMoves.length > 0 && (bestMoves[0].q !== mob.pos.q || bestMoves[0].r !== mob.pos.r)) {
        bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)]
      }
    } else {
      const neighbors = Axial.neighbors(mob.pos)
      const validMoves = neighbors.filter(
        (n) =>
          !nextMobs.some((m) => m.id !== mob.id && m.pos.q === n.q && m.pos.r === n.r) &&
          state.grid.has(`${n.q},${n.r}`)
      )
      if (validMoves.length > 0) {
        bestMove = validMoves[Math.floor(Math.random() * validMoves.length)]
      }
    }

    // モンスターの位置を更新
    mob.pos = bestMove

    // 3. 移動後に新たな罠を作動させたかチェック
    const hasMoved = !(previousPos.q === mob.pos.q && previousPos.r === mob.pos.r)
    if (hasMoved) {
      const trapIndex = nextTraps.findIndex((t) => !t.triggered && t.pos.q === mob.pos.q && t.pos.r === mob.pos.r)

      // 未作動の罠を踏んだ場合、即座に作動させスタン効果を適用する
      if (trapIndex !== -1) {
        console.log(`LV${mob.level}のモンスターがトラップを踏んで動けない！`)
        nextTraps[trapIndex].triggered = true
        mob.stunnedTurns = SNARE_TRAP_STUN_TURNS
      }
    }
  })

  // --- ステップ2: ゲームオーバー判定 ---
  nextMobs.forEach((mob) => {
    if (Axial.distance(mob.pos, state.player.pos) === 0) {
      isGameOver = true
    }
  })

  // --- ステップ3: トラップの状態更新と除去 ---
  // ターン終了時に作動済み・時間切れの罠をまとめて処理する
  const finalTraps = nextTraps
    .map((trap) => {
      // このターンで作動した(triggered = trueになった)罠は、除去対象とするためturnsLeftを0にする
      if (trap.triggered) {
        trap.turnsLeft = 0
      } else if (trap.turnsLeft > 0) {
        // 時間制限のある未作動の罠は、ターンを1消費する
        trap.turnsLeft--
      }
      return trap
    })
    .filter((trap) => {
      // 役目を終えた罠(turnsLeftが0)を除去。永続罠(turnsLeftが-1)やまだ有効な罠は残す。
      return trap.turnsLeft !== 0
    })

  // --- ステップ4: スポーン処理 (元のコードから変更なし) ---
  let nextItems = [...state.itemsOnBoard]
  let nextItemId = state.nextItemId
  let nextMobId = state.nextMobId

  if (Math.random() < ITEM_SPAWN_CHANCE && nextItems.length < state.maxItemsOnBoard) {
    const occupiedKeys = new Set<string>([`${state.player.pos.q},${state.player.pos.r}`])
    nextMobs.forEach((m) => occupiedKeys.add(`${m.pos.q},${m.pos.r}`))
    nextItems.forEach((i) => occupiedKeys.add(`${i.pos.q},${i.pos.r}`))
    finalTraps.forEach((t) => occupiedKeys.add(`${t.pos.q},${t.pos.r}`)) // `workingTraps`を`finalTraps`に変更
    const candidates = Array.from(state.grid.keys()).filter((k) => !occupiedKeys.has(k))
    if (candidates.length > 0) {
      const key = candidates[Math.floor(Math.random() * candidates.length)]
      const [q, r] = key.split(',').map(Number)
      const newItem: ItemOnBoard = {
        id: `item-${nextItemId++}`,
        pos: { q, r },
        el: null,
        type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
      }
      nextItems.push(newItem)
    }
  }

  const mobCount = nextMobs.length
  const maxCapacity = state.maxMobCapacity
  const occupancyRate = Math.min(1.0, mobCount / maxCapacity)
  const finalSpawnChance = Math.max(
    MIN_SPAWN_CHANCE,
    Math.min(MAX_SPAWN_CHANCE, MOB_SPAWN_CHANCE_PER_TURN * Math.pow(1 - occupancyRate, 2))
  )

  if (Math.random() < finalSpawnChance) {
    const occupiedKeys = new Set<string>([`${state.player.pos.q},${state.player.pos.r}`])
    nextMobs.forEach((m) => occupiedKeys.add(`${m.pos.q},${m.pos.r}`))
    nextItems.forEach((i) => occupiedKeys.add(`${i.pos.q},${i.pos.r}`))
    finalTraps.forEach((t) => occupiedKeys.add(`${t.pos.q},${t.pos.r}`)) // `workingTraps`を`finalTraps`に変更
    const candidateHexes = Array.from(state.grid.values()).filter(
      (hex) => !occupiedKeys.has(`${hex.q},${hex.r}`) && Axial.distance(state.player.pos, hex) >= state.minSpawnDistance
    )
    if (candidateHexes.length > 0) {
      let finalCandidateLocation: AxialCoord | undefined = undefined
      let maxDanger = 0
      lastDangerMap.forEach((danger) => {
        if (danger > maxDanger) maxDanger = danger
      })
      maxDanger += 1
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
      if (!finalCandidateLocation) {
        finalCandidateLocation = candidateHexes[Math.floor(Math.random() * candidateHexes.length)]
      }
      if (finalCandidateLocation) {
        const newMob: Mob = {
          id: `mob-${nextMobId++}`,
          pos: finalCandidateLocation,
          el: null,
          level: getWeightedRandomLevel(state.score),
          stunnedTurns: 0,
        }
        nextMobs.push(newMob)
      }
    }
  }

  // --- ステップ5: 最終的な状態を返す ---
  return {
    ...state,
    mobs: nextMobs,
    itemsOnBoard: nextItems,
    trapsOnBoard: finalTraps, // 更新された罠のリストをstateに反映
    nextItemId: nextItemId,
    nextMobId: nextMobId,
    isGameOver: state.isGameOver || isGameOver,
    isPlayerTurn: true,
    turn: state.turn + 1,
  }
}
