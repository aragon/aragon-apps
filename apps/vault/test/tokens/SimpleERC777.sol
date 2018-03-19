pragma solidity 0.4.18;

import "./SimpleERC20.sol";


contract SimpleERC777 is SimpleERC20 {
    function name() public constant returns (string) {
        // TODO
    }

    function symbol() public constant returns (string) {
        // TODO
    }

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
        return true;
        /*
        return
            interfaceID == this.supportsInterface.selector || // ERC165
            interfaceID == this.name.selector ^
            this.symbol.selector ^
            this.totalSupply.selector ^
            this.granularity.selector ^
            this.balanceOf.selector ^
            this.authorizeOperator.selector ^
            this.revokeOperator.selector ^
            this.isOperatorFor.selector ^
            this.operatorSend.selector;
        */
            /* TODO! this.send.selector ^ */
    }
}
