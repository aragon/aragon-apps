import buildStubbedApiReact from '../../../shared/api-react'

const initialState = process.env.NODE_ENV !== 'production' && {
  accounts: [], // in actual script.js appState, but ignored by appStateReducer in dev mode!
  budgets: [], // created by appStateReducer; we could move this to script.js
  balances: [
    String(1e18),
    String(20e18),
    String(30e18),
    String(40e18),
    String(50e18),
    String(60e18),
    String(70e18),
    String(80e18),
    String(90e18),
  ],
  tokens: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: '18',
      balance: '100000000000000000000',
    },
    {
      address: '0xB1Aa712237895EF25fb8c6dA491Ba8662bB80256',
      symbol: 'autark',
      decimals: '18',
      balance: '100000000000000000000',
    },
  ],
  allocations: [],
  // allocations: [
  //   {
  //     date: String(new Date().getTime()),
  //     budget: 'Marketing',
  //     recipients: [
  //       {
  //         address: '0x75428BE833EFcAA951A466Ac58Db78A34B79104d',
  //         amount: String(8e18),
  //       },
  //       {
  //         address: '0x6635F83421Bf059cd8111f180f0727128685BaE4',
  //         amount: String(4e18),
  //       }
  //     ],
  //     description: 'Some important stuff',
  //     status: 0,
  //     amount: String(15e18),
  //     token: 'ETH'
  //   },
  //   {
  //     date: String(new Date().getTime()),
  //     budget: 'Hacktivism',
  //     recipients: [{
  //       address: '0x75428BE833EFcAA951A466Ac58Db78A34B79104d',
  //       amount: String(14e18),
  //     }],
  //     description: 'Fight against climate change',
  //     status: 1,
  //     amount: String(25e18),
  //     token: 'ETH'
  //   },
  //   {
  //     date: String(new Date().getTime()),
  //     budget: 'Offsites',
  //     recipients: [{
  //       address: '0x75428BE833EFcAA951A466Ac58Db78A34B79104d',
  //       amount: String(800e18),
  //     }],
  //     description: 'Is but yes',
  //     status: 2,
  //     amount: String(4500e18),
  //     token: 'DAI'
  //   },
  //   {
  //     date: String(new Date().getTime()),
  //     budget: 'Equipment',
  //     recipients: [{
  //       address: '0x75428BE833EFcAA951A466Ac58Db78A34B79104d',
  //       amount: String(800e18),
  //     }],
  //     description: 'Best money can get',
  //     status: 3,
  //     amount: String(4500e18),
  //     token: 'DAI'
  //   },
  // ],
  isSyncing: false,
}

const functions = process.env.NODE_ENV !== 'production' && ((appState, setAppState) => ({
  newAccount: (name, tokenAddress, hasBudget, amount) => setAppState({
    ...appState,
    budgets: [
      ...appState.budgets,
      {
        amount: String(amount),
        hasBudget,
        id: String(appState.budgets.length + 1),
        name,
        remaining: String(amount),
        token: appState.tokens.find(t => t.address === tokenAddress),
      }
    ]
  }),
}))

const { AragonApi, useAragonApi, usePath } = buildStubbedApiReact({ initialState, functions })

export { AragonApi, useAragonApi, usePath }
