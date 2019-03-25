pragma solidity 0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";


contract EtherTokenConstantMock is EtherTokenConstant {
    function getETHConstant() external pure returns (address) { return ETH; }
}
