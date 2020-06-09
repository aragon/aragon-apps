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
import "@aragon/os/contracts/apps/disputable/IAgreement.sol";
import "@aragon/os/contracts/apps/disputable/IDisputable.sol";
import "@aragon/staking/contracts/Staking.sol";
import "@aragon/staking/contracts/StakingFactory.sol";

import "./lib/BytesHelper.sol";


contract Agreement is IAgreement, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;
    using BytesHelper for bytes;

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
    string internal constant ERROR_CHALLENGE_DOES_NOT_EXIST = "AGR_CHALLENGE_DOES_NOT_EXIST";
    string internal constant ERROR_DISPUTE_DOES_NOT_EXIST = "AGR_DISPUTE_DOES_NOT_EXIST";
    string internal constant ERROR_TOKEN_DEPOSIT_FAILED = "AGR_TOKEN_DEPOSIT_FAILED";
    string internal constant ERROR_TOKEN_TRANSFER_FAILED = "AGR_TOKEN_TRANSFER_FAILED";
    string internal constant ERROR_TOKEN_APPROVAL_FAILED = "AGR_TOKEN_APPROVAL_FAILED";
    string internal constant ERROR_TOKEN_NOT_CONTRACT = "AGR_TOKEN_NOT_CONTRACT";
    string internal constant ERROR_MISSING_AGREEMENT_SETTING = "AGR_MISSING_AGREEMENT_SETTING";
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
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_CANNOT_CLOSE_ACTION = "AGR_CANNOT_CLOSE_ACTION";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_ACTION = "AGR_CANNOT_RULE_ACTION";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";
    string internal constant ERROR_SUBMITTER_FINISHED_EVIDENCE = "AGR_SUBMITTER_FINISHED_EVIDENCE";
    string internal constant ERROR_CHALLENGER_FINISHED_EVIDENCE = "AGR_CHALLENGER_FINISHED_EVIDENCE";

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_AGREEMENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_AGREEMENT_ROLE = 0x07813bca4905795fa22783885acd0167950db28f2d7a40b70f666f429e19f1d9;

    // bytes32 public constant MANAGE_DISPUTABLE_ROLE = keccak256("MANAGE_DISPUTABLE_ROLE");
    bytes32 public constant MANAGE_DISPUTABLE_ROLE = 0x2309a8cbbd5c3f18649f3b7ac47a0e7b99756c2ac146dda1ffc80d3f80827be6;

    event SettingChanged(uint256 settingId);
    event CollateralRequirementChanged(IDisputable indexed disputable, uint256 id);

    struct Setting {
        string title;
        bytes content;
        IArbitrator arbitrator;
    }

    struct Action {
        IDisputable disputable;             // Address of the disputable that created the action
        uint256 disputableActionId;         // Identification number of the disputable action in the context of the disputable instance
        uint256 collateralId;               // Identification number of the collateral requirements for the given action
        uint256 settingId;                  // Identification number of the agreement setting for the given action
        address submitter;                  // Address that has submitted the action
        bool closed;                        // Whether the action was manually closed by the disputable app or not
        bytes context;                      // Link to a human-readable text giving context for the given action
        uint256 currentChallengeId;         // Total number of challenges of the action
    }

    struct Challenge {
        uint256 actionId;                   // Identification number of the action associated to the challenge
        address challenger;                 // Address that challenged the action
        uint64 endDate;                     // End date of the challenge until when the submitter can answer the challenge
        bytes context;                      // Link to a human-readable text giving context for the challenge
        uint256 settlementOffer;            // Amount of collateral tokens the challenger would accept without involving the arbitrator
        uint256 arbitratorFeeAmount;        // Amount of arbitration fees paid by the challenger in advance
        ERC20 arbitratorFeeToken;           // ERC20 token used for the arbitration fees paid by the challenger in advance
        ChallengeState state;               // Current state of the action challenge
        bool submitterFinishedEvidence;     // Whether the action submitter has finished submitting evidence for the action dispute
        bool challengerFinishedEvidence;    // Whether the action challenger has finished submitting evidence for the action dispute
        uint256 disputeId;                  // Identification number of the dispute for the arbitrator
        uint256 ruling;                     // Ruling given for the action dispute
    }

    struct CollateralRequirement {
        ERC20 token;                        // ERC20 token to be used for collateral
        uint256 actionAmount;               // Amount of collateral token that will be locked every time an action is created
        uint256 challengeAmount;            // Amount of collateral token that will be locked every time an action is challenged
        uint64 challengeDuration;           // Challenge duration in seconds, during this time window the submitter can answer the challenge
        Staking staking;                    // Staking pool cache for the collateral token
    }

    struct DisputableInfo {
        bool registered;                                                    // Whether a Disputable app is registered or not
        uint256 collateralRequirementsLength;                               // Identification number of the next collateral requirement instance
        mapping (uint256 => CollateralRequirement) collateralRequirements;  // List of collateral requirements indexed by id
    }

    StakingFactory public stakingFactory;                           // Staking factory to be used for the collateral staking pools

    uint256 private settingsLength;
    mapping (uint256 => Setting) private settings;                  // List of historic settings indexed by ID
    mapping (address => uint256) private lastSettingSignedBy;       // List of last setting signed by user

    uint256 private actionsLength;
    mapping (uint256 => Action) private actions;                    // List of actions indexed by ID
    mapping (address => DisputableInfo) private disputableInfos;    // List of disputable infos indexed by disputable address

    uint256 private challengesLength;
    mapping (uint256 => Challenge) private challenges;              // List of challenges indexed by ID
    mapping (uint256 => uint256) private challengeByDispute;        // List of challenge IDs indexed by dispute ID

    /**
    * @notice Initialize Agreement app for `_title` and content `_content`, with arbitrator `_arbitrator` and staking factory `_factory`
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _stakingFactory Staking factory to be used for the collateral staking pools
    */
    function initialize(string _title, bytes _content, IArbitrator _arbitrator, StakingFactory _stakingFactory) external {
        initialized();
        require(isContract(address(_stakingFactory)), ERROR_STAKING_FACTORY_NOT_CONTRACT);

        stakingFactory = _stakingFactory;

        settingsLength++; // Setting ID zero is considered the null setting for further validations
        _newSetting(_title, _content, _arbitrator);
    }

    /**
    * @notice Register disputable app `_disputable` setting its collateral requirements to:
    * @notice - `@tokenAmount(_collateralToken: address, _actionAmount)` for submitting collateral
    * @notice - `@tokenAmount(_collateralToken: address, _challengeAmount)` for challenging collateral
    * @param _disputableAddress Address of the disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function register(
        address _disputableAddress,
        ERC20 _collateralToken,
        uint256 _actionAmount,
        uint256 _challengeAmount,
        uint64 _challengeDuration
    )
        external
        auth(MANAGE_DISPUTABLE_ROLE)
    {
        DisputableInfo storage disputableInfo = disputableInfos[_disputableAddress];
        _ensureUnregisteredDisputable(disputableInfo);

        IDisputable disputable = IDisputable(_disputableAddress);
        disputableInfo.registered = true;
        emit DisputableAppRegistered(disputable);

        _changeCollateralRequirement(disputable, disputableInfo, _collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
        if (disputable.getAgreement() != IAgreement(this)) {
            disputable.setAgreement(IAgreement(this));
        }
    }

    /**
    * @notice Enqueues the app `_disputable` to be unregistered and tries to unregister it if possible
    * @param _disputableAddress of the disputable app to be unregistered
    */
    function unregister(address _disputableAddress) external auth(MANAGE_DISPUTABLE_ROLE) {
        DisputableInfo storage disputableInfo = disputableInfos[_disputableAddress];
        _ensureRegisteredDisputable(disputableInfo);

        disputableInfo.registered = false;
        emit DisputableAppUnregistered(IDisputable(_disputableAddress));
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

    /**
    * @notice Change Agreement to title `_title`, content `_content`, and arbitrator `_arbitrator`
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    */
    function changeSetting(string _title, bytes _content, IArbitrator _arbitrator) external auth(CHANGE_AGREEMENT_ROLE) {
        _newSetting(_title, _content, _arbitrator);
    }

    /**
    * @notice Sign the agreement
    */
    function sign() external {
        uint256 currentSettingId = _getCurrentSettingId();
        uint256 lastSettingIdSigned = lastSettingSignedBy[msg.sender];
        require(lastSettingIdSigned < currentSettingId, ERROR_SIGNER_ALREADY_SIGNED);

        lastSettingSignedBy[msg.sender] = currentSettingId;
        emit Signed(msg.sender, currentSettingId);
    }

    /**
    * @notice Register a new action for disputable `msg.sender` #`_disputableActionId` for submitter `_submitter` with context `_context`
    * @dev This function should be called from the disputable app registered on the Agreement every time a new disputable is created in the app.
    *      Each disputable action ID must be registered only once, this is how the Agreements notices about each disputable action.
    * @param _disputableActionId Identification number of the disputable action in the context of the disputable instance
    * @param _submitter Address of the user that has submitted the action
    * @param _context Link to a human-readable text giving context for the given action
    * @return Unique identification number for the created action in the context of the agreement
    */
    function newAction(uint256 _disputableActionId, bytes _context, address _submitter) external returns (uint256) {
        uint256 lastSettingIdSigned = lastSettingSignedBy[_submitter];
        require(lastSettingIdSigned >= _getCurrentSettingId(), ERROR_SIGNER_MUST_SIGN);

        DisputableInfo storage disputableInfo = disputableInfos[msg.sender];
        _ensureRegisteredDisputable(disputableInfo);

        uint256 currentCollateralRequirementId = disputableInfo.collateralRequirementsLength.sub(1);
        CollateralRequirement storage requirement = disputableInfo.collateralRequirements[currentCollateralRequirementId];
        _lockBalance(requirement.staking, _submitter, requirement.actionAmount);

        uint256 id = actionsLength++;
        Action storage action = actions[id];
        action.disputable = IDisputable(msg.sender);
        action.collateralId = currentCollateralRequirementId;
        action.disputableActionId = _disputableActionId;
        action.submitter = _submitter;
        action.context = _context;
        action.settingId = _getCurrentSettingId();

        emit ActionSubmitted(id);
        return id;
    }

    /**
    * @notice Mark action #`_actionId` as closed
    * @dev This function allows users to close actions that haven't been challenged or that were ruled in favor of the submitter
    * @param _actionId Identification number of the action to be closed
    */
    function closeAction(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_canClose(_actionId, action), ERROR_CANNOT_CLOSE_ACTION);

        (, CollateralRequirement storage requirement) = _getDisputableFor(action);
        _unlockBalance(requirement.staking, action.submitter, requirement.actionAmount);
        _closeAction(_actionId, action);
    }

    /**
    * @notice Challenge action #`_actionId`
    * @param _actionId Identification number of the action to be challenged
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _finishedEvidence Whether or not the challenger has finished submitting evidence
    * @param _context Link to a human-readable text giving context for the challenge
    */
    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bool _finishedEvidence, bytes _context) external {
        Action storage action = _getAction(_actionId);
        require(_canChallenge(_actionId, action), ERROR_CANNOT_CHALLENGE_ACTION);

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(action);
        require(_canPerformChallenge(disputable, msg.sender), ERROR_SENDER_CANNOT_CHALLENGE_ACTION);
        require(_settlementOffer <= requirement.actionAmount, ERROR_INVALID_SETTLEMENT_OFFER);

        // TODO: implement try catch
        uint256 challengeId = _createChallenge(_actionId, action, msg.sender, requirement, _settlementOffer, _finishedEvidence, _context);
        action.currentChallengeId = challengeId;
        disputable.onDisputableActionChallenged(action.disputableActionId, challengeId, msg.sender);
        emit ActionChallenged(_actionId, challengeId);
    }

    /**
    * @notice Settle challenged action #`_actionId` accepting the settlement offer
    * @param _actionId Identification number of the action to be settled
    */
    function settle(uint256 _actionId) external {
        (Action storage action, Challenge storage challenge, uint256 challengeId) = _getChallengedAction(_actionId);
        address submitter = action.submitter;

        if (msg.sender == submitter) {
            require(_canSettle(_actionId, challenge), ERROR_CANNOT_SETTLE_ACTION);
        } else {
            require(_canClaimSettlement(_actionId, challenge), ERROR_CANNOT_SETTLE_ACTION);
        }

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(action);
        uint256 actionCollateral = requirement.actionAmount;
        uint256 settlementOffer = challenge.settlementOffer;

        // The settlement offer was already checked to be up-to the collateral amount
        // However, we cap it to collateral amount to double check
        uint256 slashedAmount = settlementOffer >= actionCollateral ? actionCollateral : settlementOffer;
        uint256 unlockedAmount = actionCollateral - slashedAmount;

        address challenger = challenge.challenger;
        _unlockAndSlashBalance(requirement.staking, submitter, unlockedAmount, challenger, slashedAmount);
        _transfer(requirement.token, challenger, requirement.challengeAmount);
        _transfer(challenge.arbitratorFeeToken, challenger, challenge.arbitratorFeeAmount);

        challenge.state = ChallengeState.Settled;
        disputable.onDisputableActionRejected(action.disputableActionId);
        emit ActionSettled(_actionId, challengeId);
        _closeAction(_actionId, action);
    }

    /**
    * @notice Dispute challenged action #`_actionId` raising it to the arbitrator
    * @dev It can only be disputed if the action was previously challenged
    * @param _actionId Identification number of the action to be disputed
    * @param _submitterFinishedEvidence Whether or not the submitter finished submitting evidence
    */
    function disputeAction(uint256 _actionId, bool _submitterFinishedEvidence) external {
        (Action storage action, Challenge storage challenge, uint256 challengeId) = _getChallengedAction(_actionId);
        require(_canDispute(_actionId, challenge), ERROR_CANNOT_DISPUTE_ACTION);

        address submitter = action.submitter;
        require(msg.sender == submitter, ERROR_SENDER_NOT_ALLOWED);

        (, bytes memory content, IArbitrator arbitrator) = _getSettingFor(action);
        bytes memory metadata = _buildDisputeMetadata(action, content);
        uint256 disputeId = _createDispute(action, challenge, arbitrator, metadata);
        _submitEvidence(arbitrator, disputeId, submitter, action.context, _submitterFinishedEvidence);
        _submitEvidence(arbitrator, disputeId, challenge.challenger, challenge.context, challenge.challengerFinishedEvidence);

        challenge.state = ChallengeState.Disputed;
        challenge.disputeId = disputeId;
        challenge.submitterFinishedEvidence = _submitterFinishedEvidence;
        challengeByDispute[disputeId] = challengeId;
        emit ActionDisputed(_actionId, challengeId);
    }

    /**
    * @notice Submit evidence for the action associated to dispute #`_disputeId`
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _evidence Data submitted for the evidence related to the dispute
    * @param _finished Whether or not the submitter has finished submitting evidence
    */
    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (uint256 _actionId, Action storage action, , Challenge storage challenge) = _getDisputedAction(_disputeId);
        require(_isDisputed(_actionId, challenge), ERROR_CANNOT_SUBMIT_EVIDENCE);

        (, , IArbitrator arbitrator) = _getSettingFor(action);
        bool finished = _registerEvidence(action, challenge, msg.sender, _finished);
        _submitEvidence(arbitrator, _disputeId, msg.sender, _evidence, _finished);

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
        (uint256 actionId, Action storage action, uint256 challengeId, Challenge storage challenge) = _getDisputedAction(_disputeId);
        require(_canRuleDispute(actionId, challenge), ERROR_CANNOT_RULE_ACTION);

        (, , IArbitrator arbitrator) = _getSettingFor(action);
        require(arbitrator == IArbitrator(msg.sender), ERROR_SENDER_NOT_ALLOWED);

        challenge.ruling = _ruling;
        emit Ruled(arbitrator, _disputeId, _ruling);

        // TODO: implement try catch
        if (_ruling == DISPUTES_RULING_SUBMITTER) {
            _rejectChallenge(actionId, action, challengeId, challenge);
        } else if (_ruling == DISPUTES_RULING_CHALLENGER) {
            _acceptChallenge(actionId, action, challengeId, challenge);
        } else {
            _voidChallenge(actionId, action, challengeId, challenge);
        }
    }

    // Getter fns

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address being queried
    * @return lastSettingIdSigned Identification number of the last agreement setting signed by the signer
    * @return mustSign Whether or not the requested signer must sign the current agreement setting or not
    */
    function getSigner(address _signer) external view returns (uint256 lastSettingIdSigned, bool mustSign) {
        (lastSettingIdSigned, mustSign) = _getSigner(_signer);
    }

    /**
    * @dev Tell the information related to an action
    * @param _actionId Identification number of the action being queried
    * @return disputable Address of the disputable that created the action
    * @return disputableActionId Identification number of the disputable action in the context of the disputable
    * @return collateralId Identification number of the collateral requirements for the given action
    * @return submitter Address that has submitted the action
    * @return closed Whether the action was manually closed by the disputable app or not
    * @return context Link to a human-readable text giving context for the given action
    * @return currentChallengeId Identification number of the current challenge associated to the queried action
    */
    function getAction(uint256 _actionId) external view
        returns (
            address disputable,
            uint256 disputableActionId,
            uint256 collateralId,
            address submitter,
            bool closed,
            bytes context,
            uint256 currentChallengeId
        )
    {
        Action storage action = actions[_actionId];

        disputable = action.disputable;
        disputableActionId = action.disputableActionId;
        collateralId = action.collateralId;
        submitter = action.submitter;
        closed = action.closed;
        context = action.context;
        currentChallengeId = action.currentChallengeId;
    }

    /**
    * @dev Tell the information related to an action challenge
    * @param _challengeId Identification number of the challenge being queried
    * @return actionId Identification number of the action associated to the challenge
    * @return challenger Address that challenged the action
    * @return endDate Datetime until when the action submitter can answer the challenge
    * @return context Link to a human-readable text giving context for the challenge
    * @return settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @return arbitratorFeeAmount Amount of arbitration fees paid by the challenger in advance in case the challenge is raised to the arbitrator
    * @return arbitratorFeeToken ERC20 token used for the arbitration fees paid by the challenger in advance
    * @return state Current state of the action challenge
    * @return submitterFinishedEvidence Whether the action submitter has finished submitting evidence for the action dispute
    * @return challengerFinishedEvidence Whether the action challenger has finished submitting evidence for the action dispute
    * @return disputeId Identification number of the dispute for the arbitrator
    * @return ruling Ruling given for the action dispute
    */
    function getChallenge(uint256 _challengeId) external view
        returns (
            uint256 actionId,
            address challenger,
            uint64 endDate,
            bytes context,
            uint256 settlementOffer,
            uint256 arbitratorFeeAmount,
            ERC20 arbitratorFeeToken,
            ChallengeState state,
            bool submitterFinishedEvidence,
            bool challengerFinishedEvidence,
            uint256 disputeId,
            uint256 ruling
        )
    {
        Challenge storage challenge = challenges[_challengeId];

        actionId = challenge.actionId;
        challenger = challenge.challenger;
        endDate = challenge.endDate;
        context = challenge.context;
        settlementOffer = challenge.settlementOffer;
        arbitratorFeeAmount = challenge.arbitratorFeeAmount;
        arbitratorFeeToken = challenge.arbitratorFeeToken;
        state = challenge.state;
        submitterFinishedEvidence = challenge.submitterFinishedEvidence;
        challengerFinishedEvidence = challenge.challengerFinishedEvidence;
        disputeId = challenge.disputeId;
        ruling = challenge.ruling;
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
    * @return title String indicating a short description
    * @return content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @return arbitrator Address of the IArbitrator that will be used to resolve disputes
    */
    function getSetting(uint256 _settingId) external view returns (string title, bytes content, IArbitrator arbitrator) {
        Setting storage setting = settings[_settingId];
        title = setting.title;
        content = setting.content;
        arbitrator = setting.arbitrator;
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
        uint256 length = disputableInfo.collateralRequirementsLength;
        currentCollateralRequirementId = length == 0 ? 0 : length - 1;
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
    function getCollateralRequirement(address _disputable, uint256 _collateralId) external view
        returns (
            ERC20 collateralToken,
            uint256 actionAmount,
            uint256 challengeAmount,
            uint64 challengeDuration
        )
    {
        DisputableInfo storage disputableInfo = disputableInfos[_disputable];
        CollateralRequirement storage collateral = disputableInfo.collateralRequirements[_collateralId];
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
        (, , IArbitrator arbitrator) = _getSettingFor(action);
        Challenge storage challenge = challenges[action.currentChallengeId];
        ERC20 challengerFeeToken = challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = challenge.arbitratorFeeAmount;

        (, feeToken, missingFees, totalFees) = _getMissingArbitratorFees(arbitrator, challengerFeeToken, challengerFeeAmount);
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
    * @dev Tell whether an action can be challenged or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function canChallenge(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canChallenge(_actionId, action);
    }

    /**
    * @dev Tell whether an action can be closed or not, i.e. if its not being challenged or if it was ruled in favor of the submitter
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be closed, false otherwise
    */
    function canClose(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canClose(_actionId, action);
    }

    /**
    * @dev Tell whether an action can be settled or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be settled, false otherwise
    */
    function canSettle(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canSettle(_actionId, challenge);
    }

    /**
    * @dev Tell whether an action can be disputed or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can be disputed, false otherwise
    */
    function canDispute(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canDispute(_actionId, challenge);
    }

    /**
    * @dev Tell whether an action settlement can be claimed or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action settlement can be claimed, false otherwise
    */
    function canClaimSettlement(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canClaimSettlement(_actionId, challenge);
    }

    /**
    * @dev Tell whether an action dispute can be ruled or not
    * @param _actionId Identification number of the action to be queried
    * @return True if the action dispute can be ruled, false otherwise
    */
    function canRuleDispute(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canRuleDispute(_actionId, challenge);
    }

    // Internal fns

    /**
    * @dev Close an action
    * @param _actionId Identification number of the action being closed
    * @param _action Action instance being closed
    */
    function _closeAction(uint256 _actionId, Action storage _action) internal {
        _action.closed = true;
        emit ActionClosed(_actionId);
    }

    /**
    * @dev Challenge an action
    * @param _actionId Identification number of the action being challenged
    * @param _action Action instance being challenged
    * @param _challenger Address challenging the action
    * @param _requirement Collateral requirement to be used for the challenge
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _finishedSubmittingEvidence Whether or not the challenger has finished submitting evidence
    * @param _context Link to a human-readable text giving context for the challenge
    * @return Identification number for the created challenge
    */
    function _createChallenge(
        uint256 _actionId,
        Action storage _action,
        address _challenger,
        CollateralRequirement storage _requirement,
        uint256 _settlementOffer,
        bool _finishedSubmittingEvidence,
        bytes _context
    )
        internal
        returns (uint256)
    {
        // Store challenge
        uint256 challengeId = challengesLength++;
        Challenge storage challenge = challenges[challengeId];
        challenge.actionId = _actionId;
        challenge.challenger = _challenger;
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.endDate = getTimestamp64().add(_requirement.challengeDuration);
        challenge.challengerFinishedEvidence = _finishedSubmittingEvidence;

        // Transfer challenge collateral
        _transferFrom(_requirement.token, _challenger, _requirement.challengeAmount);

        // Transfer half of the Arbitrator fees
        (, , IArbitrator arbitrator) = _getSettingFor(_action);
        (, ERC20 feeToken, uint256 feeAmount) = arbitrator.getDisputeFees();
        uint256 arbitratorFees = feeAmount / 2;
        challenge.arbitratorFeeToken = feeToken;
        challenge.arbitratorFeeAmount = arbitratorFees;
        _transferFrom(feeToken, _challenger, arbitratorFees);
        return challengeId;
    }

    /**
    * @dev Dispute an action
    * @param _action Action instance to be disputed
    * @param _challenge Challenge instance being disputed
    * @return _arbitrator Address of the IArbitrator associated to the disputed action
    * @return _metadata Metadata content to be used for the dispute
    * @return Identification number of the dispute created in the arbitrator
    */
    function _createDispute(Action storage _action, Challenge storage _challenge, IArbitrator _arbitrator, bytes memory _metadata)
        internal
        returns (uint256)
    {
        // Compute missing fees for dispute
        ERC20 challengerFeeToken = _challenge.arbitratorFeeToken;
        uint256 challengerFeeAmount = _challenge.arbitratorFeeAmount;
        (address recipient, ERC20 feeToken, uint256 missingFees, uint256 totalFees) = _getMissingArbitratorFees(
            _arbitrator,
            challengerFeeToken,
            challengerFeeAmount
        );

        // Transfer submitter arbitration fees
        address submitter = _action.submitter;
        _transferFrom(feeToken, submitter, missingFees);

        // Create dispute. We are first setting the allowance to zero in case there are remaining fees in the arbitrator.
        _approveArbitratorFeeTokens(feeToken, recipient, 0);
        _approveArbitratorFeeTokens(feeToken, recipient, totalFees);
        uint256 disputeId = _arbitrator.createDispute(DISPUTES_POSSIBLE_OUTCOMES, _metadata);

        // Return arbitrator fees to challenger if necessary
        if (challengerFeeToken != feeToken) {
            _transfer(challengerFeeToken, _challenge.challenger, challengerFeeAmount);
        }

        return disputeId;
    }

    /**
    * @dev Register evidence for a disputed action
    * @param _action Action instance to submit evidence for
    * @param _challenge Current challenge associated to the given action
    * @param _submitter Address of submitting the evidence
    * @param _finished Whether both parties have finished submitting evidence or not
    */
    function _registerEvidence(Action storage _action, Challenge storage _challenge, address _submitter, bool _finished)
        internal
        returns (bool)
    {
        bool submitterFinishedEvidence = _challenge.submitterFinishedEvidence;
        bool challengerFinishedEvidence = _challenge.challengerFinishedEvidence;

        if (_submitter == _action.submitter) {
            require(!submitterFinishedEvidence, ERROR_SUBMITTER_FINISHED_EVIDENCE);
            if (_finished) {
                submitterFinishedEvidence = _finished;
                _challenge.submitterFinishedEvidence = _finished;
            }
        } else if (_submitter == _challenge.challenger) {
            require(!challengerFinishedEvidence, ERROR_CHALLENGER_FINISHED_EVIDENCE);
            if (_finished) {
                submitterFinishedEvidence = _finished;
                _challenge.challengerFinishedEvidence = _finished;
            }
        } else {
            revert(ERROR_SENDER_NOT_ALLOWED);
        }

        return submitterFinishedEvidence && challengerFinishedEvidence;
    }

    /**
    * @dev Log an evidence for an action
    * @param _arbitrator IArbitrator submitting the evidence for
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @param _submitter Address of submitting the evidence
    * @param _evidence Evidence to be logged
    * @param _finished Whether the evidence submitter has finished submitting evidence or not
    */
    function _submitEvidence(IArbitrator _arbitrator, uint256 _disputeId, address _submitter, bytes _evidence, bool _finished) internal {
        if (_evidence.length > 0) {
            emit EvidenceSubmitted(_arbitrator, _disputeId, _submitter, _evidence, _finished);
        }
    }

    /**
    * @dev Accept a challenge proposed against an action
    * @param _actionId Identification number of the action to be rejected
    * @param _action Action instance to be rejected
    * @param _challengeId Current challenge identification number associated to the given action
    * @param _challenge Current challenge associated to the given action
    */
    function _acceptChallenge(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Accepted;

        address challenger = _challenge.challenger;
        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        _slashBalance(requirement.staking, _action.submitter, challenger, requirement.actionAmount);
        _transfer(requirement.token, challenger, requirement.challengeAmount);
        disputable.onDisputableActionRejected(_action.disputableActionId);
        emit ActionRejected(_actionId, _challengeId);

        _closeAction(_actionId, _action);
    }

    /**
    * @dev Reject a challenge proposed against an action
    * @param _actionId Identification number of the action to be accepted
    * @param _action Action instance to be accepted
    * @param _challengeId Current challenge identification number associated to the given action
    * @param _challenge Current challenge associated to the given action
    */
    function _rejectChallenge(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Rejected;

        address submitter = _action.submitter;
        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        _transfer(requirement.token, submitter, requirement.challengeAmount);
        disputable.onDisputableActionAllowed(_action.disputableActionId);
        emit ActionAccepted(_actionId, _challengeId);
    }

    /**
    * @dev Void a challenge proposed against an action
    * @param _actionId Identification number of the action to be voided
    * @param _action Action instance to be voided
    * @param _challengeId Current challenge identification number associated to the given action
    * @param _challenge Current challenge associated to the given action
    */
    function _voidChallenge(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Voided;

        (IDisputable disputable, CollateralRequirement storage requirement) = _getDisputableFor(_action);
        _transfer(requirement.token, _challenge.challenger, requirement.challengeAmount);
        disputable.onDisputableActionVoided(_action.disputableActionId);
        emit ActionVoided(_actionId, _challengeId);
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

        _staking.lock(_user, address(this), _amount);
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

        _staking.unlock(_user, address(this), _amount);
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

        _staking.slashAndUnstake(_user, _challenger, _amount);
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
            _staking.slashAndUnstake(_user, _challenger, _slashAmount);
            _staking.unlock(_user, address(this), _unlockAmount);
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
    * @dev Change Agreement settings
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    */
    function _newSetting(string _title, bytes _content, IArbitrator _arbitrator) internal {
        require(isContract(address(_arbitrator)), ERROR_ARBITRATOR_NOT_CONTRACT);

        uint256 id = settingsLength++;
        settings[id] = Setting({ title: _title, content: _content, arbitrator: _arbitrator });
        emit SettingChanged(id);
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
        uint256 id = _disputableInfo.collateralRequirementsLength++;
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
    * @dev Tell whether an action can be challenged or not
    * @param _actionId Identification number of the action to be queried
    * @param _action Action instance to be queried
    * @return True if the action can be challenged, false otherwise
    */
    function _canChallenge(uint256 _actionId, Action storage _action) internal view returns (bool) {
        return _canProceed(_actionId, _action) && _action.disputable.canChallenge(_action.disputableActionId);
    }

    /**
    * @dev Tell whether an action can be closed or not
    * @param _actionId Identification number of the action to be queried
    * @param _action Action instance to be queried
    * @return True if the action can be closed, false otherwise
    */
    function _canClose(uint256 _actionId, Action storage _action) internal view returns (bool) {
        return _canProceed(_actionId, _action) && _action.disputable.canClose(_action.disputableActionId);
    }

    /**
    * @dev Tell whether an action can proceed, i.e. if it was not closed nor challenged, or if it was refused or ruled in favor of the submitter
    * @param _actionId Identification number of the action to be queried
    * @param _action Action instance to be queried
    * @return True if the action can proceed, false otherwise
    */
    function _canProceed(uint256 _actionId, Action storage _action) internal view returns (bool) {
        uint256 challengeId = _action.currentChallengeId;
        Challenge storage challenge = challenges[challengeId];

        // If the action was already closed, return false
        if (_action.closed) {
            return false;
        }

        // If the action was not challenged, return true
        if (!_existChallenge(_actionId, challengeId, challenge)) {
            return true;
        }

        // If the action was challenged but ruled in favor of the submitter or refused, return true
        ChallengeState state = challenge.state;
        return state == ChallengeState.Rejected || state == ChallengeState.Voided;
    }

    /**
    * @dev Tell whether an action can be settled or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action can be settled, false otherwise
    */
    function _canSettle(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        return _isWaitingChallengeAnswer(_actionId, _challenge);
    }

    /**
    * @dev Tell whether an action can be disputed or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action can be disputed, false otherwise
    */
    function _canDispute(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        if (!_isWaitingChallengeAnswer(_actionId, _challenge)) {
            return false;
        }

        return _challenge.endDate > getTimestamp64();
    }

    /**
    * @dev Tell whether an action settlement can be claimed or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action settlement can be claimed, false otherwise
    */
    function _canClaimSettlement(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        if (!_isWaitingChallengeAnswer(_actionId, _challenge)) {
            return false;
        }

        return getTimestamp64() >= _challenge.endDate;
    }

    /**
    * @dev Tell whether an action dispute can be ruled or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action dispute can be ruled, false otherwise
    */
    function _canRuleDispute(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        return _isDisputed(_actionId, _challenge);
    }

    /**
    * @dev Tell whether an action is challenged and it's waiting to be answered or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action is challenged and it's waiting to be answered, false otherwise
    */
    function _isWaitingChallengeAnswer(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        return _actionId == _challenge.actionId && _challenge.state == ChallengeState.Waiting;
    }

    /**
    * @dev Tell whether an action is disputed or not
    * @param _actionId Identification number of the action to be queried
    * @param _challenge Current challenge instance associated to the action being queried
    * @return True if the action is disputed, false otherwise
    */
    function _isDisputed(uint256 _actionId, Challenge storage _challenge) internal view returns (bool) {
        return _actionId == _challenge.actionId && _challenge.state == ChallengeState.Disputed;
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
    * @dev Fetch an action instance along with its current challenge by identification number
    * @param _actionId Identification number of the action being queried
    * @return action Action instance associated to the given identification number
    * @return challenge Current challenge instance associated to the given action
    * @return challengeId Identification number of the challenge associated to the given action
    */
    function _getChallengedAction(uint256 _actionId) internal view
        returns (
            Action storage action,
            Challenge storage challenge,
            uint256 challengeId
        )
    {
        action = _getAction(_actionId);
        challengeId = action.currentChallengeId;
        require(_existChallenge(challengeId), ERROR_CHALLENGE_DOES_NOT_EXIST);
        challenge = challenges[challengeId];
    }

    /**
    * @dev Fetch an action instance along with its current challenge by a dispute identification number
    * @param _disputeId Identification number of the dispute for the arbitrator
    * @return actionId Identification number of the action associated to the given dispute identification number
    * @return action Action instance associated to the given dispute identification number
    * @return challengeId Identification number of the challenge associated to the given dispute identification number
    * @return challenge Current challenge instance associated to the given dispute identification number
    */
    function _getDisputedAction(uint256 _disputeId) internal view
        returns (
            uint256 actionId,
            Action storage action,
            uint256 challengeId,
            Challenge storage challenge
        )
    {
        challengeId = challengeByDispute[_disputeId];
        require(_existChallenge(challengeId), ERROR_DISPUTE_DOES_NOT_EXIST);

        challenge = challenges[challengeId];
        actionId = challenge.actionId;
        action = _getAction(actionId);
        require(action.currentChallengeId == challengeId, ERROR_DISPUTE_DOES_NOT_EXIST);
    }

    /**
    * @dev Tell the current Agreement setting identification number
    * @return Identification number of the current Agreement setting
    */
    function _getCurrentSettingId() internal view returns (uint256) {
        return settingsLength - 1; // an initial setting is created during initialization, thus length will be always greater than 0
    }

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address being queried
    * @return lastSettingIdSigned Identification number of the last agreement setting signed by the signer
    * @return mustSign Whether or not the requested signer must sign the current agreement setting or not
    */
    function _getSigner(address _signer) internal view returns (uint256 lastSettingIdSigned, bool mustSign) {
        lastSettingIdSigned = lastSettingSignedBy[_signer];
        mustSign = lastSettingIdSigned < _getCurrentSettingId();
    }

    /**
    * @dev Tell the information related to a setting
    * @param _action Action instance querying the Agreement setting of
    * @return title String indicating a short description
    * @return content Link to a human-readable text that describes the initial rules for the Agreements instance
    * @return arbitrator Address of the IArbitrator that will be used to resolve disputes
    */
    function _getSettingFor(Action storage _action) internal view returns (string title, bytes content, IArbitrator arbitrator) {
        uint256 settingId = _action.settingId;
        require(settingId < settingsLength, ERROR_MISSING_AGREEMENT_SETTING);

        Setting storage setting = settings[settingId];
        title = setting.title;
        content = setting.content;
        arbitrator = setting.arbitrator;
    }

    /**
    * @dev Tell the disputable-related information about a disputable action
    * @param _action Action instance being queried
    * @return disputable Disputable instance associated to the action
    * @return requirement Collateral requirements of the disputable app associated to the action
    */
    function _getDisputableFor(Action storage _action) internal view
        returns (
            IDisputable disputable,
            CollateralRequirement storage requirement
        )
    {
        disputable = _action.disputable;
        uint256 collateralId = _action.collateralId;
        DisputableInfo storage disputableInfo = disputableInfos[address(disputable)];
        requirement = disputableInfo.collateralRequirements[collateralId];
        require(collateralId < disputableInfo.collateralRequirementsLength, ERROR_MISSING_COLLATERAL_REQUIREMENT);
    }

    /**
    * @dev Tell whether a challenge exists for an action or not
    * @param _actionId Identification number of the action being queried
    * @param _challengeId Identification number of the challenge being queried
    * @param _challenge Challenge instance associated to the challenge identification number being queried
    * @return True if the requested challenge exists, false otherwise
    */
    function _existChallenge(uint256 _actionId, uint256 _challengeId, Challenge storage _challenge) internal view returns (bool) {
        return _existChallenge(_challengeId) && _actionId == _challenge.actionId;
    }

    /**
    * @dev Tell whether a challenge exists or not
    * @param _challengeId Identification number of the challenge being queried
    * @return True if the requested challenge exists, false otherwise
    */
    function _existChallenge(uint256 _challengeId) internal view returns (bool) {
        return _challengeId < challengesLength;
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
    * @param _arbitrator Arbitrator querying the missing fees of
    * @param _challengerFeeToken ERC20 token used for the arbitration fees paid by the challenger in advance
    * @param _challengerFeeAmount Amount of arbitration fees paid by the challenger in advance in case the challenge is raised to the arbitrator
    * @return Address where the arbitration fees must be transferred to
    * @return ERC20 token to be used for the arbitration fees
    * @return Amount of arbitration fees missing to be able to dispute the action
    * @return Total amount of arbitration fees to be paid to be able to dispute the action
    */
    function _getMissingArbitratorFees(IArbitrator _arbitrator, ERC20 _challengerFeeToken, uint256 _challengerFeeAmount) internal view
        returns (address, ERC20, uint256, uint256)
    {
        (address recipient, ERC20 feeToken, uint256 disputeFees) = _arbitrator.getDisputeFees();

        uint256 missingFees;
        if (_challengerFeeToken == feeToken) {
            missingFees = _challengerFeeAmount >= disputeFees ? 0 : (disputeFees - _challengerFeeAmount);
        } else {
            missingFees = disputeFees;
        }

        return (recipient, feeToken, missingFees, disputeFees);
    }

    function _buildDisputeMetadata(Action storage _action, bytes memory _content) internal view returns (bytes memory) {
        bytes memory metadata = new bytes(10);
        assembly { mstore(add(metadata, 32), 0x61677265656d656e747300000000000000000000000000000000000000000000) }

        return metadata
                .pipe(address(_action.disputable))
                .pipe(_action.disputableActionId)
                .pipe(_content);
    }
}
