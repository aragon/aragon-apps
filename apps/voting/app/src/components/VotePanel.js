import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import {
  Button,
  Timer,
  Info,
  SafeLink,
  SidePanelSeparator,
  SidePanelSplit,
  SidePanel,
  Text,
  theme,
} from '@aragon/ui'
import { useAppState, useConnectedAccount } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import { format } from 'date-fns'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { round } from '../math-utils'
import { pluralize } from '../utils'
import { getQuorumProgress } from '../vote-utils'
import { useExtendedVoteData } from '../vote-hooks'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'
import VoteSuccess from './VoteSuccess'
import VoteText from './VoteText'
import SummaryBar from './SummaryBar'

const formatDate = date =>
  `${format(date, 'dd/MM/yy')} at ${format(date, 'HH:mm')} UTC`

// styled-component `css` transform doesn’t play well with attached components.
const Action = Info.Action

const VotePanel = React.memo(({ panelState, vote, onExecute, onVote }) => (
  <SidePanel
    title={
      vote ? `Vote #${vote.voteId} (${vote.data.open ? 'Open' : 'Closed'})` : ''
    }
    opened={panelState.visible}
    onClose={panelState.requestClose}
    onTransitionEnd={panelState.onTransitionEnd}
  >
    {vote && (
      <VotePanelContent
        vote={vote}
        onVote={onVote}
        onExecute={onExecute}
        panelOpened={panelState.didOpen}
      />
    )}
  </SidePanel>
))

const VotePanelContent = React.memo(
  ({ onVote, onExecute, panelOpened, vote }) => {
    const { tokenDecimals, tokenSymbol } = useAppState()

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

    const { creator, endDate, open, metadata, description } = vote.data
    const { minAcceptQuorum } = vote.numData
    const quorumProgress = getQuorumProgress(vote)

    return (
      <React.Fragment>
        <SidePanelSplit>
          <div>
            <h2>
              <Label>{open ? 'Time Remaining' : 'Status'}</Label>
            </h2>
            <div>
              {open ? (
                <Timer end={endDate} maxUnits={3} />
              ) : (
                <VoteStatus vote={vote} />
              )}
            </div>
            <VoteSuccess vote={vote} css="margin-top: 10px" />
          </div>
          <div>
            <h2>
              <Label>Quorum progress</Label>
            </h2>
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
              show={panelOpened}
              compact
            />
          </div>
        </SidePanelSplit>
        <Part>
          {description && (
            <React.Fragment>
              <h2>
                <Label>Description</Label>
              </h2>
              <p>
                <VoteText text={description} />
              </p>
            </React.Fragment>
          )}
          {metadata && (
            <React.Fragment>
              <h2>
                <Label>Question</Label>
              </h2>
              <p
                css={`
                  max-width: 100%;
                  overflow: hidden;
                  word-break: break-all;
                  hyphens: auto;
                `}
              >
                <VoteText text={metadata} />
              </p>
            </React.Fragment>
          )}
        </Part>
        <SidePanelSeparator />
        <Part>
          <h2>
            <Label>Created By</Label>
          </h2>
          <div
            css={`
              display: flex;
              align-items: center;
            `}
          >
            <LocalIdentityBadge entity={creator} />
          </div>
        </Part>
        <SidePanelSeparator />

        <VoteSummary
          vote={vote}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          ready={panelOpened}
        />

        <VotePanelContentActions
          onExecute={handleExecute}
          onVoteNo={handleVoteNo}
          onVoteYes={handleVoteYes}
          vote={vote}
        />
      </React.Fragment>
    )
  }
)

const VotePanelContentActions = React.memo(
  ({ vote, onVoteYes, onVoteNo, onExecute }) => {
    const connectedAccount = useConnectedAccount()
    const { canUserVote, canExecute, userBalance } = useExtendedVoteData(vote)
    const [changeVote, setChangeVote] = useState(false)

    const handleChangeVote = useCallback(() => setChangeVote(true), [])

    const hasVoted = [VOTE_YEA, VOTE_NAY].includes(vote.connectedAccountVote)

    if (canExecute) {
      return (
        <div>
          <SidePanelSeparator />
          <ButtonsContainer>
            <Button mode="strong" wide onClick={onExecute}>
              Execute vote
            </Button>
          </ButtonsContainer>
          <Action>Executing this vote is required to enact it.</Action>
        </div>
      )
    }

    if (canUserVote && hasVoted && !changeVote) {
      return (
        <div>
          <SidePanelSeparator />
          <ButtonsContainer>
            <Button mode="strong" wide onClick={handleChangeVote}>
              Change my vote
            </Button>
          </ButtonsContainer>
          <Action>
            <p>
              You voted {vote.connectedAccountVote === VOTE_YEA ? 'yes' : 'no'}{' '}
              with{' '}
              {userBalance === -1
                ? '…'
                : pluralize(userBalance, '$ token', '$ tokens')}
              , since it was your balance when the vote was created (
              {formatDate(vote.data.startDate)}
              ).
            </p>
          </Action>
        </div>
      )
    }

    if (canUserVote) {
      return (
        <div>
          <SidePanelSeparator />
          <ButtonsContainer>
            <VotingButton
              mode="strong"
              emphasis="positive"
              wide
              onClick={onVoteYes}
            >
              Yes
            </VotingButton>
            <VotingButton
              mode="strong"
              emphasis="negative"
              wide
              onClick={onVoteNo}
            >
              No
            </VotingButton>
          </ButtonsContainer>
          <Action
            css={`
              & > div {
                align-items: flex-start;
              }
            `}
          >
            {connectedAccount ? (
              <div>
                <p>
                  You will cast your vote with{' '}
                  {userBalance === -1
                    ? '… tokens'
                    : pluralize(userBalance, '$ token', '$ tokens')}
                  , since it was your balance when the vote was created (
                  {formatDate(vote.data.startDate)}
                  ).
                </p>
                <NoTokenCost />
              </div>
            ) : (
              <p>You will need to connect your account in the next screen.</p>
            )}
          </Action>
        </div>
      )
    }

    return null
  }
)

const NoTokenCost = () => (
  <p css="margin-top: 10px">
    Performing this action will{' '}
    <span css="font-weight: bold">not transfer out</span> any of your tokens.
    You’ll only have to pay for the{' '}
    <SafeLink href="https://ethgas.io/" target="_blank">
      ETH fee
    </SafeLink>{' '}
    when signing the transaction.
  </p>
)

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
  margin-bottom: 10px;
`

const Part = styled.div`
  padding: 20px 0;
  h2 {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }
  }
`

const ButtonsContainer = styled.div`
  display: flex;
  padding: 30px 0 20px;
`

const VotingButton = styled(Button)`
  width: 50%;
  &:first-child {
    margin-right: 10px;
  }
`

export default VotePanel
