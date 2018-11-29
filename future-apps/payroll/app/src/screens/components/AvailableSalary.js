import React from 'react'
import styled from 'styled-components'
import BN from 'bn.js'
import AvailableSalaryTable from './AvailableSalaryTable'
import { formatCurrency, SECONDS_IN_A_YEAR } from '../../utils/formatting'
import { differenceInSeconds } from 'date-fns'

import { connect } from '../../context/AragonContext'
import Section from '../../components/Layout/Section'

const AVAILABLE_BALANCE_TICK = 10000

class AvailableSalary extends React.PureComponent {
  static defaultProps = {
    lastPayroll: Date.now(),
    availableBalance: 0,
    totalTransferred: 0,
    salary: 0
  }

  state = {
    denominationToken: {
      symbol: '',
      decimals: 0
    },
    data: []
  }

  getEmployee(addr) {
    return (this.props.employees && this.props.employees.find(
      employee => employee.accountAddress === addr
    ))
  }

  sumExchangeRates (payments, accountAddress) {
    const init = new BN(0)
    const reducer = (acc, payment) => acc.add(new BN(payment.exchangeRate.amount))
    const filter = e => e.accountAddress === accountAddress
    const totalTransferred = payments.filter(filter).reduce(reducer, init)
    return totalTransferred.toString()
  }

  getAvailableBalance (employee, denominationToken) {
    const accruedTime = differenceInSeconds(
      new Date(),
      new Date(employee.lastPayroll)
    )
    const accruedSalary = (accruedTime * employee.salary) + employee.accruedValue
    return accruedSalary
  }

  getAvailableSalaryData (state, props, updateAll) {
    const { payments, accountAddress, denominationToken } = props
    const employee = this.getEmployee(accountAddress)
    const availableBalance = this.getAvailableBalance(employee, denominationToken)

    const totalTransferred = (updateAll) ?
      this.sumExchangeRates(payments, accountAddress) :
      state.data[0].totalTransferred

    const { lastPayroll, salary } = employee
    const data = [{ lastPayroll, salary, totalTransferred, availableBalance }]
    return data
  }

  componentDidUpdate(prevProps) {
    if (this.props.accountAddress != prevProps.accountAddress) {
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        this.setState((state, props) => {
          const data = this.getAvailableSalaryData(state, props, false)
          return { data }
        })
      }, AVAILABLE_BALANCE_TICK);
    }

    if (
      (this.props.accountAddress != prevProps.accountAddress) ||
      (this.props.payments && prevProps.payments && this.props.payments.length != prevProps.payments.length)
    ) {
      this.setState((state, props) => {
        const { denominationToken } = props
        const data = this.getAvailableSalaryData(state, props, true)
        return { data, denominationToken }
      })
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render () {
    const { data, denominationToken } = this.state
    const formatSalary = (amount) => formatCurrency(amount, denominationToken.symbol, 10, denominationToken.decimals, SECONDS_IN_A_YEAR)
    const customFormatCurrency = (amount) => formatCurrency(amount, denominationToken.symbol, 10, denominationToken.decimals)
    const formatTokenAmount = (amount) => formatCurrency(amount, denominationToken.symbol, 10, denominationToken.decimals, 1, 2, true, true)
    return (
      <Container>
        <Header>
          <Section.Title>Available Salary</Section.Title>
        </Header>
        <AvailableSalaryTable
          data={data}
          formatSalary={formatSalary}
          formatCurrency={customFormatCurrency}
          formatTokenAmount={formatTokenAmount} />
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

function mapStateToProps ({
  employees = [],
  accountAddress = [],
  denominationToken = [],
  salaryAllocation = [],
  payments = []
}) {
  return {
    employees,
    accountAddress,
    denominationToken,
    salaryAllocation,
    payments
  }
}

export default connect(mapStateToProps)(AvailableSalary)
