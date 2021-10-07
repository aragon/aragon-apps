/*
 * SPDX-License-Identitifer:    MIT
 */

pragma solidity ^0.4.24;


contract ERCProxy {
    uint256 constant public FORWARDING = 1;
    uint256 constant public UPGRADEABLE = 2;

    function proxyType() public pure returns (uint256 proxyTypeId);
    function implementation() public view returns (address codeAddr);
}
