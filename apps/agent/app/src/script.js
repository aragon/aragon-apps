import Aragon, { events } from '@aragon/api'

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 * Returns a promise that resolves with the callback's result if it (eventually) succeeds.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = async (
  callback,
  { initialRetryTimer = 1000, increaseFactor = 3, maxRetries = 3 } = {}
) => {
  const sleep = time => new Promise(resolve => setTimeout(resolve, time))

  let retryNum = 0
  const attempt = async (retryTimer = initialRetryTimer) => {
    try {
      return await callback()
    } catch (err) {
      if (retryNum === maxRetries) {
        throw err
      }
      ++retryNum

      // Exponentially backoff attempts
      const nextRetryTime = retryTimer * increaseFactor
      console.log(
        `Retrying in ${nextRetryTime}s... (attempt ${retryNum} of ${maxRetries})`
      )
      await sleep(nextRetryTime)
      return attempt(nextRetryTime)
    }
  }

  return attempt()
}

retryEvery(() => {
  return app.store(
    async (state, event) => {
      const { address: eventAddress, event: eventName } = event
      const nextState = {
        ...state,
      }

      if (eventName === events.SYNC_STATUS_SYNCING) {
        return { ...nextState, isSyncing: true }
      } else if (eventName === events.SYNC_STATUS_SYNCED) {
        return { ...nextState, isSyncing: false }
      }
    },
    {
      init: initializeState(),
      externals: [{}],
    }
  )
})

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

