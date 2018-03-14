const abis = require('./abis')

module.exports = {
  networks: {
    rinkeby: {
      ens: '0xaa0ccb537289d226941745c4dd7a819a750897d0',
      templates: {
        DemocracyTemplate: '0xfcc089230e47d9376fcbd7177164c095ce8e9f23',
        MultisigTemplate: '0xce16339814b0c2e825a077ada6f08e4b4fc4e21f',
      },
    },
  },
  templates: {
    DemocracyTemplate: {
      abi: abis.DemocracyTemplate
    },
    MultisigTemplate: {
      abi: abis.MultisigTemplate
    }
  },
}
