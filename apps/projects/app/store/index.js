import { STATUS } from '../utils/github'

export { app } from './app'
export { handleEvent } from './events'
export { initStore } from './init'

export const INITIAL_STATE = {
  repos: [],
  tokens: [],
  issues: [],
  bountySettings: {},
  github: { event: '', scope: null, status: STATUS.INITIAL, token: null },
  isSyncing: false,
}
