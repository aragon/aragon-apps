import React from 'react'
import { AppBar, AppView, AragonApp, Button } from '@aragon/ui'
import Tab from './components/Tab'

import { MyPayroll, TeamPayroll } from './screens'
import { AddEmployee } from './panels'

export default class App extends React.Component {
  state = {
    activeTab: 'my-payroll',
    showAddEmployeePanel: false
  }

  showAddEmployeePanel = () => {
    this.setState({ showAddEmployeePanel: true })
  }

  hidePanels = () => {
    this.setState({ showAddEmployeePanel: false })
  }

  renderActionButtons () {
    switch (this.state.activeTab) {
      case 'my-payroll':
        return (
          <Button mode='strong'>
            Request salary
          </Button>
        )

      case 'team-payroll':
        return (
          <Button mode='strong' onClick={this.showAddEmployeePanel}>
            Add new employee
          </Button>
        )

      default:
        return null
    }
  }

  render () {
    const header = (
      <React.Fragment>
        <AppBar
          title='Payroll'
          endContent={this.renderActionButtons()}
          data-testid='app-bar'
        />

        <Tab.Container>
          <Tab
            title='My payroll'
            active={this.state.activeTab === 'my-payroll'}
            onClick={() => this.setState({ activeTab: 'my-payroll' })}
            data-testid='my-payroll-tab'
          />

          <Tab
            title='Team payroll'
            active={this.state.activeTab === 'team-payroll'}
            onClick={() => this.setState({ activeTab: 'team-payroll' })}
            data-testid='team-payroll-tab'
          />
        </Tab.Container>
      </React.Fragment>
    )

    return (
      <AragonApp publicUrl='./aragon-ui/'>
        <AppView appBar={header}>
          {this.state.activeTab === 'my-payroll' && (
            <MyPayroll
              {...this.props}
              data-testid='my-payroll-section'
            />
          )}

          {this.state.activeTab === 'team-payroll' && (
            <TeamPayroll
              {...this.props}
              data-testid='team-payroll-section'
            />
          )}
        </AppView>

        <AddEmployee
          {...this.props}
          opened={this.state.showAddEmployeePanel}
          onClose={this.hidePanels}
        />
      </AragonApp>
    )
  }
}
