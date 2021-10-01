export async function getUserBalanceAt(
  connectedAccount,
  snapshotBlock,
  tokenContract,
  tokenDecimals
) {
  if (!tokenContract || !connectedAccount) {
    return -1
  }

  const balance = await tokenContract
    .balanceOfAt(connectedAccount, snapshotBlock)
    .toPromise()

  return Math.floor(parseInt(balance, 10) / Math.pow(10, tokenDecimals))
}

export async function getUserBalanceNow(
  connectedAccount,
  tokenContract,
  tokenDecimals
) {
  if (!tokenContract || !connectedAccount) {
    return -1
  }

  const balance = await tokenContract.balanceOf(connectedAccount).toPromise()

  return Math.floor(parseInt(balance, 10) / Math.pow(10, tokenDecimals))
}
