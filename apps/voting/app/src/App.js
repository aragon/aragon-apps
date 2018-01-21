import React from 'react'
import styled from 'styled-components'
import {
  AragonApp,
  AppBar,
  Button,
  SidePanel,
  SidePanelSeparator,
} from '@aragon/ui'
import { votes } from './demo-state'
import EmptyState from './screens/EmptyState'
import Votings from './screens/Votings'
import VotePanelContent from './components/VotePanelContent'

class App extends React.Component {
  state = {
    votes,
    createVotingVisible: false,
    // currentVote: null,
    currentVote: votes[0],
  }
  handleCreateVoting = () => {
    this.setState({ createVotingVisible: true })
  }
  handleCreateVotingClose = () => {
    this.setState({ createVotingVisible: false })
  }
  handleSelectVote = id => {
    const vote = votes.find(vote => id === vote.id)
    if (vote) {
      this.setState({ currentVote: vote })
    }
  }
  handleDeselectVote = () => {
    this.setState({ currentVote: null })
  }
  render() {
    const { votes, createVotingVisible, currentVote } = this.state
    console.log(currentVote)
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppBar
          title="Voting"
          endContent={
            <Button mode="strong" onClick={this.handleCreateVoting}>
              New Voting
            </Button>
          }
        />
        <Main>
          {votes.length ? (
            <Votings votes={votes} onSelectVote={this.handleSelectVote} />
          ) : (
            <EmptyState onActivate={this.handleCreateVoting} />
          )}
        </Main>

        <SidePanel
          title="Open Voting"
          opened={Boolean(!createVotingVisible && currentVote)}
          onClose={this.handleDeselectVote}
        >
          <VotePanelContent vote={currentVote} />
        </SidePanel>

        <SidePanel
          title="New Poll"
          opened={createVotingVisible}
          onClose={this.handleCreateVotingClose}
        >
          <div>Create New Poll</div>
        </SidePanel>
      </AragonApp>
    )
  }
}

const Main = styled.div`
  padding: 30px;
`

export default App
