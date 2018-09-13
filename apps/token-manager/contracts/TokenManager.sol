/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

/* solium-disable function-order */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/common/Uint256Helpers.sol";

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

import "@aragon/apps-shared-minime/contracts/ITokenController.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";


contract TokenManager is ITokenController, IForwarder, AragonApp {
    using SafeMath for uint256;
    using Uint256Helpers for uint256;

    bytes32 public constant MINT_ROLE = keccak256("MINT_ROLE");
    bytes32 public constant ISSUE_ROLE = keccak256("ISSUE_ROLE");
    bytes32 public constant ASSIGN_ROLE = keccak256("ASSIGN_ROLE");
    bytes32 public constant REVOKE_VESTINGS_ROLE = keccak256("REVOKE_VESTINGS_ROLE");
    bytes32 public constant BURN_ROLE = keccak256("BURN_ROLE");

    uint256 public constant MAX_VESTINGS_PER_ADDRESS = 50;

    struct TokenVesting {
        uint256 amount;
        uint64 start;
        uint64 cliff;
        uint64 vesting;
        bool revokable;
    }

    MiniMeToken public token;
    uint256 public maxAccountTokens;
    bool public logHolders;

    // We are mimicing an array in the inner mapping, we use a mapping instead to make app upgrade more graceful
    mapping (address => mapping (uint256 => TokenVesting)) internal vestings;
    mapping (address => uint256) public vestingsLengths;
    mapping (address => bool) public everHeld;

    // Returns all holders the token had (since managing it).
    // Some of them can have a balance of 0.
    address[] public holders;

    // Other token specific events can be watched on the token address directly (avoids duplication)
    event NewVesting(address indexed receiver, uint256 vestingId, uint256 amount);
    event RevokeVesting(address indexed receiver, uint256 vestingId, uint256 nonVestedAmount);

    modifier vestingExists(address _holder, uint256 _vestingId) {
        // TODO: it's not checking for gaps that may appear because of deletes in revokeVesting function
        require(_vestingId < vestingsLengths[_holder]);
        _;
    }

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
        external
        onlyInit
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
    function mint(address _receiver, uint256 _amount) external authP(MINT_ROLE, arr(_receiver, _amount)) {
        require(_isBalanceIncreaseAllowed(_receiver, _amount));
        _mint(_receiver, _amount);
    }

    /**
    * @notice Mint `_amount / 10^18` tokens for the Token Manager
    * @param _amount Number of tokens minted
    */
    function issue(uint256 _amount) external authP(ISSUE_ROLE, arr(_amount)) {
        _mint(address(this), _amount);
    }

    /**
    * @notice Assign `_amount / 10^18` tokens to `_receiver` from Token Manager's holdings
    * @param _receiver The address receiving the tokens
    * @param _amount Number of tokens transferred
    */
    function assign(address _receiver, uint256 _amount) external authP(ASSIGN_ROLE, arr(_receiver, _amount)) {
        _assign(_receiver, _amount);
    }

    /**
    * @notice Burn `_amount / 10^18` tokens from `_holder`
    * @param _holder Holder being removed tokens
    * @param _amount Number of tokens being burned
    */
    function burn(address _holder, uint256 _amount) external authP(BURN_ROLE, arr(_holder, _amount)) {
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
    )
        external
        authP(ASSIGN_ROLE, arr(_receiver, _amount))
        returns (uint256)
    {
        require(vestingsLengths[_receiver] < MAX_VESTINGS_PER_ADDRESS);

        require(_start <= _cliff && _cliff <= _vested);

        uint256 vestingId = vestingsLengths[_receiver]++;
        vestings[_receiver][vestingId] = TokenVesting(
            _amount,
            _start,
            _cliff,
            _vested,
            _revokable
        );

        _assign(_receiver, _amount);

        emit NewVesting(_receiver, vestingId, _amount);

        return vestingId;
    }

    /**
    * @notice Revoke vesting `_vestingId` from `_holder`, returning unvested tokens to Token Manager
    * @param _holder Address getting vesting revoked
    * @param _vestingId Numeric id of the vesting
    */
    function revokeVesting(address _holder, uint256 _vestingId)
        external
        authP(REVOKE_VESTINGS_ROLE, arr(_holder))
        vestingExists(_holder, _vestingId)
    {
        TokenVesting storage v = vestings[_holder][_vestingId];
        require(v.revokable);

        uint256 nonVested = _calculateNonVestedTokens(
            v.amount,
            getTimestamp64(),
            v.start,
            v.cliff,
            v.vesting
        );

        // To make vestingIds immutable over time, we just zero out the revoked vesting
        delete vestings[_holder][_vestingId];

        // transferFrom always works as controller
        // onTransfer hook always allows if transfering to token controller
        require(token.transferFrom(_holder, address(this), nonVested));

        emit RevokeVesting(_holder, _vestingId, nonVested);
    }

    /**
    * @notice Execute desired action as a token holder
    * @dev IForwarder interface conformance. Forwards any token holder action.
    * @param _evmScript Script being executed
    */
    function forward(bytes _evmScript) public isInitialized {
        require(canForward(msg.sender, _evmScript));
        bytes memory input = new bytes(0); // TODO: Consider input for this

        // Add the managed token to the blacklist to disallow a token holder from executing actions
        // on the token controller's (this contract) behalf
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

    function getVesting(
        address _recipient,
        uint256 _vestingId
    )
        public
        view
        vestingExists(_recipient, _vestingId)
        returns (
            uint256 amount,
            uint64 start,
            uint64 cliff,
            uint64 vesting,
            bool revokable
        )
    {
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
    function onTransfer(address _from, address _to, uint _amount) public isInitialized returns (bool) {
        require(msg.sender == address(token));

        bool includesTokenManager = _from == address(this) || _to == address(this);

        if (!includesTokenManager) {
            bool toCanReceive = _isBalanceIncreaseAllowed(_to, _amount);
            if (!toCanReceive || transferableBalance(_from, now) < _amount) {
                return false;
            }
        }

        _logHolderIfNeeded(_to);

        return true;
    }

    function _isBalanceIncreaseAllowed(address _receiver, uint _inc) internal view returns (bool) {
        return token.balanceOf(_receiver).add(_inc) <= maxAccountTokens;
    }

    function spendableBalanceOf(address _holder) public view returns (uint256) {
        return transferableBalance(_holder, now);
    }

    function transferableBalance(address _holder, uint256 _time) public view returns (uint256) {
        uint256 vestingsCount = vestingsLengths[_holder];
        uint256 totalNonTransferable = 0;

        for (uint256 i = 0; i < vestingsCount; i = i.add(1)) {
            TokenVesting storage v = vestings[_holder][i];
            uint nonTransferable = _calculateNonVestedTokens(
                v.amount,
                _time.toUint64(),
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
    *      Start       Cliff    Vested
    */
    function _calculateNonVestedTokens(
        uint256 tokens,
        uint256 time,
        uint256 start,
        uint256 cliff,
        uint256 vested
    )
        private
        pure
        returns (uint256)
    {
        // Shortcuts for before cliff and after vested cases.
        if (time >= vested) {
            return 0;
        }
        if (time < cliff) {
            return tokens;
        }

        // Interpolate all vested tokens.
        // As before cliff the shortcut returns 0, we can just calculate a value
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

    function _assign(address _receiver, uint256 _amount) internal isInitialized {
        require(_isBalanceIncreaseAllowed(_receiver, _amount));
        // Must use transferFrom() as transfer() does not give the token controller full control
        require(token.transferFrom(this, _receiver, _amount));
    }

    function _mint(address _receiver, uint256 _amount) internal isInitialized {
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
    * @notice Called when ether is sent to the MiniMe Token contract
    * @return True if the ether is accepted, false for it to throw
    */
    function proxyPayment(address) public payable returns (bool) {
        // Even though it is tested, solidity-coverage doesnt get it because
        // MiniMeToken is not instrumented and entire tx is reverted
        require(msg.sender == address(token));
        return false;
    }

    /**
    * @dev Notifies the controller about an approval allowing the controller to react if desired
    * @return False if the controller does not authorize the approval
    */
    function onApprove(address, address, uint) public returns (bool) {
        return true;
    }
}
