pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";

import "./IConnector.sol";

import "./detectors/ERC165Detector.sol";


contract Vault is AragonApp, DelegateProxy, ERC165Detector {
    mapping (address => address) connectors;
    address public erc20Connector;

    bytes32 constant public REQUEST_ALLOWANCES_ROLE = keccak256("REQUEST_ALLOWANCES_ROLE");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    address constant ETH = address(0);

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

    function initialize(address erc20Connector, address ethConnector) onlyInit external {
        initialized();

        // register erc20 as the first standard
        registerStandard(TokenStandard(20, uint8(-1), bytes32(0), erc20Connector));
        // directly manage ETH with the ethConnector
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
            connectors[token] = detectTokenStandard(token).connector;
        }

        // if return data size is less than 32 bytes, it will revert
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
        // skip index 0 which is erc20 and it is not conformant to any
        for (uint256 i = 1; i < standards.length; i++) {
            if (conformsToStandard(token, standards[i])) {
                return standards[i];
            }
        }

        // no definition, return ERC20 standard
        return standards[0];
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
