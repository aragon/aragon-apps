import BN from 'bn.js'
import {
  formatBalance,
  fromDecimals,
  stakesPercentages,
  toDecimals,
} from './utils'

const bn = v => new BN(v)

describe('fromDecimals', () => {
  test('Should adjust from decimal base', () => {
    expect(fromDecimals('3', 3)).toBe('0.003')
    expect(fromDecimals('3.0', 3)).toBe('0.003')
    expect(fromDecimals('123', 3)).toBe('0.123')
    expect(fromDecimals('1234', 3)).toBe('1.234')
    expect(fromDecimals('3000', 3)).toBe('3')
    expect(fromDecimals('3001', 3)).toBe('3.001')
    expect(fromDecimals('3010', 3)).toBe('3.01')
    expect(fromDecimals('30000', 3)).toBe('30')
    expect(fromDecimals('123456', 3)).toBe('123.456')

    // Use decimal base 0
    expect(fromDecimals('1', 0)).toBe('1')
    expect(fromDecimals('123', 0)).toBe('123')

    // Use decimal base 1
    expect(fromDecimals('1', 1)).toBe('0.1')
    expect(fromDecimals('123', 1)).toBe('12.3')

    // Use decimal base 18
    // The zeroes length to use is 18 - <length of whole>
    expect(fromDecimals('1', 18)).toBe(`0.${'0'.repeat(17)}1`)
    expect(fromDecimals('12', 18)).toBe(`0.${'0'.repeat(16)}12`)
    expect(fromDecimals('12345678', 18)).toBe(`0.${'0'.repeat(10)}12345678`)
  })
  test('Should truncate trailing decimals after adjusting by default', () => {
    expect(fromDecimals('34.123456', 0)).toBe('34')
    expect(fromDecimals('34.123456', 1)).toBe('3.4')
    expect(fromDecimals('34.123456', 3)).toBe('0.034')
  })
  test('Should not truncate trailing decimals if asked not to', () => {
    expect(fromDecimals('34.123456', 0, { truncate: false })).toBe('34.123456')
    expect(fromDecimals('34.123456', 1, { truncate: false })).toBe('3.4123456')
    expect(fromDecimals('34.123456', 3, { truncate: false })).toBe(
      '0.034123456'
    )
    expect(fromDecimals('34.000012', 3, { truncate: false })).toBe(
      '0.034000012'
    )
    expect(fromDecimals('0.000012', 3, { truncate: false })).toBe('0.000000012')
  })
  test('Should trim leading zeroes when adjusting', () => {
    expect(fromDecimals('0000123', 3)).toBe('0.123')
    expect(fromDecimals('0003123', 3)).toBe('3.123')
  })
  test('Should return 0 if only zeroes are given', () => {
    expect(fromDecimals('0', 3)).toBe('0')
    expect(fromDecimals('0000', 3)).toBe('0')
    expect(fromDecimals('0.0', 3)).toBe('0')
    expect(fromDecimals('.0', 3)).toBe('0')
    expect(fromDecimals('.000', 3)).toBe('0')
    expect(fromDecimals('.', 3)).toBe('0')
  })
  test('Should return 0 if any empty string is given', () => {
    expect(fromDecimals('', 3)).toBe('0')
  })
})

describe('toDecimals', () => {
  test('Should adjust to decimal base', () => {
    expect(toDecimals('0.123', 3)).toBe('123')
    expect(toDecimals('.123', 3)).toBe('123')
    expect(toDecimals('3', 3)).toBe('3000')
    expect(toDecimals('3.0', 3)).toBe('3000')
    expect(toDecimals('3.123', 3)).toBe('3123')
    expect(toDecimals('34.12', 3)).toBe('34120')
    expect(toDecimals('3412', 3)).toBe('3412000')

    // Use decimal base 0
    expect(toDecimals('1', 0)).toBe('1')
    expect(toDecimals('123', 0)).toBe('123')

    // Use decimal base 1
    expect(toDecimals('1', 1)).toBe('10')
    expect(toDecimals('1.1', 1)).toBe('11')
    expect(toDecimals('123', 1)).toBe('1230')

    // Use decimal base 18
    // The padEnd length to use is <length of whole> + 18
    expect(toDecimals('1', 18)).toBe('1'.padEnd(19, '0'))
    expect(toDecimals('34', 18)).toBe('34'.padEnd(20, '0'))
    expect(toDecimals('34.123456', 18)).toBe('34123456'.padEnd(20, '0'))
  })
  test('Should truncate trailing decimals after adjusting by default', () => {
    expect(toDecimals('34.123456', 0)).toBe('34')
    expect(toDecimals('34.123456', 1)).toBe('341')
    expect(toDecimals('34.123456', 3)).toBe('34123')
  })
  test('Should not truncate trailing decimals if asked not to', () => {
    expect(toDecimals('34.123456', 0, { truncate: false })).toBe('34.123456')
    expect(toDecimals('34.123456', 1, { truncate: false })).toBe('341.23456')
    expect(toDecimals('34.123456', 3, { truncate: false })).toBe('34123.456')
  })
  test('Should trim leading zeroes when adjusting', () => {
    expect(toDecimals('0000.123', 3)).toBe('123')
    expect(toDecimals('0003.123', 3)).toBe('3123')
  })
  test('Should return 0 if only zeroes are given', () => {
    expect(toDecimals('0', 3)).toBe('0')
    expect(toDecimals('0000', 3)).toBe('0')
    expect(toDecimals('0.0', 3)).toBe('0')
    expect(toDecimals('.0', 3)).toBe('0')
    expect(toDecimals('.000', 3)).toBe('0')
    expect(toDecimals('.', 3)).toBe('0')
  })
  test('Should return 0 if any empty string is given', () => {
    expect(toDecimals('', 3)).toBe('0')
  })
})

describe('formatBalance', () => {
  test('Should not display the decimals if they are 0', () => {
    expect(formatBalance(bn(3000), bn(1000))).toBe('3')
  })
  test('Should display decimals correctly', () => {
    expect(formatBalance(bn(3001), bn(1000), 3)).toBe('3.001')
    expect(formatBalance(bn(3010), bn(1000), 3)).toBe('3.01')
  })
  test('Should adapt based on the precision', () => {
    expect(formatBalance(bn(3001), bn(1000), 1)).toBe('3')
    expect(formatBalance(bn(3101), bn(1000), 1)).toBe('3.1')
  })
})

describe('stakePercentages()', () => {
  const totalPercentage = stakes =>
    stakes.reduce((total, stake) => total + stake.percentage, 0)

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
    expect(stakes).toHaveLength(5)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([32, 32, 32, 3, 1])
  })

  test('Percentage should be adjusted to reach 100% (2)', () => {
    const stakes = stakesPercentages(Array(7).fill(bn(1)))
    expect(stakes).toHaveLength(7)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([15, 15, 14, 14, 14, 14, 14])
  })

  test('A rest item should be added if the total exceeds the limit', () => {
    const maxIncluded = 5
    const stakes = stakesPercentages(Array(10).fill(bn(1)), { maxIncluded })

    expect(stakes).toHaveLength(maxIncluded)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes[stakes.length - 1]).toEqual({ index: -1, percentage: 60 })
  })

  test('Items at 0% should be removed and replaced by a Rest item', () => {
    const values = [bn(1000), bn(1000), bn(1000), bn(10), bn(1)]
    const stakes = stakesPercentages(values)
    expect(stakes).toHaveLength(4)
    expect(totalPercentage(stakes)).toBe(100)
    expect(stakes.map(s => s.percentage)).toEqual([33, 33, 33, 1])
  })
})
