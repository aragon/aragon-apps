import React from 'react'
import { AppBar, Button } from '@aragon/ui'
import { Tab, TabContainer } from './components/Tab'

import AppLayout from './components/Layout/AppLayout'
import MyPayroll from './components/MyPayroll'
import TeamPayroll from './components/TeamPayroll'

export default class App extends React.Component {
  state = {
    activeTab: 'my-payroll'
  }

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
      <AppLayout publicUrl='/assets/'>
        <AppLayout.Header>
          <AppBar
            title='Payroll'
            endContent={this.renderActionButton()}
          />

          <TabContainer onTabChange={this.handleTabChange}>
            <Tab name='my-payroll' title='My payroll'/>
            <Tab name='team-payroll' title='Team payroll'/>
          </TabContainer>

        </AppLayout.Header>

        <AppLayout.Content>
          {activeTab === 'my-payroll' && (
            <MyPayroll/>
          )}

          {activeTab === 'team-payroll' && (
            <TeamPayroll/>
          )}
        </AppLayout.Content>
      </AppLayout>
    )
  }
}
