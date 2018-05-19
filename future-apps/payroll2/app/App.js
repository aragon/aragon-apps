import React from 'react'
import {
  AragonApp,
  Button,
  Text,

  observe
} from '@aragon/ui'
import Aragon, { providers } from '@aragon/client'
import styled from 'styled-components'

const AppContainer = styled(AragonApp)`
  display: flex;
  align-items: center;
  justify-content: center;
`

export default class App extends React.Component {
  constructor () {
    super()

    this.app = new Aragon(
      new providers.WindowMessage(window.parent)
    )
    this.state$ = this.app.state()
  }

  render () {
    console.log(this.app.increment)

    return (
      <AppContainer>
        <div>
          <ObservedCount observable={this.state$} />
          <Button onClick={() => this.app.decrement(1)}>Decrement</Button>
          <Button onClick={() => this.app.increment(1)}>Increment</Button>
        </div>
      </AppContainer>
    )
  }
}

const ObservedCount = observe(
  (state$) => state$,
  { count: 0 }
)(
  ({ count }) => <Text.Block style={{ textAlign: 'center' }} size='xxlarge'>{count}</Text.Block>
)
