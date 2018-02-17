import React from 'react'
import { AragonApp, AppBar, Button, SidePanel } from '@aragon/ui'
import Aragon from '@aragon/client'
import { USER_ACCOUNT } from './demo-state'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'

class App extends React.Component {
  state = {
    votes: [],
    createVoteVisible: false,
    currentVoteId: -1,
    voteVisible: false,
    voteSidebarOpened: false,

    supportRequiredPct: -1,
    voteTime: -1,
    pctBase: -1,
  }
  componentDidMount() {
    const app = new Aragon()
    const events$ = app.events()

    events$
      .filter(({ event }) => event === 'StartVote')
      .map(({ returnValues: { voteId } }) => voteId)
      .subscribe(voteId => {
        app.call('getVote', voteId).subscribe(vote => {
          this.updateVote({
            ...this.getVote(voteId),
            vote: this.transformVote(vote),
          })
        })
        app.call('getVoteMetadata', voteId).subscribe(meta => {
          this.updateVote({
            ...this.getVote(voteId),
            question: meta,
          })
        })
      })

    const members = [
      ['supportRequiredPct'],
      ['voteTime'],
      ['PCT_BASE', 'pctBase'],
    ]
    members.forEach(([name, stateKey]) => {
      app.call(name).subscribe(val => {
        const key = stateKey || name
        const value = parseInt(val, 10)
        this.setState({ [key]: value })
      })
    })
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

  handleCreateVote = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false })
  }
  handleSelectVote = voteId => {
    const exists = this.state.votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    this.setState({
      currentVoteId: voteId,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleDeselectVote = () => {
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

      voteTime,
      supportRequiredPct,
      pctBase,
    } = this.state

    const displayVotes =
      voteTime > -1 &&
      supportRequiredPct > -1 &&
      pctBase > -1 &&
      votes.length > 0

    const supportRequired = displayVotes ? supportRequiredPct / pctBase : -1

    // Add useful properties to the votes
    const preparedVotes = displayVotes
      ? votes.map(vote => ({
          ...vote,
          support: supportRequired,
          quorum: vote.vote.minAcceptQuorumPct / pctBase,
          endDate: new Date(vote.vote.startDate * 1000 + voteTime * 1000),
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
                <Button mode="strong" onClick={this.handleCreateVote}>
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
                  onSelectVote={this.handleSelectVote}
                />
              ) : (
                <EmptyState onActivate={this.handleCreateVote} />
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
            onClose={this.handleDeselectVote}
            onTransitionEnd={this.handleVoteTransitionEnd}
          >
            {currentVote && (
              <VotePanelContent
                vote={currentVote}
                user={USER_ACCOUNT}
                ready={voteSidebarOpened}
              />
            )}
          </SidePanel>
        )}

        <SidePanel
          title="New Vote"
          opened={createVoteVisible}
          onClose={this.handleCreateVoteClose}
        >
          <NewVotePanelContent />
        </SidePanel>
      </AragonApp>
    )
  }
}

export default App
