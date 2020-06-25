import BN from 'bn.js'
import { convertAmount } from './conversion-utils'

describe('convertAmount()', () => {
  test('Should convert and format amounts', () => {
    expect(
      String(convertAmount('10663060000000000000000', 18, 0.995, { digits: 2 }))
    ).toBe('10,609.74')
    expect(
      String(convertAmount('10663060000000000000000', 18, 0.995, { digits: 3 }))
    ).toBe('10,609.745')
    expect(
      String(convertAmount('10663060000000000000000', 18, 0.995, { digits: 4 }))
    ).toBe('10,609.7447')
  })
})
