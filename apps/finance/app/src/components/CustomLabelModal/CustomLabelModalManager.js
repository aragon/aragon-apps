import React from 'react'
import PropTypes from 'prop-types'
import { Subject } from 'rxjs'
const modifyObservable = new Subject()

const CustomLabelModalContext = React.createContext({})

const CustomLabelModalProvider = ({ onShowCustomLabelModal, children }) => {
  const hookedShowCustomLabelModal = address => {
    return onShowCustomLabelModal(address)
      .then(() => modifyObservable.next(address))
      .catch(e => null)
  }

  return (
    <CustomLabelModalContext.Provider
      value={{
        showCustomLabelModal: hookedShowCustomLabelModal,
        modifyObservable,
      }}
    >
      {children}
    </CustomLabelModalContext.Provider>
  )
}

CustomLabelModalProvider.propTypes = {
  onShowCustomLabelModal: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
}

const CustomLabelModalConsumer = CustomLabelModalContext.Consumer

export {
  CustomLabelModalProvider,
  CustomLabelModalConsumer,
  CustomLabelModalContext,
}
