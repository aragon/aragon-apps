import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import { transfers, balances } from './demo-state'
import Balances from './components/Balances'
import NewTransfer from './components/NewTransfer'
import Transfers from './components/Transfers'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  state = {
    newTransferOpened: false,
  }
  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true })
  }
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false })
  }
  handleSubmitTransfer = (token, recipient, amount) => {
    // Immediate, one-time payment
    this.props.app.newPayment(token, recipient, amount, 0, 1, '')
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

export default observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)
