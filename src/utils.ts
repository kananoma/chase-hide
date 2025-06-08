import type { AxialCoord } from './types'

export const Axial = {
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