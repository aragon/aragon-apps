module.exports = web3 => async () => {
  await web3.currentProvider.sendAsync(
    {
      jsonrpc: '2.0',
      method: 'evm_mine',
    },
    (error, _result) => {
      if (error) console.log('mineBlock error: ', error)
    }
  )
}
