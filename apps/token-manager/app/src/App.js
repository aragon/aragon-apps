import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { AragonApp, AppBar, Button, Badge, observe } from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import AppLayout from './components/AppLayout'
import { hasLoadedTokenSettings } from './token-settings'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    tokenSupply: -1,
    tokenSymbol: '',
    holders: [],
  }
  state = {
    tokenSettingsLoaded: false,
  }
  componentWillReceiveProps(nextProps) {
    const { tokenSettingsLoaded } = this.state
    // Is this the first time we've loaded the token settings?
    if (!tokenSettingsLoaded && hasLoadedTokenSettings(nextProps)) {
      this.setState({
        tokenSettingsLoaded: true,
      })
    }
  }
  render() {
    const { tokenSymbol, tokenSupply, holders } = this.props
    const { tokenSettingsLoaded } = this.state
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppLayout>
          <AppLayout.Header>
            <AppBar
              title={
                <Title>
                  <span>Token</span>
                  {tokenSymbol && <Badge.App>{tokenSymbol}</Badge.App>}
                </Title>
              }
              endContent={<Button mode="strong">Issue Tokens</Button>}
            />
          </AppLayout.Header>
          <AppLayout.ScrollWrapper>
            <AppLayout.Content>
              {tokenSettingsLoaded && holders.length > 0 ? (
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

export default observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)
