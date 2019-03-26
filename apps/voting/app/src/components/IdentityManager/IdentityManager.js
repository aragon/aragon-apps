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
}) => {
  const handleShowLocalIdentityModal = address => {
    return onShowLocalIdentityModal(address)
      .then(() => updates$.next(address))
      .catch(e => null)
  }

  return (
    <IdentityContext.Provider
      value={{
        resolve: onResolve,
        showLocalIdentityModal: handleShowLocalIdentityModal,
        updates$,
      }}
    >
      {children}
    </IdentityContext.Provider>
  )
}

IdentityProvider.propTypes = {
  onResolve: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
}

const IdentityConsumer = IdentityContext.Consumer

export { IdentityProvider, IdentityConsumer, IdentityContext }
