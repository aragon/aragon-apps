import app from './app'

export function getCurrentAccount () {
  return app.accounts()
    .first()
    .map(accounts => accounts.length ? accounts[0] : null)
    .toPromise()
}
