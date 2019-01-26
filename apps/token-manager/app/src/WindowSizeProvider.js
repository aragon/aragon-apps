import React from 'react'

const WIDTH_MEDIUM = 768
const WIDTH_LARGE = 1170

const windowSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
})

const BASE = {
  WIDTH_MEDIUM,
  WIDTH_LARGE,
  ...windowSize(),
}

const { Provider, Consumer } = React.createContext(BASE)

class WindowSizeProvider extends React.Component {
  state = { windowSize: this.getWindowSize() }

  componentDidMount() {
    this.updateWindowSize()
    window.addEventListener('resize', this.updateWindowSize)
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowSize)
  }

  updateWindowSize = () => {
    this.setState({ windowSize: this.getWindowSize() })
  }

  getWindowSize() {
    const width = window.innerWidth
    const height = window.innerHeight
    return {
      ...BASE,
      ...windowSize(),
    }
  }

  render() {
    const { windowSize } = this.state
    const { children } = this.props
    return <Provider value={windowSize}>{children}</Provider>
  }
}

export { WindowSizeProvider, Consumer as WindowSize }
