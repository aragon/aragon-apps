export const All = Symbol('All')
export const Incoming = Symbol('Incoming')
export const Outgoing = Symbol('Outgoing')

const symbolMapping = {
  All,
  Incoming,
  Outgoing,
}
const stringMapping = {
  [All]: 'All',
  [Incoming]: 'Incoming',
  [Outgoing]: 'Outgoing',
}

export function convertFromString(str) {
  return symbolMapping[str]
}
export function convertToString(symbol) {
  return stringMapping[symbol]
}
