import { first } from 'rxjs/operators'
import { app } from '.'

export const getNetwork = async () =>
  await app
    .network()
    .pipe(first())
    .toPromise()
