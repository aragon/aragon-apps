import React from 'react'
import PropTypes from 'prop-types'
import { Button, Card, Table as BaseTable, Text } from '@aragon/ui'
import styled from 'styled-components'

import TableCell from './TableCell'
import TableHeader from './TableHeader'
import TableRow from './TableRow'
import Panel from '../Panel/Panel'
import { sort, SORT_DIRECTION } from '../../utils/sorting'


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

    if (paginatedData.length === 0) this.setState({ currentPage: 1 })

    return {
      emptyRows,
      paginatedData
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

  renderButton(props) {
    return (
      <StyledButton {...props}>
        { props.text }
      </StyledButton>
    )
  }

  renderPageButtons (dataLength) {
    const { currentPage } = this.state
    const { navigationNextText, navigationPreviousText, rowsPerPage } = this.props

    const pageNumbers = Array(Math.ceil(dataLength / rowsPerPage))
      .fill()
      .map((_, index) => index + 1)

    const isFirstPage = currentPage === 1
    const isLastPage = currentPage === pageNumbers.length
    return (
      <React.Fragment>
        {
          this.renderButton({
            disabled: isFirstPage,
            mode: isFirstPage ? '' : 'strong',
            name: 'pagination-button-previous',
            onClick: this.handlePageChange(currentPage - 1),
            text: navigationPreviousText,
            type: 'navigation'
          })
        }
        {pageNumbers.map((pageNumber) => {
          const isCurrentPageButton = pageNumber === currentPage
          const mode = isCurrentPageButton ? 'strong' : ''
          const name = `pagination-button-${pageNumber}`
          const pageButton = this.renderButton({
            disabled: isCurrentPageButton,
            key: name,
            mode,
            name,
            onClick: this.handlePageChange(pageNumber),
            text: pageNumber,
            type: 'page'
          })
          return pageButton
        })}
        {
          this.renderButton({
            disabled: isLastPage,
            mode: isLastPage ? '' : 'strong',
            name: 'pagination-button-next',
            onClick: this.handlePageChange(currentPage + 1),
            text: navigationNextText,
            type: 'navigation'
          })
        }
      </React.Fragment>
    )
  }

  render () {
    const { columns, data, filters, onClearFilters, paginated, sortable, noDataMessage, tableRowHeight } = this.props
    const { sortColumnIndex, sortDirection } = this.state

    let filteredData = data.filter(i => filters.every(f => !f || f(i)))

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
    let _emptyRows = 0
    if (paginated) {
      const { paginatedData, emptyRows, totalPages } = this.paginateData(filteredData)
      filteredData = paginatedData
      _emptyRows = emptyRows
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
              onClick={isSortable ? this.handleHeaderClick : () => {}}
              data-column-index={index}
            />
          )
        })}
      </TableRow>
    )

    const body = (
      <React.Fragment>
        {filteredData.map((item, index) => (
          <TableRow key={`row-${item.id}-${index}`} style={{ height: `${tableRowHeight}px` }}>
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
        ))}
        {paginated && this.renderEmptyRows(_emptyRows)}
      </React.Fragment>
    )

    const footer = (
      <StyledCard>
        {this.renderPageButtons(data.length)}
      </StyledCard>
    )

    return (
      <React.Fragment>
        <BaseTable header={header} children={body} />
        {paginated && <TableFooter content={footer} />}
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
  paginated: PropTypes.bool,
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
  paginated: false,
  rowsPerPage: 4,
  sortable: true,
  tableRowHeight: 86,
}

const StyledCard = styled(Card)`
  height: 100%;
  width: 100%;
  text-align: center;
`

const StyledButton = styled(Button)`
  ${({ type, disabled }) => (
    ({
      page: () => disabled ? 'color: #FFFFFF' : 'color: #000000',
      navigation: () => disabled ? 'color: #707070' : 'color: #FFFFFF'
    })[type]()
  )}
`

export default Table
