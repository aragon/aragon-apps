import React from 'react'
import ReactDOM from 'react-dom'
import Aragon, { providers } from '@aragon/client'
import App from './App'

class ConnectedApp extends React.Component {
  state = {
    app: new Aragon(new providers.WindowMessage(window.parent)),
    network: {},
    observable: null,
    userAccount: '',
  }
  componentDidMount() {
    window.addEventListener('message', this.handleWrapperMessage)
  }
  componentWillUnmount() {
    window.removeEventListener('message', this.handleWrapperMessage)
  }
  handleWrapperMessage = ({ data }) => {
    if (data.from !== 'wrapper') {
      return
    }
    if (data.name === 'ready') {
      const { app } = this.state
      this.sendMessageToWrapper('ready', true)
      this.setState({ observable: app.state() })
      app.accounts().subscribe(accounts => {
        this.setState({ userAccount: accounts[0] || '' })
      })
      app.network().subscribe(network => {
        this.setState({ network })
      })
    }
  }
  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }
  render() {
    return (
      <App {...this.state} sendMessageToWrapper={this.sendMessageToWrapper} />
    )
  }
}

ReactDOM.render(<ConnectedApp />, document.getElementById('root'))
