const { getNewProxyAddress } = require("@aragon/contract-test-helpers/events");

// vault.aragonpm.eth
const vaultAppId =
  "0xce74f3ee34b4d8bb871ec3628e2c57e30f1df24679790b7b6338e457554c5439";

let accounts, acl;

let vault, TRANSFER_ROLE;

module.exports = {
  postDao: async function({ dao }, bre) {
    accounts = await bre.web3.eth.getAccounts();
    acl = await bre.artifacts.require("ACL").at(await dao.acl());

    await _installVault(dao, bre.artifacts);

    console.log(`> Vault app installed: ${vault.address}`);
  },

  preInit: async function({ proxy }, bre) {
    await acl.createPermission(
      proxy.address,
      vault.address,
      TRANSFER_ROLE,
      accounts[0],
      { from: accounts[0] }
    );
    await vault.initialize();

    console.log(`> TRANSFER_ROLE assigned to ${proxy.address}`);
  },

  getInitParams: async function({}, bre) {
    const ONE_DAY = 60 * 60 * 24; // One day in seconds
    const PERIOD_DURATION = ONE_DAY;

    return [vault.address, PERIOD_DURATION];
  }
};

async function _installVault(dao, artifacts) {
  const Vault = artifacts.require("Vault");

  // base
  const vaultBase = await Vault.new();
  TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE();

  // proxy
  const receipt = await dao.newAppInstance(
    vaultAppId,
    vaultBase.address,
    "0x",
    false,
    { from: accounts[0] }
  );
  vault = await Vault.at(getNewProxyAddress(receipt));
}
