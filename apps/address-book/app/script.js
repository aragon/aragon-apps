/* eslint-disable import/no-unused-modules */
import '@babel/polyfill'

import { retryEvery } from '../../../shared/ui/utils'
import { initStore } from './store'

retryEvery(async () => {
  initStore()
})


