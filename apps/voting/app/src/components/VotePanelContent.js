import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Button,
  IdentityBadge,
  Info,
  SafeLink,
  SidePanelSplit,
  SidePanelSeparator,
  Countdown,
  Text,
  theme,
} from '@aragon/ui'
import provideNetwork from '../utils/provideNetwork'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import { round } from '../math-utils'
import { pluralize } from '../utils'
import { getQuorumProgress } from '../vote-utils'
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
    loadingCanExecute: true,
    loadingCanVote: true,
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
    if (!vote) {
      return
    }

    if (user) {
      this.setState({ loadingCanVote: true })

      // Get if user can vote
      app
        .call('canVote', vote.voteId, user)
        .first()
        .subscribe(canVote => {
          this.setState({ loadingCanVote: false, userCanVote: canVote })
        })
    } else {
      // Note: if the account is not present, we assume the account is not
      // connected.
      this.setState({ loadingCanVote: false, userCanVote: vote.data.open })
    }
  }
  loadCanExecute = vote => {
    const { app } = this.props
    if (vote) {
      this.setState({ loadingCanExecute: true })

      app
        .call('canExecute', vote.voteId)
        .first()
        .subscribe(canExecute => {
          this.setState({ canExecute, loadingCanExecute: false })
        })
    }
  }
  renderBlockLink = snapshotBlock => {
    const {
      network: { etherscanBaseUrl },
    } = this.props
    const text = `(block ${snapshotBlock})`

    return etherscanBaseUrl ? (
      <SafeLink
        href={`${etherscanBaseUrl}/block/${snapshotBlock}`}
        target="_blank"
      >
        {text}
      </SafeLink>
    ) : (
      text
    )
  }
  render() {
    const {
      network,
      vote,
      ready,
      tokenSymbol,
      tokenDecimals,
      user,
    } = this.props

    const {
      userBalance,
      userCanVote,
      changeVote,
      canExecute,
      loadingCanExecute,
      loadingCanVote,
    } = this.state

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
      snapshotBlock,
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
            <StyledVoteSuccess vote={vote} />
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
            <StyledSummaryBar
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
              <Question>{metadataNode}</Question>
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
          <Creator>
            <IdentityBadge
              entity={creator} 
              networkType={network.type}
            />
          </Creator>
        </Part>
        <SidePanelSeparator />

        <VoteSummary
          vote={vote}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          ready={ready}
        />

        {!loadingCanVote &&
          !loadingCanExecute &&
          (() => {
            if (canExecute) {
              return (
                <div>
                  <SidePanelSeparator />
                  <ButtonsContainer>
                    <Button
                      mode="strong"
                      wide
                      onClick={this.handleExecuteClick}
                    >
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
                      You voted{' '}
                      {vote.userAccountVote === VOTE_YEA ? 'yes' : 'no'} with{' '}
                      {userBalance === null
                        ? '…'
                        : pluralize(userBalance, '$ token', '$ tokens')}
                      , since it was your balance at the beginning of the vote{' '}
                      {this.renderBlockLink(snapshotBlock)}.
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
                  {
                    <Info.Action>
                      {user ? (
                        <p>
                          You will cast your vote with{' '}
                          {userBalance === null
                            ? '… tokens'
                            : pluralize(userBalance, '$ token', '$ tokens')}
                          , since it was your balance at the beginning of the
                          vote {this.renderBlockLink(snapshotBlock)}.
                        </p>
                      ) : (
                        <p>
                          You will need to connect your account in the next
                          screen.
                        </p>
                      )}
                    </Info.Action>
                  }
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
