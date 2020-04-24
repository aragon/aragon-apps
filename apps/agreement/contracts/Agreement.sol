/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/common/TimeHelpers.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "./lib/PctHelpers.sol";
import "./arbitration/IArbitrable.sol";
import "./arbitration/IArbitrator.sol";


contract Agreement is IArbitrable, IForwarder, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;
    using PctHelpers for uint256;

    /* Arbitrator outcomes constants */
    uint256 internal constant DISPUTES_POSSIBLE_OUTCOMES = 2;
    uint256 internal constant DISPUTES_RULING_SUBMITTER = 3;
    uint256 internal constant DISPUTES_RULING_CHALLENGER = 4;

    /* Validation errors */
    string internal constant ERROR_AUTH_FAILED = "APP_AUTH_FAILED";
    string internal constant ERROR_CAN_NOT_FORWARD = "AGR_CAN_NOT_FORWARD";
    string internal constant ERROR_SENDER_NOT_ALLOWED = "AGR_SENDER_NOT_ALLOWED";
    string internal constant ERROR_INVALID_UNSTAKE_AMOUNT = "AGR_INVALID_UNSTAKE_AMOUNT";
    string internal constant ERROR_INVALID_SETTLEMENT_OFFER = "AGR_INVALID_SETTLEMENT_OFFER";
    string internal constant ERROR_NOT_ENOUGH_AVAILABLE_STAKE = "AGR_NOT_ENOUGH_AVAILABLE_STAKE";
    string internal constant ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL = "AGR_AVAIL_BAL_BELOW_COLLATERAL";

    /* Action related errors */
    string internal constant ERROR_ACTION_DOES_NOT_EXIST = "AGR_ACTION_DOES_NOT_EXIST";
    string internal constant ERROR_DISPUTE_DOES_NOT_EXIST = "AGR_DISPUTE_DOES_NOT_EXIST";
    string internal constant ERROR_CANNOT_CANCEL_ACTION = "AGR_CANNOT_CANCEL_ACTION";
    string internal constant ERROR_CANNOT_EXECUTE_ACTION = "AGR_CANNOT_EXECUTE_ACTION";
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_ACTION = "AGR_CANNOT_RULE_ACTION";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";

    /* Evidence related errors */
    string internal constant ERROR_SUBMITTER_FINISHED_EVIDENCE = "AGR_SUBMITTER_FINISHED_EVIDENCE";
    string internal constant ERROR_CHALLENGER_FINISHED_EVIDENCE = "AGR_CHALLENGER_FINISHED_EVIDENCE";

    /* Arbitrator related errors */
    string internal constant ERROR_ARBITRATOR_NOT_CONTRACT = "AGR_ARBITRATOR_NOT_CONTRACT";
    string internal constant ERROR_ARBITRATOR_FEE_RETURN_FAILED = "AGR_ARBITRATOR_FEE_RETURN_FAIL";
    string internal constant ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED = "AGR_ARBITRATOR_FEE_DEPOSIT_FAIL";
    string internal constant ERROR_ARBITRATOR_FEE_APPROVAL_FAILED = "AGR_ARBITRATOR_FEE_APPROVAL_FAIL";
    string internal constant ERROR_ARBITRATOR_FEE_TRANSFER_FAILED = "AGR_ARBITRATOR_FEE_TRANSFER_FAIL";

    /* Collateral token related errors */
    string internal constant ERROR_COLLATERAL_TOKEN_NOT_CONTRACT = "AGR_COL_TOKEN_NOT_CONTRACT";
    string internal constant ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED = "AGR_COL_TOKEN_TRANSFER_FAILED";

    // bytes32 public constant SIGN_ROLE = keccak256("SIGN_ROLE");
    bytes32 public constant SIGN_ROLE = 0xfbd6b3ad612c81ecfcef77ba888ef41173779a71e0dbe944f953d7c64fd9dc5d;

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_AGREEMENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_AGREEMENT_ROLE = 0x4af6231bf2561f502301de36b9a7706e940a025496b174607b9d2f58f9840b46;

    // bytes32 public constant CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = keccak256("CHANGE_TOKEN_BALANCE_PERMISSION_ROLE");
    bytes32 public constant CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = 0x4413cad936c22452a3bdddec48f42af1848858d1e8a8b62b7c0ba489d6d77286;

    event ActionScheduled(uint256 indexed actionId, address indexed submitter);
    event ActionChallenged(uint256 indexed actionId, address indexed challenger);
    event ActionSettled(uint256 indexed actionId, uint256 offer);
    event ActionDisputed(uint256 indexed actionId, IArbitrator indexed arbitrator, uint256 disputeId);
    event ActionAccepted(uint256 indexed actionId);
    event ActionVoided(uint256 indexed actionId);
    event ActionRejected(uint256 indexed actionId);
    event ActionCancelled(uint256 indexed actionId);
    event ActionExecuted(uint256 indexed actionId);
    event BalanceStaked(address indexed signer, uint256 amount);
    event BalanceUnstaked(address indexed signer, uint256 amount);
    event BalanceLocked(address indexed signer, uint256 amount);
    event BalanceUnlocked(address indexed signer, uint256 amount);
    event BalanceChallenged(address indexed signer, uint256 amount);
    event BalanceUnchallenged(address indexed signer, uint256 amount);
    event BalanceSlashed(address indexed signer, uint256 amount);
    event SettingChanged(uint256 settingId);
    event TokenBalancePermissionChanged(ERC20 signToken, uint256 signBalance, ERC20 challengeToken, uint256 challengeBalance);

    enum ActionState {
        Scheduled,
        Challenged,
        Executed,
        Cancelled
    }

    enum ChallengeState {
        Waiting,
        Settled,
        Disputed,
        Rejected,
        Accepted,
        Voided
    }

    struct Action {
        bytes script;                   // Action script to be executed
        bytes context;                  // Link to a human-readable text giving context for the given action
        ActionState state;              // Current state of the action
        uint64 challengeEndDate;        // End date of the challenge window where a challenger can challenge the action
        address submitter;              // Address that has scheduled the action
        uint256 settingId;              // Identification number of the Agreement setting when the action was scheduled
        Challenge challenge;            // Associated challenge instance
    }

    struct Challenge {
        bytes context;                  // Link to a human-readable text giving context for the challenge
        uint64 settlementEndDate;       // End date of the settlement window where the action submitter can answer the challenge
        address challenger;             // Address that challenged the action
        uint256 settlementOffer;        // Amount of collateral tokens the challenger would accept without involving the arbitrator
        uint256 arbitratorFeeAmount;    // Amount of arbitration fees paid by the challenger in advance in case the challenge is disputed
        ERC20 arbitratorFeeToken;       // ERC20 token used for the arbitration fees paid by the challenger in advance
        ChallengeState state;           // Current state of the action challenge
        uint256 disputeId;              // Identification number of the dispute for the arbitrator
    }

    struct Dispute {
        uint256 ruling;                 // Ruling given for the action dispute
        uint256 actionId;               // Identification number of the action being queried
        bool submitterFinishedEvidence; // Whether the action submitter has finished submitting evidence for the action dispute
        bool challengerFinishedEvidence;// Whether the action challenger has finished submitting evidence for the action dispute
    }

    struct Stake {
        uint256 available;              // Amount of staked tokens that are available to schedule actions
        uint256 locked;                 // Amount of staked tokens that are locked due to a scheduled action
        uint256 challenged;             // Amount of staked tokens that are blocked due to an ongoing challenge
    }

    struct Setting {
        bytes content;                  // Link to a human-readable text that describes the initial rules for the Agreements instance
        uint64 delayPeriod;             // Duration in seconds during which an action is delayed before being executable
        uint64 settlementPeriod;        // Duration in seconds during which a challenge can be accepted or rejected
        uint256 collateralAmount;       // Amount of `collateralToken` that will be locked every time an action is created
        uint256 challengeCollateral;    // Amount of `collateralToken` that will be locked every time an action is challenged
    }

    struct TokenBalancePermission {
        ERC20 token;                    // ERC20 token to be used for custom permissions based on token balance
        uint256 balance;                // Amount of tokens used for custom permissions
    }

    /**
    * @dev Auth modifier restricting access only for address that can sign the Agreement
    * @param _signer Address being queried
    */
    modifier onlySigner(address _signer) {
        require(_canSign(_signer), ERROR_AUTH_FAILED);
        _;
    }

    /**
    * @dev Auth modifier restricting access only for address that can challenge actions
    */
    modifier onlyChallenger() {
        require(_canChallenge(msg.sender), ERROR_AUTH_FAILED);
        _;
    }

    string public title;                // Title identifying the Agreement instance
    ERC20 public collateralToken;       // ERC20 token to be used for collateral
    IArbitrator public arbitrator;      // Arbitrator instance that will resolve disputes

    Action[] private actions;
    Setting[] private settings;
    TokenBalancePermission private signTokenBalancePermission;
    TokenBalancePermission private challengeTokenBalancePermission;
    mapping (address => Stake) private stakeBalances;
    mapping (uint256 => Dispute) private disputes;

    /**
    * @notice Initialize Agreement app for `_title` with:
    * @notice - `@tokenAmount(_collateralToken, _collateralAmount)` collateral for action scheduling
    * @notice - `@tokenAmount(_collateralToken, _challengeCollateral)` collateral for action challenges
    * @notice - `@transformTime(_delayPeriod)` for the challenge period
    * @notice - `@transformTime(_settlementPeriod)` for the settlement period
    * @notice - `_arbitrator` as the arbitrator for action disputes
    * @notice - Sign permission: `_signPermissionBalance == 0 ? 'None' : @tokenAmount(_signPermissionToken, _signPermissionBalance)`
    * @notice - Challenge per: `_challengePermissionBalance == 0 ? 'None' : @tokenAmount(_challengePermissionToken, _challengePermissionBalance)`
    * @notice - Content `_content`
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _collateralAmount Amount of `collateralToken` that will be locked every time an action is created
    * @param _challengeCollateral Amount of `collateralToken` that will be locked every time an action is challenged
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executable
    * @param _settlementPeriod Duration in seconds during which a challenge can be accepted or rejected
    * @param _signPermissionToken ERC20 token to be used for custom signing permissions based on token balance
    * @param _signPermissionBalance Amount of `_signPermissionBalance` tokens for custom signing permissions
    * @param _challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengePermissionBalance Amount of `_challengePermissionBalance` tokens for custom challenge permissions
    */
    function initialize(
        string _title,
        bytes _content,
        ERC20 _collateralToken,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod,
        ERC20 _signPermissionToken,
        uint256 _signPermissionBalance,
        ERC20 _challengePermissionToken,
        uint256 _challengePermissionBalance
    )
        external
    {
        initialized();
        require(isContract(address(_arbitrator)), ERROR_ARBITRATOR_NOT_CONTRACT);
        require(isContract(address(_collateralToken)), ERROR_COLLATERAL_TOKEN_NOT_CONTRACT);

        title = _title;
        arbitrator = _arbitrator;
        collateralToken = _collateralToken;

        _newSetting(_content, _delayPeriod, _settlementPeriod, _collateralAmount, _challengeCollateral);
        _newTokenBalancePermission(_signPermissionToken, _signPermissionBalance, _challengePermissionToken, _challengePermissionBalance);
    }

    /**
    * @notice Stake `@tokenAmount(self.collateralToken(): address, _amount)` tokens for `_signer`
    * @param _amount Number of collateral tokens to be staked by the sender
    */
    function stake(uint256 _amount) external onlySigner(msg.sender) {
        _stakeBalance(msg.sender, msg.sender, _amount);
    }

    /**
    * @notice Stake `@tokenAmount(self.collateralToken(): address, _amount)` tokens from `msg.sender` for `_signer`
    * @param _signer Address staking the tokens for
    * @param _amount Number of collateral tokens to be staked for the signer
    */
    function stakeFor(address _signer, uint256 _amount) external onlySigner(_signer) {
        _stakeBalance(msg.sender, _signer, _amount);
    }

    /**
    * @dev Callback of `approveAndCall`, allows staking directly with a transaction to the token contract
    * @param _from Address making the transfer
    * @param _amount Amount of tokens to transfer
    * @param _token Address of the token
    */
    function receiveApproval(address _from, uint256 _amount, address _token, bytes /* _data */) external onlySigner(_from) {
        require(msg.sender == _token && _token == address(collateralToken), ERROR_SENDER_NOT_ALLOWED);
        _stakeBalance(_from, _from, _amount);
    }

    /**
    * @notice Unstake `@tokenAmount(self.collateralToken(): address, _amount)` tokens from `msg.sender`
    * @param _amount Number of collateral tokens to be unstaked
    */
    function unstake(uint256 _amount) external {
        require(_amount > 0, ERROR_INVALID_UNSTAKE_AMOUNT);
        _unstakeBalance(msg.sender, _amount);
    }

    /**
    * @notice Schedule a new action
    * @param _context Link to a human-readable text giving context for the given action
    * @param _script Action script to be executed
    */
    function schedule(bytes _context, bytes _script) external onlySigner(msg.sender) {
        _createAction(msg.sender, _context, _script);
    }

    /**
    * @notice Execute action #`_actionId`
    * @dev It only executes non-challenged actions after the challenge period or actions that were disputed but ruled in favor of the submitter
    * @param _actionId Identification number of the action to be executed
    */
    function execute(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canExecute(action), ERROR_CANNOT_EXECUTE_ACTION);

        if (action.state == ActionState.Scheduled) {
            _unlockBalance(action.submitter, setting.collateralAmount);
        }
        action.state = ActionState.Executed;
        runScript(action.script, new bytes(0), _getScriptExecutionBlacklist());
        emit ActionExecuted(_actionId);
    }

    /**
    * @notice Cancel action #`_actionId`
    * @dev It only cancels non-challenged actions or actions that were disputed but ruled in favor of the submitter
    * @param _actionId Identification number of the action to be cancelled
    */
    function cancel(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canCancel(action), ERROR_CANNOT_CANCEL_ACTION);

        address submitter = action.submitter;
        require(msg.sender == submitter, ERROR_SENDER_NOT_ALLOWED);

        if (action.state == ActionState.Scheduled) {
            _unlockBalance(submitter, setting.collateralAmount);
        }
        action.state = ActionState.Cancelled;
        emit ActionCancelled(_actionId);
    }

    /**
    * @notice Challenge an action #`_actionId` with a settlement offer of `@tokenAmount(self.collateralToken(): address, _settlementOffer)`
    * @param _actionId Identification number of the action being challenged
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _context Link to a human-readable text giving context for the challenge
    */
    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context) external onlyChallenger {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canChallengeAction(action), ERROR_CANNOT_CHALLENGE_ACTION);
        require(setting.collateralAmount >= _settlementOffer, ERROR_INVALID_SETTLEMENT_OFFER);

        action.state = ActionState.Challenged;
        _challengeBalance(action.submitter, setting.collateralAmount);
        _createChallenge(action, msg.sender, _settlementOffer, _context, setting);
        emit ActionChallenged(_actionId, msg.sender);
    }

    /**
    * @notice Settle challenged action #`_actionId` accepting the settlement offer
    * @param _actionId Identification number of the action to be settled
    */
    function settle(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        Challenge storage challenge = action.challenge;
        address submitter = action.submitter;
        address challenger = challenge.challenger;

        if (msg.sender == submitter) {
            require(_canSettle(action), ERROR_CANNOT_SETTLE_ACTION);
        } else {
            require(_canClaimSettlement(action), ERROR_CANNOT_SETTLE_ACTION);
        }

        uint256 settlementOffer = challenge.settlementOffer;
        uint256 collateralAmount = setting.collateralAmount;

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 unchallengedAmount = settlementOffer >= collateralAmount ? collateralAmount : (collateralAmount - settlementOffer);
        uint256 slashedAmount = collateralAmount - unchallengedAmount;

        challenge.state = ChallengeState.Settled;
        _unchallengeBalance(submitter, unchallengedAmount);
        _slashBalance(submitter, challenger, slashedAmount);
        _transferCollateralTokens(challenger, setting.challengeCollateral);
        _returnArbitratorFees(challenge);
        emit ActionSettled(_actionId, slashedAmount);
    }

    /**
    * @notice Dispute challenged action #`_actionId` raising it to the arbitrator
    * @dev It can only be disputed if the action was previously challenged
    * @param _actionId Identification number of the action to be disputed
    */
    function disputeChallenge(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canDispute(action), ERROR_CANNOT_DISPUTE_ACTION);
        require(msg.sender == action.submitter, ERROR_SENDER_NOT_ALLOWED);

        Challenge storage challenge = action.challenge;
        uint256 disputeId = _createDispute(action, setting);
        challenge.state = ChallengeState.Disputed;
        challenge.disputeId = disputeId;
        disputes[disputeId].actionId = _actionId;
        emit ActionDisputed(_actionId, arbitrator, disputeId);
    }

    /**
    * @notice Submit evidence for the action associated to dispute #`_disputeId`
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _evidence Data submitted for the evidence related to the dispute
    * @param _finished Whether or not the submitter has finished submitting evidence
    */
    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canRuleDispute(action), ERROR_CANNOT_SUBMIT_EVIDENCE);

        bool finished = _registerEvidence(action, dispute, msg.sender, _finished);
        _submitEvidence(_disputeId, msg.sender, _evidence, _finished);
        if (finished) {
            arbitrator.closeEvidencePeriod(_disputeId);
        }
    }

    /**
    * @notice Execute ruling for action #`_actionId`
    * @param _actionId Identification number of the action to be ruled
    */
    function executeRuling(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_ACTION);

        uint256 disputeId = action.challenge.disputeId;
        arbitrator.executeRuling(disputeId);
    }

    /**
    * @notice Rule action associated to dispute #`_disputeId` with ruling `_ruling`
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _ruling Ruling given by the arbitrator
    */
    function rule(uint256 _disputeId, uint256 _ruling) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_ACTION);

        Setting storage setting = _getSetting(action);
        address arbitratorAddress = address(arbitrator);
        require(msg.sender == arbitratorAddress, ERROR_SENDER_NOT_ALLOWED);

        dispute.ruling = _ruling;
        emit Ruled(IArbitrator(arbitratorAddress), _disputeId, _ruling);

        if (_ruling == DISPUTES_RULING_SUBMITTER) {
            _rejectChallenge(action, setting);
            emit ActionAccepted(dispute.actionId);
        } else if (_ruling == DISPUTES_RULING_CHALLENGER) {
            _acceptChallenge(action, setting);
            emit ActionRejected(dispute.actionId);
        } else {
            _voidChallenge(action, setting);
            emit ActionVoided(dispute.actionId);
        }
    }

    /**
    * @notice Change Agreement configuration parameters to
    * @notice - Content `_content`
    * @notice - `@tokenAmount(self.collateralToken(): address, _collateralAmount)` collateral for action scheduling
    * @notice - `@tokenAmount(self.collateralToken(): address, _challengeCollateral)` collateral for action challenges
    * @notice - `@transformTime(_delayPeriod)` for the challenge period
    * @notice - `@transformTime(_settlementPeriod)` for the settlement period
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executable
    * @param _settlementPeriod Duration in seconds during which a challenge can be accepted or rejected
    * @param _collateralAmount Amount of `collateralToken` that will be locked every time an action is created
    * @param _challengeCollateral Amount of `collateralToken` that will be locked every time an action is challenged
    */
    function changeSetting(
        bytes _content,
        uint64 _delayPeriod,
        uint64 _settlementPeriod,
        uint256 _collateralAmount,
        uint256 _challengeCollateral
    )
        external
        auth(CHANGE_AGREEMENT_ROLE)
    {
        _newSetting(_content, _delayPeriod, _settlementPeriod, _collateralAmount, _challengeCollateral);
    }

    /**
    * @notice Change Agreement custom token balance permission parameters to `@tokenAmount(_permissionToken, _permissionBalance)`
    * @param _signPermissionToken ERC20 token to be used for custom signing permissions based on token balance
    * @param _signPermissionBalance Amount of `_signPermissionBalance` tokens for custom signing permissions
    * @param _challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengePermissionBalance Amount of `_challengePermissionBalance` tokens for custom challenge permissions
    */
    function changeTokenBalancePermission(
        ERC20 _signPermissionToken,
        uint256 _signPermissionBalance,
        ERC20 _challengePermissionToken,
        uint256 _challengePermissionBalance
    )
        external
        auth(CHANGE_TOKEN_BALANCE_PERMISSION_ROLE)
    {
        _newTokenBalancePermission(_signPermissionToken, _signPermissionBalance, _challengePermissionToken, _challengePermissionBalance);
    }

    /**
    * @notice Tells whether the Agreement app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    // Getter fns

    /**
    * @dev Tell the information related to an address stake
    * @param _signer Address being queried
    * @return available Amount of staked tokens that are available to schedule actions
    * @return locked Amount of staked tokens that are locked due to a scheduled action
    * @return challenged Amount of staked tokens that are blocked due to an ongoing challenge
    */
    function getBalance(address _signer) external view returns (uint256 available, uint256 locked, uint256 challenged) {
        Stake storage balance = stakeBalances[_signer];
        available = balance.available;
        locked = balance.locked;
        challenged = balance.challenged;
    }

    /**
    * @dev Tell the information related to an action
    * @param _actionId Identification number of the action being queried
    * @return script Action script to be executed
    * @return context Link to a human-readable text giving context for the given action
    * @return state Current state of the action
    * @return challengeEndDate End date of the challenge window where a challenger can challenge the action
    * @return submitter Address that has scheduled the action
    * @return settingId Identification number of the Agreement setting when the action was scheduled
    */
    function getAction(uint256 _actionId) external view
        returns (
            bytes script,
            bytes context,
            ActionState state,
            uint64 challengeEndDate,
            address submitter,
            uint256 settingId
        )
    {
        Action storage action = _getAction(_actionId);
        script = action.script;
        context = action.context;
        state = action.state;
        challengeEndDate = action.challengeEndDate;
        submitter = action.submitter;
        settingId = action.settingId;
    }

    /**
    * @dev Tell the information related to an action challenge
    * @param _actionId Identification number of the action being queried
    * @return context Link to a human-readable text giving context for the challenge
    * @return settlementEndDate End date of the settlement window where the action submitter can answer the challenge
    * @return challenger Address that challenged the action
    * @return settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @return arbitratorFeeAmount Amount of arbitration fees paid by the challenger in advance in case the challenge is raised to the arbitrator
    * @return arbitratorFeeToken ERC20 token used for the arbitration fees paid by the challenger in advance
    * @return state Current state of the action challenge
    * @return disputeId Identification number of the dispute for the arbitrator
    */
    function getChallenge(uint256 _actionId) external view
        returns (
            bytes context,
            uint64 settlementEndDate,
            address challenger,
            uint256 settlementOffer,
            uint256 arbitratorFeeAmount,
            ERC20 arbitratorFeeToken,
            ChallengeState state,
            uint256 disputeId
        )
    {
        Action storage action = _getAction(_actionId);
        Challenge storage challenge = action.challenge;

        context = challenge.context;
        settlementEndDate = challenge.settlementEndDate;
        challenger = challenge.challenger;
        settlementOffer = challenge.settlementOffer;
        arbitratorFeeAmount = challenge.arbitratorFeeAmount;
        arbitratorFeeToken = challenge.arbitratorFeeToken;
        state = challenge.state;
        disputeId = challenge.disputeId;
    }

    /**
    * @dev Tell the information related to an action dispute
    * @param _actionId Identification number of the action being queried
    * @return ruling Ruling given for the action dispute
    * @return submitterFinishedEvidence Whether the action submitter has finished submitting evidence for the action dispute
    * @return challengerFinishedEvidence Whether the action challenger has finished submitting evidence for the action dispute
    */
    function getDispute(uint256 _actionId) external view
        returns (
            uint256 ruling,
            bool submitterFinishedEvidence,
            bool challengerFinishedEvidence
        )
    {
        Action storage action = _getAction(_actionId);
        Challenge storage challenge = action.challenge;
        Dispute storage dispute = disputes[challenge.disputeId];

        ruling = dispute.ruling;
        submitterFinishedEvidence = dispute.submitterFinishedEvidence;
        challengerFinishedEvidence = dispute.challengerFinishedEvidence;
    }

    /**
    * @dev Tell the current setting identification number
    * @return Identification number of the current Agreement setting
    */
    function getCurrentSettingId() external view returns (uint256) {
        return _getCurrentSettingId();
    }

    /**
    * @dev Tell the information related to a setting
    * @param _settingId Identification number of the setting being queried
    * @return content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @return delayPeriod Duration in seconds during which an action is delayed before being executable
    * @return settlementPeriod Duration in seconds during which a challenge can be accepted or rejected
    * @return collateralAmount Amount of `collateralToken` that will be locked every time an action is created
    * @return challengeCollateral Amount of `collateralToken` that will be locked every time an action is challenged
    */
    function getSetting(uint256 _settingId) external view
        returns (
            bytes content,
            uint64 delayPeriod,
            uint64 settlementPeriod,
            uint256 collateralAmount,
            uint256 challengeCollateral
        )
    {
        Setting storage setting = _getSetting(_settingId);
        return _getSettingData(setting);
    }

    /**
    * @dev Tell the information related to the custom token balance signing permission
    * @return signPermissionToken ERC20 token to be used for custom signing permissions based on token balance
    * @return signPermissionBalance Amount of `signPermissionToken` tokens used for custom signing permissions
    * @return challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @return challengePermissionBalance Amount of `challengePermissionToken` tokens used for custom challenge permissions
    */
    function getTokenBalancePermission() external view
        returns (
            ERC20 signPermissionToken,
            uint256 signPermissionBalance,
            ERC20 challengePermissionToken,
            uint256 challengePermissionBalance
        )
    {
        TokenBalancePermission storage signPermission = signTokenBalancePermission;
        signPermissionToken = signPermission.token;
        signPermissionBalance = signPermission.balance;

        TokenBalancePermission storage challengePermission = challengeTokenBalancePermission;
        challengePermissionToken = challengePermission.token;
        challengePermissionBalance = challengePermission.balance;
    }

    /**
    * @dev Tell the missing part of arbitration fees in order to dispute an action raising it to the arbitrator
    * @param _actionId Identification number of the address being queried
    * @return feeToken ERC20 token to be used for the arbitration fees
    * @return missingFees Amount of arbitration fees missing to be able to dispute the action
    * @return totalFees Total amount of arbitration fees to be paid to be able to dispute the action
    */
    function getMissingArbitratorFees(uint256 _actionId) external view returns (ERC20 feeToken, uint256 missingFees, uint256 totalFees) {
        Action storage action = _getAction(_actionId);
        Challenge storage challenge = action.challenge;
        ERC20 challengerFeeToken = challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = challenge.arbitratorFeeAmount;

        (, feeToken, missingFees, totalFees) = _getMissingArbitratorFees(challengerFeeToken, challengerFeeAmount);
    }

    /**
    * @dev Tell whether an address can sign the agreement or not
    * @param _signer Address being queried
    * @return True if the given address can sign the agreement, false otherwise
    */
    function canSign(address _signer) external view returns (bool) {
        return _canSign(_signer);
    }

    /**
    * @dev Tell whether an address can challenge actions or not
    * @param _challenger Address being queried
    * @return True if the given address can challenge actions, false otherwise
    */
    function canChallenge(address _challenger) external view returns (bool) {
        return _canChallenge(_challenger);
    }

    /**
    * @dev Tell whether an action can be cancelled or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be cancelled, false otherwise
    */
    function canCancel(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canCancel(action);
    }

    /**
    * @dev Tell whether an action can be challenged or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function canChallengeAction(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canChallengeAction(action);
    }

    /**
    * @dev Tell whether an action can be settled or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be settled, false otherwise
    */
    function canSettle(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canSettle(action);
    }

    /**
    * @dev Tell whether an action can be disputed or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be disputed, false otherwise
    */
    function canDispute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canDispute(action);
    }

    /**
    * @dev Tell whether an action settlement can be claimed or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action settlement can be claimed, false otherwise
    */
    function canClaimSettlement(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canClaimSettlement(action);
    }

    /**
    * @dev Tell whether an action dispute can be ruled or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action dispute can be ruled, false otherwise
    */
    function canRuleDispute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canRuleDispute(action);
    }

    /**
    * @dev Tell whether an action can be executed or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be executed, false otherwise
    */
    function canExecute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canExecute(action);
    }

    /**
    * @notice Schedule a new action
    * @dev IForwarder interface conformance
    * @param _script Action script to be executed
    */
    function forward(bytes _script) public {
        require(canForward(msg.sender, _script), ERROR_CAN_NOT_FORWARD);
        _createAction(msg.sender, new bytes(0), _script);
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can sign the agreement, false otherwise
    */
    function canForward(address _sender, bytes /* _script */) public view returns (bool) {
        return _canSchedule(_sender);
    }

    // Internal fns

    /**
    * @dev Create a new scheduled action
    * @param _submitter Address scheduling the action
    * @param _context Link to a human-readable text giving context for the given action
    * @param _script Action script to be executed
    */
    function _createAction(address _submitter, bytes _context, bytes _script) internal {
        (uint256 settingId, Setting storage currentSetting) = _getCurrentSettingWithId();
        _lockBalance(msg.sender, currentSetting.collateralAmount);

        uint256 id = actions.length++;
        Action storage action = actions[id];
        action.submitter = _submitter;
        action.context = _context;
        action.script = _script;
        action.settingId = settingId;
        action.challengeEndDate = getTimestamp64().add(currentSetting.delayPeriod);
        emit ActionScheduled(id, _submitter);
    }

    /**
    * @dev Challenge an action
    * @param _action Action instance to be challenged
    * @param _challenger Address challenging the action
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _context Link to a human-readable text giving context for the challenge
    * @param _setting Setting instance to be used for the challenge, i.e. Agreement settings when the action was scheduled
    */
    function _createChallenge(Action storage _action, address _challenger, uint256 _settlementOffer, bytes _context, Setting storage _setting)
        internal
    {
        // Store challenge
        Challenge storage challenge = _action.challenge;
        challenge.challenger = _challenger;
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.settlementEndDate = getTimestamp64().add(_setting.settlementPeriod);

        // Transfer challenge collateral
        uint256 challengeCollateral = _setting.challengeCollateral;
        _transferCollateralTokensFrom(_challenger, challengeCollateral);

        // Transfer half of the Arbitrator fees
        (, ERC20 feeToken, uint256 feeAmount) = arbitrator.getDisputeFees();
        uint256 arbitratorFees = feeAmount.div(2);
        challenge.arbitratorFeeToken = feeToken;
        challenge.arbitratorFeeAmount = arbitratorFees;
        require(feeToken.safeTransferFrom(_challenger, address(this), arbitratorFees), ERROR_ARBITRATOR_FEE_TRANSFER_FAILED);
    }

    /**
    * @dev Dispute an action
    * @param _action Action instance to be disputed
    * @param _setting Setting instance to be used for the dispute, i.e. Agreement settings when the action was scheduled
    */
    function _createDispute(Action storage _action, Setting storage _setting) internal returns (uint256) {
        // Compute missing fees for dispute
        Challenge storage challenge = _action.challenge;
        ERC20 challengerFeeToken = challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = challenge.arbitratorFeeAmount;
        (address recipient, ERC20 feeToken, uint256 missingFees, uint256 totalFees) = _getMissingArbitratorFees(
            challengerFeeToken,
            challengerFeeAmount
        );

        // Create dispute
        address submitter = _action.submitter;
        require(feeToken.safeTransferFrom(submitter, address(this), missingFees), ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED);
        // We are first setting the allowance to zero in case there are remaining fees in the arbitrator
        _approveArbitratorFeeTokens(feeToken, recipient, 0);
        _approveArbitratorFeeTokens(feeToken, recipient, totalFees);
        uint256 disputeId = arbitrator.createDispute(DISPUTES_POSSIBLE_OUTCOMES, _setting.content);

        // Update action and submit evidences
        address challenger = challenge.challenger;
        _submitEvidence(disputeId, submitter, _action.context, false);
        _submitEvidence(disputeId, challenger, challenge.context, false);

        // Return arbitrator fees to challenger if necessary
        if (challenge.arbitratorFeeToken != feeToken) {
            require(challengerFeeToken.safeTransfer(challenger, challengerFeeAmount), ERROR_ARBITRATOR_FEE_RETURN_FAILED);
        }
        return disputeId;
    }

    /**
    * @dev Register evidence for an action, it will try to close the evidence submission period if both parties agree
    * @param _action Action instance to submit evidence for
    * @param _dispute Dispute instance associated to the given action
    * @param _submitter Address of submitting the evidence
    * @param _finished Whether the evidence submitter has finished submitting evidence or not
    */
    function _registerEvidence(Action storage _action, Dispute storage _dispute, address _submitter, bool _finished) internal returns (bool) {
        Challenge storage challenge = _action.challenge;
        bool submitterFinishedEvidence = _dispute.submitterFinishedEvidence;
        bool challengerFinishedEvidence = _dispute.challengerFinishedEvidence;

        if (_submitter == _action.submitter) {
            require(!submitterFinishedEvidence, ERROR_SUBMITTER_FINISHED_EVIDENCE);
            if (_finished) {
                submitterFinishedEvidence = _finished;
                _dispute.submitterFinishedEvidence = _finished;
            }
        } else if (_submitter == challenge.challenger) {
            require(!challengerFinishedEvidence, ERROR_SUBMITTER_FINISHED_EVIDENCE);
            if (_finished) {
                submitterFinishedEvidence = _finished;
                _dispute.challengerFinishedEvidence = _finished;
            }
        } else {
            revert(ERROR_SENDER_NOT_ALLOWED);
        }

        return submitterFinishedEvidence && challengerFinishedEvidence;
    }

    /**
    * @dev Log an evidence for an action
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _submitter Address of submitting the evidence
    * @param _evidence Evidence to be logged
    * @param _finished Whether the evidence submitter has finished submitting evidence or not
    */
    function _submitEvidence(uint256 _disputeId, address _submitter, bytes _evidence, bool _finished) internal {
        if (_evidence.length > 0) {
            emit EvidenceSubmitted(_disputeId, _submitter, _evidence, _finished);
        }
    }

    /**
    * @dev Accept a challenge proposed against an action
    * @param _action Action instance to be rejected
    * @param _setting Setting instance to be used, i.e. Agreement settings when the action was scheduled
    */
    function _acceptChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Accepted;

        _slashBalance(_action.submitter, challenge.challenger, _setting.collateralAmount);
        _transferCollateralTokens(challenge.challenger, _setting.challengeCollateral);
    }

    /**
    * @dev Reject a challenge proposed against an action
    * @param _action Action instance to be accepted
    * @param _setting Setting instance to be used, i.e. Agreement settings when the action was scheduled
    */
    function _rejectChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferCollateralTokens(_action.submitter, _setting.challengeCollateral);
    }

    /**
    * @dev Void a challenge proposed against an action
    * @param _action Action instance to be voided
    * @param _setting Setting instance to be used, i.e. Agreement settings when the action was scheduled
    */
    function _voidChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferCollateralTokens(challenge.challenger, _setting.challengeCollateral);
    }

    /**
    * @dev Stake tokens for a signer, i.e. sign the agreement
    * @param _from Address paying for the staked tokens
    * @param _signer Address of the signer staking the tokens for
    * @param _amount Number of collateral tokens to be staked
    */
    function _stakeBalance(address _from, address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        Setting storage currentSetting = _getCurrentSetting();
        uint256 newAvailableBalance = balance.available.add(_amount);
        require(newAvailableBalance >= currentSetting.collateralAmount, ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL);

        balance.available = newAvailableBalance;
        _transferCollateralTokensFrom(_from, _amount);
        emit BalanceStaked(_signer, _amount);
    }

    /**
    * @dev Move a number of available tokens to locked for a signer
    * @param _signer Address of the signer to lock tokens for
    * @param _amount Number of collateral tokens to be locked
    */
    function _lockBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        require(balance.available >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = balance.available.sub(_amount);
        balance.locked = balance.locked.add(_amount);
        emit BalanceLocked(_signer, _amount);
    }

    /**
    * @dev Move a number of locked tokens back to available for a signer
    * @param _signer Address of the signer to unlock tokens for
    * @param _amount Number of collateral tokens to be unlocked
    */
    function _unlockBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        balance.locked = balance.locked.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit BalanceUnlocked(_signer, _amount);
    }

    /**
    * @dev Move a number of locked tokens to challenged for a signer
    * @param _signer Address of the signer to challenge tokens for
    * @param _amount Number of collateral tokens to be challenged
    */
    function _challengeBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        balance.locked = balance.locked.sub(_amount);
        balance.challenged = balance.challenged.add(_amount);
        emit BalanceChallenged(_signer, _amount);
    }

    /**
    * @dev Move a number of challenged tokens back to available for a signer
    * @param _signer Address of the signer to unchallenge tokens for
    * @param _amount Number of collateral tokens to be unchallenged
    */
    function _unchallengeBalance(address _signer, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Stake storage balance = stakeBalances[_signer];
        balance.challenged = balance.challenged.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit BalanceUnchallenged(_signer, _amount);
    }

    /**
    * @dev Slash a number of staked tokens for a signer
    * @param _signer Address of the signer to be slashed
    * @param _challenger Address receiving the slashed tokens
    * @param _amount Number of collateral tokens to be slashed
    */
    function _slashBalance(address _signer, address _challenger, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Stake storage balance = stakeBalances[_signer];
        balance.challenged = balance.challenged.sub(_amount);
        _transferCollateralTokens(_challenger, _amount);
        emit BalanceSlashed(_signer, _amount);
    }

    /**
    * @dev Unstake tokens for a signer
    * @param _signer Address of the signer unstaking the tokens
    * @param _amount Number of collateral tokens to be unstaked
    */
    function _unstakeBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        uint256 availableBalance = balance.available;
        require(availableBalance >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        Setting storage currentSetting = _getCurrentSetting();
        uint256 newAvailableBalance = availableBalance.sub(_amount);
        require(newAvailableBalance == 0 || newAvailableBalance >= currentSetting.collateralAmount, ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL);

        balance.available = newAvailableBalance;
        _transferCollateralTokens(_signer, _amount);
        emit BalanceUnstaked(_signer, _amount);
    }

    /**
    * @dev Transfer collateral tokens to an address
    * @param _to Address receiving the tokens being transferred
    * @param _amount Number of collateral tokens to be transferred
    */
    function _transferCollateralTokens(address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(collateralToken.safeTransfer(_to, _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Transfer collateral tokens from an address to the Agreement app
    * @param _from Address transferring the tokens from
    * @param _amount Number of collateral tokens to be transferred
    */
    function _transferCollateralTokensFrom(address _from, uint256 _amount) internal {
        if (_amount > 0) {
            require(collateralToken.safeTransferFrom(_from, address(this), _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Approve arbitration fee tokens to an address
    * @param _arbitratorFeeToken ERC20 token used for the arbitration fees
    * @param _to Address to be approved to transfer the arbitration fees
    * @param _amount Number of `_arbitrationFeeToken` tokens to be approved
    */
    function _approveArbitratorFeeTokens(ERC20 _arbitratorFeeToken, address _to, uint256 _amount) internal {
        require(_arbitratorFeeToken.safeApprove(_to, _amount), ERROR_ARBITRATOR_FEE_APPROVAL_FAILED);
    }

    /**
    * @dev Return arbitration fee tokens paid in advance for a challenge
    * @param _challenge Challenge instance to return its arbitration fees paid in advance
    */
    function _returnArbitratorFees(Challenge storage _challenge) internal {
        uint256 amount = _challenge.arbitratorFeeAmount;
        if (amount > 0) {
            require(_challenge.arbitratorFeeToken.safeTransfer(_challenge.challenger, amount), ERROR_ARBITRATOR_FEE_RETURN_FAILED);
        }
    }

    /**
    * @dev Change Agreement configuration parameters
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executable
    * @param _settlementPeriod Duration in seconds during which a challenge can be accepted or rejected
    * @param _collateralAmount Amount of `collateralToken` that will be locked every time an action is created
    * @param _challengeCollateral Amount of `collateralToken` that will be locked every time an action is challenged
    */
    function _newSetting(bytes _content, uint64 _delayPeriod, uint64 _settlementPeriod, uint256 _collateralAmount, uint256 _challengeCollateral)
        internal
    {
        uint256 id = settings.length++;
        settings[id] = Setting({
            content: _content,
            delayPeriod: _delayPeriod,
            settlementPeriod: _settlementPeriod,
            collateralAmount: _collateralAmount,
            challengeCollateral: _challengeCollateral
        });

        emit SettingChanged(id);
    }

    /**
    * @dev Change Agreement custom token balance permission parameters
    * @param _signPermissionToken ERC20 token to be used for custom signing permissions based on token balance
    * @param _signPermissionBalance Amount of `_signPermissionBalance` tokens for custom signing permissions
    * @param _challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengePermissionBalance Amount of `_challengePermissionBalance` tokens for custom challenge permissions
    */
    function _newTokenBalancePermission(
        ERC20 _signPermissionToken,
        uint256 _signPermissionBalance,
        ERC20 _challengePermissionToken,
        uint256 _challengePermissionBalance
    )
        internal
    {
        signTokenBalancePermission.token = _signPermissionToken;
        signTokenBalancePermission.balance = _signPermissionBalance;
        challengeTokenBalancePermission.token = _challengePermissionToken;
        challengeTokenBalancePermission.balance = _challengePermissionBalance;
        emit TokenBalancePermissionChanged(_signPermissionToken, _signPermissionBalance, _challengePermissionToken, _challengePermissionBalance);
    }

    /**
    * @dev Tell whether an address can sign the agreement or not
    * @param _signer Address being queried
    * @return True if the given address can sign the agreement, false otherwise
    */
    function _canSign(address _signer) internal view returns (bool) {
        TokenBalancePermission storage permission = signTokenBalancePermission;
        ERC20 permissionToken = permission.token;

        return isContract(address(permissionToken))
            ? permissionToken.balanceOf(_signer) >= permission.balance
            : canPerform(_signer, SIGN_ROLE, arr(_signer));
    }

    /**
    * @dev Tell whether an address can challenge actions or not
    * @param _challenger Address being queried
    * @return True if the given address can challenge actions, false otherwise
    */
    function _canChallenge(address _challenger) internal view returns (bool) {
        TokenBalancePermission storage permission = challengeTokenBalancePermission;
        ERC20 permissionToken = permission.token;

        return isContract(address(permissionToken))
            ? permissionToken.balanceOf(_challenger) >= permission.balance
            : canPerform(_challenger, CHALLENGE_ROLE, arr(_challenger));
    }

    /**
    * @dev Tell whether an address can schedule an action or not
    * @param _signer Address being queried
    * @return True if the given address can schedule actions, false otherwise
    */
    function _canSchedule(address _signer) internal view returns (bool) {
        Stake storage balance = stakeBalances[_signer];
        Setting storage currentSetting = _getCurrentSetting();
        return balance.available >= currentSetting.collateralAmount;
    }

    /**
    * @dev Tell whether an action can be cancelled or not
    * @param _action Action instance to be queried
    * @return True if the action can be cancelled, false otherwise
    */
    function _canCancel(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        if (state == ActionState.Scheduled) {
            return true;
        }

        return state == ActionState.Challenged && _action.challenge.state == ChallengeState.Rejected;
    }

    /**
    * @dev Tell whether an action can be challenged or not
    * @param _action Action instance to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function _canChallengeAction(Action storage _action) internal view returns (bool) {
        if (_action.state != ActionState.Scheduled) {
            return false;
        }

        return _action.challengeEndDate >= getTimestamp64();
    }

    /**
    * @dev Tell whether an action can be settled or not
    * @param _action Action instance to be queried
    * @return True if the action can be settled, false otherwise
    */
    function _canSettle(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Challenged && _action.challenge.state == ChallengeState.Waiting;
    }

    /**
    * @dev Tell whether an action can be disputed or not
    * @param _action Action instance to be queried
    * @return True if the action can be disputed, false otherwise
    */
    function _canDispute(Action storage _action) internal view returns (bool) {
        if (!_canSettle(_action)) {
            return false;
        }

        return _action.challenge.settlementEndDate >= getTimestamp64();
    }

    /**
    * @dev Tell whether an action settlement can be claimed or not
    * @param _action Action instance to be queried
    * @return True if the action settlement can be claimed, false otherwise
    */
    function _canClaimSettlement(Action storage _action) internal view returns (bool) {
        if (!_canSettle(_action)) {
            return false;
        }

        return getTimestamp64() > _action.challenge.settlementEndDate;
    }

    /**
    * @dev Tell whether an action dispute can be ruled or not
    * @param _action Action instance to be queried
    * @return True if the action dispute can be ruled, false otherwise
    */
    function _canRuleDispute(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Challenged && _action.challenge.state == ChallengeState.Disputed;
    }

    /**
    * @dev Tell whether an action can be executed or not
    * @param _action Action instance to be queried
    * @return True if the action can be executed, false otherwise
    */
    function _canExecute(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        if (state == ActionState.Scheduled) {
            return getTimestamp64() > _action.challengeEndDate;
        }

        return state == ActionState.Challenged && _action.challenge.state == ChallengeState.Rejected;
    }

    /**
    * @dev Tell whether a certain action was disputed or not
    * @param _action Action instance being queried
    * @return True if the action was disputed, false otherwise
    */
    function _wasDisputed(Action storage _action) internal view returns (bool) {
        Challenge storage challenge = _action.challenge;
        ChallengeState state = challenge.state;
        return state != ChallengeState.Waiting && state != ChallengeState.Settled;
    }

    /**
    * @dev Fetch an action instance by identification number
    * @param _actionId Identification number of the action being queried
    * @return Action instance associated to the given identification number
    */
    function _getAction(uint256 _actionId) internal view returns (Action storage) {
        require(_actionId < actions.length, ERROR_ACTION_DOES_NOT_EXIST);
        return actions[_actionId];
    }

    /**
    * @dev Fetch an action instance along with its associated setting by an action identification number
    * @param _actionId Identification number of the action being queried
    * @return Action instance associated to the given identification number
    * @return Setting instance associated to the resulting action instance
    */
    function _getActionAndSetting(uint256 _actionId) internal view returns (Action storage, Setting storage) {
        Action storage action = _getAction(_actionId);
        Setting storage setting = _getSetting(action);
        return (action, setting);
    }

    /**
    * @dev Fetch an action instance along with its associated dispute by a dispute identification number
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @return Action instance associated to the resulting dispute instance
    * @return Dispute instance associated to the given identification number
    */
    function _getActionAndDispute(uint256 _disputeId) internal view returns (Action storage, Dispute storage) {
        Dispute storage dispute = disputes[_disputeId];
        Action storage action = _getAction(dispute.actionId);
        require(_wasDisputed(action), ERROR_DISPUTE_DOES_NOT_EXIST);
        return (action, dispute);
    }

    /**
    * @dev Fetch a setting instance associated to an action
    * @param _action Action instance querying the setting associated to
    * @return Setting instance associated to the given action instance
    */
    function _getSetting(Action storage _action) internal view returns (Setting storage) {
        return _getSetting(_action.settingId);
    }

    /**
    * @dev Tell the current setting identification number
    * @return Identification number of the current Agreement setting
    */
    function _getCurrentSettingId() internal view returns (uint256) {
        return settings.length - 1;
    }

    /**
    * @dev Fetch the current setting instance
    * @return Current setting instance
    */
    function _getCurrentSetting() internal view returns (Setting storage) {
        return _getSetting(_getCurrentSettingId());
    }

    /**
    * @dev Fetch the current setting instance along with its identification number
    * @return Current setting instance
    * @return Identification number of the current setting instance
    */
    function _getCurrentSettingWithId() internal view returns (uint256, Setting storage) {
        uint256 id = _getCurrentSettingId();
        return (id, _getSetting(id));
    }

    /**
    * @dev Fetch a setting instance by identification number
    * @param _settingId Identification number of the setting being queried
    * @return Setting instance associated to the given identification number
    */
    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        return settings[_settingId];
    }

    /**
    * @dev Tell the information related to a setting
    * @param _setting Setting instance being queried
    * @return content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @return delayPeriod Duration in seconds during which an action is delayed before being executable
    * @return settlementPeriod Duration in seconds during which a challenge can be accepted or rejected
    * @return collateralAmount Amount of `collateralToken` that will be locked every time an action is created
    * @return challengeCollateral Amount of `collateralToken` that will be locked every time an action is challenged
    */
    function _getSettingData(Setting storage _setting) internal view
        returns (
            bytes content,
            uint64 delayPeriod,
            uint64 settlementPeriod,
            uint256 collateralAmount,
            uint256 challengeCollateral
        )
    {
        content = _setting.content;
        collateralAmount = _setting.collateralAmount;
        delayPeriod = _setting.delayPeriod;
        settlementPeriod = _setting.settlementPeriod;
        challengeCollateral = _setting.challengeCollateral;
    }

    /**
    * @dev Tell the missing part of arbitration fees in order to dispute an action raising it to the arbitrator
    * @return _challengerFeeToken ERC20 token used for the arbitration fees paid by the challenger in advance
    * @return _challengerFeeAmount Amount of arbitration fees paid by the challenger in advance in case the challenge is raised to the arbitrator
    * @return Address where the arbitration fees must be transferred to
    * @return ERC20 token to be used for the arbitration fees
    * @return Amount of arbitration fees missing to be able to dispute the action
    * @return Total amount of arbitration fees to be paid to be able to dispute the action
    */
    function _getMissingArbitratorFees(ERC20 _challengerFeeToken, uint256 _challengerFeeAmount) internal view
        returns (address, ERC20, uint256, uint256)
    {
        (address recipient, ERC20 feeToken, uint256 disputeFees) = arbitrator.getDisputeFees();

        uint256 missingFees;
        if (_challengerFeeToken == feeToken) {
            missingFees = _challengerFeeAmount >= disputeFees ? 0 : (disputeFees - _challengerFeeAmount);
        } else {
            missingFees = disputeFees;
        }

        return (recipient, feeToken, missingFees, disputeFees);
    }

    /**
    * @dev Tell the list of addresses to be blacklisted when executing EVM scripts
    * @return List of addresses to be blacklisted when executing EVM scripts
    */
    function _getScriptExecutionBlacklist() internal view returns (address[] memory) {
        // The collateral token, the arbitrator token and the arbitrator itself are blacklisted
        // to make sure tokens or disputes cannot be affected through evm scripts

        address arbitratorAddress = address(arbitrator);
        (, ERC20 currentArbitratorToken,) = IArbitrator(arbitratorAddress).getDisputeFees();

        address[] memory blacklist = new address[](3);
        blacklist[0] = arbitratorAddress;
        blacklist[1] = address(collateralToken);
        blacklist[2] = address(currentArbitratorToken);
        return blacklist;
    }
}
