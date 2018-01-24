import React from 'react'
import styled from 'styled-components'
import {
  AragonApp,
  AppBar,
  Button,
  SidePanel,
  SidePanelSeparator,
} from '@aragon/ui'
import { votes, tokensCount } from './demo-state'
import EmptyState from './screens/EmptyState'
import Votings from './screens/Votings'
import VotePanelContent from './components/VotePanelContent'

class App extends React.Component {
  state = {
    votes,
    createVotingVisible: false,
    currentVoting: null,
    votingVisible: false,
    votingSidebarOpened: false,
  }
  handleCreateVoting = () => {
    this.setState({ createVotingVisible: true })
  }
  handleCreateVotingClose = () => {
    this.setState({ createVotingVisible: false })
  }
  handleSelectVote = id => {
    const vote = votes.find(vote => id === vote.id)
    if (!vote) return
    this.setState({
      currentVoting: vote,
      votingVisible: true,
      votingSidebarOpened: false,
    })
  }
  handleDeselectVote = () => {
    this.setState({ votingVisible: false })
  }
  handleVotingTransitionEnd = opened => {
    if (!opened) {
      this.setState({ currentVoting: null })
      return
    }
    this.setState({ votingSidebarOpened: true })
  }
  render() {
    const {
      votes,
      votingVisible,
      currentVoting,
      createVotingVisible,
      votingSidebarOpened,
    } = this.state
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
            <Votings
              votes={votes}
              tokensCount={tokensCount}
              onSelectVote={this.handleSelectVote}
            />
          ) : (
            <EmptyState onActivate={this.handleCreateVoting} />
          )}
        </Main>

        <SidePanel
          title="Open Voting"
          opened={Boolean(!createVotingVisible && votingVisible)}
          onClose={this.handleDeselectVote}
          onTransitionEnd={this.handleVotingTransitionEnd}
        >
          <VotePanelContent
            vote={currentVoting}
            tokensCount={tokensCount}
            ready={votingSidebarOpened}
          />
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
