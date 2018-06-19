const { assertRevert } = require('@aragon/test-helpers/assertThrow');

const MiniMeToken = artifacts.require('@aragon/os/contracts/common/MiniMeToken');
const Vault = artifacts.require('Vault');
const Finance = artifacts.require('Finance');
const Payroll = artifacts.require("Payroll");
const PriceFeedMock = artifacts.require("./mocks/feed/PriceFeedMock.sol");

contract('Payroll without init', function([owner, employee1, _]) {
  let vault, finance, payroll, priceFeed, erc20Token1;

  const SECONDS_IN_A_YEAR = 31557600; // 365.25 days
  const erc20Token1Decimals = 18;

  const deployErc20Token = async (name="ERC20Token", decimals=18) => {
    let token = await MiniMeToken.new("0x0", "0x0", 0, name, decimals, 'E20', true); // dummy parameters for minime
    let amount = new web3.BigNumber(10**9).times(new web3.BigNumber(10**decimals));
    let sender = owner;
    let receiver = finance.address;
    let initialSenderBalance = await token.balanceOf(sender);
    let initialVaultBalance = await token.balanceOf(vault.address);
    await token.generateTokens(sender, amount);
    await token.approve(receiver, amount, {from: sender});
    await finance.deposit(token.address, amount, "Initial deployment", {from: sender});
    assert.equal((await token.balanceOf(sender)).toString(), initialSenderBalance.toString());
    assert.equal((await token.balanceOf(vault.address)).toString(), (new web3.BigNumber(initialVaultBalance).plus(amount)).toString());
    return token;
  };

  beforeEach(async () => {
    vault = await Vault.new();
    await vault.initializeWithBase(vault.address)
    finance = await Finance.new();
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR); // more than one day

    priceFeed = await PriceFeedMock.new();
    payroll = await Payroll.new();

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20Token("Token 1", erc20Token1Decimals);
  })

  it('fails to call setPriceFeed', async () => {
    return assertRevert(async () => {
      await payroll.setPriceFeed(priceFeed.address)
    })
  })

  it('fails to call setRateExpiryTime', async () => {
    return assertRevert(async () => {
      await payroll.setRateExpiryTime(1000)
    })
  })

  it('fails to call addAllowedToken', async () => {
    return assertRevert(async () => {
      await payroll.addAllowedToken(erc20Token1.address)
    })
  })

  it('fails to call addEmployee', async () => {
    return assertRevert(async () => {
      await payroll.addEmployee(employee1, 10000)
    })
  })

  it('fails to call setEmployeeSalary', async () => {
    return assertRevert(async () => {
      await payroll.setEmployeeSalary(1, 20000)
    })
  })

  it('fails to call removeEmployee', async () => {
    return assertRevert(async () => {
      await payroll.removeEmployee(1)
    })
  })

  it('fails to call escapeHatch', async () => {
    return assertRevert(async () => {
      await payroll.escapeHatch()
    })
  })

  it('fails to call depositToFinance', async () => {
    return assertRevert(async () => {
      await payroll.depositToFinance(erc20Token1.address)
    })
  })

  it('fails to call determineAllocation', async () => {
    return assertRevert(async () => {
      await payroll.determineAllocation([erc20Token1.address], [100], { from: employee1 })
    })
  })

  it('fails to call payday', async () => {
    return assertRevert(async () => {
      await payroll.payday({ from: employee1 })
    })
  })

  it('fails to call changeAddressByEmployee', async () => {
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(owner, { from: employee1 })
    })
  })
})
