const abis = {
  DemocracyTemplate: require('../build/contracts/DemocracyTemplate').abi,
  MultisigTemplate: require('../build/contracts/MultisigTemplate').abi,
}

require('fs').writeFileSync('abis.json', JSON.stringify(abis, null, 2))
console.log('generated and saved abis.json')
