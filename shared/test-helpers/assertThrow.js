const THROW_ERROR_PREFIX = 'VM Exception while processing transaction: revert'

async function assertThrows(blockOrPromise, expectedErrorCode) {
  try {
    (typeof blockOrPromise === 'function') ? await blockOrPromise() : await blockOrPromise
  } catch (error) {
    assert(error.message.search(expectedErrorCode) > -1, `Expected error code "${expectedErrorCode}" but failed with "${error}" instead.`)
    return error
  }
  assert.fail(`Expected "${expectedErrorCode}" but it did not fail`)
}

module.exports = {
  async assertJump(blockOrPromise) {
    return assertThrows(blockOrPromise, 'invalid JUMP')
  },

  async assertInvalidOpcode(blockOrPromise) {
    return assertThrows(blockOrPromise, 'invalid opcode')
  },

  async assertRevert(blockOrPromise, expectedReason) {
    const error = await assertThrows(blockOrPromise, 'revert')
    if (expectedReason) {
      const foundReason = error.message.replace(THROW_ERROR_PREFIX, '').trim()
      assert.equal(foundReason, expectedReason, `Expected revert reason "${expectedReason}" but failed with "${foundReason || 'no reason'}" instead.`)
    }
  },
}
