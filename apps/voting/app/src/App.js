import React from 'react'
import PropTypes from 'prop-types'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import BN from 'bn.js'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import tokenAbi from './abi/token-balanceOfAt.json'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'
import { networkContextType } from './utils/provideNetwork'
import { settingsContextType } from './utils/provideSettings'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import {
  EMPTY_CALLSCRIPT,
  isVoteOpen,
  voteTypeFromContractEnum,
} from './vote-utils'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    network: {
      etherscanBaseUrl: 'https://rinkeby.etherscan.io',
      name: 'rinkeby',
    },
    tokenSymbol: '',
    userAccount: '',
    votes: [],
  }
  static childContextTypes = {
    network: networkContextType,
    settings: settingsContextType,
  }
  getChildContext() {
    return {
      network: this.props.network,
      settings: {
        pctBase: this.props.pctBase,
        voteTime: this.props.voteTime,
      },
    }
  }

  constructor(props) {
    super(props)

    this.state = {
      createVoteVisible: false,
      currentVoteId: -1,
      tokenContract: this.getTokenContract(props.tokenAddress),
      voteVisible: false,
      voteSidebarOpened: false,
      userAccountVotes: new Map(),
    }
  }
  componentWillReceiveProps(nextProps) {
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
      appStateReady,
      tokenDecimals,
      tokenSymbol,
      userAccount,
      votes,
    } = this.props

    const {
      createVoteVisible,
      currentVoteId,
      tokenContract,
      voteSidebarOpened,
      voteVisible,
      userAccountVotes,
    } = this.state

    const now = new Date()

    // Add useful properties to the votes
    const preparedVotes = appStateReady
      ? votes.map(vote => ({
          ...vote,
          data: {
            ...vote.data,
            open: isVoteOpen(vote, now),
          },
          userAccountVote: voteTypeFromContractEnum(
            userAccountVotes.get(vote.voteId)
          ),
        }))
      : votes

    const currentVote =
      currentVoteId === -1
        ? null
        : preparedVotes.find(vote => vote.voteId === currentVoteId)
    const hasCurrentVote = appStateReady && Boolean(currentVote)

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
              {appStateReady && votes.length > 0 ? (
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
            currentVote && currentVote.data.open ? 'Open' : 'Closed'
          })`}
          opened={hasCurrentVote && !createVoteVisible && voteVisible}
          onClose={this.handleVoteClose}
          onTransitionEnd={this.handleVoteTransitionEnd}
        >
          {hasCurrentVote && (
            <VotePanelContent
              app={app}
              vote={currentVote}
              user={userAccount}
              ready={voteSidebarOpened}
              tokenContract={tokenContract}
              tokenDecimals={tokenDecimals}
              tokenSymbol={tokenSymbol}
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
  observable =>
    observable.map(state => {
      const appStateReady = hasLoadedVoteSettings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }

      const {
        pctBase,
        supportRequiredPct,
        tokenDecimals,
        voteTime,
        votes,
      } = state

      const pctBaseNum = parseInt(pctBase, 10)
      const supportRequiredPctNum = parseInt(supportRequiredPct, 10)
      const tokenDecimalsNum = parseInt(tokenDecimals, 10)
      const tokenDecimalsBaseNum = Math.pow(10, tokenDecimalsNum)

      return {
        ...state,

        appStateReady,
        pctBase: new BN(pctBase),
        supportRequiredPct: new BN(supportRequiredPct),
        tokenDecimals: new BN(tokenDecimals),

        numData: {
          pctBase: pctBaseNum,
          supportRequiredPct: supportRequiredPctNum,
          tokenDecimals: tokenDecimalsNum,
        },

        // Transform the vote data for the frontend
        votes: votes
          ? votes.map(vote => {
              const { data } = vote
              return {
                ...vote,
                data: {
                  ...data,
                  endDate: new Date(data.startDate + voteTime),
                  minAcceptQuorum: new BN(data.minAcceptQuorum),
                  nay: new BN(data.nay),
                  totalVoters: new BN(data.totalVoters),
                  yea: new BN(data.yea),
                  supportRequiredPct: new BN(supportRequiredPct),
                },
                numData: {
                  minAcceptQuorum:
                    parseInt(data.minAcceptQuorum, 10) / pctBaseNum,
                  nay: parseInt(data.nay, 10) / tokenDecimalsBaseNum,
                  totalVoters:
                    parseInt(data.totalVoters, 10) / tokenDecimalsBaseNum,
                  yea: parseInt(data.yea, 10) / tokenDecimalsBaseNum,
                  supportRequiredPct: supportRequiredPctNum / pctBaseNum,
                },
              }
            })
          : [],
      }
    }),
  {}
)(App)
