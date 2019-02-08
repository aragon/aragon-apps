const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, allowed tokens,', function(accounts) {
  const [owner, employee] = accounts
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require("./helpers.js")(owner)

  let payroll
  let payrollBase
  let priceFeed
  let dao
  let finance
  let vault

  let erc20Tokens = []
  const ERC20_TOKEN_DECIMALS = 18
  const SALARY = (new web3.BigNumber(1)).times(10 ** Math.max(ERC20_TOKEN_DECIMALS - 4, 1))
  const RATE_EXPIRY_TIME = 1000
  const NOW_MOCK = new Date().getTime()
  let ETH
  let MAX_ALLOWED_TOKENS

  const MAX_GAS_USED = 7e6

  before(async () => {
    payrollBase = await getContract("PayrollMock").new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    priceFeed = await getContract("PriceFeedMock").new()
    priceFeed.mockSetTimestamp(NOW_MOCK)

    MAX_ALLOWED_TOKENS = await payrollBase.getMaxAllowedTokens()
    // Deploy ERC 20 Tokens (0 is for ETH)
    for (let i = 1; i < MAX_ALLOWED_TOKENS; i++) {
      erc20Tokens.push(await deployErc20TokenAndDeposit(owner, finance, vault, `Token ${i}`, ERC20_TOKEN_DECIMALS))
    }

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)

    /* TODO
    const etherTokenConstantMock = await getContract("EtherTokenConstantMock").new()
    ETH = await etherTokenConstantMock.getETHConstant()
     */
    ETH = '0x0'
  })

  beforeEach(async () => {
    payroll = await initializePayroll(
      dao,
      payrollBase,
      finance,
      erc20Tokens[0],
      priceFeed,
      RATE_EXPIRY_TIME
    )

    await payroll.mockSetTimestamp(NOW_MOCK)

    // adds allowed tokens
    await addAllowedTokens(payroll, erc20Tokens)

    const startDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 2628005 // now minus 1/12 year
    // add employee
    const receipt = await payroll.addEmployee(employee, SALARY, "Kakaroto", 'Saiyajin', startDate)
  })

  it('fails adding one more token', async () => {
    const erc20Token = await deployErc20TokenAndDeposit(owner, finance, vault, 'Extra token', ERC20_TOKEN_DECIMALS)

    return assertRevert(async () => {
      await payroll.addAllowedToken(erc20Token.address)
    })
  })

  it('tests payday and ensures that it does not run out of gas', async () => {
    // determine allocation
    const receipt1 = await payroll.determineAllocation([ETH, ...erc20Tokens.map(t => t.address)], [100 - erc20Tokens.length, ...erc20Tokens.map(t => 1)], { from: employee })
    assert.isBelow(receipt1.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for allocation')

    // call payday
    const receipt2 = await payroll.payday({ from: employee })
    assert.isBelow(receipt2.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for payday')
  })
})
