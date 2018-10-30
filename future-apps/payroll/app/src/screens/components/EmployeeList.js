import React from 'react'
import styled from 'styled-components'

import Section from '../../components/Layout/Section'
import AragonContext from '../../context/AragonContext'
import EmployeeTable from './EmployeeTable'
import RoleFilter from './RoleFilter'
import StatusFilter from './StatusFilter'

const Container = styled.article`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

const Filters = styled.div`
  display: flex;
  justify-content: space-between;

  > * {
    margin-left: 1rem
  }
`

class EmployeeList extends React.Component {
  static contextType = AragonContext

  state = {
    employees: [],
    roleFilter: null,
    statusFilter: null
  }

  componentDidMount () {
    const app = this.context

    if (app && typeof app.state === 'function') {
      this.subscription = app.state()
        .pluck('employees')
        .subscribe(employees => {
          if (employees) {
            this.setState({ employees })
          }
        })
    }
  }

  componentWillUnmount () {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  handleClearFilters = () => {
    this.setState({
      statusFilter: null,
      roleFilter: null
    })
  }

  handleRoleFilterChange = (roleFilter) => {
    this.setState({ roleFilter })
  }

  handleStateFilterChange = (statusFilter) => {
    this.setState({ statusFilter })
  }

  render () {
    const { employees, roleFilter, statusFilter } = this.state

    const filters = [
      ...(roleFilter && roleFilter.filter ? [roleFilter.filter] : []),
      ...(statusFilter && statusFilter.filter ? [statusFilter.filter] : [])
    ]

    const roles = new Set(
      employees.map(e => e.role)
    )

    return (
      <Container>
        <Header>
          <Section.Title>Employees</Section.Title>
          <Filters>
            <StatusFilter
              active={statusFilter}
              onChange={this.handleStateFilterChange}
            />
            <RoleFilter
              active={roleFilter}
              onChange={this.handleRoleFilterChange}
              roles={roles}
            />
          </Filters>
        </Header>
        <EmployeeTable
          data={employees}
          filters={filters}
          onClearFilters={this.handleClearFilters}
        />
      </Container>
    )
  }
}

export default EmployeeList
