import React from 'react'
import PropTypes from 'prop-types'
import LocalLabelAppBadge from '../LocalIdentityBadge/LocalLabelAppBadge'
import { GU, IconCheck, textStyle, useTheme } from '@aragon/ui'

const DetailedAppBadge = ({ appAddress, iconSrc, identifier, label, youVoted }) => {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        justify-content: space-between;
        margin-bottom: ${2 * GU}px;
      `}
    >
      <LocalLabelAppBadge
        appAddress={appAddress}
        iconSrc={iconSrc}
        identifier={identifier}
        label={label}
      />
      {youVoted && (
        <div
          css={`
            display: inline-grid;
            grid-template-columns: auto auto;
            grid-gap: ${0.5 * GU}px;
            align-items: center;
            justify-content: center;
            height: 20px;
            width: auto;
            border-radius: 100px;
            padding: 0 ${1 * GU}px;
            background: ${theme.infoSurface.alpha(0.08)};
            color: ${theme.info};
            ${textStyle('label2')};
          `}
        >
          <IconCheck size="tiny" /> Voted
        </div>
      )}
    </div>
  )
}

DetailedAppBadge.propTypes = {
  appAddress: PropTypes.string.isRequired,
  iconSrc: PropTypes.string.isRequired,
  identifier: PropTypes.string,
  label: PropTypes.string.isRequired,
  youVoted: PropTypes.bool.isRequired,
}

export default DetailedAppBadge
