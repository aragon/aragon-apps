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

    // bytes32 public constant MANAGE_DISPUTABLE_ROLE = keccak256("MANAGE_DISPUTABLE_ROLE");
    bytes32 public constant MANAGE_DISPUTABLE_ROLE = 0x2309a8cbbd5c3f18649f3b7ac47a0e7b99756c2ac146dda1ffc80d3f80827be6;

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
        ERC20 token;                        // ERC20 token to be used for collateral
        uint256 actionAmount;               // Amount of collateral token that will be locked every time an action is created
        uint256 challengeAmount;            // Amount of collateral token that will be locked every time an action is challenged
        uint64 challengeDuration;           // Challenge duration in seconds, during this time window the submitter can answer the challenge
        Staking staking;                    // Staking pool cache for the collateral token
    }

    struct DisputableInfo {
        bool registered;                    // Whether a Disputable app is registered or not
        uint256 requirementsLength;         // Number of collateral requirements existing for a disputable app
        mapping (uint256 => CollateralRequirement) collateralRequirements; // List of collateral requirements indexed by id
    }

    string public title;                    // Title identifying the Agreement instance
    IArbitrator public arbitrator;          // Arbitrator instance that will resolve disputes
    StakingFactory public stakingFactory;   // Staking factory to be used for the collateral staking pools

    uint256 private actionsLength;
    uint256 private contentsLength;

    mapping (uint256 => bytes) private contents;                // List of historic contents indexed by ID
    mapping (uint256 => Action) private actions;                // List of actions indexed by ID
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

        contentsLength++; // Content zero is considered the null content for further validations
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
    * @notice Register a new action for disputable `msg.sender` #`_disputableId` for submitter `_submitter` with context `_context`
    * @dev This function should be called from the disputable app registered on the Agreement every time a new disputable is created in the app.this
    *      Each disputable ID must be registered only once, this is how the Agreements notices about each disputable action.
    * @param _disputableId Identification number of the disputable action in the context of the disputable instance
    * @param _submitter Address of the user that has submitted the action
    * @param _context Link to a human-readable text giving context for the given action
    * @return Unique identification number for the created action in the context of the agreement
    */
    function newAction(uint256 _disputableId, address _submitter, bytes _context) external returns (uint256) {
        uint256 lastContentIdSigned = lastContentSignedBy[_submitter];
        require(lastContentIdSigned >= _getCurrentContentId(), ERROR_SIGNER_MUST_SIGN);

        DisputableInfo storage disputableInfo = disputableInfos[msg.sender];
        _ensureRegisteredDisputable(disputableInfo);

        uint256 currentCollateralRequirementId = _getCurrentCollateralRequirementId(disputableInfo);
        CollateralRequirement storage requirement = disputableInfo.collateralRequirements[currentCollateralRequirementId];
        _lockBalance(requirement.staking, _submitter, requirement.actionAmount);

        uint256 id = actionsLength++;
        Action storage action = actions[id];
        action.disputable = IDisputable(msg.sender);
        action.collateralId = currentCollateralRequirementId;
        action.disputableId = _disputableId;
        action.submitter = _submitter;
        action.context = _context;

        emit ActionSubmitted(id);
        return id;
    }

    /**
    * @notice Mark action #`_actionId` as closed
    * @dev This function can only be called by disputable apps that have registered a disputable action previously. These apps will be able to
    *      close their registered actions if these are not challenged or ruled in favor of the submitter. To detect if that's possible before
    *      hand, users can rely on `canProceed`.
    * @param _actionId Identification number of the action to be closed
    */
    function closeAction(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canProceed(action), ERROR_CANNOT_CLOSE_ACTION);

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(action);
        require(disputable == IDisputable(msg.sender), ERROR_SENDER_NOT_ALLOWED);

        if (action.state == ActionState.Submitted) {
            _unlockBalance(requirement.staking, action.submitter, requirement.actionAmount);
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

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(action);
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

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(action);
        uint256 actionCollateral = requirement.actionAmount;
        uint256 settlementOffer = challenge.settlementOffer;

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 slashedAmount = settlementOffer >= actionCollateral ? actionCollateral : settlementOffer;
        uint256 unlockedAmount = actionCollateral - slashedAmount;

        _unlockAndSlashBalance(requirement.staking, submitter, unlockedAmount, challenger, slashedAmount);
        _transfer(requirement.token, challenger, requirement.challengeAmount);
        _transfer(challenge.arbitratorFeeToken, challenger, challenge.arbitratorFeeAmount);

        challenge.state = ChallengeState.Settled;
        disputable.onDisputableRejected(action.disputableId);
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
    * @notice Submit evidence for the action associated to dispute #`_disputeId`
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _evidence Data submitted for the evidence related to the dispute
    * @param _finished Whether or not the submitter has finished submitting evidence
    */
    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (Action storage action, Dispute storage dispute) = _getActionAndDispute(_disputeId);
        require(_isDisputed(action), ERROR_CANNOT_SUBMIT_EVIDENCE);

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
        require(_isDisputed(action), ERROR_CANNOT_RULE_ACTION);

        IArbitrator currentArbitrator = arbitrator;
        require(currentArbitrator == IArbitrator(msg.sender), ERROR_SENDER_NOT_ALLOWED);

        dispute.ruling = _ruling;
        emit Ruled(currentArbitrator, _disputeId, _ruling);

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
        auth(MANAGE_DISPUTABLE_ROLE)
    {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        _ensureUnregisteredDisputable(disputableInfo);

        disputableInfo.registered = true;
        emit DisputableAppRegistered(_disputable);

        _disputable.setAgreement(IAgreement(this));
        _changeCollateralRequirement(_disputable, disputableInfo, _collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
    }

    /**
    * @notice Enqueues the app `_disputable` to be unregistered and tries to unregister it if possible
    * @param _disputable Address of the disputable app to be unregistered
    */
    function unregister(IDisputable _disputable) external auth(MANAGE_DISPUTABLE_ROLE) {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        _ensureRegisteredDisputable(disputableInfo);

        disputableInfo.registered = false;
        emit DisputableAppUnregistered(_disputable);
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
        auth(MANAGE_DISPUTABLE_ROLE)
    {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        _ensureRegisteredDisputable(disputableInfo);

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
    * @return registered Whether the Disputable app is registered or not
    * @return currentCollateralRequirementId Identification number of the current collateral requirement
    */
    function getDisputableInfo(address _disputable) external view returns (bool registered, uint256 currentCollateralRequirementId) {
        DisputableInfo storage disputableInfo = disputableInfos[_disputable];
        registered = disputableInfo.registered;
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
        return _isDisputed(action);
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
        uint256 arbitratorFees = feeAmount / 2;
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
    * @dev Register evidence for an action
    * @param _action Action instance to submit evidence for
    * @param _dispute Dispute instance associated to the given action
    * @param _submitter Address of submitting the evidence
    * @param _finished Whether both parties have finished submitting evidence or not
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

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        address challenger = challenge.challenger;
        _slashBalance(requirement.staking, _action.submitter, challenger, requirement.actionAmount);
        _transfer(requirement.token, challenger, requirement.challengeAmount);
        disputable.onDisputableRejected(_action.disputableId);
    }

    /**
    * @dev Reject a challenge proposed against an action
    * @param _action Action instance to be accepted
    */
    function _rejectChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Rejected;

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        address submitter = _action.submitter;
        _unlockBalance(requirement.staking, submitter, requirement.actionAmount);
        _transfer(requirement.token, submitter, requirement.challengeAmount);
        disputable.onDisputableAllowed(_action.disputableId);
    }

    /**
    * @dev Void a challenge proposed against an action
    * @param _action Action instance to be voided
    */
    function _voidChallenge(Action storage _action) internal {
        Challenge storage challenge = _action.challenge;
        challenge.state = ChallengeState.Voided;

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        _unlockBalance(requirement.staking, _action.submitter, requirement.actionAmount);
        _transfer(requirement.token, challenge.challenger, requirement.challengeAmount);
        disputable.onDisputableVoided(_action.disputableId);
    }

    /**
    * @dev Lock a number of available tokens for a user
    * @param _staking Staking pool for the ERC20 token to be locked
    * @param _user Address of the user to lock tokens for
    * @param _amount Number of collateral tokens to be locked
    */
    function _lockBalance(Staking _staking, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.lock(_user, _amount);
    }

    /**
    * @dev Unlock a number of locked tokens for a user
    * @param _staking Staking pool for the ERC20 token to be unlocked
    * @param _user Address of the user to unlock tokens for
    * @param _amount Number of collateral tokens to be unlocked
    */
    function _unlockBalance(Staking _staking, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.unlock(_user, _amount);
    }

    /**
    * @dev Slash a number of staked tokens for a user
    * @param _staking Staking pool for the ERC20 token to be slashed
    * @param _user Address of the user to be slashed
    * @param _challenger Address receiving the slashed tokens
    * @param _amount Number of collateral tokens to be slashed
    */
    function _slashBalance(Staking _staking, address _user, address _challenger, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.slash(_user, _challenger, _amount);
    }

    /**
    * @dev Unlock and slash a number of staked tokens for a user in favor of a challenger
    * @param _staking Staking pool for the ERC20 token to be unlocked and slashed
    * @param _user Address of the user to be unlocked and slashed
    * @param _unlockAmount Number of collateral tokens to be unlocked
    * @param _challenger Address receiving the slashed tokens
    * @param _slashAmount Number of collateral tokens to be slashed
    */
    function _unlockAndSlashBalance(Staking _staking, address _user, uint256 _unlockAmount, address _challenger, uint256 _slashAmount) internal {
        if (_unlockAmount != 0 && _slashAmount != 0) {
            _staking.unlockAndSlash(_user, _unlockAmount, _challenger, _slashAmount);
        } else {
            _unlockBalance(_staking, _user, _unlockAmount);
            _slashBalance(_staking, _user, _challenger, _slashAmount);
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
        uint256 id = contentsLength++;
        contents[id] = _content;
        emit ContentChanged(id);
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

        Staking staking = stakingFactory.getOrCreateInstance(_collateralToken);
        uint256 id = _disputableInfo.requirementsLength++;
        _disputableInfo.collateralRequirements[id] = CollateralRequirement({
            token: _collateralToken,
            staking: staking,
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
    * @dev Tell whether an action is disputed or not
    * @param _action Action instance to be queried
    * @return True if the action is disputed, false otherwise
    */
    function _isDisputed(Action storage _action) internal view returns (bool) {
        return _action.state == ActionState.Challenged && _action.challenge.state == ChallengeState.Disputed;
    }

    /**
    * @dev Tell whether an action was disputed or not
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
        require(_actionId < actionsLength, ERROR_ACTION_DOES_NOT_EXIST);
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
        return contentsLength - 1; // an initial content is created during initialization, thus length will be always greater than 0
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
        uint256 length = _disputableInfo.requirementsLength;
        return length == 0 ? 0 : length - 1;
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
    * @return requirement Collateral requirements of the disputable app associated to the action
    */
    function _getDisputableFor(Action storage _action) internal view returns (IDisputable disputable, CollateralRequirement storage requirement){
        disputable = _action.disputable;
        requirement = _getCollateralRequirement(disputable, _action.collateralId);
    }

    /**
    * @dev Ensure a disputable entity is registered
    * @param _disputableInfo Disputable info of the app being queried
    */
    function _ensureRegisteredDisputable(DisputableInfo storage _disputableInfo) internal view {
        require(_disputableInfo.registered, ERROR_DISPUTABLE_APP_NOT_REGISTERED);
    }

    /**
    * @dev Ensure a disputable entity is unregistered
    * @param _disputableInfo Disputable info of the app being queried
    */
    function _ensureUnregisteredDisputable(DisputableInfo storage _disputableInfo) internal view {
        require(!_disputableInfo.registered, ERROR_DISPUTABLE_APP_ALREADY_EXISTS);
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
