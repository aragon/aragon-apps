import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useAragonApi } from '../../api-react'
import { useTheme } from '@aragon/ui'
import { getVoteStatus } from '../../utils/vote-utils'
import { VOTE_STATUS_SUCCESSFUL } from '../../utils/vote-types'
import VotingOptions from '../VotingOptions'
import Label from './Label'
import VoteEnact from './VoteEnact'

const VotingResults = ({ vote, voteWeights, decimals }) => {
  const theme = useTheme()
  const { appState: { globalMinQuorum = 0 } } = useAragonApi()

  const [ totalSupport, setTotalSupport ] = useState(0)
  useEffect(() => {
    setTotalSupport(vote.data.options.reduce(
      (total, option) => total + parseFloat(option.value, 10),
      0
    ))
  }, [vote.data.options])

  return (
    <React.Fragment>
      <Label>
        Current Results
      </Label>
      <div>
        <VotingOptions
          fontSize="small"
          options={vote.data.options}
          totalSupport={totalSupport}
          color={`${theme.accent}`}
          voteWeights={voteWeights}
          voteOpen={vote.open}
          balance={vote.data.balance}
          symbol={vote.data.tokenSymbol}
          decimals={decimals}
          displayYouBadge={true}
        />
      </div>
      {!vote.open &&
        getVoteStatus(vote, globalMinQuorum) === VOTE_STATUS_SUCCESSFUL && (
        <VoteEnact voteId={vote.voteId} />
      )}
    </React.Fragment>
  )
}

VotingResults.propTypes = {
  vote: PropTypes.object.isRequired,
  voteWeights: PropTypes.PropTypes.arrayOf(PropTypes.string).isRequired,
  decimals: PropTypes.number.isRequired,
}

export default VotingResults
