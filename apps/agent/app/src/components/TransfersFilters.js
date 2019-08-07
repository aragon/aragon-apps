import React from 'react'
import { DropDown, GU } from '@aragon/ui'
import DateRange from './DateRange/DateRangeInput'

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
        label="Type"
        header="Type"
        items={transferTypes}
        selected={transferTypeFilter}
        onChange={onTransferTypeChange}
        width="128px"
      />
      <DropDown
        label="Token Type"
        header="Token Type"
        items={symbols}
        selected={tokenFilter}
        onChange={onTokenChange}
        width="128px"
      />
      <label
        css={`
          display: inline-block;
          box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
        `}
      >
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
