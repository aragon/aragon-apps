/*
 * SPDX-License-Identitifer: GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

/**
  * @title Bounties Interface
  * @dev Defines a minimal interface blueprint for the StandardBounties contract
  */
interface Bounties {
    /**
     * @notice Submit a fulfillment for issue #`_bountyId` with the following info: `_data`
     */
    function fulfillBounty(
        address _sender,
        uint _bountyId,
        address[] _fulfillers,
        string _data
    ) external; //{}

    /**
     * @notice Update fulfillment for issue #`_bountyId` with the following info: `_data`
     */
    function updateFulfillment(
        address _sender,
        uint _bountyId,
        uint _fulfillmentId,
        address[] _fulfillers,
        string _data
    ) external; //{}

    function issueBounty(
        address sender,
        address[] _issuers,
        address[] _approvers,
        string _data,
        uint _deadline,
        address _token,
        uint _tokenVersion
    ) external returns (uint);

    function contribute(
        address _sender,
        uint _bountyId,
        uint _amount
    ) external payable;

    function issueAndContribute(
        address sender,
        address[] _issuers,
        address[] _approvers,
        string _data,
        uint _deadline,
        address _token,
        uint _tokenVersion,
        uint _depositAmount
    ) external payable returns (uint);

    function performAction(
        address _sender,
        uint _bountyId,
        string _data
    ) external;

    function acceptFulfillment(
        address _sender,
        uint _bountyId,
        uint _fulfillmentId,
        uint _approverId,
        uint[] _tokenAmounts
    ) external;

    function drainBounty(
        address _sender,
        uint _bountyId,
        uint _issuerId,
        uint[] _amounts
    ) external;

    function changeDeadline(
        address _sender,
        uint _bountyId,
        uint _issuerId,
        uint _deadline
    ) external;

    function changeData(
        address _sender,
        uint _bountyId,
        uint _issuerId,
        string _data
    ) external;
}

/**
  * @title ERC20 Interface
  * @dev Defines a minimal interface blueprint for ERC20 tokens interaction
  */
interface ERC20Token {
    function approve(address _spender, uint256 _value) external returns (bool success);
    function transfer(address to, uint tokens) external returns (bool success);
}


/**
  * @title Projects App
  * @author Autark
  * @dev Defines a registry for project tasks in addition to
  * applying bounties in bulk and accepting fulfillment via this contract
  */
