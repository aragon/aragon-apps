module.exports = callback => {
  const targetGasLimit = process.argv[process.argv.length - 1]
  const checkGasLimit = () => {
    web3.eth.getBlockNumber((err, bn) => {
      web3.eth.getBlock(bn, (err, block) => {
        if (block.gasLimit >= targetGasLimit) {
          console.log('found', block.gasLimit, 'in block', block.number)
          return callback()
        } else {
          console.log('waiting for gas increase, process', block.gasLimit / targetGasLimit)
          setTimeout(() => checkGasLimit(), 1000)
        }
      })
    })
  }

  checkGasLimit()
}
