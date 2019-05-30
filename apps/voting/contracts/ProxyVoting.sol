pragma solidity ^0.4.24;

import "./Voting.sol";
import "./VotingHelpers.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/common/TimeHelpers.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract ProxyVoting is TimeHelpers {
    using SafeMath64 for uint64;
    using VotingHelpers for Voting;

    string constant private ERROR_WITHDRAW_FAILED = "PV_WITHDRAW_FAILED";
    string constant private ERROR_VOTE_ALREADY_CASTED = "PV_VOTE_ALREADY_CASTED";
    string constant private ERROR_WITHIN_OVERRULE_WINDOW = "PV_WITHIN_OVERRULE_WINDOW";
    string constant private ERROR_SENDER_NOT_PRINCIPAL = "PV_SENDER_NOT_PRINCIPAL";
    string constant private ERROR_REPRESENTATIVE_NOT_ALLOWED = "PV_REPRESENTATIVE_NOT_ALLOWED";

    uint64 internal overruleWindow;
    address internal principal;
    mapping (address => bool) internal fullRepresentatives;
    mapping (address => mapping (address => bool)) internal instanceRepresentatives;
    mapping (address => mapping (uint256 => mapping (address => bool))) internal voteRepresentatives;

    event Withdraw(address token, uint256 amount);
    event ChangeFullRepresentative(address indexed representative, bool allowed);
    event ChangeInstanceRepresentative(address indexed representative, address indexed voting, bool allowed);
    event ChangeVoteRepresentative(address indexed representative, address indexed voting, uint256 indexed voteId, bool allowed);

    modifier onlyPrincipal {
        require(msg.sender == principal, ERROR_SENDER_NOT_PRINCIPAL);
        _;
    }

    modifier onlyRepresentative(Voting _voting, uint256 _voteId) {
        require(_isRepresentativeAllowed(msg.sender, address(_voting), _voteId), ERROR_REPRESENTATIVE_NOT_ALLOWED);
        _;
    }

    constructor(address _principal, uint64 _overruleWindow) public {
        principal = _principal;
        overruleWindow = _overruleWindow;
    }

    function withdraw(ERC20 _token, uint256 _amount) external onlyPrincipal {
        emit Withdraw(address(_token), _amount);
        require(_token.transfer(principal, _amount), ERROR_WITHDRAW_FAILED);
    }

    function newVote(Voting _voting, bytes _executionScript, string _metadata) external onlyPrincipal returns (uint256 voteId) {
        // do not cas principals vote to allow representatives vote
        return _voting.newVote(_executionScript, _metadata, false, false);
    }

    function proxyVote(Voting _voting, uint256 _voteId, bool _supports) external onlyRepresentative(_voting, _voteId) {
        // TODO: do we want to allow representatives to change their votes?
        require(hasNotVoteYet(_voting, _voteId), ERROR_VOTE_ALREADY_CASTED);
        require(!withinOverruleWindow(_voting, _voteId), ERROR_WITHIN_OVERRULE_WINDOW);

        // do not execute if decided to allow principals overruling
        _voting.vote(_voteId, _supports, false);
    }

    function vote(Voting _voting, uint256 _voteId, bool _supports, bool _executesIfDecided) external onlyPrincipal {
        _voting.vote(_voteId, _supports, _executesIfDecided);
    }

    function setFullRepresentative(address _representative, bool _allowed) public onlyPrincipal {
        fullRepresentatives[_representative] = _allowed;
        emit ChangeFullRepresentative(_representative, _allowed);
    }

    function setInstanceRepresentative(address _representative, address _voting, bool _allowed) public onlyPrincipal {
        instanceRepresentatives[_voting][_representative] = _allowed;
        emit ChangeInstanceRepresentative(_representative, _voting, _allowed);
    }

    function setVoteRepresentative(address _representative, address _voting, uint256 _voteId, bool _allowed) public onlyPrincipal {
        voteRepresentatives[_voting][_voteId][_representative] = _allowed;
        emit ChangeVoteRepresentative(_representative, _voting, _voteId, _allowed);
    }

    function hasNotVoteYet(Voting _voting, uint256 _voteId) public view returns (bool) {
        return _voting.isVoteAbsent(_voteId, address(this));
    }

    function withinOverruleWindow(Voting _voting, uint256 _voteId) public view returns (bool) {
        bool open = _voting.isVoteOpen(_voteId);
        uint64 endDate = _voting.getVoteEndDate(_voteId);

        // Note that if current timestamp is greater than the end date, open will be false
        return open && getTimestamp64() >= endDate.sub(overruleWindow);
    }

    function isRepresentativeFullyAllowed(address _representative) public view returns (bool) {
        return fullRepresentatives[_representative];
    }

    function isRepresentativeAllowedForInstance(address _representative, address _voting) public view returns (bool) {
        return instanceRepresentatives[_voting][_representative];
    }

    function isRepresentativeAllowedForVote(address _representative, address _voting, uint256 _voteId) public view returns (bool) {
        return voteRepresentatives[_voting][_voteId][_representative];
    }

    function _isRepresentativeAllowed(address _representative, address _voting, uint256 _voteId) internal view returns (bool) {
        return isRepresentativeFullyAllowed(_representative) ||
               isRepresentativeAllowedForInstance(_representative, _voting) ||
               isRepresentativeAllowedForVote(_representative, _voting, _voteId);
    }
}
