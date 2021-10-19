/* global artifacts, assert, before, contract, context, it */
const { assertRevert } = require('@aragon/test-helpers/assertThrow')

/** Helper function to import truffle contract artifacts */
const getContract = name => artifacts.require(name)

/** Helper function to read events from receipts */
const getReceipt = (receipt, event, arg) =>
  receipt.logs.filter(l => l.event === event)[0].args[arg]

/** Useful constants */
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const exampleCid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
const updatedCid = 'QmxoypizzW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'

contract('AddressBook', accounts => {
  let APP_MANAGER_ROLE, ADD_ENTRY_ROLE, REMOVE_ENTRY_ROLE, UPDATE_ENTRY_ROLE
  let daoFact, app, appBase

  // Setup test actor accounts
  const root = accounts[0]

  before(async () => {
    // Create Base DAO and App contracts
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await getContract('EVMScriptRegistryFactory').new()
    daoFact = await getContract('DAOFactory').new(
      kernelBase.address,
      aclBase.address,
      regFact.address
    )
    appBase = await getContract('AddressBook').new()

    // Setup ACL roles constants
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    ADD_ENTRY_ROLE = await appBase.ADD_ENTRY_ROLE()
    REMOVE_ENTRY_ROLE = await appBase.REMOVE_ENTRY_ROLE()
    UPDATE_ENTRY_ROLE = await appBase.UPDATE_ENTRY_ROLE()

    /** Create the dao from the dao factory */
    const daoReceipt = await daoFact.newDAO(root)
    const dao = getContract('Kernel').at(
      getReceipt(daoReceipt, 'DeployDAO', 'dao')
    )

    /** Setup permission to install app */
    const acl = getContract('ACL').at(await dao.acl())
    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root)

    /** Install an app instance to the dao */
    const appReceipt = await dao.newAppInstance(
      '0x1234',
      appBase.address,
      '0x',
      false
    )
    app = getContract('AddressBook').at(
      getReceipt(appReceipt, 'NewAppProxy', 'proxy')
    )

    /** Setup permission to create address entries */
    await acl.createPermission(ANY_ADDRESS, app.address, ADD_ENTRY_ROLE, root)

    /** Setup permission to remove address entries */
    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      REMOVE_ENTRY_ROLE,
      root
    )
    /** Setup permission to update address entries */
    await acl.createPermission(
      ANY_ADDRESS,
      app.address,
      UPDATE_ENTRY_ROLE,
      root
    )

    /** Initialize app */
    await app.initialize()
  })

  context('main context', () => {
    let starfleet = accounts[0]
    let earth = accounts[1]
    let moon = accounts[2]

    it('can check if entry is added when the registry is empty', async () => {
      assert.isFalse(await app.isEntryAdded(starfleet))
    })

    it('should add a new entry', async () => {
      const receipt = await app.addEntry(starfleet, exampleCid)
      const addedAddress = receipt.logs.filter(l => l.event == 'EntryAdded')[0]
        .args.addr
      assert.equal(addedAddress, starfleet)
    })

    it('should get the previously added entry', async () => {
      const entry1 = await app.getEntry(starfleet)
      assert.equal(entry1, exampleCid)
    })

    it('should remove the previously added entry', async () => {
      await app.removeEntry(starfleet, exampleCid)
    })

    it('should allow to re-add same address from previously removed entry', async () => {
      await app.addEntry(starfleet, exampleCid)
    })

    it('should allow entry updates', async () => {
      await app.updateEntry(starfleet, exampleCid, updatedCid)
      const entry1 = await app.getEntry(starfleet)
      assert.equal(entry1, updatedCid)
    })

    it('can obtain entries from the entryArr', async () => {
      const entryArrLength = await app.entryArrLength()
      const entryAddress = await app.entryArr(entryArrLength - 1)
      assert.isTrue(await app.isEntryAdded(entryAddress))
      const entryIndex = await app.getEntryIndex(entryAddress)
      assert.strictEqual(entryIndex.toNumber(), 0, 'index value should be 0')
    })

    it('isEntryAdded returns false when deleted or un-added entry is queried', async () => {
      await app.addEntry(earth, exampleCid)
      await app.removeEntry(earth, exampleCid)
      assert.isFalse(await app.isEntryAdded(earth))
      assert.isFalse(await app.isEntryAdded(moon))
    })

    it('removeEntry moves end array entry when shortening array length', async () => {
      await app.addEntry(earth, exampleCid)
      await app.addEntry(moon, exampleCid)
      await app.removeEntry(starfleet, updatedCid)
      const entryIndex = await app.getEntryIndex(moon)
      assert.strictEqual(
        entryIndex.toNumber(),
        0,
        'moon’s index should be zero'
      )
      assert.strictEqual(
        await app.entryArr(0),
        moon,
        'index 0 should map to moon’s address'
      )
      await app.removeEntry(earth, exampleCid)
      await app.removeEntry(moon, exampleCid)
    })
  })

  context('invalid operations', () => {
    const [ borg, jeanluc, bates ] = accounts.splice(1, 3)
    before(async () => {
      app.addEntry(borg, exampleCid)
    })

    it('should revert when adding duplicate address', async () => {
      return assertRevert(async () => {
        await app.addEntry(borg, exampleCid)
      })
    })

    it('should revert when removing address with non-matching CID', async () => {
      return assertRevert(async () => {
        await app.removeEntry(borg, '')
      })
    })

    it('should revert when removing not existent entry', async () => {
      return assertRevert(async () => {
        await app.removeEntry(jeanluc, '')
      })
    })

    it('should revert when a CID =/= 46 chars', async () => {
      return assertRevert(async () => {
        await app.addEntry(bates, updatedCid.slice(0, -1))
      })
    })

    it('should revert when a CID does not start with "Qm"', async () => {
      return assertRevert(async () => {
        await app.addEntry(bates, 'test_CID')
      })
    })

    it('should return a zero-address when getting non-existent entry', async () => {
      const entryCid = await app.getEntry(jeanluc)
      assert.strictEqual(entryCid, '', 'CID should be an empty string')
    })
    it('should revert when an updated CID =/= 46 chars', async () => {
      return assertRevert(async () => {
        await app.updateEntry(borg, exampleCid, 'test_CID')
      })
    })
    it('should revert when an updating a CID and the oldCID doesn’t match what’s stored', async () => {
      return assertRevert(async () => {
        await app.updateEntry(borg, updatedCid, 'test_CID')
      })
    })
    it('should revert when updating a non-existent entry', async () => {
      return assertRevert(async () => {
        await app.updateEntry(jeanluc, exampleCid, updatedCid)
      })
    })
  })
})
