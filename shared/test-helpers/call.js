module.exports = web3 => tx => {
  return new Promise((resolve, reject) => {
    web3.eth.call(tx, async (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
