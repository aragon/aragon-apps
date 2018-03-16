pragma solidity 0.4.18;

import "./detectors/ERC165Detector.sol";
import "./IVaultConnector.sol";

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";


contract VaultBase is AragonApp, DelegateProxy, ERC165Detector {
    address constant ETH = address(0);
    uint32 constant ERC165 = 165;
    uint32 constant NO_DETECTION = uint32(-1);

    // connectors can define their own extra roles, challenge for discoverability
    bytes32 constant public REGISTER_TOKEN_STANDARD = keccak256("REGISTER_TOKEN_STANDARD");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");
    // TODO: Abstract over different APPROVAL and have just one role?
}
