import React from 'react'
import Aragon, { providers } from '@aragon/client'

const AragonContext = React.createContext()

const APP_LOADING_DELAY = 700

export class AragonProvider extends React.Component {
  state = {}

  componentDidMount() {
    const { loadingDelay = APP_LOADING_DELAY } = this.props

    setTimeout(() => {
      this.setState(
        () => {
          const app = new Aragon(new providers.WindowMessage(window.parent))

          return { app }
        },
        () => {
          window.addEventListener('message', this.handleWrapperMessage)
        }
      )
    }, loadingDelay)
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleWrapperMessage)
  }

  // Handshake between Aragon Core and the iframe,
  // since iframes can lose messages that were sent before they were ready
  handleWrapperMessage = ({ data }) => {
    if (data.from !== 'wrapper') {
      return
    }

    if (data.name === 'ready') {
      this.sendMessageToWrapper('ready', true)
    }
  }

  sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }

  render() {
    if (!this.state.app) {
      return null // TODO: Loading message
    }

    return (
      <AragonContext.Provider value={this.state.app}>
        {this.props.children}
      </AragonContext.Provider>
    )
  }
}

export function connect(mapStateToProps) {
  return WrappedComponent => {
    class ConnectedComponent extends React.Component {
      static contextType = AragonContext

      constructor(props) {
        super(props)
        this.state = {}
      }

      componentDidMount() {
        const app = this.context

        if (app) {
          this.subscription = app
            .state()
            .map(mapStateToProps || (state => state))
            .subscribe(state => this.setState({ ...state }))
        }
      }

      componentWillUnmount() {
        if (this.subscription) {
          this.subscription.unsubscribe()
        }
      }

      render() {
        const { forwardedRef, ...props } = this.props

        return (
          <WrappedComponent
            ref={forwardedRef}
            app={this.context}
            {...props}
            {...this.state}
          />
        )
      }
    }

    return React.forwardRef((props, ref) => (
      <ConnectedComponent {...props} forwardedRef={ref} />
    ))
  }
}

export function withAragon(WrappedComponent) {
  return React.forwardRef((props, ref) => (
    <AragonContext.Consumer>
      {app => <WrappedComponent ref={ref} app={app} {...props} />}
    </AragonContext.Consumer>
  ))
}

export default AragonContext
