const path = require('path')
const fs = require('fs')

const TokenFactory = artifacts.require('TokenFactory')

const tokenList = [
  { name: 'Aragon', symbol: 'ANT' },
  { name: 'Decentraland', symbol: 'MANA' },
  { name: 'Bitconnect', symbol: 'BCC' },
  { name: 'Spankchain', symbol: 'SPANK' },
  { name: 'Status', symbol: 'SNT' },
  { name: 'District0x', symbol: 'DNT' },
  { name: '0x', symbol: 'ZRX' },
  { name: 'MakerDAO', symbol: 'MKR' },
  { name: 'SwarmCity', symbol: 'SWT' },
]

module.exports = async (deployer, network, accounts) => {
  const fac = await TokenFactory.new()

  const tokens = await Promise.all(tokenList.map(async token => {
    const { name, symbol } = token
    const receipt = await fac.newToken(name, symbol)
    const addr = receipt.logs.filter(l => l.event == 'DeployToken')[0].args.token
    token.address = addr
    return addr
   }))

   let indexObj = require('../index.js')
   indexObj[network] = {
     tokens,
     factory: fac.address,
   }

   const indexFile = 'module.exports = ' + JSON.stringify(indexObj, null, 2)
   // could also use https://github.com/yeoman/stringify-object if you wanted single quotes
   fs.writeFileSync('index.js', indexFile)

   console.log('Token addresses saved to index.js')
}
