import BigNumber from 'bignumber.js'
import { scaleBigNumberValuesSet } from './math-utils'

const scaleResults = (values, total) =>
  scaleBigNumberValuesSet(values, new BigNumber(total)).map(v => v.toFixed(0))

describe('scaleValuesSet()', () => {
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
      'should correct the values if their sum is less than 1',
      [[0.1, 0.1], '1000'],
      ['900', '100'],
    ],
    [
      'should correct the values if their sum is more than 1',
      [[1.1, 0.3], '1000'],
      ['700', '300'],
    ],
  ]

  sets.forEach(([label, params, results]) => {
    test(label, () => {
      expect(scaleResults(...params)).toEqual(results)
    })
  })

  test('should throw if the numbers are too far from 1', () => {
    expect(() => {
      scaleResults([2, 5], '1000')
    }).toThrow(Error)
  })
})
