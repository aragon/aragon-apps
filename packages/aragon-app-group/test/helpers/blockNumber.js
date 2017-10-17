module.exports = function getBlockNumber () {
  return new Promise((resolve, reject) => {
    web3.eth.getBlockNumber(async (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
