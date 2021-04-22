pragma solidity 0.4.24;

import "@conflux-/aragon-os/contracts/kernel/Kernel.sol";
import "@conflux-/aragon-os/contracts/common/DepositableStorage.sol";


contract KernelDepositableMock is DepositableStorage, Kernel {
    constructor(bool _shouldPetrify) Kernel(_shouldPetrify) public {
        // solium-disable-previous-line no-empty-blocks
    }

    function enableDepositable() public {
        setDepositable(true);
    }
}
