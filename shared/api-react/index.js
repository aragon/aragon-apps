import {
  AragonApi,
  usePath,
  useAragonApi as useProductionApi,
  useNetwork as useProductionNetwork,
} from '@aragon/api-react'

export default ({ initialState = {}, functions = (() => {}) }) => {
  let useAragonApi = useProductionApi
  let useNetwork = useProductionNetwork

  if (process.env.NODE_ENV !== 'production') {
    const inIframe = () => {
      try {
        return window.self !== window.top
      } catch (e) {
        return true
      }
    }

    if (!inIframe()) {
      useAragonApi = require('./useStubbedApi')({ initialState, functions })
      useNetwork = require('./useStubbedNetwork')
    }
  }

  return { AragonApi, useAragonApi, useNetwork, usePath }
}
