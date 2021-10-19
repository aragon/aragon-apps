/* global artifacts, assert, before, context, contract, it, web3 */
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3)
const BigNumber = require('bignumber.js')

/** Helper function to import truffle contract artifacts */
const getContract = name => artifacts.require(name)

/** Helper function to read events from receipts */
const getReceipt = (receipt, event, arg) => {
  const result = receipt.logs.filter(l => l.event === event)[0].args
  return arg ? result[arg] : result
}

/** Useful constants */
const NULL_ADDR = '0x00'
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ONE_DAY = 86400
const TEN_DAYS = ONE_DAY * 10
const SUPPORTS = [ 500, 200, 300, 0 ]
const TOTAL_SUPPORT = 1000

contract('Allocations', accounts => {
  let APP_MANAGER_ROLE,
    CHANGE_BUDGETS_ROLE,
    CHANGE_PERIOD_ROLE,
    CREATE_ACCOUNT_ROLE,
    CREATE_ALLOCATION_ROLE,
    EXECUTE_ALLOCATION_ROLE,
    EXECUTE_PAYOUT_ROLE,
    SET_MAX_CANDIDATES_ROLE,
    TRANSFER_ROLE
  let daoFact, app, appBase, vault, vaultBase, token

  // Setup test actor accounts
  const [ root, bobafett, dengar, bossk, empire ] = accounts
  const candidateAddresses = [ bobafett, dengar, bossk, empire ]

  // Setup dummy array of zeros
  const zeros = new Array(candidateAddresses.length).fill(0)

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
    appBase = await getContract('Allocations').new()
    vaultBase = await getContract('Vault').new()

    // Setup ACL roles constants
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    CHANGE_BUDGETS_ROLE = await appBase.CHANGE_BUDGETS_ROLE()
    CHANGE_PERIOD_ROLE = await appBase.CHANGE_PERIOD_ROLE()
    CREATE_ACCOUNT_ROLE = await appBase.CREATE_ACCOUNT_ROLE()
    CREATE_ALLOCATION_ROLE = await appBase.CREATE_ALLOCATION_ROLE()
    EXECUTE_ALLOCATION_ROLE = await appBase.EXECUTE_ALLOCATION_ROLE()
    EXECUTE_PAYOUT_ROLE = await appBase.EXECUTE_PAYOUT_ROLE()
    SET_MAX_CANDIDATES_ROLE = await appBase.SET_MAX_CANDIDATES_ROLE()
    TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

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
    app = getContract('Allocations').at(
      getReceipt(appReceipt, 'NewAppProxy', 'proxy')
    )

    /** Setup permissions */
    await acl.createPermission(ANY_ADDR, app.address, CHANGE_BUDGETS_ROLE, root)
    await acl.createPermission(ANY_ADDR, app.address, CHANGE_PERIOD_ROLE, root)
    await acl.createPermission(ANY_ADDR, app.address, CREATE_ACCOUNT_ROLE, root)
    await acl.createPermission(
      ANY_ADDR,
      app.address,
      CREATE_ALLOCATION_ROLE,
      root
    )
    await acl.createPermission(
      ANY_ADDR,
      app.address,
      EXECUTE_ALLOCATION_ROLE,
      root
    )
    await acl.createPermission(ANY_ADDR, app.address, EXECUTE_PAYOUT_ROLE, root)
    await acl.createPermission(ANY_ADDR, app.address, SET_MAX_CANDIDATES_ROLE, root)

    /** Install a vault instance to the dao */
    const vaultReceipt = await dao.newAppInstance(
      '0x5678',
      vaultBase.address,
      '0x',
      false
    )
    vault = getContract('Vault').at(
      getReceipt(vaultReceipt, 'NewAppProxy', 'proxy')
    )
    await vault.initialize()

    /** Setup permission to transfer funds */
    await acl.createPermission(app.address, vault.address, TRANSFER_ROLE, root)

    /** Create tokens */
    token = await getContract('MiniMeToken').new(
      NULL_ADDR,
      NULL_ADDR,
      0,
      'two',
      18,
      'two',
      true
    ) // empty parameters minime

    //Confirm revert if period is less than 1 day
    assertRevert(async () => {
      await app.initialize(vault.address, ONE_DAY - 1)
    })

    /** Initialize app */
    await app.initialize(vault.address, TEN_DAYS)
  })

  context('app creation and funded Payout', () => {
    let bobafettInitialBalance,
      dengarInitialBalance,
      bosskInitialBalance,
      empireInitialBalance,
      accountId,
      ethPayoutId,
      deferredPayoutId

    before(async () => {
      bobafettInitialBalance = await web3.eth.getBalance(bobafett)
      dengarInitialBalance = await web3.eth.getBalance(dengar)
      bosskInitialBalance = await web3.eth.getBalance(bossk)
      empireInitialBalance = await web3.eth.getBalance(empire)

      accountId = (await app.newAccount(
        'Fett´s vett',
        NULL_ADDR,
        true,
        web3.toWei(0.02, 'ether')
      )).logs[0].args.accountId.toNumber()

      await vault.deposit(NULL_ADDR, web3.toWei(0.03, 'ether'), {
        from: root,
        value: web3.toWei(0.03, 'ether'),
      })
      await token.generateTokens(root, 25e18)
      await token.transfer(vault.address, 25e18)

      // Eth payout
      ethPayoutId = (await app.setDistribution(
        candidateAddresses,
        SUPPORTS,
        zeros,
        '',
        'ETH description',
        zeros,
        zeros,
        accountId,
        1,
        0x0,
        0x0,
        web3.toWei(0.01, 'ether')
      )).logs[0].args.payoutId.toNumber()

      const currentTimestamp = (await web3.eth.getBlock('latest')).timestamp
      // Deferred payout
      deferredPayoutId = (await app.setDistribution(
        candidateAddresses,
        SUPPORTS,
        zeros,
        '',
        'ETH description',
        zeros,
        zeros,
        accountId,
        2,
        currentTimestamp + 10,
        ONE_DAY,
        web3.toWei(0.01, 'ether')
      )).logs[0].args.payoutId.toNumber()
    })

    it('app initialized properly', async () => {
      const initBlock = await app.getInitializationBlock()
      assert.isAbove(
        initBlock.toNumber(),
        0,
        'App was not initialized properly'
      )
    })

    it('fails to set distribution - not enough funds', async () => {
      const [ , token ] = await app.getAccount(accountId)
      const amount = (await vault.balance(token)).plus(1).toString()
      return assertRevert(async () => {
        await app.setDistribution(
          candidateAddresses,
          SUPPORTS,
          zeros,
          '',
          'ETH description',
          zeros,
          zeros,
          accountId,
          1,
          0x0,
          0x0,
          amount,
        )
      })
    })

    it('can get the created Account', async () => {
      const accountMembers = await app.getAccount(accountId)
      assert.equal(
        accountMembers[0],
        'Fett´s vett',
        'Payout metadata incorrect'
      )
    })

    it('fails to get period information due to periodNo being too high', async () => {
      const periodNo = (await app.getCurrentPeriodId()).plus(1).toNumber()
      return assertRevert(async () => {
        await app.getPeriod(periodNo)
      })
    })

    it('can get period information', async () => {
      const periodNo = (await app.getCurrentPeriodId()).toNumber()
      const [ isCurrent, startTime, endTime ] = await app.getPeriod(periodNo)
      assert(isCurrent, 'current period is current')
      assert.strictEqual(
        endTime - startTime,
        TEN_DAYS - 1,
        'should be equal to ten days minus one second'
      )
    })

    it('fails to get the distribution (eth) - idx too high', async () => {
      const candidateArrayLength = (await app.getNumberOfCandidates(
        accountId,
        ethPayoutId
      )).toNumber()

      return assertRevert(async () => {
        await app.getPayoutDistributionValue(accountId, ethPayoutId, candidateArrayLength+1)
      })
    })

    it('gets the distribution (eth)', async () => {
      const candidateArrayLength = (await app.getNumberOfCandidates(
        accountId,
        ethPayoutId
      )).toNumber()
      let storedSupport = []
      let supportVal

      for (let i = 0; i < candidateArrayLength; i++) {
        supportVal = (await app.getPayoutDistributionValue(
          accountId,
          ethPayoutId,
          i
        ))[0].toNumber()
        assert.equal(
          SUPPORTS[i],
          supportVal,
          'support distributions do not match what is specified'
        )
        storedSupport.push(supportVal)
      }
      assert.equal(
        SUPPORTS.length,
        storedSupport.length,
        'distribution array lengths do not match'
      )
    })

    it('gets the remaining budget', async () =>{
      const budgetRemaining = await app.getRemainingBudget(accountId)
      assert.equal(budgetRemaining.toNumber(), 1e16,'0.01 ETH should remain')
    })

    it('fails to auto-execute the payout (eth) - accountId too high', async () => {
      return assertRevert(async () => {
        await app.runPayout(accountId + 1, ethPayoutId)
      })
    })

    it('fails to auto-execute the payout (eth) - payoutId too high', async () => {
      return assertRevert(async () => {
        await app.runPayout(accountId, ethPayoutId + 2)
      })
    })

    it('auto-executes the payout (eth)', async () => {
      const bobafettBalance = BigNumber(await web3.eth.getBalance(bobafett))
      const dengarBalance = BigNumber(await web3.eth.getBalance(dengar))
      const bosskBalance = BigNumber(await web3.eth.getBalance(bossk))

      assert.equal(
        bobafettBalance.minus(bobafettInitialBalance),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bobafett expense'
      )
      assert.equal(
        dengarBalance.minus(dengarInitialBalance),
        (web3.toWei(0.01, 'ether') * SUPPORTS[1]) / TOTAL_SUPPORT,
        'dengar expense'
      )
      assert.equal(
        bosskBalance.minus(bosskInitialBalance),
        (web3.toWei(0.01, 'ether') * SUPPORTS[2]) / TOTAL_SUPPORT,
        'bossk expense'
      )
      
      await app.runPayout(accountId, ethPayoutId)

      // calling runPayout has no effect
      const newBobafettBalance = await web3.eth.getBalance(bobafett)
      const newDengarBalance = await web3.eth.getBalance(dengar)
      const newBosskBalance = await web3.eth.getBalance(bossk)
      assert.equal(
        newBobafettBalance.toNumber() - bobafettInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bobafett expense'
      )
      assert.equal(
        newDengarBalance.toNumber() - dengarInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[1]) / TOTAL_SUPPORT,
        'dengar expense'
      )
      assert.equal(
        newBosskBalance.toNumber() - bosskInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[2]) / TOTAL_SUPPORT,
        'bossk expense'
      )
    })

    it('fail to execute single payout by root - invalid candidate id', async () => {
      const candidateArrayLength = (await app.getNumberOfCandidates(
        accountId,
        ethPayoutId
      )).toNumber()

      return assertRevert(async () => {
        await app.executePayout(accountId, ethPayoutId, candidateArrayLength + 1, { from: root })
      })
    })

    it('fail to execute single payout by root - invalid payout id', async () => {
      return assertRevert(async () => {
        await app.executePayout(accountId, ethPayoutId + 2, 0, { from: root })
      })
    })

    it('execute single payout by root', async () => {
      const bobafettBalance = await web3.eth.getBalance(bobafett)
      assert.equal(
        bobafettBalance.toNumber() - bobafettInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bobafett expense'
      )
      const candidateId = candidateAddresses.findIndex((candidate) => {
        return candidate === bobafett
      })
      await app.executePayout(accountId, ethPayoutId, candidateId, { from: root })
      // No effect since payout already occurred
      const newBobafettBalance = await web3.eth.getBalance(bobafett)
      assert.equal(
        newBobafettBalance.toNumber() - bobafettInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bobafett expense'
      )
    })

    it('fail to execute single payout by candidate - invalid payout id', async () => {
      const candidateId = candidateAddresses.findIndex((candidate) => {
        return candidate === empire
      })
      return assertRevert(async () => {
        await app.candidateExecutePayout(accountId, ethPayoutId + 2, candidateId, { from: empire })
      })
    })

    it('fail to execute single payout by candidate - wrong candidate', async () => {
      const candidateId = candidateAddresses.findIndex((candidate) => {
        return candidate === bobafett
      })
      return assertRevert(async () => {
        await app.candidateExecutePayout(accountId, ethPayoutId, candidateId, { from: empire })
      })
    })

    it('execute single payout by candidate', async () => {
      let empireBalance = await web3.eth.getBalance(empire)
      
      //Repay gas costs to empire
      const costs = (
        empireInitialBalance.toNumber()
        + ((web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT))
        - empireBalance.toNumber()

      await web3.eth.sendTransaction({ from: root, to: empire, value: costs })
      empireBalance = await web3.eth.getBalance(empire)
      assert.equal(
        empireBalance.toNumber() - empireInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'empire expense'
      )
      const candidateId = candidateAddresses.findIndex((candidate) => {
        return candidate === empire
      })
      const gasPrice = 1
      const tx = await app.candidateExecutePayout(accountId, ethPayoutId, candidateId, { from: empire, gasPrice:gasPrice })
      const gas = tx.receipt.gasUsed
      const gasCost = gasPrice * gas
      await web3.eth.sendTransaction({ from:root, to:empire, value:gasCost })
      //No effect
      empireBalance = await web3.eth.getBalance(empire)
      assert.equal(
        empireBalance.toNumber() - empireInitialBalance.toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'empire expense'
      )
    })

    it('retrieves payout info details (eth)', async () => {
      const payoutInfo = await app.getPayout(accountId, ethPayoutId)
      assert.strictEqual(
        payoutInfo[0].toNumber(),
        1e16,
        'payout amount incorrect'
      )
      assert.strictEqual(
        payoutInfo[1].toNumber(),
        1,
        'payout Should not be recurring'
      )
      assert.strictEqual(
        payoutInfo[2].toNumber(),
        0,
        'recurring payout start time incorrect'
      )
      assert.strictEqual(
        payoutInfo[3].toNumber(),
        0,
        'recurring payout period length incorrect'
      )
    })

    it('retrieves payout description', async () => {
      const payoutDescription = await app.getPayoutDescription(
        accountId,
        ethPayoutId
      )
      assert.strictEqual(
        payoutDescription,
        'ETH description',
        'Payout description incorrectly stored'
      )
    })

    it('sets the distribution (token)', async () => {
      const candidateArrayLength = (await app.getNumberOfCandidates(
        accountId,
        deferredPayoutId
      )).toNumber()
      let storedSupport = []
      let supportVal

      for (let i = 0; i < candidateArrayLength; i++) {
        supportVal = (await app.getPayoutDistributionValue(
          accountId,
          deferredPayoutId,
          i
        ))[0].toNumber()
        assert.equal(
          SUPPORTS[i],
          supportVal,
          'support distributions do not match what is specified'
        )
        storedSupport.push(supportVal)
      }
      assert.equal(
        SUPPORTS.length,
        storedSupport.length,
        'distribution array lengths do not match'
      )
    })

    /* eslint-disable-next-line */
    xit('executes the payout (recurring)', async () => {
      timeTravel(2 * ONE_DAY)
      await app.runPayout(accountId, deferredPayoutId)

      const bobafettBalance = BigNumber(await web3.eth.getBalance(bobafett))
      const dengarBalance = BigNumber(await web3.eth.getBalance(dengar))
      const bosskBalance = BigNumber(await web3.eth.getBalance(bossk))

      assert.equal(
        bobafettBalance.minus(bobafettInitialBalance),
        (web3.toWei(0.03, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bobafett expense'
      )
      assert.equal(
        dengarBalance.minus(dengarInitialBalance),
        (web3.toWei(0.03, 'ether') * SUPPORTS[1]) / TOTAL_SUPPORT,
        'dengar expense'
      )
      assert.equal(
        bosskBalance.minus(bosskInitialBalance),
        (web3.toWei(0.03, 'ether') * SUPPORTS[2]) / TOTAL_SUPPORT,
        'bossk expense'
      )
    })

    it('cannot execute more than once if non-recurring', async () => {
      const receipt =  await app.runPayout(accountId, ethPayoutId)
      const firstFailedPayment = getReceipt(receipt, 'PaymentFailure')
      assert.equal(accountId, firstFailedPayment.accountId)
      assert.equal(ethPayoutId, firstFailedPayment.payoutId)
      assert.equal(0, firstFailedPayment.candidateId)
    })

    context('invalid workflows', () => {
      before(async () => {
        accountId = (await app.newAccount(
          'Fett´s vett',
          NULL_ADDR,
          0,
          0
        )).logs[0].args.accountId.toNumber()
      })

      it('cannot set Distribution before funding the account (eth)', async () => {
        return assertRevert(async () => {
          await app.setDistribution(
            candidateAddresses,
            SUPPORTS,
            zeros,
            '',
            '',
            zeros,
            zeros,
            accountId,
            false,
            0,
            web3.toWei(0.01, 'ether'),
            0x0
          )
        })
      })

      it('cannot set Distribution before funding the account (token)', async () => {
        return assertRevert(async () => {
          await app.setDistribution(
            candidateAddresses,
            SUPPORTS,
            zeros,
            '',
            '',
            zeros,
            zeros,
            accountId,
            false,
            0,
            web3.toWei(26, 'ether'),
            token.address
          )
        })
      })
    })
  })

  context('Recurring Payout', () => {
    let bobafettInitialBalance
    let dengarInitialBalance
    let bosskInitialBalance
    let accountId

    before(async () => {
      bobafettInitialBalance = await web3.eth.getBalance(bobafett)
      dengarInitialBalance = await web3.eth.getBalance(dengar)
      bosskInitialBalance = await web3.eth.getBalance(bossk)
      accountId = (await app.newAccount(
        'Fett´s vett',
        NULL_ADDR,
        0,
        0
      )).logs[0].args.accountId.toNumber()
      await vault.deposit(NULL_ADDR, web3.toWei(0.02, 'ether'), {
        from: root,
        value: web3.toWei(0.02, 'ether'),
      })
    })

    it('cannot occur more frequently than daily', async () => {
      return assertRevert(async () => {
        await app.setDistribution(
          candidateAddresses,
          SUPPORTS,
          zeros,
          '',
          '',
          zeros,
          zeros,
          accountId,
          2,
          0x0,
          ONE_DAY - 100,
          web3.toWei(0.01, 'ether'),
          { from: root }
        )
      })
    })

    it('will not execute more frequently than the specified period', async () => {
      const currentTimestamp = (await web3.eth.getBlock('latest')).timestamp

      const payoutId = (await app.setDistribution(
        candidateAddresses,
        SUPPORTS,
        zeros,
        '',
        '',
        zeros,
        zeros,
        accountId,
        2,
        currentTimestamp, // This is the internal ganache timestamp
        ONE_DAY,
        web3.toWei(0.01, 'ether')
      )).logs[0].args.payoutId.toNumber()

      const bobafettBalance = BigNumber(await web3.eth.getBalance(bobafett))
      const dengarBalance = BigNumber(await web3.eth.getBalance(dengar))
      const bosskBalance = BigNumber(await web3.eth.getBalance(bossk))

      assert.equal(
        bobafettBalance.minus(bobafettInitialBalance).toNumber(),
        (web3.toWei(0.01, 'ether') * SUPPORTS[0]) / TOTAL_SUPPORT,
        'bounty hunter expense 1 not paid out'
      )
      assert.equal(
        dengarBalance.minus(dengarInitialBalance),
        (web3.toWei(0.01, 'ether') * SUPPORTS[1]) / TOTAL_SUPPORT,
        'bounty hunter expense 2 not paid out'
      )
      assert.equal(
        bosskBalance.minus(bosskInitialBalance),
        (web3.toWei(0.01, 'ether') * SUPPORTS[2]) / TOTAL_SUPPORT,
        'bounty hunter expense 3 not paid out'
      )
      timeTravel(ONE_DAY / 2)
      const receipt =  await app.runPayout(accountId, payoutId)
      const firstFailedPayment = getReceipt(receipt, 'PaymentFailure')
      assert.equal(accountId, firstFailedPayment.accountId)
      assert.equal(payoutId, firstFailedPayment.payoutId)
      assert.equal(0, firstFailedPayment.candidateId)
    })
  })
  context('Update Global State', () => {
    let accountId

    before(async () => {
      accountId = (await app.newAccount(
        'Fett´s vett',
        NULL_ADDR,
        0,
        0
      )).logs[0].args.accountId.toNumber()
      await vault.deposit(
        NULL_ADDR, // zero address
        web3.toWei('0.02', 'ether'),
        { from: root, value: web3.toWei('0.02', 'ether') }
      )
    })

    it('should fail to set period duration - below minimum period', async () => {
      return assertRevert(async () => {
        await app.setPeriodDuration(ONE_DAY - 1, { from: root })
      })
    })

    it('should set period duration', async () => {
      await app.setPeriodDuration(ONE_DAY, { from: root })
      // Unable to check periodDuration since it's not public
      // TODO: Mock contract to check the period duration
    })

    it('should set the max candidates to zero and fail to set distribution', async () => {
      await app.setMaxCandidates(0, { from: root })
      return assertRevert(async () => {
        await app.setDistribution(
          candidateAddresses,
          SUPPORTS,
          zeros,
          '',
          'ETH description',
          zeros,
          zeros,
          accountId,
          1,
          0x0,
          0x0,
          web3.toWei('0.01', 'ether'))
      })
    })

    it('should reset max candidates', async () => {
      await app.setMaxCandidates(50, { from: root })
    })

    it('should set budget for accountId', async () => {
      await app.setBudget(accountId, 1000, 'testAccount')
      const [ , , , budget ] = await app.getAccount(accountId)
      assert.equal(1000, budget.toNumber())
    })

    it('should set budget for accountId without changing metadata', async () => {
      await app.setBudget(accountId, 1000, '')
      const [ name, , , budget ] = await app.getAccount(accountId)
      assert.equal(1000, budget.toNumber())
      assert.equal(name, 'testAccount', 'account name should persist from prior call')
    })

    it('should set budget without setting account.hasBudget', async () => {
      await app.setBudget(accountId,0, 'testAccount')
      const [ , , , budget ] = await app.getAccount(accountId)
      assert.equal(0, budget.toNumber())
    })

    it('should advance period', async () => {
      timeTravel(TEN_DAYS)
      await app.advancePeriod(1)
    })

    it('should run out of funds', async () => {
      const balance = await vault.balance(NULL_ADDR)
      const amount = balance.minus(1).toString()

      const timestamp = (await web3.eth.getBlock('latest')).timestamp + ONE_DAY
      const payoutId1 = (await app.setDistribution(
        candidateAddresses,
        SUPPORTS,
        zeros,
        '',
        '',
        zeros,
        zeros,
        accountId,
        1,
        timestamp,  // Start time must be current time
        0,
        amount,
      )).logs[0].args.payoutId.toNumber()

      const payoutId2 = (await app.setDistribution(
        candidateAddresses,
        SUPPORTS,
        zeros,
        '',
        '',
        zeros,
        zeros,
        accountId,
        1,
        timestamp,  // Start time must be current time
        0,
        amount,
      )).logs[0].args.payoutId.toNumber()

      timeTravel(ONE_DAY)

      await app.runPayout(accountId, payoutId1)
      await app.runPayout(accountId, payoutId2)
    })

    it('should remove budget from accountId', async() => {
      await app.removeBudget(accountId, '')
      const [ name, , hasBudget ] = await app.getAccount(accountId)
      assert.equal(false, hasBudget)
      assert.equal(name, 'testAccount', 'original name should persist')
    })

    it('should remove budget from accountId and change name', async() => {
      await app.removeBudget(accountId, 'newName')
      const [ name, , hasBudget ] = await app.getAccount(accountId)
      assert.equal(false, hasBudget)
      assert.equal(name, 'newName', 'new name should be set')
    })

    // TODO: Complete the test or remove it
    /* eslint-disable-next-line */
    xit('overflow', async () => {
      const max64 = BigNumber('18446744073709551616')
      const periodDuration = 864000000000000000
      await app.setPeriodDuration(periodDuration, { from: root })
      //await app.setPeriodDuration(max64.toString(), { from: root })
      let timestamp = (await web3.eth.getBlock('latest')).timestamp
      const timeChange = max64.minus(timestamp)
      const periods = parseInt(timeChange.dividedBy(periodDuration).toNumber())
      timeTravel(timeChange.toString())
      timestamp = (await web3.eth.getBlock('latest')).timestamp
      await app.advancePeriod(periods)
      // await app.executePayout(accountId, 1, 0, { from: root })
    })
  })
})
