export const All = Symbol('ALL_TRANSFER')
export const Incoming = Symbol('INCOMING_TRANSFER')
export const Outgoing = Symbol('OUTGOING_TRANSFER')

const READABLE_TRANSFER_TYPES = {
  [All]: 'All',
  [Incoming]: 'Incoming',
  [Outgoing]: 'Outgoing',
}

// As we're using symbols as object keys,
// we need to use Reflect.ownKeys to properly retrieve and iterate
// over the object values.
export const TRANSFER_TYPES = Reflect.ownKeys(READABLE_TRANSFER_TYPES)
export const TRANSFER_TYPES_LABELS = Reflect.ownKeys(
  READABLE_TRANSFER_TYPES
).map(type => READABLE_TRANSFER_TYPES[type])
