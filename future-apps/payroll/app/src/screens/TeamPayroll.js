import React from 'react'
import PropTypes from 'prop-types'

import Section from '../components/Layout/Section'
import EmployeeTable from './components/EmployeeTable'
import * as idm from '../services/idm'

class TeamPayroll extends React.Component {
  state = {
    employees: []
  }

  componentDidMount () {
    const { app } = this.props

    if (app && typeof app.state === 'function') {
      this.subscription = app.state()
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

TeamPayroll.propTypes = {
  app: PropTypes.shape({
    state: PropTypes.func.isRequired
  })
}

export default TeamPayroll
