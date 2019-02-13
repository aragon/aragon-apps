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
    const { width, height } = windowSize()
    return {
      ...BASE,
      width,
      height,
      fromMedium: width >= WIDTH_MEDIUM,
      fromLarge: width >= WIDTH_LARGE,
      toMedium: width < WIDTH_MEDIUM,
      toLarge: width < WIDTH_LARGE,
    }
  }

  render() {
    const { windowSize } = this.state
    const { children } = this.props
    return <Provider value={windowSize}>{children}</Provider>
  }
}

export { WindowSizeProvider, Consumer as WindowSize }
