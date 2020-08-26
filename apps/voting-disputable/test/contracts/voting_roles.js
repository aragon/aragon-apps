const { sha3 } = require('web3-utils')
const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting', ([_, owner]) => {
  let voting

  before('deploy voting', async () => {
    voting = await deployer.deploy({ owner })
  })

  describe('roles', () => {
    it('computes roles properly', async () => {
      const EXPECTED_CREATE_VOTES_ROLE = sha3('CREATE_VOTES_ROLE')
      assert.equal(await voting.CREATE_VOTES_ROLE(), EXPECTED_CREATE_VOTES_ROLE, 'CREATE_VOTES_ROLE doesn’t match')

      const EXPECTED_CHANGE_SUPPORT_ROLE = sha3('CHANGE_SUPPORT_ROLE')
      assert.equal(await voting.CHANGE_SUPPORT_ROLE(), EXPECTED_CHANGE_SUPPORT_ROLE, 'CHANGE_SUPPORT_ROLE doesn’t match')

      const EXPECTED_CHANGE_QUORUM_ROLE = sha3('CHANGE_QUORUM_ROLE')
      assert.equal(await voting.CHANGE_QUORUM_ROLE(), EXPECTED_CHANGE_QUORUM_ROLE, 'CHANGE_QUORUM_ROLE doesn’t match')

      const EXPECTED_CHANGE_OVERRULE_WINDOW_ROLE = sha3('CHANGE_OVERRULE_WINDOW_ROLE')
      assert.equal(await voting.CHANGE_OVERRULE_WINDOW_ROLE(), EXPECTED_CHANGE_OVERRULE_WINDOW_ROLE, 'CHANGE_OVERRULE_WINDOW_ROLE doesn’t match')

      const EXPECTED_CHANGE_EXECUTION_DELAY_ROLE = sha3('CHANGE_EXECUTION_DELAY_ROLE')
      assert.equal(await voting.CHANGE_EXECUTION_DELAY_ROLE(), EXPECTED_CHANGE_EXECUTION_DELAY_ROLE, 'CHANGE_EXECUTION_DELAY_ROLE doesn’t match')

      const EXPECTED_CHANGE_QUIET_ENDING_ROLE = sha3('CHANGE_QUIET_ENDING_ROLE')
      assert.equal(await voting.CHANGE_QUIET_ENDING_ROLE(), EXPECTED_CHANGE_QUIET_ENDING_ROLE, 'CHANGE_QUIET_ENDING_ROLE doesn’t match')
    })
  })
})
