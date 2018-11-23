import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'

import { connect } from '../../context/AragonContext'
import Section from '../../components/Layout/Section'
import SalaryTable from './SalaryTable'
import TokenFilter from './filters/TokenFilter'
import DateRangeFilter from './filters/DateRangeFilter'
import { formatCurrency } from '../../utils/formatting'


const Container = styled.section`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 120px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

const Filters = styled.div`
  display: flex;
  justify-content: space-between;
  text-align: right;
  > * {
    margin-left: 1rem
  }
`


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
    console.log('token filter', tokenFilter)
    this.setState({ tokenFilter })
  }

  handleDateRangeFilterChange = (dateRangeFilter) => {
    this.setState({ dateRangeFilter})
  }

  render () {
    const { salaryAllocation, employees, accountAddress, payments, denominationToken } = this.props
    const { tokenFilter, dateRangeFilter } = this.state
    const filteredPayments = payments.filter(payment => payment.accountAddress === accountAddress)

    // const customExchangeRateFormat = (exchangeRate) => formatCurrency(exchangeRate.amount, denominationToken.symbol, 10, denominationToken.decimals)

    // FIXME: we need better understanding of the exchangeRate value from the contract before using a formatting function - sgobotta
    const customExchangeRateFormat = (exchangeRate) => `${exchangeRate.amount} ${denominationToken.symbol}`

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
      <Container>
        <Header>
          <Section.Title>Previous Salary</Section.Title>
          <Filters>
            <DateRangeFilter
              active={dateRangeFilter}
              onChange={this.handleDateRangeFilterChange}
            />
            <TokenFilter
              active={tokenFilter}
              onChange={this.handleTokenFilterChange}
              options={tokenFilterOptions}
            />
          </Filters>
        </Header>
        <SalaryTable
          data={filteredPayments}
          filters={filters}
          onClearFilters={this.handleClearFilters}
          formatExchangeRate={customExchangeRateFormat}
        />
      </Container>
    )
  }
}

function mapStateToProps ({ salaryAllocation = [], employees = [], accountAddress = {}, payments = [], denominationToken = [] }) {
  return {
    accountAddress,
    denominationToken,
    employees,
    payments,
    salaryAllocation
  }
}

export default connect(mapStateToProps)(PreviousSalary)
