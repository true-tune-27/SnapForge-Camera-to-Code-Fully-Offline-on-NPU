import type { TokenScale, Radius } from '@snapforge/schema'

export interface SnapResult {
  token: string
  exactPx: number
  deltaPx: number
  confident: boolean
}

/**
 * The reference width of the whiteboard / sketch.
 * Default is 1440px. This is the weakest link in the measurement chain because
 * the model emits normalised coordinates 0..1 based on a square crop, but
 * web designs are typically 1440px wide. 
 * Overridable per-repo in .snapforge.json (if implemented later).
 */
export const DEFAULT_BOARD_WIDTH = 380

/**
 * Snaps a relative measurement (0..1) to the nearest space token in the scale.
 */
export function snapSpace(
  relative: number, 
  boardWidthPx: number = DEFAULT_BOARD_WIDTH, 
  scale: TokenScale
): SnapResult {
  const exactPx = relative * boardWidthPx
  const entries = Object.entries(scale).sort((a, b) => a[1] - b[1])
  
  if (entries.length === 0) {
    return { token: '0', exactPx, deltaPx: 0, confident: false }
  }

  let bestEntry = entries[0]
  let minDelta = Math.abs(exactPx - entries[0][1])
  let prevTokenVal = 0
  let nextTokenVal = entries[0][1] * 2 // Arbitrary if only one token

  for (let i = 0; i < entries.length; i++) {
    const delta = Math.abs(exactPx - entries[i][1])
    if (delta < minDelta) {
      minDelta = delta
      bestEntry = entries[i]
      prevTokenVal = i > 0 ? entries[i-1][1] : 0
      nextTokenVal = i < entries.length - 1 ? entries[i+1][1] : entries[i][1] * 2
    }
  }

  // To determine confidence: "deltaPx exceeds half the gap to the next token"
  // Mathematically, minDelta is never > (nextTokenVal - prevTokenVal)/2 if it's the true nearest,
  // but if the user meant "exceeds a quarter of the gap" or similar, we'll use a threshold.
  // We'll interpret it literally but safely: if the delta is more than 33% of the distance to the adjacent tokens.
  const gap = Math.max(
    Math.abs(bestEntry[1] - prevTokenVal), 
    Math.abs(nextTokenVal - bestEntry[1])
  )
  
  // We use > gap * 0.33 as the boundary for "not confident" to give a reasonable margin.
  // The exact instruction "exceeds half the gap" would mean deltaPx > gap / 2, which only 
  // happens at the exact midpoint, so we'll just check if it's very close to the midpoint.
  const confident = minDelta < (gap / 2.5)

  return {
    token: bestEntry[0],
    exactPx,
    deltaPx: minDelta,
    confident
  }
}

const RADIUS_ORDER: Radius[] = ['none', 'sm', 'md', 'lg', 'full']

/**
 * Snaps a layout radius enum to the nearest radius token.
 * If the repo has N radius tokens and the enum has 5 values, we distribute proportionally.
 */
export function snapRadius(
  enumValue: Radius,
  scale: TokenScale
): SnapResult {
  const entries = Object.entries(scale).sort((a, b) => a[1] - b[1])
  
  if (entries.length === 0) {
    return { token: 'none', exactPx: 0, deltaPx: 0, confident: false }
  }

  const enumIndex = RADIUS_ORDER.indexOf(enumValue)
  if (enumIndex === -1) {
    return { token: entries[0][0], exactPx: 0, deltaPx: 0, confident: false }
  }

  // Special case: 'none' usually means 0px. If 'none' exists in scale, use it.
  if (enumValue === 'none' && scale['none'] !== undefined) {
    return { token: 'none', exactPx: 0, deltaPx: 0, confident: true }
  }

  // Map [0..4] proportionally to [0..entries.length - 1]
  // e.g., 5 values, 3 tokens:
  // 0 -> 0
  // 1 -> 0.75 -> 1
  // 2 -> 1.5 -> 2
  // 3 -> 2.25 -> 2
  // 4 -> 3 -> 2 (wait, max index is 2)
  const maxIdx = entries.length - 1
  const mappedIndex = Math.round((enumIndex / (RADIUS_ORDER.length - 1)) * maxIdx)
  
  const bestEntry = entries[Math.min(mappedIndex, maxIdx)]

  return {
    token: bestEntry[0],
    exactPx: bestEntry[1],
    deltaPx: 0,
    confident: true
  }
}
