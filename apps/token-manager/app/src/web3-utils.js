import { isAddress } from '@aragon/ui'

// Check address equality
export function addressesEqual(first, second) {
  return (
    isAddress(first) &&
    isAddress(second) &&
    first.toLowerCase() === second.toLowerCase()
  )
}

// Re-export isAddress
export { isAddress }
