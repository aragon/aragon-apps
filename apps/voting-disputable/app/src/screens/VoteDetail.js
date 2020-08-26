import React, { useCallback } from 'react'
import {
  BackButton,
  Bar,
  Box,
  GU,
  Help,
  IconCheck,
  IconTime,
  Split,
  Tag,
  Timer,
  TransactionBadge,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useAppState, useConnectedAccount, useNetwork } from '@aragon/api-react'
import { format } from 'date-fns'
import DetailedDescription from '../components/DetailedDescription'
import DisputableActionStatus from '../components/VoteDetail/DisputableActionStatus'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import LocalLabelAppBadge from '../components/LocalIdentityBadge/LocalLabelAppBadge'
import SummaryBar from '../components/SummaryBar'
import SummaryRows from '../components/SummaryRows'
import VoteActions from '../components/VoteActions'
import VoteCast from '../components/VoteCast'
import VoteDescription from '../components/VoteDescription'
import VoteInfoBoxes from '../components/VoteDetail/VoteInfoBoxes'
import VoteStatus from '../components/VoteStatus'
import { percentageList, round, safeDiv } from '../math-utils'
import { getQuorumProgress } from '../vote-utils'
import { hexToAscii } from '../utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { addressesEqual } from '../web3-utils'

const DEFAULT_DESCRIPTION =
  'No additional description has been provided for this proposal.'

function VoteDetail({ vote, onBack, onVote, onExecute }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { tokenSymbol } = useAppState()
  const connectedAccount = useConnectedAccount()
  const {
    connectedAccountVote,
    data,
    executionTargetData,
    numData,
    voteId,
  } = vote

  const { minAcceptQuorum, supportRequired, yea, nay } = numData
  const { creator, description, disputable, open, path: executionPath } = data
  const metadata = hexToAscii(disputable.action.context)
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
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Split
        primary={
          <React.Fragment>
            <Box>
              <div
                css={`
                  display: flex;
                  justify-content: space-between;
                `}
              >
                {executionTargetData && (
                  <LocalLabelAppBadge
                    appAddress={executionTargetData.address}
                    iconSrc={executionTargetData.iconSrc}
                    identifier={executionTargetData.identifier}
                    label={executionTargetData.name}
                  />
                )}
                {youVoted && (
                  <Tag icon={<IconCheck size="small" />} label="Voted" />
                )}
              </div>
              <section
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
                      ? '1fr minmax(300px, auto)'
                      : 'auto'};
                    grid-gap: ${layoutName === 'large' ? 5 * GU : 2.5 * GU}px;
                  `}
                >
                  <div>
                    <h2
                      css={`
                        ${textStyle('label2')};
                        color: ${theme.surfaceContentSecondary};
                        margin-bottom: ${2 * GU}px;
                      `}
                    >
                      Description
                    </h2>
                    <VoteDescription
                      description={
                        Array.isArray(executionPath) ? (
                          <DetailedDescription path={executionPath} />
                        ) : (
                          description || metadata || DEFAULT_DESCRIPTION
                        )
                      }
                    />
                  </div>
                  <div>
                    <h2
                      css={`
                        ${textStyle('label2')};
                        color: ${theme.surfaceContentSecondary};
                        margin-bottom: ${2 * GU}px;
                      `}
                    >
                      Created By
                    </h2>
                    <div
                      css={`
                        display: flex;
                        align-items: flex-start;
                      `}
                    >
                      <LocalIdentityBadge
                        connectedAccount={addressesEqual(
                          creator,
                          connectedAccount
                        )}
                        entity={creator}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h2
                    css={`
                      ${textStyle('label2')};
                      color: ${theme.surfaceContentSecondary};
                      margin-bottom: ${2 * GU}px;
                    `}
                  >
                    {open ? 'Current votes' : 'Votes'}
                  </h2>
                  <SummaryBar
                    positiveSize={votesYeaVotersSize}
                    negativeSize={votesNayVotersSize}
                    requiredSize={supportRequired}
                    css={`
                      margin-bottom: ${2 * GU}px;
                    `}
                  />
                  <SummaryRows
                    yea={{ pct: yeaPct, amount: yea }}
                    nay={{ pct: nayPct, amount: nay }}
                    symbol={tokenSymbol}
                    connectedAccountVote={connectedAccountVote}
                  />
                  {youVoted && <VoteCast vote={vote} />}
                </div>
                <VoteActions
                  onExecute={handleExecute}
                  onVoteNo={handleVoteNo}
                  onVoteYes={handleVoteYes}
                  vote={vote}
                />
              </section>
            </Box>
            <VoteInfoBoxes
              minAcceptQuorum={minAcceptQuorum}
              quorumProgress={quorumProgress}
              supportRequired={supportRequired}
              votesYeaVotersSize={votesYeaVotersSize}
              vote={vote}
            />
          </React.Fragment>
        }
        secondary={<DisputableActionStatus vote={vote} />}
      />
    </React.Fragment>
  )
}

export default VoteDetail
