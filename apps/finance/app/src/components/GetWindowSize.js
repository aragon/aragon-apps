import React from 'react'

class GetWindowSize extends React.Component {
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
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  render() {
    const { windowSize } = this.state
    const { children } = this.props
    return children(windowSize)
  }
}

export default GetWindowSize
