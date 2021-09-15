import { toChecksumAddress, hexToNumber } from 'web3-utils'

// Check address equality without checksums
export function addressesEqual(first, second) {
  first = first && toChecksumAddress(first)
  second = second && toChecksumAddress(second)
  return first === second
}

export const addressPattern = '(0x)?[0-9a-fA-F]{40}'

/**
 * Shorten an Ethereum address. `charsLength` allows to change the number of
 * characters on both sides of the ellipsis.
 *
 * Examples:
 *   shortenAddress('0x19731977931271')    // 0x1973…1271
 *   shortenAddress('0x19731977931271', 2) // 0x19…71
 *   shortenAddress('0x197319')            // 0x197319 (already short enough)
 *
 * @param {string} address The address to shorten
 * @param {number} [charsLength=4] The number of characters to change on both sides of the ellipsis
 * @returns {string} The shortened address
 */
export function shortenAddress(address, charsLength = 4) {
  const prefixLength = 2 // "0x"
  if (!address) {
    return ''
  }
  if (address.length < charsLength * 2 + prefixLength) {
    return address
  }
  return address.slice(0, charsLength + prefixLength) + '…' + address.slice(-charsLength)
}

export function getSignatureFields(signature) {
  signature = signature.substr(2) // remove 0x
  const v = hexToNumber(`0x${signature.slice(128, 130)}`)

  return {
    v: v !== 27 && v !== 28 ? v + 27 : v,
    r: `0x${signature.slice(0, 64)}`,
    s: `0x${signature.slice(64, 128)}`,
  }
}

// Re-export some web3-utils functions
export { isAddress, toChecksumAddress, toUtf8, soliditySha3 } from 'web3-utils'
