pragma solidity ^0.4.24;

import "./Voting.sol";
import "./ProxyVoting.sol";
import "./VotingHelpers.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/common/TimeHelpers.sol";


contract HybridProxyVoting is ProxyVoting, IsContract {

    constructor(address _principal, uint64 _overruleWindow) ProxyVoting(_principal, _overruleWindow) public {
        // solium-disable-previous-line no-empty-blocks
    }

    function setFullRepresentative(address _representative, bool _allowed) public onlyPrincipal {
        super.setFullRepresentative(_representative, _allowed);
        if (isContract(_representative)) {
            HybridRepresentativeProxy(_representative).onSetFullRepresentative(_allowed);
        }
    }

    function setInstanceRepresentative(address _representative, address _voting, bool _allowed) public onlyPrincipal {
        super.setInstanceRepresentative(_representative, _voting, _allowed);
        if (isContract(_representative)) {
            HybridRepresentativeProxy(_representative).onSetInstanceRepresentative(_voting, _allowed);
        }
    }

    function setVoteRepresentative(address _representative, address _voting, uint256 _voteId, bool _allowed) public onlyPrincipal {
        super.setVoteRepresentative(_representative, _voting, _voteId, _allowed);
        if (isContract(_representative)) {
            HybridRepresentativeProxy(_representative).onSetVoteRepresentative(_voting, _voteId, _allowed);
        }
    }
}


contract HybridRepresentativeProxy {
    using SafeMath for uint256;

    string constant private ERROR_BLACKLISTED_SENDER = "RP_BLACKLISTED_SENDER";
    string constant private ERROR_PRINCIPAL_CANNOT_VOTE = "RP_PRINCIPAL_CANNOT_VOTE";
    string constant private ERROR_SENDER_NOT_PROXY_VOTING = "RP_SENDER_NOT_PROXY_VOTING";
    string constant private ERROR_SENDER_NOT_REPRESENTATIVE = "RP_SENDER_NOT_REPRESENTATIVE";

    address internal representative;
    ProxyVotingRegistry internal proxyVotingRegistry;
    mapping (address => bool) internal principalsBlacklist;

    address[] internal fullRepresented;
    mapping (address => uint256) internal fullRepresentedIndexes;

    mapping (address => address[]) internal instanceRepresented;
    mapping (address => mapping (address => uint256)) internal instanceRepresentedIndexes;

    mapping (address => mapping (uint256 => address[])) internal voteRepresented;
    mapping (address => mapping (uint256 => mapping (address => uint256))) internal voteRepresentedIndexes;

    event ChangePrincipalsBlacklist(address principal, bool blacklisted);

    modifier onlyRepresentative {
        require(msg.sender == representative, ERROR_SENDER_NOT_REPRESENTATIVE);
        _;
    }

    modifier onlyProxyVoting {
        require(_isProxyVoting(msg.sender), ERROR_SENDER_NOT_PROXY_VOTING);
        _;
    }

    modifier whitelisted {
        require(_isWhitelisted(msg.sender), ERROR_BLACKLISTED_SENDER);
        _;
    }

    constructor(address _representative, ProxyVotingRegistry _proxyVotingRegistry) public {
        representative = _representative;
        proxyVotingRegistry = _proxyVotingRegistry;
    }

    function onSetFullRepresentative(bool _allowed) external onlyProxyVoting whitelisted {
        if (_allowed) {
            uint256 index = fullRepresented.length;
            fullRepresented.push(msg.sender);
            fullRepresentedIndexes[msg.sender] = index;
        } else {
            uint256 representativeIndex = fullRepresentedIndexes[msg.sender];
            uint256 lastIndex = fullRepresented.length.sub(1);
            address lastRepresentative = fullRepresented[lastIndex];
            fullRepresented[representativeIndex] = lastRepresentative;
            fullRepresented.length--;
            fullRepresentedIndexes[msg.sender] = 0;
            fullRepresentedIndexes[lastRepresentative] = representativeIndex;
        }
    }

    function onSetInstanceRepresentative(address _voting, bool _allowed) external onlyProxyVoting whitelisted {
        if (_allowed) {
            uint256 index = instanceRepresented[_voting].length;
            instanceRepresented[_voting].push(msg.sender);
            instanceRepresentedIndexes[_voting][msg.sender] = index;
        } else {
            uint256 representativeIndex = instanceRepresentedIndexes[_voting][msg.sender];
            uint256 lastIndex = instanceRepresented[_voting].length.sub(1);
            address lastRepresentative = instanceRepresented[_voting][lastIndex];
            instanceRepresented[_voting][representativeIndex] = lastRepresentative;
            instanceRepresented[_voting].length--;
            instanceRepresentedIndexes[_voting][msg.sender] = 0;
            instanceRepresentedIndexes[_voting][lastRepresentative] = representativeIndex;
        }
    }

    function onSetVoteRepresentative(address _voting, uint256 _voteId, bool _allowed) external onlyProxyVoting whitelisted {
        require(Voting(_voting).canVote(_voteId, msg.sender), ERROR_PRINCIPAL_CANNOT_VOTE);

        if (_allowed) {
            uint256 index = voteRepresented[_voting][_voteId].length;
            voteRepresented[_voting][_voteId].push(msg.sender);
            voteRepresentedIndexes[_voting][_voteId][msg.sender] = index;
        } else {
            uint256 representativeIndex = voteRepresentedIndexes[_voting][_voteId][msg.sender];
            uint256 lastIndex = voteRepresented[_voting][_voteId].length.sub(1);
            address lastRepresentative = voteRepresented[_voting][_voteId][lastIndex];
            voteRepresented[_voting][_voteId][representativeIndex] = lastRepresentative;
            voteRepresented[_voting][_voteId].length--;
            voteRepresentedIndexes[_voting][_voteId][msg.sender] = 0;
            voteRepresentedIndexes[_voting][_voteId][lastRepresentative] = representativeIndex;
        }
    }

    function blacklistPrincipal(address _principal, bool _blacklisted) external onlyRepresentative {
        principalsBlacklist[_principal] = _blacklisted;
        emit ChangePrincipalsBlacklist(_principal, _blacklisted);
    }

    function proxyVotes(Voting[] _votings, uint256[] _voteIds, bool[] _supports) external onlyRepresentative {
        for (uint256 i = 0; i < _votings.length; i++) {
            proxyVote(_votings[i], _voteIds[i], _supports[i]);
        }
    }

    function proxyVote(Voting _voting, uint256 _voteId, bool _supports) public onlyRepresentative {
        _proxyFullRepresentedPrincipals(_voting, _voteId, _supports);
        _proxyInstanceRepresentedPrincipals(_voting, _voteId, _supports);
        _proxyVoteRepresentedPrincipals(_voting, _voteId, _supports);
    }

    function _proxyFullRepresentedPrincipals(Voting _voting, uint256 _voteId, bool _supports) internal {
        for (uint256 i = 0; i < fullRepresented.length; i++) {
            address voter = fullRepresented[i];
            if (_canVote(_voting, _voteId, voter)) {
                HybridProxyVoting(voter).proxyVote(_voting, _voteId, _supports);
            }
        }
    }

    function _proxyInstanceRepresentedPrincipals(Voting _voting, uint256 _voteId, bool _supports) internal {
        address[] instanceRepresentedPrincipals = instanceRepresented[_voting];
        for (uint256 i = 0; i < instanceRepresentedPrincipals.length; i++) {
            address voter = instanceRepresentedPrincipals[i];
            if (_canVote(_voting, _voteId, voter)) {
                HybridProxyVoting(voter).proxyVote(_voting, _voteId, _supports);
            }
        }
    }

    function _proxyVoteRepresentedPrincipals(Voting _voting, uint256 _voteId, bool _supports) internal {
        address[] voteRepresentedPrincipals = voteRepresented[_voting][_voteId];
        for (uint256 i = 0; i < voteRepresentedPrincipals.length; i++) {
            address voter = voteRepresentedPrincipals[i];
            if (_canVote(_voting, _voteId, voter)) {
                HybridProxyVoting(voter).proxyVote(_voting, _voteId, _supports);
            }
        }
    }

    function _canVote(Voting _voting, uint256 _voteId, address _voter) internal view returns (bool) {
        return _isWhitelisted(_voter) && _voting.canVote(_voteId, _voter);
    }

    function _isProxyVoting(address _principal) internal view returns (bool) {
        return proxyVotingRegistry.isValidProxyVoting(_principal);
    }

    function _isWhitelisted(address _principal) internal view returns (bool) {
        return !principalsBlacklist[_principal];
    }
}


