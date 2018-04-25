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
import { combineLatest } from '../rxjs'
import provideNetwork from '../utils/provideNetwork'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'

class VotePanelContent extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  state = {
    userCanVote: false,
    userBalance: null,
  }
  componentDidMount() {
    this.loadUserCanVote()
    this.loadUserBalance()
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.user !== this.props.user) {
      this.loadUserCanVote()
    }
    if (nextProps.tokenContract !== this.props.tokenContract) {
      this.loadUserBalance()
    }
  }
  handleNoClick = () => {
    this.props.onVote(this.props.vote.voteId, VOTE_NAY)
  }
  handleYesClick = () => {
    // TODO: add a manual execute button and checkboxes to let user select if
    // they want to auto execute
    this.props.onVote(this.props.vote.voteId, VOTE_YEA)
  }
  loadUserBalance = () => {
    const { tokenContract, user } = this.props
    if (tokenContract && user) {
      combineLatest(tokenContract.balanceOf(user), tokenContract.decimals())
        .first()
        .subscribe(([balance, decimals]) => {
          const adjustedBalance = Math.floor(
            parseInt(balance, 10) / Math.pow(10, decimals)
          )
          this.setState({
            userBalance: adjustedBalance,
          })
        })
    }
  }
  loadUserCanVote = () => {
    const { app, user, vote } = this.props
    if (user && vote) {
      // Get if user can vote
      app
        .call('canVote', vote.voteId, user)
        .first()
        .subscribe(canVote => {
          this.setState({
            userCanVote: canVote,
          })
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
    const { network: { etherscanBaseUrl }, vote, ready } = this.props
    const { userBalance, userCanVote } = this.state
    if (!vote) {
      return null
    }

    const { endDate, open, quorum, quorumProgress, support } = vote
    const { creator, metadata, nay, totalVoters, yea, description } = vote.data

    // const creatorName = 'Robert Johnson' // TODO: get creator name

    return (
      <div>
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
          </div>
          <div>
            <h2>
              <Label>Quorum</Label>
            </h2>
            <div>{quorum * 100}%</div>
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
              {/* <p>
                <strong>{creatorName}</strong>
              </p> */}
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
          ready={ready}
        />

        {userCanVote && (
          <div>
            <SidePanelSeparator />
            <VotingButtons>
              <Button
                mode="strong"
                emphasis="positive"
                wide
                onClick={this.handleYesClick}
              >
                Yes
              </Button>
              <Button
                mode="strong"
                emphasis="negative"
                wide
                onClick={this.handleNoClick}
              >
                No
              </Button>
            </VotingButtons>
            <Info title={`You will cast ${userBalance || '...'} votes`} />
          </div>
        )}
      </div>
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

const VotingButtons = styled.div`
  display: flex;
  padding: 30px 0 20px;
  & > * {
    width: 50%;
    &:first-child {
      margin-right: 10px;
    }
  }
`

export default provideNetwork(VotePanelContent)
