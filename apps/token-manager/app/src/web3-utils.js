import { toChecksumAddress, isAddress } from 'web3-utils'

// Check address equality with checksums
export function addressesEqual(first, second) {
  return isAddress(first) && isAddress(second)
    ? toChecksumAddress(first) === toChecksumAddress(second)
    : false
}

export const addressPattern = '(0x)?[0-9a-fA-F]{40}'

// Re-export some web3-utils functions
export { isAddress } from 'web3-utils'
