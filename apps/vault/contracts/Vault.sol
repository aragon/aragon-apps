pragma solidity 0.4.18;

import "./VaultBase.sol"; // split made to avoid circular import

import "./connectors/ERC20Connector.sol";
import "./connectors/ETHConnector.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Vault is VaultBase {
    struct TokenStandard {
        uint32 erc;
        uint32 interfaceDetectionERC;
        bytes4 interfaceID;
        address connector;
    }

    TokenStandard[] public standards;
    mapping (address => address) public connectors;
    mapping(uint32 => bool) public supportedInterfaceDetectionERCs;

    event NewTokenStandard(uint32 indexed erc, uint32 indexed interfaceDetectionERC, bytes4 indexed interfaceID, address connector);

    // TODO Role??
    function initializeConnectors() public {
        // this allows to simplify template logic, as they don't have to deploy this
        _setConnectors(new ERC20Connector(), new ETHConnector());
    }

    function initializeEmpty() onlyInit public {
        initialized();

        supportedInterfaceDetectionERCs[NO_DETECTION] = true;
        supportedInterfaceDetectionERCs[ERC165] = true;
    }

    function initialize(ERC20Connector erc20Connector, ETHConnector ethConnector) onlyInit public {
        initializeEmpty();

        _setConnectors(erc20Connector, ethConnector);
    }

    function _setConnectors(ERC20Connector erc20Connector, ETHConnector ethConnector) internal {
        // register erc20 as the first standard
        if (erc20Connector != address(0))
            _registerStandard(20, NO_DETECTION, bytes4(0), erc20Connector);
        // directly manage ETH with the ethConnector
        if (ethConnector != address(0))
            connectors[ETH] = ethConnector;

    }

    function () payable public {
        address token = ETH;

        // 4 (sig) + 32 (at least the token address to locate connector)
        if (msg.data.length < 36) {
            require(msg.value > 0); // if no data, only call ETH connector when ETH
        } else {
            assembly { token := calldataload(4) } // token address MUST be the first argument to any Vault calls
        }

        if (connectors[token] == address(0)) {
            connectors[token] = standards[detectTokenStandard(token)].connector;
        }

        // if return data size is less than 32 bytes, it will revert
        delegatedFwd(connectors[token], msg.data, 32);
    }

    function registerStandard(uint32 erc, uint32 interfaceDetectionERC, bytes4 interfaceID, address connector)
             authP(REGISTER_TOKEN_STANDARD, arr(uint256(erc), interfaceDetectionERC))
             public
    {

        _registerStandard(erc, interfaceDetectionERC, interfaceID, connector);
    }

    function detectTokenStandard(address token) public view returns (uint256 standardId) {
        // skip index 0 which is erc20 and it is not conformant to any
        for (uint256 i = 1; i < standards.length; i++) {
            if (conformsToStandard(token, i)) {
                return i;
            }
        }

        // no definition, return ERC20 standard
        return 0;
    }

    function conformsToStandard(address token, uint256 standardId) public view returns (bool) {
        if (standards[standardId].interfaceDetectionERC == ERC165) {
            return conformsToERC165(token, bytes4(standards[standardId].interfaceID));
        }

        return false;
    }

    function isInterfaceDetectionERCSupported(uint32 interfaceDetectionERC) public view returns (bool) {
        return supportedInterfaceDetectionERCs[interfaceDetectionERC];
    }

    function _registerStandard(uint32 erc, uint32 interfaceDetectionERC, bytes4 interfaceID, address connector) internal {
        require(isInterfaceDetectionERCSupported(interfaceDetectionERC));

        for (uint256 i = 0; i < standards.length; i++) {
            require(standards[i].erc != erc);
        }

        standards.push(TokenStandard(erc, interfaceDetectionERC, interfaceID, connector));

        NewTokenStandard(erc, interfaceDetectionERC, interfaceID, connector);
    }
}
