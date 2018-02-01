import React from 'react'
import styled from 'styled-components'
import { SidePanel, AragonApp, AppBar, Button } from '@aragon/ui'
import { transfers, balances } from './demo-state'
import Transfers from './components/Transfers'
import Balances from './components/Balances'
import NewTransfer from './components/NewTransfer'

class App extends React.Component {
  state = {
    newTransferOpened: false,
  }
  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true })
  }
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false })
  }
  render() {
    const { newTransferOpened } = this.state
    const tokens = balances.map(({ token }) => token)
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <Layout>
          <Layout.FixedHeader>
            <AppBar
              title="Finance"
              endContent={
                <Button mode="strong" onClick={this.handleNewTransferOpen}>
                  New Transfer
                </Button>
              }
            />
          </Layout.FixedHeader>
          <Layout.ScrollWrapper>
            <Content>
              <SpacedBlock>
                <Balances balances={balances} />
              </SpacedBlock>
              <SpacedBlock>
                <Transfers transfers={transfers} tokens={tokens} />
              </SpacedBlock>
            </Content>
          </Layout.ScrollWrapper>
        </Layout>
        <SidePanel
          opened={newTransferOpened}
          onClose={this.handleNewTransferClose}
          title="New Transfer"
        >
          <NewTransfer tokens={tokens} />
        </SidePanel>
      </AragonApp>
    )
  }
}

const Content = styled.div`
  padding: 30px;
`

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`

Layout.FixedHeader = styled.div`
  flex-shrink: 0;
`

Layout.ScrollWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
`

export default App