contract Projects is AragonApp, DepositableStorage {

    using SafeMath for uint256;

    Bounties public bountiesRegistry;
    BountySettings public settings;
    Vault public vault;
    // Auth roles
    bytes32 public constant FUND_ISSUES_ROLE =  keccak256("FUND_ISSUES_ROLE");
    bytes32 public constant REMOVE_ISSUES_ROLE = keccak256("REMOVE_ISSUES_ROLE");
    bytes32 public constant ADD_REPO_ROLE = keccak256("ADD_REPO_ROLE");
    bytes32 public constant CHANGE_SETTINGS_ROLE =  keccak256("CHANGE_SETTINGS_ROLE");
    bytes32 public constant CURATE_ISSUES_ROLE = keccak256("CURATE_ISSUES_ROLE");
    bytes32 public constant REMOVE_REPO_ROLE =  keccak256("REMOVE_REPO_ROLE");
    bytes32 public constant REVIEW_APPLICATION_ROLE = keccak256("REVIEW_APPLICATION_ROLE");
    bytes32 public constant WORK_REVIEW_ROLE = keccak256("WORK_REVIEW_ROLE");
    bytes32 public constant FUND_OPEN_ISSUES_ROLE = keccak256("FUND_OPEN_ISSUES_ROLE");
    bytes32 public constant UPDATE_BOUNTIES_ROLE = keccak256("UPDATE_BOUNTIES_ROLE");

    string private constant ERROR_PROJECTS_VAULT_NOT_CONTRACT = "PROJECTS_VAULT_NOT_CONTRACT";
    string private constant ERROR_STANDARD_BOUNTIES_NOT_CONTRACT = "STANDARD_BOUNTIES_NOT_CONTRACT";
    string private constant ERROR_LENGTH_EXCEEDED = "LENGTH_EXCEEDED";
    string private constant ERROR_LENGTH_MISMATCH = "ARRAY_LENGTH_MISMATCH";
    string private constant ERROR_CID_LENGTH = "IPFS_ADDRESSES_LENGTH";
    string private constant ERROR_ISSUE_INACTIVE = "ISSUE_NOT_ACTIVE";
    string private constant ERROR_ISSUE_ACTIVE = "ISSUE_HAS_BOUNTY";
    string private constant ERROR_BOUNTY_FULFILLED = "BOUNTY_FULFILLED";
    string private constant ERROR_BOUNTY_REMOVED = "BOUNTY_REMOVED";
    string private constant ERROR_INVALID_AMOUNT = "INVALID_TOKEN_AMOUNT";
    string private constant ERROR_ETH_CONTRACT = "WRONG_ETH_TOKEN";
    string private constant ERROR_REPO_MISSING = "REPO_NOT_ADDED";
    string private constant ERROR_REPO_EXISTS = "REPO_ALREADY_ADDED";
    string private constant ERROR_USER_APPLIED = "USER_ALREADY_APPLIED";
    string private constant ERROR_NO_APPLICATION = "USER_APPLICATION_MISSING";
    string private constant ERROR_NO_ERC721 = "ERC_721_FORBIDDEN";
    string private constant ERROR_PENDING_BOUNTIES = "REPO_HAS_PENDING_BOUNTIES";
    string private constant ERROR_OPEN_BOUNTY = "CANNOT_ASSIGN_OPEN_BOUNTY";


    // IPFS length const
    uint256 private constant CID_LENGTH = 46;

    // The entries in the repos registry.
    mapping(bytes32 => Repo) private repos;
    // issue counter to track how many open issues a repo has
    mapping (bytes32 => uint256) openBounties;
    // Gives us a repos array-like contruct so we can both "iterate" and upgrade gracefully
    mapping(uint256 => bytes32) private repoIndex;
    uint256 private repoIndexLength;
    enum SubmissionStatus { Unreviewed, Accepted, Rejected }  // 0: unreviewed 1: Accepted 2: Rejected

    // Structs
    struct BountySettings {
        uint256[] expMultipliers;
        bytes32[] expLevels;
        uint256 baseRate;
        uint256 bountyDeadline;
        address bountyCurrency;
    }

    struct Repo {
        mapping(uint256 => Issue) issues;
        uint index;
    }

    struct AssignmentRequest {
        SubmissionStatus status;
        string requestHash; //IPFS hash of the application data
        bool exists;
    }

    struct Issue {
        bytes32 repo;  // This is the internal repo identifier
        uint256 number; // May be redundant tracking this
        bool hasBounty;
        bool fulfilled;
        address tokenContract;
        uint256 bountySize;
        uint256 priority;
        address bountyWallet; // Not sure if we'll have a way to "retrieve" this value from status open bounties
        uint standardBountyId;
        address assignee;
        address[] applicants;
        //uint256 submissionQty;
        uint256[] submissionIndices;
        mapping(address => AssignmentRequest) assignmentRequests;
    }

    // Fired when a repository is added to the registry.
    event RepoAdded(bytes32 indexed repoId, uint index);
    // Fired when a repository is removed from the registry.
    event RepoRemoved(bytes32 indexed repoId, uint index);
    // Fired when a repo is updated in the registry
    event RepoUpdated(bytes32 indexed repoId, uint newIndex);
    // Fired when a bounty is added to a repo
    event BountyAdded(bytes32 repoId, uint256 issueNumber, uint256 bountySize, uint256 registryId, string ipfsHash);
    // Fired when a bounty is removed
    event BountyRemoved(bytes32 repoId, uint256 issueNumber, uint256 oldBountySize);
    // Fired when an issue is curated
    event IssueCurated(bytes32 repoId);
    // Fired when settings are changed
    event BountySettingsChanged();
    // Fired when user requests issue assignment
    event AssignmentRequested(bytes32 indexed repoId, uint256 issueNumber);
    // Fired when Task Manager approves assignment request
    event AssignmentApproved(address applicant, bytes32 indexed repoId, uint256 issueNumber);
    // Fired when Task Manager rejects assignment request
    event AssignmentRejected(address applicant, bytes32 indexed repoId, uint256 issueNumber);
    // Fired when a reviewer accepts accepts a submission
    event SubmissionAccepted(uint256 submissionNumber, bytes32 repoId, uint256 issueNumber);
    // Fired when a reviewer rejects a submission
    event SubmissionRejected(uint256 submissionNumber, bytes32 repoId, uint256 issueNumber);
    // Fired when a bounty is opened up to work submissions from anyone
    event AwaitingSubmissions(bytes32 repoId, uint256 issueNumber);


    /**
     * @notice Initialize Projects app for StandardBounties at `_bountiesAddr`
     * @dev Initializes the Projects app, this is the Aragon custom constructor
     * @param _bountiesAddr Address of the StandardBounties deployed instance Projects will rely on (changeable)
     * @param _vault Address of the vault Projects will rely on (non changeable)
     */
    function initialize(
        address _bountiesAddr,
        Vault _vault
    ) external onlyInit
    {
        require(isContract(_vault), ERROR_PROJECTS_VAULT_NOT_CONTRACT);
        require(isContract(_bountiesAddr), ERROR_STANDARD_BOUNTIES_NOT_CONTRACT);

        vault = _vault;

        bountiesRegistry = Bounties(_bountiesAddr); // Standard Bounties instance

        _addExperienceLevel(100, bytes32("Beginner"));
        _addExperienceLevel(300, bytes32("Intermediate"));
        _addExperienceLevel(500, bytes32("Advanced"));

        _changeBountySettings(
            0, // baseRate
            336, // bountyDeadline
            ETH, // default bounty currency inits to ETH
            _bountiesAddr // bountyAllocator
        );

        setDepositable(true);
        initialized();
    }

///////////////////////
// Set state functions
///////////////////////


    /**
     * @notice Update settings for the Projects app
     */
    function changeBountySettings(
        uint256[] _expMultipliers,
        bytes32[] _expLevels,
        uint256 _baseRate,
        uint256 _bountyDeadline,
        address _bountyCurrency,
        address _bountyAllocator
    ) external auth(CHANGE_SETTINGS_ROLE)
    {
        require(_expMultipliers.length == _expLevels.length, ERROR_LENGTH_MISMATCH);
        require(_isBountiesContractValid(_bountyAllocator), ERROR_STANDARD_BOUNTIES_NOT_CONTRACT);
        settings.expLevels.length = 0;
        settings.expMultipliers.length = 0;
        for (uint i = 0; i < _expLevels.length; i++) {
            _addExperienceLevel(_expMultipliers[i], _expLevels[i]);
        }
        _changeBountySettings(_baseRate, _bountyDeadline, _bountyCurrency, _bountyAllocator);
    }

///////////////////////
// View state functions
///////////////////////

    /**
     * @notice Get issue data from the registry.
     * @param _repoId The id of the repo in the projects registry
     */
    function getIssue(bytes32 _repoId, uint256 _issueNumber) external view isInitialized
    returns(bool hasBounty, uint standardBountyId, bool fulfilled, uint balance, address assignee)
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];
        hasBounty = issue.hasBounty;
        fulfilled = issue.fulfilled;
        standardBountyId = issue.standardBountyId;
        balance = issue.bountySize;
        assignee = issue.assignee;
    }

    /**
     * @notice Get registry size.
     */
    function getReposCount() external view isInitialized returns (uint count) {
        return repoIndexLength;
    }

    /**
     * @notice Get an entry from the registry.
     * @param _repoId The id of the repo in the projects registry
     * @return index the repo registry index
     */
    function getRepo(bytes32 _repoId) external view isInitialized returns (uint256 index, uint256 openIssueCount) {
        require(isRepoAdded(_repoId), ERROR_REPO_MISSING);
        index = repos[_repoId].index;
        openIssueCount = openBounties[_repoId];
    }

    /**
     * @notice Get general settings.
     * @return BountySettings
     */

    function getSettings() external view isInitialized returns (
        uint256[] expMultipliers,
        bytes32[] expLevels,
        uint256 baseRate,
        uint256 bountyDeadline,
        address bountyCurrency,
        address bountyAllocator
        //address bountyArbiter
    )
    {
        return (
            settings.expMultipliers,
            settings.expLevels,
            settings.baseRate,
            settings.bountyDeadline,
            settings.bountyCurrency,
            bountiesRegistry
            //settings.bountyArbiter
        );
    }

