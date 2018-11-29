import React from 'react'
import PropTypes from 'prop-types'

import styled from 'styled-components'
import Table from '../../components/Table'

import { salaryType } from '../../types'
import { formatDate } from '../../utils/formatting'
import { Button, theme, SafeLink } from '@aragon/ui'

const initializeColumns = (data, formatExchanged, formatTokenAmount) => {
  return [
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
      defaultValue: 'Active',
      render: (formattedValue, rawValue, item) => (
        <TransactionAddress>
          <SafeLink href={`https://rinkeby.etherscan.io/tx/${item.transactionAddress}`} target="_blank">
            {rawValue}
          </SafeLink>
        </TransactionAddress>
      )
    },
    {
      name: 'amount',
      title: 'Amount',
      value: data => data.amount,
      cellProps: {
        align: 'right'
      },
      formatter: formatTokenAmount,
      render: (formattedAmount, rawAmount, item) => (
        <Amount positive={item.amount.isIncoming}>
          {formattedAmount}
        </Amount>
      )
    },
    {
      name: 'exchanged-amount',
      title: 'Exchanged Amount',
      value: data => data.exchanged,
      formatter: formatExchanged,
      cellProps: {
        align: 'right'
      }
    }
  ]
}

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`

const TransactionAddress = styled.span`
  width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
      
const SalaryTable = (props) => {
  const columns = initializeColumns(props.data, props.formatExchanged, props.formatTokenAmount)
  return (
    <Table
      paginated
      noDataMessage='No salaries found'
      sortable={false}
      columns={columns}
      {...props}
    />
  )
}


SalaryTable.propTypes = {
  ...Table.propTypes,
  data: PropTypes.arrayOf(salaryType).isRequired
}

export default SalaryTable