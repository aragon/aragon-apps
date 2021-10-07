/*
 * SPDX-License-Identitifer:    MIT
 */

pragma solidity ^0.4.24;

import "../lib/token/ERC20.sol";
import "./EtherTokenConstant.sol";
import "./IsContract.sol";
import "./IVaultRecoverable.sol";


contract VaultRecoverable is IVaultRecoverable, EtherTokenConstant, IsContract {
    /**
     * @notice Send funds to recovery Vault. This contract should never receive funds,
     *         but in case it does, this function allows one to recover them.
     * @param _token Token balance to be sent to recovery vault.
     */
    function transferToVault(address _token) external {
        require(allowRecoverability(_token));
        address vault = getRecoveryVault();
        require(isContract(vault));

        if (_token == ETH) {
            vault.transfer(address(this).balance);
        } else {
            uint256 amount = ERC20(_token).balanceOf(this);
            ERC20(_token).transfer(vault, amount);
        }
    }

    /**
    * @dev By default deriving from AragonApp makes it recoverable
    * @return bool whether the app allows the recovery
    */
    function allowRecoverability(address /*token*/) public view returns (bool) {
        return true;
    }
    // * @param token Token address that would be recovered // unused

    // Cast non-implemented interface to be public so we can use it internally
    function getRecoveryVault() public view returns (address);
}
