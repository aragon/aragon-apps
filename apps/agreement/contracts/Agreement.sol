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
import "@aragon/os/contracts/common/ConversionHelpers.sol";

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
    string internal constant ERROR_TOKEN_NOT_CONTRACT = "AGR_TOKEN_NOT_CONTRACT";
    string internal constant ERROR_ARBITRATOR_NOT_CONTRACT = "AGR_ARBITRATOR_NOT_CONTRACT";
    string internal constant ERROR_STAKING_FACTORY_NOT_CONTRACT = "AGR_STAKING_FACTORY_NOT_CONTRACT";
    string internal constant ERROR_ACL_SIGNER_MISSING = "AGR_ACL_ORACLE_SIGNER_MISSING";
    string internal constant ERROR_ACL_SIGNER_NOT_ADDRESS = "AGR_ACL_ORACLE_SIGNER_NOT_ADDR";

    /* Disputable related errors */
    string internal constant ERROR_SENDER_CANNOT_CHALLENGE_ACTION = "AGR_SENDER_CANT_CHALLENGE_ACTION";
    string internal constant ERROR_MISSING_COLLATERAL_REQUIREMENT = "AGR_MISSING_COLLATERAL_REQ";
    string internal constant ERROR_DISPUTABLE_APP_NOT_REGISTERED = "AGR_DISPUTABLE_NOT_REGISTERED";
    string internal constant ERROR_DISPUTABLE_APP_ALREADY_EXISTS = "AGR_DISPUTABLE_ALREADY_EXISTS";

    /* Action related errors */
    string internal constant ERROR_CANNOT_CLOSE_ACTION = "AGR_CANNOT_CLOSE_ACTION";
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_ACTION = "AGR_CANNOT_RULE_ACTION";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";
    string internal constant ERROR_SUBMITTER_FINISHED_EVIDENCE = "AGR_SUBMITTER_FINISHED_EVIDENCE";
    string internal constant ERROR_CHALLENGER_FINISHED_EVIDENCE = "AGR_CHALLENGER_FINISHED_EVIDENCE";

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_CONTENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_CONTENT_ROLE = 0xbc428ed8cb28bb330ec2446f83dabdde5f6fc3c43db55e285b2c7413b4b2acf5;

    // bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = keccak256("CHANGE_COLLATERAL_REQUIREMENTS_ROLE");
    bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = 0xf8e1e0f3a5d2cfcc5046b79ce871218ff466f2f37c782b9923261b92e20a1496;

    // bytes32 public constant REGISTER_DISPUTABLE_ROLE = keccak256("REGISTER_DISPUTABLE_ROLE");
    bytes32 public constant REGISTER_DISPUTABLE_ROLE = 0x226f767553a5c420616d5a7a0dfc1ece7a8a6c634c65ae72f1be8e9b03139988;

    // bytes32 public constant UNREGISTER_DISPUTABLE_ROLE = keccak256("UNREGISTER_DISPUTABLE_ROLE");
    bytes32 public constant UNREGISTER_DISPUTABLE_ROLE = 0xe9057b86d53721ee5a85588a8240dd8fb48e0c9848fac8bc14c8b95a1ddc67a7;

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
    event DisputableAppRegistered(IDisputable indexed disputable);
    event DisputableAppUnregistering(IDisputable indexed disputable);
    event DisputableAppUnregistered(IDisputable indexed disputable);
    event CollateralRequirementChanged(IDisputable indexed disputable, uint256 id);

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

    enum DisputableState {
        Unregistered,
        Registered,
        Unregistering
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

    struct CollateralRequirement {
        uint256 actionAmount;               // Amount of collateral token that will be locked every time an action is created
        uint256 challengeAmount;            // Amount of collateral token that will be locked every time an action is challenged
        ERC20 token;                        // ERC20 token to be used for collateral
        uint64 challengeDuration;           // Challenge duration in seconds, during this time window the submitter can answer the challenge
    }

    struct DisputableInfo {
        uint256 ongoingActions;             // Number of actions on going for a disputable
        DisputableState state;           // Disputable app state, whether it is registered, unregistered or unregistering
        CollateralRequirement[] collateralRequirements; // List of collateral requirements indexed by id
    }

    string public title;                    // Title identifying the Agreement instance
    IArbitrator public arbitrator;          // Arbitrator instance that will resolve disputes
    StakingFactory public stakingFactory;   // Staking factory to be used for the collateral staking pools

    bytes[] private contents;                                   // List of historic contents indexed by ID
    Action[] private actions;                                   // List of actions indexed by ID
    mapping (uint256 => Dispute) private disputes;              // List of disputes indexed by dispute ID
    mapping (address => uint256) private lastContentSignedBy;   // List of last contents signed by user
    mapping (address => DisputableInfo) private disputableInfos;// List of disputable infos indexed by disputable address

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
    * @param _context Link to a human-readable text giving context for the given action
    * @return Unique identification number for the created action in the context of the agreement
    */
    function newAction(uint256 _disputableId, address _submitter, bytes _context) external returns (uint256) {
        uint256 lastContentIdSigned = lastContentSignedBy[_submitter];
        require(lastContentIdSigned >= _getCurrentContentId(), ERROR_SIGNER_MUST_SIGN);

        DisputableInfo storage disputableInfo = disputableInfos[msg.sender];
        require(disputableInfo.state == DisputableState.Registered, ERROR_DISPUTABLE_APP_NOT_REGISTERED);

        uint256 currentCollateralRequirementId = _getCurrentCollateralRequirementId(disputableInfo);
        CollateralRequirement storage requirement = disputableInfo.collateralRequirements[currentCollateralRequirementId];
        _lockBalance(requirement.token, _submitter, requirement.actionAmount);

        uint256 id = actions.length++;
        Action storage action = actions[id];
        action.disputable = IDisputable(msg.sender);
        action.collateralId = currentCollateralRequirementId;
        action.disputableId = _disputableId;
        action.submitter = _submitter;
        action.context = _context;

        disputableInfo.ongoingActions++;
        emit ActionSubmitted(id);
        return id;
    }

    /**
    * @notice Mark action #`_actionId` as closed
    * @dev It can only be closed if the action wasn't challenged or if it was disputed but ruled in favor of the submitter
    * @param _actionId Identification number of the action to be closed
    */
    function closeAction(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canProceed(action), ERROR_CANNOT_CLOSE_ACTION);

        (IDisputable disputable, DisputableInfo storage disputableInfo, CollateralRequirement storage requirement) = _getDisputableFor(action);
        require(disputable == IDisputable(msg.sender), ERROR_SENDER_NOT_ALLOWED);
        require(disputableInfo.state != DisputableState.Unregistered, ERROR_DISPUTABLE_APP_NOT_REGISTERED);

        if (action.state == ActionState.Submitted) {
            _unlockBalance(requirement.token, action.submitter, requirement.actionAmount);
            disputableInfo.ongoingActions--;
        }

        action.state = ActionState.Closed;
        emit ActionClosed(_actionId);

        _tryUnregisterDisputable(disputable, disputableInfo);
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

        (IDisputable disputable, , CollateralRequirement storage requirement) = _getDisputableFor(action);
        require(_canPerformChallenge(disputable, msg.sender), ERROR_SENDER_CANNOT_CHALLENGE_ACTION);
        require(_settlementOffer <= requirement.actionAmount, ERROR_INVALID_SETTLEMENT_OFFER);

        action.state = ActionState.Challenged;
        _createChallenge(action, msg.sender, requirement, _settlementOffer, _context);
        disputable.onDisputableChallenged(action.disputableId, msg.sender);
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

        (IDisputable disputable, DisputableInfo storage disputableInfo, CollateralRequirement storage requirement) = _getDisputableFor(action);
        ERC20 collateralToken = requirement.token;
        uint256 actionCollateral = requirement.actionAmount;
        uint256 settlementOffer = challenge.settlementOffer;

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 unlockedAmount = settlementOffer >= actionCollateral ? actionCollateral : (actionCollateral - settlementOffer);
        uint256 slashedAmount = actionCollateral - unlockedAmount;

        _unlockAndSlashBalance(collateralToken, submitter, unlockedAmount, challenger, slashedAmount);
        _transfer(collateralToken, challenger, requirement.challengeAmount);
        _transfer(challenge.arbitratorFeeToken, challenger, challenge.arbitratorFeeAmount);

        challenge.state = ChallengeState.Settled;
        disputable.onDisputableRejected(action.disputableId);
        emit ActionSettled(_actionId);

        _solveActionAndTryUnregisterDisputable(disputable, disputableInfo);
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

    /**
    * @notice Register disputable app `_disputable` setting its collateral requirements to:
    * @notice - `@tokenAmount(_collateralToken: address, _actionAmount)` for submitting collateral
    * @notice - `@tokenAmount(_collateralToken: address, _challengeAmount)` for challenging collateral
    * @param _disputable Address of the disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function register(
        IDisputable _disputable,
        ERC20 _collateralToken,
        uint256 _actionAmount,
        uint256 _challengeAmount,
        uint64 _challengeDuration
    )
        external
        authP(REGISTER_DISPUTABLE_ROLE, arr(_disputable))
    {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        DisputableState disputableState = disputableInfo.state;

        if (disputableState == DisputableState.Unregistered) {
            IDisputable(_disputable).setAgreement(IAgreement(this));
        } else if (disputableState != DisputableState.Unregistering) {
            revert(ERROR_DISPUTABLE_APP_ALREADY_EXISTS);
        }

        disputableInfo.state = DisputableState.Registered;
        emit DisputableAppRegistered(_disputable);

        _changeCollateralRequirement(_disputable, disputableInfo, _collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
    }

    /**
    * @notice Enqueues the app `_disputable` to be unregistered and tries to unregister it if possible
    * @param _disputable Address of the disputable app to be unregistered
    */
    function unregister(IDisputable _disputable) external authP(UNREGISTER_DISPUTABLE_ROLE, arr(_disputable)) {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        require(disputableInfo.state == DisputableState.Registered, ERROR_DISPUTABLE_APP_NOT_REGISTERED);

        disputableInfo.state = DisputableState.Unregistering;
        emit DisputableAppUnregistering(_disputable);

        _tryUnregisterDisputable(_disputable, disputableInfo);
    }

    /**
    * @notice Change `_disputable`'s collateral requirements to:
    * @notice - `@tokenAmount(_collateralToken: address, _actionAmount)` for submitting collateral
    * @notice - `@tokenAmount(_collateralToken: address, _challengeAmount)` for challenging collateral
    * @param _disputable Disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function changeCollateralRequirement(
        IDisputable _disputable,
        ERC20 _collateralToken,
        uint256 _actionAmount,
        uint256 _challengeAmount,
        uint64 _challengeDuration
    )
        external
        authP(CHANGE_COLLATERAL_REQUIREMENTS_ROLE, arr(address(_disputable)))
    {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        require(disputableInfo.state == DisputableState.Registered, ERROR_DISPUTABLE_APP_NOT_REGISTERED);

        _changeCollateralRequirement(_disputable, disputableInfo, _collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
    }

    // Getter fns

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address being queried
    * @return lastContentIdSigned Identification number of the last agreement content signed by the signer
    * @return mustSign Whether or not the requested signer must sign the current agreement content or not
    */
    function getSigner(address _signer) external view returns (uint256 lastContentIdSigned, bool mustSign) {
        (lastContentIdSigned, mustSign) = _getSigner(_signer);
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
    * @dev Tell the information related to a disputable app
    * @param _disputable Address of the disputable app being queried
    * @return state State of the disputable app
    * @return ongoingActions Number of ongoing actions for the disputable app
    * @return currentCollateralRequirementId Identification number of the current collateral requirement
    */
    function getDisputableInfo(address _disputable) external view
        returns (
            DisputableState state,
            uint256 ongoingActions,
            uint256 currentCollateralRequirementId
        )
    {
        DisputableInfo storage disputableInfo = disputableInfos[_disputable];
        state = disputableInfo.state;
        ongoingActions = disputableInfo.ongoingActions;
        currentCollateralRequirementId = _getCurrentCollateralRequirementId(disputableInfo);
    }

    /**
    * @dev Tell the information related to a collateral requirement of a disputable app
    * @param _disputable Address of the disputable app querying the collateral requirements of
    * @param _collateralId Identification number of the collateral being queried
    * @return collateralToken Address of the ERC20 token to be used for collateral
    * @return actionAmount Amount of collateral tokens that will be locked every time an action is created
    * @return challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @return challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function getCollateralRequirement(IDisputable _disputable, uint256 _collateralId) external view
        returns (
            ERC20 collateralToken,
            uint256 actionAmount,
            uint256 challengeAmount,
            uint64 challengeDuration
        )
    {
        CollateralRequirement storage collateral = _getCollateralRequirement(_disputable, _collateralId);
        collateralToken = collateral.token;
        actionAmount = collateral.actionAmount;
        challengeAmount = collateral.challengeAmount;
        challengeDuration = collateral.challengeDuration;
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
    * @dev ACL oracle interface - Tells whether an address has already signed the Agreement
    * @return True if a parameterized address does not need to sign the Agreement, false otherwise
    */
    function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
        require(_how.length > 0, ERROR_ACL_SIGNER_MISSING);
        require(_how[0] < 2**160, ERROR_ACL_SIGNER_NOT_ADDRESS);

        address signer = address(_how[0]);
        (, bool mustSign) = _getSigner(signer);
        return !mustSign;
    }

    /**
    * @dev Tell whether an address can challenge an action or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenger Address of the challenger willing to challenge the action
    * @return True if the challenger can be challenge the action, false otherwise
    */
    function canPerformChallenge(uint256 _actionId, address _challenger) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canPerformChallenge(action.disputable, _challenger);
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
    * @param _requirement Collateral requirement to be used for the challenge
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _context Link to a human-readable text giving context for the challenge
    */
    function _createChallenge(
        Action storage _action,
        address _challenger,
        CollateralRequirement storage _requirement,
        uint256 _settlementOffer,
        bytes _context
    )
        internal
    {
        // Store challenge
        Challenge storage challenge = _action.challenge;
        challenge.challenger = _challenger;
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.endDate = getTimestamp64().add(_requirement.challengeDuration);

        // Transfer challenge collateral
        _transferFrom(_requirement.token, _challenger, _requirement.challengeAmount);

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

        (IDisputable disputable, DisputableInfo storage info, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        ERC20 collateralToken = requirement.token;

        address challenger = challenge.challenger;
        _slashBalance(collateralToken, _action.submitter, challenger, requirement.actionAmount);
        _transfer(collateralToken, challenger, requirement.challengeAmount);
        disputable.onDisputableRejected(_action.disputableId);

        _solveActionAndTryUnregisterDisputable(disputable, info);
    }

    /**
    * @dev Reject a challenge proposed against an action
    * @param _action Action instance to be accepted
    */
    function _rejectChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        (IDisputable disputable, DisputableInfo storage info, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        ERC20 collateralToken = requirement.token;

        address submitter = _action.submitter;
        _unlockBalance(collateralToken, submitter, requirement.actionAmount);
        _transfer(collateralToken, submitter, requirement.challengeAmount);
        disputable.onDisputableAllowed(_action.disputableId);

        _solveActionAndTryUnregisterDisputable(disputable, info);
    }

    /**
    * @dev Void a challenge proposed against an action
    * @param _action Action instance to be voided
    */
    function _voidChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        (IDisputable disputable, DisputableInfo storage disputableInfo, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        ERC20 collateralToken = requirement.token;

        _unlockBalance(collateralToken, _action.submitter, requirement.actionAmount);
        _transfer(collateralToken, challenge.challenger, requirement.challengeAmount);
        disputable.onDisputableVoided(_action.disputableId);

        _solveActionAndTryUnregisterDisputable(disputable, disputableInfo);
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
    * @dev Unlock and slash a number of staked tokens for a user in favor of a challenger
    * @param _token ERC20 token to be slashed
    * @param _user Address of the user to be slashed
    * @param _unlockAmount Number of collateral tokens to be locked
    * @param _challenger Address receiving the slashed tokens
    * @param _slashAmount Number of collateral tokens to be slashed
    */
    function _unlockAndSlashBalance(ERC20 _token, address _user, uint256 _unlockAmount, address _challenger, uint256 _slashAmount) internal {
        if (_unlockAmount == 0 && _slashAmount == 0) {
            return;
        }

        Staking staking = stakingFactory.getOrCreateInstance(_token);
        if (_unlockAmount != 0 && _slashAmount != 0) {
            staking.unlockAndSlash(_user, _unlockAmount, _challenger, _slashAmount);
        } else if (_unlockAmount != 0) {
            staking.unlock(_user, _unlockAmount);
        } else {
            staking.slash(_user, _challenger, _slashAmount);
        }
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
    * @dev Reduces in one unit the ongoing actions for a disputable and tries to unregister if it has no more ongoing actions
    * @param _disputableInfo Disputable info instance to be unregistered
    */
    function _solveActionAndTryUnregisterDisputable(IDisputable _disputable, DisputableInfo storage _disputableInfo) internal {
        _disputableInfo.ongoingActions--;
        _tryUnregisterDisputable(_disputable, _disputableInfo);
    }

    /**
    * @dev Tries to unregister a disputable app if it has no more ongoing actions
    * @param _disputableInfo Disputable info instance to be unregistered
    */
    function _tryUnregisterDisputable(IDisputable _disputable, DisputableInfo storage _disputableInfo) internal {
        if (_disputableInfo.ongoingActions == 0 && _disputableInfo.state == DisputableState.Unregistering) {
            _disputableInfo.state = DisputableState.Unregistered;
            IDisputable(_disputable).setAgreement(IAgreement(0));
            emit DisputableAppUnregistered(_disputable);
        }
    }

    /**
    * @dev Change the challenge collateral of a disputable app
    * @param _disputable Disputable app
    * @param _disputableInfo Disputable info instance to change its collateral requirements
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function _changeCollateralRequirement(
        IDisputable _disputable,
        DisputableInfo storage _disputableInfo,
        ERC20 _collateralToken,
        uint256 _actionAmount,
        uint256 _challengeAmount,
        uint64 _challengeDuration
    )
        internal
    {
        require(isContract(address(_collateralToken)), ERROR_TOKEN_NOT_CONTRACT);

        uint256 id = _disputableInfo.collateralRequirements.length++;
        _disputableInfo.collateralRequirements[id] = CollateralRequirement({
            token: _collateralToken,
            actionAmount: _actionAmount,
            challengeAmount: _challengeAmount,
            challengeDuration: _challengeDuration
        });

        emit CollateralRequirementChanged(_disputable, id);
    }

    /**
    * @dev Tell whether an address can challenge an action for a disputable app or not
    * @param _disputable Disputable being queried
    * @param _challenger Address of the challenger willing to challenge an action
    * @return True if the challenger can be challenge actions on the disputable app, false otherwise
    */
    function _canPerformChallenge(IDisputable _disputable, address _challenger) internal view returns (bool) {
        if (!hasInitialized()) {
            return false;
        }

        IKernel linkedKernel = kernel();
        if (address(linkedKernel) == address(0)) {
            return false;
        }

        bytes memory params = ConversionHelpers.dangerouslyCastUintArrayToBytes(arr(_challenger));
        return linkedKernel.hasPermission(_challenger, address(_disputable), CHALLENGE_ROLE, params);
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
    * @dev Tell the information related to a signer
    * @param _signer Address being queried
    * @return lastContentIdSigned Identification number of the last agreement content signed by the signer
    * @return mustSign Whether or not the requested signer must sign the current agreement content or not
    */
    function _getSigner(address _signer) internal view returns (uint256 lastContentIdSigned, bool mustSign) {
        lastContentIdSigned = lastContentSignedBy[_signer];
        mustSign = lastContentIdSigned < _getCurrentContentId();
    }

    /**
    * @dev Tell the identification number of the current collateral requirement instance of a disputable app
    * @param _disputableInfo Disputable info of the app querying its current collateral requirement
    * @return Identification number of the current collateral requirement of a disputable
    */
    function _getCurrentCollateralRequirementId(DisputableInfo storage _disputableInfo) internal view returns (uint256) {
        return _disputableInfo.collateralRequirements.length - 1;
    }

    /**
    * @dev Tell the collateral requirement instance of a disputable by its identification number
    * @param _disputable Disputable app querying the collateral requirements of
    * @param _collateralId Identification number of the collateral being queried
    * @return Collateral requirement instance associated to the given identification number for the given disputable
    */
    function _getCollateralRequirement(IDisputable _disputable, uint256 _collateralId) internal view returns (CollateralRequirement storage) {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        require(_collateralId <= _getCurrentCollateralRequirementId(disputableInfo), ERROR_MISSING_COLLATERAL_REQUIREMENT);
        return disputableInfo.collateralRequirements[_collateralId];
    }

    /**
    * @dev Tell the disputable-related information about a disputable action
    * @param _action Action instance being queried
    * @return disputable Disputable instance associated to the action
    * @return app Disputable app associated to the action
    * @return requirement Collateral requirements of the disputable app associated to the action
    */
    function _getDisputableFor(Action storage _action) internal view
        returns (
            IDisputable disputable,
            DisputableInfo storage disputableInfo,
            CollateralRequirement storage requirement
        )
    {
        disputable = _action.disputable;
        disputableInfo = disputableInfos[address(disputable)];

        uint256 collateralId = _action.collateralId;
        require(collateralId <= _getCurrentCollateralRequirementId(disputableInfo), ERROR_MISSING_COLLATERAL_REQUIREMENT);
        requirement = disputableInfo.collateralRequirements[collateralId];
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
