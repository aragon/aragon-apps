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
    if (opened && !this.props.opened) {
      // Reset the state on the panel re-opening, to avoid flickering when it's still closing
      this.setState({ ...initialState })
    }
  }

  handleChange = screenIndex => {
    this.setState({ screenIndex })
  }

  render() {
    const { screenIndex } = this.state
    const { opened, tokens, onWithdraw, onDeposit, proxyAddress } = this.props
    return (
      <div>
        <TabBarWrapper>
          <TabBar
            items={['Deposit', 'Withdrawal']}
            selected={screenIndex}
            onChange={this.handleChange}
          />
        </TabBarWrapper>

        {screenIndex === 0 && (
          <Deposit
            opened={opened}
            tokens={tokens}
            proxyAddress={proxyAddress}
            onDeposit={onDeposit}
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