const initializeState = () => async cachedState => {
  const balances = [
    {
      decimals: '12',
      name: 'Ether',
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      amount: '1bc8886498550000',
      verified: true,
      numData: { amount: 2002000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'Aragon',
      symbol: 'ANT',
      address: '0x0d5263b7969144a852d58505602f630f9b20239d',
      amount: '11d5cacce21f840000',
      verified: true,
      numData: { amount: 329000000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'District0x',
      symbol: 'DNT',
      address: '0x5b2fdbba47e8ae35b9d6f8e1480703334f48b96c',
      amount: '2cab4c1242c9e00000',
      verified: true,
      numData: { amount: 824000000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'MakerDAO',
      symbol: 'MKR',
      address: '0xc42da14b1c0ae7d4dd3946633f1046c3d46f3101',
      amount: '16a8ea515751480000',
      verified: true,
      numData: { amount: 418000000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'Spankchain',
      symbol: 'SPANK',
      address: '0x5e381afb0104d374f1f3ccde5ba7fe8f5b8af0e6',
      amount: '57dfe4df92ec340000',
      verified: true,
      numData: { amount: 1.621e21, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'SwarmCity',
      symbol: 'SWT',
      address: '0x4fc6e3b791560f25ed4c1bf5e2db9ab0d0e80747',
      amount: '4fcc1a89027f00000',
      verified: true,
      numData: { amount: 92000000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: 'Xeenus 💪',
      symbol: 'XEENUS',
      address: '0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c',
      amount: '8ac7230489e80000',
      verified: true,
      numData: { amount: 10000000000000000000, decimals: 18 },
    },
    {
      decimals: '12',
      name: '',
      symbol: 'ZRX',
      address: '0x51e53b52555a4ab7227423a7761cc8e418b147c8',
      amount: '63501b75a5e3a00000',
      verified: true,
      numData: { amount: 1.832e21, decimals: 18 },
    },
  ]

  const tokens = [
    {
      address: '0x0000000000000000000000000000000000000000',
      amount: 2002000000000000000,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
      verified: true,
    },
    {
      address: '0x0d5263b7969144a852d58505602f630f9b20239d',
      amount: 329000000000000000000,
      decimals: 18,
      name: 'Aragon',
      symbol: 'ANT',
      verified: true,
    },
    {
      address: '0x1e1cab55639f67e70973586527ec1dfdaf9bf764',
      amount: 0,
      decimals: 18,
      name: 'Bitconnect',
      symbol: 'BCC',
      verified: true,
    },
    {
      address: '0x0527e400502d0cb4f214dd0d2f2a323fc88ff924',
      amount: 0,
      decimals: 18,
      name: 'Dai',
      symbol: 'DAI',
      verified: true,
    },
    {
      address: '0x5b2fdbba47e8ae35b9d6f8e1480703334f48b96c',
      amount: 824000000000000000000,
      decimals: 18,
      name: 'District0x',
      symbol: 'DNT',
      verified: true,
    },
    {
      address: '0x6142214d83670226872d51e935fb57bec8832a60',
      amount: 0,
      decimals: 18,
      name: 'Decentraland',
      symbol: 'MANA',
      verified: true,
    },
    {
      address: '0xc42da14b1c0ae7d4dd3946633f1046c3d46f3101',
      amount: 418000000000000000000,
      decimals: 18,
      name: 'MakerDAO',
      symbol: 'MKR',
      verified: true,
    },
    {
      address: '0xa53899a7eb70b309f05f8fdb344cdc8c8f272abe',
      amount: 0,
      decimals: 18,
      name: 'Status',
      symbol: 'SNT',
      verified: true,
    },
    {
      address: '0x5e381afb0104d374f1f3ccde5ba7fe8f5b8af0e6',
      amount: 1.621e21,
      decimals: 18,
      name: 'Spankchain',
      symbol: 'SPANK',
      verified: true,
    },
    {
      address: '0x4fc6e3b791560f25ed4c1bf5e2db9ab0d0e80747',
      amount: 92000000000000000000,
      decimals: 18,
      name: 'SwarmCity',
      symbol: 'SWT',
      verified: true,
    },
    {
      address: '0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c',
      amount: 10000000000000000000,
      decimals: 18,
      name: 'Xeenus 💪',
      symbol: 'XEENUS',
      verified: true,
    },
    {
      address: '0x51e53b52555a4ab7227423a7761cc8e418b147c8',
      amount: 1.832e21,
      decimals: 18,
      name: '',
      symbol: 'ZRX',
      verified: true,
    },
  ]
  const transactions = [
    //    {
    //      id,  // <transactionHash>.<transactionIndex>.<logIndex>; not meant to be shown to humans
    //      date,  // Similar to Finance's; in milliseconds as a normal number
    //      description,  // string
    //      safe,  // boolean; only true if `SafeExecute()` was used (for later use)
    //      tokenTransfers: [
    //        {
    //          amount,  // string; BN number
    //          from,  // address of sender if transfer was to the Agent app, null if not
    //          to,  // address of the recipient if transfer was from the Agent app, null if not
    //          token,  // token address
    //        }
    //      ],
    //      transactionHash, // string bytes64 hash for the transaction
    //      type, // string; see transaction-types.js (one of 'direct deposit', 'direct transfer', or 'contract interaction')
    //    },
    {
      id: '0.0.0',
      date: 0,
      description: 'Description 1',
      safe: true,
      tokenTransfers: [
        {
          amount: 1000000000000,
          from: null,
          to: '0x447ae38c0dc4126b10b5560bedb2c9c837b69dc9',
          token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
        },
      ],
      transactionHash:
        '0x362b15b0396b7d926ff571db9fdb16bc139cfaa99acc8dd8e07665beeb4ccb64',
      type: 'direct deposit',
    },
    {
      id: '0.0.1',
      date: 1567159876315,
      description: 'Description 2',
      safe: true,
      tokenTransfers: [
        {
          amount: 1000000000000000,
          from: '0x39a4d265db942361d92e2b0039cae73ea72a2ff9',
          to: null,
          token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
        },
      ],
      transactionHash:
        '0x362b15b0396b7d926ff571db9fdb16bc139cfaa99acc8dd8e07665beeb4ccb64',
      type: 'direct transfer',
    },
    {
      id: '0.0.2',
      date: 1567076912953,
      description: 'Description 3',
      safe: true,
      tokenTransfers: [
        {
          amount: 2000000000000,
          from: null, // from agent
          to: '0x39a4d265db942361d92e2b0039cae73ea72a2ff9',
          token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
        },
        {
          amount: 1000000000000,
          from: '0x39a4d265db942361d92e2b0039cae73ea72a2ff9',
          to: null, // to agent
          token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
        },
      ],
      transactionHash:
        '0x362b15b0396b7d926ff571db9fdb16bc139cfaa99acc8dd8e07665beeb4ccb64',
      type: 'contract interaction',
    },
  ]

  const newState = {
    tokens,
    transactions,
    balances,
    ...cachedState,
    isSyncing: false,
  }

  return newState
}
