import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'
import { useApi } from '@aragon/api-react'

const updates$ = new Subject()

const IdentityContext = React.createContext({
  resolve: () => Promise.reject(Error('Please declare IdentityProvider')),
})

// Resolve a local identity address
function useResolveLocalIdentity() {
  const api = useApi()
  return useCallback(
    address => api.resolveAddressIdentity(address).toPromise(),
    [api]
  )
}

// Request the local identity modal
function useShowLocalIdentityModal() {
  const api = useApi()
  return useCallback(
    address => api.requestAddressIdentityModification(address).toPromise(),
    [api]
  )
}

// The main identity hook, exposing `name` and `handleShowLocalIdentityModal`
// based on the provided address.
export function useIdentity(address) {
  const [name, setName] = React.useState(null)
  const resolveLocalIdentity = useResolveLocalIdentity()
  const showLocalIdentityModal = useShowLocalIdentityModal()

  const { updates$ } = React.useContext(IdentityContext)

  const handleNameChange = useCallback(metadata => {
    setName(metadata ? metadata.name : null)
  }, [])

  const handleShowLocalIdentityModal = address => {
    // Emit an event whenever the modal is closed (when the promise resolves)
    return showLocalIdentityModal(address).then(() => updates$.next(address))
  }

  React.useEffect(() => {
    resolveLocalIdentity(address).then(handleNameChange)

    const subscription = updates$.subscribe(updatedAddress => {
      if (updatedAddress.toLowerCase() === address.toLowerCase()) {
        // Resolve and update state when the identity have been updated
        resolveLocalIdentity(address).then(handleNameChange)
      }
    })
    return () => subscription.unsubscribe()
  }, [address])

  return [name, handleShowLocalIdentityModal]
}

export const IdentityProvider = ({ children }) => {
  return (
    <IdentityContext.Provider value={{ updates$ }}>
      {children}
    </IdentityContext.Provider>
  )
}
