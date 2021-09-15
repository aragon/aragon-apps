pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "./lib/ArrayUtils.sol";


contract Redemptions is AragonApp {
    using SafeMath for uint256;
    using ArrayUtils for address[];

    bytes32 constant public REDEEM_ROLE = keccak256("REDEEM_ROLE");
    bytes32 constant public ADD_TOKEN_ROLE = keccak256("ADD_TOKEN_ROLE");
    bytes32 constant public REMOVE_TOKEN_ROLE = keccak256("REMOVE_TOKEN_ROLE");

    string private constant ERROR_VAULT_IS_NOT_CONTRACT = "REDEMPTIONS_VAULT_NOT_CONTRACT";
    string private constant ERROR_TOKEN_MANAGER_IS_NOT_CONTRACT = "REDEMPTIONS_TOKEN_MANAGER_NOT_CONTRACT";
    string private constant ERROR_REDEEMABLE_TOKEN_LIST_FULL = "REDEMPTIONS_REDEEMABLE_TOKEN_LIST_FULL";
    string private constant ERROR_DUPLICATE_REDEEMABLE_TOKEN = "REDEMPTIONS_DUPLICATE_REDEEMABLE_TOKEN";
    string private constant ERROR_TOKEN_ALREADY_ADDED = "REDEMPTIONS_TOKEN_ALREADY_ADDED";
    string private constant ERROR_TOKEN_NOT_CONTRACT = "REDEMPTIONS_TOKEN_NOT_CONTRACT";
    string private constant ERROR_TOKEN_NOT_ADDED = "REDEMPTIONS_TOKEN_NOT_ADDED";
    string private constant ERROR_CANNOT_BURN_ZERO = "REDEMPTIONS_CANNOT_BURN_ZERO";
    string private constant ERROR_INSUFFICIENT_BALANCE = "REDEMPTIONS_INSUFFICIENT_BALANCE";
    string private constant ERROR_CANNOT_REDEEM_ZERO = "REDEMPTIONS_CANNOT_REDEEM_ZERO";

    uint256 constant public REDEEMABLE_TOKENS_MAX_SIZE = 30;

    Vault public vault;
    TokenManager public tokenManager;

    mapping(address => bool) public redeemableTokenAdded;
    address[] internal redeemableTokens;

    event AddRedeemableToken(address indexed token);
    event RemoveRedeemableToken(address indexed token);
    event Redeem(address indexed redeemer, uint256 amount);

    /**
    * @notice Initialize Redemptions app contract
    * @param _vault Vault address
    * @param _tokenManager TokenManager address
    * @param _redeemableTokens Unique list of redeemable tokens
    */
    function initialize(Vault _vault, TokenManager _tokenManager, address[] _redeemableTokens) external onlyInit {
        initialized();

        require(isContract(_vault), ERROR_VAULT_IS_NOT_CONTRACT);
        require(isContract(_tokenManager), ERROR_TOKEN_MANAGER_IS_NOT_CONTRACT);
        require(_redeemableTokens.length <= REDEEMABLE_TOKENS_MAX_SIZE, ERROR_REDEEMABLE_TOKEN_LIST_FULL);

        for (uint256 i = 0; i < _redeemableTokens.length; i++) {
            address token = _redeemableTokens[i];
            require(redeemableTokenAdded[token] == false, ERROR_DUPLICATE_REDEEMABLE_TOKEN);
            if (token != ETH) {
                require(isContract(token), ERROR_TOKEN_NOT_CONTRACT);
            }
            redeemableTokenAdded[token] = true;
        }

        vault = _vault;
        tokenManager = _tokenManager;
        redeemableTokens = _redeemableTokens;
    }

    /**
    * @notice Add `_token == self.getETHAddress(): address ? 'ETH' : _token.symbol(): string` token to the redeemable tokens
    * @param _token Token address
    */
    function addRedeemableToken(address _token) external auth(ADD_TOKEN_ROLE) {
        require(redeemableTokens.length < REDEEMABLE_TOKENS_MAX_SIZE, ERROR_REDEEMABLE_TOKEN_LIST_FULL);
        require(!redeemableTokenAdded[_token], ERROR_TOKEN_ALREADY_ADDED);

        if (_token != ETH) {
            require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        }

        redeemableTokenAdded[_token] = true;
        redeemableTokens.push(_token);

        emit AddRedeemableToken(_token);
    }

    /**
    * @notice Remove `_token == self.getETHAddress(): address ? 'ETH' : _token.symbol(): string` token from the redeemable tokens
    * @param _token Token address
    */
    function removeRedeemableToken(address _token) external auth(REMOVE_TOKEN_ROLE) {
        require(redeemableTokenAdded[_token], ERROR_TOKEN_NOT_ADDED);

        redeemableTokenAdded[_token] = false;
        redeemableTokens.deleteItem(_token);

        emit RemoveRedeemableToken(_token);
    }

    /**
    * @dev The redeem function is intended to be used directly, using a forwarder will not work see: https://github.com/1Hive/redemptions-app/issues/78
    * @notice Burn `@tokenAmount(self.getToken(): address, _burnableAmount, true)` in exchange for redeemable tokens.
    * @param _burnableAmount Amount of burnable token to be exchanged for redeemable tokens
    */
    function redeem(uint256 _burnableAmount) external authP(REDEEM_ROLE, arr(msg.sender)) {
        require(_burnableAmount > 0, ERROR_CANNOT_BURN_ZERO);
        require(tokenManager.spendableBalanceOf(msg.sender) >= _burnableAmount, ERROR_INSUFFICIENT_BALANCE);

        uint256 redemptionAmount;
        uint256 totalRedemptionAmount;
        uint256 vaultTokenBalance;
        uint256 burnableTokenTotalSupply = tokenManager.token().totalSupply();

        for (uint256 i = 0; i < redeemableTokens.length; i++) {
            vaultTokenBalance = vault.balance(redeemableTokens[i]);

            redemptionAmount = _burnableAmount.mul(vaultTokenBalance).div(burnableTokenTotalSupply);
            totalRedemptionAmount = totalRedemptionAmount.add(redemptionAmount);

            if (redemptionAmount > 0) {
                vault.transfer(redeemableTokens[i], msg.sender, redemptionAmount);
            }
        }

        require(totalRedemptionAmount > 0, ERROR_CANNOT_REDEEM_ZERO);

        tokenManager.burn(msg.sender, _burnableAmount);

        emit Redeem(msg.sender, _burnableAmount);
    }

    /**
    * @notice Get tokens from redemption list
    * @return token addresses
    */
    function getRedeemableTokens() external view returns (address[]) {
        return redeemableTokens;
    }

    /**
    * @dev Convenience functions for radspec
    */
    function getToken() external view returns (address) {
        return tokenManager.token();
    }

    function getETHAddress() external view returns(address) {
        return ETH;
    }
}
