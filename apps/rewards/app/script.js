/* eslint-disable import/no-unused-modules */
import '@babel/polyfill'

import { first } from 'rxjs/operators'
import { getContractAddress, retryEvery } from '../../../shared/ui/utils'
import { app, initStore } from './store'

retryEvery(async retry => {
  const vaultAddress = await getContractAddress('vault', retry)

  const network = await app
    .network()
    .pipe(first())
    .toPromise()

  initStore(vaultAddress, network)
})
