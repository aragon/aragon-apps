import React, { Component } from 'react'
import styled from 'styled-components'
import { AragonApp } from '@aragon/ui'
import { EmptyStateCard } from './components'

const StyledAragonApp = styled(AragonApp)`
  display: flex;
  align-items: center;
  justify-content: center;
`

class App extends Component {
  render() {
    return (
      <StyledAragonApp backgroundLogo>
        <EmptyStateCard />
      </StyledAragonApp>
    )
  }
}

export default App
