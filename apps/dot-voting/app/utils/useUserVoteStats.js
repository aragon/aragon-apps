import { useEffect, useState } from 'react'
import { BigNumber } from 'bignumber.js'
import { first } from 'rxjs/operators' // Make sure observables have .first
import { useAragonApi } from '../api-react'
import tokenBalanceOfAbi from '../abi/token-balanceof.json'

const tokenAbi = [].concat(tokenBalanceOfAbi)

// TODO: apply cleanups to the useEffects since this is generating errors in the browser:
/* 
react-dom.development.js:558 Warning: Can't perform a React state update on an unmounted
    component. This is a no-op, but it indicates a memory leak in your application. To fix,
    cancel all subscriptions and asynchronous tasks in a useEffect cleanup function.
    in VotingCard (created by Votes)
*/
const useUserVoteStats = vote => {
  const { api, appState: { tokenAddress = '' }, connectedAccount } = useAragonApi()
  const [ voteWeights, setVoteWeights ] = useState([])
  const [ votingPower, setVotingPower ] = useState('0')
  const tokenContract = tokenAddress && api.external(tokenAddress, tokenAbi)

  useEffect(() => {
    if (tokenContract && connectedAccount) {
      tokenContract.balanceOfAt(connectedAccount, vote.data.snapshotBlock)
        .pipe(first())
        .subscribe(userBalance => {
          setVotingPower(userBalance)
        })
    }
  }, [ connectedAccount, tokenContract, vote.data.snapshotBlock ])

  useEffect(() => {
    (async () => {
      const votesPerOption = await api
        .call('getVoterState', vote.voteId, connectedAccount)
        .toPromise()

      setVoteWeights(votesPerOption.map(votes =>
        BigNumber(votes)
          .div(votingPower)
          .times(100)
          .dp(2)
          .toString()
      ))
    })()
  }, [ connectedAccount, vote.voteId, votingPower ])

  return { voteWeights, votingPower }
}

export default useUserVoteStats
