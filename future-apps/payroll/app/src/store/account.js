import { first } from 'rxjs/operators'
import app from './app'

export async function getAccountAddress() {
  const accounts = await app
    .accounts()
    .pipe(first())
    .toPromise()
  return accounts[0] || null
}
