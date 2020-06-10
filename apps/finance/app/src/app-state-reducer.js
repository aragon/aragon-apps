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
        }))
        .sort(compareBalancesByEthAndSymbol)
    : []

  const transactionsBn = transactions
    ? transactions.map(transaction => ({
        ...transaction,
        amount: new BN(transaction.amount),
      }))
    : []

  return {
    ...state,

    tokens: balancesBn.map(
      ({ address, amount, decimals, name, symbol, verified }) => ({
        address,
        // TODO: we should remove `amount` from this interface in the future, but right now it
        // is the easiest way to tell components that this org holds this token
        amount,
        decimals: decimals.toNumber(),
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
