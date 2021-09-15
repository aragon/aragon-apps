import 'core-js/stable'
import 'regenerator-runtime/runtime'
import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from '@aragon/api-react'
import appStateReducer from './app-state-reducer'
import App from './App'

ReactDOM.render(
  <AragonApi reducer={appStateReducer}>
    <App />
  </AragonApi>,
  document.getElementById('root')
)
