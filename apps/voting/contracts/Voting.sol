pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Voting is IForwarder, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    MiniMeToken public token;
    uint256 public supportRequiredPct;
    uint256 public minAcceptQuorumPct;
    uint64 public voteTime;

    uint256 constant public PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18 

    uint256 constant NO_VOTE = 0;
    uint256 constant public YEA_VOTE_OPTION = 1;
    uint256 constant public NAY_VOTE_OPTION = 2;

    bytes32 constant public CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 constant public MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");

    struct Vote {
        address creator;
        uint64 startDate;
        uint256 options;
        uint256 snapshotBlock;
        uint256 minAcceptQuorumPct;
        uint256 votingPower;        // total tokens that can cast a vote
        uint256 quorum;             // tokens that casted a vote
        string metadata;
        bytes executionScript;
        bool executed;

        mapping (uint256 => uint256) votes;     // option -> voting power for option
        mapping (address => uint256) voters;    // voter -> option voted
    }

    Vote[] votes;

    event StartVote(uint256 indexed voteId);
    event CastVote(uint256 indexed voteId, address indexed voter, uint256 option, uint256 stake);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeMinQuorum(uint256 minAcceptQuorumPct);

    /**
    * @notice Initializes Voting app with `_token.symbol(): string` for governance, minimum support of `(_supportRequiredPct - _supportRequiredPct % 10^14) / 10^16`, minimum acceptance quorum of `(_minAcceptQuorumPct - _minAcceptQuorumPct % 10^14) / 10^16` and vote duations of `(_voteTime - _voteTime % 86400) / 86400` day `_voteTime >= 172800 ? 's' : ''`
    * @param _token MiniMeToken address that will be used as governance token
    * @param _supportRequiredPct Percentage of voters that must support a vote for it to succeed (expressed as a 10^18 percentage, (eg 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of total voting power that must support a vote for it to succeed (expressed as a 10^18 percentage, (eg 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote (unless it is impossible for the fate of the vote to change)
    */
    function initialize(
        MiniMeToken _token,
        uint256 _supportRequiredPct,
        uint256 _minAcceptQuorumPct,
        uint64 _voteTime
    ) onlyInit external
    {
        initialized();

        require(_minAcceptQuorumPct > 0);
        require(_supportRequiredPct <= PCT_BASE);
        require(_supportRequiredPct >= _minAcceptQuorumPct);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;

        votes.length += 1;
    }

    /**
    * @notice Change minimum acceptance quorum to `(_minAcceptQuorumPct - _minAcceptQuorumPct % 10^14) / 10^16`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint256 _minAcceptQuorumPct) authP(MODIFY_QUORUM_ROLE, arr(_minAcceptQuorumPct, minAcceptQuorumPct)) external {
        require(_minAcceptQuorumPct > 0);
        require(supportRequiredPct >= _minAcceptQuorumPct);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) auth(CREATE_VOTES_ROLE) external returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, 2); // binary
    }

    /**
    * @notice Create a new signaling non-binding vote about "`_metadata`"
    * @param _metadata Vote metadata
    * @param _options Number of options voters can decide between
    * @return voteId id for newly created vote
    */
    function newSignalingVote(string _metadata, uint256 _options) auth(CREATE_VOTES_ROLE) external returns (uint256 voteId) {
        return _newVote(new bytes(0), _metadata, _options);
    }

    /**
    * @notice Vote `_supports ? 'yay' : 'nay'` in vote #`_voteId`
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executeOnDecisiveThreshold Whether it should execute the vote if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executeOnDecisiveThreshold) external {
        voteOption(_voteId, _supports ? YEA_VOTE_OPTION : NAY_VOTE_OPTION, _executeOnDecisiveThreshold);
    }

    /**
    * @notice Vote option #`_option` in vote #`_voteId`.
    * @dev If voting option is 0, that's like cancelling the previously casted vote
    * @param _voteId Id for vote
    * @param _option Index of supported option
    * @param _executeOnDecisiveThreshold Whether it should execute the vote if it becomes decided
    */
    function voteOption(uint256 _voteId, uint256 _option, bool _executeOnDecisiveThreshold) public {
        require(canVote(_voteId, msg.sender));
        _vote(_voteId, _option, msg.sender, _executeOnDecisiveThreshold);
    }

    /**
    * @notice Execute the result of vote #`_voteId`
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external {
        require(canExecute(_voteId));
        _executeVote(_voteId);
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action, and casts a support vote
    * @dev IForwarder interface conformance
    * @param _evmScript Start vote with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript));
        uint256 voteId = _newVote(_evmScript, "", 2);

        if (canVote(voteId, msg.sender)) {
            _vote(voteId, YEA_VOTE_OPTION, msg.sender, true);
        }
    }

    function canForward(address _sender, bytes _evmCallScript) public view returns (bool) {
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    function canVote(uint256 _voteId, address _voter) public view returns (bool) {
        Vote vote = votes[_voteId];

        return _isVoteOpen(vote) && token.balanceOfAt(_voter, vote.snapshotBlock) > 0;
    }

    function canExecute(uint256 _voteId) public view returns (bool) {
        Vote vote = votes[_voteId];

        if (vote.options != 2) {
            return false; // only allow execs on binary votes
        }

        if (vote.executed) {
            return false; // don't allow re-execution of votes
        }

        uint256 yea = vote.votes[YEA_VOTE_OPTION];

        // if it is already decided with the current votes, allow execute
        if (_isValuePct(yea, vote.votingPower, supportRequiredPct)) {
            return true;
        }

        // if the vote is still open and it isn't decided, dont execute
        if (_isVoteOpen(vote)) {
            return false;
        }

        // after vote time ended:

        // don't execute if it didn't get the needed support
        if (!_isValuePct(yea, vote.quorum, supportRequiredPct)) {
            return false;
        }

        // if it has that support:

        // don't execute if it there wasn't enough accept quorum
        if (!_isValuePct(yea, vote.votingPower, vote.minAcceptQuorumPct)) {
            return false;
        }

        return true;
    }

    function getVote(uint256 _voteId) public view returns (bool open, bool executed, address creator, uint64 startDate, uint256 snapshotBlock, uint256 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, uint256 quorum, bytes script) {
        Vote vote = votes[_voteId];

        open = _isVoteOpen(vote);
        executed = vote.executed;
        creator = vote.creator;
        startDate = vote.startDate;
        snapshotBlock = vote.snapshotBlock;
        minAcceptQuorum = vote.minAcceptQuorumPct;
        yea = vote.votes[YEA_VOTE_OPTION];
        nay = vote.votes[NAY_VOTE_OPTION];
        votingPower = vote.votingPower;
        quorum = vote.quorum;
        script = vote.executionScript;
    }

    function getVoteMetadata(uint256 _voteId) public view returns (string) {
        return votes[_voteId].metadata;
    }

    function getVoterState(uint256 _voteId, address _voter) public view returns (uint256) {
        return votes[_voteId].voters[_voter];
    }

    function getOptionSupport(uint256 _voteId, uint256 _option) public view returns (uint256) {
        return votes[_voteId].votes[_option];
    }

    function _newVote(bytes _executionScript, string _metadata, uint256 _options) isInitialized internal returns (uint256 voteId) {
        if (_executionScript.length > 0) {
            assert(_options == 2); // should have only allowed to create executable binary votes
        }

        voteId = votes.length++;
        Vote vote = votes[voteId];
        vote.executionScript = _executionScript;
        vote.creator = msg.sender;
        vote.startDate = uint64(now);
        vote.options = _options;
        vote.metadata = _metadata;
        vote.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        vote.votingPower = token.totalSupplyAt(vote.snapshotBlock);
        vote.minAcceptQuorumPct = minAcceptQuorumPct;

        StartVote(voteId);
    }

    function _vote(uint256 _voteId, uint256 _option, address _voter, bool _executeOnDecisiveThreshold) internal {
        Vote vote = votes[_voteId];

        require(_option <= vote.options);

        // this could re-enter, though we can asume the governance token is not maliciuous
        uint256 voterStake = token.balanceOfAt(_voter, vote.snapshotBlock);
        require(voterStake > 0);
        
        uint256 previouslyVotedOption = vote.voters[_voter];
        require(previouslyVotedOption != _option);

        if (previouslyVotedOption == NO_VOTE) {
            // add voter tokens to quorum
            vote.quorum = vote.quorum.add(voterStake);
        } else {
            // remove previous vote influence
            vote.votes[previouslyVotedOption] = vote.votes[previouslyVotedOption].sub(voterStake);
        }

        if (_option != NO_VOTE) {
            // add vote influence
            vote.votes[_option] = vote.votes[_option].add(voterStake);
        } else {
            // voter removes their vote
            vote.quorum = vote.quorum.sub(voterStake);
        }

        vote.voters[_voter] = _option;

        CastVote(_voteId, _voter, _option, voterStake);

        if (_executeOnDecisiveThreshold && canExecute(_voteId)) {
            _executeVote(_voteId);
        }
    }

    function _executeVote(uint256 _voteId) internal {
        Vote vote = votes[_voteId];

        vote.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(vote.executionScript, input, new address[](0));

        ExecuteVote(_voteId);
    }

    function _isVoteOpen(Vote vote) internal view returns (bool) {
        return uint64(now) < (vote.startDate.add(voteTime)) && !vote.executed;
    }

    /**
    * @dev Calculates whether `_value` is at least a percent `_pct` over `_total`
    */
    function _isValuePct(uint256 _value, uint256 _total, uint256 _pct) internal pure returns (bool) {
        if (_value == 0 && _total > 0)
            return false;

        uint256 m = _total.mul(_pct);
        uint256 v = m / PCT_BASE;

        // If division is exact, allow same value, otherwise require value to be greater
        return m % PCT_BASE == 0 ? _value >= v : _value > v;
    }
}
