export interface AxialCoord {
  q: number
  r: number
}

export interface HexData extends AxialCoord {
  el: HTMLDivElement | null
}

export const ITEM_TYPES = ['boots', 'cloak', 'snare_trap'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export interface ItemOnBoard {
  id: string
  pos: AxialCoord
  el: HTMLDivElement | null
  type: ItemType
}

export interface TrapOnBoard {
  id: string
  pos: AxialCoord
  type: 'snare_trap'
  el: HTMLDivElement | null
  turnsLeft: number
  triggered: boolean
}

export interface InventoryItem {
  type: ItemType
  quantity: number
  name: string
  icon: string
}

export interface Player {
  pos: AxialCoord
  el: HTMLDivElement | null
  inventory: InventoryItem[]
  remainingMovesThisTurn: number
  cloakTurnsLeft: number
}

export interface Mob {
  id: string
  pos: AxialCoord
  el: HTMLDivElement | null
  level: number
  stunnedTurns: number
}

export interface GameState {
  gridRadius: number
  grid: Map<string, HexData>
  totalHexes?: number
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
  isDangerVisible: boolean
  initialMobs: number
  minSpawnDistance: number
  minSpawnDistanceFromOtherMobs: number
  maxItemsOnBoard: number
  minItemSpawnDistanceFromPlayer: number
  maxMobCapacity: number
}
