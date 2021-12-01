/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/apps/disputable/IAgreement.sol";
import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/os/contracts/common/ConversionHelpers.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";

import "@aragon/staking/interfaces/0.4/IStaking.sol";
import "@aragon/staking/interfaces/0.4/IStakingFactory.sol";
import "@aragon/staking/interfaces/0.4/ILockManager.sol";

import "./arbitration/IArbitrable.sol";
import "./arbitration/IAragonAppFeesCashier.sol";


contract Agreement is IArbitrable, ILockManager, IAgreement, IACLOracle, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;

    /* Arbitrator outcomes constants */
    uint256 internal constant DISPUTES_POSSIBLE_OUTCOMES = 2;
    // Note that Aragon Court treats the possible outcomes as arbitrary numbers, leaving the Arbitrable (us) to define how to understand them.
    // Some outcomes [0, 1, and 2] are reserved by Aragon Court: "missing", "leaked", and "refused", respectively.
    // This Arbitrable introduces the concept of the challenger/submitter (a binary outcome) as 3/4.
    // Note that Aragon Court emits the lowest outcome in the event of a tie, and so for us, we prefer the challenger.
    uint256 internal constant DISPUTES_RULING_CHALLENGER = 3;
    uint256 internal constant DISPUTES_RULING_SUBMITTER = 4;

    /* Validation errors */
    string internal constant ERROR_SENDER_NOT_ALLOWED = "AGR_SENDER_NOT_ALLOWED";
    string internal constant ERROR_SIGNER_MUST_SIGN = "AGR_SIGNER_MUST_SIGN";
    string internal constant ERROR_SIGNER_ALREADY_SIGNED = "AGR_SIGNER_ALREADY_SIGNED";
    string internal constant ERROR_INVALID_SIGNING_SETTING = "AGR_INVALID_SIGNING_SETTING";
    string internal constant ERROR_INVALID_SETTLEMENT_OFFER = "AGR_INVALID_SETTLEMENT_OFFER";
    string internal constant ERROR_ACTION_DOES_NOT_EXIST = "AGR_ACTION_DOES_NOT_EXIST";
    string internal constant ERROR_CHALLENGE_DOES_NOT_EXIST = "AGR_CHALLENGE_DOES_NOT_EXIST";
    string internal constant ERROR_TOKEN_DEPOSIT_FAILED = "AGR_TOKEN_DEPOSIT_FAILED";
    string internal constant ERROR_TOKEN_TRANSFER_FAILED = "AGR_TOKEN_TRANSFER_FAILED";
    string internal constant ERROR_TOKEN_APPROVAL_FAILED = "AGR_TOKEN_APPROVAL_FAILED";
    string internal constant ERROR_TOKEN_NOT_CONTRACT = "AGR_TOKEN_NOT_CONTRACT";
    string internal constant ERROR_SETTING_DOES_NOT_EXIST = "AGR_SETTING_DOES_NOT_EXIST";
    string internal constant ERROR_ARBITRATOR_NOT_CONTRACT = "AGR_ARBITRATOR_NOT_CONTRACT";
    string internal constant ERROR_STAKING_FACTORY_NOT_CONTRACT = "AGR_STAKING_FACTORY_NOT_CONTRACT";
    string internal constant ERROR_ACL_ORACLE_SIGNER_MISSING = "AGR_ACL_ORACLE_SIGNER_MISSING";
    string internal constant ERROR_ACL_ORACLE_SIGNER_NOT_ADDRESS = "AGR_ACL_ORACLE_SIGNER_NOT_ADDR";

    /* Disputable related errors */
    string internal constant ERROR_SENDER_CANNOT_CHALLENGE_ACTION = "AGR_SENDER_CANT_CHALLENGE_ACTION";
    string internal constant ERROR_DISPUTABLE_NOT_CONTRACT = "AGR_DISPUTABLE_NOT_CONTRACT";
    string internal constant ERROR_DISPUTABLE_NOT_ACTIVE = "AGR_DISPUTABLE_NOT_ACTIVE";
    string internal constant ERROR_DISPUTABLE_ALREADY_ACTIVE = "AGR_DISPUTABLE_ALREADY_ACTIVE";
    string internal constant ERROR_COLLATERAL_REQUIREMENT_DOES_NOT_EXIST = "AGR_COL_REQ_DOES_NOT_EXIST";

    /* Action related errors */
    string internal constant ERROR_CANNOT_CHALLENGE_ACTION = "AGR_CANNOT_CHALLENGE_ACTION";
    string internal constant ERROR_CANNOT_CLOSE_ACTION = "AGR_CANNOT_CLOSE_ACTION";
    string internal constant ERROR_CANNOT_SETTLE_ACTION = "AGR_CANNOT_SETTLE_ACTION";
    string internal constant ERROR_CANNOT_DISPUTE_ACTION = "AGR_CANNOT_DISPUTE_ACTION";
    string internal constant ERROR_CANNOT_RULE_ACTION = "AGR_CANNOT_RULE_ACTION";
    string internal constant ERROR_CANNOT_SUBMIT_EVIDENCE = "AGR_CANNOT_SUBMIT_EVIDENCE";
    string internal constant ERROR_CANNOT_CLOSE_EVIDENCE_PERIOD = "AGR_CANNOT_CLOSE_EVIDENCE_PERIOD";

    // This role will be checked against the Disputable app when users try to challenge actions.
    // It is expected to be configured per Disputable app. For reference, see `canPerformChallenge()`.
    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_AGREEMENT_ROLE = keccak256("CHANGE_AGREEMENT_ROLE");
    bytes32 public constant CHANGE_AGREEMENT_ROLE = 0x07813bca4905795fa22783885acd0167950db28f2d7a40b70f666f429e19f1d9;

    // bytes32 public constant MANAGE_DISPUTABLE_ROLE = keccak256("MANAGE_DISPUTABLE_ROLE");
    bytes32 public constant MANAGE_DISPUTABLE_ROLE = 0x2309a8cbbd5c3f18649f3b7ac47a0e7b99756c2ac146dda1ffc80d3f80827be6;

    event Signed(address indexed signer, uint256 settingId);
    event SettingChanged(uint256 settingId);
    event AppFeesCashierSynced(IAragonAppFeesCashier newAppFeesCashier);
    event DisputableAppActivated(address indexed disputable);
    event DisputableAppDeactivated(address indexed disputable);
    event CollateralRequirementChanged(address indexed disputable, uint256 collateralRequirementId);

    struct Setting {
        IArbitrator arbitrator;
        IAragonAppFeesCashier aragonAppFeesCashier; // Fees cashier to deposit action fees (linked to the selected arbitrator)
        string title;
        bytes content;
    }

    struct CollateralRequirement {
        ERC20 token;                        // ERC20 token to be used for collateral
        uint64 challengeDuration;           // Challenge duration, during which the submitter can raise a dispute
        uint256 actionAmount;               // Amount of collateral token to be locked from the submitter's staking pool when creating actions
        uint256 challengeAmount;            // Amount of collateral token to be locked from the challenger's own balance when challenging actions
        IStaking staking;                   // Staking pool cache for the collateral token -- will never change
    }

    struct DisputableInfo {
        bool activated;                                                     // Whether the Disputable app is active
        uint256 nextCollateralRequirementsId;                               // Identification number of the next collateral requirement
        mapping (uint256 => CollateralRequirement) collateralRequirements;  // List of collateral requirements indexed by ID
    }

    struct Action {
        DisputableAragonApp disputable;     // Disputable app that created the action
        uint256 disputableActionId;         // Identification number of the action on the Disputable app
        uint256 collateralRequirementId;    // Identification number of the collateral requirement applicable to the action
        uint256 settingId;                  // Identification number of the agreement setting applicable to the action
        address submitter;                  // Address that submitted the action
        bool closed;                        // Whether the action is closed (and cannot be challenged anymore)
        bytes context;                      // Link to a human-readable context for the given action
        uint256 lastChallengeId;            // Identification number of the action's most recent challenge, if any
    }

    struct ArbitratorFees {
        ERC20 token;                        // ERC20 token used for the arbitration fees
        uint256 amount;                     // Amount of arbitration fees
    }

    struct Challenge {
        uint256 actionId;                        // Identification number of the action associated to the challenge
        address challenger;                      // Address that challenged the action
        uint64 endDate;                          // Last date the submitter can raise a dispute against the challenge
        bytes context;                           // Link to a human-readable context for the challenge
        uint256 settlementOffer;                 // Amount of collateral tokens the challenger would accept without involving the arbitrator
        ArbitratorFees challengerArbitratorFees; // Arbitration fees paid by the challenger (in advance)
        ArbitratorFees submitterArbitratorFees;  // Arbitration fees paid by the submitter (on dispute creation)
        ChallengeState state;                    // Current state of the challenge
        bool submitterFinishedEvidence;          // Whether the action submitter has finished submitting evidence for the raised dispute
        bool challengerFinishedEvidence;         // Whether the action challenger has finished submitting evidence for the raised dispute
        uint256 disputeId;                       // Identification number of the dispute on the arbitrator
        uint256 ruling;                          // Ruling given from the arbitrator for the dispute
    }

    IStakingFactory public stakingFactory;                           // Staking factory, for finding each collateral token's staking pool

    uint256 private nextSettingId;
    mapping (uint256 => Setting) private settings;                  // List of historic agreement settings indexed by ID (starting at 1)
    mapping (address => uint256) private lastSettingSignedBy;       // Mapping of address => last agreement setting signed
    mapping (address => DisputableInfo) private disputableInfos;    // Mapping of Disputable app => disputable infos

    uint256 private nextActionId;
    mapping (uint256 => Action) private actions;                    // List of actions indexed by ID (starting at 1)

    uint256 private nextChallengeId;
    mapping (uint256 => Challenge) private challenges;              // List of challenges indexed by ID (starting at 1)
    mapping (uint256 => uint256) private challengeByDispute;        // Mapping of arbitrator's dispute ID => challenge ID

    /**
    * @notice Initialize Agreement for "`_title`" and content "`_content`", with arbitrator `_arbitrator` and staking factory `_factory`
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _setAppFeesCashier Whether to integrate with the IArbitrator's fee cashier
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the initial rules for the Agreement
    * @param _stakingFactory Staking factory for finding each collateral token's staking pool
    */
    function initialize(
        IArbitrator _arbitrator,
        bool _setAppFeesCashier,
        string _title,
        bytes _content,
        IStakingFactory _stakingFactory
    )
        external
    {
        initialized();
        require(isContract(address(_stakingFactory)), ERROR_STAKING_FACTORY_NOT_CONTRACT);

        stakingFactory = _stakingFactory;

        nextSettingId = 1;   // Agreement setting ID zero is considered the null agreement setting for further validations
        nextActionId = 1;    // Action ID zero is considered the null action for further validations
        nextChallengeId = 1; // Challenge ID zero is considered the null challenge for further validations
        _newSetting(_arbitrator, _setAppFeesCashier, _title, _content);
    }

    /**
    * @notice Update Agreement to title "`_title`" and content "`_content`", with arbitrator `_arbitrator`
    * @dev Initialization check is implicitly provided by the `auth()` modifier
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _setAppFeesCashier Whether to integrate with the IArbitrator's fee cashier
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the new rules for the Agreement
    */
    function changeSetting(
        IArbitrator _arbitrator,
        bool _setAppFeesCashier,
        string _title,
        bytes _content
    )
        external
        auth(CHANGE_AGREEMENT_ROLE)
    {
        _newSetting(_arbitrator, _setAppFeesCashier, _title, _content);
    }

    /**
    * @notice Sync app fees cashier address
    * @dev The app fees cashier address is being cached in the contract to save gas.
    *      This can be called permission-lessly to allow any account to re-sync the cashier when changed by the arbitrator.
    *      Initialization check is implicitly provided by `_getSetting()`, as valid settings can only be created after initialization.
    */
    function syncAppFeesCashier() external {
        Setting storage setting = _getSetting(_getCurrentSettingId());
        IAragonAppFeesCashier newAppFeesCashier = _getArbitratorFeesCashier(setting.arbitrator);
        IAragonAppFeesCashier currentAppFeesCashier = setting.aragonAppFeesCashier;

        // Sync the app fees cashier only if there was one set before and it's different from the arbitrator's current one
        if (currentAppFeesCashier != IAragonAppFeesCashier(0) && currentAppFeesCashier != newAppFeesCashier) {
            setting.aragonAppFeesCashier = newAppFeesCashier;
            emit AppFeesCashierSynced(newAppFeesCashier);
        }
    }

    /**
    * @notice Activate Disputable app `_disputableAddress`
    * @dev Initialization check is implicitly provided by the `auth()` modifier
    * @param _disputableAddress Address of the Disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Challenge duration, during which the submitter can raise a dispute
    */
    function activate(
        address _disputableAddress,
        ERC20 _collateralToken,
        uint64 _challengeDuration,
        uint256 _actionAmount,
        uint256 _challengeAmount
    )
        external
        auth(MANAGE_DISPUTABLE_ROLE)
    {
        require(isContract(_disputableAddress), ERROR_DISPUTABLE_NOT_CONTRACT);

        DisputableInfo storage disputableInfo = disputableInfos[_disputableAddress];
        _ensureInactiveDisputable(disputableInfo);

        DisputableAragonApp disputable = DisputableAragonApp(_disputableAddress);
        disputableInfo.activated = true;

        // If the disputable app is being activated for the first time, then we need to set-up its initial collateral
        // requirement and set its Agreement reference to here.
        if (disputable.getAgreement() != IAgreement(this)) {
            disputable.setAgreement(IAgreement(this));
            uint256 nextId = disputableInfo.nextCollateralRequirementsId;
            disputableInfo.nextCollateralRequirementsId = nextId > 0 ? nextId : 1;
        }
        _changeCollateralRequirement(disputable, disputableInfo, _collateralToken, _challengeDuration, _actionAmount, _challengeAmount);

        emit DisputableAppActivated(disputable);
    }

    /**
    * @notice Deactivate Disputable app `_disputable`
    * @dev Initialization check is implicitly provided by the `auth()` modifier
    * @param _disputableAddress Address of the Disputable app to be deactivated
    */
    function deactivate(address _disputableAddress) external auth(MANAGE_DISPUTABLE_ROLE) {
        DisputableInfo storage disputableInfo = disputableInfos[_disputableAddress];
        _ensureActiveDisputable(disputableInfo);

        disputableInfo.activated = false;
        emit DisputableAppDeactivated(_disputableAddress);
    }

    /**
    * @notice Change `_disputable`'s collateral requirements
    * @dev Initialization check is implicitly provided by the `auth()` modifier
    * @param _disputable Address of the Disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Challenge duration, during which the submitter can raise a dispute
    */
    function changeCollateralRequirement(
        DisputableAragonApp _disputable,
        ERC20 _collateralToken,
        uint64 _challengeDuration,
        uint256 _actionAmount,
        uint256 _challengeAmount
    )
        external
        auth(MANAGE_DISPUTABLE_ROLE)
    {
        DisputableInfo storage disputableInfo = disputableInfos[address(_disputable)];
        _ensureActiveDisputable(disputableInfo);

        _changeCollateralRequirement(_disputable, disputableInfo, _collateralToken, _challengeDuration, _actionAmount, _challengeAmount);
    }

    /**
    * @notice Sign the agreement up-to setting #`_settingId`
    * @dev Callable by any account; only accounts that have signed the latest version of the agreement can submit new disputable actions.
    *      Initialization check is implicitly provided by `_settingId < nextSettingId`, as valid settings can only be created after initialization.
    * @param _settingId Last setting ID the user is agreeing with
    */
    function sign(uint256 _settingId) external {
        uint256 lastSettingIdSigned = lastSettingSignedBy[msg.sender];
        require(lastSettingIdSigned < _settingId, ERROR_SIGNER_ALREADY_SIGNED);
        require(_settingId < nextSettingId, ERROR_INVALID_SIGNING_SETTING);

        lastSettingSignedBy[msg.sender] = _settingId;
        emit Signed(msg.sender, _settingId);
    }

    /**
    * @notice Register action #`_disputableActionId` from disputable `msg.sender` for submitter `_submitter` with context `_context`
    * @dev This function should be called from the Disputable app each time a new disputable action is created.
    *      Each disputable action ID must only be registered once; this is how the Agreement gets notified about each disputable action.
    *      Initialization check is implicitly provided by `_ensureActiveDisputable()` as Disputable apps can only be activated
    *      via `activate()` which already requires initialization.
    *      IMPORTANT: Note the responsibility of the Disputable app in terms of providing the correct `_submitter` parameter.
    *      Users are required to trust that all Disputable apps activated with this Agreement have implemented this correctly, as
    *      otherwise funds could be maliciously locked from the incorrect account on new actions.
    * @param _disputableActionId Identification number of the action on the Disputable app
    * @param _context Link to a human-readable context for the given action
    * @param _submitter Address that submitted the action
    * @return Unique identification number for the created action on the Agreement
    */
    function newAction(uint256 _disputableActionId, bytes _context, address _submitter) external returns (uint256) {
        DisputableInfo storage disputableInfo = disputableInfos[msg.sender];
        _ensureActiveDisputable(disputableInfo);

        uint256 currentSettingId = _getCurrentSettingId();
        uint256 lastSettingIdSigned = lastSettingSignedBy[_submitter];
        require(lastSettingIdSigned == currentSettingId, ERROR_SIGNER_MUST_SIGN);

        // An initial collateral requirement is created when disputable apps are activated, thus length is always greater than 0
        uint256 currentCollateralRequirementId = disputableInfo.nextCollateralRequirementsId - 1;
        CollateralRequirement storage requirement = _getCollateralRequirement(disputableInfo, currentCollateralRequirementId);
        _lockBalance(requirement.staking, _submitter, requirement.actionAmount);

        // Create new action
        uint256 id = nextActionId++;
        Action storage action = actions[id];

        // Pay action submission fees
        Setting storage setting = _getSetting(currentSettingId);
        DisputableAragonApp disputable = DisputableAragonApp(msg.sender);
        _payAppFees(setting, disputable, _submitter, id);

        action.disputable = disputable;
        action.disputableActionId = _disputableActionId;
        action.collateralRequirementId = currentCollateralRequirementId;
        action.settingId = currentSettingId;
        action.submitter = _submitter;
        action.context = _context;

        emit ActionSubmitted(id, msg.sender);
        return id;
    }

    /**
    * @notice Close action #`_actionId`
    * @dev This function closes actions that:
    *      - Are not currently challenged nor disputed, or
    *      - Were previously disputed but ruled in favour of the submitter or voided
    *      Disputable apps may call this method directly at the end of an action, but is also accessible in a permission-less manner
    *      in case the app does not close its own actions automatically (e.g. disputable votes that don't pass).
    *      Can be called multiple times; it does nothing if the action is already closed.
    *      Initialization check is implicitly provided by `_getAction()` as disputable actions can only be created via `newAction()`.
    * @param _actionId Identification number of the action to be closed
    */
    function closeAction(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        if (action.closed) {
            return;
        }

        require(_canClose(action), ERROR_CANNOT_CLOSE_ACTION);
        (, CollateralRequirement storage requirement) = _getDisputableInfoFor(action);
        _unlockBalance(requirement.staking, action.submitter, requirement.actionAmount);
        _unsafeCloseAction(_actionId, action);
    }

    /**
    * @notice Challenge action #`_actionId`
    * @dev This is only callable by those who hold the CHALLENGE_ROLE on the related Disputable app.
    *      Can be called multiple times per action, until a challenge is successful (settled or ruled for challenger).
    *      Initialization check is implicitly provided by `_getAction()` as disputable actions can only be created via `newAction()`.
    * @param _actionId Identification number of the action to be challenged
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _finishedEvidence Whether the challenger is finished submitting evidence with the challenge context
    * @param _context Link to a human-readable context for the challenge
    */
    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bool _finishedEvidence, bytes _context) external {
        Action storage action = _getAction(_actionId);
        require(_canChallenge(action), ERROR_CANNOT_CHALLENGE_ACTION);

        (DisputableAragonApp disputable, CollateralRequirement storage requirement) = _getDisputableInfoFor(action);
        require(_canPerformChallenge(disputable, msg.sender), ERROR_SENDER_CANNOT_CHALLENGE_ACTION);
        require(_settlementOffer <= requirement.actionAmount, ERROR_INVALID_SETTLEMENT_OFFER);

        uint256 challengeId = _createChallenge(_actionId, action, msg.sender, requirement, _settlementOffer, _finishedEvidence, _context);
        action.lastChallengeId = challengeId;
        disputable.onDisputableActionChallenged(action.disputableActionId, challengeId, msg.sender);
        emit ActionChallenged(_actionId, challengeId);
    }

    /**
    * @notice Settle challenged action #`_actionId`, accepting the settlement offer
    * @dev This can be accessed by both the submitter (at any time) or any account (after the settlement period has passed).
    *      Can only be called once (if at all) per opened challenge.
    *      Initialization check is implicitly provided by `_getChallengedAction()` as disputable actions can only be created via `newAction()`.
    * @param _actionId Identification number of the action to be settled
    */
    function settleAction(uint256 _actionId) external {
        (Action storage action, Challenge storage challenge, uint256 challengeId) = _getChallengedAction(_actionId);
        address submitter = action.submitter;

        if (msg.sender == submitter) {
            require(_canSettle(challenge), ERROR_CANNOT_SETTLE_ACTION);
        } else {
            require(_canClaimSettlement(challenge), ERROR_CANNOT_SETTLE_ACTION);
        }

        (DisputableAragonApp disputable, CollateralRequirement storage requirement) = _getDisputableInfoFor(action);
        uint256 actionCollateral = requirement.actionAmount;
        uint256 settlementOffer = challenge.settlementOffer;

        // The settlement offer was already checked to be up-to the collateral amount upon challenge creation
        // However, we cap it to collateral amount to be safe
        // With this, we can avoid using SafeMath to calculate `unlockedAmount`
        uint256 slashedAmount = settlementOffer >= actionCollateral ? actionCollateral : settlementOffer;
        uint256 unlockedAmount = actionCollateral - slashedAmount;

        // Unlock and slash action collateral for settlement offer
        address challenger = challenge.challenger;
        IStaking staking = requirement.staking;
        _unlockBalance(staking, submitter, unlockedAmount);
        _slashBalance(staking, submitter, challenger, slashedAmount);

        // Transfer challenge collateral and challenger arbitrator fees back to the challenger
        _transferTo(requirement.token, challenger, requirement.challengeAmount);
        _transferTo(challenge.challengerArbitratorFees.token, challenger, challenge.challengerArbitratorFees.amount);

        challenge.state = ChallengeState.Settled;
        disputable.onDisputableActionRejected(action.disputableActionId);
        emit ActionSettled(_actionId, challengeId);
        _unsafeCloseAction(_actionId, action);
    }

    /**
    * @notice Dispute challenged action #`_actionId`, raising it to the arbitrator
    * @dev Only the action submitter can create a dispute for an action with an open challenge.
    *      Can only be called once (if at all) per opened challenge.
    *      Initialization check is implicitly provided by `_getChallengedAction()` as disputable actions can only be created via `newAction()`.
    * @param _actionId Identification number of the action to be disputed
    * @param _submitterFinishedEvidence Whether the submitter was finished submitting evidence with their action context
    */
    function disputeAction(uint256 _actionId, bool _submitterFinishedEvidence) external {
        (Action storage action, Challenge storage challenge, uint256 challengeId) = _getChallengedAction(_actionId);
        require(_canDispute(challenge), ERROR_CANNOT_DISPUTE_ACTION);

        address submitter = action.submitter;
        require(msg.sender == submitter, ERROR_SENDER_NOT_ALLOWED);

        IArbitrator arbitrator = _getArbitratorFor(action);
        bytes memory metadata = abi.encodePacked(appId(), action.lastChallengeId);
        uint256 disputeId = _createDispute(action, challenge, arbitrator, metadata);
        bool challengerFinishedEvidence = challenge.challengerFinishedEvidence;
        _submitEvidence(arbitrator, disputeId, submitter, action.context, _submitterFinishedEvidence);
        _submitEvidence(arbitrator, disputeId, challenge.challenger, challenge.context, challengerFinishedEvidence);

        if (_submitterFinishedEvidence && challengerFinishedEvidence) {
            // Try-catch for: arbitrator.closeEvidencePeriod(disputeId);
            bytes memory closeEvidencePeriodCalldata = abi.encodeWithSelector(arbitrator.closeEvidencePeriod.selector, disputeId);
            address(arbitrator).call(closeEvidencePeriodCalldata);
        }

        challenge.state = ChallengeState.Disputed;
        challenge.submitterFinishedEvidence = _submitterFinishedEvidence;
        challenge.disputeId = disputeId;
        challengeByDispute[disputeId] = challengeId;
        emit ActionDisputed(_actionId, challengeId);
    }

    /**
    * @notice Submit evidence for dispute #`_disputeId`
    * @dev Only callable by the action submitter or challenger.
    *      Can be called as many times as desired until the dispute is over.
    *      Initialization check is implicitly provided by `_getDisputedAction()` as disputable actions can only be created via `newAction()`.
    * @param _disputeId Identification number of the dispute on the arbitrator
    * @param _evidence Evidence data to be submitted
    * @param _finished Whether the evidence submitter is now finished submitting evidence
    */
    function submitEvidence(uint256 _disputeId, bytes _evidence, bool _finished) external {
        (, Action storage action, , Challenge storage challenge) = _getDisputedAction(_disputeId);
        require(_isDisputed(challenge), ERROR_CANNOT_SUBMIT_EVIDENCE);

        IArbitrator arbitrator = _getArbitratorFor(action);
        if (msg.sender == action.submitter) {
            // If the submitter finished submitting evidence earlier, also emit this event as finished
            bool submitterFinishedEvidence = challenge.submitterFinishedEvidence || _finished;
            _submitEvidence(arbitrator, _disputeId, msg.sender, _evidence, submitterFinishedEvidence);
            challenge.submitterFinishedEvidence = submitterFinishedEvidence;
        } else if (msg.sender == challenge.challenger) {
            // If the challenger finished submitting evidence earlier, also emit this event as finished
            bool challengerFinishedEvidence = challenge.challengerFinishedEvidence || _finished;
            _submitEvidence(arbitrator, _disputeId, msg.sender, _evidence, challengerFinishedEvidence);
            challenge.challengerFinishedEvidence = challengerFinishedEvidence;
        } else {
            revert(ERROR_SENDER_NOT_ALLOWED);
        }
    }

    /**
    * @notice Close evidence submission period for dispute #`_disputeId`
    * @dev Callable by any account.
    *      Initialization check is implicitly provided by `_getDisputedAction()` as disputable actions can only be created via `newAction()`.
    * @param _disputeId Identification number of the dispute on the arbitrator
    */
    function closeEvidencePeriod(uint256 _disputeId) external {
        (, Action storage action, , Challenge storage challenge) = _getDisputedAction(_disputeId);
        require(_isDisputed(challenge), ERROR_CANNOT_SUBMIT_EVIDENCE);
        require(challenge.submitterFinishedEvidence && challenge.challengerFinishedEvidence, ERROR_CANNOT_CLOSE_EVIDENCE_PERIOD);

        IArbitrator arbitrator = _getArbitratorFor(action);
        arbitrator.closeEvidencePeriod(_disputeId);
    }

    /**
    * @notice Rule the action associated to dispute #`_disputeId` with ruling `_ruling`
    * @dev Can only be called once per challenge by the associated abitrator.
    *      Initialization check is implicitly provided by `_getDisputedAction()` as disputable actions can only be created via `newAction()`.
    * @param _disputeId Identification number of the dispute on the arbitrator
    * @param _ruling Ruling given by the arbitrator
    */
    function rule(uint256 _disputeId, uint256 _ruling) external {
        (uint256 actionId, Action storage action, uint256 challengeId, Challenge storage challenge) = _getDisputedAction(_disputeId);
        require(_isDisputed(challenge), ERROR_CANNOT_RULE_ACTION);

        IArbitrator arbitrator = _getArbitratorFor(action);
        require(arbitrator == IArbitrator(msg.sender), ERROR_SENDER_NOT_ALLOWED);

        challenge.ruling = _ruling;
        emit Ruled(arbitrator, _disputeId, _ruling);

        if (_ruling == DISPUTES_RULING_SUBMITTER) {
            _acceptAction(actionId, action, challengeId, challenge);
        } else if (_ruling == DISPUTES_RULING_CHALLENGER) {
            _rejectAction(actionId, action, challengeId, challenge);
        } else {
            _voidAction(actionId, action, challengeId, challenge);
        }
    }

    // Getter fns

    /**
    * @dev Tell the identification number of the current agreement setting
    * @return Identification number of the current agreement setting
    */
    function getCurrentSettingId() external view returns (uint256) {
        return _getCurrentSettingId();
    }

    /**
    * @dev Tell the information related to an agreement setting
    * @param _settingId Identification number of the agreement setting
    * @return arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @return aragonAppFeesCashier Address of the fees cashier to deposit action fees (linked to the selected arbitrator)
    * @return title String indicating a short description
    * @return content Link to a human-readable text that describes the current rules for the Agreement
    */
    function getSetting(uint256 _settingId)
        external
        view
        returns (IArbitrator arbitrator, IAragonAppFeesCashier aragonAppFeesCashier, string title, bytes content)
    {
        Setting storage setting = _getSetting(_settingId);
        arbitrator = setting.arbitrator;
        aragonAppFeesCashier = setting.aragonAppFeesCashier;
        title = setting.title;
        content = setting.content;
    }

    /**
    * @dev Tell the information related to a Disputable app
    * @param _disputable Address of the Disputable app
    * @return activated Whether the Disputable app is active
    * @return currentCollateralRequirementId Identification number of the current collateral requirement
    */
    function getDisputableInfo(address _disputable) external view returns (bool activated, uint256 currentCollateralRequirementId) {
        DisputableInfo storage disputableInfo = disputableInfos[_disputable];
        activated = disputableInfo.activated;
        uint256 nextId = disputableInfo.nextCollateralRequirementsId;
        // Since `nextCollateralRequirementsId` is initialized to 1 when disputable apps are activated, it is safe to consider the
        // current collateral requirement ID of a disputable app as 0 if it has not been set yet, which means it was not activated yet.
        currentCollateralRequirementId = nextId == 0 ? 0 : nextId - 1;
    }

    /**
    * @dev Tell the information related to a collateral requirement of a Disputable app
    * @param _disputable Address of the Disputable app
    * @param _collateralRequirementId Identification number of the collateral requirement
    * @return collateralToken Address of the ERC20 token to be used for collateral
    * @return actionAmount Amount of collateral tokens that will be locked every time an action is created
    * @return challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @return challengeDuration Challenge duration, during which the submitter can raise a dispute
    */
    function getCollateralRequirement(address _disputable, uint256 _collateralRequirementId)
        external
        view
        returns (
            ERC20 collateralToken,
            uint64 challengeDuration,
            uint256 actionAmount,
            uint256 challengeAmount
        )
    {
        DisputableInfo storage disputableInfo = disputableInfos[_disputable];
        CollateralRequirement storage collateral = _getCollateralRequirement(disputableInfo, _collateralRequirementId);
        collateralToken = collateral.token;
        actionAmount = collateral.actionAmount;
        challengeAmount = collateral.challengeAmount;
        challengeDuration = collateral.challengeDuration;
    }

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address of signer
    * @return lastSettingIdSigned Identification number of the last agreement setting signed by the signer
    * @return mustSign Whether the requested signer needs to sign the current agreement setting before submitting an action
    */
    function getSigner(address _signer) external view returns (uint256 lastSettingIdSigned, bool mustSign) {
        (lastSettingIdSigned, mustSign) = _getSigner(_signer);
    }

    /**
    * @dev Tell the information related to an action
    * @param _actionId Identification number of the action
    * @return disputable Address of the Disputable app that created the action
    * @return disputableActionId Identification number of the action on the Disputable app
    * @return collateralRequirementId Identification number of the collateral requirement applicable to the action
    * @return settingId Identification number of the agreement setting applicable to the action
    * @return submitter Address that submitted the action
    * @return closed Whether the action is closed
    * @return context Link to a human-readable context for the action
    * @return lastChallengeId Identification number of the action's most recent challenge, if any
    * @return lastChallengeActive Whether the action's most recent challenge is still ongoing
    */
    function getAction(uint256 _actionId)
        external
        view
        returns (
            address disputable,
            uint256 disputableActionId,
            uint256 collateralRequirementId,
            uint256 settingId,
            address submitter,
            bool closed,
            bytes context,
            uint256 lastChallengeId,
            bool lastChallengeActive
        )
    {
        Action storage action = _getAction(_actionId);

        disputable = action.disputable;
        disputableActionId = action.disputableActionId;
        collateralRequirementId = action.collateralRequirementId;
        settingId = action.settingId;
        submitter = action.submitter;
        closed = action.closed;
        context = action.context;
        lastChallengeId = action.lastChallengeId;

        if (lastChallengeId > 0) {
            (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
            lastChallengeActive = _isWaitingChallengeAnswer(challenge) || _isDisputed(challenge);
        }
    }

    /**
    * @dev Tell the information related to an action challenge
    * @param _challengeId Identification number of the challenge
    * @return actionId Identification number of the action associated to the challenge
    * @return challenger Address that challenged the action
    * @return endDate Datetime of the last date the submitter can raise a dispute against the challenge
    * @return context Link to a human-readable context for the challenge
    * @return settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @return state Current state of the challenge
    * @return submitterFinishedEvidence Whether the action submitter has finished submitting evidence for the associated dispute
    * @return challengerFinishedEvidence Whether the action challenger has finished submitting evidence for the associated dispute
    * @return disputeId Identification number of the associated dispute on the arbitrator
    * @return ruling Ruling given from the arbitrator for the dispute
    */
    function getChallenge(uint256 _challengeId)
        external
        view
        returns (
            uint256 actionId,
            address challenger,
            uint64 endDate,
            bytes context,
            uint256 settlementOffer,
            ChallengeState state,
            bool submitterFinishedEvidence,
            bool challengerFinishedEvidence,
            uint256 disputeId,
            uint256 ruling
        )
    {
        Challenge storage challenge = _getChallenge(_challengeId);

        actionId = challenge.actionId;
        challenger = challenge.challenger;
        endDate = challenge.endDate;
        context = challenge.context;
        settlementOffer = challenge.settlementOffer;
        state = challenge.state;
        submitterFinishedEvidence = challenge.submitterFinishedEvidence;
        challengerFinishedEvidence = challenge.challengerFinishedEvidence;
        disputeId = challenge.disputeId;
        ruling = challenge.ruling;
    }

    /**
    * @dev Tell the arbitration fees paid for an action challenge
    *      Split from `getChallenge()` due to “stack too deep issues”
    * @param _challengeId Identification number of the challenge
    * @return submitterArbitratorFeesToken ERC20 token used for the arbitration fees paid by the submitter (on dispute creation)
    * @return submitterArbitratorFeesAmount Amount of arbitration fees paid by the submitter (on dispute creation)
    * @return challengerArbitratorFeesToken ERC20 token used for the arbitration fees paid by the challenger (in advance)
    * @return challengerArbitratorFeesAmount Amount of arbitration fees paid by the challenger (in advance)
    */
    function getChallengeArbitratorFees(uint256 _challengeId)
        external
        view
        returns (
            ERC20 submitterArbitratorFeesToken,
            uint256 submitterArbitratorFeesAmount,
            ERC20 challengerArbitratorFeesToken,
            uint256 challengerArbitratorFeesAmount
        )
    {
        Challenge storage challenge = _getChallenge(_challengeId);

        submitterArbitratorFeesToken = challenge.submitterArbitratorFees.token;
        submitterArbitratorFeesAmount = challenge.submitterArbitratorFees.amount;
        challengerArbitratorFeesToken = challenge.challengerArbitratorFees.token;
        challengerArbitratorFeesAmount = challenge.challengerArbitratorFees.amount;
    }

    /**
    * @dev Tell whether an action can be challenged
    * @param _actionId Identification number of the action
    * @return True if the action can be challenged, false otherwise
    */
    function canChallenge(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canChallenge(action);
    }

    /**
    * @dev Tell whether an action can be manually closed.
    *      An action can be closed if it is allowed to:
    *       - Proceed in the context of this Agreement (see `_canProceed()`), and
    *       - Be closed in the context of the originating Disputable app
    * @param _actionId Identification number of the action
    * @return True if the action can be closed, false otherwise
    */
    function canClose(uint256 _actionId) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canClose(action);
    }

    /**
    * @dev Tell whether an action can be settled
    * @param _actionId Identification number of the action
    * @return True if the action can be settled, false otherwise
    */
    function canSettle(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canSettle(challenge);
    }

    /**
    * @dev Tell whether an action can be settled by claiming its challenge settlement
    * @param _actionId Identification number of the action
    * @return True if the action settlement can be claimed, false otherwise
    */
    function canClaimSettlement(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canClaimSettlement(challenge);
    }

    /**
    * @dev Tell whether an action can be disputed
    * @param _actionId Identification number of the action
    * @return True if the action can be disputed, false otherwise
    */
    function canDispute(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _canDispute(challenge);
    }

    /**
    * @dev Tell whether an action's dispute can be ruled
    * @param _actionId Identification number of the action
    * @return True if the action's dispute can be ruled, false otherwise
    */
    function canRuleDispute(uint256 _actionId) external view returns (bool) {
        (, Challenge storage challenge, ) = _getChallengedAction(_actionId);
        return _isDisputed(challenge);
    }

    /**
    * @dev Tell whether an address can challenge an action
    * @param _actionId Identification number of the action
    * @param _challenger Address of the challenger
    * @return True if the challenger can challenge the action, false otherwise
    */
    function canPerformChallenge(uint256 _actionId, address _challenger) external view returns (bool) {
        Action storage action = _getAction(_actionId);
        return _canPerformChallenge(action.disputable, _challenger);
    }

    /**
    * @notice Tells whether an address has already signed the Agreement
    * @dev ACL oracle interface conformance
    * @return True if a parameterized address has signed the current version of the Agreement, false otherwise
    */
    function canPerform(address /* _grantee */, address /* _where */, bytes32 /* _what */, uint256[] _how)
        external
        view
        returns (bool)
    {
        // We currently expect the address as the only permission parameter because an ACL Oracle's `grantee`
        // argument is not provided with the original sender if the permission is set for ANY_ENTITY.
        require(_how.length > 0, ERROR_ACL_ORACLE_SIGNER_MISSING);
        require(_how[0] < 2**160, ERROR_ACL_ORACLE_SIGNER_NOT_ADDRESS);

        address signer = address(_how[0]);
        (, bool mustSign) = _getSigner(signer);
        return !mustSign;
    }

    /**
    * @dev ILockManager conformance.
    *      The Staking contract checks this on each request to unlock an amount managed by this Agreement.
    *      It always returns false to disable owners from unlocking their funds arbitrarily, as we
    *      want to control the release of the locked amount when actions are closed or settled.
    * @return Whether the request to unlock tokens of a given owner should be allowed
    */
    function canUnlock(address, uint256) external view returns (bool) {
        return false;
    }

    /**
    * @dev Disable built-in AragonApp token recovery escape hatch.
    *      This app is intended to hold users' funds and we do not want to allow them to be transferred to the default vault.
    * @return Always false
    */
    function allowRecoverability(address /* _token */) public view returns (bool) {
        return false;
    }

    // Internal fns

    /**
    * @dev Change agreement settings
    * @param _arbitrator Address of the IArbitrator that will be used to resolve disputes
    * @param _setAppFeesCashier Whether to integrate with the IArbitrator's fee cashier
    * @param _title String indicating a short description
    * @param _content Link to a human-readable text that describes the new rules for the Agreement
    */
    function _newSetting(IArbitrator _arbitrator, bool _setAppFeesCashier, string _title, bytes _content) internal {
        require(isContract(address(_arbitrator)), ERROR_ARBITRATOR_NOT_CONTRACT);

        uint256 id = nextSettingId++;
        Setting storage setting = settings[id];
        setting.title = _title;
        setting.content = _content;
        setting.arbitrator = _arbitrator;

        // Note that if the Agreement app didn't have an app fees cashier set at the start, then it must be explicitly set later.
        // Arbitrators must always have at least some sort of subscription module, and having the flexibility to turn this off
        // on the Agreement side can be useful.
        setting.aragonAppFeesCashier = _setAppFeesCashier ? _getArbitratorFeesCashier(_arbitrator) : IAragonAppFeesCashier(0);
        emit SettingChanged(id);
    }

    /**
    * @dev Change the collateral requirements of an active Disputable app
    * @param _disputable Address of the Disputable app
    * @param _disputableInfo Disputable info instance for the Disputable app
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Challenge duration, during which the submitter can raise a dispute
    */
    function _changeCollateralRequirement(
        DisputableAragonApp _disputable,
        DisputableInfo storage _disputableInfo,
        ERC20 _collateralToken,
        uint64 _challengeDuration,
        uint256 _actionAmount,
        uint256 _challengeAmount
    )
        internal
    {
        require(isContract(address(_collateralToken)), ERROR_TOKEN_NOT_CONTRACT);

        IStaking staking = stakingFactory.getOrCreateInstance(_collateralToken);
        uint256 id = _disputableInfo.nextCollateralRequirementsId++;
        CollateralRequirement storage collateralRequirement = _disputableInfo.collateralRequirements[id];
        collateralRequirement.token = _collateralToken;
        collateralRequirement.challengeDuration = _challengeDuration;
        collateralRequirement.actionAmount = _actionAmount;
        collateralRequirement.challengeAmount = _challengeAmount;
        collateralRequirement.staking = staking;

        emit CollateralRequirementChanged(_disputable, id);
    }

    /**
    * @dev Pay transactions fees required for new actions
    * @param _setting Agreement setting instance, used to get Aragon App Fees Cashier
    * @param _disputable Address of the Disputable app, used to determine fees
    * @param _submitter Address that submitted the action
    * @param _actionId Identification number of the action being paid for
    */
    function _payAppFees(Setting storage _setting, DisputableAragonApp _disputable, address _submitter, uint256 _actionId) internal {
        // Get fees
        IAragonAppFeesCashier aragonAppFeesCashier = _setting.aragonAppFeesCashier;
        if (aragonAppFeesCashier == IAragonAppFeesCashier(0)) {
            return;
        }

        bytes32 appId = _disputable.appId();
        (ERC20 token, uint256 amount) = aragonAppFeesCashier.getAppFee(appId);

        if (amount == 0) {
            return;
        }

        // Pull the required amount from the fee token's staking pool and approve them to the cashier
        IStaking staking = stakingFactory.getOrCreateInstance(token);
        _lockBalance(staking, _submitter, amount);
        _slashBalance(staking, _submitter, address(this), amount);
        _approveFor(token, address(aragonAppFeesCashier), amount);

        // Pay fees
        aragonAppFeesCashier.payAppFees(appId, abi.encodePacked(_actionId));
    }

    /**
    * @dev Close an action
    *      This function does not perform any checks about the action status; callers must have already ensured the action can be closed.
    * @param _actionId Identification number of the action being closed
    * @param _action Action instance being closed
    */
    function _unsafeCloseAction(uint256 _actionId, Action storage _action) internal {
        _action.closed = true;
        emit ActionClosed(_actionId);
    }

    /**
    * @dev Challenge an action
    * @param _actionId Identification number of the action being challenged
    * @param _action Action instance being challenged
    * @param _challenger Address challenging the action
    * @param _requirement Collateral requirement instance applicable to the challenge
    * @param _settlementOffer Amount of collateral tokens the challenger would accept for resolving the dispute without involving the arbitrator
    * @param _finishedSubmittingEvidence Whether the challenger is finished submitting evidence with the challenge context
    * @param _context Link to a human-readable context for the challenge
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
        uint256 challengeId = nextChallengeId++;
        Challenge storage challenge = challenges[challengeId];
        challenge.actionId = _actionId;
        challenge.challenger = _challenger;
        challenge.endDate = getTimestamp64().add(_requirement.challengeDuration);
        challenge.context = _context;
        challenge.settlementOffer = _settlementOffer;
        challenge.challengerFinishedEvidence = _finishedSubmittingEvidence;

        // Pull challenge collateral
        _depositFrom(_requirement.token, _challenger, _requirement.challengeAmount);

        // Pull pre-paid arbitrator fees from challenger
        IArbitrator arbitrator = _getArbitratorFor(_action);
        (, ERC20 feeToken, uint256 feeAmount) = arbitrator.getDisputeFees();
        challenge.challengerArbitratorFees.token = feeToken;
        challenge.challengerArbitratorFees.amount = feeAmount;
        _depositFrom(feeToken, _challenger, feeAmount);

        return challengeId;
    }

    /**
    * @dev Dispute an action
    * @param _action Action instance being disputed
    * @param _challenge Currently open challenge instance for the action
    * @return _arbitrator Address of the IArbitrator applicable to the action
    * @return _metadata Metadata content to be used for the dispute
    * @return Identification number of the dispute created on the arbitrator
    */
    function _createDispute(Action storage _action, Challenge storage _challenge, IArbitrator _arbitrator, bytes memory _metadata)
        internal
        returns (uint256)
    {
        // Pull arbitration fees from submitter
        (address disputeFeeRecipient, ERC20 feeToken, uint256 feeAmount) = _arbitrator.getDisputeFees();
        _challenge.submitterArbitratorFees.token = feeToken;
        _challenge.submitterArbitratorFees.amount = feeAmount;

        address submitter = _action.submitter;
        _depositFrom(feeToken, submitter, feeAmount);

        // Create dispute. The arbitrator should pull its arbitration fees (if any) from this Agreement on `createDispute()`.
        _approveFor(feeToken, disputeFeeRecipient, feeAmount);
        uint256 disputeId = _arbitrator.createDispute(DISPUTES_POSSIBLE_OUTCOMES, _metadata);

        return disputeId;
    }

    /**
    * @dev Submit evidence for a dispute on an arbitrator
    * @param _arbitrator Arbitrator to submit evidence on
    * @param _disputeId Identification number of the dispute on the arbitrator
    * @param _submitter Address submitting the evidence
    * @param _evidence Evidence data to be submitted
    * @param _finished Whether the submitter is now finished submitting evidence
    */
    function _submitEvidence(IArbitrator _arbitrator, uint256 _disputeId, address _submitter, bytes _evidence, bool _finished) internal {
        if (_evidence.length > 0) {
            emit EvidenceSubmitted(_arbitrator, _disputeId, _submitter, _evidence, _finished);
        }
    }

    /**
    * @dev Reject an action ("accept challenge")
    * @param _actionId Identification number of the action to be rejected
    * @param _action Action instance to be rejected
    * @param _challengeId Current challenge identification number for the action
    * @param _challenge Current challenge instance for the action
    */
    function _rejectAction(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Accepted;

        address challenger = _challenge.challenger;
        (DisputableAragonApp disputable, CollateralRequirement storage requirement) = _getDisputableInfoFor(_action);

        // Transfer action collateral, challenge collateral, and challenger arbitrator fees to the challenger
        _slashBalance(requirement.staking, _action.submitter, challenger, requirement.actionAmount);
        _transferTo(requirement.token, challenger, requirement.challengeAmount);
        _transferTo(_challenge.challengerArbitratorFees.token, challenger, _challenge.challengerArbitratorFees.amount);
        disputable.onDisputableActionRejected(_action.disputableActionId);
        emit ActionRejected(_actionId, _challengeId);
        _unsafeCloseAction(_actionId, _action);
    }

    /**
    * @dev Accept an action ("reject challenge")
    * @param _actionId Identification number of the action to be accepted
    * @param _action Action instance to be accepted
    * @param _challengeId Current challenge identification number for the action
    * @param _challenge Current challenge instance for the action
    */
    function _acceptAction(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Rejected;

        address submitter = _action.submitter;
        (DisputableAragonApp disputable, CollateralRequirement storage requirement) = _getDisputableInfoFor(_action);

        // Transfer challenge collateral and challenger arbitrator fees to the submitter
        _transferTo(requirement.token, submitter, requirement.challengeAmount);
        _transferTo(_challenge.challengerArbitratorFees.token, submitter, _challenge.challengerArbitratorFees.amount);
        disputable.onDisputableActionAllowed(_action.disputableActionId);
        emit ActionAccepted(_actionId, _challengeId);

        // Note that the action still continues after this ruling and will be closed at a future date
    }

    /**
    * @dev Void an action ("void challenge")
    * @param _actionId Identification number of the action to be voided
    * @param _action Action instance to be voided
    * @param _challengeId Current challenge identification number for the action
    * @param _challenge Current challenge instance for the action
    */
    function _voidAction(uint256 _actionId, Action storage _action, uint256 _challengeId, Challenge storage _challenge) internal {
        _challenge.state = ChallengeState.Voided;

        (DisputableAragonApp disputable, CollateralRequirement storage requirement) = _getDisputableInfoFor(_action);
        address challenger = _challenge.challenger;

        // Return challenge collateral to the challenger, and split the challenger arbitrator fees between the challenger and the submitter
        _transferTo(requirement.token, challenger, requirement.challengeAmount);
        ERC20 challengerArbitratorFeesToken = _challenge.challengerArbitratorFees.token;
        uint256 challengerArbitratorFeesAmount = _challenge.challengerArbitratorFees.amount;
        uint256 submitterPayBack = challengerArbitratorFeesAmount / 2;
        // No need for Safemath because of previous computation
        uint256 challengerPayBack = challengerArbitratorFeesAmount - submitterPayBack;
        _transferTo(challengerArbitratorFeesToken, _action.submitter, submitterPayBack);
        _transferTo(challengerArbitratorFeesToken, challenger, challengerPayBack);
        disputable.onDisputableActionVoided(_action.disputableActionId);
        emit ActionVoided(_actionId, _challengeId);

        // Note that the action still continues after this ruling and will be closed at a future date
    }

    /**
    * @dev Lock some tokens in the staking pool for a user
    * @param _staking Staking pool for the ERC20 token to be locked
    * @param _user Address of the user to lock tokens for
    * @param _amount Amount of collateral tokens to be locked
    */
    function _lockBalance(IStaking _staking, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.lock(_user, _amount);
    }

    /**
    * @dev Unlock some tokens in the staking pool for a user
    * @param _staking Staking pool for the ERC20 token to be unlocked
    * @param _user Address of the user to unlock tokens for
    * @param _amount Amount of collateral tokens to be unlocked
    */
    function _unlockBalance(IStaking _staking, address _user, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.unlock(_user, address(this), _amount);
    }

    /**
    * @dev Slash some tokens in the staking pool from a user to a recipient
    * @param _staking Staking pool for the ERC20 token to be slashed
    * @param _user Address of the user to be slashed
    * @param _recipient Address receiving the slashed tokens
    * @param _amount Amount of collateral tokens to be slashed
    */
    function _slashBalance(IStaking _staking, address _user, address _recipient, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        _staking.slashAndUnstake(_user, _recipient, _amount);
    }

    /**
    * @dev Transfer tokens to an address
    * @param _token ERC20 token to be transferred
    * @param _to Address receiving the tokens
    * @param _amount Amount of tokens to be transferred
    */
    function _transferTo(ERC20 _token, address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransfer(_to, _amount), ERROR_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Deposit tokens from an address to this Agreement
    * @param _token ERC20 token to be transferred
    * @param _from Address transferring the tokens
    * @param _amount Amount of tokens to be transferred
    */
    function _depositFrom(ERC20 _token, address _from, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransferFrom(_from, address(this), _amount), ERROR_TOKEN_DEPOSIT_FAILED);
        }
    }

    /**
    * @dev Approve tokens held by this Agreement to another address
    * @param _token ERC20 token used for the arbitration fees
    * @param _to Address to be approved
    * @param _amount Amount of `_arbitrationFeeToken` tokens to be approved
    */
    function _approveFor(ERC20 _token, address _to, uint256 _amount) internal {
        if (_amount > 0) {
            // To be safe, we first set the allowance to zero in case there is a remaining approval for the arbitrator.
            // This is not strictly necessary for ERC20s, but some tokens, e.g. MiniMe (ANT and ANJ),
            // revert on an approval if an outstanding allowance exists
            require(_token.safeApprove(_to, 0), ERROR_TOKEN_APPROVAL_FAILED);
            require(_token.safeApprove(_to, _amount), ERROR_TOKEN_APPROVAL_FAILED);
        }
    }

    /**
    * @dev Fetch an agreement setting instance by identification number
    * @param _settingId Identification number of the agreement setting
    * @return Agreement setting instance associated to the given identification number
    */
    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        require(_settingId > 0 && _settingId < nextSettingId, ERROR_SETTING_DOES_NOT_EXIST);
        return settings[_settingId];
    }

    /**
    * @dev Tell the identification number of the current agreement setting
    * @return Identification number of the current agreement setting
    */
    function _getCurrentSettingId() internal view returns (uint256) {
        // An initial setting is created during initialization, thus after initialization, length will be always greater than 0
        return nextSettingId == 0 ? 0 : nextSettingId - 1;
    }

    /**
    * @dev Tell the arbitrator to be used for an action
    * @param _action Action instance
    * @return arbitrator Address of the IArbitrator that will be used to resolve disputes
    */
    function _getArbitratorFor(Action storage _action) internal view returns (IArbitrator) {
        Setting storage setting = _getSetting(_action.settingId);
        return setting.arbitrator;
    }

    /**
    * @dev Tell the app fees cashier instance associated to an arbitrator
    * @param _arbitrator Arbitrator querying the app fees cashier for
    * @return Address of the app fees cashier associated to the arbitrator
    */
    function _getArbitratorFeesCashier(IArbitrator _arbitrator) internal view returns (IAragonAppFeesCashier) {
        (address cashier,,) = _arbitrator.getSubscriptionFees(address(this));
        return IAragonAppFeesCashier(cashier);
    }

    /**
    * @dev Ensure a Disputable app is activate
    * @param _disputableInfo Disputable info of the app
    */
    function _ensureActiveDisputable(DisputableInfo storage _disputableInfo) internal view {
        require(_disputableInfo.activated, ERROR_DISPUTABLE_NOT_ACTIVE);
    }

    /**
    * @dev Ensure a Disputable app is inactive
    * @param _disputableInfo Disputable info of the app
    */
    function _ensureInactiveDisputable(DisputableInfo storage _disputableInfo) internal view {
        require(!_disputableInfo.activated, ERROR_DISPUTABLE_ALREADY_ACTIVE);
    }

    /**
    * @dev Tell the disputable-related information about an action
    * @param _action Action instance
    * @return disputable Address of the Disputable app associated to the action
    * @return requirement Collateral requirement instance applicable to the action
    */
    function _getDisputableInfoFor(Action storage _action)
        internal
        view
        returns (DisputableAragonApp disputable, CollateralRequirement storage requirement)
    {
        disputable = _action.disputable;
        DisputableInfo storage disputableInfo = disputableInfos[address(disputable)];
        requirement = _getCollateralRequirement(disputableInfo, _action.collateralRequirementId);
    }

    /**
    * @dev Fetch the collateral requirement instance by identification number for a Disputable app
    * @param _disputableInfo Disputable info instance
    * @param _collateralRequirementId Identification number of the collateral requirement
    * @return Collateral requirement instance associated to the given identification number
    */
    function _getCollateralRequirement(DisputableInfo storage _disputableInfo, uint256 _collateralRequirementId)
        internal
        view
        returns (CollateralRequirement storage)
    {
        bool exists = _collateralRequirementId > 0 && _collateralRequirementId < _disputableInfo.nextCollateralRequirementsId;
        require(exists, ERROR_COLLATERAL_REQUIREMENT_DOES_NOT_EXIST);
        return _disputableInfo.collateralRequirements[_collateralRequirementId];
    }

    /**
    * @dev Tell the information related to a signer
    * @param _signer Address of signer
    * @return lastSettingIdSigned Identification number of the last agreement setting signed by the signer
    * @return mustSign Whether the signer needs to sign the current agreement setting before submitting an action
    */
    function _getSigner(address _signer) internal view returns (uint256 lastSettingIdSigned, bool mustSign) {
        lastSettingIdSigned = lastSettingSignedBy[_signer];
        mustSign = lastSettingIdSigned < _getCurrentSettingId();
    }

    /**
    * @dev Fetch an action instance by identification number
    * @param _actionId Identification number of the action
    * @return Action instance associated to the given identification number
    */
    function _getAction(uint256 _actionId) internal view returns (Action storage) {
        require(_actionId > 0 && _actionId < nextActionId, ERROR_ACTION_DOES_NOT_EXIST);
        return actions[_actionId];
    }

    /**
    * @dev Fetch a challenge instance by identification number
    * @param _challengeId Identification number of the challenge
    * @return Challenge instance associated to the given identification number
    */
    function _getChallenge(uint256 _challengeId) internal view returns (Challenge storage) {
        require(_existChallenge(_challengeId), ERROR_CHALLENGE_DOES_NOT_EXIST);
        return challenges[_challengeId];
    }

    /**
    * @dev Fetch an action instance along with its most recent challenge by identification number
    * @param _actionId Identification number of the action
    * @return action Action instance associated to the given identification number
    * @return challenge Most recent challenge instance associated to the action
    * @return challengeId Identification number of the most recent challenge associated to the action
    */
    function _getChallengedAction(uint256 _actionId)
        internal
        view
        returns (Action storage action, Challenge storage challenge, uint256 challengeId)
    {
        action = _getAction(_actionId);
        challengeId = action.lastChallengeId;
        challenge = _getChallenge(challengeId);
    }

    /**
    * @dev Fetch a dispute's associated action and challenge instance
    * @param _disputeId Identification number of the dispute on the arbitrator
    * @return actionId Identification number of the action associated to the dispute
    * @return action Action instance associated to the dispute
    * @return challengeId Identification number of the challenge associated to the dispute
    * @return challenge Current challenge instance associated to the dispute
    */
    function _getDisputedAction(uint256 _disputeId)
        internal
        view
        returns (uint256 actionId, Action storage action, uint256 challengeId, Challenge storage challenge)
    {
        challengeId = challengeByDispute[_disputeId];
        challenge = _getChallenge(challengeId);
        actionId = challenge.actionId;
        action = _getAction(actionId);
    }

    /**
    * @dev Tell whether a challenge exists
    * @param _challengeId Identification number of the challenge
    * @return True if the requested challenge exists, false otherwise
    */
    function _existChallenge(uint256 _challengeId) internal view returns (bool) {
        return _challengeId > 0 && _challengeId < nextChallengeId;
    }

    /**
    * @dev Tell whether an action can be manually closed
    * @param _action Action instance
    * @return True if the action can be closed, false otherwise
    */
    function _canClose(Action storage _action) internal view returns (bool) {
        if (!_canProceed(_action)) {
            return false;
        }

        DisputableAragonApp disputable = _action.disputable;
        // Assume that the Disputable app does not need to be checked if it's the one asking us to close an action
        return DisputableAragonApp(msg.sender) == disputable || disputable.canClose(_action.disputableActionId);
    }

    /**
    * @dev Tell whether an action can be challenged
    * @param _action Action instance
    * @return True if the action can be challenged, false otherwise
    */
    function _canChallenge(Action storage _action) internal view returns (bool) {
        return _canProceed(_action) && _action.disputable.canChallenge(_action.disputableActionId);
    }

    /**
    * @dev Tell whether an action can proceed to another state.
    * @dev An action can proceed if it is:
    *       - Not closed
    *       - Not currently challenged or disputed, and
    *       - Not already settled or had a dispute rule in favour of the challenger (the action will have been closed automatically)
    * @param _action Action instance
    * @return True if the action can proceed, false otherwise
    */
    function _canProceed(Action storage _action) internal view returns (bool) {
        // If the action was already closed, return false
        if (_action.closed) {
            return false;
        }

        uint256 challengeId = _action.lastChallengeId;

        // If the action has not been challenged yet, return true
        if (!_existChallenge(challengeId)) {
            return true;
        }

        // If the action was previously challenged but ruled in favour of the submitter or voided, return true
        Challenge storage challenge = challenges[challengeId];
        ChallengeState state = challenge.state;
        return state == ChallengeState.Rejected || state == ChallengeState.Voided;
    }

    /**
    * @dev Tell whether a challenge can be settled
    * @param _challenge Challenge instance
    * @return True if the challenge can be settled, false otherwise
    */
    function _canSettle(Challenge storage _challenge) internal view returns (bool) {
        return _isWaitingChallengeAnswer(_challenge);
    }

    /**
    * @dev Tell whether a challenge settlement can be claimed
    * @param _challenge Challenge instance
    * @return True if the challenge settlement can be claimed, false otherwise
    */
    function _canClaimSettlement(Challenge storage _challenge) internal view returns (bool) {
        return _isWaitingChallengeAnswer(_challenge) && getTimestamp() >= uint256(_challenge.endDate);
    }

    /**
    * @dev Tell whether a challenge can be disputed
    * @param _challenge Challenge instance
    * @return True if the challenge can be disputed, false otherwise
    */
    function _canDispute(Challenge storage _challenge) internal view returns (bool) {
        return _isWaitingChallengeAnswer(_challenge) && uint256(_challenge.endDate) > getTimestamp();
    }

    /**
    * @dev Tell whether a challenge is waiting to be answered
    * @param _challenge Challenge instance
    * @return True if the challenge is waiting to be answered, false otherwise
    */
    function _isWaitingChallengeAnswer(Challenge storage _challenge) internal view returns (bool) {
        return _challenge.state == ChallengeState.Waiting;
    }

    /**
    * @dev Tell whether a challenge is disputed
    * @param _challenge Challenge instance
    * @return True if the challenge is disputed, false otherwise
    */
    function _isDisputed(Challenge storage _challenge) internal view returns (bool) {
        return _challenge.state == ChallengeState.Disputed;
    }

    /**
    * @dev Tell whether an address has permission to challenge actions on a specific Disputable app
    * @param _disputable Address of the Disputable app
    * @param _challenger Address of the challenger
    * @return True if the challenger can challenge actions on the Disputable app, false otherwise
    */
    function _canPerformChallenge(DisputableAragonApp _disputable, address _challenger) internal view returns (bool) {
        IKernel currentKernel = kernel();
        if (currentKernel == IKernel(0)) {
            return false;
        }

        // To make sure the challenger address is reachable by ACL oracles, we need to pass it as the first argument.
        // Permissions set with ANY_ENTITY do not provide the original sender's address into the ACL Oracle's `grantee` argument.
        bytes memory params = ConversionHelpers.dangerouslyCastUintArrayToBytes(arr(_challenger));
        return currentKernel.hasPermission(_challenger, address(_disputable), CHALLENGE_ROLE, params);
    }
}
