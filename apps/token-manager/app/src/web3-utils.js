import { isAddress } from 'web3-utils'
import { format } from 'js-conflux-sdk'

// Check address equality
export function addressesEqual(first, second) {
  return (
    isAddress(first) &&
    isAddress(second) &&
    first.toLowerCase() === second.toLowerCase()
  )
}

// Re-export some web3-utils functions
export { isAddress } from 'web3-utils'

export function formatAddress(address) {
  return format.address(address, 1)
}
