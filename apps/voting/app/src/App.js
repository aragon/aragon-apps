import React from 'react'
import PropTypes from 'prop-types'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'
import { networkContextType } from './utils/provideNetwork'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import { getQuorumProgress } from './vote-utils'

const EMPTY_CALLSCRIPT = '0x00000001'
const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi)

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
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }
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
  handleVote = (voteId, voteType) => {
    this.props.app.vote(voteId, voteType === VOTE_YEA, false)
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
    } = this.state

    const displayVotes = settingsLoaded && votes.length > 0
    const supportRequired = settingsLoaded ? supportRequiredPct / pctBase : -1

    // Add useful properties to the votes
    const preparedVotes = displayVotes
      ? votes.map(vote => ({
          ...vote,
          support: supportRequired,
          quorum: vote.data.minAcceptQuorumPct / pctBase,
          endDate: new Date(vote.data.startDate * 1000 + voteTime * 1000),
          quorumProgress: getQuorumProgress(vote.data),
        }))
      : votes

    const currentVote =
      currentVoteId === -1
        ? null
        : preparedVotes.find(vote => vote.voteId === currentVoteId)

    return (
      <AragonApp publicUrl="/aragon-ui/">
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

        {displayVotes && (
          <SidePanel
            title={
              currentVote && currentVote.data.open
                ? 'Opened Vote'
                : 'Closed Vote'
            }
            opened={Boolean(!createVoteVisible && voteVisible)}
            onClose={this.handleVoteClose}
            onTransitionEnd={this.handleVoteTransitionEnd}
          >
            {currentVote && (
              <VotePanelContent
                app={app}
                vote={currentVote}
                user={userAccount}
                ready={voteSidebarOpened}
                tokenContract={tokenContract}
                onVote={this.handleVote}
              />
            )}
          </SidePanel>
        )}

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
