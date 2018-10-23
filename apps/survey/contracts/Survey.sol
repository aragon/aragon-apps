/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";


contract Survey is AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant CREATE_SURVEYS_ROLE = keccak256("CREATE_SURVEYS_ROLE");
    bytes32 public constant MODIFY_PARTICIPATION_ROLE = keccak256("MODIFY_PARTICIPATION_ROLE");

    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 public constant ABSTAIN_VOTE = 0;

    string private constant ERROR_MIN_PARTICIPATION = "SURVEY_MIN_PARTICIPATION";
    string private constant ERROR_NO_SURVEY = "SURVEY_NO_SURVEY";
    string private constant ERROR_NO_VOTING_POWER = "SURVEY_NO_VOTING_POWER";
    string private constant ERROR_CAN_NOT_VOTE = "SURVEY_CAN_NOT_VOTE";
    string private constant ERROR_VOTE_WRONG_INPUT = "SURVEY_VOTE_WRONG_INPUT";
    string private constant ERROR_VOTE_WRONG_OPTION = "SURVEY_VOTE_WRONG_OPTION";
    string private constant ERROR_VOTE_WHOLE_WRONG_OPTION = "SURVEY_VOTE_WHOLE_WRONG_OPTION";
    string private constant ERROR_NO_STAKE = "SURVEY_NO_STAKE";
    string private constant ERROR_OPTIONS_NOT_ORDERED = "SURVEY_OPTIONS_NOT_ORDERED";
    string private constant ERROR_NO_OPTION = "SURVEY_NO_OPTION";

    struct OptionCast {
        uint256 optionId;
        uint256 stake;
    }

    /* Allows for multiple option votes.
     * Index 0 is always used for the ABSTAIN_VOTE option, that's calculated automatically by the
     * contract.
     */
    struct MultiOptionVote {
        uint256 optionsCastedLength;
        // `castedVotes` simulates an array
        // Each OptionCast in `castedVotes` must be ordered by ascending option IDs
        mapping (uint256 => OptionCast) castedVotes;
    }

    struct SurveyStruct {
        address creator;
        uint64 startDate;
        uint64 snapshotBlock;
        uint64 minParticipationPct;
        uint256 options;
        uint256 votingPower;                    // total tokens that can cast a vote
        uint256 participation;                  // tokens that casted a vote
        string metadata;

        // Note that option IDs are from 1 to `options`, due to ABSTAIN_VOTE taking 0
        mapping (uint256 => uint256) optionPower;       // option ID -> voting power for option
        mapping (address => MultiOptionVote) votes;     // voter -> options voted, with its stakes
    }

    MiniMeToken public token;
    uint64 public minParticipationPct;
    uint64 public surveyTime;

    // We are mimicing an array, we use a mapping instead to make app upgrade more graceful
    mapping (uint256 => SurveyStruct) internal surveys;
    uint256 public surveysLength;

    event StartSurvey(uint256 indexed surveyId);
    event CastVote(uint256 indexed surveyId, address indexed voter, uint256 option, uint256 stake, uint256 optionPower);
    event ResetVote(uint256 indexed surveyId, address indexed voter, uint256 option, uint256 previousStake, uint256 optionPower);
    event ChangeMinParticipation(uint64 minParticipationPct);

    modifier acceptableMinParticipationPct(uint64 _minParticipationPct) {
        require(_minParticipationPct > 0 && _minParticipationPct <= PCT_BASE, ERROR_MIN_PARTICIPATION);
        _;
    }

    modifier surveyExists(uint256 _surveyId) {
        require(_surveyId < surveysLength, ERROR_NO_SURVEY);
        _;
    }

    /**
    * @notice Initialize Survey app with `_token.symbol(): string` for governance, minimum acceptance participation of `@formatPct(_minParticipationPct)`%, and a voting duration of `@transformTime(_surveyTime)`
    * @param _token MiniMeToken address that will be used as governance token
    * @param _minParticipationPct Percentage of total voting power that must participate in a survey for it to be taken into account (expressed as a 10^18 percentage, (eg 10^16 = 1%, 10^18 = 100%)
    * @param _surveyTime Seconds that a survey will be open for token holders to vote
    */
    function initialize(
        MiniMeToken _token,
        uint64 _minParticipationPct,
        uint64 _surveyTime
    )
        external
        onlyInit
        acceptableMinParticipationPct(_minParticipationPct)
    {
        initialized();

        token = _token;
        minParticipationPct = _minParticipationPct;
        surveyTime = _surveyTime;
    }

    /**
    * @notice Change minimum acceptance participation to `@formatPct(_minParticipationPct)`%
    * @param _minParticipationPct New acceptance participation
    */
    function changeMinAcceptParticipationPct(uint64 _minParticipationPct)
        external
        authP(MODIFY_PARTICIPATION_ROLE, arr(uint256(_minParticipationPct)))
        acceptableMinParticipationPct(_minParticipationPct)
    {
        minParticipationPct = _minParticipationPct;

        emit ChangeMinParticipation(_minParticipationPct);
    }

    /**
    * @notice Create a new non-binding survey about "`_metadata`"
    * @param _metadata Survey metadata
    * @param _options Number of options voters can decide between
    * @return surveyId id for newly created survey
    */
    function newSurvey(string _metadata, uint256 _options) external auth(CREATE_SURVEYS_ROLE) returns (uint256 surveyId) {
        surveyId = surveysLength++;
        SurveyStruct storage survey = surveys[surveyId];
        survey.creator = msg.sender;
        survey.startDate = getTimestamp64();
        survey.options = _options;
        survey.metadata = _metadata;
        survey.snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        survey.votingPower = token.totalSupplyAt(survey.snapshotBlock);
        require(survey.votingPower > 0, ERROR_NO_VOTING_POWER);
        survey.minParticipationPct = minParticipationPct;

        emit StartSurvey(surveyId);
    }

    /**
    * @notice Reset previously casted vote in survey #`_surveyId`, if any.
    * @param _surveyId Id for survey
    */
    function resetVote(uint256 _surveyId) public isInitialized surveyExists(_surveyId) {
        require(canVote(_surveyId, msg.sender), ERROR_CAN_NOT_VOTE);

        SurveyStruct storage survey = surveys[_surveyId];
        MultiOptionVote storage previousVote = survey.votes[msg.sender];
        if (previousVote.optionsCastedLength > 0) {
            // Voter removes their vote (index 0 is the abstain vote)
            for (uint256 i = 1; i <= previousVote.optionsCastedLength; i++) {
                OptionCast storage previousOptionCast = previousVote.castedVotes[i];
                uint256 previousOptionPower = survey.optionPower[previousOptionCast.optionId];
                survey.optionPower[previousOptionCast.optionId] = previousOptionPower.sub(previousOptionCast.stake);

                emit ResetVote(_surveyId, msg.sender, previousOptionCast.optionId, previousOptionCast.stake, previousOptionPower);
            }

            // Compute previously casted votes (i.e. substract non-used tokens from stake)
            uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
            uint256 previousParticipation = voterStake.sub(previousVote.castedVotes[0].stake);
            // And remove it from total participation
            survey.participation = survey.participation.sub(previousParticipation);

            // Reset previously voted options
            delete survey.votes[msg.sender];
        }
    }

    /**
    * @notice Vote for multiple options in survey #`_surveyId`.
    * @param _surveyId Id for survey
    * @param _optionIds Array with indexes of supported options
    * @param _stakes Number of tokens assigned to each option
    */
    function voteOptions(uint256 _surveyId, uint256[] _optionIds, uint256[] _stakes) public isInitialized surveyExists(_surveyId) {
        require(_optionIds.length == _stakes.length && _optionIds.length > 0, ERROR_VOTE_WRONG_INPUT);

        SurveyStruct storage survey = surveys[_surveyId];

        // Revert previous votes, if any (also checks if canVote)
        resetVote(_surveyId);

        uint256 totalVoted = 0;
        // Reserve first index for ABSTAIN_VOTE
        survey.votes[msg.sender].castedVotes[0] = OptionCast({ optionId: ABSTAIN_VOTE, stake: 0 });
        for (uint256 optionIndex = 1; optionIndex <= _optionIds.length; optionIndex++) {
            // Voters don't specify that they're abstaining,
            // but we still keep track of this by reserving the first index of a survey's votes.
            // We subtract 1 from the indexes of the arrays passed in by the voter to account for this.
            uint256 optionId = _optionIds[optionIndex - 1];
            uint256 stake = _stakes[optionIndex - 1];

            require(optionId != ABSTAIN_VOTE && optionId <= survey.options, ERROR_VOTE_WRONG_OPTION);
            require(stake > 0, ERROR_NO_STAKE);
            // Let's avoid repeating an option by making sure that ascending order is preserved in
            // the options array by checking that the current optionId is larger than the last one
            // we added
            require(survey.votes[msg.sender].castedVotes[optionIndex - 1].optionId < optionId, ERROR_OPTIONS_NOT_ORDERED);

            // Register voter amount
            survey.votes[msg.sender].castedVotes[optionIndex] = OptionCast({ optionId: optionId, stake: stake });

            // Add to total option support
            survey.optionPower[optionId] = survey.optionPower[optionId].add(stake);

            // Keep track of stake used so far
            totalVoted = totalVoted.add(stake);

            emit CastVote(_surveyId, msg.sender, optionId, stake, survey.optionPower[optionId]);
        }

        // Compute and register non used tokens
        // Implictly we are doing require(totalVoted <= voterStake) too
        // (as stated before, index 0 is for ABSTAIN_VOTE option)
        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        survey.votes[msg.sender].castedVotes[0].stake = voterStake.sub(totalVoted);

        // Register number of options voted
        survey.votes[msg.sender].optionsCastedLength = _optionIds.length;

        // Add voter tokens to participation
        survey.participation = survey.participation.add(totalVoted);
        assert(survey.participation <= survey.votingPower);
    }

    /**
    * @notice Vote option #`_optionId` in survey #`_surveyId`.
    * @dev It will use the whole balance.
    * @param _surveyId Id for survey
    * @param _optionId Index of supported option
    */
    function voteOption(uint256 _surveyId, uint256 _optionId) public isInitialized surveyExists(_surveyId) {
        require(_optionId != ABSTAIN_VOTE, ERROR_VOTE_WHOLE_WRONG_OPTION);
        SurveyStruct storage survey = surveys[_surveyId];
        // This could re-enter, though we can asume the governance token is not maliciuous
        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        uint256[] memory options = new uint256[](1);
        uint256[] memory stakes = new uint256[](1);
        options[0] = _optionId;
        stakes[0] = voterStake;

        voteOptions(_surveyId, options, stakes);
    }

    function canVote(uint256 _surveyId, address _voter) public view surveyExists(_surveyId) returns (bool) {
        SurveyStruct storage survey = surveys[_surveyId];

        return _isSurveyOpen(survey) && token.balanceOfAt(_voter, survey.snapshotBlock) > 0;
    }

    function getSurvey(uint256 _surveyId)
        public
        view
        surveyExists(_surveyId)
        returns (
            bool _open,
            address _creator,
            uint64 _startDate,
            uint64 _snapshotBlock,
            uint64 _minParticipationPct,
            uint256 _votingPower,
            uint256 _participation,
            uint256 _options
        )
    {
        SurveyStruct storage survey = surveys[_surveyId];

        _open = _isSurveyOpen(survey);
        _creator = survey.creator;
        _startDate = survey.startDate;
        _snapshotBlock = survey.snapshotBlock;
        _minParticipationPct = survey.minParticipationPct;
        _votingPower = survey.votingPower;
        _participation = survey.participation;
        _options = survey.options;
    }

    function getSurveyMetadata(uint256 _surveyId) public view surveyExists(_surveyId) returns (string) {
        return surveys[_surveyId].metadata;
    }

    /* solium-disable-next-line function-order */
    function getVoterState(uint256 _surveyId, address _voter)
        external
        view
        surveyExists(_surveyId)
        returns (uint256[] options, uint256[] stakes)
    {
        if (surveys[_surveyId].votes[_voter].optionsCastedLength == 0) {
            return (new uint256[](0), new uint256[](0));
        }

        MultiOptionVote storage vote = surveys[_surveyId].votes[_voter];
        options = new uint256[](vote.optionsCastedLength + 1);
        stakes = new uint256[](vote.optionsCastedLength + 1);
        for (uint256 i = 0; i <= vote.optionsCastedLength; i++) {
            options[i] = vote.castedVotes[i].optionId;
            stakes[i] = vote.castedVotes[i].stake;
        }
    }

    function getOptionPower(uint256 _surveyId, uint256 _optionId) public view surveyExists(_surveyId) returns (uint256) {
        SurveyStruct storage survey = surveys[_surveyId];
        require(_optionId <= survey.options, ERROR_NO_OPTION);

        return survey.optionPower[_optionId];
    }

    function isParticipationAchieved(uint256 _surveyId) public view surveyExists(_surveyId) returns (bool) {
        SurveyStruct storage survey = surveys[_surveyId];
        // votingPower is always > 0
        uint256 participationPct = survey.participation.mul(PCT_BASE) / survey.votingPower;
        return participationPct >= survey.minParticipationPct;
    }

    function _isSurveyOpen(SurveyStruct storage _survey) internal view returns (bool) {
        return getTimestamp64() < _survey.startDate.add(surveyTime);
    }
}
