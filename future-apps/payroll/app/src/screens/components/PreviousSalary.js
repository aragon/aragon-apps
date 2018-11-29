import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'

import { connect } from '../../context/AragonContext'
import Section from '../../components/Layout/Section'
import SalaryTable from './SalaryTable'
import TokenFilter from './filters/TokenFilter'
import DateRangeFilter from './filters/DateRangeFilter'
import { formatCurrency } from '../../utils/formatting'


class PreviousSalary extends React.PureComponent {
  static defaultProps = {
    payments: [],
    salaryAllocation: [],
    employees: [],
    accountAddress: {}
  }

  state = {
    tokenFilter: null,
    dateRangeFilter: null
  }

  handleClearFilters = () => {
    this.setState({
      statusFilter: null,
      roleFilter: null
    })
  }

  handleTokenFilterChange = (tokenFilter) => {
    this.setState({ tokenFilter })
  }

  handleDateRangeFilterChange = (dateRangeFilter) => {
    this.setState({ dateRangeFilter})
  }

  render () {
    const { salaryAllocation, employees, accountAddress, payments, denominationToken } = this.props
    const { tokenFilter, dateRangeFilter } = this.state
    const filteredPayments = payments.filter(payment => payment.accountAddress === accountAddress)

    const customExchangedFormat = (exchanged) => formatCurrency(exchanged, denominationToken.symbol, 10, 0)
    const customTokenAmountFormat = (amount) => formatCurrency(amount.amount, amount.token.symbol, 10, amount.token.decimals, 1, 2, true, true )

    const tokenFilterOptions = salaryAllocation.map((option) => {
      return {
        label: option.symbol, filter: salary => salary.amount.token.address  === option.address
      }
    })

    const filters = [
      ...(tokenFilter && tokenFilter.filter ? [tokenFilter.filter] : []),
      ...(dateRangeFilter && dateRangeFilter.filter ? [dateRangeFilter.filter] : [])
    ]

    return (
      <StyledContainer>
        <StyledHeader>
          <Section.Title>Previous Salary</Section.Title>
          <StyledFilters>
            <DateRangeFilter
              active={dateRangeFilter}
              onChange={this.handleDateRangeFilterChange}
            />
            <TokenFilter
              active={tokenFilter}
              onChange={this.handleTokenFilterChange}
              options={tokenFilterOptions}
            />
          </StyledFilters>
        </StyledHeader>
        <SalaryTable
          data={filteredPayments}
          filters={filters}
          onClearFilters={this.handleClearFilters}
          formatExchanged={customExchangedFormat}
          formatTokenAmount={customTokenAmountFormat}
        />
      </StyledContainer>
    )
  }
}


const StyledContainer = styled.section`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 120px;
`

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
`

const StyledFilters = styled.div`
  display: flex;
  justify-content: space-between;
  text-align: right;
  > * {
    margin-left: 1rem
  }
`

function getExchangedAmount (payment) {
  return (payment.amount.amount / payment.exchangeRate.amount)
}

function parsePayments (payments) {
  return payments.map((payment) => {
    const exchanged = getExchangedAmount(payment)
    return { ...payment, exchanged }
  })
}

function mapStateToProps ({
  salaryAllocation = [],
  employees = [],
  accountAddress = {},
  payments = [],
  denominationToken = []
}) {
  payments = parsePayments(payments)
  return {
    accountAddress,
    denominationToken,
    employees,
    payments,
    salaryAllocation
  }
}

export default connect(mapStateToProps)(PreviousSalary)
