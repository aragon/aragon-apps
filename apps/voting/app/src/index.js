import React from 'react'
import ReactDOM from 'react-dom'
import Aragon from '@aragon/client'
import Messenger, { providers } from '@aragon/messenger'
import App from './App'

class ConnectedApp extends React.Component {
  state = {
    app: new Aragon(new Messenger(new providers.WindowMessage(window.parent))),
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
    if (data.name === 'account') {
      this.setState({ userAccount: data.value })
    }
    if (data.name === 'ready') {
      console.log('voting ready!')
      this.sendMessageToWrapper('ready', true)
      this.setState({
        observable: this.state.app.state(),
      })
    }
  }
  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }
  render() {
    return <App {...this.state} />
  }
}

ReactDOM.render(<ConnectedApp />, document.getElementById('root'))
