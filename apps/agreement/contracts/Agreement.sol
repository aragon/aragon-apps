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
    event ActionDisputed(uint256 indexed actionId, IArbitrator indexed arbtirator, uint256 disputeId);
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
    event TokenBalancePermissionChanged(ERC20 token, uint256 balance);

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
        bytes script;
        bytes context;
        ActionState state;
        uint64 challengeEndDate;
        address submitter;
        uint256 settingId;
        Challenge challenge;
    }

    struct Challenge {
        bytes context;
        uint64 settlementEndDate;
        address challenger;
        uint256 settlementOffer;
        uint256 arbitratorFeeAmount;
        ERC20 arbitratorFeeToken;
        ChallengeState state;
        uint256 disputeId;
    }

    struct Dispute {
        uint256 ruling;
        uint256 actionId;
        bool submitterFinishedEvidence;
        bool challengerFinishedEvidence;
    }

    struct Stake {
        uint256 available;
        uint256 locked;
        uint256 challenged;
    }

    struct Setting {
        bytes content;
        uint64 delayPeriod;
        uint64 settlementPeriod;
        uint256 collateralAmount;
        uint256 challengeCollateral;
    }

    struct TokenBalancePermission {
        ERC20 token;
        uint256 balance;
    }

    modifier onlySigner(address _signer) {
        require(_canSign(_signer), ERROR_AUTH_FAILED);
        _;
    }

    string public title;
    ERC20 public collateralToken;
    IArbitrator public arbitrator;

    Action[] private actions;
    Setting[] private settings;
    TokenBalancePermission private tokenBalancePermission;
    mapping (address => Stake) private stakeBalances;
    mapping (uint256 => Dispute) private disputes;

    function initialize(
        string _title,
        bytes _content,
        ERC20 _collateralToken,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod,
        ERC20 _permissionToken,
        uint256 _permissionBalance
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
        _newTokenBalancePermission(_permissionToken, _permissionBalance);
    }

    function stake(uint256 _amount) external onlySigner(msg.sender) {
        _stakeBalance(msg.sender, msg.sender, _amount);
    }

    function stakeFor(address _signer, uint256 _amount) external onlySigner(_signer) {
        _stakeBalance(msg.sender, _signer, _amount);
    }

    function receiveApproval(address _from, uint256 _amount, address _token, bytes /* _data */) external onlySigner(_from) {
        require(msg.sender == _token && _token == address(collateralToken), ERROR_SENDER_NOT_ALLOWED);
        _stakeBalance(_from, _from, _amount);
    }

    function unstake(uint256 _amount) external {
        require(_amount > 0, ERROR_INVALID_UNSTAKE_AMOUNT);
        _unstakeBalance(msg.sender, _amount);
    }

    function schedule(bytes _context, bytes _script) external {
        _createAction(msg.sender, _context, _script);
    }

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

    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context) external authP(CHALLENGE_ROLE, arr(_actionId)) {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canChallenge(action), ERROR_CANNOT_CHALLENGE_ACTION);
        require(setting.collateralAmount >= _settlementOffer, ERROR_INVALID_SETTLEMENT_OFFER);

        action.state = ActionState.Challenged;
        _challengeBalance(action.submitter, setting.collateralAmount);
        _createChallenge(action, msg.sender, _settlementOffer, _context, setting);
        emit ActionChallenged(_actionId, msg.sender);
    }

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
        _returnArbitratorFees(challenge);
        emit ActionSettled(_actionId, slashedAmount);
    }

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

    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canRuleDispute(action), ERROR_CANNOT_SUBMIT_EVIDENCE);

        bool finished = _registerEvidence(action, dispute, msg.sender, _finished);
        _submitEvidence(_disputeId, msg.sender, _evidence, _finished);
        if (finished) {
            arbitrator.closeEvidencePeriod(_disputeId);
        }
    }

    function executeRuling(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_ACTION);

        uint256 disputeId = action.challenge.disputeId;
        arbitrator.executeRuling(disputeId);
    }

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

    function changeTokenBalancePermission(ERC20 _permissionToken, uint256 _permissionBalance)
        external
        auth(CHANGE_TOKEN_BALANCE_PERMISSION_ROLE)
    {
        _newTokenBalancePermission(_permissionToken, _permissionBalance);
    }

    function isForwarder() external pure returns (bool) {
        return true;
    }

    function getBalance(address _signer) external view returns (uint256 available, uint256 locked, uint256 challenged) {
        Stake storage balance = stakeBalances[_signer];
        available = balance.available;
        locked = balance.locked;
        challenged = balance.challenged;
    }

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

    function getCurrentSettingId() external view returns (uint256) {
        return _getCurrentSettingId();
    }

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

    function getTokenBalancePermission() external view returns (ERC20, uint256) {
        TokenBalancePermission storage permission = tokenBalancePermission;
        return (permission.token, permission.balance);
    }

    function getMissingArbitratorFees(uint256 _actionId) external view returns (ERC20, uint256, uint256) {
        Action storage action = _getAction(_actionId);
        Challenge storage challenge = action.challenge;
        ERC20 challengerFeeToken = challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = challenge.arbitratorFeeAmount;

        (,ERC20 feeToken, uint256 missingFees, uint256 totalFees) = _getMissingArbitratorFees(challengerFeeToken, challengerFeeAmount);
        return (feeToken, missingFees, totalFees);
    }

    function canSign(address _signer) external view returns (bool) {
        return _canSign(_signer);
    }

    function canCancel(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canCancel(action);
    }

    function canChallenge(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canChallenge(action);
    }

    function canSettle(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canSettle(action);
    }

    function canDispute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canDispute(action);
    }

    function canClaimSettlement(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canClaimSettlement(action);
    }

    function canRuleDispute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canRuleDispute(action);
    }

    function canExecute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canExecute(action);
    }

    function forward(bytes _script) public {
        require(canForward(msg.sender, _script), ERROR_CAN_NOT_FORWARD);
        _createAction(msg.sender, new bytes(0), _script);
    }

    function canForward(address _sender, bytes /* _script */) public view returns (bool) {
        return _canSchedule(_sender);
    }

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
        _transferCollateralTokensFrom(_challenger, address(this), challengeCollateral);

        // Transfer half of the Arbitrator fees
        (, ERC20 feeToken, uint256 feeAmount) = arbitrator.getDisputeFees();
        uint256 arbitratorFees = feeAmount.div(2);
        challenge.arbitratorFeeToken = feeToken;
        challenge.arbitratorFeeAmount = arbitratorFees;
        require(feeToken.safeTransferFrom(_challenger, address(this), arbitratorFees), ERROR_ARBITRATOR_FEE_TRANSFER_FAILED);
    }

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

    function _submitEvidence(uint256 _disputeId, address _submitter, bytes _evidence, bool _finished) internal {
        if (_evidence.length > 0) {
            emit EvidenceSubmitted(_disputeId, _submitter, _evidence, _finished);
        }
    }

    function _acceptChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Accepted;

        _slashBalance(_action.submitter, challenge.challenger, _setting.collateralAmount);
        _transferCollateralTokens(challenge.challenger, _setting.challengeCollateral);
    }

    function _rejectChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferCollateralTokens(_action.submitter, _setting.challengeCollateral);
    }

    function _voidChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferCollateralTokens(challenge.challenger, _setting.challengeCollateral);
    }

    function _stakeBalance(address _from, address _to, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_to];
        Setting storage currentSetting = _getCurrentSetting();
        uint256 newAvailableBalance = balance.available.add(_amount);
        require(newAvailableBalance >= currentSetting.collateralAmount, ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL);

        balance.available = newAvailableBalance;
        _transferCollateralTokensFrom(_from, address(this), _amount);
        emit BalanceStaked(_to, _amount);
    }

    function _lockBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        require(balance.available >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = balance.available.sub(_amount);
        balance.locked = balance.locked.add(_amount);
        emit BalanceLocked(_signer, _amount);
    }

    function _unlockBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        balance.locked = balance.locked.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit BalanceUnlocked(_signer, _amount);
    }

    function _challengeBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        balance.locked = balance.locked.sub(_amount);
        balance.challenged = balance.challenged.add(_amount);
        emit BalanceChallenged(_signer, _amount);
    }

    function _unchallengeBalance(address _signer, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Stake storage balance = stakeBalances[_signer];
        balance.challenged = balance.challenged.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit BalanceUnchallenged(_signer, _amount);
    }

    function _slashBalance(address _signer, address _challenger, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Stake storage balance = stakeBalances[_signer];
        balance.challenged = balance.challenged.sub(_amount);
        _transferCollateralTokens(_challenger, _amount);
        emit BalanceSlashed(_signer, _amount);
    }

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

    function _transferCollateralTokens(address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(collateralToken.safeTransfer(_to, _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
        }
    }

    function _transferCollateralTokensFrom(address _from, address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(collateralToken.safeTransferFrom(_from, _to, _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
        }
    }

    function _approveArbitratorFeeTokens(ERC20 _arbitratorFeeToken, address _to, uint256 _amount) internal {
        require(_arbitratorFeeToken.safeApprove(_to, _amount), ERROR_ARBITRATOR_FEE_APPROVAL_FAILED);
    }

    function _returnArbitratorFees(Challenge storage _challenge) internal {
        uint256 amount = _challenge.arbitratorFeeAmount;
        if (amount > 0) {
            require(_challenge.arbitratorFeeToken.safeTransfer(_challenge.challenger, amount), ERROR_ARBITRATOR_FEE_RETURN_FAILED);
        }
    }

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

    function _newTokenBalancePermission(ERC20 _permissionToken, uint256 _permissionBalance) internal {
        tokenBalancePermission.token = _permissionToken;
        tokenBalancePermission.balance = _permissionBalance;
        emit TokenBalancePermissionChanged(_permissionToken, _permissionBalance);
    }

    function _canSign(address _signer) internal view returns (bool) {
        TokenBalancePermission storage permission = tokenBalancePermission;
        ERC20 permissionToken = permission.token;

        return isContract(address(permissionToken))
            ? permissionToken.balanceOf(_signer) >= permission.balance
            : canPerform(_signer, SIGN_ROLE, arr(_signer));
    }

    function _canSchedule(address _sender) internal view returns (bool) {
        Stake storage balance = stakeBalances[_sender];
        Setting storage currentSetting = _getCurrentSetting();
        return balance.available >= currentSetting.collateralAmount;
    }

    function _canCancel(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        if (state == ActionState.Scheduled) {
            return true;
        }

        return state == ActionState.Challenged && _action.challenge.state == ChallengeState.Rejected;
    }

    function _canChallenge(Action storage _action) internal view returns (bool) {
        if (_action.state != ActionState.Scheduled) {
            return false;
        }

        return _action.challengeEndDate >= getTimestamp64();
    }

    function _canSettle(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Challenged && _action.challenge.state == ChallengeState.Waiting;
    }

    function _canDispute(Action storage _action) internal view returns (bool) {
        if (!_canSettle(_action)) {
            return false;
        }

        return _action.challenge.settlementEndDate >= getTimestamp64();
    }

    function _canClaimSettlement(Action storage _action) internal view returns (bool) {
        if (!_canSettle(_action)) {
            return false;
        }

        return getTimestamp64() > _action.challenge.settlementEndDate;
    }

    function _canRuleDispute(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Challenged && _action.challenge.state == ChallengeState.Disputed;
    }

    function _canExecute(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        if (state == ActionState.Scheduled) {
            return getTimestamp64() > _action.challengeEndDate;
        }

        return state == ActionState.Challenged && _action.challenge.state == ChallengeState.Rejected;
    }

    function _wasDisputed(Action storage _action) internal view returns (bool) {
        Challenge storage challenge = _action.challenge;
        ChallengeState state = challenge.state;
        return state != ChallengeState.Waiting && state != ChallengeState.Settled;
    }

    function _getAction(uint256 _actionId) internal view returns (Action storage) {
        require(_actionId < actions.length, ERROR_ACTION_DOES_NOT_EXIST);
        return actions[_actionId];
    }

    function _getActionAndSetting(uint256 _actionId) internal view returns (Action storage, Setting storage) {
        Action storage action = _getAction(_actionId);
        Setting storage setting = _getSetting(action);
        return (action, setting);
    }

    function _getActionAndDispute(uint256 _disputeId) internal view returns (Action storage, Dispute storage) {
        Dispute storage dispute = disputes[_disputeId];
        Action storage action = _getAction(dispute.actionId);
        require(_wasDisputed(action), ERROR_DISPUTE_DOES_NOT_EXIST);
        return (action, dispute);
    }

    function _getSetting(Action storage _action) internal view returns (Setting storage) {
        return _getSetting(_action.settingId);
    }

    function _getCurrentSettingId() internal view returns (uint256) {
        return settings.length - 1;
    }

    function _getCurrentSetting() internal view returns (Setting storage) {
        return _getSetting(_getCurrentSettingId());
    }

    function _getCurrentSettingWithId() internal view returns (uint256, Setting storage) {
        uint256 id = _getCurrentSettingId();
        return (id, _getSetting(id));
    }

    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        return settings[_settingId];
    }

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
