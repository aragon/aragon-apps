import React from 'react'
import { _DateRange as DateRange, DropDown, GU } from '@aragon/ui'

const TransfersFilters = ({
  compactMode,
  opened,
  dateRangeFilter,
  onDateRangeChange,
  onTokenChange,
  symbols,
  tokenFilter,
  transferTypes,
  transferTypeFilter,
  onTransferTypeChange,
}) => {
  return (
    <div
      css={`
        margin-bottom: ${1 * GU}px;
        display: inline-grid;
        grid-gap: ${1.5 * GU}px;
        grid-template-columns: auto auto auto;
      `}
    >
      <DropDown
        placeholder="Type"
        header="Type"
        items={transferTypes}
        selected={transferTypeFilter}
        onChange={onTransferTypeChange}
      />
      <DropDown
        placeholder="Token Type"
        header="Token Type"
        items={symbols}
        selected={tokenFilter}
        onChange={onTokenChange}
      />
      <label css="display: inline-block;">
        <DateRange
          startDate={dateRangeFilter.start}
          endDate={dateRangeFilter.end}
          onChange={onDateRangeChange}
        />
      </label>
    </div>
  )
}

export default TransfersFilters
