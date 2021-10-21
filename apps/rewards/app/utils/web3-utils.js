import { toChecksumAddress } from 'web3-utils'

// Check address equality without checksums
export function addressesEqual(first, second) {
  first = first && toChecksumAddress(first)
  second = second && toChecksumAddress(second)
  return first === second
}

// Re-export some web3-utils functions
export { isAddress, toUtf8 } from 'web3-utils'
