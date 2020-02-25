import BN from 'bn.js'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'

// Use this function to sort by ETH and then token symbol
const compareBalancesByEthAndSymbol = (tokenA, tokenB) => {
  if (tokenA.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return -1
  }
  if (tokenB.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return 1
  }
  return tokenA.symbol.localeCompare(tokenB.symbol)
}

function appStateReducer(state) {
  const { balances, transactions } = state || {}

  const balancesBn = balances
    ? balances
        .map(balance => ({
          ...balance,
          amount: new BN(balance.amount),
          decimals: new BN(balance.decimals),

          // Note that numbers in `numData` are not safe for accurate
          // computations (but are useful for making divisions easier).
          numData: {
            amount: parseInt(balance.amount, 10),
            decimals: parseInt(balance.decimals, 10),
          },
        }))
        .sort(compareBalancesByEthAndSymbol)
    : []

  const transactionsBn = transactions
    ? transactions.map(transaction => ({
        ...transaction,
        amount: new BN(transaction.amount),
        numData: {
          amount: parseInt(transaction.amount, 10),
        },
      }))
    : []

  return {
    ...state,

    tokens: balancesBn.map(
      ({ address, name, symbol, numData: { amount, decimals }, verified }) => ({
        address,
        amount,
        decimals,
        name,
        symbol,
        verified,
      })
    ),

    // Filter out empty balances
    balances: balancesBn.filter(balance => !balance.amount.isZero()),

    transactions: transactionsBn,
  }
}

export default appStateReducer
