import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import {
  Button,
  Info,
  SafeLink,
  SidePanelSplit,
  SidePanelSeparator,
  Countdown,
  Text,
  theme,
} from '@aragon/ui'
import provideNetwork from '../utils/provideNetwork'
import { VOTE_NAY, VOTE_YEA, VOTE_STATUS_ACCEPTED } from '../vote-types'
import { getVoteStatus, getVoteSuccess } from '../vote-utils'
import { roundToDecimals } from '../math-utils'
import { pluralize } from '../utils'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'
import VoteSuccess from './VoteSuccess'
import SummaryBar from './SummaryBar'

class VotePanelContent extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  state = {
    userCanVote: false,
    userBalance: null,
    canExecute: false,
    changeVote: false,
  }
  componentDidMount() {
    const { user, vote, tokenContract } = this.props
    this.loadUserBalance(user, vote, tokenContract)
    this.loadUserCanVote(user, vote)
    this.loadCanExecute(vote)
  }
  componentWillReceiveProps(nextProps) {
    const { user, vote, tokenContract } = this.props

    const userUpdate = nextProps.user !== user
    const voteUpdate = nextProps.vote.voteId !== vote.voteId
    const contractUpdate = nextProps.tokenContract !== tokenContract

    if (userUpdate || contractUpdate || voteUpdate) {
      this.loadUserBalance(
        nextProps.user,
        nextProps.vote,
        nextProps.tokenContract
      )
      this.loadUserCanVote(nextProps.user, nextProps.vote)
    }

    if (contractUpdate || voteUpdate) {
      this.loadCanExecute(vote)
    }
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
  loadUserBalance = (user, vote, tokenContract) => {
    const { tokenDecimals } = this.props
    if (tokenContract && user) {
      tokenContract
        .balanceOfAt(user, vote.data.snapshotBlock)
        .first()
        .subscribe(balance => {
          const adjustedBalance = Math.floor(
            parseInt(balance, 10) / Math.pow(10, tokenDecimals)
          )
          this.setState({ userBalance: adjustedBalance })
        })
    }
  }
  loadUserCanVote = (user, vote) => {
    const { app } = this.props
    if (user && vote) {
      // Get if user can vote
      app
        .call('canVote', vote.voteId, user)
        .first()
        .subscribe(canVote => {
          this.setState({ userCanVote: canVote })
        })
    }
  }
  loadCanExecute = vote => {
    const { app } = this.props
    if (vote) {
      app
        .call('canExecute', vote.voteId)
        .first()
        .subscribe(canExecute => {
          this.setState({ canExecute })
        })
    }
  }
  renderDescription = (description = '') => {
    // Make '\n's real breaks
    return description.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ))
  }
  render() {
    const {
      network: { etherscanBaseUrl },
      vote,
      ready,
      tokenSymbol,
      tokenDecimals,
    } = this.props

    const { userBalance, userCanVote, changeVote, canExecute } = this.state

    const hasVoted = [VOTE_YEA, VOTE_NAY].includes(vote.userAccountVote)
    const status = getVoteStatus(vote)
    const success = getVoteSuccess(vote)

    if (!vote) {
      return null
    }

    const { endDate, open, quorum, quorumProgress, support } = vote
    const {
      creator,
      metadata,
      nay,
      yea,
      totalVoters,
      description,
      snapshotBlock,
    } = vote.data

    return (
      <React.Fragment>
        <SidePanelSplit>
          <div>
            <h2>
              <Label>{open ? 'Time Remaining:' : 'Status'}</Label>
            </h2>
            <div>
              {open ? (
                <Countdown end={endDate} />
              ) : (
                <VoteStatus
                  vote={vote}
                  support={support}
                  tokenSupply={totalVoters}
                />
              )}
            </div>
            <StyledVoteSuccess vote={vote} />
          </div>
          <div>
            <h2>
              <Label>Total support</Label>
            </h2>
            <div>
              {roundToDecimals(quorumProgress * 100, 2)}%{' '}
              <Text size="small" color={theme.textSecondary}>
                ({roundToDecimals(quorum * 100, 2)}% needed)
              </Text>
            </div>
            <StyledSummaryBar
              positiveSize={quorumProgress}
              requiredSize={quorum}
              show={ready}
              compact
            />
          </div>
        </SidePanelSplit>
        <Part>
          {metadata && (
            <React.Fragment>
              <h2>
                <Label>Question:</Label>
              </h2>
              <Question>{metadata}</Question>
            </React.Fragment>
          )}
          {description && (
            <React.Fragment>
              <h2>
                <Label>Description:</Label>
              </h2>
              <p>{this.renderDescription(description)}</p>
            </React.Fragment>
          )}
        </Part>
        <SidePanelSeparator />
        <Part>
          <h2>
            <Label>Created By:</Label>
          </h2>
          <Creator>
            <CreatorImg>
              <Blockies seed={creator} size={8} />
            </CreatorImg>
            <div>
              <p>
                <SafeLink
                  href={`${etherscanBaseUrl}/address/${creator}`}
                  target="_blank"
                >
                  {creator}
                </SafeLink>
              </p>
            </div>
          </Creator>
        </Part>
        <SidePanelSeparator />

        <VoteSummary
          votesYea={yea}
          votesNay={nay}
          tokenSupply={totalVoters}
          quorum={quorum}
          quorumProgress={quorumProgress}
          support={support}
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

          if (userCanVote && hasVoted && !changeVote) {
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
                    , since it was your balance at the beginning of the vote{' '}
                    <SafeLink
                      href={`${etherscanBaseUrl}/block/${snapshotBlock}`}
                      target="_blank"
                    >
                      (block
                      {snapshotBlock})
                    </SafeLink>
                    .
                  </p>
                </Info.Action>
              </div>
            )
          }

          if (userCanVote) {
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
                <Info.Action>
                  <p>
                    You will cast your vote with{' '}
                    {userBalance === null
                      ? '… tokens'
                      : pluralize(userBalance, '$ token', '$ tokens')}
                    , since it was your balance at the beginning of the vote{' '}
                    <SafeLink
                      href={`${etherscanBaseUrl}/block/${snapshotBlock}`}
                      target="_blank"
                    >
                      (block
                      {snapshotBlock})
                    </SafeLink>
                    .
                  </p>
                </Info.Action>
              </div>
            )
          }
        })()}
      </React.Fragment>
    )
  }
}

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
  margin-bottom: 10px;
`

const StyledVoteSuccess = styled(VoteSuccess)`
  margin-top: 10px;
`

const StyledSummaryBar = styled(SummaryBar)`
  margin-top: 10px;
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

const Question = styled.p`
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  hyphens: auto;
`

const Creator = styled.div`
  display: flex;
  align-items: center;
`
const CreatorImg = styled.div`
  margin-right: 20px;
  canvas {
    display: block;
    border: 1px solid ${theme.contentBorder};
    border-radius: 16px;
  }
  & + div {
    a {
      color: ${theme.accent};
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

export default provideNetwork(VotePanelContent)
