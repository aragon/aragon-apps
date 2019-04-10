import React, { useCallback } from 'react'
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

// Request a modification of the local identity
function useModifyLocalIdentity() {
  const api = useApi()
  return useCallback(
    address => api.requestAddressIdentityModification(address).toPromise(),
    [api]
  )
}

// The main identity hook, exposing `name`
// and `handleModifyLocalIdentity` based on the provided address.
export function useIdentity(address) {
  const [name, setName] = React.useState(null)
  const resolveLocalIdentity = useResolveLocalIdentity()
  const modifyLocalIdentity = useModifyLocalIdentity()

  const { updates$ } = React.useContext(IdentityContext)

  const handleNameChange = useCallback(metadata => {
    setName(metadata ? metadata.name : null)
  }, [])

  const handleModifyLocalIdentity = address => {
    // Emit an event whenever the address
    // has been modified (when the promise resolves).
    return modifyLocalIdentity(address).then(() => updates$.next(address))
  }

  React.useEffect(() => {
    resolveLocalIdentity(address).then(handleNameChange)

    const subscription = updates$.subscribe(updatedAddress => {
      if (updatedAddress.toLowerCase() === address.toLowerCase()) {
        // Resolve and update state when the identity have been updated.
        resolveLocalIdentity(address).then(handleNameChange)
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [address, handleNameChange, resolveLocalIdentity, updates$])

  return [name, handleModifyLocalIdentity]
}

export const IdentityProvider = ({ children }) => {
  return (
    <IdentityContext.Provider value={{ updates$ }}>
      {children}
    </IdentityContext.Provider>
  )
}
