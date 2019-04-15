import '@babel/polyfill'

import React from 'react'
import { render } from 'react-dom'

import App from './App'
import { AragonProvider } from './context/AragonContext'

render(
  <AragonProvider>
    <App />
  </AragonProvider>,
  document.getElementById('root')
)
