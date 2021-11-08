pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract TokenBalanceOracle is AragonApp, IACLOracle {

    bytes32 public constant SET_TOKEN_ROLE = keccak256("SET_TOKEN_ROLE");
    bytes32 public constant SET_MIN_BALANCE_ROLE = keccak256("SET_MIN_BALANCE_ROLE");

    string private constant ERROR_TOKEN_NOT_CONTRACT = "TOKEN_BALANCE_ORACLE_TOKEN_NOT_CONTRACT";
    string private constant ERROR_SENDER_MISSING = "TOKEN_BALANCE_ORACLE_SENDER_MISSING";
    string private constant ERROR_SENDER_TOO_BIG = "TOKEN_BALANCE_ORACLE_SENDER_TOO_BIG";
    string private constant ERROR_SENDER_ZERO = "TOKEN_BALANCE_ORACLE_SENDER_ZERO";

    ERC20 public token;
    uint256 public minBalance;

    event TokenSet(address token);
    event MinimumBalanceSet(uint256 minBalance);

    function initialize(address _token, uint256 _minBalance) external onlyInit {
        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);

        token = ERC20(_token);
        minBalance = _minBalance;

        initialized();
    }

    /**
    * @notice Update token address to `_token`
    * @param _token The new token address
    */
    function setToken(address _token) external auth(SET_TOKEN_ROLE) {
        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        token = ERC20(_token);

        emit TokenSet(_token);
    }

    /**
    * @notice Update minimum balance to `_minBalance`
    * @param _minBalance The new minimum balance
    */
    function setMinBalance(uint256 _minBalance) external auth(SET_MIN_BALANCE_ROLE) {
        minBalance = _minBalance;

        emit MinimumBalanceSet(_minBalance);
    }

    /**
    * @notice ACLOracle
    * @dev IACLOracle interface conformance.  The ACLOracle permissioned function should specify the sender
    *     with 'authP(SOME_ACL_ROLE, arr(sender))', typically set to 'msg.sender'.
    */
    function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
        require(_how.length > 0, ERROR_SENDER_MISSING);
        require(_how[0] < 2**160, ERROR_SENDER_TOO_BIG);
        require(_how[0] != 0, ERROR_SENDER_ZERO);

        address sender = address(_how[0]);

        uint256 senderBalance = token.balanceOf(sender);
        return senderBalance >= minBalance;
    }
}
