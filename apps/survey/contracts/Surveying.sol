pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Surveying is AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    uint256 constant public PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 constant NO_VOTE = 0;
    bytes32 constant public CREATE_SURVEYS_ROLE = keccak256("CREATE_SURVEYS_ROLE");
    bytes32 constant public MODIFY_PARTICIPATION_ROLE = keccak256("MODIFY_PARTICIPATION_ROLE");

    MiniMeToken public token;
    uint256 public minAcceptParticipationPct;
    uint64 public surveyTime;

    /* To allow multiple option votes.
     * Array lengths must match.
     * Index 0 will always be for NO_VOTE option
     * options array must be in ascending order
     */
    struct MultiOptionVote {
        uint256[] options;
        uint256[] stakes;
    }

    struct Survey {
        address creator;
        uint64 startDate;
        uint256 options;
        uint256 snapshotBlock;
        uint256 minAcceptParticipationPct;
        uint256 votingPower;                    // total tokens that can cast a vote
        uint256 participation;                  // tokens that casted a vote
        string metadata;

        mapping (uint256 => uint256) votes;     // option -> voting power for option
        mapping (address => MultiOptionVote) voters;    // voter -> options voted, with its stakes
    }

    Survey[] surveys;

    event StartSurvey(uint256 indexed surveyId);
    event CastVote(uint256 indexed surveyId, address indexed voter, uint256 option, uint256 stake);
    event ChangeMinParticipation(uint256 minAcceptParticipationPct);

    /**
    * @notice Initializes Survey app with `_token.symbol(): string` for governance, minimum acceptance participation of `(_minAcceptParticipationPct - _minAcceptParticipationPct % 10^14) / 10^16` and durations of `(_surveyTime - _surveyTime % 86400) / 86400` day `_surveyTime >= 172800 ? 's' : ''`
    * @param _token MiniMeToken address that will be used as governance token
    * @param _minAcceptParticipationPct Percentage of total voting power that must participate in a survey for it to be taken into account (expressed as a 10^18 percentage, (eg 10^16 = 1%, 10^18 = 100%)
    * @param _surveyTime Seconds that a survey will be open for token holders to vote
    */
    function initialize(
        MiniMeToken _token,
        uint256 _minAcceptParticipationPct,
        uint64 _surveyTime
    ) onlyInit external
    {
        initialized();

        require(_minAcceptParticipationPct > 0 && _minAcceptParticipationPct <= PCT_BASE);

        token = _token;
        minAcceptParticipationPct = _minAcceptParticipationPct;
        surveyTime = _surveyTime;
    }

    /**
    * @notice Change minimum acceptance participation to `(_minAcceptParticipationPct - _minAcceptParticipationPct % 10^14) / 10^16`%
    * @param _minAcceptParticipationPct New acceptance participation
    */
    function changeMinAcceptParticipationPct(uint256 _minAcceptParticipationPct) authP(MODIFY_PARTICIPATION_ROLE, arr(_minAcceptParticipationPct)) external {
        require(_minAcceptParticipationPct > 0);
        require(_minAcceptParticipationPct <= PCT_BASE);
        minAcceptParticipationPct = _minAcceptParticipationPct;

        ChangeMinParticipation(_minAcceptParticipationPct);
    }

    /**
    * @notice Create a new non-binding survey about "`_metadata`"
    * @param _metadata Survey metadata
    * @param _options Number of options voters can decide between
    * @return surveyId id for newly created survey
    */
    function newSurvey(string _metadata, uint256 _options) auth(CREATE_SURVEYS_ROLE) external returns (uint256 surveyId) {
        return _newSurvey(_metadata, _options);
    }

    /**
    * @notice Vote for multiple options in survey #`_surveyId`.
    * @dev Empty options and stakes arrays allow to remove previous votes
    * @param _surveyId Id for survey
    * @param _options Array with indexes of supported options
    * @param _stakes Number of tokens assigned to each option
    */
    function voteOptions(uint256 _surveyId, uint256[] _options, uint256[] _stakes) public {
        require(_options.length == _stakes.length);
        require(canVote(_surveyId, msg.sender));

        uint256 i;
        Survey storage survey = surveys[_surveyId];

        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        MultiOptionVote storage previouslyVoted = survey.voters[msg.sender];

        // revert previous votes, if any
        if (previouslyVoted.options.length > 0) {
            // voter removes their vote
            for (i = 1; i < previouslyVoted.options.length; i++) {
                survey.votes[previouslyVoted.options[i]] = survey.votes[previouslyVoted.options[i]].sub(previouslyVoted.stakes[i]);
            }
            // remove previous vote participation
            survey.participation = survey.participation.sub(voterStake.sub(previouslyVoted.stakes[0]));
        }

        // reset previously voted options, if any
        delete survey.voters[msg.sender];

        uint256 totalVoted = 0;
        // reserve first index for NO_VOTE
        survey.voters[msg.sender].options.push(NO_VOTE);
        survey.voters[msg.sender].stakes.push(0);
        for (i = 0; i < _options.length; i++) {
            _voteOption(_surveyId, _options[i], _stakes[i]);
            // let's avoid repeating an option by
            // making sure that ascending order is preserved in options array
            require(survey.voters[msg.sender].options[i] < survey.voters[msg.sender].options[i+1]);
            totalVoted = totalVoted.add(_stakes[i]);
        }

        // compute and register non used tokens
        // implictly we are doing require(totalVoted <= voterStake) too:
        survey.voters[msg.sender].stakes[0] = voterStake.sub(totalVoted);

        // add voter tokens to participation
        survey.participation = survey.participation.add(totalVoted);
    }

    /**
    * @notice Vote option #`_option` in survey #`_surveyId`.
    * @dev It will use the whole balance. If voting option is 0, that's like cancelling the previously casted vote
    * @param _surveyId Id for survey
    * @param _option Index of supported option
    */
    function voteOption(uint256 _surveyId, uint256 _option) public {
        Survey storage survey = surveys[_surveyId];
        // this could re-enter, though we can asume the governance token is not maliciuous
        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        uint256[] memory options = new uint256[](1);
        uint256[] memory stakes = new uint256[](1);
        options[0]= _option;
        stakes[0] = voterStake;

        voteOptions(_surveyId, options, stakes);
    }

    function _voteOption(uint256 _surveyId, uint256 _option, uint256 _stake) public {
        Survey storage survey = surveys[_surveyId];

        require(_option != NO_VOTE && _option <= survey.options);
        require(_stake > 0);


        // register voter amount
        survey.voters[msg.sender].options.push(_option);
        survey.voters[msg.sender].stakes.push(_stake);

        // add to total option support
        survey.votes[_option] = survey.votes[_option].add(_stake);

        CastVote(_surveyId, msg.sender, _option, _stake);
    }

    function canVote(uint256 _surveyId, address _voter) public view returns (bool) {
        Survey storage survey = surveys[_surveyId];

        return _isSurveyOpen(survey) && token.balanceOfAt(_voter, survey.snapshotBlock) > 0;
    }

    function getSurvey(uint256 _surveyId) public view returns (bool open, address creator, uint64 startDate, uint256 snapshotBlock, uint256 minParticipationPct, uint256 votingPower, uint256 participation, uint256 options) {
        Survey storage survey = surveys[_surveyId];

        open = _isSurveyOpen(survey);
        creator = survey.creator;
        startDate = survey.startDate;
        snapshotBlock = survey.snapshotBlock;
        minParticipationPct = survey.minAcceptParticipationPct;
        votingPower = survey.votingPower;
        participation = survey.participation;
        options = survey.options;
    }

    function getSurveyMetadata(uint256 _surveyId) public view returns (string) {
        return surveys[_surveyId].metadata;
    }

    function getVoterState(uint256 _surveyId, address _voter) public view returns (uint256[] options, uint256[] stakes) {
        options = surveys[_surveyId].voters[_voter].options;
        stakes = surveys[_surveyId].voters[_voter].stakes;
    }

    function getOptionSupport(uint256 _surveyId, uint256 _option) public view returns (uint256) {
        return surveys[_surveyId].votes[_option];
    }

    function isParticipationAchieved(uint256 _surveyId) public view returns (bool) {
        Survey storage survey = surveys[_surveyId];
        // votingPower is always > 0
        uint256 participationPct = survey.participation.mul(PCT_BASE) / survey.votingPower;
        return participationPct >= survey.minAcceptParticipationPct;
    }

    function _newSurvey(string _metadata, uint256 _options) isInitialized internal returns (uint256 surveyId) {
        surveyId = surveys.length++;
        Survey storage survey = surveys[surveyId];
        survey.creator = msg.sender;
        survey.startDate = uint64(now);
        survey.options = _options;
        survey.metadata = _metadata;
        survey.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        survey.votingPower = token.totalSupplyAt(survey.snapshotBlock);
        require(survey.votingPower > 0);
        survey.minAcceptParticipationPct = minAcceptParticipationPct;

        StartSurvey(surveyId);
    }

    function _isSurveyOpen(Survey storage survey) internal view returns (bool) {
        return uint64(now) < (survey.startDate.add(surveyTime));
    }

}
