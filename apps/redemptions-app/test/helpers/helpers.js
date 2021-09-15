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

const getSeconds = () => Math.round(new Date() / 1000)

const timeTravel = web3 => s => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [s],
        id: new Date().getTime(),
      },
      function(err) {
        if (err) return reject(err)
        resolve()
      }
    )
  })
}

module.exports = {
  assertRevert,
  getLog,
  deployedContract,
  getSeconds,
  timeTravel,
}
