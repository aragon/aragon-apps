/* eslint-disable import/no-unused-modules */
import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from './api-react'
import appStateReducer from './app-state-reducer'
import App from './components/App/App'

ReactDOM.render(
  <AragonApi reducer={appStateReducer}>
    <App />
  </AragonApi>,
  document.querySelector('#rewards')
)
