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
  console.log('Retry every: ', app)

  return app.store(
    async (state, event) => {
      console.log('------>> app.store: state, event: ', state, event)
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
  console.log('-------> initial state: cachedState: ', cachedState)
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
    {
      amount: '1c229266385bbc0000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '2',
      token: '0xc42dA14B1C0AE7d4dd3946633f1046c3D46f3101',
      date: 1547633868000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x26eb2dc365013d4cbb54a71f7c58ff5e758b06f5a41492d75edc9f985ad05084',
      id: '1',
      numData: { amount: 519000000000000000000 },
    },
    {
      amount: 'cd9092451f7940000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '4',
      token: '0x5b2fDbBA47E8AE35b9d6f8E1480703334f48B96C',
      date: 1552414088000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x0268e698e0ac1d9b585f310a90ae0a85a48a089de4b56a4a7b1a866e2ae77148',
      id: '2',
      numData: { amount: 237000000000000000000 },
    },
    {
      amount: '63bf212b431ec0000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '4',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1553186033000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x004f1f663950f4cc3a2ef717eab50d22b19738c281b1c54428921f1d751629d4',
      id: '3',
      numData: { amount: 115000000000000000000 },
    },
    {
      amount: '2b0af6a9352c280000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '4',
      token: '0x51E53b52555A4AB7227423a7761cc8E418B147c8',
      date: 1553186063000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0xd28088da9c948a822bd65917598dbb8e87dd42b80019a2a5c672734184da82e1',
      id: '4',
      numData: { amount: 794000000000000000000 },
    },
    {
      amount: '38d7ea4c68000',
      entity: '0x3bD60bafEa8A7768C6f4352AF4Cfe01701884Ff2',
      isIncoming: true,
      paymentId: '0',
      periodId: '4',
      token: '0x0000000000000000000000000000000000000000',
      date: 1553773734000,
      reference: 'Ether transfer to Finance app',
      transactionHash:
        '0x3cf45784b163aa8fa63cdc245defa9a9738ed40a204e23c27c5f94c0b167336f',
      id: '5',
      numData: { amount: 1000000000000000 },
    },
    {
      amount: '15af1d78b58c40000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '7',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1561453936000,
      reference:
        'Testing issue: https://github.com/aragon/aragon-apps/issues/888',
      transactionHash:
        '0x569ada12881db6e48937b01cfc17ff2b53650415d953a2b43db1382bc01b44c3',
      id: '6',
      numData: { amount: 25000000000000000000 },
    },
    {
      amount: '56bc75e2d63100000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '7',
      token: '0xc42dA14B1C0AE7d4dd3946633f1046c3D46f3101',
      date: 1561453951000,
      reference:
        'Testing issue: https://github.com/aragon/aragon-apps/issues/888',
      transactionHash:
        '0x3f096cb54ac625469b6bfb1d50323d8445cfd2a91341589f974b215f3c59fe06',
      id: '7',
      numData: { amount: 100000000000000000000 },
    },
    {
      amount: '56bc75e2d63100000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '7',
      token: '0x5b2fDbBA47E8AE35b9d6f8E1480703334f48B96C',
      date: 1561453951000,
      reference:
        'Testing issue: https://github.com/aragon/aragon-apps/issues/888',
      transactionHash:
        '0x74e8be4a019bc5d785be8ff1853269511c7411a4492411f28d4321ca94a5d995',
      id: '8',
      numData: { amount: 100000000000000000000 },
    },
    {
      amount: '22e94b9bf117900000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x51E53b52555A4AB7227423a7761cc8E418B147c8',
      date: 1562064939000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0xc955c9c141375f3e6e29faace2031712e3e79dac4997a2028e90ef6e58b0709a',
      id: '9',
      numData: { amount: 644000000000000000000 },
    },
    {
      amount: '7ce66c50e28400000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x0D5263B7969144a852D58505602f630f9b20239D',
      date: 1562064954000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0xb8bb0223670ddcce86a942bcdff3589ce65d3c56cd794f9fa8f6fc5175b7cc9f',
      id: '10',
      numData: { amount: 144000000000000000000 },
    },
    {
      amount: '9f98351204fe00000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1562064954000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x643b9e3bf8d03a31ef20601a660b29ef32e28b235449e8756c3cd05f9f775a7c',
      id: '11',
      numData: { amount: 184000000000000000000 },
    },
    {
      amount: 'a076407d3f7440000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x0D5263B7969144a852D58505602f630f9b20239D',
      date: 1562064954000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x2b351e2df1b5660c003ddb4b3e8c6eee8b24df468d26b31926eb0dc0e1095a5b',
      id: '12',
      numData: { amount: 185000000000000000000 },
    },
    {
      amount: '253e0a4c1e355c0000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x5b2fDbBA47E8AE35b9d6f8E1480703334f48B96C',
      date: 1562064954000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x50f1ebd16ea7e9306ff2d89636862ab9c67b777b27c08f6c788c4e6d581e947d',
      id: '13',
      numData: { amount: 687000000000000000000 },
    },
    {
      amount: '199650db3ca0600000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1562064954000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x3f89119a270552fb45d84a059807436eefd1e291ae19590d07b1efa043bef037',
      id: '14',
      numData: { amount: 472000000000000000000 },
    },
    {
      amount: '2559cbb98584240000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1562064969000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0xe1883142bbf68c60932e4d92ebc1071a3b00350e573c373ff458f54074de4f06',
      id: '15',
      numData: { amount: 689000000000000000000 },
    },
    {
      amount: '3643aa647986040000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '7',
      token: '0x51E53b52555A4AB7227423a7761cc8E418B147c8',
      date: 1562065209000,
      reference: 'Testing thousands commas',
      transactionHash:
        '0x9af352902c71da9df284f6970a547b314046cc7be972fa139d0b04327abf66c3',
      id: '16',
      numData: { amount: 1.001e21 },
    },
    {
      amount: '3643aa647986040000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: true,
      paymentId: '0',
      periodId: '7',
      token: '0x51E53b52555A4AB7227423a7761cc8E418B147c8',
      date: 1562065299000,
      reference: 'Incoming thousand transfer',
      transactionHash:
        '0x676b5f7e2a8b83a4a05960f57af4197d74ce29a93ffc9adecc538ce015d3ac68',
      id: '17',
      numData: { amount: 1.001e21 },
    },
    {
      amount: 'a1544be879ea80000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1563364009000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x312f92910ade57201283276efd0dcbcbdadf13d4f00b371b72a4aa8d66c46f10',
      id: '18',
      numData: { amount: 186000000000000000000 },
    },
    {
      amount: '155bd9307f9fe80000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x51E53b52555A4AB7227423a7761cc8E418B147c8',
      date: 1563364024000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x49f5c1f121374c304c399bd5afdd3b9852ecba2bf2f228c1eb4f8c61345ac16f',
      id: '19',
      numData: { amount: 394000000000000000000 },
    },
    {
      amount: 'de0b6b3a7640000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '8',
      token: '0xc42dA14B1C0AE7d4dd3946633f1046c3D46f3101',
      date: 1563457439000,
      reference: 'This address deserves one MKR',
      transactionHash:
        '0x4cbca2ad0f20c1f08f265b4dcbb1b055eb0688baa270f098eb4dd7bb86138156',
      id: '20',
      numData: { amount: 1000000000000000000 },
    },
    {
      amount: '38d7ea4c68000',
      entity: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x0000000000000000000000000000000000000000',
      date: 1563457574000,
      reference: 'Go get yourself something pretty',
      transactionHash:
        '0x018df1231e589e7f9bf2e187b6e12164eaf2544ace66722a69befb68627b1fba',
      id: '21',
      numData: { amount: 1000000000000000 },
    },
    {
      amount: '1bc16d674ec80000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x0000000000000000000000000000000000000000',
      date: 1563457649000,
      reference: 'Thanks for all the fish',
      transactionHash:
        '0xa635ece6fb5d81b24d30692f30ca2536e3c28323580f22735e7ada49d088a3f0',
      id: '22',
      numData: { amount: 2000000000000000000 },
    },
    {
      amount: '8ac7230489e80000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c',
      date: 1563457859000,
      reference: 'Share some love with Xeenus (?!?)',
      transactionHash:
        '0x1fb4b597882e24449e91cd730c718d118e5cbd4c5341383e4a3c816e97feff22',
      id: '23',
      numData: { amount: 10000000000000000000 },
    },
    {
      amount: 'de0b6b3a7640000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: false,
      paymentId: '0',
      periodId: '8',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1563463829000,
      reference: '🤙',
      transactionHash:
        '0xac5f829f35ccd83b7ff9b54841090abfdea756da4687a63bc4b1054771183762',
      id: '24',
      numData: { amount: 1000000000000000000 },
    },
    {
      amount: '4fcc1a89027f00000',
      entity: '0x39a4D265db942361D92e2B0039cae73Ea72a2ff9',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x4fC6e3B791560f25ed4c1bf5E2dB9aB0D0E80747',
      date: 1564660291000,
      reference: 'Requested airdrop (test tokens)',
      transactionHash:
        '0x2c31ad566d54d1f957c0d5f75fdfa963fca198bd442aa7cf5ddc00e0f2bd7d61',
      id: '25',
      numData: { amount: 92000000000000000000 },
    },
    {
      amount: 'de0b6b3a7640000',
      entity: '0xD395D4A9753310F3940DE2673C70c251224E3d07',
      isIncoming: true,
      paymentId: '0',
      periodId: '8',
      token: '0x5e381AfB0104d374F1F3CcDE5bA7Fe8f5b8af0E6',
      date: 1564660381000,
      reference: 'This is a large reference for whoever reads it.',
      transactionHash:
        '0x362b15b0396b7d926ff571db9fdb16bc139cfaa99acc8dd8e07665beeb4ccb64',
      id: '26',
      numData: { amount: 1000000000000000000 },
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
