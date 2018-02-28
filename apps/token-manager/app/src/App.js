import React from 'react'
import styled from 'styled-components'
import { AragonApp, AppBar, Button, SidePanel, Badge } from '@aragon/ui'
import Aragon from '@aragon/client'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import AppLayout from './components/AppLayout'
import { HOLDERS, TOKEN_SYMBOL, TOKEN_SUPPLY } from './demo-state'

class App extends React.Component {
  state = {
    tokenSupply: TOKEN_SUPPLY,
    tokenSymbol: TOKEN_SYMBOL,
    holders: HOLDERS,
  }
  componentDidMount() {
    const app = (this.app = new Aragon())
    window.parent.postMessage({ from: 'app', name: 'ready', value: true }, '*')
  }
  render() {
    const { tokenSymbol, tokenSupply, holders } = this.state
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppLayout>
          <AppLayout.Header>
            <AppBar
              title={
                <Title>
                  <span>Token</span>
                  <Badge.App>{tokenSymbol}</Badge.App>
                </Title>
              }
              endContent={<Button mode="strong">Issue Tokens</Button>}
            />
          </AppLayout.Header>
          <AppLayout.ScrollWrapper>
            <AppLayout.Content>
              {holders.length > 0 ? (
                <Holders holders={holders} tokenSupply={tokenSupply} />
              ) : (
                <EmptyState />
              )}
            </AppLayout.Content>
          </AppLayout.ScrollWrapper>
        </AppLayout>
      </AragonApp>
    )
  }
}

const Title = styled.span`
  display: flex;
  align-items: center;
  & > span:first-child {
    margin-right: 10px;
  }
`

export default App
