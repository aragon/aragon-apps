import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from '@aragon/api-react'
import { Main } from '@aragon/ui'
import appStateReducer from './app-state-reducer'
import App from './App'

ReactDOM.render(
  <AragonApi reducer={appStateReducer}>
    <Main assetsUrl="./aragon-ui">
      <App />
    </Main>
  </AragonApi>,
  document.getElementById('root')
)
