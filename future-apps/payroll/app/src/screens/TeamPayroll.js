import React from 'react'
import PropTypes from 'prop-types'

import { AppContext } from '../App'
import EmployeeTable from './components/EmployeeTable'
import Section from '../components/Layout/Section'

class TeamPayroll extends React.Component {
  static contextType = AppContext

  state = {
    employees: []
  }

  componentDidMount () {
    const { app } = this.props

    if (app && typeof app.state === 'function') {
      this.subscription = app.state()
        .subscribe(({ employees }) => {
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
