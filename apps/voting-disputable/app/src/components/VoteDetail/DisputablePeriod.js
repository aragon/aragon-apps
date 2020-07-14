import React from 'react'
import PropTypes from 'prop-types'
import { GU, Timer, useTheme } from '@aragon/ui'
import { format } from 'date-fns'

//48 hour period
const PERIOD = 1000 * 60 * 60 * 48
const formatDate = date => `${format(date, 'yyyy-MM-dd, HH:mm')}`

function DisputablePeriod({ startDate }) {
  const theme = useTheme()
  const now = new Date().getTime()
  return (
    <React.Fragment>
      {now > startDate + PERIOD ? (
        formatDate(startDate + PERIOD)
      ) : (
        <div
          css={`
            display: inline-flex;
          `}
        >
          <Timer end={new Date(startDate + PERIOD)} />{' '}
          <div
            css={`
              padding-left: ${1 * GU}px;
              color: ${theme.contentSecondary};
            `}
          >
            (48h)
          </div>
        </div>
      )}
    </React.Fragment>
  )
}

export default DisputablePeriod
