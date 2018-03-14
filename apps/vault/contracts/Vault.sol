pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";

import "./IConnector.sol";

import "./detectors/ERC165Detector.sol";


contract Vault is AragonApp, DelegateProxy, ERC165Detector {
    mapping (address => address) connectors;
    mapping (bytes32 => address) standardConnectors;

    bytes32 constant public REQUEST_ALLOWANCES_ROLE = keccak256("REQUEST_ALLOWANCES_ROLE");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    address constant ETH = 0x0;
    bytes32 constant erc777Identifier = keccak256('erc777');
    bytes32 constant erc20Identifier = keccak256('erc20');

    uint8[2] constant supportedInterfaceDetection = [165, uint8(-1)];

    struct TokenStandard {
        uint8 erc;
        uint8 interfaceDetectionERC;
        bytes32 data;
        address connector;
    }

    TokenStandard[] standards;

    event NewTokenStandard(uint8 indexed erc, uint8 indexed interfaceDetectionERC, bytes32 indexed data, address connector);

    TokenStandard[] public standards;

    event NewTokenStandard(uint8 indexed erc, uint8 indexed interfaceDetectionERC, bytes32 indexed data, address connector);

    function initialize(address erc20Connector, address erc777connector, address ethConnector) onlyInit external {
        initialized();

        standardConnectors[erc20Identifier] = erc20Connector;
        standardConnectors[erc777Identifier] = erc777connector;

        connectors[ETH] = ethConnector;
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

        if (connectors[token] == address(0)) {
            TokenStandard standard = detectTokenStandard(token);
            if (standard.eip == 0) {
                connectors[token] = standardConnectors[erc20Identifier];
            } else {
                connectors[token] = standard.connector;
            }
        }

        delegatedFwd(connectors[token], msg.data, 32);
    }

    function registerStandard(uint8 erc, uint8 interfaceDetectionERC, bytes32 data, address connector) public /*role here*/{
        require(isInterfaceDetectionERCSupported(interfaceDetectionERC));

        for (uint256 i = 0; i < standards.length; i++) {
            require(standards[i].erc != erc);
        }

        standards.push(TokenStandard(erc, interfaceDetectionERC, data, connector));

        NewTokenStandard(erc, interfaceDetectionERC, data, connector);
    }

    function detectTokenStandard(address token) public view returns (TokenStandard memory) {
        for (uint256 i = 0; i < standards.length; i++) {
            if (conformsToStandard(token, standards[i])) {
                return standards[i];
            }
        }
    }

    function conformsToStandard(address token, TokenStandard memory standard) public view returns (bool) {
        if (standard.interfaceDetectionERC == 165) {
            return conformsToERC165(token, bytes4(standard.data));
        }

        return false;
    }

    function isInterfaceDetectionERCSupported(uint8 interfaceDetectionERC) public pure returns (bool) {
      for (uint j = 0; j < supportedInterfaceDetection.length; j++) {
          if (supportedInterfaceDetection[j] == interfaceDetectionERC) {
              return true;
          }
      }

      return false;
    }
}
