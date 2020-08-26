import React from 'react'
import PropTypes from 'prop-types'
import { differenceInHours } from 'date-fns'
import { GU, Timer, useTheme } from '@aragon/ui'
import { formatDate } from '../../utils'

//48 hour period
const PERIOD = 1000 * 60 * 60 * 48

function DisputablePeriod({ startDate }) {
  const theme = useTheme()
  const now = new Date().getTime()
  const endDate = startDate + PERIOD

  return (
    <React.Fragment>
      {now > endDate ? (
        formatDate(endDate)
      ) : (
        <div
          css={`
            display: inline-flex;
          `}
        >
          <Timer end={new Date(endDate)} />{' '}
          <div
            css={`
              padding-left: ${1 * GU}px;
              color: ${theme.contentSecondary};
            `}
          >
            ({differenceInHours(PERIOD, 0)}h)
          </div>
        </div>
      )}
    </React.Fragment>
  )
}

DisputablePeriod.propTypes = {
  startDate: PropTypes.number,
}
export default DisputablePeriod
