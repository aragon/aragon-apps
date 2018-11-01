import React from 'react'
import Aragon, { providers } from '@aragon/client'

const AragonContext = React.createContext()

export class AragonProvider extends React.Component {
  app = new Aragon(new providers.WindowMessage(window.parent))

  state = {
    userAccount: ''
  }

  componentDidMount () {
    console.log('AragonContext componentDidMount')
    window.addEventListener('message', this.handleWrapperMessage)
  }

  componentWillUnmount () {
    window.removeEventListener('message', this.handleWrapperMessage)
  }

  // Handshake between Aragon Core and the iframe,
  // since iframes can lose messages that were sent before they were ready
  handleWrapperMessage = ({ data }) => {
    console.log('AragonContext handleWrapperMessage', data)
    if (data.from !== 'wrapper') {
      return
    }

    if (data.name === 'ready') {
      this.sendMessageToWrapper('ready', true)

      this.app.accounts().subscribe(accounts => {
        this.setState({ userAccount: accounts[0] })
      })
    }
  }

  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }

  render () {
    return (
      <AragonContext.Provider value={this.app}>
        {this.props.children}
      </AragonContext.Provider>
    )
  }
}

export function withAragon (WrappedComponent) {
  return (props) => (
    <AragonContext.Consumer>
      {app => (
        <WrappedComponent app={app} {...props} />
      )}
    </AragonContext.Consumer>
  )
}

export default AragonContext
