const getSignatureFields = signature => {
  signature = signature.slice(2) // remove 0x
  const v = toDecimal(`0x${signature.slice(128, 130)}`)

  return {
    v: v !== 27 && v !== 28 ? v + 27 : v,
    r: `0x${signature.slice(0, 64)}`,
    s: `0x${signature.slice(64, 128)}`,
  }
}

// in versions below 1.0.0 utils not defined
const sign = (...args) => (web3.utils ? web3.eth.sign(...args) : web3.eth.sign(...args.reverse()))

const { toDecimal, sha3 } = web3.utils || web3

module.exports = {
  getSignatureFields,
  sha3,
  toDecimal,
  sign,
}
