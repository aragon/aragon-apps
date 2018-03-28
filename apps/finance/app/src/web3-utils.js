// Check address equality without checksums
export function addressesEqual(first, second) {
  first = first && removeChecksum(first)
  second = second && removeChecksum(second)
  return first === second
}

export function removeChecksum(address) {
  return address.toLowerCase()
}
