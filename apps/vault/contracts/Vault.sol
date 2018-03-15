pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";

import "./IConnector.sol";

import "./detectors/ERC165Detector.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";



contract Vault is AragonApp, DelegateProxy, ERC165Detector {
    address constant ETH = address(0);
    uint32 constant ERC165 = 165;
    uint32 constant NO_DETECTION = uint32(-1);

    // connectors can define their own extra roles, challenge for discoverability
    bytes32 constant REGISTER_TOKEN_STANDARD = keccak256("REGISTER_TOKEN_STANDARD");
    bytes32 constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");
    // TODO: Abstract over different APPROVAL and have just one role?

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

        supportedInterfaceDetectionERCs.push(NO_DETECTION);
        supportedInterfaceDetectionERCs.push(ERC165);

        // register erc20 as the first standard
        _registerStandard(20, NO_DETECTION, bytes4(0), erc20Connector);
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
            connectors[token] = standards[detectTokenStandard(token)].connector;
        }

        // if return data size is less than 32 bytes, it will revert
        delegatedFwd(connectors[token], msg.data, 32);
    }

    function registerStandard(uint32 erc, uint32 interfaceDetectionERC, bytes4 interfaceID, address connector)
             authP(REGISTER_TOKEN_STANDARD, arr(uint256(erc), interfaceDetectionERC))
             public {

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
