const abi = require('web3-eth-abi')
const { isAddress } = require('web3-utils')

function decodeEventsOfType({ receipt }, contractAbi, eventName) {
  const eventAbi = contractAbi.filter(abi => abi.name === eventName && abi.type === 'event')[0]
  const eventSignature = abi.encodeEventSignature(eventAbi)
  const eventLogs = receipt.rawLogs.filter(l => l.topics[0] === eventSignature)
  return eventLogs.map(log => {
    log.event = eventAbi.name
    log.args = abi.decodeLog(eventAbi.inputs, log.data, log.topics.slice(1))

    // undo checksumed addresses
    Object.keys(log.args).forEach(arg => {
      const value = log.args[arg]
      if (isAddress(value)) log.args[arg] = value.toLowerCase()
    })

    return log
  })
}

module.exports = {
  decodeEventsOfType
}
