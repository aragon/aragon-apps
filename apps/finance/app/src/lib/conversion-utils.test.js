import BN from 'bn.js'
import { getConvertedAmount } from './conversion-utils'

const ONE_ETH = new BN('10').pow(new BN('18'))

describe('getConvertedAmount tests', () => {
  test('Converts amounts correctly', () => {
    expect(getConvertedAmount(new BN('1'), 1).toString()).toEqual('1')
    expect(getConvertedAmount(new BN(ONE_ETH), 1).toString()).toEqual(
      ONE_ETH.toString()
    )
    expect(getConvertedAmount(new BN('1'), 0.5).toString()).toEqual('2')
    expect(getConvertedAmount(new BN('1'), 0.25).toString()).toEqual('4')
    expect(getConvertedAmount(new BN('1'), 0.125).toString()).toEqual('8')

    expect(getConvertedAmount(new BN('100'), 50).toString()).toEqual('2')
    // This is the exact case that broke the previous implementation,
    // which is AAVE's amount of WBTC + the exchange rate at a certain
    // hour on 2020-06-24
    expect(
      getConvertedAmount(new BN('1145054'), 0.00009248).toString()
    ).toEqual('12381639273')
  })

  test('Throws on invalid inputs', () => {
    expect(() => getConvertedAmount(new BN('1'), 0)).toThrow()
    expect(() => getConvertedAmount('1000', 0)).toThrow()
  })
})
