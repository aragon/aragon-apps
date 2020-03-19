export const All = 'ALL_TRANSFER'
export const Incoming = 'INCOMING_TRANSFER'
export const Outgoing = 'OUTGOING_TRANSFER'

export const TRANSFER_TYPES_LABELS = {
  [All]: 'All',
  [Incoming]: 'Incoming',
  [Outgoing]: 'Outgoing',
}

export const TRANSFER_TYPES = Object.keys(TRANSFER_TYPES_LABELS)
export const READABLE_TRANSFER_TYPES = Object.values(TRANSFER_TYPES_LABELS)
