export async function getUserBalanceAt(account, snapshotBlock, tokenContract) {
  if (!tokenContract || !account) {
    return '-1'
  }
  return tokenContract.balanceOfAt(account, snapshotBlock).toPromise()
}

export async function getUserBalanceNow(account, tokenContract) {
  if (!tokenContract || !account) {
    return '-1'
  }
  return tokenContract.balanceOf(account).toPromise()
}
