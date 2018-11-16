import React from 'react'
import PropTypes from 'prop-types'
import { Button, Table as BaseTable, Text } from '@aragon/ui'

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
      || (nextProps.filters.length !== this.props.filters.length)
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
    const { columns, data, filters, onClearFilters, sortable, noDataMessage } = this.props
    const { sortColumnIndex, sortDirection } = this.state

    const filteredData = data.filter(i => filters.every(f => !f || f(i)))

    if (!filteredData.length) {
      return (
        <Panel>
          <Text.Paragraph>
            {noDataMessage || 'No data available'}
          </Text.Paragraph>

          {filteredData.length === 0 && filters.length > 0 && (
            <Button mode='text' size='small' onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </Panel>
      )
    }

    sort(filteredData, columns[sortColumnIndex].value, sortDirection)

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
              onClick={isSortable ? this.handleHeaderClick : () => {}}
              data-column-index={index}
            />
          )
        })}
      </TableRow>
    )

    const body = filteredData.map((item, index) => (
      <TableRow key={`row-${item.id}-${index}`}>
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
                ? column.render(formattedValue, rawValue, item)
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
  data: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.any })
  ),
  filters: PropTypes.arrayOf(PropTypes.func),
  noDataMessage: PropTypes.string,
  onClearFilters: PropTypes.func,
  sortable: PropTypes.bool
}

Table.defaultProps = {
  columns: [{ name: 'id', title: 'ID', value: data => data.id }],
  data: [],
  filters: [],
  sortable: true
}

export default Table
