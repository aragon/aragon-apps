import React from 'react'
import { AragonApp, AppBar, Button, SidePanel } from '@aragon/ui'
import {
  VOTES,
  VOTE_TIME,
  USER_ACCOUNT,
  TOKEN_SUPPLY,
  SUPPORT_REQUIRED_PCT,
} from './demo-state'
import { isVoteOpen } from './vote-utils'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AppLayout from './components/AppLayout'

class App extends React.Component {
  state = {
    votes: VOTES,
    createVoteVisible: false,
    currentVote: null,
    voteVisible: false,
    voteSidebarOpened: false,
  }
  handleCreateVote = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false })
  }
  handleSelectVote = id => {
    const vote = this.state.votes.find(vote => id === vote.id)
    if (!vote) return
    this.setState({
      currentVote: vote,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleDeselectVote = () => {
    this.setState({ voteVisible: false })
  }
  handleVoteTransitionEnd = opened => {
    this.setState(opened ? { voteSidebarOpened: true } : { currentVote: null })
  }
  render() {
    const {
      votes,
      voteVisible,
      currentVote,
      createVoteVisible,
      voteSidebarOpened,
    } = this.state
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
              {votes.length ? (
                <Votes
                  votes={votes}
                  voteTime={VOTE_TIME}
                  tokenSupply={TOKEN_SUPPLY}
                  support={SUPPORT_REQUIRED_PCT}
                  onSelectVote={this.handleSelectVote}
                />
              ) : (
                <EmptyState onActivate={this.handleCreateVote} />
              )}
            </AppLayout.Content>
          </AppLayout.ScrollWrapper>
        </AppLayout>

        <SidePanel
          title={
            currentVote && isVoteOpen(currentVote.vote, VOTE_TIME)
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
              voteTime={VOTE_TIME}
              user={USER_ACCOUNT}
              tokenSupply={TOKEN_SUPPLY}
              support={SUPPORT_REQUIRED_PCT}
              ready={voteSidebarOpened}
            />
          )}
        </SidePanel>

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