///////////////////////
// Repository functions
///////////////////////
    /**
     * @notice Add repository
     * @param _repoId The id of the repo in the projects registry
     * @return index for the added repo at the registry
     */
    function addRepo(
        bytes32 _repoId
    ) external auth(ADD_REPO_ROLE) returns (uint index)
    {
        require(!isRepoAdded(_repoId), ERROR_REPO_EXISTS);
        repoIndex[repoIndexLength] = _repoId;
        repos[_repoId].index = repoIndexLength++;
        //repos[_repoId].index = repoIndex.push(_repoId) - 1;
        emit RepoAdded(_repoId, repos[_repoId].index);
        return repoIndexLength - 1;
    }

    /**
     * @notice Remove repository
     * @param _repoId The id of the repo in the projects registry
     */
    function removeRepo(
        bytes32 _repoId
    ) external auth(REMOVE_REPO_ROLE) returns (bool success)
    {
        require(isRepoAdded(_repoId), ERROR_REPO_MISSING);
        require(openBounties[_repoId] == 0, ERROR_PENDING_BOUNTIES);
        uint rowToDelete = repos[_repoId].index;

        if (repoIndexLength != 1) {
            bytes32 repoToMove = repoIndex[repoIndexLength - 1];
            repoIndex[rowToDelete] = repoToMove;
            repos[repoToMove].index = rowToDelete;
        }

        repoIndexLength--;
        emit RepoRemoved(_repoId, rowToDelete);
        return true;
    }

