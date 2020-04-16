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


contract Agreement is IArbitrable, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;
    using PctHelpers for uint256;

    uint256 private constant DISPUTES_POSSIBLE_OUTCOMES = 2;
    uint256 private constant DISPUTES_RULING_SUBMITTER = 3;
    uint256 private constant DISPUTES_RULING_CHALLENGER = 4;

    string internal constant ERROR_SENDER_NOT_ALLOWED = "AGR_SENDER_NOT_ALLOWED";
    string internal constant ERROR_ACTION_DOES_NOT_EXIST = "AGR_ACTION_DOES_NOT_EXIST";
    string internal constant ERROR_ACTION_IS_NOT_SCHEDULED = "AGR_ACTION_IS_NOT_SCHEDULED";
    string internal constant ERROR_DISPUTE_DOES_NOT_EXIST = "AGR_DISPUTE_DOES_NOT_EXIST";
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_INVALID_SETTLEMENT_OFFER = "AGR_INVALID_SETTLEMENT_OFFER";
    string internal constant ERROR_ACTION_NOT_RULED_YET = "AGR_ACTION_NOT_RULED_YET";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_DISPUTE = "AGR_CANNOT_RULE_DISPUTE";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";
    string internal constant ERROR_SENDER_CANNOT_RULE_DISPUTE = "AGR_SENDER_CANNOT_RULE_DISPUTE";
    string internal constant ERROR_INVALID_UNSTAKE_AMOUNT = "AGR_INVALID_UNSTAKE_AMOUNT";
    string internal constant ERROR_NOT_ENOUGH_AVAILABLE_STAKE = "AGR_NOT_ENOUGH_AVAILABLE_STAKE";
    string internal constant ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL = "AGR_AVAIL_BAL_BELOW_COLLATERAL";
    string internal constant ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED = "AGR_COLLATERAL_TOKEN_TRANSF_FAIL";
    string internal constant ERROR_SUBMITTER_FINISHED_EVIDENCE = "AGR_SUBMITTER_FINISHED_EVIDENCE";
    string internal constant ERROR_CHALLENGER_FINISHED_EVIDENCE = "AGR_CHALLENGER_FINISHED_EVIDENCE";
    string internal constant ERROR_EVIDENCE_SUBMITTER_NOT_ALLOWED = "AGR_EVIDENCE_SUBMITTER_NOT_ALLOW";
    string internal constant ERROR_ARBITRATOR_FEE_RETURN_FAILED = "AGR_ARBITRATOR_FEE_RETURN_FAILED";
    string internal constant ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED = "AGR_ARBITRATOR_FEE_DEPOSIT_FAILED";
    string internal constant ERROR_ARBITRATOR_FEE_APPROVAL_FAILED = "AGR_ARBITRATOR_FEE_APPROVAL_FAILED";
    string internal constant ERROR_ARBITRATOR_FEE_TRANSFER_FAILED = "AGR_ARBITRATOR_FEE_TRANSFER_FAILED";
    string internal constant ERROR_ARBITRATOR_NOT_CONTRACT = "AGR_ARBITRATOR_NOT_CONTRACT";
    string internal constant ERROR_COLLATERAL_TOKEN_NOT_CONTRACT = "AGR_COLLATERAL_TOKEN_NOT_CONTRACT";

    // bytes32 public constant STAKE_ROLE = keccak256("STAKE_ROLE");
    bytes32 public constant STAKE_ROLE = 0xeaea87345c0a5b2ecb49cde771d9ac5bfe2528357e00d43a1e06a12c2779f3ca;

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_AGREEMENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_AGREEMENT_ROLE = 0x4af6231bf2561f502301de36b9a7706e940a025496b174607b9d2f58f9840b46;

    event ActionScheduled(uint256 indexed actionId);
    event ActionChallenged(uint256 indexed actionId);
    event ActionSettled(uint256 indexed actionId);
    event ActionDisputed(uint256 indexed actionId);
    event ActionAccepted(uint256 indexed actionId);
    event ActionVoided(uint256 indexed actionId);
    event ActionRejected(uint256 indexed actionId);
    event ActionCancelled(uint256 indexed actionId);
    event ActionExecuted(uint256 indexed actionId);
    event SettingChanged(uint256 indexed settingId);
    event BalanceStaked(address indexed signer, uint256 amount);
    event BalanceUnstaked(address indexed signer, uint256 amount);
    event BalanceLocked(address indexed signer, uint256 amount);
    event BalanceUnlocked(address indexed signer, uint256 amount);
    event BalanceChallenged(address indexed signer, uint256 amount);
    event BalanceUnchallenged(address indexed signer, uint256 amount);
    event BalanceSlashed(address indexed signer, uint256 amount);

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
        uint64 createdAt;
        address submitter;
        uint256 settingId;
        Challenge challenge;
    }

    struct Challenge {
        bytes context;
        uint64 createdAt;
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
        uint256 collateralAmount;
        uint256 challengeLeverage;
        IArbitrator arbitrator;
        uint64 delayPeriod;
        uint64 settlementPeriod;
    }

    string public title;
    ERC20 public collateralToken;

    Action[] private actions;
    Setting[] private settings;
    mapping (address => Stake) private stakeBalances;
    mapping (uint256 => Dispute) private disputes;

    function initialize(
        string _title,
        bytes _content,
        ERC20 _collateralToken,
        uint256 _collateralAmount,
        uint256 _challengeLeverage,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod
    )
        external
    {
        initialized();
        require(isContract(address(_collateralToken)), ERROR_COLLATERAL_TOKEN_NOT_CONTRACT);

        title = _title;
        collateralToken = _collateralToken;
        _newSetting(_content, _collateralAmount, _challengeLeverage, _arbitrator, _delayPeriod, _settlementPeriod);
    }

    function stake(uint256 _amount) external authP(STAKE_ROLE, arr(msg.sender)) {
        _stakeBalance(msg.sender, msg.sender, _amount);
    }

    function stakeFor(address _signer, uint256 _amount) external authP(STAKE_ROLE, arr(_signer)) {
        _stakeBalance(msg.sender, _signer, _amount);
    }

    function unstake(uint256 _amount) external {
        _unstakeBalance(msg.sender, _amount);
    }

    function receiveApproval(address _from, uint256 _amount, address _token, bytes /* _data */) external authP(STAKE_ROLE, arr(_from)) {
        require(msg.sender == _token && _token == address(collateralToken), ERROR_SENDER_NOT_ALLOWED);
        _stakeBalance(_from, _from, _amount);
    }

    function schedule(bytes _context, bytes _script) external {
        (uint256 settingId, Setting storage currentSetting) = _getCurrentSettingWithId();
        _lockBalance(msg.sender, currentSetting.collateralAmount);

        uint256 id = actions.length++;
        Action storage action = actions[id];
        action.submitter = msg.sender;
        action.context = _context;
        action.script = _script;
        action.createdAt = getTimestamp64();
        action.settingId = settingId;
        emit ActionScheduled(id);
    }

    function execute(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canExecute(action, setting), ERROR_ACTION_IS_NOT_SCHEDULED);

        action.state = ActionState.Executed;
        runScript(action.script, new bytes(0), new address[](0));
        emit ActionExecuted(_actionId);
    }

    function cancel(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canCancel(action), ERROR_ACTION_IS_NOT_SCHEDULED);
        require(msg.sender == action.submitter, ERROR_SENDER_NOT_ALLOWED);

        _unlockBalance(msg.sender, setting.collateralAmount);
        action.state = ActionState.Cancelled;
        emit ActionCancelled(_actionId);
    }

    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context)
        external
        authP(CHALLENGE_ROLE, arr(msg.sender, _actionId))
    {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canChallenge(action, setting), ERROR_CANNOT_CHALLENGE_ACTION);
        require(setting.collateralAmount >= _settlementOffer, ERROR_INVALID_SETTLEMENT_OFFER);

        action.state = ActionState.Challenged;
        _challengeBalance(action.submitter, setting.collateralAmount);
        _createChallenge(action, msg.sender, _settlementOffer, _context, setting);
        emit ActionChallenged(_actionId);
    }

    function settle(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canAnswerChallenge(action, setting), ERROR_CANNOT_SETTLE_ACTION);
        require(msg.sender == action.submitter, ERROR_SENDER_NOT_ALLOWED);

        address submitter = action.submitter;
        Challenge storage challenge = action.challenge;
        address challenger = challenge.challenger;
        uint256 settlementOffer = challenge.settlementOffer;
        uint256 collateralAmount = setting.collateralAmount;

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 unchallengedAmount = settlementOffer >= collateralAmount ? collateralAmount : (collateralAmount - settlementOffer);
        uint256 slashedAmount = collateralAmount - unchallengedAmount;

        challenge.state = ChallengeState.Settled;
        _unchallengeBalance(submitter, unchallengedAmount);
        _slashBalance(submitter, challenger, slashedAmount);
        emit ActionSettled(_actionId);
    }

    function disputeChallenge(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canAnswerChallenge(action, setting), ERROR_CANNOT_DISPUTE_ACTION);
        require(msg.sender == action.submitter, ERROR_SENDER_NOT_ALLOWED);

        Challenge storage challenge = action.challenge;
        uint256 disputeId = _createDispute(action, setting);
        challenge.state = ChallengeState.Disputed;
        challenge.disputeId = disputeId;
        disputes[disputeId].actionId = _actionId;
        emit ActionDisputed(_actionId);
    }

    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canSubmitEvidence(action), ERROR_CANNOT_SUBMIT_EVIDENCE);

        bool finished = _registerEvidence(action, dispute, msg.sender, _finished);
        emit EvidenceSubmitted(_disputeId, msg.sender, _evidence, _finished);
        if (finished) {
            Setting storage setting = _getSetting(action);
            setting.arbitrator.closeEvidencePeriod(_disputeId);
        }
    }

    function executeRuling(uint256 _actionId) external {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_DISPUTE);

        uint256 disputeId = action.challenge.disputeId;
        setting.arbitrator.executeRuling(disputeId);
    }

    function rule(uint256 _disputeId, uint256 _ruling) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_DISPUTE);

        Setting storage setting = _getSetting(action);
        IArbitrator arbitrator = setting.arbitrator;
        require(msg.sender == address(arbitrator), ERROR_SENDER_CANNOT_RULE_DISPUTE);

        dispute.ruling = _ruling;
        emit Ruled(arbitrator, _disputeId, _ruling);

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
        uint256 _collateralAmount,
        uint256 _challengeLeverage,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod
    )
        external
        auth(CHANGE_AGREEMENT_ROLE)
    {
        _newSetting(_content, _collateralAmount, _challengeLeverage, _arbitrator, _delayPeriod, _settlementPeriod);
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
            uint64 createdAt,
            address submitter,
            uint256 settingId
        )
    {
        Action storage action = _getAction(_actionId);
        script = action.script;
        context = action.context;
        state = action.state;
        createdAt = action.createdAt;
        submitter = action.submitter;
        settingId = action.settingId;
    }

    function getChallenge(uint256 _actionId) external view
        returns (
            bytes context,
            uint64 createdAt,
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
        createdAt = challenge.createdAt;
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

    function getCurrentSetting() external view
        returns (
            bytes content,
            uint256 collateralAmount,
            uint256 challengeLeverage,
            IArbitrator arbitrator,
            uint64 delayPeriod,
            uint64 settlementPeriod
        )
    {
        Setting storage setting = _getCurrentSetting();
        return _getSettingData(setting);
    }

    function getSetting(uint256 _settingId) external view
        returns (
            bytes content,
            uint256 collateralAmount,
            uint256 challengeLeverage,
            IArbitrator arbitrator,
            uint64 delayPeriod,
            uint64 settlementPeriod
        )
    {
        Setting storage setting = _getSetting(_settingId);
        return _getSettingData(setting);
    }

    function getMissingArbitratorFees(uint256 _actionId) external view returns (ERC20, uint256, uint256) {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        Challenge storage challenge = action.challenge;
        ERC20 challengerFeeToken = challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = challenge.arbitratorFeeAmount;

        (,ERC20 feeToken, uint256 missingFees, uint256 totalFees) = _getMissingArbitratorFees(setting, challengerFeeToken, challengerFeeAmount);
        return (feeToken, missingFees, totalFees);
    }

    function canCancel(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canCancel(action);
    }

    function canChallenge(uint256 _actionId) external view returns (bool) {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        return _canChallenge(action, setting);
    }

    function canAnswerChallenge(uint256 _actionId) external view returns (bool) {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        return _canAnswerChallenge(action, setting);
    }

    function canRuleDispute(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canRuleDispute(action);
    }

    function canSubmitEvidence(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canSubmitEvidence(action);
    }

    function canExecute(uint256 _actionId) external view returns (bool) {
        (Action storage action, Setting storage setting) = _getActionAndSetting(_actionId);
        return _canExecute(action, setting);
    }

    function _createChallenge(Action storage _action, address _challenger, uint256 _settlementOffer, bytes _context, Setting storage _setting)
        internal
    {
        // Store challenge
        Challenge storage challenge = _action.challenge;
        challenge.challenger = _challenger;
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.createdAt = getTimestamp64();

        // Transfer challenge collateral
        uint256 challengeStake = _getChallengeStake(_setting);
        require(collateralToken.safeTransferFrom(_challenger, address(this), challengeStake), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);

        // Transfer half of the Arbitrator fees
        (, ERC20 feeToken, uint256 feeAmount) = _setting.arbitrator.getDisputeFees();
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
            _setting,
            challengerFeeToken,
            challengerFeeAmount
        );

        // Create dispute
        address submitter = _action.submitter;
        require(feeToken.safeTransferFrom(submitter, address(this), missingFees), ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED);
        require(feeToken.safeApprove(recipient, totalFees), ERROR_ARBITRATOR_FEE_APPROVAL_FAILED);
        uint256 disputeId = _setting.arbitrator.createDispute(DISPUTES_POSSIBLE_OUTCOMES, _setting.content);

        // Update action and submit evidences
        address challenger = challenge.challenger;
        emit EvidenceSubmitted(disputeId, submitter, _action.context, false);
        emit EvidenceSubmitted(disputeId, challenger, challenge.context, false);

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
            revert(ERROR_EVIDENCE_SUBMITTER_NOT_ALLOWED);
        }

        return submitterFinishedEvidence && challengerFinishedEvidence;
    }

    function _acceptChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Accepted;

        _slashBalance(_action.submitter, challenge.challenger, _setting.collateralAmount);
        _transferChallengeStake(challenge.challenger, _setting);
    }

    function _rejectChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferChallengeStake(_action.submitter, _setting);
    }

    function _voidChallenge(Action storage _action, Setting storage _setting) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        _unchallengeBalance(_action.submitter, _setting.collateralAmount);
        _transferChallengeStake(challenge.challenger, _setting);
    }

    function _stakeBalance(address _from, address _to, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_to];
        Setting storage currentSetting = _getCurrentSetting();
        uint256 newAvailableBalance = balance.available.add(_amount);
        require(newAvailableBalance >= currentSetting.collateralAmount, ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL);

        balance.available = newAvailableBalance;
        emit BalanceStaked(_to, _amount);

        require(collateralToken.safeTransferFrom(_from, address(this), _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
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
        emit BalanceSlashed(_signer, _amount);

        require(collateralToken.transfer(_challenger, _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
    }

    function _unstakeBalance(address _signer, uint256 _amount) internal {
        Stake storage balance = stakeBalances[_signer];
        require(_amount <= balance.available, ERROR_INVALID_UNSTAKE_AMOUNT);

        balance.available = balance.available.sub(_amount);
        emit BalanceUnstaked(_signer, _amount);

        require(collateralToken.safeTransfer(_signer, _amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
    }

    function _transferChallengeStake(address _to, Setting storage _setting) internal {
        uint256 amount = _getChallengeStake(_setting);
        if (amount > 0) {
            require(collateralToken.transfer(_to, amount), ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED);
        }
    }

    function _newSetting(
        bytes _content,
        uint256 _collateralAmount,
        uint256 _challengeLeverage,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod
    )
        internal
    {
        require(isContract(address(_arbitrator)), ERROR_ARBITRATOR_NOT_CONTRACT);

        uint256 id = settings.length++;
        settings[id] = Setting({
            content: _content,
            collateralAmount: _collateralAmount,
            challengeLeverage: _challengeLeverage,
            arbitrator: _arbitrator,
            delayPeriod: _delayPeriod,
            settlementPeriod: _settlementPeriod
        });

        emit SettingChanged(id);
    }

    function _wasDisputed(Action storage _action) internal view returns (bool) {
        Challenge storage challenge = _action.challenge;
        ChallengeState state = challenge.state;
        return state == ChallengeState.Disputed || state == ChallengeState.Rejected || state == ChallengeState.Accepted;
    }

    function _canCancel(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        if (state == ActionState.Scheduled) {
            return true;
        }

        if (state != ActionState.Challenged) {
            return false;
        }

        Challenge storage challenge = _action.challenge;
        return challenge.state == ChallengeState.Rejected;
    }

    function _canChallenge(Action storage _action, Setting storage _setting) internal view returns (bool) {
        if (_action.state != ActionState.Scheduled) {
            return false;
        }

        uint64 challengeEndDate = _action.createdAt.add(_setting.delayPeriod);
        return challengeEndDate >= getTimestamp64();
    }

    function _canAnswerChallenge(Action storage _action, Setting storage _setting) internal view returns (bool) {
        if (_action.state != ActionState.Challenged) {
            return false;
        }

        Challenge storage challenge = _action.challenge;
        if (challenge.state != ChallengeState.Waiting) {
            return false;
        }

        uint64 settlementEndDate = challenge.createdAt.add(_setting.settlementPeriod);
        return settlementEndDate >= getTimestamp64();
    }

    function _canRuleDispute(Action storage _action) internal view returns (bool) {
        if (_action.state != ActionState.Challenged) {
            return false;
        }

        Challenge storage challenge = _action.challenge;
        return challenge.state == ChallengeState.Disputed;
    }

    function _canSubmitEvidence(Action storage _action) internal view returns (bool) {
        if (_action.state != ActionState.Challenged) {
            return false;
        }

        Challenge storage challenge = _action.challenge;
        return challenge.state == ChallengeState.Disputed;
    }

    function _canExecute(Action storage _action, Setting storage _setting) internal view returns (bool) {
        if (_action.state == ActionState.Scheduled) {
            uint64 challengeEndDate = _action.createdAt.add(_setting.delayPeriod);
            return getTimestamp64() > challengeEndDate;
        }

        if (_action.state != ActionState.Challenged) {
            return false;
        }

        Challenge storage challenge = _action.challenge;
        return  challenge.state == ChallengeState.Rejected;
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

    function _getCurrentSetting() internal view returns (Setting storage) {
        return _getSetting(settings.length - 1);
    }

    function _getCurrentSettingWithId() internal view returns (uint256, Setting storage) {
        uint256 id = settings.length - 1;
        return (id, _getSetting(id));
    }

    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        return settings[_settingId];
    }

    function _getSettingData(Setting storage _setting) internal view
        returns (
            bytes content,
            uint256 collateralAmount,
            uint256 challengeLeverage,
            IArbitrator arbitrator,
            uint64 delayPeriod,
            uint64 settlementPeriod
        )
    {
        content = _setting.content;
        collateralAmount = _setting.collateralAmount;
        delayPeriod = _setting.delayPeriod;
        settlementPeriod = _setting.settlementPeriod;
        challengeLeverage = _setting.challengeLeverage;
        arbitrator = _setting.arbitrator;
    }

    function _getChallengeStake(Setting storage _setting) internal view returns (uint256) {
        return _setting.collateralAmount.pct(_setting.challengeLeverage);
    }

    function _getMissingArbitratorFees(Setting storage _setting, ERC20 _challengerFeeToken, uint256 _challengerFeeAmount) internal view
        returns (address, ERC20, uint256, uint256)
    {
        (address recipient, ERC20 feeToken, uint256 disputeFees) = _setting.arbitrator.getDisputeFees();

        uint256 missingFees;
        if (_challengerFeeToken == feeToken) {
            missingFees = _challengerFeeAmount >= disputeFees ? 0 : (disputeFees - _challengerFeeAmount);
        } else {
            missingFees = disputeFees;
        }

        return (recipient, feeToken, missingFees, disputeFees);
    }
}
