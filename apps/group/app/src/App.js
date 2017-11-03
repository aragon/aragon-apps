import React, { Component } from 'react'
import styled from 'styled-components'
import { AragonApp, Button } from '@aragon/ui'
import { EmptyStateCard } from './components'
import FakeShell from './FakeShell'

const StyledAragonApp = styled(AragonApp)`
  display: flex;
  align-items: center;
  justify-content: center;
`

class App extends Component {
  state = {
    panelOpened: false,
  }
  handleCreate = () => {
    this.setState({ panelOpened: true })
  }
  handlePanelClose = () => {
    this.setState({ panelOpened: false })
  }
  render() {
    const { panelOpened } = this.state
    return (
      <FakeShell panelOpened={panelOpened} onPanelClose={this.handlePanelClose}>
        <StyledAragonApp backgroundLogo>
          <EmptyStateCard onActivate={this.handleCreate} />
        </StyledAragonApp>
      </FakeShell>
    )
  }
}

export default App
