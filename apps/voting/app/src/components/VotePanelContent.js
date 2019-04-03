import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Button,
  Countdown,
  Info,
  SafeLink,
  SidePanelSeparator,
  SidePanelSplit,
  Text,
  theme,
} from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import { useCurrentVoteData } from '../vote-hooks'
import { NetworkContext } from '../app-contexts'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge.js'
import { format } from 'date-fns'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { round } from '../math-utils'
import { pluralize } from '../utils'
import { getQuorumProgress } from '../vote-utils'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'
import VoteSuccess from './VoteSuccess'
import SummaryBar from './SummaryBar'

const formatDate = date =>
  `${format(date, 'dd/MM/yy')} at ${format(date, 'HH:mm')} UTC`

class VotePanelContent extends React.PureComponent {
  static propTypes = {
    api: PropTypes.object.isRequired,
    canUserVote: PropTypes.bool.isRequired,
    canExecute: PropTypes.bool.isRequired,
    userBalance: PropTypes.number,
  }
  state = {
    changeVote: false,
  }
  handleChangeVoteClick = () => {
    this.setState({ changeVote: true })
  }
  handleNoClick = () => {
    this.props.onVote(this.props.vote.voteId, VOTE_NAY)
  }
  handleYesClick = () => {
    this.props.onVote(this.props.vote.voteId, VOTE_YEA)
  }
  handleExecuteClick = () => {
    this.props.onExecute(this.props.vote.voteId)
  }
  render() {
    const {
      canExecute,
      canUserVote,
      network,
      ready,
      tokenDecimals,
      tokenSymbol,
      connectedAccount,
      userBalance,
      vote,
    } = this.props

    const { changeVote } = this.state

    const hasVoted = [VOTE_YEA, VOTE_NAY].includes(vote.userAccountVote)

    if (!vote) {
      return null
    }

    const {
      creator,
      endDate,
      metadata,
      metadataNode,
      descriptionNode,
      open,
    } = vote.data
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
              {open ? <Countdown end={endDate} /> : <VoteStatus vote={vote} />}
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
              show={ready}
              compact
            />
          </div>
        </SidePanelSplit>
        <Part>
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
                {metadataNode}
              </p>
            </React.Fragment>
          )}
          {descriptionNode && (
            <React.Fragment>
              <h2>
                <Label>Description</Label>
              </h2>
              <p>{descriptionNode}</p>
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
            <LocalIdentityBadge entity={creator} networkType={network.type} />
          </div>
        </Part>
        <SidePanelSeparator />

        <VoteSummary
          vote={vote}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          ready={ready}
        />

        {(() => {
          if (canExecute) {
            return (
              <div>
                <SidePanelSeparator />
                <ButtonsContainer>
                  <Button mode="strong" wide onClick={this.handleExecuteClick}>
                    Execute vote
                  </Button>
                </ButtonsContainer>
                <Info.Action>
                  Executing this vote is required to enact it.
                </Info.Action>
              </div>
            )
          }

          if (canUserVote && hasVoted && !changeVote) {
            return (
              <div>
                <SidePanelSeparator />
                <ButtonsContainer>
                  <Button
                    mode="strong"
                    wide
                    onClick={this.handleChangeVoteClick}
                  >
                    Change my vote
                  </Button>
                </ButtonsContainer>
                <Info.Action>
                  <p>
                    You voted {vote.userAccountVote === VOTE_YEA ? 'yes' : 'no'}{' '}
                    with{' '}
                    {userBalance === null
                      ? '…'
                      : pluralize(userBalance, '$ token', '$ tokens')}
                    , since it was your balance when the vote was created (
                    {formatDate(vote.data.startDate)}
                    ).
                  </p>
                </Info.Action>
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
                    onClick={this.handleYesClick}
                  >
                    Yes
                  </VotingButton>
                  <VotingButton
                    mode="strong"
                    emphasis="negative"
                    wide
                    onClick={this.handleNoClick}
                  >
                    No
                  </VotingButton>
                </ButtonsContainer>
                {
                  <StyledInfo>
                    {connectedAccount ? (
                      <div>
                        <p>
                          You will cast your vote with{' '}
                          {userBalance === null
                            ? '… tokens'
                            : pluralize(userBalance, '$ token', '$ tokens')}
                          , since it was your balance when the vote was created
                          ({formatDate(vote.data.startDate)}
                          ).
                        </p>
                        <NoTokenCost />
                      </div>
                    ) : (
                      <p>
                        You will need to connect your account in the next
                        screen.
                      </p>
                    )}
                  </StyledInfo>
                }
              </div>
            )
          }
        })()}
      </React.Fragment>
    )
  }
}

const StyledInfo = styled(Info.Action)`
  div:first-child {
    align-items: flex-start;
  }
`

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

export default props => {
  const { api, connectedAccount } = useAragonApi()
  const network = useContext(NetworkContext)
  const { canUserVote, canExecute, userBalance } = useCurrentVoteData(
    props.vote,
    connectedAccount,
    props.tokenContract,
    props.tokenDecimals
  )
  return (
    <VotePanelContent
      network={network}
      api={api}
      canUserVote={canUserVote}
      canExecute={canExecute}
      userBalance={userBalance}
      connectedAccount={connectedAccount}
      {...props}
    />
  )
}
