/* eslint-disable import/no-unused-modules */
import '@babel/polyfill'

import { first } from 'rxjs/operators'
import { retryEvery } from '../../../shared/ui/utils'
import { app, initStore } from './store'

retryEvery(async () => {

  const network = await app
    .network()
    .pipe(first())
    .toPromise()

  initStore(network)
})

