import BN from 'bn.js'
import {
  Percentage,
  TokenAmount,
  formatBnPercentage,
  scaleBNValuesSet,
} from './math-utils'

const scaleResults = (values, total, precision) =>
  scaleBNValuesSet(values, new BN(total), precision).map(v => v.toString())

const NO_BREAK_SPACE = '\u00A0'

describe('scaleBNValuesSet()', () => {
  const sets = [
    [
      'should add round up the first number first',
      [[0.5, 0.5], '329879'],
      ['164940', '164939'],
    ],
    [
      'should work with very big numbers',
      [[0.5, 0.5], '3298792983798273972398792837972310987189327'],
      [
        '1649396491899136986199396418986155493594664',
        '1649396491899136986199396418986155493594663',
      ],
    ],
    [
      'should return an empty array if an empty array is provided',
      [[], '100'],
      [],
    ],
    [
      'should handle zero values',
      [[0.9, 0, 0.1], '10000'],
      ['9000', '0', '1000'],
    ],
    [
      'should not correct the values if their sum is far enough from 1',
      [[0.1, 0.1], '1000'],
      ['100', '100'],
    ],
    [
      'should correct the values if their sum is close enough to 1',
      [[0.9, 0.099999], '1000'],
      ['900', '100'],
    ],
    [
      'should work with values that errored and made us debug this',
      [[0.55, 0], '100'],
      ['55', '0'],
    ],
  ]

  sets.forEach(([label, params, results]) => {
    test(label, () => {
      expect(scaleResults(...params)).toEqual(results)
    })
  })

  test('should throw if the numbers are too far from 1', () => {
    expect(() => {
      scaleResults([1.1, 0.3], '1000')
    }).toThrow(Error)
    expect(() => {
      scaleResults([2, 5], '1000')
    }).toThrow(Error)
  })

  test('should adapt to the correction limit', () => {
    expect(scaleResults([0.8, 0.1], '1000')).toEqual(['800', '100'])
    expect(scaleResults([0.9, 0.1001], '1000')).toEqual(['900', '100'])
    expect(scaleResults([0.8, 0.1], '1000', 0.1)).toEqual(['900', '100'])
    expect(scaleResults([0.9, 0.099], '1000', 0)).toEqual(['900', '99'])
    expect(() => {
      scaleResults([0.9, 1.0001], '1000', 0)
    }).toThrow(Error)
  })
})

describe('formatBnPercentage()', () => {
  test('should format percentages without digits', () => {
    expect(
      formatBnPercentage(
        new BN('500000000000000000'),
        new BN('1000000000000000000')
      )
    ).toEqual('50%')
  })
  test('should format percentages with digits', () => {
    expect(
      formatBnPercentage(
        new BN('555500000000000000'),
        new BN('1000000000000000000')
      )
    ).toEqual('55.55%')
    expect(
      formatBnPercentage(
        new BN('333390000000000000'),
        new BN('1000000000000000000')
      )
    ).toEqual('33.34%')
    expect(
      formatBnPercentage(
        new BN('333310000000000000'),
        new BN('1000000000000000000')
      )
    ).toEqual('33.33%')
    expect(
      formatBnPercentage(
        new BN('333350000000000000'),
        new BN('1000000000000000000')
      )
    ).toEqual('33.34%')
  })
  test('should round percentages', () => {
    expect(
      formatBnPercentage(
        new BN('333399999999999999'),
        new BN('1000000000000000000')
      )
    ).toEqual('33.34%')
    expect(
      formatBnPercentage(
        new BN('333344444444444444'),
        new BN('1000000000000000000')
      )
    ).toEqual('33.33%')
  })
  test('should add the right amount of digits', () => {
    expect(
      formatBnPercentage(
        new BN('333349999999999999'),
        new BN('1000000000000000000'),
        { digits: 3 }
      )
    ).toEqual('33.335%')
    expect(
      formatBnPercentage(
        new BN('333300000000000000'),
        new BN('1000000000000000000'),
        { digits: 3 }
      )
    ).toEqual('33.33%')
  })
  test('should tolerate setting too many digits', () => {
    const maxDigits = Math.floor(
      Math.log(Number.MAX_SAFE_INTEGER) / Math.log(10)
    )
    expect(
      formatBnPercentage(
        new BN('333333333333333333'),
        new BN('1000000000000000000'),
        { digits: 40 }
      )
    ).toEqual(`33.${'3'.repeat(maxDigits - 1)}%`)
  })
  test('should round based on the digits', () => {
    expect(
      formatBnPercentage(
        new BN('333359999999999999'),
        new BN('1000000000000000000'),
        { digits: 2 }
      )
    ).toEqual('33.34%')
    expect(
      formatBnPercentage(
        new BN('333359999999999999'),
        new BN('1000000000000000000'),
        { digits: 3 }
      )
    ).toEqual('33.336%')
    expect(
      formatBnPercentage(
        new BN('333344666666666666'),
        new BN('1000000000000000000'),
        { digits: 4 }
      )
    ).toEqual('33.3345%')
  })
})

describe('Percentage', () => {
  test('should convert into a string', () => {
    const pct = new Percentage('333350000000000000', '1000000000000000000')
    expect(String(pct)).toEqual('33.34%')
    expect(pct.toString()).toEqual('33.34%')
    expect(pct.toString({ digits: 3 })).toEqual('33.335%')
    expect(pct.toString({ digits: 4 })).toEqual('33.335%')
    expect(pct.toString({ suffix: '' })).toEqual('33.34')
  })
  test('should convert into a number', () => {
    expect(
      new Percentage('500000000000000000', '1000000000000000000').toNumber()
    ).toEqual(0.5)
    expect(
      Number(new Percentage('500000000000000000', '1000000000000000000'))
    ).toEqual(0.5)
    expect(
      new Percentage('333333333333333333', '1000000000000000000').toNumber()
    ).toEqual(0.333333333)
  })
})

describe('TokenAmount', () => {
  test('should convert into a string', () => {
    const token = new TokenAmount('33333333333333333333', '18')
    expect(String(token)).toEqual('33.33')
    expect(token.toString()).toEqual('33.33')
    expect(token.toString({ digits: 10 })).toEqual('33.3333333333')
    expect(token.toString({ symbol: 'ANT' })).toEqual(
      `33.33${NO_BREAK_SPACE}ANT`
    )
  })
})
