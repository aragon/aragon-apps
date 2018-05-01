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
    uint256 constant public NO_VOTE = 0;
    bytes32 constant public CREATE_SURVEYS_ROLE = keccak256("CREATE_SURVEYS_ROLE");
    bytes32 constant public MODIFY_PARTICIPATION_ROLE = keccak256("MODIFY_PARTICIPATION_ROLE");

    MiniMeToken public token;
    uint256 public minAcceptParticipationPct;
    uint64 public surveyTime;

    struct OptionCast {
        uint256 optionId;
        uint256 stake;
    }

    /** To allow multiple option votes.
     * Index 0 will always be for NO_VOTE option
     * option Ids must be in ascending order
     */
    struct MultiOptionVote {
        uint256 optionsCastedLength;
        mapping (uint256 => OptionCast) castedVotes;
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

        Survey storage survey = surveys[_surveyId];

        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        MultiOptionVote storage previouslyVoted = survey.voters[msg.sender];

        // revert previous votes, if any
        if (previouslyVoted.optionsCastedLength > 0) {
            // voter removes their vote
            for (uint256 i = 1; i <= previouslyVoted.optionsCastedLength; i++) {
                survey.votes[previouslyVoted.castedVotes[i].optionId] = survey.votes[previouslyVoted.castedVotes[i].optionId].sub(previouslyVoted.castedVotes[i].stake);
            }
            // remove previous vote participation
            survey.participation = survey.participation.sub(voterStake.sub(previouslyVoted.castedVotes[0].stake));

            // reset previously voted options, if any
            delete survey.voters[msg.sender];
        }

        uint256 totalVoted = 0;
        // reserve first index for NO_VOTE
        survey.voters[msg.sender].castedVotes[0] = OptionCast({optionId: NO_VOTE, stake: 0});
        for (uint256 j = 0; j < _options.length; j++) {
            require(_options[j] != NO_VOTE && _options[j] <= survey.options);
            require(_stakes[j] > 0);

            // register voter amount
            // index 0 in options array is reserved for NO_VOTE, so index will be 1 more
            survey.voters[msg.sender].castedVotes[j + 1] = OptionCast({optionId: _options[j], stake: _stakes[j]});

            // add to total option support
            survey.votes[_options[j]] = survey.votes[_options[j]].add(_stakes[j]);

            // let's avoid repeating an option by
            // making sure that ascending order is preserved in options array
            // index 0 in options array is reserved for NO_VOTE, so here we are comparing
            // the option just added (_options[j] = options[j+1]) with the previous one (options[j])
            require(survey.voters[msg.sender].castedVotes[j].optionId < survey.voters[msg.sender].castedVotes[j + 1].optionId);
            totalVoted = totalVoted.add(_stakes[j]);

            CastVote(_surveyId, msg.sender, _options[j], _stakes[j]);
        }

        // compute and register non used tokens
        // implictly we are doing require(totalVoted <= voterStake) too
        // (as stated before, index 0 is for NO_VOTE option)
        survey.voters[msg.sender].castedVotes[0].stake = voterStake.sub(totalVoted);

        // register number of options voted
        survey.voters[msg.sender].optionsCastedLength = _options.length;

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
        options[0] = _option;
        stakes[0] = voterStake;

        voteOptions(_surveyId, options, stakes);
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
        if (surveys[_surveyId].voters[_voter].optionsCastedLength == 0) {
            return (new uint256[](0), new uint256[](0));
        }

        options = new uint256[](surveys[_surveyId].voters[_voter].optionsCastedLength + 1);
        stakes = new uint256[](surveys[_surveyId].voters[_voter].optionsCastedLength + 1);
        for (uint256 i = 0; i <= surveys[_surveyId].voters[_voter].optionsCastedLength; i++) {
            options[i] = surveys[_surveyId].voters[_voter].castedVotes[i].optionId;
            stakes[i] = surveys[_surveyId].voters[_voter].castedVotes[i].stake;
        }
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
        return uint64(now) < survey.startDate.add(surveyTime);
    }

}
