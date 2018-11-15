import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'

import { connect } from '../../context/AragonContext'
import Section from '../../components/Layout/Section'
import SalaryTable from './SalaryTable'
import TokenFilter from './filters/TokenFilter'
import DateRangeFilter from './filters/DateRangeFilter'

const data = [
  {
    date: 1541818800000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 9000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1541905200000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1541991600000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1542078000000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1542164400000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1542250800000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1542337200000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  },
  {
    date: 1542423600000,
    status: 'Pending',
    transactionAddress: '0xe8898A4E589457D979Da4d1BDc35eC2aaf5a3f8E',
    amount: {
      amount: 1000,
      isIncoming: true,
      displaySign: true
    },
    exchangeRate: 6234.98
  }
]

const Container = styled.section`
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
  text-align: right;
  > * {
    margin-left: 1rem
  }
`


class PreviousSalary extends React.PureComponent {
  static defaultProps = {
    salaries: []
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

  handleTokenFilterChange = () => {
    this.setState({
      tokenFilter: null
    })
  }

  handleDateRangeFilterChange = (dateRangeFilter) => {
    this.setState({ dateRangeFilter})
  }

  render () {
    const { tokenFilter, dateRangeFilter } = this.state

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
            />
          </Filters>
        </Header>
        <SalaryTable
          data={data}
          filters={filters}
          onClearFilters={this.handleClearFilters}
        />
      </Container>
    )
  }
}

function mapStateToProps ({ salaryAllocation }) {
  return {
    salaryAllocation
  }
}

export default connect(mapStateToProps)(PreviousSalary)
