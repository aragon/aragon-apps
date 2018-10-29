const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, initialization,', function(accounts) {
  const [owner, employee1, employee2] = accounts
  const {
      deployErc20TokenAndDeposit,
      addAllowedTokens,
      getTimePassed,
      redistributeEth,
      getDaoFinanceVault,
      initializePayroll
  } = require('./helpers.js')(owner)

  const ONE = 1e18
  const ETH = '0x0'
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const USD_PRECISION = 10**18
  const USD_DECIMALS= 18
  const rateExpiryTime = 1000

  let dao
  let payroll
  let payrollBase
  let finance
  let vault
  let priceFeed
  let usdToken
  let erc20Token1
  let erc20Token2
  const erc20Token1Decimals = 18
  const erc20Token2Decimals = 16

  before(async () => {
    payrollBase = await getContract('PayrollMock').new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 2", erc20Token2Decimals)

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  it("fails to initialize with empty finance", async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = getContract('PayrollMock').at(getEvent(receipt, 'NewAppProxy', 'proxy'))

    return assertRevert(async () => {
      await payroll.initialize('0x0', usdToken.address, priceFeed.address, rateExpiryTime)
    })
  })

  it("initializes contract and checks that initial values match", async () => {
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
    let tmpFinance = await payroll.finance()
    assert.equal(tmpFinance.valueOf(), finance.address, "Finance address is wrong")
    let tmpUsd = await payroll.denominationToken()
    assert.equal(tmpUsd.valueOf(), usdToken.address, "USD Token address is wrong")
  })

  it('fails on reinitialization', async () => {
    return assertRevert(async () => {
      await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
    })
  })

  it("add allowed tokens", async () => {
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()
    const acl = await getContract('ACL').at(await dao.acl())
    const ANY_ENTITY = await acl.ANY_ENTITY()
    await acl.createPermission(ANY_ENTITY, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })

    // add them to payroll allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1, erc20Token2])
    assert.isTrue(await payroll.isTokenAllowed(usdToken.address), "USD Token should be allowed")
    assert.isTrue(await payroll.isTokenAllowed(erc20Token1.address), "ERC 20 Token 1 should be allowed")
    assert.isTrue(await payroll.isTokenAllowed(erc20Token2.address), "ERC 20 Token 2 should be allowed")
  })

  it("fails trying to add an already allowed token", async () => {
    return assertRevert(async () => {
      await payroll.addAllowedToken(usdToken.address)
    })
  })
})
