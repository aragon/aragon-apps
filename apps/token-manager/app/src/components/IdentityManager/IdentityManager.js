import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'

const updates$ = new Subject()

export function useIdentity(address) {
  const [name, setName] = useState(null)
  const { resolve, updates$, showLocalIdentityModal } = useContext(
    IdentityContext
  )

  const handleNameChange = metadata => {
    setName(metadata ? metadata.name : null)
  }

  const handleShowLocalIdentityModal = address => {
    // Emit an event whenever the modal is closed (when the promise resolves)
    return showLocalIdentityModal(address)
      .then(() => updates$.next(address))
      .catch(e => null)
  }

  useEffect(() => {
    resolve(address).then(handleNameChange)

    const subscription = updates$.subscribe(updatedAddress => {
      if (updatedAddress.toLowerCase() === address.toLowerCase()) {
        // Resolve and update state when the identity have been updated
        resolve(address).then(handleNameChange)
      }
    })
    return () => subscription.unsubscribe()
  }, [address])

  return [name, handleShowLocalIdentityModal]
}

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
