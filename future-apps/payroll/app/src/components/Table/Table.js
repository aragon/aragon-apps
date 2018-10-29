import React from 'react'
import PropTypes from 'prop-types'
import { Table as BaseTable, Text } from '@aragon/ui'

import TableCell from './TableCell'
import TableHeader from './TableHeader'
import TableRow from './TableRow'
import Panel from '../Panel/Panel'
import { sort, SORT_DIRECTION } from '../../utils/sorting'

class Table extends React.Component {
  state = {
    sortColumnIndex: 0,
    sortDirection: SORT_DIRECTION.ASC
  }

  shouldComponentUpdate (nextProps, nextState) {
    return (nextProps.data.sortable !== this.props.sortable)
      || (nextProps.data.length !== this.props.data.length)
      || (nextState.sortColumnIndex !== this.state.sortColumnIndex)
      || (nextState.sortDirection !== this.state.sortDirection)
  }

  handleHeaderClick = (event) => {
    const columnIndex = parseInt(event.currentTarget.dataset.columnIndex)

    this.setState(({ sortColumnIndex, sortDirection }) => {
      if (sortColumnIndex === columnIndex) {
        return {
          sortDirection: -sortDirection
        }
      } else {
        return {
          sortColumnIndex: columnIndex,
          sortDirection: SORT_DIRECTION.ASC
        }
      }
    })
  }

  render () {
    const { columns, data, sortable, noDataMessage } = this.props
    const { sortColumnIndex, sortDirection } = this.state

    if (!data.length) {
      return (
        <Panel>
          <p>{noDataMessage || 'No data available'}</p>
        </Panel>
      )
    }

    const header = (
      <TableRow>
        {columns.map((column, index) => {
          const isSortable = column.sortable || sortable
          const isSortColumn = sortColumnIndex === index

          return (
            <TableHeader
              key={`header-${column.name}`}
              title={column.title}
              sortable={isSortable}
              sortDirection={isSortColumn ? sortDirection : 0}
              onClick={isSortable && this.handleHeaderClick}
              data-column-index={index}
            />
          )
        })}
      </TableRow>
    )

    const sortColumn = columns[sortColumnIndex]
    const sortedData = sort(data, sortColumn.value, sortDirection)

    const body = sortedData.map(item => (
      <TableRow key={`row-${item.id}`}>
        {columns.map(column => {
          const rawValue = column.value(item)
          const formattedValue = rawValue != null
            ? (column.formatter
                ? column.formatter(rawValue)
                : rawValue.toString()
            )
            : column.defaultValue

          return (
            <TableCell
              key={`row-${item.id}-${column.name}`}
              {...column.cellProps}
              children={column.render
                ? column.render(formattedValue, rawValue)
                : (<Text>{formattedValue}</Text>)
              }
            />
          )
        })}
      </TableRow>
    ))

    return (
      <BaseTable header={header} children={body} />
    )
  }
}

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.func.isRequired,
      defaultValue: PropTypes.any,
      format: PropTypes.func,
      render: PropTypes.func,
      sortable: PropTypes.bool
    })
  ),
  data: PropTypes.arrayOf(PropTypes.object),
  noDataMessage: PropTypes.string,
  sortable: PropTypes.bool
}

Table.defaultProps = {
  columns: [{ name: 'id', title: 'ID', value: data => data.id }],
  data: [],
  sortable: true
}

export default Table