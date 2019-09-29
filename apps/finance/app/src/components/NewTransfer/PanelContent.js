import React from 'react'
import styled from 'styled-components'
import { SidePanel, Tabs, GU } from '@aragon/ui'
import Deposit from './Deposit'
import Withdrawal from './Withdrawal'

const initialState = {
  screenIndex: 0,
}

class PanelContent extends React.Component {
  static defaultProps = {
    onWithdraw: () => {},
    onDeposit: () => {},
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
    const { opened, tokens, onWithdraw, onDeposit } = this.props
    return (
      <div>
        <TabsWrapper>
          <Tabs
            items={['Deposit', 'Withdrawal']}
            selected={screenIndex}
            onChange={this.handleChange}
          />
        </TabsWrapper>

        {screenIndex === 0 && (
          <Deposit opened={opened} tokens={tokens} onDeposit={onDeposit} />
        )}
        {screenIndex === 1 && (
          <Withdrawal opened={opened} tokens={tokens} onWithdraw={onWithdraw} />
        )}
      </div>
    )
  }
}

const TabsWrapper = styled.div`
  margin: 0 -${SidePanel.HORIZONTAL_PADDING}px ${3 * GU}px;
`

export default PanelContent
