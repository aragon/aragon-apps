// eslint-disable-next-line import/no-unused-modules
import React from 'react'
import ReactDOM from 'react-dom'

/*
 * TODO: Disabled for now to avoid spamming the console
 * if (process.env.NODE_ENV !== 'production') {
 *   const axe = require('react-axe')
 *   axe(React, ReactDOM, 1000)
 * }
 */

import { AragonApi } from './api-react'
import appStateReducer from './app-state-reducer'
import App from './components/App/App'

ReactDOM.render(
  <AragonApi reducer={appStateReducer}>
    <App />
  </AragonApi>,
  document.querySelector('#address-book')
)
