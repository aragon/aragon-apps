/* global artifacts contract before beforeEach it assert */
const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const CounterApp = artifacts.require('CounterApp.sol')
const DAOFactory = artifacts.require(
  '@aragon/core/contracts/factory/DAOFactory'
)
const EVMScriptRegistryFactory = artifacts.require(
  '@aragon/core/contracts/factory/EVMScriptRegistryFactory'
)
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')

const getContract = name => artifacts.require(name)

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

contract('CounterApp', accounts => {
  let APP_MANAGER_ROLE, INCREMENT_ROLE, DECREMENT_ROLE
  let daoFact, appBase, app

  const firstAccount = accounts[0]
  const secondAccount = accounts[1]

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFact = await DAOFactory.new(
      kernelBase.address,
      aclBase.address,
      regFact.address
    )
    appBase = await CounterApp.new()

    // Setup constants
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    INCREMENT_ROLE = await appBase.INCREMENT_ROLE()
    DECREMENT_ROLE = await appBase.DECREMENT_ROLE()
  })

  beforeEach(async () => {
    const daoReceipt = await daoFact.newDAO(firstAccount)
    const dao = Kernel.at(
      daoReceipt.logs.filter(l => l.event === 'DeployDAO')[0].args.dao
    )
    const acl = ACL.at(await dao.acl())

    await acl.createPermission(
      firstAccount,
      dao.address,
      APP_MANAGER_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )

    const receipt = await dao.newAppInstance(
      '0x1234',
      appBase.address,
      '0x',
      false,
      { from: firstAccount }
    )

    app = CounterApp.at(
      receipt.logs.filter(l => l.event === 'NewAppProxy')[0].args.proxy
    )

    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      INCREMENT_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )
    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      DECREMENT_ROLE,
      firstAccount,
      {
        from: firstAccount,
      }
    )
  })

  it('should be incremented by any address', async () => {
    app.initialize()
    await app.increment(1, { from: secondAccount })
    assert.equal(await app.value(), 1)
  })

  it('should not be decremented if already 0', async () => {
    app.initialize()
    return assertRevert(async () => {
      return app.decrement(1)
    })
  })
})
