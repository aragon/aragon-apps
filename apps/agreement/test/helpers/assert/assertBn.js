const assertBn = (actual, expected, errorMsg) => {
  assert.equal(actual.toString(), expected.toString(), `${errorMsg} expected ${expected.toString()} to equal ${actual.toString()}`)
}

module.exports = {
  assertBn
}
