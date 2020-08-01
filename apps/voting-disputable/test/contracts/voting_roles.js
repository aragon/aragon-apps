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

      const EXPECTED_MODIFY_SUPPORT_ROLE = sha3('MODIFY_SUPPORT_ROLE')
      assert.equal(await voting.MODIFY_SUPPORT_ROLE(), EXPECTED_MODIFY_SUPPORT_ROLE, 'MODIFY_SUPPORT_ROLE doesn’t match')

      const EXPECTED_MODIFY_QUORUM_ROLE = sha3('MODIFY_QUORUM_ROLE')
      assert.equal(await voting.MODIFY_QUORUM_ROLE(), EXPECTED_MODIFY_QUORUM_ROLE, 'MODIFY_QUORUM_ROLE doesn’t match')

      const EXPECTED_MODIFY_OVERRULE_WINDOW_ROLE = sha3('MODIFY_OVERRULE_WINDOW_ROLE')
      assert.equal(await voting.MODIFY_OVERRULE_WINDOW_ROLE(), EXPECTED_MODIFY_OVERRULE_WINDOW_ROLE, 'MODIFY_OVERRULE_WINDOW_ROLE doesn’t match')

      const EXPECTED_MODIFY_EXECUTION_DELAY_ROLE = sha3('MODIFY_EXECUTION_DELAY_ROLE')
      assert.equal(await voting.MODIFY_EXECUTION_DELAY_ROLE(), EXPECTED_MODIFY_EXECUTION_DELAY_ROLE, 'MODIFY_EXECUTION_DELAY_ROLE doesn’t match')

      const EXPECTED_MODIFY_QUIET_ENDING_CONFIGURATION = sha3('MODIFY_QUIET_ENDING_CONFIGURATION')
      assert.equal(await voting.MODIFY_QUIET_ENDING_CONFIGURATION(), EXPECTED_MODIFY_QUIET_ENDING_CONFIGURATION, 'MODIFY_QUIET_ENDING_CONFIGURATION doesn’t match')
    })
  })
})
