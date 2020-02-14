import React from 'react'
import { DateRangePicker, DropDown, GU } from '@aragon/ui'

const TransfersFilters = ({
  compactMode,
  opened,
  dateRangeFilter,
  onDateRangeChange,
  onTokenChange,
  symbols = [],
  tokenFilter,
  transferTypes = [],
  transferTypeFilter,
  onTransferTypeChange,
}) => {
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
        onChange={onTransferTypeChange}
      />
      <DropDown
        placeholder="Token Type"
        header="Token Type"
        items={symbols}
        selected={tokenFilter}
        onChange={onTokenChange}
      />
      <DateRangePicker onChange={() => {}} />
    </div>
  )
}

export default TransfersFilters
