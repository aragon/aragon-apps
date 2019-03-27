import React from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'

const updates$ = new Subject()

const IdentityContext = React.createContext({
  resolve: () =>
    Promise.reject(Error('Please set resolve using IdentityProvider')),
})

const IdentityProvider = ({
  onResolve,
  onShowLocalIdentityModal,
  children,
}) => (
  <IdentityContext.Provider
    value={{
      resolve: onResolve,
      showLocalIdentityModal: onShowLocalIdentityModal,
      updates$,
    }}
  >
    {children}
  </IdentityContext.Provider>
)

IdentityProvider.propTypes = {
  children: PropTypes.node.isRequired,
  onResolve: PropTypes.func.isRequired,
  onShowLocalIdentityModal: PropTypes.func.isRequired,
}

const IdentityConsumer = IdentityContext.Consumer

export { IdentityProvider, IdentityConsumer, IdentityContext }
