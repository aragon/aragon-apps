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
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import LocalLabelAppBadge from '../components/LocalIdentityBadge/LocalLabelAppBadge'
import SummaryBar from '../components/SummaryBar'
import SummaryRows from '../components/SummaryRows'
import VoteActions from '../components/VoteActions'
import VoteCast from '../components/VoteCast'
import VoteDescription from '../components/VoteDescription'
import VoteStatus from '../components/VoteStatus'
import { percentageList, round, safeDiv } from '../math-utils'
import { getQuorumProgress } from '../vote-utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { addressesEqual } from '../web3-utils'

const formatDate = date => `${format(date, 'yyyy-MM-dd, HH:mm')}`

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
  const { creator, description, metadata, open, path: executionPath } = data
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
        }
        secondary={
          <React.Fragment>
            <Box heading="Status">
              <Status vote={vote} />
            </Box>
            <Box
              heading={
                <React.Fragment>
                  Support %
                  <Help hint="What is Support?">
                    <strong>Support</strong> is the relative percentage of
                    tokens that are required to vote “Yes” for a proposal to be
                    approved. For example, if “Support” is set to 50%, then more
                    than 50% of the tokens used to vote on a proposal must vote
                    “Yes” for it to pass.
                  </Help>
                </React.Fragment>
              }
            >
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
                  (>{round(supportRequired * 100, 2)}% needed)
                </span>
              </div>
              <SummaryBar
                positiveSize={votesYeaVotersSize}
                requiredSize={supportRequired}
                css={`
                  margin-top: ${2 * GU}px;
                `}
              />
            </Box>
            <Box
              heading={
                <React.Fragment>
                  Minimum Approval %
                  <Help hint="What is Minimum Approval?">
                    <strong>Minimum Approval</strong> is the percentage of the
                    total token supply that is required to vote “Yes” on a
                    proposal before it can be approved. For example, if the
                    “Minimum Approval” is set to 20%, then more than 20% of the
                    outstanding token supply must vote “Yes” on a proposal for
                    it to pass.
                  </Help>
                </React.Fragment>
              }
            >
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
                  (>{round(minAcceptQuorum * 100, 2)}% needed)
                </span>
              </div>
              <SummaryBar
                positiveSize={quorumProgress}
                requiredSize={minAcceptQuorum}
                css={`
                  margin-top: ${2 * GU}px;
                `}
              />
            </Box>
          </React.Fragment>
        }
      />
    </React.Fragment>
  )
}

function Status({ vote }) {
  const theme = useTheme()
  const network = useNetwork()
  const { endDate, executionDate, executionTransaction, open } = vote.data

  if (open) {
    return (
      <React.Fragment>
        <div
          css={`
            ${textStyle('body2')};
            color: ${theme.surfaceContentSecondary};
            margin-bottom: ${1 * GU}px;
          `}
        >
          Time remaining
        </div>
        <Timer end={endDate} maxUnits={4} />
      </React.Fragment>
    )
  }

  return (
    <React.Fragment>
      <VoteStatus vote={vote} />
      <div
        css={`
          margin-top: ${1 * GU}px;
          display: inline-grid;
          grid-template-columns: auto auto;
          grid-gap: ${1 * GU}px;
          align-items: center;
          color: ${theme.surfaceContentSecondary};
          ${textStyle('body2')};
        `}
      >
        <IconTime size="small" /> {formatDate(executionDate || endDate)}
      </div>
      {executionTransaction && (
        <div>
          <TransactionBadge
            networkType={network && network.type}
            transaction={executionTransaction}
            css={`
              margin-top: ${1 * GU}px;
            `}
          />
        </div>
      )}
    </React.Fragment>
  )
}

export default VoteDetail
