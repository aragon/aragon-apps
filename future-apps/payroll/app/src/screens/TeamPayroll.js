import React from 'react'

import Section from '../components/Layout/Section'
import EmployeeTable from './components/EmployeeTable'
import * as idm from '../services/idm'

class TeamPayroll extends React.Component {
  state = {
    employees: []
  }

  componentDidMount () {
    this.subscription = this.props.app.state()
      .subscribe(async state => {
        const employees = await Promise.all(
          state.employees.map(async employee => {
            const [{ name, role }] = await idm.getIdentity(employee.domain)

            return { ...employee, name, role }
          })
        )
        this.setState({ employees })
      })
  }

  componentWillUnmount () {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  render () {
    return (
      <Section {...this.props}>
        <Section.Left>
          <Section.Title>Employees</Section.Title>
          <EmployeeTable data={this.state.employees} />
        </Section.Left>
        <Section.Right>
          {/* Side content */}
        </Section.Right>
      </Section>
    )
  }
}

export default TeamPayroll
