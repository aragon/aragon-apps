import React from 'react'
import { DateRangePicker, DropDown, GU } from '@aragon/ui'
import { noop } from '../lib/utils'

function TransactionFilters({
  dateRangeFilter,
  onDateRangeChange = noop,
  onTokenChange = noop,
  onTransactionTypeChange = noop,
  symbols = [],
  tokenFilter,
  transactionTypes = [],
  transactionTypeFilter,
}) {
  return (
    <div
      css={`
        height: 100%;
        padding-top: ${1 * GU}px;
        margin-bottom: ${0.5 * GU}px;
        display: inline-grid;
        grid-gap: ${1.5 * GU}px;
        grid-template-columns: auto auto auto;
        align-items: center;
      `}
    >
      <DropDown
        placeholder="Type"
        header="Type"
        items={transactionTypes}
        selected={transactionTypeFilter}
        onChange={onTransactionTypeChange}
      />
      <DropDown
        placeholder="Token"
        header="Token"
        items={symbols}
        selected={tokenFilter}
        onChange={onTokenChange}
      />
      <DateRangePicker
        startDate={dateRangeFilter.start}
        endDate={dateRangeFilter.end}
        onChange={onDateRangeChange}
        format={'YYYY-MM-DD'}
      />
    </div>
  )
}

export default TransactionFilters
