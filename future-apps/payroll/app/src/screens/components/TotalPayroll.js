import React from 'react'
import styled from 'styled-components'
import TotalPayrollTable from './TotalPayrollTable'
import { formatCurrency, SECONDS_IN_A_YEAR } from '../../utils/formatting'
import { differenceInYears } from 'date-fns'

import { connect } from '../../context/AragonContext'
import Section from '../../components/Layout/Section'

class TotalPayroll extends React.PureComponent {
  static defaultProps = {
    employeesQty: 0,
    averageSalary: 0,
    monthlyBurnRate: 0,
    totalPaidThisYear: 0
  }

  state = {
    denominationToken: {
      symbol: '',
      decimals: 0
    },
    data: []
  }

  getTotalPayrollData (state, props) {
    const { employeesQty, averageSalary, monthlyBurnRate, totalPaidThisYear } =  props
    const data = [{ employeesQty, averageSalary, monthlyBurnRate, totalPaidThisYear }]
    return data
  }

  componentDidUpdate(prevProps) {
    if (
      (this.props.accountAddress != prevProps.accountAddress) ||
      (this.props.employeesQty && prevProps.employeesQty && this.props.employeesQty != prevProps.employeesQty)
    ) {
      this.setState((state, props) => {
        const { denominationToken } = props
        const data = this.getTotalPayrollData(state, props)
        return { data, denominationToken }
      })
    }
  }

  render () {
    const { data, denominationToken } = this.state
    const formatSalary = (amount) => formatCurrency(amount, denominationToken.symbol, 10, denominationToken.decimals, SECONDS_IN_A_YEAR)
    const customFormatCurrency = (amount) => formatCurrency(amount, denominationToken.symbol, 10, 0)
    return (
      <Container>
        <Header>
          <Section.Title>Total Payroll</Section.Title>
        </Header>
        <TotalPayrollTable
          data={data}
          formatSalary={formatSalary}
          formatCurrency={customFormatCurrency} />
      </Container>
    )
  }
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 2em;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

const Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
`

function totalPaidThisYear (payments, accountAddress) {
  const init = 0
  const reducer = (acc, payment) => acc + payment.exchanged
  const filter = (p) => {
    const yearDiff = differenceInYears(
      new Date(p.date),
      new Date()
    )
    return (
      p.accountAddress === accountAddress &&
      yearDiff === 0
    )
  }
  const totalPaid = payments.filter(filter).reduce(reducer, init)
  return totalPaid
}

function parseEmployees (payments, employees) {
  return employees.map((e) => {
    const totalPaid = totalPaidThisYear(payments, e.accountAddress)
    return { ...e, totalPaid }
  })
}

function getAverageSalary (employees) {
  const init = 0
  const reducer = (acc, employee) => acc + employee.salary
  const sum = employees.reduce(reducer, init)
  return (sum / employees.length)
}

function getTotalPaidThisYear (employees) {
  const init = 0
  const reducer = (acc, employee) => acc + employee.totalPaid
  return employees.reduce(reducer, init)
}

function getMonthlyBurnRate (total) {
  const MONTHS_IN_A_YEAR = 12
  return total / MONTHS_IN_A_YEAR
}

function mapStateToProps ({
  employees = [],
  accountAddress = [],
  denominationToken = [],
  payments = []
}) {
  employees = parseEmployees(payments, employees)
  const totalPaidThisYear = getTotalPaidThisYear(employees)
  return {
    employeesQty: employees.length,
    averageSalary: getAverageSalary(employees),
    monthlyBurnRate: getMonthlyBurnRate(totalPaidThisYear),
    totalPaidThisYear,
    accountAddress,
    denominationToken,
  }
}

export default connect(mapStateToProps)(TotalPayroll)
