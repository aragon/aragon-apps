import React from 'react'
import PropTypes from 'prop-types'
import EventEmitter from 'events'

const modifyObservable = new EventEmitter()

const CustomLabelModalContext = React.createContext({})

const CustomLabelModalProvider = ({ onShowCustomLabelModal, children }) => {
  const hookedShowCustomLabelModal = data => {
    return onShowCustomLabelModal(data)
      .then(() => modifyObservable.emit('event', data))
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
