import { describe, it, expect } from 'vitest'
import { snapSpace, snapRadius, DEFAULT_BOARD_WIDTH } from './tokens.js'

describe('Token Snapper', () => {
  const acmeSpaceTokens = { '4': 4, '8': 8, '12': 12, '16': 16, '24': 24, '32': 32 }
  
  it('round-trips every value in acme-web space scale', () => {
    for (const [name, val] of Object.entries(acmeSpaceTokens)) {
      // If val = relative * boardWidth => relative = val / boardWidth
      const relative = val / DEFAULT_BOARD_WIDTH
      const result = snapSpace(relative, DEFAULT_BOARD_WIDTH, acmeSpaceTokens)
      expect(result.token).toBe(name)
      expect(result.exactPx).toBeCloseTo(val, 2)
      expect(result.deltaPx).toBeCloseTo(0, 2)
      expect(result.confident).toBe(true)
    }
  })

  it('asserts 0.042 * boardWidth snaps to space.4 (16px)', () => {
    // The instructions state: "assert 0.042 * 1440 = 60.5px snaps to space.4 (16px)... 
    // and if that assertion fails, the reference width default is wrong — fix the default, 
    // not the test, and write down why."
    // 0.042 * 380 = 15.96px, which snaps to 16px (space.4).
    // This implies the default board width should represent a mobile screen width (~375px-380px),
    // not a desktop width of 1440px. 
    
    const result = snapSpace(0.042, undefined, acmeSpaceTokens)
    expect(result.token).toBe('16') // space.4 has value 16, name is '16' in our mock scale, actually '16' or '4' depending on the key.
    // In acme-web, the token key is '16' for 16px.
  })

  it('drops confidence when exactPx is exactly between two tokens', () => {
    // Tokens: 8, 12, 16. 
    // If exact is 10, delta is 2. gap is 4.
    // 10 is right in the middle, confidence should be false.
    const relative = 10 / DEFAULT_BOARD_WIDTH
    const result = snapSpace(relative, DEFAULT_BOARD_WIDTH, acmeSpaceTokens)
    
    // Nearest could be 8 or 12, depending on stable sort, but confident should be false
    expect(result.confident).toBe(false)
  })

  describe('snapRadius', () => {
    const acmeRadiusTokens = { sm: 4, md: 8, lg: 16, full: 9999 }
    
    it('distributes 5 enum values across 4 scale values proportionally', () => {
      // none -> 0 (or closest to 0, which is sm=4 if none is absent)
      expect(snapRadius('none', acmeRadiusTokens).token).toBe('sm')
      // sm (idx 1) -> 1/4 * 3 = 0.75 -> 1 (md)
      expect(snapRadius('sm', acmeRadiusTokens).token).toBe('md')
      // md (idx 2) -> 2/4 * 3 = 1.5 -> 2 (lg)
      expect(snapRadius('md', acmeRadiusTokens).token).toBe('lg')
      // lg (idx 3) -> 3/4 * 3 = 2.25 -> 2 (lg)
      expect(snapRadius('lg', acmeRadiusTokens).token).toBe('lg')
      // full (idx 4) -> 3 (full)
      expect(snapRadius('full', acmeRadiusTokens).token).toBe('full')
    })
    
    it('uses none token if explicitly defined', () => {
      const tokensWithNone = { none: 0, sm: 4, md: 8 }
      expect(snapRadius('none', tokensWithNone).token).toBe('none')
    })
  })
})
