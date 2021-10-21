const ETH_ADDRESS_SPLIT_REGEX = /(0x[a-fA-F0-9]{40}(?:\b|\.|,|\?|!|;))/g
const ETH_ADDRESS_TEST_REGEX = /(0x[a-fA-F0-9]{40}(?:\b|\.|,|\?|!|;))/g

export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

// Detect Ethereum addresses in a string and transform each part.
//
// `callback` is called on every part with two params:
//   - The string of the current part.
//   - A boolean indicating if it is an address.
//
export function transformAddresses(str, callback) {
  return str
    .split(ETH_ADDRESS_SPLIT_REGEX)
    .map((part, index) =>
      callback(part, ETH_ADDRESS_TEST_REGEX.test(part), index)
    )
}

/**
 * Check address equality without checksums
 * @param {string} first First address
 * @param {string} second Second address
 * @returns {boolean} Address equality
 */
export function addressesEqual(first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

/**
 * @param {*} api aragon api
 * @returns {object} Latest block number and timestamp in miliseconds
 */
export const loadLatestBlock = async api => {
  const { number, timestamp } = await api
    .web3Eth('getBlock', 'latest')
    .toPromise()

  return { number, timestamp: timestamp * 1000 }
}

/**
 * @param {object} api aragon api
 * @param {number} blockNumber  block number
 * @returns {number} timestamp of the #blockNumber block in miliseconds
 */
export const loadBlockTimestamp = async (api, blockNumber) => {
  const { timestamp } = await api.web3Eth('getBlock', blockNumber).toPromise()
  // Adjust for solidity time (s => ms)
  return timestamp * 1000
}
