module.exports = web3 => addr => {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(addr, async (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
