export function convertToString(constant) {
  return stringMapping[constant]
}

// Because these are passed between the background script and the app, we don't use symbols
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#Supported_types
export const All = 'ALL'
export const Transfer = 'TRANSFER_TRANSACTION'
export const Deposit = 'DEPOSIT_TRANSACTION'
export const Execution = 'EXECUTION_TRANSACTION'
export const Unknown = 'UNKNOWN_TRANSACTION'

const stringMapping = {
  [All]: 'All',
  [Transfer]: 'Transfer',
  [Deposit]: 'Deposit',
  [Execution]: 'Execution',
  [Unknown]: 'Unknown',
}

export const TRANSACTION_TYPES = [All, Transfer, Deposit, Execution, Unknown]

export const TRANSACTION_TYPES_LABELS = {
  [All]: 'All',
  [Transfer]: 'Transfer',
  [Deposit]: 'Deposit',
  [Execution]: 'Execution',
  [Unknown]: 'Unknown',
}

export const TRANSACTION_TYPES_STRING = TRANSACTION_TYPES.map(convertToString)
