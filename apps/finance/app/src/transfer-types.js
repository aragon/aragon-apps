export const All = Symbol('ALL_TRANSFER')
export const Incoming = Symbol('INCOMING_TRANSFER')
export const Outgoing = Symbol('OUTGOING_TRANSFER')

const AVAILABLE_TRANSFER_TYPES = [
  [All, 'All'],
  [Incoming, 'Incoming'],
  [Outgoing, 'Outgoing'],
]

export const TRANSFER_TYPES = AVAILABLE_TRANSFER_TYPES.map(([type]) => type)
export const TRANSFER_TYPES_LABELS = AVAILABLE_TRANSFER_TYPES.map(
  ([_, label]) => label
)
