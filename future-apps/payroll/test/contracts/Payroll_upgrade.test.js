const TruffleConfig = require('truffle-config')
const TruffleContract = require('truffle-contract')
const VersionedContractsProvider = require('@aragon/test-helpers/lib/VersionedContractsProvider')(web3, TruffleContract, TruffleConfig)

contract('Payroll previous version', ([whatever]) => {
  it.only('previous version should allow to call isAllowedToken when not initialized', async () => {
    const commit = 'aff584ec78545cfb71415dcf2e56426e17a9f9cd'
    const projectDir = 'future-apps/payroll'
    const provider = VersionedContractsProvider.fromBranch({ commit, projectDir })

    const PayrollOld = provider.getContract('Payroll')
    const payroll = await PayrollOld.new()

    assert.equal(await payroll.isTokenAllowed(whatever), false, 'should not fail calling to isTokenAllowed without initialization')
  }).timeout(1800000)
})
