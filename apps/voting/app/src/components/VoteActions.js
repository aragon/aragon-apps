import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import {
  Button,
  ExternalLink,
  IconCheck,
  IconCross,
  Info,
  GU,
  RADIUS,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useAppState, useConnectedAccount } from '@aragon/api-react'
import { noop, formatDate } from '../utils'
import { useExtendedVoteData } from '../vote-hooks'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { isVoteAction } from '../vote-utils'

const VoteActions = React.memo(({ vote, onVoteYes, onVoteNo, onExecute }) => {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const { tokenSymbol } = useAppState()
  const [changeVote, setChangeVote] = useState(false)
  const handleChangeVote = useCallback(() => setChangeVote(true), [])

  const { connectedAccountVote, data } = vote
  const { snapshotBlock, startDate, open } = data
  const { canUserVote, canExecute, userBalance } = useExtendedVoteData(vote)
  const hasVoted = [VOTE_YEA, VOTE_NAY].includes(connectedAccountVote)

  if (!open) {
    return (
      <React.Fragment>
        {canExecute && isVoteAction(vote) && (
          <React.Fragment>
            <Button mode="strong" onClick={onExecute} wide>
              Enact this vote
            </Button>
            <Info>
              The voting period is closed and the vote has passed.{' '}
              <span css="font-weight: bold;">Anyone</span> can now enact this
              vote to execute its action.
            </Info>
          </React.Fragment>
        )}
        {hasVoted && (
          <div
            css={`
              border-radius: ${RADIUS}px;
              background: ${theme.background};
              padding: ${3.5 * GU}px ${10 * GU}px;
              display: grid;
              grid-template-columns: auto 1fr;
              grid-gap: ${2 * GU}px;
              align-items: center;
            `}
          >
            <div>
              <div
                css={`
                  border: 2px solid ${theme.accent};
                  border-radius: 50%;
                  width: 60px;
                  height: 60px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: ${theme.accent};
                `}
              >
                <IconCheck />
              </div>
            </div>
            <div>
              <div
                css={`
                  ${textStyle('body1')}
                  margin-bottom: ${0.5 * GU}px;
                `}
              >
                Vote success
              </div>
              <div
                css={`
                  ${textStyle('body2')}
                  color: ${theme.surfaceContentSecondary};
                `}
              >
                You voted{' '}
                <span
                  css={`
                    color: ${theme.surfaceContent};
                    font-weight: 600;
                    text-transform: uppercase;
                  `}
                >
                  {connectedAccountVote === VOTE_YEA ? 'yes' : 'no'}
                </span>{' '}
                with{' '}
                <span
                  css={`
                    color: ${theme.surfaceContent};
                    font-weight: 600;
                  `}
                >
                  {userBalance === -1 ? '…' : userBalance} {tokenSymbol}
                </span>
                .
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    )
  }

  if (canUserVote && hasVoted && !changeVote) {
    return (
      <div>
        <Button
          mode="strong"
          onClick={handleChangeVote}
          wide
          css={`
            margin-bottom: ${2 * GU}px;
          `}
        >
          Change my vote
        </Button>
        <TokenReference
          userBalance={userBalance}
          tokenSymbol={tokenSymbol}
          snapshotBlock={snapshotBlock}
          startDate={startDate}
        />
      </div>
    )
  }

  if (canUserVote) {
    return (
      <div>
        {connectedAccount ? (
          <React.Fragment>
            <Buttons onClickYes={onVoteYes} onClickNo={onVoteNo} />
            <TokenReference
              userBalance={userBalance}
              tokenSymbol={tokenSymbol}
              snapshotBlock={snapshotBlock}
              startDate={startDate}
            />
          </React.Fragment>
        ) : (
          <div
            css={`
              border-radius: ${RADIUS}px;
              background: ${theme.background};
              padding: ${3.5 * GU}px ${10 * GU}px;
              text-align: center;
            `}
          >
            <div
              css={`
                ${textStyle('body1')};
              `}
            >
              You must enable your account to vote on this proposal
            </div>
            <div
              css={`
                ${textStyle('body2')};
                color: ${theme.surfaceContentSecondary};
                margin-top: ${2 * GU}px;
              `}
            >
              Connect to your Ethereum provider by clicking on the Enable
              account button on the header. You may be temporarily redirected to
              a new screen.
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <Buttons disabled />
      <Info mode="warning">
        The currently connected account did not hold any {tokenSymbol} at the
        time this vote began ({formatDate(startDate)}), and therefore cannot
        participate in this vote. Make sure your accounts are holding{' '}
        {tokenSymbol} at the time a vote begins if you'd like to vote using this
        Voting app.{' '}
        <ExternalLink
          target="_blank"
          href="https://wiki.aragon.org/documentation/aragon_network_token/"
          css={`
            color: ${theme.infoSurfaceContent};
          `}
        >
          Find out how to get tokens.
        </ExternalLink>
      </Info>
    </div>
  )
})

const Buttons = ({ onClickYes = noop, onClickNo = noop, disabled = false }) => {
  return (
    <ButtonsContainer>
      <VotingButton
        mode="positive"
        wide
        disabled={disabled}
        onClick={onClickYes}
      >
        <IconCheck
          size="small"
          css={`
            margin-right: ${1 * GU}px;
          `}
        />
        Yes
      </VotingButton>
      <VotingButton
        mode="negative"
        wide
        disabled={disabled}
        onClick={onClickNo}
      >
        <IconCross
          size="small"
          css={`
            margin-right: ${1 * GU}px;
          `}
        />
        No
      </VotingButton>
    </ButtonsContainer>
  )
}

const ButtonsContainer = styled.div`
  display: flex;
  margin-bottom: ${2 * GU}px;
`

const TokenReference = ({
  userBalance,
  tokenSymbol,
  snapshotBlock,
  startDate,
}) => (
  <Info>
    Voting with <span css="font-weight: bold;">{userBalance}</span> of your{' '}
    <span css="font-weight: bold;">{tokenSymbol}</span> at block{' '}
    <span css="font-weight: bold;">{snapshotBlock}</span> due to the vote
    starting at <span css="font-weight: bold;">{formatDate(startDate)}</span>.
  </Info>
)

const VotingButton = styled(Button)`
  width: 50%;
  &:first-child {
    margin-right: ${1 * GU}px;
  }
`

export default VoteActions
