const assertRevert = async (receiptPromise, reason) => {
  try {
    await receiptPromise
  } catch (error) {
    if (reason) {
      assert.include(error.message, reason, 'Incorrect revert reason')
    }
    return
  }
  assert.fail(`Expected a revert for reason: ${reason}`)
}

const getLog = (receipt, logName, argName) => {
  const log = receipt.logs.find(({ event }) => event === logName)
  return log ? log.args[argName] : null
}

const deployedContract = receipt => getLog(receipt, 'NewAppProxy', 'proxy')

const getSignatureFields = signature => {
  signature = signature.slice(2) // remove 0x
  const v = web3.utils.toDecimal(`0x${signature.slice(128, 130)}`)

  return {
    v: v != 27 && v != 28 ? v + 27 : v,
    r: `0x${signature.slice(0, 64)}`,
    s: `0x${signature.slice(64, 128)}`,
  }
}

module.exports = {
  getLog: getLog,
  assertRevert: assertRevert,
  deployedContract: deployedContract,
  getSignatureFields,
}
