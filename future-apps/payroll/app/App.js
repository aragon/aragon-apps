import React from 'react'
import styled, { css } from 'styled-components'
import { AragonApp, AppBar, Button } from '@aragon/ui'

import Tab from './components/Tab'

import { MyPayroll, TeamPayroll } from './components/sections'

const AppContainer = styled(AragonApp)`
  display: flex;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`

const Header = styled.header`
  flex-shrink: 0;
`

const ScrollPane = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;

  ${({ vertical = true }) => vertical && css`
    overflow-y: auto;
  `}
  
  ${({ horizontal = true }) => horizontal && css`
    overflow-x: auto;
  `}
`

const Content = styled.main`
  display: flex;
  flex-direction: column;
  padding: 30px;
  flex-grow: 1;
`

export default class App extends React.Component {
  state = { activeTab: 'my-payroll' }

  handleTabChange = (index, name) => {
    this.setState({ activeTab: name })
  }

  renderActionButton () {
    if (this.state.activeTab === 'my-payroll') {
      return (
        <Button mode='strong'>
          Request salary
        </Button>
      )
    } else if (this.state.activeTab === 'team-payroll') {
      return (
        <Button mode='strong'>
          Add new employee
        </Button>
      )
    }

    return null
  }

  render () {
    const { activeTab } = this.state

    return (
      <AppContainer publicUrl='/aragon-ui/'>
        <Header>
          <AppBar
            title='Payroll'
            endContent={this.renderActionButton()}
          />

          <Tab.Container onTabChange={this.handleTabChange}>
            <Tab
              name='my-payroll'
              title='My payroll'
            />

            <Tab
              name='team-payroll'
              title='Team payroll'
            />
          </Tab.Container>

        </Header>

        <ScrollPane>
          <Content>
            {activeTab === 'my-payroll' && (
              <MyPayroll/>
            )}

            {activeTab === 'team-payroll' && (
              <TeamPayroll/>
            )}
          </Content>
        </ScrollPane>
      </AppContainer>
    )
  }
}
