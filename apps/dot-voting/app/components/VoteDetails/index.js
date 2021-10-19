import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BigNumber } from 'bignumber.js'
import { Box, Button, GU, Split, Text, textStyle } from '@aragon/ui'
import { useAragonApi } from '../../api-react'
import { first } from 'rxjs/operators' // Make sure observables have .first
import LocalIdentityBadge from '../LocalIdentityBadge/LocalIdentityBadge'
import DetailedAppBadge from './DetailedAppBadge'
import useUserVoteStats from '../../utils/useUserVoteStats'
import Status from './Status'
import VotingResults from './VotingResults'
import CastVote from './CastVote'
import Participation from './Participation'
import Label from './Label'
import tokenDecimalsAbi from '../../abi/token-decimals.json'

const tokenAbi = [].concat(tokenDecimalsAbi)

const VoteDetails = ({ vote, onVote }) => {
  const { api, appState: { tokenAddress = '' }, connectedAccount } = useAragonApi()
  const [ votingMode, setVotingMode ] = useState(false)
  const [ canIVote, setCanIVote ] = useState(false)
  const [ decimals, setDecimals ] = useState(0)
  const toggleVotingMode = () => setVotingMode(!votingMode)
  const { description, voteId, data: { creator, executionTargetData, type } } = vote
  const { voteWeights, votingPower } = useUserVoteStats(vote)
  const tokenContract = tokenAddress && api.external(tokenAddress, tokenAbi)

  useEffect(() => {
    if (tokenContract && connectedAccount) {
      tokenContract.decimals()
        .subscribe(decimals => {
          setDecimals(parseInt(decimals))
        })
    }
  }, [ connectedAccount, tokenContract ])

  useEffect(() => {
    if (connectedAccount && voteId) {
      api
        .call('canVote', voteId, connectedAccount)
        .pipe(first())
        .subscribe(canVote => {
          setCanIVote(canVote)
        })
    }
  }, [ api, connectedAccount, voteId ])

  // eslint-disable-next-line react/prop-types
  const youVoted = voteWeights.length > 0
  return (
    <Split
      primary={
        <Box>
          <div css={`
            > :not(:last-child) {
              margin-bottom: ${3 * GU}px;
            }
          `}>
            <DetailedAppBadge
              appAddress={executionTargetData.address}
              iconSrc={executionTargetData.iconSrc}
              identifier={executionTargetData.identifier}
              label={executionTargetData.name}
              youVoted={youVoted}
            />
            <h2 css={textStyle('title2')}>
              {description}
            </h2>
            <div css="display: flex; align-items: baseline">
              <Label>
                Created By
              </Label>
              <div css={`margin-left: ${GU}px`}>
                <LocalIdentityBadge
                  key={creator}
                  entity={creator}
                />
              </div>
            </div>

            {type === 'allocation' && (
              <React.Fragment>
                <Label>
                  Amount
                </Label>
                <Text.Block size="large">
                  {
                    BigNumber(vote.data.balance)
                      .div(BigNumber(10 ** (decimals || 18))) // added fallback to prevent flashing on delayed decimals calls. We should avoid this by getting this info in the store
                      .toString()
                  } {vote.data.tokenSymbol}
                </Text.Block>
              </React.Fragment>
            )}

            {!votingMode && vote.open && canIVote && (
              <Button mode="strong" onClick={toggleVotingMode}>
                {youVoted ? 'Change vote' : 'Vote'}
              </Button>
            )}

            {votingMode ? (
              <CastVote
                onVote={onVote}
                toggleVotingMode={toggleVotingMode}
                vote={vote}
                voteWeights={voteWeights}
                votingPower={votingPower}
              />
            ) : (
              <VotingResults
                vote={vote}
                voteWeights={voteWeights}
                decimals={decimals}
              />
            )}
          </div>
        </Box>
      }
      secondary={
        <React.Fragment>
          <Status vote={vote} />
          <Participation vote={vote} />
        </React.Fragment>
      }
    />
  )
}

VoteDetails.propTypes = {
  vote: PropTypes.object.isRequired,
  onVote: PropTypes.func.isRequired,
}

export default VoteDetails
