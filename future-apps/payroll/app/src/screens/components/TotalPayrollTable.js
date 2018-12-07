import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import Table from '~/components/Table'
import { employeeType } from '~/types'
import { formatDate } from '~/utils/formatting'

import { theme } from '@aragon/ui'

const initializeColumns = (data, formatCurrency, formatSalary) => {
  return [
    {
      name: 'employees-qty',
      title: 'Employees',
      value: data => data.employeesQty,
      cellProps: {
        style: CellStyle
      }
    },
    {
      name: 'averageSalary',
      title: 'Average Salary',
      value: data => data.averageSalary,
      formatter: formatSalary,
      cellProps: {
        style: CellStyle
      }
    },
    {
      name: 'monthly-burn-date',
      title: 'Monthly burn rate',
      value: data => data.monthlyBurnRate,
      formatter: formatCurrency,
      cellProps: {
        style: { ...CellStyle, ...Negative }
      }
    },
    {
      name: 'total-paid-this-year',
      title: 'Total paid this year',
      value: data => data.totalPaidThisYear,
      formatter: formatCurrency,
      cellProps: {
        style: CellStyle
      }
    }
  ]
}

const Negative = {
  fontWeight: 600,
  color: theme.negative
}

const CellStyle = {
  fontSize: '20px'
}

const TotalPayrollTable = (props) => {
  const columns = initializeColumns(props.data, props.formatCurrency, props.formatSalary)
  return (
    <Table
      noDataMessage='Total payroll not available'
      columns={columns}
      sortable={false}
      {...props}
    />
  )
}

TotalPayrollTable.propTypes = {
  ...Table.propTypes,
  data: PropTypes.arrayOf(employeeType).isRequired
}

export default TotalPayrollTable
