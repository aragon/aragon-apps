import React from 'react'
import PropTypes from 'prop-types'
import { Table, TableHeader, TableRow, TableCell, Text } from '@aragon/ui'

import Panel from '../../components/Panel/Panel'
import { formatCurrency, formatDate } from '../../utils/formatting'

class EmployeeTable extends React.Component {
  renderHeader () {
    return (
      <TableRow>
        <TableHeader title='Name'/>
        <TableHeader title='Start Date'/>
        <TableHeader title='End Date'/>
        <TableHeader title='Role'/>
        <TableHeader title='Salary'/>
        <TableHeader title='Total Paid This Year'/>
      </TableRow>
    )
  }

  render () {
    const { data: employees } = this.props

    if (!employees.length) {
      return (
        <Panel>
          <p>
            No employees found
          </p>
        </Panel>
      )
    }

    return (
      <Table header={this.renderHeader()}>
        {employees.map(employee => (
          <TableRow key={employee.id}>
            <TableCell>
              <Text>{employee.name}</Text>
            </TableCell>
            <TableCell>
              <Text>{employee.startDate ? formatDate(employee.startDate) : '-'}</Text>
            </TableCell>
            <TableCell>
              <Text>{employee.endDate ? formatDate(employee.endDate) : 'Active'}</Text>
            </TableCell>
            <TableCell>
              <Text>{employee.role}</Text>
            </TableCell>
            <TableCell>
              <Text>{formatCurrency(employee.salary || 0)}</Text>
            </TableCell>
            <TableCell>
              <Text>{formatCurrency(employee.accruedValue || 0)}</Text>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    )
  }
}

EmployeeTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      startDate: PropTypes.instanceOf(Date),
      endDate: PropTypes.instanceOf(Date),
      role: PropTypes.string,
      salary: PropTypes.number,
      accruedValue: PropTypes.number,
    })
  )
}

export default EmployeeTable
