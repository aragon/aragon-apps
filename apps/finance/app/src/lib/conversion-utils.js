import BN from 'bn.js'

export function getConvertedAmount(amount, convertRate) {
  const [whole = '', dec = ''] = convertRate.toString().split('.')
  // Remove any trailing zeros from the decimal part
  const parsedDec = dec.replace(/0*$/, '')
  // Construct the final rate, and remove any leading zeros
  const rate = `${whole}${parsedDec}`.replace(/^0*/, '')

  // Number of decimals to shift the amount of the token passed in,
  // resulting from converting the rate to a number without any decimal
  // places
  const carryAmount = new BN(parsedDec.length.toString())

  return amount.mul(new BN('10').pow(carryAmount)).div(new BN(rate))
}
