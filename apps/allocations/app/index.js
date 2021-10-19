/* eslint-disable import/no-unused-modules */
import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from './api-react'
import appStateReducer from './app-state-reducer'
import App from './components/App/App'
import { PanelProvider } from './context/Panel'

// TODO: Profile App with React.StrictMode, perf and why-did-you-update, apply memoization
ReactDOM.render(
  <AragonApi reducer={appStateReducer}>
    <PanelProvider>
      <App />
    </PanelProvider>
  </AragonApi>,
  document.querySelector('#allocations')
)
