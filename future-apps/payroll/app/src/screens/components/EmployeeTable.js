import React from 'react'
import PropTypes from 'prop-types'

import Table from '../../components/Table'
import { employeeType } from '../../types'
import { formatCurrency, formatDate } from '../../utils/formatting'

class EmployeeTable extends React.Component {
  render () {
    const { columns, data: employees, sortable } = this.props

    return (
      <Table
        columns={columns}
        data={employees}
        sortable={sortable}
        noDataMessage='No employees found'
      />
    )
  }
}

EmployeeTable.propTypes = {
  columns: Table.propTypes.columns,
  data: PropTypes.arrayOf(employeeType).isRequired,
  sortable: Table.propTypes.sortable
}

EmployeeTable.defaultProps = {
  columns: [
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
      formatter: formatCurrency,
      cellProps: {
        align: 'right'
      }
    },
    {
      name: 'annual-total-payment',
      title: 'Total Paid This Year',
      value: data => data.accruedValue,
      formatter: formatCurrency,
      cellProps: {
        align: 'right'
      }
    }
  ]
}

export default EmployeeTable
