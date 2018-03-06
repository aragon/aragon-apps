import Aragon from '@aragon/client'
import Messenger, { providers } from '@aragon/messenger'
import React from 'react'
import { AragonApp, AppBar, Button, SidePanel } from '@aragon/ui'
import { USER_ACCOUNT } from './demo-state'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'
import { VOTE_YEA } from './vote-types'
import { getQuorumProgress } from './vote-utils'

class App extends React.Component {
  state = {
    votes: [],
    createVoteVisible: false,
    currentVoteId: -1,
    voteVisible: false,
    voteSidebarOpened: false,

    settingsReady: false,
    supportRequiredPct: -1,
    voteTime: -1,
    pctBase: -1,
    userAccount: '',
  }
  componentDidMount() {
    window.addEventListener('load', this.handleWindowLoad)
    window.addEventListener('message', this.handleWrapperMessage)
  }

  componentWillUnmount() {
    window.removeEventListener('load', this.handleWindowLoad)
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
      this.connectApp()
    }
  }

  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }

  connectApp = () => {
    // Only connect once
    if (this.app) {
      return
    }

    this.app = new Aragon(
      new Messenger(new providers.WindowMessage(window.parent))
    )

    const events$ = this.app.events()

    events$
      .filter(({ event }) => event === 'StartVote')
      .map(({ returnValues: { voteId } }) => voteId)
      .subscribe(voteId => {
        this.app.call('getVote', voteId).subscribe(vote => {
          this.updateVote({
            ...this.getVote(voteId),
            vote: this.transformVote(vote),
          })
        })
        this.app.call('getVoteMetadata', voteId).subscribe(meta => {
          this.updateVote({
            ...this.getVote(voteId),
            question: meta,
          })
        })
      })

    const voteSettings = [
      ['voteTime', 'voteTime'],
      ['PCT_BASE', 'pctBase'],
      ['supportRequiredPct', 'supportRequiredPct'],
    ]
    voteSettings.forEach(([name, key], i) => {
      this.app.call(name).subscribe(val => {
        const value = parseInt(val, 10)
        const settingsReady = voteSettings.every(
          ([name, key], j) => (i === j ? value : this.state[key]) > -1
        )
        this.setState({ [key]: value, settingsReady })
      })
    })

    this.sendMessageToWrapper('ready', true)
  }

  // Get a vote using its ID, or create it if needed
  getVote(voteId) {
    return this.state.votes.find(vote => vote.voteId === voteId) || { voteId }
  }

  // Update a vote in the app state (coming from aragon.js)
  updateVote(updatedVote) {
    const { votes } = this.state
    const { voteId } = updatedVote
    const exists = votes.some(vote => vote.voteId === voteId)
    const updatesVotes = exists
      ? votes.map(vote => (vote.voteId === voteId ? updatedVote : vote))
      : votes.concat([updatedVote])
    this.setState({ votes: updatesVotes })
  }

  // Apply transmations to a vote received from the contract
  transformVote(vote) {
    return {
      creator: vote.creator,
      startDate: parseInt(vote.startDate, 10),
      snapshotBlock: parseInt(vote.snapshotBlock, 10),
      minAcceptQuorumPct: parseInt(vote.minAcceptQuorum, 10),
      yea: parseInt(vote.yea, 10),
      nay: parseInt(vote.nay, 10),
      totalVoters: parseInt(vote.totalVoters, 10),
      executed: vote.executed,
      open: vote.open,
    }
  }

  handleCreateVote = question => {
    this.app.newVote('0x00000001', question)
    this.handleCreateVoteClose()
  }
  handleCreateVoteOpen = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false })
  }
  handleVoteOpen = voteId => {
    const exists = this.state.votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    this.setState({
      currentVoteId: voteId,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleVote = (voteId, voteType) => {
    this.app.vote(voteId, voteType === VOTE_YEA, false)
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
      votes,
      voteVisible,
      currentVoteId,
      createVoteVisible,
      voteSidebarOpened,

      settingsReady,
      voteTime,
      supportRequiredPct,
      pctBase,
    } = this.state

    const displayVotes = settingsReady && votes.length > 0
    const supportRequired = settingsReady ? supportRequiredPct / pctBase : -1

    // Add useful properties to the votes
    const preparedVotes = displayVotes
      ? votes.map(vote => ({
          ...vote,
          support: supportRequired,
          quorum: vote.vote.minAcceptQuorumPct / pctBase,
          endDate: new Date(vote.vote.startDate * 1000 + voteTime * 1000),
          quorumProgress: getQuorumProgress(vote.vote),
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
              currentVote && currentVote.vote.open
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
                user={USER_ACCOUNT}
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

export default App
