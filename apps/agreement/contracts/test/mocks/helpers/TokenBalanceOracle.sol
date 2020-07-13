pragma solidity ^0.4.24;

import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract TokenBalanceOracle is IACLOracle {
    string private constant ERROR_SENDER_ZERO = "TOKEN_BALANCE_ORACLE_SENDER_ZERO";
    string private constant ERROR_SENDER_TOO_BIG = "TOKEN_BALANCE_ORACLE_SENDER_TOO_BIG";
    string private constant ERROR_SENDER_MISSING = "TOKEN_BALANCE_ORACLE_SENDER_MISSING";
    string private constant ERROR_TOKEN_NOT_CONTRACT = "TOKEN_BALANCE_ORACLE_TOKEN_NOT_CONTRACT";

    uint8 private constant ORACLE_PARAM_ID = 203;

    enum Op { NONE, EQ, NEQ, GT, LT, GTE, LTE, RET, NOT, AND, OR, XOR, IF_ELSE }

    ERC20 public token;
    uint256 public minBalance;

    constructor(ERC20 _token, uint256 _minBalance) public {
        token = _token;
        minBalance = _minBalance;
    }

    function canPerform(address _who, address, address, bytes32, uint256[]) external view returns (bool) {
        uint256 senderBalance = token.balanceOf(_who);
        return senderBalance >= minBalance;
    }

    function getPermissionParam() external view returns (uint256) {
        return _paramsTo256(ORACLE_PARAM_ID, uint8(Op.EQ), uint240(address(this)));
    }

    function _paramsTo256(uint8 _id,uint8 _op, uint240 _value) private pure returns (uint256) {
        return (uint256(_id) << 248) + (uint256(_op) << 240) + _value;
    }
}
