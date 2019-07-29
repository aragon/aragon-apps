import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { Button, Timer, Info, SafeLink, Text } from '@aragon/ui'
import { useConnectedAccount } from '@aragon/api-react'
import { format } from 'date-fns'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { useExtendedVoteData } from '../vote-hooks'
import { pluralize } from '../utils'

const formatDate = date =>
  `${format(date, 'dd/MM/yy')} at ${format(date, 'HH:mm')} UTC`

const VoteActions = React.memo(({ vote, onVoteYes, onVoteNo, onExecute }) => {
  const connectedAccount = useConnectedAccount()
  const { canUserVote, canExecute, userBalance } = useExtendedVoteData(vote)
  const [changeVote, setChangeVote] = useState(false)

  const handleChangeVote = useCallback(() => setChangeVote(true), [])

  const hasVoted = [VOTE_YEA, VOTE_NAY].includes(vote.connectedAccountVote)

  if (canExecute) {
    return (
      <div>
        <ButtonsContainer>
          <Button mode="strong" wide onClick={onExecute}>
            Execute vote
          </Button>
        </ButtonsContainer>
        <Info>Executing this vote is required to enact it.</Info>
      </div>
    )
  }

  if (canUserVote && hasVoted && !changeVote) {
    return (
      <div>
        <ButtonsContainer>
          <Button mode="strong" wide onClick={handleChangeVote}>
            Change my vote
          </Button>
        </ButtonsContainer>
        <Info>
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
        </Info>
      </div>
    )
  }

  if (canUserVote) {
    return (
      <div>
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
        <Info
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
        </Info>
      </div>
    )
  }

  return null
})

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

export default VoteActions
