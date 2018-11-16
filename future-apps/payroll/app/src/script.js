import app from './store/app'
import initialize from './store'

retryEvery(async retry => {
  const financeAddress = await app
    .call('finance')
    .first()
    .map(financeAddress => financeAddress)
    .toPromise()

  initialize(financeAddress)
    .catch(err => {
      console.error('Could not start background script execution due:', err)
      retry()
    })
})

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */

function retryEvery (callback, initialRetryTimer = 1000, increaseFactor = 5) {
  const attempt = (retryTimer = initialRetryTimer) => {
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)

      // Exponentially backoff attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }

  attempt()
}
