const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('DisputableApp', () => {
  let disputable

  before('deploy disputable', async () => {
    disputable = await deployer.deployBaseDisputable()
  })

  it('supports ERC165', async () => {
    assert.isTrue(await disputable.supportsInterface('0x01ffc9a7'), 'does not support ERC165')
  })

  it('supports IDisputable', async () => {
    assert.equal(await disputable.interfaceId(), '0x5fca5d80')
    assert.isTrue(await disputable.supportsInterface('0x5fca5d80'), 'does not support IDisputable')
  })

  it('does not support 0xffffffff', async () => {
    assert.isFalse(await disputable.supportsInterface('0xffffffff'), 'does support 0xffffffff')
  })
})
