import BN from 'bn.js'
import { scaleBNValuesSet } from './math-utils'

const scaleResults = (values, total, precision) =>
  scaleBNValuesSet(values, new BN(total), precision).map(v => v.toString())

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
