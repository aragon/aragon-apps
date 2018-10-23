import React from 'react'
import PropTypes from 'prop-types'
import getDisplayName from 'react-display-name'
import BN from 'bn.js'

export const settingsContextType = PropTypes.shape({
  pctBase: PropTypes.instanceOf(BN),
  voteTime: PropTypes.number,
})

const provideSettings = Component => {
  const GetSettings = (props, context) => <Component {...context} {...props} />
  GetSettings.contextTypes = {
    settings: settingsContextType,
  }
  GetSettings.displayName = `GetSettings(${getDisplayName(Component)})`
  return GetSettings
}

export default provideSettings
