import React, { useCallback } from 'react'
import {
  Box,
  GU,
  IconCheck,
  IconTime,
  Split,
  Timer,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useAppState } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import AppBadge from './AppBadge'
import VoteText from './VoteText'
import VoteStatus from './VoteStatus'
import SummaryBar from './SummaryBar'
import SummaryRows from './SummaryRows'
import VoteActions from './VoteActions'
import { getQuorumProgress } from '../vote-utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { percentageList, round, safeDiv } from '../math-utils'
import { formatDate } from '../utils'

const DEFAULT_DESCRIPTION =
  'No additional description has been provided for this proposal.'

function Vote({ vote, onVote, onExecute }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { tokenSymbol } = useAppState()

  const { data, numData, voteId, connectedAccountVote } = vote
  const { minAcceptQuorum, supportRequired, yea, nay } = numData
  const { creator, endDate, open, metadata, description } = data
  const quorumProgress = getQuorumProgress(vote)
  const totalVotes = yea + nay
  const votesYeaVotersSize = safeDiv(yea, totalVotes)
  const votesNayVotersSize = safeDiv(nay, totalVotes)
  const [yeaPct, nayPct] = percentageList(
    [votesYeaVotersSize, votesNayVotersSize],
    2
  )
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
            <AppBadge>App Badge</AppBadge>
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
            <h1
              css={`
                ${textStyle('title2')};
              `}
            >
              <span css="font-weight: bold;">Vote #{voteId}</span>
            </h1>
            <div
              css={`
                display: grid;
                grid-template-columns: ${layoutName === 'large'
                  ? 'auto auto'
                  : 'auto'};
                grid-gap: ${layoutName === 'large' ? 5 * GU : 2.5 * GU}px;
              `}
            >
              <div>
                <div
                  css={`
                    ${textStyle('label2')};
                    margin-bottom: ${2 * GU}px;
                  `}
                >
                  Description
                </div>
                <div
                  css={`
                    ${textStyle('body2')};
                  `}
                >
                  <VoteText
                    text={description || metadata || DEFAULT_DESCRIPTION}
                  />
                </div>
              </div>
              <div>
                <div
                  css={`
                    ${textStyle('label2')};
                    margin-bottom: ${2 * GU}px;
                  `}
                >
                  Created By
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
              <React.Fragment>
                <div
                  css={`
                    ${textStyle('body2')};
                    color: ${theme.content};
                  `}
                >
                  Time remaining
                </div>
                <Timer end={endDate} maxUnits={4} />
              </React.Fragment>
            ) : (
              <React.Fragment>
                <VoteStatus vote={vote} />
                <div
                  css={`
                    margin-top: ${2 * GU}px;
                    display: inline-grid;
                    grid-template-columns: auto auto;
                    grid-gap: ${1 * GU}px;
                    align-items: center;
                    ${textStyle('body2')};
                  `}
                >
                  <IconTime size="small" />
                  {formatDate(endDate)}
                </div>
              </React.Fragment>
            )}
          </Box>
          <Box heading="Relative support %">
            <div
              css={`
                ${textStyle('body2')};
              `}
            >
              {round(quorumProgress * 100, 2)}%{' '}
              <span
                css={`
                  color: ${theme.surfaceContentSecondary};
                `}
              >
                ({round(minAcceptQuorum * 100, 2)}% support needed)
              </span>
            </div>
            <SummaryBar
              css={`
                margin-top: ${1 * GU}px;
              `}
              positiveSize={quorumProgress}
              requiredSize={minAcceptQuorum}
            />
          </Box>
          <Box heading="Minimum approval %">
            <div
              css={`
                ${textStyle('body2')};
              `}
            >
              {round(votesYeaVotersSize * 100, 2)}%{' '}
              <span
                css={`
                  color: ${theme.surfaceContentSecondary};
                `}
              >
                ({round(supportRequired * 100, 2)}% approval needed)
              </span>
            </div>
            <SummaryBar
              positiveSize={votesYeaVotersSize}
              requiredSize={supportRequired}
            />
          </Box>
        </React.Fragment>
      }
    />
  )
}

export default Vote