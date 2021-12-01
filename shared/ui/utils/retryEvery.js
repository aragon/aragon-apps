/*
* Calls `callback` exponentially, every time `retry()` is called.
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

export const retryEvery = (
  callback,
  initialRetryTimer = 1000,
  increaseFactor = 5
) => {
  const attempt = (retryTimer = initialRetryTimer) => {
    // eslint-disable-next-line standard/no-callback-literal
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)
      // Exponentially back-off attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }

  attempt()
}
