const REVERT_CODE = 'revert'
const THROW_ERROR_PREFIX = 'Returned error: VM Exception while processing transaction:'

function assertError(error, expectedErrorCode) {
  assert(error.message.search(expectedErrorCode) > -1, `Expected error code "${expectedErrorCode}" but failed with "${error}" instead.`)
}

async function assertThrows(blockOrPromise, expectedErrorCode, expectedReason) {
  try {
    (typeof blockOrPromise === 'function') ? await blockOrPromise() : await blockOrPromise
  } catch (error) {
    assertError(error, expectedErrorCode)
    return error
  }
  // assert.fail() for some reason does not have its error string printed 🤷
  assert(0, `Expected "${expectedErrorCode}"${expectedReason ? ` (with reason: "${expectedReason}")` : ''} but it did not fail`)
}

async function assertRevert(blockOrPromise, reason) {
  const error = await assertThrows(blockOrPromise, REVERT_CODE, reason)
  const errorPrefix = `${THROW_ERROR_PREFIX} ${REVERT_CODE}`

  if (error.message.includes(errorPrefix)) {
    error.reason = error.message.replace(errorPrefix, '')
    // Truffle 5 sometimes add an extra ' -- Reason given: reason.' to the error message 🤷
    error.reason = error.reason.replace(` -- Reason given: ${reason}.`, '').trim()
  }

  if (process.env.SOLIDITY_COVERAGE !== 'true' && reason) {
    assert.equal(error.reason, reason, `Expected revert reason "${reason}" but failed with "${error.reason || 'no reason'}" instead.`)
  }
}

module.exports = {
  assertRevert
}
