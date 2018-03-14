pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";

import "./IConnector.sol";


contract Vault is AragonApp, DelegateProxy {
    mapping (address => address) connectors;
    mapping (bytes32 => address) standardConnectors;

    bytes32 constant public REQUEST_ALLOWANCES_ROLE = keccak256("REQUEST_ALLOWANCES_ROLE");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    address constant ETH = 0x0;
    bytes32 constant erc777Identifier = keccak256('erc777');
    bytes32 constant erc20Identifier = keccak256('erc20');

    struct TokenStandard {
        uint8 eip;
        uint8 interfaceDetectionEIP;
        bytes32 data;
        address connector;
    }

    TokenStandard[] standards;

    event NewTokenStandard(uint8 indexed eip, uint8 indexed interfaceDetectionEIP, bytes32 indexed data, address connector);

    function initialize(address erc20Connector, address erc777connector, address ethConnector) onlyInit {
        initialized();

        standardConnectors[erc20Identifier] = erc20Connector;
        standardConnectors[erc777Identifier] = erc777connector;

        connectors[ETH] = ethConnector;
    }

    function registerStandard(uint8 eip, uint8 interfaceDetectionEIP, bytes32 data, address connector) public /*role here*/{
        standards.push(TokenStandard(eip, interfaceDetectionEIP, data, connector));

        NewTokenStandard(eip, interfaceDetectionEIP, data, connector);
    }

    function () payable {
        address token;

        // 4 (sig) + 32 (at least the token address to locate connector)
        if (msg.data.length >= 36) {
            // token address is always the first argument to any Vault calls
            assembly { token := calldataload(4) }
        } else {
          require(msg.value > 0); // if no data, only call ETH connector when ETH
          token = ETH;
        }

        address connector = connectors[token] != 0 ? connectors[token] : standardConnectors[erc20Identifier];
        delegatedFwd(connector, msg.data, 32);
    }
}
