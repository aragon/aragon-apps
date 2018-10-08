import BN from 'bn.js'
import { stakesPercentages } from './utils'

const bn = v => new BN(v)

const totalPercentage = stakes =>
  stakes.reduce((total, stake) => total + stake.percentage, 0)

describe('stakePercentages()', () => {
  test(
    'Items having the same value should have ' +
      'an equal percentage, if divisible',
    () => {
      const stakes = stakesPercentages(Array(4).fill(bn(1)))

      expect(totalPercentage(stakes)).toBe(100)
      expect(stakes.every(stake => stake.percentage === 25)).toBe(true)
    }
  )

  test('Percentage should be adjusted to reach 100% (1)', () => {
    const stakes = stakesPercentages([bn(100), bn(100), bn(100), bn(11), bn(2)])
    expect(stakes.length).toBe(5)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([32, 32, 32, 3, 1])
  })

  test('Percentage should be adjusted to reach 100% (2)', () => {
    const stakes = stakesPercentages(Array(7).fill(bn(1)))
    expect(stakes.length).toBe(7)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([15, 15, 14, 14, 14, 14, 14])
  })

  test('A rest item should be added if the total exceeds the limit', () => {
    const maxIncluded = 5
    const stakes = stakesPercentages(Array(10).fill(bn(1)), { maxIncluded })

    expect(stakes.length).toBe(maxIncluded)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes[stakes.length - 1]).toEqual({ index: -1, percentage: 60 })
  })

  test('Items at 0% should be removed and replaced by a Rest item', () => {
    const values = [bn(1000), bn(1000), bn(1000), bn(10), bn(1)]
    const stakes = stakesPercentages(values)
    expect(stakes.length).toBe(4)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([33, 33, 33, 1])
  })
})
