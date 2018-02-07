import React from 'react'
import styled from 'styled-components'
import { AragonApp, AppBar, Button, SidePanel } from '@aragon/ui'
import { votes, tokensCount } from './demo-state'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'

class App extends React.Component {
  state = {
    votes,
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
    const vote = votes.find(vote => id === vote.id)
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
    this.setState(
      opened ? { voteSidebarOpened: true } : { currentVote: null }
    )
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
        <AppBar
          title="Vote"
          endContent={
            <Button mode="strong" onClick={this.handleCreateVote}>
              New Vote
            </Button>
          }
        />
        <Main>
          {votes.length ? (
            <Votes
              votes={votes}
              tokensCount={tokensCount}
              onSelectVote={this.handleSelectVote}
            />
          ) : (
            <EmptyState onActivate={this.handleCreateVote} />
          )}
        </Main>

        <SidePanel
          title="Open Vote"
          opened={Boolean(!createVoteVisible && voteVisible)}
          onClose={this.handleDeselectVote}
          onTransitionEnd={this.handleVoteTransitionEnd}
        >
          <VotePanelContent
            vote={currentVote}
            tokensCount={tokensCount}
            ready={voteSidebarOpened}
          />
        </SidePanel>

        <SidePanel
          title="New Vote"
          opened={createVoteVisible}
          onClose={this.handleCreateVoteClose}
        >
          <div>Create New Vote</div>
        </SidePanel>
      </AragonApp>
    )
  }
}

const Main = styled.div`
  padding: 30px;
`

export default App
