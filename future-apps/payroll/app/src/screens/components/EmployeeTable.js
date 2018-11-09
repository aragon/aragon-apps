import React from 'react'
import PropTypes from 'prop-types'

import Table from '../../components/Table'
import { employeeType } from '../../types'
import { formatDate } from '../../utils/formatting'

const initializeColumns = (data, currencyFormat) => {
  return [
    {
      name: 'name',
      title: 'Name',
      value: data => data.name
    },
    {
      name: 'start-date',
      title: 'Start Date',
      value: data => data.startDate,
      formatter: formatDate
    },
    {
      name: 'end-date',
      title: 'End Date',
      value: data => data.endDate,
      formatter: formatDate,
      defaultValue: 'Active'
    },
    {
      name: 'role',
      title: 'Role',
      value: data => data.role
    },
    {
      name: 'salary',
      title: 'Salary',
      value: data => data.salary,
      formatter: currencyFormat,
      cellProps: {
        align: 'right'
      }
    },
    {
      name: 'annual-total-payment',
      title: 'Total Paid This Year',
      value: data => data.accruedValue,
      formatter: currencyFormat,
      cellProps: {
        align: 'right'
      }
    }
  ]
}

const EmployeeTable = (props) => {
  const columns = initializeColumns(props.data, props.formatCurrency)
  return (
    <Table
      noDataMessage='No employees found'
      columns={columns}
      {...props}
    />
  )
}

EmployeeTable.propTypes = {
  ...Table.propTypes,
  data: PropTypes.arrayOf(employeeType).isRequired,
  formatCurrency: PropTypes.func
}

export default EmployeeTable
