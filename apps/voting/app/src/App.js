import React from 'react'
import PropTypes from 'prop-types'
import { isBefore } from 'date-fns/esm'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import tokenBalanceOfAtAbi from './abi/token-balanceOfAt.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'
import { networkContextType } from './utils/provideNetwork'
import { safeDiv } from './math-utils'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import {
  EMPTY_CALLSCRIPT,
  getQuorumProgress,
  voteTypeFromContractEnum,
} from './vote-utils'

const tokenAbi = [].concat(tokenBalanceOfAtAbi, tokenDecimalsAbi)

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    network: {
      etherscanBaseUrl: 'https://rinkeby.etherscan.io',
      name: 'rinkeby',
    },
    pctBase: -1,
    tokenAddress: null,
    supportRequiredPct: -1,
    userAccount: '',
    votes: [],
    voteTime: -1,
  }
  static childContextTypes = {
    network: networkContextType,
  }
  getChildContext() {
    return { network: this.props.network }
  }

  constructor(props) {
    super(props)
    this.state = {
      createVoteVisible: false,
      currentVoteId: -1,
      settingsLoaded: false,
      tokenContract: this.getTokenContract(props.tokenAddress),
      voteVisible: false,
      voteSidebarOpened: false,
      userAccountVotes: new Map(),
    }
  }
  componentWillReceiveProps(nextProps) {
    const { settingsLoaded } = this.state

    // Is this the first time we've loaded the settings?
    if (!settingsLoaded && hasLoadedVoteSettings(nextProps)) {
      this.setState({
        settingsLoaded: true,
      })
    }

    // Refresh the token contract if its address changes
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }

    // Refresh the account votes if the account changes,
    // or if there is any vote update.
    if (
      nextProps.votes !== this.props.votes ||
      nextProps.userAccount !== this.props.userAccount
    ) {
      this.loadUserAccountVotes(nextProps.userAccount, nextProps.votes)
    }
  }

  async loadUserAccountVotes(userAccount, votes) {
    const { app } = this.props

    if (!userAccount) {
      this.setState({ userAccountVotes: new Map() })
      return
    }

    this.setState({
      userAccountVotes: new Map(
        await Promise.all(
          votes.map(
            vote =>
              new Promise((resolve, reject) => {
                app
                  .call('getVoterState', vote.voteId, userAccount)
                  .subscribe(result => resolve([vote.voteId, result]), reject)
              })
          )
        )
      ),
    })
  }

  getTokenContract(tokenAddress) {
    return tokenAddress && this.props.app.external(tokenAddress, tokenAbi)
  }
  handleCreateVote = question => {
    this.props.app.newVote(EMPTY_CALLSCRIPT, question)
    this.handleCreateVoteClose()
  }
  handleCreateVoteOpen = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false })
  }
  handleVoteOpen = voteId => {
    const exists = this.props.votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    this.setState({
      currentVoteId: voteId,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleVote = (voteId, voteType, executesIfDecided = true) => {
    this.props.app.vote(voteId, voteType === VOTE_YEA, executesIfDecided)
    this.handleVoteClose()
  }
  handleExecute = voteId => {
    this.props.app.executeVote(voteId)
    this.handleVoteClose()
  }
  handleVoteClose = () => {
    this.setState({ voteVisible: false })
  }
  handleVoteTransitionEnd = opened => {
    this.setState(opened ? { voteSidebarOpened: true } : { currentVoteId: -1 })
  }
  render() {
    const {
      app,
      pctBase,
      supportRequiredPct,
      userAccount,
      votes,
      voteTime,
    } = this.props

    const {
      createVoteVisible,
      currentVoteId,
      settingsLoaded,
      tokenContract,
      voteSidebarOpened,
      voteVisible,
      userAccountVotes,
    } = this.state

    const displayVotes = settingsLoaded && votes.length > 0
    const supportRequired = settingsLoaded ? supportRequiredPct / pctBase : -1

    // Add useful properties to the votes
    const preparedVotes = displayVotes
      ? votes.map(vote => {
          const endDate = new Date(vote.data.startDate + voteTime)
          return {
            ...vote,
            endDate,
            // Open if not executed and now is still before end date
            open: !vote.data.executed && isBefore(new Date(), endDate),
            quorum: safeDiv(vote.data.minAcceptQuorum, pctBase),
            quorumProgress: getQuorumProgress(vote.data),
            support: supportRequired,
            userAccountVote: voteTypeFromContractEnum(
              userAccountVotes.get(vote.voteId)
            ),
          }
        })
      : votes

    const currentVote =
      currentVoteId === -1
        ? null
        : preparedVotes.find(vote => vote.voteId === currentVoteId)

    return (
      <AragonApp publicUrl="./aragon-ui/">
        <AppLayout>
          <AppLayout.Header>
            <AppBar
              title="Vote"
              endContent={
                <Button mode="strong" onClick={this.handleCreateVoteOpen}>
                  New Vote
                </Button>
              }
            />
          </AppLayout.Header>
          <AppLayout.ScrollWrapper>
            <AppLayout.Content>
              {displayVotes ? (
                <Votes
                  votes={preparedVotes}
                  onSelectVote={this.handleVoteOpen}
                />
              ) : (
                <EmptyState onActivate={this.handleCreateVoteOpen} />
              )}
            </AppLayout.Content>
          </AppLayout.ScrollWrapper>
        </AppLayout>

        <SidePanel
          title={`Vote #${currentVoteId} (${
            currentVote && currentVote.open ? 'Open' : 'Closed'
          })`}
          opened={
            currentVote && displayVotes && !createVoteVisible && voteVisible
          }
          onClose={this.handleVoteClose}
          onTransitionEnd={this.handleVoteTransitionEnd}
        >
          {displayVotes &&
            currentVote && (
              <VotePanelContent
                app={app}
                vote={currentVote}
                user={userAccount}
                ready={voteSidebarOpened}
                tokenContract={tokenContract}
                onVote={this.handleVote}
                onExecute={this.handleExecute}
              />
            )}
        </SidePanel>

        <SidePanel
          title="New Vote"
          opened={createVoteVisible}
          onClose={this.handleCreateVoteClose}
        >
          <NewVotePanelContent
            opened={createVoteVisible}
            onCreateVote={this.handleCreateVote}
          />
        </SidePanel>
      </AragonApp>
    )
  }
}

export default observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)
