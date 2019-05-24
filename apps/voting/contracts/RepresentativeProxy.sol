pragma solidity ^0.4.24;

import "./Voting.sol";
import "./VotingHelpers.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/common/TimeHelpers.sol";


contract RepresentativeProxy is TimeHelpers {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using VotingHelpers for Voting;

    string constant private ERROR_WITHIN_OVERRULE_WINDOW = "RP_WITHIN_OVERRULE_WINDOW";
    string constant private ERROR_SENDER_NOT_REPRESENTATIVE = "RP_SENDER_NOT_REPRESENTATIVE";
    string constant private ERROR_DISALLOW_AMOUNT_UNAVAILABLE = "RP_DISALLOW_AMOUNT_UNAVAILABLE";
    string constant private ERROR_TRANSFER_FROM_TOKEN_FAILED = "RP_TRANSFER_FROM_TOKEN_FAILED";
    string constant private ERROR_TRANSFER_TO_PRINCIPAL_FAILED = "RP_TRANSFER_TO_PRINCIPAL_FAILED";

    uint64 internal overruleWindow;
    address internal representative;
    mapping (address => mapping (address => uint256)) internal principalAmounts;

    event Delegate(address principal, address token, uint256 amount, uint256 totalAmount);
    event Withdraw(address principal, address token, uint256 amount, uint256 totalAmount);

    modifier onlyRepresentative {
        require(msg.sender == representative, ERROR_SENDER_NOT_REPRESENTATIVE);
        _;
    }

    constructor(address _representative, uint64 _overruleWindow) public {
        representative = _representative;
        overruleWindow = _overruleWindow;
    }

    function delegate(ERC20 _token, uint256 _amount) external {
        address tokenAddress = address(_token);
        uint256 updatedAmount = principalAmounts[msg.sender][tokenAddress].add(_amount);
        principalAmounts[msg.sender][tokenAddress] = updatedAmount;
        emit Delegate(msg.sender, tokenAddress, _amount, updatedAmount);

        require(_token.transferFrom(msg.sender, address(this), _amount), ERROR_TRANSFER_FROM_TOKEN_FAILED);
    }

    function withdraw(ERC20 _token, uint256 _amount) external {
        address tokenAddress = address(_token);
        uint256 currentAmount = principalAmounts[msg.sender][tokenAddress];
        require(currentAmount >= _amount, ERROR_DISALLOW_AMOUNT_UNAVAILABLE);

        uint256 updatedAmount = currentAmount.sub(_amount);
        principalAmounts[msg.sender][tokenAddress] = updatedAmount;
        emit Withdraw(msg.sender, tokenAddress, _amount, updatedAmount);

        require(_token.transfer(msg.sender, _amount), ERROR_TRANSFER_TO_PRINCIPAL_FAILED);
    }

    function newVote(Voting _voting, bytes _executionScript, string _metadata) external onlyRepresentative returns (uint256 voteId) {
        // do not cas principals vote to allow representatives vote
        return _voting.newVote(_executionScript, _metadata, false, false);
    }

    function proxyVotes(Voting[] _votings, uint256[] _voteIds, bool[] _supports) external onlyRepresentative {
        for (uint256 i = 0; i < _votings.length; i++) {
            proxyVote(_votings[i], _voteIds[i], _supports[i]);
        }
    }

    function proxyVote(Voting _voting, uint256 _voteId, bool _supports) public onlyRepresentative {
        require(!withinOverruleWindow(_voting, _voteId), ERROR_WITHIN_OVERRULE_WINDOW);
        // do not execute if decided to allow principals overruling
        _voting.vote(_voteId, _supports, false);
    }

    function isAllowedBy(address _principal, address _token) public view returns (bool) {
        return principalAmounts[_principal][_token] > 0;
    }

    function withinOverruleWindow(Voting _voting, uint256 _voteId) public view returns (bool) {
        bool open = _voting.isVoteOpen(_voteId);
        uint64 endDate = _voting.getVoteEndDate(_voteId);

        // Note that if current timestamp is greater than the end date, open will be false
        return open && getTimestamp64() >= endDate.sub(overruleWindow);
    }
}
