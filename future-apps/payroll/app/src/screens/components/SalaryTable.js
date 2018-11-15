import React from 'react'
import PropTypes from 'prop-types'

import styled from 'styled-components'
import Table from '../../components/Table'
import { salaryType } from '../../types'
import { formatCurrency, formatDate, formatTokenAmount } from '../../utils/formatting'

import { Button, theme } from '@aragon/ui'

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`

const SalaryTable = (props) => (
  <Table
    noDataMessage='No salaries found'
    sortable={false}
    {...props}
  />
)

SalaryTable.propTypes = {
  ...Table.propTypes,
  data: PropTypes.arrayOf(salaryType).isRequired
}

SalaryTable.defaultProps = {
  columns: [
    {
      name: 'date',
      title: 'Date',
      value: data => data.date,
      formatter: formatDate
    },
    {
      name: 'status',
      title: 'Status',
      value: data => data.status,
    },
    {
      name: 'transaction-address',
      title: 'Transaction Address',
      value: data => data.transactionAddress,
      defaultValue: 'Active'
    },
    {
      name: 'amount',
      title: 'Amount',
      value: data => data.amount,
      cellProps: {
        align: 'right'
      },
      formatter: formatTokenAmount,
      render: (formattedAmount, a, item) => (
        <Amount positive={item.amount.isIncoming}>
          {formattedAmount}
        </Amount>
      )
    },
    {
      name: 'exchange-rate',
      title: 'Exchange Rate',
      value: data => data.exchangeRate,
      formatter: formatCurrency,
      cellProps: {
        align: 'right'
      }
    }
  ]
}

export default SalaryTable
