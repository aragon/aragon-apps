module.exports = web3 => addr => {
  return new Promise((resolve, reject) => {
    web3.eth.getTransaction(addr, async (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
