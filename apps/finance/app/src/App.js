import React from 'react'
import styled from 'styled-components'
import {
  AragonApp,
  AppBar,
  Button,
  SidePanel,
  SidePanelSeparator,
} from '@aragon/ui'

class App extends React.Component {
  render() {
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppBar
          title="Finance"
          endContent={<Button mode="strong">New Payment</Button>}
        />
        <Main>Finance</Main>
      </AragonApp>
    )
  }
}

const Main = styled.div`
  padding: 30px;
`

export default App
