const { keccak_256 } = require('js-sha3')
const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting', ([_, owner]) => {
  before('deploy voting', async () => {
    await deployer.deploy({ owner })
  })

  describe('roles', () => {
    const COMPUTED_CREATE_VOTES_ROLE = '0x' + keccak_256("CREATE_VOTES_ROLE");
    const COMPUTED_MODIFY_SUPPORT_ROLE = '0x' + keccak_256("MODIFY_SUPPORT_ROLE");
    const COMPUTED_MODIFY_QUORUM_ROLE = '0x' + keccak_256("MODIFY_QUORUM_ROLE");
    const COMPUTED_MODIFY_OVERRULE_WINDOW_ROLE = '0x' + keccak_256("MODIFY_OVERRULE_WINDOW_ROLE");
    const COMPUTED_MODIFY_EXECUTION_DELAY_ROLE = '0x' + keccak_256("MODIFY_EXECUTION_DELAY_ROLE");
    const COMPUTED_MODIFY_QUIET_ENDING_CONFIGURATION = '0x' + keccak_256("MODIFY_QUIET_ENDING_CONFIGURATION");

    let CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE,
        MODIFY_OVERRULE_WINDOW_ROLE, MODIFY_EXECUTION_DELAY_ROLE, MODIFY_QUIET_ENDING_CONFIGURATION

    before('load role', async () => {
      CREATE_VOTES_ROLE = await deployer.base.CREATE_VOTES_ROLE()
      MODIFY_SUPPORT_ROLE = await deployer.base.MODIFY_SUPPORT_ROLE()
      MODIFY_QUORUM_ROLE = await deployer.base.MODIFY_QUORUM_ROLE()
      MODIFY_OVERRULE_WINDOW_ROLE = await deployer.base.MODIFY_OVERRULE_WINDOW_ROLE()
      MODIFY_EXECUTION_DELAY_ROLE = await deployer.base.MODIFY_EXECUTION_DELAY_ROLE()
      MODIFY_QUIET_ENDING_CONFIGURATION = await deployer.base.MODIFY_QUIET_ENDING_CONFIGURATION()
    })

    it('roles match', async () => {
      assert.equal(CREATE_VOTES_ROLE, COMPUTED_CREATE_VOTES_ROLE, 'CREATE_VOTES_ROLE doesn’t match')
      assert.equal(MODIFY_SUPPORT_ROLE, COMPUTED_MODIFY_SUPPORT_ROLE, 'MODIFY_SUPPORT_ROLE doesn’t match')
      assert.equal(MODIFY_QUORUM_ROLE, COMPUTED_MODIFY_QUORUM_ROLE, 'MODIFY_QUORUM_ROLE doesn’t match')
      assert.equal(MODIFY_OVERRULE_WINDOW_ROLE, COMPUTED_MODIFY_OVERRULE_WINDOW_ROLE, 'MODIFY_OVERRULE_WINDOW_ROLE doesn’t match')
      assert.equal(MODIFY_EXECUTION_DELAY_ROLE, COMPUTED_MODIFY_EXECUTION_DELAY_ROLE, 'MODIFY_EXECUTION_DELAY_ROLE doesn’t match')
      assert.equal(MODIFY_QUIET_ENDING_CONFIGURATION, COMPUTED_MODIFY_QUIET_ENDING_CONFIGURATION, 'MODIFY_QUIET_ENDING_CONFIGURATION doesn’t match')
    })
  })
})