///////////////////
// External Bounty functions
///////////////////

    /**
     * @notice Submit application for issue `_issueNumber` with application `_application`
     * @param _repoId the repo id of the issue
     * @param _issueNumber the issue up for assignment
     * @param _application IPFS hash for the applicant's proposed timeline and strategy
     */
    function requestAssignment(
        bytes32 _repoId,
        uint256 _issueNumber,
        string _application
    ) external isInitialized
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];

        require(!issue.fulfilled,ERROR_BOUNTY_FULFILLED);
        require(issue.hasBounty, ERROR_ISSUE_INACTIVE);
        require(issue.assignee != address(-1), ERROR_OPEN_BOUNTY);
        require(issue.assignmentRequests[msg.sender].exists == false, ERROR_USER_APPLIED);

        issue.applicants.push(msg.sender);
        issue.assignmentRequests[msg.sender] = AssignmentRequest(
            SubmissionStatus.Unreviewed,
            _application,
            true
        );
        bountiesRegistry.performAction(
            address(this),
            issue.standardBountyId,
            _application
        );
        emit AssignmentRequested(_repoId, _issueNumber);
    }

    /**
     * @notice `_approved ? 'Accept' : 'Reject'` `_requestor` for issue `_issueNumber`
     * @param _repoId the repo id of the issue
     * @param _issueNumber the issue up for assignment
     * @param _requestor address of user that will be assigned the issue
     * @param _updatedApplication IPFS hash of the application containing optional feedback
     */
    function reviewApplication(
        bytes32 _repoId,
        uint256 _issueNumber,
        address _requestor,
        string _updatedApplication,
        bool _approved
    ) external auth(REVIEW_APPLICATION_ROLE)
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];
        require(issue.assignee != address(-1), ERROR_OPEN_BOUNTY);
        require(issue.assignmentRequests[_requestor].exists == true, ERROR_NO_APPLICATION);
        issue.assignmentRequests[_requestor].requestHash = _updatedApplication;

        if (_approved) {
            issue.assignee = _requestor;
            issue.assignmentRequests[_requestor].status = SubmissionStatus.Accepted;
            emit AssignmentApproved(_requestor, _repoId, _issueNumber);
        } else {
            issue.assignmentRequests[_requestor].status = SubmissionStatus.Rejected;
            emit AssignmentRejected(_requestor, _repoId, _issueNumber);
        }
        bountiesRegistry.performAction(
            address(this),
            issue.standardBountyId,
            _updatedApplication
        );

    }

    /**
     * @notice `_approved ? 'Accept' : 'Reject'` work for issue `_issueNumber` with info: `_updatedSubmissionHash`
     * @dev add a submission to local state after it's been added to StandardBounties.sol
     * @param _repoId the repo id of the issue
     * @param _issueNumber the issue up for resolution
     * @param _submissionNumber submission index of the submitted work for review
     * @param _approved decision to accept the contribution
     * @param _updatedSubmissionHash IPFS hash of the submission containing optional feedback
     * @param _tokenAmounts array of amounts???
     */
    function reviewSubmission(
        bytes32 _repoId,
        uint256 _issueNumber,
        uint256 _submissionNumber,
        bool _approved,
        string _updatedSubmissionHash,
        uint256[] _tokenAmounts
    ) external auth(WORK_REVIEW_ROLE)
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];

        require(!issue.fulfilled,ERROR_BOUNTY_FULFILLED);
        require(issue.assignee != address(0), ERROR_ISSUE_INACTIVE);

        if (_approved) {
            uint256 tokenTotal;
            for (uint256 i = 0; i < _tokenAmounts.length; i++) {
                tokenTotal = tokenTotal.add(_tokenAmounts[i]);
            }
            require(tokenTotal >= issue.bountySize, ERROR_INVALID_AMOUNT);

            issue.fulfilled = true;
            bountiesRegistry.acceptFulfillment(
                address(this),
                issue.standardBountyId,
                _submissionNumber,
                0,
                _tokenAmounts
            );
            openBounties[_repoId] = openBounties[_repoId].sub(1);
            emit SubmissionAccepted(_submissionNumber, _repoId, _issueNumber);
        } else {
            emit SubmissionRejected(_submissionNumber, _repoId, _issueNumber);
        }

        bountiesRegistry.performAction(
            address(this),
            issue.standardBountyId,
            _updatedSubmissionHash
        );
    }

    /**
     * @notice Update bounty for issue `_issueNumber`: `_description`
     * @param _repoId The id of the repos in the projects registry
     * @param _issueNumber issue number the bounty is assigned to
     * @param _data Information hash stored in the bounty
     * @param _deadline new deadline for bounty fulfillments
     * @param _description Utilized when forwarded to give background to the
     *                     issues up for removal
     */
    function updateBounty(
        bytes32 _repoId,
        uint256 _issueNumber,
        string _data,
        uint256 _deadline,
        string _description
    ) external auth(UPDATE_BOUNTIES_ROLE)
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];

        require(!issue.fulfilled,ERROR_BOUNTY_FULFILLED);
        require(issue.hasBounty, ERROR_ISSUE_INACTIVE);

        bountiesRegistry.changeData(
            address(this),
            issue.standardBountyId,
            0,
            _data
        );
        bountiesRegistry.changeDeadline(
            address(this),
            issue.standardBountyId,
            0,
            _deadline
        );
    }

    /**
     * @notice Remove funding from issues: `_description`
     * @param _repoIds The ids of the repos in the projects registry
     * @param _issueNumbers an array of bounty indexes
     * @param _description Utilized when forwarded to give background to the
     *                     issues up for removal
     */
    function removeBounties(
        bytes32[] _repoIds,
        uint256[] _issueNumbers,
        string _description
    ) external auth(REMOVE_ISSUES_ROLE)
    {
        require(_repoIds.length < 256, ERROR_LENGTH_EXCEEDED);
        require(_issueNumbers.length < 256, ERROR_LENGTH_EXCEEDED);
        require(_repoIds.length == _issueNumbers.length, ERROR_LENGTH_MISMATCH);
        for (uint8 i = 0; i < _issueNumbers.length; i++) {
            _removeBounty(_repoIds[i], _issueNumbers[i]);
        }
    }

