export const All = Symbol('ALL_TRANSFER')
export const Incoming = Symbol('INCOMING_TRANSFER')
export const Outgoing = Symbol('OUTGOING_TRANSFER')

export const READABLE_TRANSFER_TYPES = {
  [All]: 'All',
  [Incoming]: 'Incoming',
  [Outgoing]: 'Outgoing',
}

export const TRANSFER_TYPES = Object.keys(READABLE_TRANSFER_TYPES)
export const TRANSFER_TYPES_LABELS = Object.values(READABLE_TRANSFER_TYPES)
