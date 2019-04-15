import React from 'react'
import PropTypes from 'prop-types'

import Table from '../../components/Table'
import { employeeType } from '../../types'
import { formatDate } from '../../utils/formatting'

const initializeColumns = (data, formatSalary, formatCurrency) => {
  return [
    {
      name: 'name',
      title: 'Name',
      value: data => data.name,
    },
    {
      name: 'start-date',
      title: 'Start Date',
      value: data => data.startDate,
      formatter: formatDate,
    },
    {
      name: 'end-date',
      title: 'End Date',
      value: data => data.endDate,
      formatter: formatDate,
      defaultValue: 'Active',
    },
    {
      name: 'role',
      title: 'Role',
      value: data => data.role,
    },
    {
      name: 'salary',
      title: 'Salary',
      value: data => data.salary,
      formatter: formatSalary,
      cellProps: {
        align: 'right',
      },
    },
    {
      name: 'annual-total-payment',
      title: 'Total Paid This Year',
      value: data => data.totalPaid,
      formatter: formatCurrency,
      cellProps: {
        align: 'right',
      },
    },
  ]
}

const EmployeeTable = props => {
  const columns = initializeColumns(
    props.data,
    props.formatSalary,
    props.formatCurrency
  )
  return (
    <Table
      paginated
      rowsPerPage={4}
      noDataMessage="No employees found"
      columns={columns}
      {...props}
    />
  )
}

EmployeeTable.propTypes = {
  ...Table.propTypes,
  data: PropTypes.arrayOf(employeeType).isRequired,
  formatCurrency: PropTypes.func,
}

export default EmployeeTable