///////////////////////
// External utility functions
///////////////////////

    /**
     * @notice Returns Applicant array length
     * @param _repoId the repo id of the issue
     * @param _issueNumber the issue up for assignmen
     * @return  array length of the applicants array
     */
    function getApplicantsLength(
        bytes32 _repoId,
        uint256 _issueNumber
    ) external view isInitialized returns(uint256 applicantQty)
    {
        applicantQty = repos[_repoId].issues[_issueNumber].applicants.length;
    }

    /**
     * @notice Returns Applicant Address
     * @param _repoId The repo id of the issue
     * @param _issueNumber The issue up for assignment
     * @param _idx The applicant's position in the array
     * @return  applicant address
     */
    function getApplicant(
        bytes32 _repoId,
        uint256 _issueNumber,
        uint256 _idx
    ) external view isInitialized returns(address applicant, string application, SubmissionStatus status)
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];
        applicant = issue.applicants[_idx];
        application = issue.assignmentRequests[applicant].requestHash;
        status = issue.assignmentRequests[applicant].status;
    }

///////////////////
// Public Bounty functions
///////////////////

    /**
     * @notice Fund issues: `_description`
     * @param _repoIds The ids of the repos in the projects registry
     * @param _issueNumbers An array of bounty indexes
     * @param _bountySizes An array of bounty sizes
     * @param _deadlines An array of bounty deadlines
     * @param _tokenTypes An array of currency types: 0=ETH from user's wallet, 1=ETH from vault, 20=ERC20 token from vault
     * @param _tokenContracts An array of token contracts
     * @param _ipfsAddresses A string of IPFS addresses
     * @param _description parsed and display to user when this function is forwarded
     */
    function addBounties(
        bytes32[] _repoIds,
        uint256[] _issueNumbers,
        uint256[] _bountySizes,
        uint256[] _deadlines,
        uint256[] _tokenTypes,
        address[] _tokenContracts,
        string _ipfsAddresses,
        string _description
    ) public payable auth(FUND_ISSUES_ROLE)
    {
        // ensure the transvalue passed equals transaction value
        //checkTransValueEqualsMessageValue(msg.value, _bountySizes,_tokenBounties);
        string memory ipfsHash;
        uint standardBountyId;
        require(bytes(_ipfsAddresses).length == (CID_LENGTH * _bountySizes.length), ERROR_CID_LENGTH);

        for (uint i = 0; i < _bountySizes.length; i++) {
            ipfsHash = getHash(_ipfsAddresses, i);

            // submit the bounty to the StandardBounties contract
            standardBountyId = _issueBounty(
                ipfsHash,
                _deadlines[i],
                _tokenContracts[i],
                _tokenTypes[i],
                _bountySizes[i]
            );

            //Add bounty to local registry
            _addBounty(
                _repoIds[i],
                _issueNumbers[i],
                standardBountyId,
                _tokenContracts[i],
                _bountySizes[i],
                ipfsHash
            );
        }
    }

    /**
     * @notice Fund open-submission issues: `_description`
     * @param _repoIds The ids of the repos in the projects registry
     * @param _issueNumbers an array of bounty indexes
     * @param _bountySizes an array of bounty sizes
     * @param _deadlines an array of bounty deadlines
     * @param _tokenTypes array of currency types: 0=ETH, 20=ERC20
     * @param _tokenContracts an array of token contracts
     * @param _ipfsAddresses a string of ipfs addresses
     * @param _description parsed and display to user when this function is forwarded
     */
    function addBountiesNoAssignment(
        bytes32[] _repoIds,
        uint256[] _issueNumbers,
        uint256[] _bountySizes,
        uint256[] _deadlines,
        uint256[] _tokenTypes,
        address[] _tokenContracts,
        string _ipfsAddresses,
        string _description
    ) public payable auth(FUND_OPEN_ISSUES_ROLE)
    {
        string memory ipfsHash;
        uint standardBountyId;

        for (uint i = 0; i < _bountySizes.length; i++) {
            ipfsHash = getHash(_ipfsAddresses, i);

            // submit the bounty to the StandardBounties contract
            standardBountyId = _issueBounty(
                ipfsHash,
                _deadlines[i],
                _tokenContracts[i],
                _tokenTypes[i],
                _bountySizes[i]
            );

            //Add bounty to local registry
            _addBounty(
                _repoIds[i],
                _issueNumbers[i],
                standardBountyId,
                _tokenContracts[i],
                _bountySizes[i],
                ipfsHash
            );

            repos[_repoIds[i]].issues[_issueNumbers[i]].assignee = address(-1);
            emit AwaitingSubmissions(_repoIds[i], _issueNumbers[i]);
        }

    }

    /**
     * @notice Issue curation: `_description`
     * @dev curateIssues(): This function conforms to the upcoming
     *                      specId 2 forwarder interface
     *                      and it is meant to be forwarded to a dot
     *                      voting app instance or another voting app
     *                      that utilizes dynamic forwarding.
     *                      The unused parameters are in place to conform
     *                      to the above specification.
     * @param _description The description of the issue curation
     */
    function curateIssues(
        address[] /*unused_Addresses*/,
        uint256[] issuePriorities,
        uint256[] issueDescriptionIndices,
        string /* unused_issueDescriptions*/,
        string _description,
        uint256[] issueRepos,
        uint256[] issueNumbers,
        uint256 /* unused_curationId */
    ) public auth(CURATE_ISSUES_ROLE)
    {
        bytes32 repoId;
        uint256 issueLength = issuePriorities.length;
        require(issueLength == issueDescriptionIndices.length, "LENGTH_MISMATCH: issuePriorites and issueDescriptionIdx");
        require(issueLength == issueRepos.length, "LENGTH_MISMATCH: issuePriorites and issueRepos");
        require(issueLength == issueNumbers.length, "LENGTH_MISMATCH: issuePriorites and issueNumbers");

        for (uint256 i = 0; i < issueLength; i++) {
            repoId = bytes32(issueRepos[i]);
            repos[repoId].issues[uint256(issueNumbers[i])].priority = issuePriorities[i];
            emit IssueCurated(repoId);
        }
    }

