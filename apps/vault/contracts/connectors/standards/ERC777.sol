pragma solidity ^0.4.18;

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "../../detectors/standards/ERC165.sol";

interface ERC777 {
    function name() public constant returns (string);
    function symbol() public constant returns (string);
    function totalSupply() public constant returns (uint256);
    function granularity() public constant returns (uint256);
    function balanceOf(address owner) public constant returns (uint256);

    function send(address to, uint256 amount) public;
    function send(address to, uint256 amount, bytes userData) public;

    function authorizeOperator(address operator) public;
    function revokeOperator(address operator) public;
    function isOperatorFor(address operator, address tokenHolder) public constant returns (bool);
    function operatorSend(address from, address to, uint256 amount, bytes userData, bytes operatorData) public;
}

interface ERC777TokensSender {
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint value,
        bytes userData,
        bytes operatorData
    ) public;
}


interface ERC777TokensRecipient {
    function tokensReceived(address operator, address from, address to, uint amount, bytes userData, bytes operatorData) public;
}


contract ERC777Token is MiniMeToken, ERC165 {
    function granularity() public constant returns (uint256) {
        // TODO
    }

    function send(address to, uint256 amount) public {
        // TODO
    }

    function send(address to, uint256 amount, bytes userData) public {
        // TODO
    }

    function authorizeOperator(address operator) public {
        // TODO
    }

    function revokeOperator(address operator) public {
        // TODO
    }

    function isOperatorFor(address operator, address tokenHolder) public constant returns (bool) {
        // TODO
    }

    function operatorSend(address from, address to, uint256 amount, bytes userData, bytes operatorData) public {
        // TODO
    }

    function supportsInterface(bytes4 interfaceID) external view returns (bool) {
        return
          interfaceID == this.supportsInterface.selector || // ERC165
          interfaceID == this.name.selector
            ^ this.symbol.selector
            ^ this.totalSupply.selector
            ^ this.granularity.selector
            ^ this.balanceOf.selector
            // TODO! ^ this.send.selector
            ^ this.authorizeOperator.selector
            ^ this.revokeOperator.selector
            ^ this.isOperatorFor.selector
            ^ this.operatorSend.selector;
    }
}
