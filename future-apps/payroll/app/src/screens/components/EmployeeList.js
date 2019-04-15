import React from 'react'
import styled from 'styled-components'
import BN from 'bn.js'

import EmployeeTable from './EmployeeTable'
import RoleFilter from './RoleFilter'
import StatusFilter from './StatusFilter'
import Section from '../../components/Layout/Section'
import { connect } from '../../context/AragonContext'
import { totalPaidThisYear } from '../../utils/calculations'
import { formatCurrency, SECONDS_IN_A_YEAR } from '../../utils/formatting'

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
    margin-left: 1rem;
  }
`

class EmployeeList extends React.Component {
  static defaultProps = {
    employees: [],
    denominationToken: [],
  }

  state = {
    roleFilter: null,
    statusFilter: null,
  }

  handleClearFilters = () => {
    this.setState({
      statusFilter: null,
      roleFilter: null,
    })
  }

  handleRoleFilterChange = roleFilter => {
    this.setState({ roleFilter })
  }

  handleStateFilterChange = statusFilter => {
    this.setState({ statusFilter })
  }

  render() {
    const { employees, denominationToken } = this.props
    const { roleFilter, statusFilter } = this.state
    const filters = [
      ...(roleFilter && roleFilter.filter ? [roleFilter.filter] : []),
      ...(statusFilter && statusFilter.filter ? [statusFilter.filter] : []),
    ]
    const customSalaryFormat = amount =>
      formatCurrency(
        amount,
        denominationToken.symbol,
        10,
        denominationToken.decimals,
        SECONDS_IN_A_YEAR
      )
    const customCurrencyFormat = amount =>
      formatCurrency(amount, denominationToken.symbol, 10, 0)
    const roles = new Set(employees.map(e => e.role))

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
          formatSalary={customSalaryFormat}
          formatCurrency={customCurrencyFormat}
          filters={filters}
          onClearFilters={this.handleClearFilters}
        />
      </Container>
    )
  }
}

function parseEmployees(payments, employees) {
  return employees.map(e => {
    const totalPaid = totalPaidThisYear(payments, e.accountAddress)
    return { ...e, totalPaid }
  })
}

function mapStateToProps({
  employees = [],
  denominationToken = [],
  payments = [],
}) {
  employees = parseEmployees(payments, employees)
  return {
    employees,
    denominationToken,
    payments,
  }
}

export default connect(mapStateToProps)(EmployeeList)