///////////////////////
// Public utility functions
///////////////////////

    /**
     * @notice Checks if a repo exists in the registry
     * @param _repoId The repo id to check
     * @return _repoId Id for newly added repo
     */
    function isRepoAdded(bytes32 _repoId) public view isInitialized returns(bool isAdded) {
        uint256 repoIdxVal = repos[_repoId].index;
        if (repoIndexLength == 0)
            return false;
        if (repoIdxVal >= repoIndexLength)
            return false;
        return (repoIndex[repos[_repoId].index] == _repoId);
    }

///////////////////////
// Internal functions
///////////////////////

    /**
     * @dev checks the hashed contract code to ensure it matches the provided hash
     */
    function _isBountiesContractValid(address _bountyRegistry) internal view returns(bool) {
        if (_bountyRegistry == address(0)) {
            return false;
        }
        if (_bountyRegistry == address(bountiesRegistry)) {
            return true;
        }
        uint256 size;
        // solium-disable-next-line security/no-inline-assembly
        assembly { size := extcodesize(_bountyRegistry) }
        if (size != 23406) {
            return false;
        }
        uint256 segments = 4;
        uint256 segmentLength = size / segments;
        bytes memory registryCode = new bytes(segmentLength);
        bytes32[4] memory validRegistryHashes = [
            bytes32(0x9904de0ff2a8144b30f80f0de9184731b7c39116b1f021bad12dcbb740f8371d),
            bytes32(0xd2319fa5b8b5614a3634c84ff340d27fa6e5921162e44bc2256f379ad86608f3),
            bytes32(0x0fd4c8d32b2c21b41989666a6d19f7a5f4987ae6d915dd96698de62db8a79643),
            bytes32(0x6af9efdc22f9352086c68a7b5c270db4f0fdc2b5ab18984a2d17b92ae327e144)
        ];
        for (uint256 i = 0; i < segments; i++) {
            // solium-disable-next-line security/no-inline-assembly
            assembly{ extcodecopy(_bountyRegistry,add(0x20,registryCode),div(mul(i,segmentLength),segments),segmentLength) }
            if (validRegistryHashes[i] != keccak256(registryCode)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Update bounty setting values
     * @dev _changeBountySettings(): update app settings by changing contract setting state
     */
    function _changeBountySettings(
        uint256 _baseRate,
        uint256 _bountyDeadline,
        address _bountyCurrency,
        address _bountyAllocator
    ) internal
    {
        settings.baseRate = _baseRate;
        settings.bountyDeadline = _bountyDeadline;
        settings.bountyCurrency = _bountyCurrency;
        bountiesRegistry = Bounties(_bountyAllocator);

        emit BountySettingsChanged();
    }

    /**
     * @notice create a new experience level containing the multiplier and description
     * @dev _addExperienceLevel():  Push new entries into the expMultiplier and expLevel
     *                              arrays
     */
    function _addExperienceLevel(
        uint _multiplier,
        bytes32 _description
    ) internal
    {
        settings.expMultipliers.push(_multiplier);
        settings.expLevels.push(_description);
    }

    /**
     * @notice passes provided info to the linked Standard Bounties contract
     * @dev _issueBounty(): There are three forms of the contribute call.
     *                      The first is used if ETH from the user is used as the bounty contribution
     *                      The second is used if ETH from the vault is the bounty currency
     *                      The third is used if an ERC20 token from the vault is the bounty currency
     */
    function _issueBounty(
        string _ipfsHash,
        uint256 _deadline,
        address _tokenContract,
        uint256 _tokenType,
        uint256 _bountySize
    ) internal returns (uint256 bountyId)
    {
        require(_tokenType != 721, ERROR_NO_ERC721);
        uint256 registryTokenType;
        if (_tokenType == 0) {
            require(_tokenContract == ETH, ERROR_ETH_CONTRACT);
            registryTokenType = _tokenType;
        } else if (_tokenType == 1) {
            require(_tokenContract == ETH, ERROR_ETH_CONTRACT);
            registryTokenType = 0;
        } else {
            registryTokenType = _tokenType;
        }

        address[] memory issuers = new address[](1);
        issuers[0] = address(this);

        if (_tokenType > 0) {
            vault.transfer(_tokenContract, this, _bountySize);
            if (registryTokenType != 0) {
                require(ERC20Token(_tokenContract).approve(bountiesRegistry, _bountySize), "ERROR_ERC20_TRANSFER");
            }
        }

        if (registryTokenType == 0) {
            bountyId = bountiesRegistry.issueAndContribute.value(_bountySize)(
                address(this),      // address payable _sender
                issuers,            // address payable [] memory _issuers
                issuers,            // address [] memory _approvers
                _ipfsHash,          // string memory _data
                _deadline,          // uint _deadline
                _tokenContract,     // address _token
                registryTokenType,   // uint _tokenVersion
                _bountySize
            );
        } else {
            bountyId = bountiesRegistry.issueAndContribute(
                address(this),      // address payable _sender
                issuers,            // address payable [] memory _issuers
                issuers,            // address [] memory _approvers
                _ipfsHash,          // string memory _data
                _deadline,          // uint _deadline
                _tokenContract,     // address _token
                registryTokenType,   // uint _tokenVersion
                _bountySize
            );
        }
    }

    /**
     * @notice internal function that adds the bounty info to contract state
     * @dev _addBounty():   Creates a new Issue instance in the specified Repo
     *                      and initializes the the state parameters that aren't
     *                      passed in
     */
    function _addBounty(
        bytes32 _repoId,
        uint256 _issueNumber,
        uint _standardBountyId,
        address _tokenContract,
        uint256 _bountySize,
        string _ipfsHash
    ) internal
    {
        address[] memory emptyAddressArray = new address[](0);
        uint256[] memory emptySubmissionIndexArray = new uint256[](0);
        //Issue storage issue = repos[_repoId].issues[_issueNumber];
        require(isRepoAdded(_repoId), ERROR_REPO_MISSING);
        require(!repos[_repoId].issues[_issueNumber].hasBounty, ERROR_ISSUE_ACTIVE);

        repos[_repoId].issues[_issueNumber] = Issue(
            _repoId,
            _issueNumber,
            true,
            false,
            _tokenContract,
            _bountySize,
            999,
            ETH,
            _standardBountyId,
            ETH,
            emptyAddressArray,
            //address(0),
            //0,
            emptySubmissionIndexArray
        );
        openBounties[_repoId] = openBounties[_repoId].add(1);
        emit BountyAdded(
            _repoId,
            _issueNumber,
            _bountySize,
            _standardBountyId,
            _ipfsHash
        );
    }

    /**
     * @notice remove bounty from StandardBounties and local registry
     * @dev _removeBounty():    First transfers the bounty value from
     *                          the StandardBounties registry back
     *                          to the Project's integrated vault.
     *                          Next resets the issue's contract state.
     * @param _repoId the repo id of the issue
     * @param _issueNumber the issue up for assignment
     */
    function _removeBounty(
        bytes32 _repoId,
        uint256 _issueNumber
    ) internal
    {
        Issue storage issue = repos[_repoId].issues[_issueNumber];
        require(issue.hasBounty, ERROR_BOUNTY_REMOVED);
        require(!issue.fulfilled, ERROR_BOUNTY_FULFILLED);
        issue.hasBounty = false;
        uint256[] memory originalAmount = new uint256[](1);
        originalAmount[0] = issue.bountySize;
        bountiesRegistry.drainBounty(
            address(this),
            issue.standardBountyId,
            0,
            originalAmount
        );
        _returnValueToVault(originalAmount[0], issue.tokenContract);
        issue.bountySize = 0;
        bountiesRegistry.changeDeadline(
            address(this),
            issue.standardBountyId,
            0,
            getTimestamp()
        );
        openBounties[_repoId] = openBounties[_repoId].sub(1);
        emit BountyRemoved(
            _repoId,
            _issueNumber,
            originalAmount[0]
        );
    }

    function _returnValueToVault(uint256 _amount, address _token) internal {
        if (_token == ETH)
            vault.deposit.value(_amount)(_token, _amount);
        else {
            require(ERC20Token(_token).approve(vault, _amount), "ERROR_ERC20__APPROVAL");
            vault.deposit(_token, _amount);
        }
    }

    /**
     * @notice parses InfoStrings for the CID hash
     * @dev getHash():  First copies over the first 32 bytes.
     *                  Next copies the remaining 14 bytes and
     *                  and masks the remainder of the word
     * @param _str The raw string to be parsed by the function
     * @param _hashIndex The index of the hash to be parsed from
     *                   the string of combined hashes
     */
    function getHash(
        string _str,
        uint256 _hashIndex
    ) internal pure returns (string)
    {
        // first char is at location 0
        //IPFS addresses span from 0 (startindex) to 46 (endIndex)
        uint256 startIndex = _hashIndex * CID_LENGTH;
        uint256 endIndex = startIndex + CID_LENGTH;
        bytes memory strBytes = bytes(_str);
        bytes memory result = new bytes(endIndex-startIndex);
        uint256 length = endIndex - startIndex;
        // destination in memory for the returned hash
        uint256 dest;
        // source location in memory for the returned hash
        uint256 src;
        // need to offset by 0x20 (32 bytes) to account for the first
        // 32 "header" bytes
        // then copy the first 32 bytes of the hash into the destination location
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            dest := add(result,0x20)
            src := add(strBytes,add(0x20,startIndex))
            mstore(dest, mload(src))
        }
        // copy the remaining 14 bytes and ensure the remaining
        // 18 bytes of the word are set to "00" using a mask
        src += 32;
        dest += 32;
        length -= 32;
        uint mask = 256 ** (32 - length) - 1;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }

        return string(result);
    }

}
