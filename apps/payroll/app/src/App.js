import React from 'react'
import styled from 'styled-components'
import { AppBar, AppView, AragonApp, Button, TabBar, theme } from '@aragon/ui'

import { MyPayroll, TeamPayroll } from './screens'
import { AddEmployee, RequestSalary } from './panels'

const appBarTitle = 'Payroll'
const tabTitles = ['My payroll', 'Team payroll']
const tabNames = ['my-payroll', 'team-payroll']

const [MY_PAYROLL, TEAM_PAYROLL] = tabNames
const activeTab = MY_PAYROLL
const selectedTab = 0

export default class App extends React.Component {
  state = {
    activeTab,
    selectedTab,
    showAddEmployeePanel: false,
    showRequestSalaryPanel: false,
  }

  componentDidMount() {
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

  renderActionButtons() {
    switch (this.state.activeTab) {
      case MY_PAYROLL:
        return (
          <Button mode="strong" onClick={this.showRequestSalaryPanel}>
            Request salary
          </Button>
        )

      case TEAM_PAYROLL:
        return (
          <Button mode="strong" onClick={this.showAddEmployeePanel}>
            Add new employee
          </Button>
        )

      default:
        return null
    }
  }

  render() {
    const header = (
      <React.Fragment>
        <AppBar
          title={appBarTitle}
          endContent={this.renderActionButtons()}
          data-testid="app-bar"
        />

        <TabContainer>
          <TabBar
            items={tabTitles}
            selected={this.state.selectedTab}
            onSelect={index => {
              const activeTab = tabNames[index]

              this.setState({
                activeTab,
                selectedTab: index,
              })
            }}
          />
        </TabContainer>
      </React.Fragment>
    )

    return (
      <AragonApp publicUrl="./aragon-ui/">
        <AppView appBar={header}>
          {this.state.activeTab === MY_PAYROLL && <MyPayroll />}

          {this.state.activeTab === TEAM_PAYROLL && <TeamPayroll />}
        </AppView>

        <AddEmployee
          opened={this.state.showAddEmployeePanel}
          onClose={this.hideAddEmployeePanel}
        />

        <RequestSalary
          opened={this.state.showRequestSalaryPanel}
          onClose={this.hideRequestSalaryPanel}
        />
      </AragonApp>
    )
  }
}

const TabContainer = styled.div.attrs({ 'data-testid': 'tab-container' })`
  margin: 0;
  list-style-type: none;
  background: ${theme.contentBackground};
  margin-top: -1px; // Overlap AppBar border
`
