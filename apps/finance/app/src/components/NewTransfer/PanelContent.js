import React from 'react'
import styled from 'styled-components'
import { TabBar } from '@aragon/ui'

import Deposit from './Deposit'
import Withdrawal from './Withdrawal'

const initialState = {
  screenIndex: 0,
}

class PanelContent extends React.Component {
  static defaultProps = {
    onWithdraw: () => {},
    onDeposit: () => {},
    proxyAddress: null,
  }
  state = {
    ...initialState,
  }

  componentWillReceiveProps({ opened }) {
    if (!opened && this.props.opened) {
      // Panel closed: reset the state
      this.setState({ ...initialState })
    }
  }

  handleSelect = screenIndex => {
    this.setState({ screenIndex })
  }

  render() {
    const { screenIndex } = this.state
    const {
      app,
      opened,
      tokens,
      onWithdraw,
      onDeposit,
      proxyAddress,
      userAccount,
    } = this.props
    return (
      <div>
        <TabBarWrapper>
          <TabBar
            items={['Deposit', 'Withdrawal']}
            selected={screenIndex}
            onSelect={this.handleSelect}
          />
        </TabBarWrapper>

        {screenIndex === 0 && (
          <Deposit
            app={app}
            tokens={tokens}
            proxyAddress={proxyAddress}
            onDeposit={onDeposit}
            userAccount={userAccount}
          />
        )}
        {screenIndex === 1 && (
          <Withdrawal opened={opened} tokens={tokens} onWithdraw={onWithdraw} />
        )}
      </div>
    )
  }
}

const TabBarWrapper = styled.div`
  margin: 0 -30px 30px;
`

export default PanelContent
