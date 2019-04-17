Vaults own and manage the ERC20 assets the DAO has.

The design rationale for having Vaults:

- Allowing the installation of third party apps that can spend from the same
  pool of assets as other apps.
- Being able to revoke spending permissions to apps without having to move
  assets.

Granting permissions to execute functions on the Vault must be done extremely
carefully (it can cause irreversible leak of funds) and ideally only other
trusted smart contracts (e.g. Finance app) should have access to it.
