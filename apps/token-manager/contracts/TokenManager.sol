pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/minime/ITokenController.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract TokenManager is ITokenController, AragonApp, IForwarder {
    using SafeMath for uint256;

    MiniMeToken public token;
    uint256 public maxAccountTokens;
    bool public logHolders;

    bytes32 constant public MINT_ROLE = keccak256("MINT_ROLE");
    bytes32 constant public ISSUE_ROLE = keccak256("ISSUE_ROLE");
    bytes32 constant public ASSIGN_ROLE = keccak256("ASSIGN_ROLE");
    bytes32 constant public REVOKE_VESTINGS_ROLE = keccak256("REVOKE_VESTINGS_ROLE");
    bytes32 constant public BURN_ROLE = keccak256("BURN_ROLE");

    uint256 constant MAX_VESTINGS_PER_ADDRESS = 50;
    struct TokenVesting {
        uint256 amount;
        uint64 start;
        uint64 cliff;
        uint64 vesting;
        bool revokable;
    }

    mapping (address => TokenVesting[]) vestings;
    mapping (address => bool) everHeld;

    // Returns all holders the token had (since managing it).
    // Some of them can have a balance of 0.
    address[] public holders;


    // Other token specific events can be watched on the token address directly (avoid duplication)
    event NewVesting(address indexed receiver, uint256 vestingId, uint256 amount);
    event RevokeVesting(address indexed receiver, uint256 vestingId, uint256 nonVestedAmount);

    /**
    * @notice Initializes Token Manager for `_token.symbol(): string`, `transerable ? 'T' : 'Not t'`ransferable`_maxAccountTokens > 0 ? ', with a maximum of ' _maxAccountTokens ' per account' : ''` and with`_logHolders ? '' : 'out'` storage of token holders.
    * @param _token MiniMeToken address for the managed token (Token Manager instance must be already set as the token controller)
    * @param _transferable whether the token can be transferred by holders
    * @param _maxAccountTokens Maximum amount of tokens an account can have (0 for infinite tokens)
    * @param _logHolders Whether the Token Manager will store all token holders (makes token transfers more expensive!)
    */
    function initialize(
        MiniMeToken _token,
        bool _transferable,
        uint256 _maxAccountTokens,
        bool _logHolders
        )
        onlyInit external
    {
        initialized();

        require(_token.controller() == address(this));

        token = _token;
        maxAccountTokens = _maxAccountTokens == 0 ? uint256(-1) : _maxAccountTokens;
        logHolders = _logHolders;

        if (token.transfersEnabled() != _transferable) {
            token.enableTransfers(_transferable);
        }
    }

    /**
    * @notice Mint `_amount / 10^18` tokens for `_receiver`
    * @param _receiver The address receiving the tokens
    * @param _amount Number of tokens minted
    */
    function mint(address _receiver, uint256 _amount) authP(MINT_ROLE, arr(_receiver, _amount)) external {
        require(isBalanceIncreaseAllowed(_receiver, _amount));
        _mint(_receiver, _amount);
    }

    /**
    * @notice Mint `_amount / 10^18` tokens for the Token Manager
    * @param _amount Number of tokens minted
    */
    function issue(uint256 _amount) authP(ISSUE_ROLE, arr(_amount)) external {
        _mint(address(this), _amount);
    }

    /**
    * @notice Assign `_amount / 10^18` tokens to `_receiver` from Token Manager's holdings
    * @param _receiver The address receiving the tokens
    * @param _amount Number of tokens transferred
    */
    function assign(address _receiver, uint256 _amount) authP(ASSIGN_ROLE, arr(_receiver, _amount)) external {
        _assign(_receiver, _amount);
    }

    /**
    * @notice Burn `_amount / 10^18` tokens from `_holder`
    * @param _holder Holder being removed tokens
    * @param _amount Number of tokens being burned
    */
    function burn(address _holder, uint256 _amount) authP(BURN_ROLE, arr(_holder, _amount)) isInitialized external {
        // minime.destroyTokens() never returns false, only reverts on failure
        token.destroyTokens(_holder, _amount);
    }

    /**
    * @notice Assign `_amount / 10^18` tokens to `_receiver` from the Token Manager's holdings with a `_revokable : 'revokable' : ''` vesting starting at `_start`, cliff at `_cliff` (first portion of tokens transferable), and completed vesting at `_vesting` (all tokens transferable)
    * @param _receiver The address receiving the tokens
    * @param _amount Number of tokens vested
    * @param _start Date the vesting calculations start
    * @param _cliff Date when the initial portion of tokens are transferable
    * @param _vested Date when all tokens are transferable
    * @param _revokable Whether the vesting can be revoked by the Token Manager
    */
    function assignVested(
        address _receiver,
        uint256 _amount,
        uint64 _start,
        uint64 _cliff,
        uint64 _vested,
        bool _revokable
    ) authP(ASSIGN_ROLE, arr(_receiver, _amount)) external returns (uint256)
    {
        require(tokenGrantsCount(_receiver) < MAX_VESTINGS_PER_ADDRESS);

        require(_start <= _cliff && _cliff <= _vested);

        TokenVesting memory tokenVesting = TokenVesting(
            _amount,
            _start,
            _cliff,
            _vested,
            _revokable
        );
        uint256 vestingId = vestings[_receiver].push(tokenVesting) - 1;

        _assign(_receiver, _amount);

        NewVesting(_receiver, vestingId, _amount);

        return vestingId;
    }

    /**
    * @notice Revoke vesting `_vestingId` from `_holder`, returning unvested tokens to Token Manager
    * @param _holder Address getting vesting revoked
    * @param _vestingId Numeric id of the vesting
    */
    function revokeVesting(address _holder, uint256 _vestingId) authP(REVOKE_VESTINGS_ROLE, arr(_holder)) isInitialized external {
        TokenVesting storage v = vestings[_holder][_vestingId];
        require(v.revokable);

        uint256 nonVested = calculateNonVestedTokens(
            v.amount,
            uint64(now),
            v.start,
            v.cliff,
            v.vesting
        );

        // To make vestingIds immutable over time, we just zero out the revoked vesting
        delete vestings[_holder][_vestingId];

        // transferFrom always works as controller
        // onTransfer hook always allows if transfering to token controller
        require(token.transferFrom(_holder, address(this), nonVested));

        RevokeVesting(_holder, _vestingId, nonVested);
    }

    /**
    * @notice Execute desired action as a token holder
    * @dev IForwarder interface conformance. Forwards any token holder action.
    * @param _evmScript Script being executed
    */
    function forward(bytes _evmScript) isInitialized public {
        require(canForward(msg.sender, _evmScript));
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(token);
        runScript(_evmScript, input, blacklist);
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        return token.balanceOf(_sender) > 0;
    }

    function allHolders() public view returns (address[]) { return holders; }

    function getVesting(address _recipient, uint256 _vestingId) public view returns (uint256 amount, uint64 start, uint64 cliff, uint64 vesting, bool revokable) {
        TokenVesting storage tokenVesting = vestings[_recipient][_vestingId];
        amount = tokenVesting.amount;
        start = tokenVesting.start;
        cliff = tokenVesting.cliff;
        vesting = tokenVesting.vesting;
        revokable = tokenVesting.revokable;
    }

    /*
    * @dev Notifies the controller about a token transfer allowing the controller to decide whether to allow it or react if desired (only callable from the token)
    * @param _from The origin of the transfer
    * @param _to The destination of the transfer
    * @param _amount The amount of the transfer
    * @return False if the controller does not authorize the transfer
    */
    function onTransfer(address _from, address _to, uint _amount) isInitialized public returns (bool) {
        require(msg.sender == address(token));

        bool includesTokenManager = _from == address(this) || _to == address(this);

        if (!includesTokenManager) {
            bool toCanReceive = isBalanceIncreaseAllowed(_to, _amount);
            if (!toCanReceive || transferableBalance(_from, now) < _amount) {
                return false;
            }
        }

        _logHolderIfNeeded(_to);

        return true;
    }

    function isBalanceIncreaseAllowed(address _receiver, uint _inc) internal view returns (bool) {
        return token.balanceOf(_receiver).add(_inc) <= maxAccountTokens;
    }

    function tokenGrantsCount(address _holder) public view returns (uint256) {
        return vestings[_holder].length;
    }

    function spendableBalanceOf(address _holder) public view returns (uint256) {
        return transferableBalance(_holder, now);
    }

    function transferableBalance(address _holder, uint256 _time) public view returns (uint256) {
        uint256 vs = tokenGrantsCount(_holder);
        uint256 totalNonTransferable = 0;

        for (uint256 i = 0; i < vs; i = i.add(1)) {
            TokenVesting storage v = vestings[_holder][i];
            uint nonTransferable = calculateNonVestedTokens(
                v.amount,
                uint64(_time),
                v.start,
                v.cliff,
                v.vesting
            );
            totalNonTransferable = totalNonTransferable.add(nonTransferable);
        }

        return token.balanceOf(_holder).sub(totalNonTransferable);
    }

    /**
    * @dev Calculate amount of non-vested tokens at a specifc time
    * @param tokens The total amount of tokens vested
    * @param time The time at which to check
    * @param start The date vesting started
    * @param cliff The cliff period
    * @param vested The fully vested date
    * @return The amount of non-vested tokens of a specific grant
    *  transferableTokens
    *   |                         _/--------   vestedTokens rect
    *   |                       _/
    *   |                     _/
    *   |                   _/
    *   |                 _/
    *   |                /
    *   |              .|
    *   |            .  |
    *   |          .    |
    *   |        .      |
    *   |      .        |
    *   |    .          |
    *   +===+===========+---------+----------> time
    *      Start       Clift    Vested
    */
    function calculateNonVestedTokens(
        uint256 tokens,
        uint256 time,
        uint256 start,
        uint256 cliff,
        uint256 vested) private pure returns (uint256)
    {
        // Shortcuts for before cliff and after vested cases.
        if (time >= vested) {
            return 0;
        }
        if (time < cliff) {
            return tokens;
        }

        // Interpolate all vested tokens.
        // As before cliff the shortcut returns 0, we can use just calculate a value
        // in the vesting rect (as shown in above's figure)

        // vestedTokens = tokens * (time - start) / (vested - start)
        uint256 vestedTokens = SafeMath.div(
            SafeMath.mul(
                tokens,
                SafeMath.sub(
                    time,
                    start
                )
            ),
            SafeMath.sub(
                vested,
                start
            )
        );

        // tokens - vestedTokens
        return tokens.sub(vestedTokens);
    }

    function _assign(address _receiver, uint256 _amount) isInitialized internal {
        require(isBalanceIncreaseAllowed(_receiver, _amount));
        // Must use transferFrom() as transfer() does not give the token controller full control
        require(token.transferFrom(this, _receiver, _amount));
    }

    function _mint(address _receiver, uint256 _amount) isInitialized internal {
        token.generateTokens(_receiver, _amount); // minime.generateTokens() never returns false
        _logHolderIfNeeded(_receiver);
    }

    function _logHolderIfNeeded(address _newHolder) internal {
        // costs 3 sstores (2 full (20k gas) and 1 increase (5k gas)), but makes frontend easier
        if (!logHolders || everHeld[_newHolder]) {
            return;
        }

        everHeld[_newHolder] = true;
        holders.push(_newHolder);
    }

    /**
    * @notice Called when `_owner` sends ether to the MiniMe Token contract
    * @param _owner The address that sent the ether to create tokens
    * @return True if the ether is accepted, false for it to throw
    */
    function proxyPayment(address _owner) payable public returns (bool) {
        // Even though it is tested, solidity-coverage doesnt get it because
        // MiniMeToken is not instrumented and entire tx is reverted
        require(msg.sender == address(token));
        return false;
    }

    /**
    * @dev Notifies the controller about an approval allowing the controller to react if desired
    * @param _owner The address that calls `approve()`
    * @param _spender The spender in the `approve()` call
    * @param _amount The amount in the `approve()` call
    * @return False if the controller does not authorize the approval
    */
    function onApprove(address _owner, address _spender, uint _amount) public returns (bool) {
        _owner;
        _spender;
        _amount;
        return true;
    }
}
