import React from 'react'
import { DateRangePicker, DropDown, GU } from '@aragon/ui'
import { noop } from '../lib/utils'

function TransfersFilters({
  dateRangeFilter,
  onDateRangeChange = noop,
  onTokenChange = noop,
  onTransactionTypeChange = noop,
  symbols = [],
  tokenFilter,
  transferTypes = [],
  transferTypeFilter,
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
        items={transferTypes}
        selected={transferTypeFilter}
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
        onChange={onDateRangeChange}
        startDate={dateRangeFilter.start}
      />
    </div>
  )
}

export default TransfersFilters
