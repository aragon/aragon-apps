module.exports = web3 => n => {
  return new Promise(async (resolve, reject) => {
    web3.eth.getBlock(n, (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
