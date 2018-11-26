import React from 'react'
import PropTypes from 'prop-types'
import { Button, Table as BaseTable, Text, Card } from '@aragon/ui'

import TableCell from './TableCell'
import TableHeader from './TableHeader'
import TableRow from './TableRow'
import Panel from '../Panel/Panel'
import { sort, SORT_DIRECTION } from '../../utils/sorting'

const footerStyles = {
  card: {
    textAlign: 'center'
  },
  activeNavigationButton: {
    color: '#FFFFFF'
  },
  inactiveNavigationButton: {
    color: '#707070'
  },
  activePageButton: {
    color: '#000000'
  },
  inactivePageButton: {
    color: '#FFFFFF'
  }
}

class Table extends React.Component {
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
    const { rowsPerPage } = this.props
    const { currentPage } = this.state
    const lastDataIndex = currentPage * rowsPerPage
    const firstDataIndex = lastDataIndex - rowsPerPage
    const paginatedData = data.slice(firstDataIndex, lastDataIndex)
    const emptyRows = rowsPerPage - paginatedData.length
    const totalPages = Math.ceil(data.length / rowsPerPage)

    if (paginatedData.length === 0) this.setState({ currentPage: 1 })

    return {
      emptyRows,
      paginatedData,
      totalPages
    }
  }

  handlePageChange = (pageNumber) => () => {
    this.setState({
      currentPage: pageNumber
    })
  }

  renderEmptyRows (emptyRows) {
    const { tableRowHeight } = this.props
    return emptyRows > 0 && (
      <TableRow style={{ height: `${tableRowHeight * emptyRows}px` }} />
    )
  }

  renderPageButtons (data) {
    const { currentPage } = this.state
    const { navigationNextText, navigationPreviousText, rowsPerPage } = this.props
    const {
      activeNavigationButton, inactiveNavigationButton,
      activePageButton, inactivePageButton
    } = footerStyles

    const pageNumbers = Array(Math.ceil(data.length / rowsPerPage))
      .fill()
      .map((_, index) => index + 1)

    const isFirstPage = currentPage === 1
    const isLastPage = currentPage === pageNumbers.length
    return (
      <React.Fragment>
        <Button
          name={`pagination-button-previous`}
          disabled={isFirstPage}
          mode={isFirstPage ? '' : 'strong'}
          style={isFirstPage ? inactiveNavigationButton : activeNavigationButton }
          onClick={this.handlePageChange(currentPage - 1)}
        >
          { navigationPreviousText }
        </Button>
        {pageNumbers.map((pageNumber) => {
          const isCurrentPageButton = pageNumber === currentPage
          const name = `pagination-button-${pageNumber}`
          return (
            <Button
              key={name}
              name={name}
              mode={isCurrentPageButton ? 'strong' : ''}
              style={isCurrentPageButton ? inactivePageButton : activePageButton}
              onClick={this.handlePageChange(pageNumber)}
              >
              {pageNumber}
            </Button>
          )
        })}
        <Button
          name={`pagination-button-next`}
          disabled={isLastPage}
          mode={isLastPage ? '' : 'strong'}
          style={isLastPage ? inactiveNavigationButton : activeNavigationButton }
          onClick={this.handlePageChange(currentPage + 1)}
        >
          { navigationNextText }
        </Button>
      </React.Fragment>
    )
  }

  render () {
    const { columns, data, filters, onClearFilters, sortable, noDataMessage, tableRowHeight } = this.props
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

    // Pagination begins after processing the filters
    const { paginatedData, emptyRows, totalPages } = this.paginateData(filteredData)

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

    const body = (
      <React.Fragment>
        {paginatedData.map(item => (
          <TableRow key={`row-${item.id}`} style={{ height: `${tableRowHeight}px` }}>
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
        ))}
        {this.renderEmptyRows(emptyRows)}
      </React.Fragment>
    )

    const footer = (
      <Card
        height="100%"
        width="100%"
        style={footerStyles.card}
      >
        {this.renderPageButtons(filteredData)}
      </Card>
    )

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
  rowsPerPage: PropTypes.number,
  sortable: PropTypes.bool,
  tableRowHeight: PropTypes.number
}

Table.defaultProps = {
  columns: [{ name: 'id', title: 'ID', value: data => data.id }],
  data: [],
  filters: [],
  navigationNextText: 'Next',
  navigationPreviousText: 'Previous',
  rowsPerPage: 4,
  sortable: true,
  tableRowHeight: 86,
}

export default Table
