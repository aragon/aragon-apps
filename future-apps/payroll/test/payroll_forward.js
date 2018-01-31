const Payroll = artifacts.require("PayrollMock");
const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow');
const { encodeCallScript } = require('@aragon/test-helpers/evmScript');
const ExecutionTarget = artifacts.require('ExecutionTarget');
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory');
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory');
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL');
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel');

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff';

contract('PayrollForward', function(accounts) {
  let payroll3;
  let owner = accounts[0];
  let employee1 = accounts[1];
  let unused_account = accounts[7];

  before(async () => {
    const regFact = await EVMScriptRegistryFactory.new();
    daoFact = await DAOFactory.new(regFact.address);
  });

  beforeEach(async () => {
    const r = await daoFact.newDAO(owner);
    const dao = Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao);
    const acl = ACL.at(await dao.acl());

    await acl.createPermission(owner, dao.address, await dao.APP_MANAGER_ROLE(), owner, { from: owner });

    const receipt = await dao.newAppInstance('0x1234', (await Payroll.new()).address, { from: owner });
    payroll3 = Payroll.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy);

    await acl.createPermission(ANY_ADDR, payroll3.address, await payroll3.ADD_EMPLOYEE_ROLE(), owner, { from: owner });

    await payroll3.addEmployee(employee1, 100000);
  });

  it("checks that it's forwarder", async () => {
    let result = await payroll3.isForwarder();
    assert.equal(result.toString(), "true", "It's not forwarder");
  });

  it('forwards actions to employee', async () => {
    const executionTarget = await ExecutionTarget.new();
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() };
    const script = encodeCallScript([action]);

    await payroll3.forward(script, { from: employee1 });
    assert.equal((await executionTarget.counter()).toString(), 1, 'should have received execution call');

    return assertRevert(async () => {
      await payroll3.forward(script, { from: unused_account });
    });
  });

});
