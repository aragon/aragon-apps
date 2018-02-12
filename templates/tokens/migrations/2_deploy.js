const path = require('path')

const TokenFactory = artifacts.require('TokenFactory')

const tokens = [
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

    console.log('fac', fac.address)
    console.log(await Promise.all(tokens.map(async ({ name, symbol }) => {
        const receipt = await fac.newToken(name, symbol)
        return receipt.logs.filter(l => l.event == 'DeployToken')[0].args.token
    })))
}
