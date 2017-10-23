module.exports = web3 => s => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [s],
      id: new Date().getTime()
    }, function(err) {
      if (err) return reject(err)
      resolve()
    })
  })
}
