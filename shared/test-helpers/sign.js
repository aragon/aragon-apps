module.exports = web3 => (signer, hash) => {
  return new Promise((resolve, reject) => {
    web3.eth.sign(signer, hash, async (err, res) => {
      if (err || !res) return reject(err)
      resolve(res)
    })
  })
}
