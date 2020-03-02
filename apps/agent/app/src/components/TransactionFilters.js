import React from 'react'
import { DateRangePicker, DropDown, GU } from '@aragon/ui'
import { noop } from '../lib/utils'
import { MMDDYY_FORMAT } from '../lib/date-utils'

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
        endDate={dateRangeFilter.end}
        format={MMDDYY_FORMAT}
        onChange={onDateRangeChange}
        startDate={dateRangeFilter.start}
      />
    </div>
  )
}

export default TransactionFilters
