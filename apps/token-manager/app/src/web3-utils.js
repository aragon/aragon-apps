import { toChecksumAddress, isAddress } from 'web3-utils'

// Check address equality
export function addressesEqual(first, second) {
  return (
    isAddress(first) &&
    isAddress(second) &&
    first.toLowerCase() === second.toLowerCase()
  )
}

export const addressPattern = '(0x)?[0-9a-fA-F]{40}'

// Re-export some web3-utils functions
export { isAddress } from 'web3-utils'
