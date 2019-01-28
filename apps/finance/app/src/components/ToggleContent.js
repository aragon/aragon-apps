import React from 'react'
import styled from 'styled-components'
import { font, springs } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import arrow from './assets/arrow.svg'

const noop = () => {}

class ToggleContent extends React.Component {
  state = { opened: false }
  handleClick = () => {
    this.setState(({ opened }) => ({ opened: !opened }))
  }
  render() {
    const { opened } = this.state
    const { label, children } = this.props
    return (
      <div>
        <Label onClick={this.handleClick}>
          {label} <Arrow opened={opened} />
        </Label>

        <Transition
          items={opened}
          config={springs.swift}
          from={{ height: 0, opacity: 0 }}
          enter={{ height: 'auto', opacity: 1 }}
          leave={{ height: 0, opacity: 0 }}
          native
        >
          {show =>
            show && (props => <Content style={props}>{children}</Content>)
          }
        </Transition>
      </div>
    )
  }
}

const Label = styled.button.attrs({ type: 'button' })`
  cursor: pointer;
  ${font({ weight: 'bold' })};
  background: none;
  border: 0;
  outline: 0;
  padding: 0;
  img {
    margin-left: 10px;
  }
`
const Content = styled(animated.div)`
  overflow: hidden;
`

const Arrow = styled.img.attrs({ src: arrow, alt: '' })`
  transform-origin: 50% 50%;
  transform: rotate(${p => (p.opened ? 180 : 0)}deg);
  transition: transform 200ms ease-in-out;
`

export default ToggleContent
