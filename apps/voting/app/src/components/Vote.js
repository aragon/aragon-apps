import React, { useCallback } from 'react'
import { Badge, Box, IconTime, Text, Timer, Split, useTheme } from '@aragon/ui'
import { useAppState } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import VoteText from './VoteText'
import VoteStatus from './VoteStatus'
import SummaryBar from './SummaryBar'
import VoteSummary from './VoteSummary'
import VoteActions from './VoteActions'
import { getQuorumProgress } from '../vote-utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { round, safeDiv } from '../math-utils'

function Vote({ vote, onVote, onExecute }) {
  const theme = useTheme()
  const { tokenDecimals, tokenSymbol } = useAppState()
  const { data, numData } = vote
  const { minAcceptQuorum, supportRequired, yea, nay } = numData
  const { creator, endDate, open, metadata, description } = data
  const quorumProgress = getQuorumProgress(vote)
  const totalVotes = yea + nay
  const votesYeaVotersSize = safeDiv(yea, totalVotes)
  const votesNayVotersSize = safeDiv(nay, totalVotes)
  const handleVoteNo = useCallback(() => {
    onVote(vote.voteId, VOTE_NAY)
  }, [onVote, vote.voteId])

  const handleVoteYes = useCallback(() => {
    onVote(vote.voteId, VOTE_YEA)
  }, [onVote, vote.voteId])

  const handleExecute = useCallback(() => {
    onExecute(vote.voteId)
  }, [onExecute, vote.voteId])

  if (!vote) {
    return null
  }

  return (
    <Split
      primary={
        <Box>
          <Badge.App>App badge</Badge.App>
          <div>
            {metadata && <VoteText text={metadata} />}
            {description && (
              <React.Fragment>
                <span>Description</span>
                <VoteText text={description} />
              </React.Fragment>
            )}
            <div>
              <span>Created By</span>
              <div
                css={`
                  display: flex;
                  align-items: center;
                `}
              >
                <LocalIdentityBadge entity={creator} />
              </div>
            </div>
            <div>
              Current votes
              <VoteSummary
                vote={vote}
                tokenSymbol={tokenSymbol}
                tokenDecimals={tokenDecimals}
                ready
              />
            </div>
            <VoteActions
              onExecute={handleExecute}
              onVoteNo={handleVoteNo}
              onVoteYes={handleVoteYes}
              vote={vote}
            />
          </div>
        </Box>
      }
      secondary={
        <React.Fragment>
          <Box heading="Status">
            {open ? (
              <Timer end={endDate} maxUnits={4} />
            ) : (
              <React.Fragment>
                <VoteStatus vote={vote} cardStyle />
                <div>
                  <IconTime size="small" />
                  {endDate.toString()}
                </div>
              </React.Fragment>
            )}
          </Box>
          <Box heading="Relative support %">
            <div>
              {round(quorumProgress * 100, 2)}%{' '}
              <Text size="small" color={theme.textSecondary}>
                ({round(minAcceptQuorum * 100, 2)}% needed)
              </Text>
            </div>
            <SummaryBar
              css="margin-top: 10px"
              positiveSize={quorumProgress}
              requiredSize={minAcceptQuorum}
              show
            />
          </Box>
          <Box heading="Minimum approval %">
            <span>
              <Text color={theme.textSecondary} smallcaps>
                Votes{' '}
              </Text>
              <Text size="xsmall" color={theme.textSecondary}>
                ({Math.round(supportRequired * 100)}% support needed for
                approval)
              </Text>
            </span>
            <SummaryBar
              positiveSize={votesYeaVotersSize}
              negativeSize={votesNayVotersSize}
              requiredSize={supportRequired}
              show
            />
          </Box>
        </React.Fragment>
      }
    />
  )
}

export default Vote
