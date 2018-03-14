pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";

import "./IConnector.sol";

import "./detectors/ERC165Detector.sol";


contract Vault is AragonApp, DelegateProxy, ERC165Detector {
    address constant ETH = address(0);

    struct TokenStandard {
        uint32 erc;
        uint32 interfaceDetectionERC;
        bytes4 interfaceID;
        address connector;
    }

    TokenStandard[] public standards;
    mapping (address => address) public connectors;
    uint32[] public supportedInterfaceDetectionERCs;

    event NewTokenStandard(uint32 indexed erc, uint32 indexed interfaceDetectionERC, bytes4 indexed interfaceID, address connector);

    function initialize(address erc20Connector, address ethConnector) onlyInit external {
        initialized();

        supportedInterfaceDetectionERCs.push(165);

        // register erc20 as the first standard
        _registerStandard(20, uint32(-1), bytes4(0), erc20Connector);
        // directly manage ETH with the ethConnector
        connectors[ETH] = ethConnector;
    }

    function () payable {
        address token = ETH;

        // 4 (sig) + 32 (at least the token address to locate connector)
        if (msg.data.length < 36) {
            require(msg.value > 0); // if no data, only call ETH connector when ETH
        } else {
            assembly { token := calldataload(4) } // token address MUST be the first argument to any Vault calls
        }

        if (connectors[token] == address(0)) {
            connectors[token] = detectTokenStandard(token).connector;
        }

        // if return data size is less than 32 bytes, it will revert
        delegatedFwd(connectors[token], msg.data, 32);
    }

    function registerStandard(uint32 erc, uint32 interfaceDetectionERC, bytes4 interfaceID, address connector) public /*role here*/{
        _registerStandard(erc, interfaceDetectionERC, interfaceID, connector);
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
            return conformsToERC165(token, bytes4(standard.interfaceID));
        }

        return false;
    }

    function isInterfaceDetectionERCSupported(uint32 interfaceDetectionERC) public view returns (bool) {
      for (uint j = 0; j < supportedInterfaceDetectionERCs.length; j++) {
          if (supportedInterfaceDetectionERCs[j] == interfaceDetectionERC) {
              return true;
          }
      }

      return false;
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
