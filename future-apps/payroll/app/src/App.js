import React from 'react'
import { AppBar, AppView, AragonApp, Button } from '@aragon/ui'
import Tab from './components/Tab'

import { AragonProvider } from './context/AragonContext'
import { MyPayroll, TeamPayroll } from './screens'
import { AddEmployee } from './panels'

export default class App extends React.Component {
  state = {
    activeTab: 'my-payroll',
    showAddEmployeePanel: false
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
      <AragonProvider>
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
      </AragonProvider>
    )

    return (
      <AragonApp publicUrl='./aragon-ui/'>
        <AppView appBar={header}>
          {this.state.activeTab === 'my-payroll' && (
            <MyPayroll
              data-testid='my-payroll-section'
            />
          )}

          {this.state.activeTab === 'team-payroll' && (
            <TeamPayroll
              data-testid='team-payroll-section'
            />
          )}
        </AppView>

        <AddEmployee
          opened={this.state.showAddEmployeePanel}
          onClose={this.hidePanels}
        />
      </AragonApp>
    )
  }
}
