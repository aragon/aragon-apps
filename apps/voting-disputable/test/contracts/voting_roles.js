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
      assert.equal(await voting.CREATE_VOTES_ROLE(), EXPECTED_CREATE_VOTES_ROLE, 'CREATE_VOTES_ROLE does not match')

      const EXPECTED_CHANGE_VOTE_TIME_ROLE = sha3('CHANGE_VOTE_TIME_ROLE')
      assert.equal(await voting.CHANGE_VOTE_TIME_ROLE(), EXPECTED_CHANGE_VOTE_TIME_ROLE, 'CHANGE_VOTE_TIME_ROLE does not match')

      const EXPECTED_CHANGE_SUPPORT_ROLE = sha3('CHANGE_SUPPORT_ROLE')
      assert.equal(await voting.CHANGE_SUPPORT_ROLE(), EXPECTED_CHANGE_SUPPORT_ROLE, 'CHANGE_SUPPORT_ROLE does not match')

      const EXPECTED_CHANGE_QUORUM_ROLE = sha3('CHANGE_QUORUM_ROLE')
      assert.equal(await voting.CHANGE_QUORUM_ROLE(), EXPECTED_CHANGE_QUORUM_ROLE, 'CHANGE_QUORUM_ROLE does not match')

      const EXPECTED_CHANGE_DELEGATED_VOTING_PERIOD_ROLE = sha3('CHANGE_DELEGATED_VOTING_PERIOD_ROLE')
      assert.equal(await voting.CHANGE_DELEGATED_VOTING_PERIOD_ROLE(), EXPECTED_CHANGE_DELEGATED_VOTING_PERIOD_ROLE, 'CHANGE_DELEGATED_VOTING_PERIOD_ROLE does not match')

      const EXPECTED_CHANGE_QUIET_ENDING_ROLE = sha3('CHANGE_QUIET_ENDING_ROLE')
      assert.equal(await voting.CHANGE_QUIET_ENDING_ROLE(), EXPECTED_CHANGE_QUIET_ENDING_ROLE, 'CHANGE_QUIET_ENDING_ROLE does not match')

      const EXPECTED_CHANGE_EXECUTION_DELAY_ROLE = sha3('CHANGE_EXECUTION_DELAY_ROLE')
      assert.equal(await voting.CHANGE_EXECUTION_DELAY_ROLE(), EXPECTED_CHANGE_EXECUTION_DELAY_ROLE, 'CHANGE_EXECUTION_DELAY_ROLE does not match')
    })
  })
})
