import React from 'react'
import { TableCell, TableRow, LoadingRing } from '@aragon/ui'

const LoadingRow = React.memo(({ groupMode }) => (
  <TableRow>
    <TableCell colSpan={groupMode ? 2 : 3}>
      <div
        css={`
          width: 100%;
          height: 130px;
          display: flex;
          justify-content: center;
          align-items: center;
        `}
      >
        <LoadingRing animated />
        <span css="margin-left: 5px">Loading data…</span>
      </div>
    </TableCell>
  </TableRow>
))

export default LoadingRow
