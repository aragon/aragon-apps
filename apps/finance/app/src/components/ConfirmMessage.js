import React from 'react'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { colors, spring as springConf } from '@aragon/ui'

class ConfirmMessage extends React.Component {
  state = { visible: true }
  componentDidMount() {
    setTimeout(() => {
      this.setState({ visible: false })
    }, 1000)
  }
  handleRest = () => {
    if (!this.state.visible) {
      this.props.onDone()
    }
  }
  render() {
    const { visible } = this.state
    const { children } = this.props
    return (
      <Motion
        defaultStyle={{ progress: 0 }}
        style={{ progress: spring(Number(visible), springConf('fast')) }}
        onRest={this.handleRest}
      >
        {({ progress }) => (
          <Main style={{ opacity: progress * 0.9 }}>{children}</Main>
        )}
      </Motion>
    )
  }
}

const Main = styled.div`
  padding: 5px 15px;
  color: #fff;
  background: ${colors.Rain.Atomic};
  border-radius: 3px;
`

export default ConfirmMessage
