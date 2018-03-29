import { toChecksumAddress } from 'web3-utils'

// Check address equality without checksums
export function addressesEqual(first, second) {
  first = first && toChecksumAddress(first)
  second = second && toChecksumAddress(second)
  return first === second
}
