export function hasSameTokenPerHolder(holders, tokenDecimalsBase) {
  // We assume that a token is liquid if a single holder
  // has more than one token.
  const singleHolder =
    holders.length === 1 && !holders[0].balance.eq(tokenDecimalsBase)

  const sameBalances =
    holders.length > 0 &&
    holders[0].balance.gt(0) &&
    holders.every(({ balance }) => balance.eq(holders[0].balance))

  // Be in group mode if everyone has the same balances,
  // unless there's only one token holder.
  return sameBalances && !singleHolder
}
