import { useCallback, useMemo } from 'react'
import { useAragonApi } from '../api-react'
import BigNumber from 'bignumber.js'

export default () => {
  const { appState } = useAragonApi()
  const { bountySettings = {} } = appState

  const bounties = useMemo(() => (appState.issues || []).reduce(
    (obj, i) => { obj[i.issueNumber] = i; return obj },
    {}
  ), [appState.issues])

  const tokens = useMemo(() => (appState.tokens || []).reduce(
    (obj, t) => { obj[t.addr] = t; return obj },
    {}
  ), [appState.tokens])

  const shapeIssue = useCallback(issue => {
    const bounty = bounties[issue.number]
    const repoIdFromBounty = bounty && bounty.data.repoId
    if ((bounty && tokens[bounty.data.token]) && repoIdFromBounty === issue.repository.id) {
      const data = bounties[issue.number].data
      const balance = BigNumber(bounties[issue.number].data.balance)
        .div(BigNumber(10 ** tokens[data.token].decimals))
        .dp(3)
        .toString()

      return {
        ...issue,
        ...bounties[issue.number].data,
        repoId: issue.repository.id,
        repo: issue.repository.name,
        symbol: tokens[data.token].symbol,
        expLevel: bountySettings.expLvls[data.exp].name,
        balance: balance,
        data,
      }
    }
    return {
      ...issue,
      repoId: issue.repository.id,
      repo: issue.repository.name,
    }
  }, [ bounties, bountySettings.expLvls, tokens ])

  return shapeIssue
}
