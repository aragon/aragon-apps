import Aragon from '@aragon/client'
import Messenger, { providers } from '@aragon/messenger'
import React from 'react'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import { getQuorumProgress } from './vote-utils'

const app = new Aragon(
  new Messenger(new providers.WindowMessage(window.parent))
)

class App extends React.Component {
  state = {
    votes: [],
    createVoteVisible: false,
    currentVoteId: -1,
    voteVisible: false,
    voteSidebarOpened: false,

    settingsLoaded: false,
    supportRequiredPct: -1,
    voteTime: -1,
    pctBase: -1,
    userAccount: '',
  }

  componentDidMount() {
    window.addEventListener('message', this.handleWrapperMessage)
  }

  componentWillReceiveProps(nextProps) {
    const { settingsLoaded } = this.state
    // Is this the first time we've loaded the settings?
    if (!settingsLoaded && hasLoadedVoteSettings(nextProps)) {
      this.setState({
        settingsLoaded: true,
      })
    }
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleWrapperMessage)
  }

  handleWrapperMessage = ({ data }) => {
    if (data.from !== 'wrapper') {
      return
    }
    if (data.name === 'account') {
      this.setState({ userAccount: data.value })
    }
    if (data.name === 'ready') {
      this.sendMessageToWrapper('ready', true)
    }
  }

  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }

  handleCreateVote = question => {
    app.newVote('0x00000001', question)
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
    app.vote(voteId, voteType === VOTE_YEA, false)
    this.handleVoteClose()
  }
  handleVoteClose = () => {
    this.setState({ voteVisible: false })
  }
  handleVoteTransitionEnd = opened => {
    this.setState(opened ? { voteSidebarOpened: true } : { currentVoteId: -1 })
  }
  render() {
    const { votes, voteTime, supportRequiredPct, pctBase } = this.props
    const {
      createVoteVisible,
      currentVoteId,
      settingsLoaded,
      userAccount,
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
                vote={currentVote}
                user={userAccount}
                ready={voteSidebarOpened}
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

const Enhanced = observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)

const state$ = app.state()
const ConnectedApp = props => <Enhanced observable={state$} />

export default ConnectedApp
