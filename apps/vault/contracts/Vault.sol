pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Vault is AragonApp {
    event SetAllowance(address indexed token, address indexed spender, uint256 amount);
    event TokenTransfer(address indexed token, address indexed receiver, uint256 amount);

    bytes32 constant public REQUEST_ALLOWANCES_ROLE = keccak256("REQUEST_ALLOWANCES_ROLE");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    /**
    * @notice Request for `_spender` to spend up to `_amounts` in `_tokens`
    * @dev This action creates an ERC20 and will allow the spender to transferFrom the Vault address until the allowance is completely spent or it is overiden
    * @param _tokens Array of token addresses
    * @param _amounts Array of token amounts
    */
    function requestAllowances(ERC20[] _tokens, uint256[] _amounts) auth(REQUEST_ALLOWANCES_ROLE) external {
        require(_tokens.length == _amounts.length);

        for (uint i = 0; i < _tokens.length; i++) {
            requestAllowance(_tokens[i], _amounts[i]);
        }
    }

    function requestAllowance(ERC20 _token, uint256 _amount) authP(REQUEST_ALLOWANCES_ROLE, arr(address(_token), _amount)) public {
        address spender = msg.sender;

        // Some token implementations will throw when changing an allowance from non-zero to non-zero
        // https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        if (_token.allowance(address(this), spender) > 0)
            assert(_token.approve(spender, 0));

        if (_amount > 0)
            assert(_token.approve(spender, _amount));

        SetAllowance(_token, spender, _amount);
    }

    /**
    * @notice Transfer `_amount` `_token` from the Vault to `_receiver`
    * @dev This function should be used as little as possible, in favor of using allowances
    * @param _token Address of the token being transferred
    * @param _receiver Address of the recipient of tokens
    * @param _amount Amount of tokens being transferred
    */
    function transferTokens(ERC20 _token, address _receiver, uint256 _amount) authP(TRANSFER_ROLE, arr(address(_token), _receiver, _amount)) external {
        assert(_token.transfer(_receiver, _amount));
        TokenTransfer(_token, _receiver, _amount);
    }
}
