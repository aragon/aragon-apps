import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import {
  Button,
  GU,
  IconCheck,
  IconCross,
  Info,
  RADIUS,
  SafeLink,
  Text,
  textStyle,
  Timer,
  useTheme,
} from '@aragon/ui'
import { useAppState, useConnectedAccount } from '@aragon/api-react'
import { format } from 'date-fns'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { useExtendedVoteData } from '../vote-hooks'
import { useSettings } from '../vote-settings-manager'
import { VOTE_STATUS_REJECTED } from '../vote-types'
import { isVoteAction, getVoteStatus } from '../vote-utils'
import { pluralize, noop } from '../utils'

const formatDate = date =>
  `${format(date, 'dd/MM/yy')} at ${format(date, 'HH:mm')} UTC`

const VoteActions = React.memo(({ vote, onVoteYes, onVoteNo, onExecute }) => {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const settings = useSettings()
  const { tokenSymbol } = useAppState()
  const { snapshotBlock, startDate: startTimestamp, open } = vote.data
  const { canUserVote, canExecute, userBalance } = useExtendedVoteData(vote)
  const [changeVote, setChangeVote] = useState(false)
  const handleChangeVote = useCallback(() => setChangeVote(true), [])
  const hasVoted = [VOTE_YEA, VOTE_NAY].includes(vote.connectedAccountVote)
  const status = getVoteStatus(vote, settings.pctBase)

  if (!open) {
    return (
      <React.Fragment>
        {canExecute && (
          <React.Fragment>
            <Button mode="strong" onClick={onExecute} wide>
              Enact this vote
            </Button>
            <Info>
              The voting perdiod is closed and the vote status is passed.{' '}
              <span css="font-weight: bold;">Anyone</span> can now enact this
              vote to execute its action.
            </Info>
          </React.Fragment>
        )}
        <div
          css={`
            border-radius: ${RADIUS}px;
            background: ${theme.background};
            padding: ${3.5 * GU}px ${10 * GU}px;
            display: grid;
            grid-template-columns: auto 1fr;
            grid-gap: 16px;
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
              {status !== VOTE_STATUS_REJECTED ? <IconCheck /> : <IconCross />}
            </div>
          </div>
          <div>
            <div css="font-weight: bold;">
              Vote {status !== VOTE_STATUS_REJECTED ? 'success' : 'rejected'}
            </div>
            <div>
              You voted{' '}
              <span
                css={`
                  font-weight: bold;
                  text-transform: uppercase;
                `}
              >
                {vote.connectedAccountVote === VOTE_YEA ? 'yes' : 'no'}
              </span>{' '}
              with{' '}
              <span css="font-weight: bold;">
                {userBalance === -1 ? '…' : userBalance} {tokenSymbol}
              </span>
              .
            </div>
          </div>
        </div>
      </React.Fragment>
    )
  }

  if (canUserVote && hasVoted && !changeVote) {
    return (
      <div>
        <div
          css={`
            margin-bottom: ${2 * GU}px;
          `}
        >
          <Button
            mode="strong"
            onClick={handleChangeVote}
            wide
            css="width: 100%;"
          >
            Change my vote
          </Button>
        </div>
        <TokenReference
          userBalance={userBalance}
          tokenSymbol={tokenSymbol}
          snapshotBlock={snapshotBlock}
          startTimestamp={startTimestamp}
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
              startTimestamp={startTimestamp}
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
              You must enable your account to vote this proposal
            </div>
            <div
              css={`
                ${textStyle('body2')};
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
      <Info>
        The current account you are using did not hold any {tokenSymbol} at the
        time this vote began {formatDate(startTimestamp)}, and therefore cannot
        participate in this vote. Make sure your account is holding{' '}
        {tokenSymbol} at the time a vote begins if you want to vote using this
        Voting app.{' '}
        <SafeLink href="https://wiki.aragon.org/documentation/aragon_network_token/">
          Find out how to get tokens
        </SafeLink>
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
  startTimestamp,
}) => (
  <Info>
    <div>
      Voting with <span css="font-weight: bold;">{userBalance}</span> of your{' '}
      <span css="font-weight: bold;">{tokenSymbol}</span> at block{' '}
      <span css="font-weight: bold;">{snapshotBlock}</span> due to at{' '}
      <span css="font-weight: bold;">{formatDate(startTimestamp)}</span>.
    </div>
  </Info>
)

const VotingButton = styled(Button)`
  width: 50%;
  &:first-child {
    margin-right: 10px;
  }
`

export default VoteActions
