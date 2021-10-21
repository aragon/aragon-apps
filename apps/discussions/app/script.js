import '@babel/polyfill'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

import { handleHide, handlePost, handleRevise, initialState } from './state'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState
    switch (event.event) {
      case INITIALIZATION_TRIGGER:
        newState = { ...initialState, syncing: false }
        return newState
      case 'SYNC_STATUS_SYNCING':
        newState = { ...initialState, syncing: true }
        return newState
      case 'SYNC_STATUS_SYNCED':
        newState = { ...initialState, syncing: false }
        return newState
      case 'ACCOUNTS_TRIGGER':
        newState = { ...initialState, syncing: false }
        return newState
      case 'Post':
        newState = await handlePost(state, event)
        return newState
      case 'Revise':
        newState = await handleRevise(state, event)
        return newState
      case 'Hide':
        newState = await handleHide(state, event)
        return newState
      case 'CreateDiscussionThread': {
        api.newForwardedAction(
          event.returnValues.actionId,
          event.returnValues._evmScript
        )
        newState = { ...state }
        return newState
      }
      default:
        return state
    }
  },
  [
    // Always initialize the store with our own home-made event
    of({ event: INITIALIZATION_TRIGGER }),
  ]
)
