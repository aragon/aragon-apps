import React from 'react'
import { render } from 'react-dom'
import Aragon, { providers } from '@aragon/client'

import App from './App'

class ConnectedApp extends React.Component {
  state = {
    app: new Aragon(new providers.WindowMessage(window.parent)),
    observable: null,
    userAccount: ''
  }

  componentDidMount () {
    window.addEventListener('message', this.handleWrapperMessage)

    // If using Parcel, reload instead of using HMR.
    // HMR makes the app disconnect from the wrapper and the state is empty until a reload
    // See: https://github.com/parcel-bundler/parcel/issues/289
    if (module.hot) {
      module.hot.dispose(() => {
        window.location.reload()
      })
    }
  }

  componentWillUnmount () {
    window.removeEventListener('message', this.handleWrapperMessage)
  }

  // Handshake between Aragon Core and the iframe,
  // since iframes can lose messages that were sent before they were ready
  handleWrapperMessage = ({ data }) => {
    if (data.from !== 'wrapper') {
      return
    }

    if (data.name === 'ready') {
      const { app } = this.state

      this.sendMessageToWrapper('ready', true)

      this.setState({ observable: app.state() })

      app.accounts().subscribe(accounts => {
        this.setState({
          userAccount: accounts[0]
        })
      })
    }
  }

  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }

  render () {
    return <App {...this.state} />
  }
}

render(<ConnectedApp/>, document.getElementById('root'))
