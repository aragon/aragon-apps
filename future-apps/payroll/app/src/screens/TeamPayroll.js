import React from 'react'
import PropTypes from 'prop-types'

import EmployeeList from './components/EmployeeList'
import Section from '../components/Layout/Section'

class TeamPayroll extends React.Component {
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
          <EmployeeList employees={this.state.employees} />
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
