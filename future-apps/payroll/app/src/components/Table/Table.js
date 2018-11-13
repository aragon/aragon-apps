import React from 'react'
import PropTypes from 'prop-types'
import { Card } from '@aragon/ui'
import { Button, Table as BaseTable, Text } from '@aragon/ui'

import TableCell from './TableCell'
import TableHeader from './TableHeader'
import TableRow from './TableRow'
import Panel from '../Panel/Panel'
import { sort, SORT_DIRECTION } from '../../utils/sorting'


class Table extends React.Component {
  dataPerPage = 2

  state = {
    sortColumnIndex: 0,
    sortDirection: SORT_DIRECTION.ASC,
    currentPage: 1
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

  paginateData = (data) => {
    const { currentPage } = this.state
    const lastDataIndex = currentPage * this.dataPerPage
    const firstDataIndex = lastDataIndex - this.dataPerPage
    const currentData = data.slice(firstDataIndex, lastDataIndex)
    return currentData
  }

  handlePageChange = (pageNumber) => {
    this.setState({
      currentPage: pageNumber
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

    // TODO: use dynamic page buttons
    const paginatedData = this.paginateData(filteredData)
    const footer = (
      <Card
        height="100%"
        width="100%"
      >
        <Button onClick={() => { this.handlePageChange(1) }}>1</Button>
        <Button onClick={() => { this.handlePageChange(2) }}>2</Button>
      </Card>
    )

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

    const body = paginatedData.map(item => (
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
      <React.Fragment>
        <BaseTable header={header} children={body} />
        <TableFooter content={footer} />
      </React.Fragment>
    )
  }
}

const TableFooter = (props) => (
  <div>
    {props.content}
  </div>
)

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
