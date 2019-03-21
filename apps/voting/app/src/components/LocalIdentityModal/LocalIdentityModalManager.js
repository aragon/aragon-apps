import React from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'

const updates$ = new Subject()

const LocalIdentityModalContext = React.createContext({})

const LocalIdentityModalProvider = ({ onShowLocalIdentityModal, children }) => {
  const hookedShowLocalIdentityModal = address => {
    return onShowLocalIdentityModal(address)
      .then(() => updates$.next(address))
      .catch(e => null)
  }

  return (
    <LocalIdentityModalContext.Provider
      value={{
        showLocalIdentityModal: hookedShowLocalIdentityModal,
        updates$,
      }}
    >
      {children}
    </LocalIdentityModalContext.Provider>
  )
}

LocalIdentityModalProvider.propTypes = {
  onShowLocalIdentityModal: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
}

const LocalIdentityModalConsumer = LocalIdentityModalContext.Consumer

export {
  LocalIdentityModalProvider,
  LocalIdentityModalConsumer,
  LocalIdentityModalContext,
}
