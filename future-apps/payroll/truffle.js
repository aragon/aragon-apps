let truffle = require("@aragon/os/truffle-config")

const truffleObj =  {
    host: 'localhost',
    port: 8545,
    network_id: '*'
  }

truffle.networks.development = truffleObj;

  
module.exports = truffle
