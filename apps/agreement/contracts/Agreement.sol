/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/TimeHelpers.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "./arbitration/IArbitrable.sol";
import "./arbitration/IArbitrator.sol";

import "./IAgreement.sol";
import "./staking/Staking.sol";
import "./staking/StakingFactory.sol";
import "./disputable/IDisputable.sol";


contract Agreement is IAgreement, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;

    /* Arbitrator outcomes constants */
    uint256 internal constant DISPUTES_POSSIBLE_OUTCOMES = 2;
    uint256 internal constant DISPUTES_RULING_SUBMITTER = 3;
    uint256 internal constant DISPUTES_RULING_CHALLENGER = 4;

    /* Validation errors */
    string internal constant ERROR_SENDER_NOT_ALLOWED = "AGR_SENDER_NOT_ALLOWED";
    string internal constant ERROR_SIGNER_MUST_SIGN = "AGR_SIGNER_MUST_SIGN";
    string internal constant ERROR_SIGNER_ALREADY_SIGNED = "AGR_SIGNER_ALREADY_SIGNED";
    string internal constant ERROR_INVALID_SETTLEMENT_OFFER = "AGR_INVALID_SETTLEMENT_OFFER";
    string internal constant ERROR_ACTION_DOES_NOT_EXIST = "AGR_ACTION_DOES_NOT_EXIST";
    string internal constant ERROR_DISPUTE_DOES_NOT_EXIST = "AGR_DISPUTE_DOES_NOT_EXIST";
    string internal constant ERROR_TOKEN_DEPOSIT_FAILED = "AGR_TOKEN_DEPOSIT_FAILED";
    string internal constant ERROR_TOKEN_TRANSFER_FAILED = "AGR_TOKEN_TRANSFER_FAILED";
    string internal constant ERROR_TOKEN_APPROVAL_FAILED = "AGR_TOKEN_APPROVAL_FAILED";
    string internal constant ERROR_ARBITRATOR_NOT_CONTRACT = "AGR_ARBITRATOR_NOT_CONTRACT";
    string internal constant ERROR_STAKING_FACTORY_NOT_CONTRACT = "AGR_STAKING_FACTORY_NOT_CONTRACT";

    /* Action related errors */
    string internal constant ERROR_CANNOT_CLOSE_ACTION = "AGR_CANNOT_CLOSE_ACTION";
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_ACTION = "AGR_CANNOT_RULE_ACTION";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";
    string internal constant ERROR_SUBMITTER_FINISHED_EVIDENCE = "AGR_SUBMITTER_FINISHED_EVIDENCE";
    string internal constant ERROR_CHALLENGER_FINISHED_EVIDENCE = "AGR_CHALLENGER_FINISHED_EVIDENCE";

    // bytes32 public constant DISPUTABLE_ROLE = keccak256("DISPUTABLE_ROLE");
    bytes32 public constant DISPUTABLE_ROLE = 0x5b327c088dc5201d0d0f365250580b009f4b5940290b5e72d41266abddb16fcd;

    // bytes32 public constant CHANGE_CONTENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_CONTENT_ROLE = 0xbc428ed8cb28bb330ec2446f83dabdde5f6fc3c43db55e285b2c7413b4b2acf5;

    event Signed(address indexed signer, uint256 contentId);
    event ContentChanged(uint256 contentId);
    event ActionSubmitted(uint256 indexed actionId);
    event ActionChallenged(uint256 indexed actionId);
    event ActionSettled(uint256 indexed actionId);
    event ActionDisputed(uint256 indexed actionId);
    event ActionAccepted(uint256 indexed actionId);
    event ActionVoided(uint256 indexed actionId);
    event ActionRejected(uint256 indexed actionId);
    event ActionClosed(uint256 indexed actionId);

    enum ActionState {
        Submitted,
        Challenged,
        Closed
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
        IDisputable disputable;             // Address of the disputable that created the action
        uint256 disputableId;               // Identification number of the disputable action in the context of the disputable instance
        uint256 collateralId;               // Identification number of the collateral requirements for the given action
        address submitter;                  // Address that has submitted the action
        bytes context;                      // Link to a human-readable text giving context for the given action
        ActionState state;                  // Current state of the action
        Challenge challenge;                // Associated challenge instance
    }

    struct Challenge {
        address challenger;                 // Address that challenged the action
        uint64 endDate;                     // End date of the challenge, after that date is when the action submitter can answer the challenge
        bytes context;                      // Link to a human-readable text giving context for the challenge
        uint256 settlementOffer;            // Amount of collateral tokens the challenger would accept without involving the arbitrator
        uint256 arbitratorFeeAmount;        // Amount of arbitration fees paid by the challenger in advance in case the challenge is disputed
        ERC20 arbitratorFeeToken;           // ERC20 token used for the arbitration fees paid by the challenger in advance
        ChallengeState state;               // Current state of the action challenge
        uint256 disputeId;                  // Identification number of the dispute for the arbitrator
    }

    struct Dispute {
        uint256 ruling;                     // Ruling given for the action dispute
        uint256 actionId;                   // Identification number of the action being queried
        bool submitterFinishedEvidence;     // Whether the action submitter has finished submitting evidence for the action dispute
        bool challengerFinishedEvidence;    // Whether the action challenger has finished submitting evidence for the action dispute
    }

    string public title;                    // Title identifying the Agreement instance
    IArbitrator public arbitrator;          // Arbitrator instance that will resolve disputes
    StakingFactory public stakingFactory;   // Staking factory to be used for the collateral staking pools

    bytes[] private contents;                                   // List of historic contents indexed by ID
    Action[] private actions;                                   // List of actions indexed by ID
    mapping (uint256 => Dispute) private disputes;              // List of disputes indexed by dispute ID
    mapping (address => uint256) private lastContentSignedBy;   // List of last contents signed by user

    /**
    * @notice Initialize Agreement app for `_title` and content `_content`, with arbitrator `_arbitrator` and staking factory `_factory`
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _stakingFactory Staking factory to be used for the collateral staking pools
    */
    function initialize(string _title, bytes _content, IArbitrator _arbitrator, StakingFactory _stakingFactory) external {
        initialized();
        require(isContract(address(_arbitrator)), ERROR_ARBITRATOR_NOT_CONTRACT);
        require(isContract(address(_stakingFactory)), ERROR_STAKING_FACTORY_NOT_CONTRACT);

        title = _title;
        arbitrator = _arbitrator;
        stakingFactory = _stakingFactory;

        contents.length++; // Content zero is considered the null content for further validations
        _newContent(_content);
    }

    /**
    * @notice Sign the agreement
    */
    function sign() external {
        uint256 lastContentIdSigned = lastContentSignedBy[msg.sender];
        uint256 currentContentId = _getCurrentContentId();
        require(lastContentIdSigned < currentContentId, ERROR_SIGNER_ALREADY_SIGNED);

        lastContentSignedBy[msg.sender] = currentContentId;
        emit Signed(msg.sender, currentContentId);
    }

    /**
    * @notice Create a new action
    * @param _disputableId Identification number of the disputable action in the context of the disputable instance
    * @param _submitter Address of the user that has submitted the action
    * @param _collateralId Identification number of the collateral requirements for the given action
    * @param _context Link to a human-readable text giving context for the given action
    * @return Unique identification number for the created action in the context of the agreement
    */
    function newAction(uint256 _disputableId, uint256 _collateralId, address _submitter, bytes _context)
        external
        auth(DISPUTABLE_ROLE)
        returns (uint256)
    {
        uint256 lastContentIdSigned = lastContentSignedBy[_submitter];
        require(lastContentIdSigned >= _getCurrentContentId(), ERROR_SIGNER_MUST_SIGN);

        IDisputable disputable = IDisputable(msg.sender);
        (ERC20 collateralToken, uint256 actionCollateral,,) = disputable.getCollateralRequirement(_disputableId, _collateralId);
        _lockBalance(collateralToken, _submitter, actionCollateral);

        uint256 id = actions.length++;
        Action storage action = actions[id];
        action.disputable = IDisputable(msg.sender);
        action.disputableId = _disputableId;
        action.submitter = _submitter;
        action.context = _context;

        emit ActionSubmitted(id);
        return id;
    }

    /**
    * @notice Mark action #`_actionId` as closed
    * @dev It can only be closed if the action wasn't challenged or if it was disputed but ruled in favor of the submitter
    * @param _actionId Identification number of the action to be closed
    */
    function closeAction(uint256 _actionId) external auth(DISPUTABLE_ROLE) {
        Action storage action = _getAction(_actionId);
        require(_canProceed(action), ERROR_CANNOT_CLOSE_ACTION);

        IDisputable disputable = action.disputable;
        require(disputable == IDisputable(msg.sender), ERROR_SENDER_NOT_ALLOWED);

        if (action.state == ActionState.Submitted) {
            (ERC20 collateralToken, uint256 actionCollateral,,) = disputable.getCollateralRequirement(action.disputableId, action.collateralId);
            _unlockBalance(collateralToken, action.submitter, actionCollateral);
        }

        action.state = ActionState.Closed;
        emit ActionClosed(_actionId);
    }

    /**
    * @notice Challenge action #`_actionId`
    * @param _actionId Identification number of the action to be challenged
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _context Link to a human-readable text giving context for the challenge
    */
    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context) external {
        Action storage action = _getAction(_actionId);
        require(_canChallenge(action), ERROR_CANNOT_CHALLENGE_ACTION);

        IDisputable disputable = action.disputable;
        uint256 disputableId = action.disputableId;
        (ERC20 collateralToken,
        uint256 actionCollateral,
        uint256 challengeCollateral,
        uint64 challengeDuration) = disputable.getCollateralRequirement(disputableId, action.collateralId);

        require(_settlementOffer <= actionCollateral, ERROR_INVALID_SETTLEMENT_OFFER);
        require(disputable.canChallenge(disputableId, msg.sender), ERROR_CANNOT_CHALLENGE_ACTION);

        action.state = ActionState.Challenged;
        _createChallenge(action, msg.sender, collateralToken, challengeCollateral, _settlementOffer, challengeDuration, _context);
        disputable.onDisputableChallenged(disputableId);
        emit ActionChallenged(_actionId);
    }

    /**
    * @notice Settle challenged action #`_actionId` accepting the settlement offer
    * @param _actionId Identification number of the action to be settled
    */
    function settle(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        Challenge storage challenge = action.challenge;
        address submitter = action.submitter;
        address challenger = challenge.challenger;

        if (msg.sender == submitter) {
            require(_canSettle(action), ERROR_CANNOT_SETTLE_ACTION);
        } else {
            require(_canClaimSettlement(action), ERROR_CANNOT_SETTLE_ACTION);
        }

        uint256 settlementOffer = challenge.settlementOffer;
        uint256 disputableId = action.disputableId;
        (ERC20 collateralToken,
        uint256 actionCollateral,
        uint256 challengeCollateral,) = action.disputable.getCollateralRequirement(disputableId, action.collateralId);

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 unlockedAmount = settlementOffer >= actionCollateral ? actionCollateral : (actionCollateral - settlementOffer);
        uint256 slashedAmount = actionCollateral - unlockedAmount;

        Staking staking = stakingFactory.getOrCreateInstance(collateralToken);
        staking.unlockAndSlash(submitter, unlockedAmount, challenger, slashedAmount);
        _transfer(collateralToken, challenger, challengeCollateral);
        _transfer(challenge.arbitratorFeeToken, challenge.challenger, challenge.arbitratorFeeAmount);

        challenge.state = ChallengeState.Settled;
        action.disputable.onDisputableRejected(disputableId);
        emit ActionSettled(_actionId);
    }

    /**
    * @notice Dispute challenged action #`_actionId` raising it to the arbitrator
    * @dev It can only be disputed if the action was previously challenged
    * @param _actionId Identification number of the action to be disputed
    */
    function disputeAction(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canDispute(action), ERROR_CANNOT_DISPUTE_ACTION);
        require(msg.sender == action.submitter, ERROR_SENDER_NOT_ALLOWED);

        Challenge storage challenge = action.challenge;
        uint256 disputeId = _createDispute(action);
        challenge.state = ChallengeState.Disputed;
        challenge.disputeId = disputeId;
        disputes[disputeId].actionId = _actionId;
        emit ActionDisputed(_actionId);
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
    * @notice Rule action associated to dispute #`_disputeId` with ruling `_ruling`
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _ruling Ruling given by the arbitrator
    */
    function rule(uint256 _disputeId, uint256 _ruling) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_canRuleDispute(action), ERROR_CANNOT_RULE_ACTION);

        address arbitratorAddress = address(arbitrator);
        require(msg.sender == arbitratorAddress, ERROR_SENDER_NOT_ALLOWED);

        dispute.ruling = _ruling;
        emit Ruled(IArbitrator(arbitratorAddress), _disputeId, _ruling);

        if (_ruling == DISPUTES_RULING_SUBMITTER) {
            _rejectChallenge(action);
            emit ActionAccepted(dispute.actionId);
        } else if (_ruling == DISPUTES_RULING_CHALLENGER) {
            _acceptChallenge(action);
            emit ActionRejected(dispute.actionId);
        } else {
            _voidChallenge(action);
            emit ActionVoided(dispute.actionId);
        }
    }

    /**
    * @notice Change Agreement content to `_content`
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    */
    function changeContent(bytes _content) external auth(CHANGE_CONTENT_ROLE) {
        _newContent(_content);
    }

    // Getter fns

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address being queried
    * @return lastContentIdSigned Identification number of the last agreement content signed by the signer
    * @return mustSign Whether or not the requested signer must sign the current agreement content or not
    */
    function getSigner(address _signer) external view returns (uint256 lastContentIdSigned, bool mustSign) {
        lastContentIdSigned = lastContentSignedBy[_signer];
        mustSign = lastContentIdSigned < _getCurrentContentId();
    }

    /**
    * @dev Tell the information related to an action
    * @param _actionId Identification number of the action being queried
    * @return disputable Address of the disputable that created the action
    * @return disputableId Identification number of the disputable action in the context of the disputable
    * @return collateralId Identification number of the collateral requirements for the given action
    * @return context Link to a human-readable text giving context for the given action
    * @return state Current state of the action
    * @return submitter Address that has submitted the action
    */
    function getAction(uint256 _actionId) external view
        returns (
            address disputable,
            uint256 disputableId,
            uint256 collateralId,
            bytes context,
            ActionState state,
            address submitter
        )
    {
        Action storage action = _getAction(_actionId);
        disputable = action.disputable;
        disputableId = action.disputableId;
        collateralId = action.collateralId;
        context = action.context;
        state = action.state;
        submitter = action.submitter;
    }

    /**
    * @dev Tell the information related to an action challenge
    * @param _actionId Identification number of the action being queried
    * @return context Link to a human-readable text giving context for the challenge
    * @return challenger Address that challenged the action
    * @return endDate Datetime until when the action submitter can answer the challenge
    * @return settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @return arbitratorFeeAmount Amount of arbitration fees paid by the challenger in advance in case the challenge is raised to the arbitrator
    * @return arbitratorFeeToken ERC20 token used for the arbitration fees paid by the challenger in advance
    * @return state Current state of the action challenge
    * @return disputeId Identification number of the dispute for the arbitrator
    */
    function getChallenge(uint256 _actionId) external view
        returns (
            bytes context,
            address challenger,
            uint64 endDate,
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
        challenger = challenge.challenger;
        endDate = challenge.endDate;
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
    * @dev Tell the current content identification number
    * @return Identification number of the current Agreement content
    */
    function getCurrentContentId() external view returns (uint256) {
        return _getCurrentContentId();
    }

    /**
    * @dev Tell the information related to a content
    * @param _contentId Identification number of the content being queried
    * @return content Link to a human-readable text that describes the initial rules for the Agreements instance
    */
    function getContent(uint256 _contentId) external view returns (bytes) {
        return contents[_contentId];
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
    * @dev Tell whether an action can proceed or not, i.e. if its not being challenged or disputed
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can proceed, false otherwise
    */
    function canProceed(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canProceed(action);
    }

    /**
    * @dev Tell whether an action can be challenged or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function canChallenge(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canChallenge(action);
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

    // Internal fns

    /**
    * @dev Challenge an action
    * @param _action Action instance to be challenged
    * @param _challenger Address challenging the action
    * @param _collateralToken ERC20 token to be used for collateral
    * @param _challengeCollateral Amount of collateral tokens to be locked
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _duration Challenge duration in seconds
    * @param _context Link to a human-readable text giving context for the challenge
    */
    function _createChallenge(
        Action storage _action,
        address _challenger,
        ERC20 _collateralToken,
        uint256 _challengeCollateral,
        uint256 _settlementOffer,
        uint64 _duration,
        bytes _context
    )
        internal
    {
        // Store challenge
        Challenge storage challenge = _action.challenge;
        challenge.challenger = _challenger;
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.endDate = getTimestamp64().add(_duration);

        // Transfer challenge collateral
        _transferFrom(_collateralToken, _challenger, _challengeCollateral);

        // Transfer half of the Arbitrator fees
        (, ERC20 feeToken, uint256 feeAmount) = arbitrator.getDisputeFees();
        uint256 arbitratorFees = feeAmount.div(2);
        challenge.arbitratorFeeToken = feeToken;
        challenge.arbitratorFeeAmount = arbitratorFees;
        _transferFrom(feeToken, _challenger, arbitratorFees);
    }

    /**
    * @dev Dispute an action
    * @param _action Action instance to be disputed
    * @return Identification number of the dispute created in the arbitrator
    */
    function _createDispute(Action storage _action) internal returns (uint256) {
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
        _transferFrom(feeToken, submitter, missingFees);
        // We are first setting the allowance to zero in case there are remaining fees in the arbitrator
        _approveArbitratorFeeTokens(feeToken, recipient, 0);
        _approveArbitratorFeeTokens(feeToken, recipient, totalFees);
        uint256 disputeId = arbitrator.createDispute(DISPUTES_POSSIBLE_OUTCOMES, _getCurrentContent());

        // Update action and submit evidences
        address challenger = challenge.challenger;
        _submitEvidence(disputeId, submitter, _action.context, false);
        _submitEvidence(disputeId, challenger, challenge.context, false);

        // Return arbitrator fees to challenger if necessary
        if (challenge.arbitratorFeeToken != feeToken) {
            _transfer(challengerFeeToken, challenger, challengerFeeAmount);
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
            require(!challengerFinishedEvidence, ERROR_CHALLENGER_FINISHED_EVIDENCE);
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
    */
    function _acceptChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Accepted;

        uint256 disputableId = _action.disputableId;
        IDisputable disputable = _action.disputable;
        (ERC20 collateralToken,
        uint256 actionCollateral,
        uint256 challengeCollateral,) = disputable.getCollateralRequirement(disputableId, _action.collateralId);

        address challenger = challenge.challenger;
        _slashBalance(collateralToken, _action.submitter, challenger, actionCollateral);
        _transfer(collateralToken, challenger, challengeCollateral);
        disputable.onDisputableRejected(disputableId);
    }

    /**
    * @dev Reject a challenge proposed against an action
    * @param _action Action instance to be accepted
    */
    function _rejectChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        uint256 disputableId = _action.disputableId;
        IDisputable disputable = _action.disputable;
        (ERC20 collateralToken,
        uint256 actionCollateral,
        uint256 challengeCollateral,) = disputable.getCollateralRequirement(disputableId, _action.collateralId);

        address submitter = _action.submitter;
        _unlockBalance(collateralToken, submitter, actionCollateral);
        _transfer(collateralToken, submitter, challengeCollateral);
        disputable.onDisputableAllowed(disputableId);
    }

    /**
    * @dev Void a challenge proposed against an action
    * @param _action Action instance to be voided
    */
    function _voidChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        uint256 disputableId = _action.disputableId;
        IDisputable disputable = _action.disputable;
        (ERC20 collateralToken,
        uint256 actionCollateral,
        uint256 challengeCollateral,) = disputable.getCollateralRequirement(disputableId, _action.collateralId);

        _unlockBalance(collateralToken, _action.submitter, actionCollateral);
        _transfer(collateralToken, challenge.challenger, challengeCollateral);
        disputable.onDisputableVoided(disputableId);
    }

    /**
    * @dev Lock a number of available tokens for a user
    * @param _token ERC20 token to be locked
    * @param _user Address of the user to lock tokens for
    * @param _amount Number of collateral tokens to be locked
    */
    function _lockBalance(ERC20 _token, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Staking staking = stakingFactory.getOrCreateInstance(_token);
        staking.lock(_user, _amount);
    }

    /**
    * @dev Unlock a number of locked tokens for a user
    * @param _token ERC20 token to be unlocked
    * @param _user Address of the user to unlock tokens for
    * @param _amount Number of collateral tokens to be unlocked
    */
    function _unlockBalance(ERC20 _token, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Staking staking = stakingFactory.getOrCreateInstance(_token);
        staking.unlock(_user, _amount);
    }

    /**
    * @dev Slash a number of staked tokens for a user
    * @param _token ERC20 token to be slashed
    * @param _user Address of the user to be slashed
    * @param _challenger Address receiving the slashed tokens
    * @param _amount Number of collateral tokens to be slashed
    */
    function _slashBalance(ERC20 _token, address _user, address _challenger, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Staking staking = stakingFactory.getOrCreateInstance(_token);
        staking.slash(_user, _challenger, _amount);
    }

    /**
    * @dev Transfer tokens to an address
    * @param _token ERC20 token to be transferred
    * @param _to Address receiving the tokens being transferred
    * @param _amount Number of tokens to be transferred
    */
    function _transfer(ERC20 _token, address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransfer(_to, _amount), ERROR_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Transfer tokens from an address to the Staking instance
    * @param _token ERC20 token to be transferred from
    * @param _from Address transferring the tokens from
    * @param _amount Number of tokens to be transferred
    */
    function _transferFrom(ERC20 _token, address _from, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransferFrom(_from, address(this), _amount), ERROR_TOKEN_DEPOSIT_FAILED);
        }
    }

    /**
    * @dev Approve arbitration fee tokens to an address
    * @param _token ERC20 token used for the arbitration fees
    * @param _to Address to be approved to transfer the arbitration fees
    * @param _amount Number of `_arbitrationFeeToken` tokens to be approved
    */
    function _approveArbitratorFeeTokens(ERC20 _token, address _to, uint256 _amount) internal {
        require(_token.safeApprove(_to, _amount), ERROR_TOKEN_APPROVAL_FAILED);
    }

    /**
    * @dev Change Agreement content
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    */
    function _newContent(bytes _content) internal {
        uint256 id = contents.length++;
        contents[id] = _content;
        emit ContentChanged(id);
    }

    /**
    * @dev Tell whether an action can proceed or not, i.e. if its not being challenged or disputed
    * @param _action Action instance to be queried
    * @return True if the action can proceed, false otherwise
    */
    function _canProceed(Action storage _action) internal view returns (bool) {
        ActionState state = _action.state;
        return state == ActionState.Submitted || (state == ActionState.Challenged && _action.challenge.state == ChallengeState.Rejected);
    }

    /**
    * @dev Tell whether an action can be challenged or not
    * @param _action Action instance to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function _canChallenge(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Submitted;
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

        return _action.challenge.endDate >= getTimestamp64();
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

        return getTimestamp64() > _action.challenge.endDate;
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
    * @dev Tell the current content
    * @return Current Agreement content
    */
    function _getCurrentContent() internal view returns (bytes memory) {
        return contents[_getCurrentContentId()];
    }

    /**
    * @dev Tell the current content identification number
    * @return Identification number of the current Agreement content
    */
    function _getCurrentContentId() internal view returns (uint256) {
        return contents.length - 1;
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
}
