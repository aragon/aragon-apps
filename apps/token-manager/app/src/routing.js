const HOLDER_ADDRESS_PATH = /^\/vesting\/0x[a-fA-F0-9]{40}\/?$/

export function holderFromPath(path) {
  if (!path) {
    return null
  }
  const matches = path.match(HOLDER_ADDRESS_PATH)
  return matches ? matches[0].split('/')[2].toLowerCase() : null
}

export function pathFromHolder(holder) {
  return String(holder) === null ? '' : `/vesting/${holder}/`
}
