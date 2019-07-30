import React, { useCallback } from 'react'
import {
  Badge,
  Box,
  GU,
  IconCheck,
  IconTime,
  Split,
  Text,
  Timer,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useAppState } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import VoteText from './VoteText'
import VoteStatus from './VoteStatus'
import SummaryBar from './SummaryBar'
import SummaryRows from './SummaryRows'
import VoteSummary from './VoteSummary'
import VoteActions from './VoteActions'
import { getQuorumProgress } from '../vote-utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { percentageList, round, safeDiv } from '../math-utils'

function Vote({ vote, onVote, onExecute }) {
  const theme = useTheme()
  const { tokenDecimals, tokenSymbol } = useAppState()
  const { data, numData, voteId, connectedAccountVote } = vote
  const { minAcceptQuorum, supportRequired, yea, nay } = numData
  const { creator, endDate, open, metadata, description } = data
  const quorumProgress = getQuorumProgress(vote)
  const totalVotes = yea + nay
  const votesYeaVotersSize = safeDiv(yea, totalVotes)
  const votesNayVotersSize = safeDiv(nay, totalVotes)
  const youVoted =
    connectedAccountVote === VOTE_YEA || connectedAccountVote === VOTE_NAY
  const handleVoteNo = useCallback(() => {
    onVote(voteId, VOTE_NAY)
  }, [onVote, voteId])
  const handleVoteYes = useCallback(() => {
    onVote(voteId, VOTE_YEA)
  }, [onVote, voteId])

  const handleExecute = useCallback(() => {
    onExecute(voteId)
  }, [onExecute, voteId])
  const [yeaPct, nayPct] = percentageList(
    [votesYeaVotersSize, votesNayVotersSize],
    2
  )

  if (!vote) {
    return null
  }

  return (
    <Split
      primary={
        <Box>
          <div
            css={`
              display: flex;
              justify-content: space-between;
            `}
          >
            <Badge.App>App Badge</Badge.App>
            {youVoted && (
              <div
                css={`
                  display: inline-grid;
                  grid-template-columns: auto auto;
                  grid-gap: ${0.5 * GU}px;
                  align-items: center;
                  justify-content: center;
                  height: 20px;
                  width: auto;
                  border-radius: 100px;
                  padding: 0 ${1 * GU}px;
                  background: ${theme.infoSurface.alpha(0.08)};
                  color: ${theme.info};
                  ${textStyle('label2')};
                `}
              >
                <IconCheck size="tiny" /> Voted
              </div>
            )}
          </div>
          <div
            css={`
              display: grid;
              grid-template-columns: auto;
              grid-gap: ${2.5 * GU}px;
              margin-top: ${2.5 * GU}px;
            `}
          >
            <div
              css={`
                display: grid;
                grid-template-columns: auto auto;
                grid-template-rows: auto auto;
                grid-column-gap: ${5 * GU}px;
                grid-row-gap: ${2 * GU}px;
              `}
            >
              <div
                css={`
                  ${textStyle('label2')};
                `}
              >
                Description
              </div>
              <div
                css={`
                  ${textStyle('label2')};
                `}
              >
                Created By
              </div>
              <div>
                #{voteId} {description && <VoteText text={description} />}
                {metadata && <VoteText text={metadata} />}
              </div>
              <div
                css={`
                  display: flex;
                  align-items: flex-start;
                `}
              >
                <LocalIdentityBadge entity={creator} />
              </div>
            </div>
            <div>
              <div
                css={`
                  ${textStyle('label2')};
                  margin-bottom: ${1.5 * GU}px;
                `}
              >
                Current votes
              </div>
              <SummaryBar
                positiveSize={votesYeaVotersSize}
                negativeSize={votesNayVotersSize}
                requiredSize={supportRequired}
                show
              />
              <SummaryRows
                yea={{ pct: yeaPct, amount: yea }}
                nay={{ pct: nayPct, amount: nay }}
                symbol={tokenSymbol}
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
