// Because these are passed between the background script and the app, we don't use symbols
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#Supported_types
export const Transfer = 'TRANSFER_TRANSACTION'
export const Deposit = 'DEPOSIT_TRANSACTION'
export const Execution = 'EXECUTION_TRANSACTION'
export const Unknown = 'UNKNOWN_TRANSACTION'

const stringMapping = {
  [Transfer]: 'Transfer',
  [Deposit]: 'Deposit',
  [Execution]: 'Execution',
  [Unknown]: 'Unknown',
}

const constantMapping = {
  Transfer: [Transfer],
  Deposit: [Deposit],
  Execution: [Execution],
  Unknown: [Unknown],
}

export function convertFromString(str) {
  return constantMapping[str]
}

export function convertToString(constant) {
  return stringMapping[constant]
}
