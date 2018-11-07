const PayrollApp = artifacts.require('Payroll.sol')

module.exports = function (deployer) {
  deployer.deploy(PayrollApp)
}