contract ProxyVotingRegistry {
    mapping (address => bool) internal proxyVotings;
    mapping (address => bool) internal representativeProxies;

    event NewProxyVoting(address proxyVoting);
    event NewRepresentativeProxy(address representativeProxy);

    function newProxyVoting(uint64 _overruleWindow) external returns (HybridProxyVoting) {
        HybridProxyVoting proxyVoting = new HybridProxyVoting(msg.sender, _overruleWindow);
        address proxyVotingAddress = address(proxyVoting);
        proxyVotings[proxyVotingAddress] = true;
        emit NewProxyVoting(proxyVotingAddress);
        return proxyVoting;
    }

    function newRepresentativeProxy() external returns (HybridRepresentativeProxy) {
        HybridRepresentativeProxy representativeProxy = new HybridRepresentativeProxy(msg.sender, ProxyVotingRegistry(this));
        address representativeProxyAddress = address(representativeProxy);
        representativeProxies[representativeProxyAddress] = true;
        emit NewRepresentativeProxy(representativeProxyAddress);
        return representativeProxy;
    }

    function isValidProxyVoting(address _proxyVoting) public view returns (bool) {
        return proxyVotings[_proxyVoting];
    }

    function isValidRepresentativeProxy(address _representativeProxy) public view returns (bool) {
        return representativeProxies[_representativeProxy];
    }

    // TODO: we could handle here specific logic to allow representatives signaling their involvement in specific domains
}