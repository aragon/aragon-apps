import '@babel/polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { Main } from '@aragon/ui'
import { AragonApi } from '@aragon/api-react'
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
