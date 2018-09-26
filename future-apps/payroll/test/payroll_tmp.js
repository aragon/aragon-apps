// TODO: this is going to be reviewed/removed once we remove the escape hatch mechanism!

const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, allocation and payday,', function(accounts) {
  const USD_DECIMALS = 18
  const USD_PRECISION = 10 ** USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = "0x0"
  const rateExpiryTime = 1000

  const [owner, employee] = accounts
  const unused_account = accounts[7]
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require("./helpers.js")(owner)
  let salary = (new web3.BigNumber(10000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  let usdToken
  let erc20Token1
  let erc20Token1ExchangeRate
  const erc20Token1Decimals = 20
  let erc20Token2;
  const erc20Token2Decimals = 16;
  let etherExchangeRate

  let payroll
  let ayrollBase
  let priceFeed
  let employeeId
  let dao
  let finance
  let vault

  before(async () => {
    payrollBase = await getContract("PayrollMock").new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract("PriceFeedMock").new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 2", erc20Token2Decimals);

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  beforeEach(async () => {
    payroll = await initializePayroll(
      dao,
      payrollBase,
      finance,
      usdToken,
      priceFeed,
      rateExpiryTime
    )

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])
  })

  it("sends tokens using approveAndCall and transferAndCall", async () => {
    // ERC20
    const amount = new web3.BigNumber(10**2).times(new web3.BigNumber(10**erc20Token1Decimals));
    let sender = owner;
    let receiver;
    let initialSenderBalance;
    let initialVaultBalance;

    const setInitial = async (token, _receiver) => {
      receiver = _receiver;
      initialSenderBalance = await token.balanceOf(sender);
      initialVaultBalance = await token.balanceOf(vault.address);
    };
    const checkFinal = async (token) => {
      assert.equal((await token.balanceOf(sender)).toString(), initialSenderBalance.toString(), "Sender balances don't match");
      assert.equal((await token.balanceOf(vault.address)).toString(), (new web3.BigNumber(initialVaultBalance).plus(amount)).toString(), "Vault balances don't match");
    };

    // Send ERC20 Tokens to Payroll (with direct transfer)
    await setInitial(erc20Token1, payroll.address);
    await erc20Token1.generateTokens(sender, amount);
    await erc20Token1.transfer(receiver, amount, {from: sender});
    await payroll.depositToFinance(erc20Token1.address);
    await checkFinal(erc20Token1);
  });

  it("sends funds to Finance", async () => {
    let totalTxFee = new web3.BigNumber(0);;
    let vaultTokenBalances = {};
    let payrollTokenBalances = {};

    const getTxFee = async (transaction) => {
      let tx = await getTransaction(transaction.tx);
      let gasPrice = new web3.BigNumber(tx.gasPrice);

      return gasPrice.times(transaction.receipt.cumulativeGasUsed);
    };

    const addInitialBalance = async (token, name="", generate=true, decimals=18) => {
      let txFee = new web3.BigNumber(0);
      // add some tokens to Payroll (it shouldn't happen, but to test it)
      if (generate) {
        const amount = new web3.BigNumber(10**2).times(new web3.BigNumber(10**decimals));
        let transaction1 = await token.generateTokens(owner, amount);
        txFee = txFee.plus(await getTxFee(transaction1));
        let transaction2 = await token.transfer(payroll.address, amount, {from: owner});
        txFee = txFee.plus(await getTxFee(transaction2));
      }

      let vaultBalance = await token.balanceOf(vault.address);
      let payrollBalance = await token.balanceOf(payroll.address);
      vaultTokenBalances[token.address] = vaultBalance;
      payrollTokenBalances[token.address] = payrollBalance;

      return txFee;
    };
    const checkFinalBalance = async (token, name="") => {
      let vaultBalance = await token.balanceOf(vault.address);
      let payrollBalance = await token.balanceOf(payroll.address);
      assert.equal(vaultBalance.toString(), vaultTokenBalances[token.address].add(payrollTokenBalances[token.address]).toString(), "Funds not recovered for " + name + " (Vault)!");
      assert.equal(payrollBalance.valueOf(), 0, "Funds not recovered for " + name + " (Payroll)!");
    };

    // Initial values
    let transaction;
    let vaultInitialBalance = await getBalance(vault.address);
    totalTxFee = totalTxFee.plus(await addInitialBalance(usdToken, "USD Token", USD_DECIMALS));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc20Token1, "ERC20 Token 1", erc20Token1Decimals));
    // Escape Hatch
    transaction = await payroll.depositToFinance(usdToken.address);
    totalTxFee = totalTxFee.plus(await getTxFee(transaction));
    transaction = await payroll.depositToFinance(erc20Token1.address);
    totalTxFee = totalTxFee.plus(await getTxFee(transaction));
    // Final check
    await checkFinalBalance(usdToken, "USD Token");
    await checkFinalBalance(erc20Token1, "ERC20 Token 1");
    // call again to make sure we test value == 0 condition
    await payroll.depositToFinance(usdToken.address);
  });

  it("fails on sending ETH funds to Payroll", async () => {
    return assertRevert(async () => {
      await payroll.sendTransaction({ from: owner, value: web3.toWei(200, 'wei') });
    });
  });

  it("escapes hatch, recovers ETH", async () => {
    // Payroll doesn't accept ETH funds, so we use a self destructing contract
    // as a trick to be able to send ETH to it.
    let zombie = await getContract('Zombie').new(payroll.address);
    await zombie.sendTransaction({ from: owner, value: web3.toWei(200, 'wei') });
    await zombie.escapeHatch();
    let vaultInitialBalance = await getBalance(vault.address);
    let payrollInitialBalance = await getBalance(payroll.address);
    await payroll.escapeHatch();
    let vaultFinalBalance = await getBalance(vault.address);
    let payrollFinalBalance = await getBalance(payroll.address);
    assert.equal(payrollFinalBalance.valueOf(), 0, "Funds not recovered (Payroll)!");
    assert.equal(vaultFinalBalance.toString(), vaultInitialBalance.add(payrollInitialBalance).toString(), "Funds not recovered (Vault)!");
  });
})
