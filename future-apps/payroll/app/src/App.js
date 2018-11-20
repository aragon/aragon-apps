import React from 'react'
import { AppBar, AppView, AragonApp, Button } from '@aragon/ui'
import Tab from './components/Tab'

import { MyPayroll, TeamPayroll } from './screens'
import { AddEmployee, RequestSalary } from './panels'

export default class App extends React.Component {
  state = {
    activeTab: 'my-payroll',
    showAddEmployeePanel: false,
    showRequestSalaryPanel: false
  }

  componentDidMount () {
    // If using Parcel, reload instead of using HMR.
    // HMR makes the app disconnect from the wrapper and the state is empty until a reload
    // See: https://github.com/parcel-bundler/parcel/issues/289
    if (module.hot) {
      module.hot.dispose(() => {
        window.location.reload()
      })
    }
  }

  showAddEmployeePanel = () => {
    this.setState({ showAddEmployeePanel: true })
  }

  showRequestSalaryPanel = () => {
    this.setState({ showRequestSalaryPanel: true })
  }

  hideAddEmployeePanel = () => {
    this.setState({ showAddEmployeePanel: false })
  }

  hideRequestSalaryPanel = () => {
    this.setState({ showRequestSalaryPanel: false })
  }

  renderActionButtons () {
    switch (this.state.activeTab) {
      case 'my-payroll':
        return (
          <Button mode='strong' onClick={this.showRequestSalaryPanel}>
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
            <MyPayroll />
          )}

          {this.state.activeTab === 'team-payroll' && (
            <TeamPayroll />
          )}
        </AppView>

        <AddEmployee
          opened={this.state.showAddEmployeePanel}
          onClose={this.hideAddEmployeePanel}
        />

        {this.state.activeTab === 'my-payroll' && (<RequestSalary
          opened={this.state.showRequestSalaryPanel}
          onClose={this.hideRequestSalaryPanel}
        />
        )}
      </AragonApp>
    )
  }
}
