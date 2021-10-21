// artifacts
const TokenBalanceOracle = this.artifacts.require('TokenBalanceOracle')

const ANY_ENTITY = '0x'.padEnd(42, 'f')

// role
const ROLE = 'LOCK_TOKENS_ROLE'

// params
const ID = 'ORACLE_PARAM_ID'
const OP = 'EQ'

module.exports = async () => {
  const args = process.argv.slice(4)
  const [daoAddress, timeLockAddress, oracleAddress] = args

  // as the `dao acl grant` doesn't perform any check if the oracle address is in fact a contract, we perform a minimum check ourselves`
  await checkOracle(oracleAddress)
  const param = [ID, OP, oracleAddress]

  console.log(daoAddress, timeLockAddress, ROLE, ANY_ENTITY, `"${param.join(',').replace(/' '/g, '')}"`)
}

// Check if the address provided is a TokenBalanceOracle by calling one of it's getters
const checkOracle = async address => {
  try {
    const oracle = await TokenBalanceOracle.at(address)
    await oracle.minBalance()
  } catch (err) {
    console.error(`Error checking oracle: ${err} Make sure the provided address is a Token balance oracle`)
    process.exit(1)
  }
}
