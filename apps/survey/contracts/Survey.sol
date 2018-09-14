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

    uint256 constant public PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 constant public ABSTAIN_VOTE = 0;
    bytes32 constant public CREATE_SURVEYS_ROLE = keccak256("CREATE_SURVEYS_ROLE");
    bytes32 constant public MODIFY_PARTICIPATION_ROLE = keccak256("MODIFY_PARTICIPATION_ROLE");

    MiniMeToken public token;
    uint256 public minParticipationPct;
    uint64 public surveyTime;

    struct OptionCast {
        uint256 optionId;
        uint256 stake;
    }

    /* To allow multiple option votes.
     * Index 0 will always be for ABSTAIN_VOTE option
     * option Ids must be in ascending order
     */
    struct MultiOptionVote {
        // replacing 2 arrays of ints here by this mapping to save gas
        uint256 optionsCastedLength;
        mapping (uint256 => OptionCast) castedVotes;
    }

    struct SurveyStruct {
        address creator;
        uint64 startDate;
        uint256 options;
        uint256 snapshotBlock;
        uint256 minParticipationPct;
        uint256 votingPower;                    // total tokens that can cast a vote
        uint256 participation;                  // tokens that casted a vote
        string metadata;

        mapping (uint256 => uint256) optionPower;     // option -> voting power for option
        mapping (address => MultiOptionVote) votes;    // voter -> options voted, with its stakes
    }

    SurveyStruct[] internal surveys;

    event StartSurvey(uint256 indexed surveyId);
    event CastVote(uint256 indexed surveyId, address indexed voter, uint256 option, uint256 stake, uint256 optionPower);
    event ResetVote(uint256 indexed surveyId, address indexed voter, uint256 option, uint256 previousStake, uint256 optionPower);
    event ChangeMinParticipation(uint256 minParticipationPct);

    /**
    * @notice Initializes Survey app with `_token.symbol(): string` for governance, minimum acceptance participation of `(_minParticipationPct - _minParticipationPct % 10^16) / 10^14` and durations of `(_surveyTime - _surveyTime % 86400) / 86400` day `_surveyTime >= 172800 ? 's' : ''`
    * @param _token MiniMeToken address that will be used as governance token
    * @param _minParticipationPct Percentage of total voting power that must participate in a survey for it to be taken into account (expressed as a 10^18 percentage, (eg 10^16 = 1%, 10^18 = 100%)
    * @param _surveyTime Seconds that a survey will be open for token holders to vote
    */
    function initialize(
        MiniMeToken _token,
        uint256 _minParticipationPct,
        uint64 _surveyTime
    ) external onlyInit
    {
        initialized();

        require(_minParticipationPct > 0 && _minParticipationPct <= PCT_BASE);

        token = _token;
        minParticipationPct = _minParticipationPct;
        surveyTime = _surveyTime;
    }

    /**
    * @notice Change minimum acceptance participation to `(_minParticipationPct - _minParticipationPct % 10^16) / 10^14`%
    * @param _minParticipationPct New acceptance participation
    */
    function changeMinAcceptParticipationPct(uint256 _minParticipationPct) external authP(MODIFY_PARTICIPATION_ROLE, arr(_minParticipationPct)) {
        require(_minParticipationPct > 0 && _minParticipationPct <= PCT_BASE);
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
        surveyId = surveys.length++;
        SurveyStruct storage survey = surveys[surveyId];
        survey.creator = msg.sender;
        survey.startDate = getTimestamp64();
        survey.options = _options;
        survey.metadata = _metadata;
        survey.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        survey.votingPower = token.totalSupplyAt(survey.snapshotBlock);
        require(survey.votingPower > 0);
        survey.minParticipationPct = minParticipationPct;

        emit StartSurvey(surveyId);
    }

    /**
     * @notice Reset previously casted vote in survey #`_surveyId`, if any.
     * @param _surveyId Id for survey
     */
    function resetVote(uint256 _surveyId) public isInitialized {
        require(canVote(_surveyId, msg.sender));

        SurveyStruct storage survey = surveys[_surveyId];
        MultiOptionVote storage previousVote = survey.votes[msg.sender];
        if (previousVote.optionsCastedLength > 0) {
            // voter removes their vote
            for (uint256 i = 1; i <= previousVote.optionsCastedLength; i++) {
                OptionCast storage previousOptionCast = previousVote.castedVotes[i];
                uint256 previousOptionPower = survey.optionPower[previousOptionCast.optionId];
                survey.optionPower[previousOptionCast.optionId] = previousOptionPower.sub(previousOptionCast.stake);

                emit ResetVote(_surveyId, msg.sender, previousOptionCast.optionId, previousOptionCast.stake, previousOptionPower);
            }

            // compute previously casted votes (i.e. substract non-used tokens from stake)
            uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
            uint256 previousParticipation = voterStake.sub(previousVote.castedVotes[0].stake);
            // and remove it from total participation
            survey.participation = survey.participation.sub(previousParticipation);

            // reset previously voted options
            delete survey.votes[msg.sender];
        }
    }

    /**
    * @notice Vote for multiple options in survey #`_surveyId`.
    * @param _surveyId Id for survey
    * @param _optionIds Array with indexes of supported options
    * @param _stakes Number of tokens assigned to each option
    */
    function voteOptions(uint256 _surveyId, uint256[] _optionIds, uint256[] _stakes) public isInitialized {
        require(_optionIds.length == _stakes.length && _optionIds.length > 0);

        SurveyStruct storage survey = surveys[_surveyId];

        // revert previous votes, if any (also checks if canVote)
        resetVote(_surveyId);

        uint256 totalVoted = 0;
        // reserve first index for ABSTAIN_VOTE
        survey.votes[msg.sender].castedVotes[0] = OptionCast({optionId: ABSTAIN_VOTE, stake: 0});
        for (uint256 optionIndex = 1; optionIndex <= _optionIds.length; optionIndex++) {
            // Voters don't specify that they're abstaining,
            // but we still keep track of this by reserving the first index of a survey's votes.
            // We subtract 1 from the indexes of the arrays passed in by the voter to account for this.
            uint256 optionId = _optionIds[optionIndex - 1];
            uint256 stake = _stakes[optionIndex - 1];

            require(optionId != ABSTAIN_VOTE && optionId <= survey.options);
            require(stake > 0);
            // Let's avoid repeating an option by making sure that ascending order is preserved in
            // the options array by checking that the current optionId is larger than the last one
            // we added
            require(survey.votes[msg.sender].castedVotes[optionIndex - 1].optionId < optionId);

            // register voter amount
            survey.votes[msg.sender].castedVotes[optionIndex] = OptionCast({optionId: optionId, stake: stake});

            // add to total option support
            survey.optionPower[optionId] = survey.optionPower[optionId].add(stake);

            // keep track of staked used so far
            totalVoted = totalVoted.add(stake);

            emit CastVote(_surveyId, msg.sender, optionId, stake, survey.optionPower[optionId]);
        }

        // compute and register non used tokens
        // implictly we are doing require(totalVoted <= voterStake) too
        // (as stated before, index 0 is for ABSTAIN_VOTE option)
        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        survey.votes[msg.sender].castedVotes[0].stake = voterStake.sub(totalVoted);

        // register number of options voted
        survey.votes[msg.sender].optionsCastedLength = _optionIds.length;

        // add voter tokens to participation
        survey.participation = survey.participation.add(totalVoted);
        assert(survey.participation <= survey.votingPower);
    }

    /**
    * @notice Vote option #`_optionId` in survey #`_surveyId`.
    * @dev It will use the whole balance.
    * @param _surveyId Id for survey
    * @param _optionId Index of supported option
    */
    function voteOption(uint256 _surveyId, uint256 _optionId) public isInitialized {
        require(_optionId != ABSTAIN_VOTE);
        SurveyStruct storage survey = surveys[_surveyId];
        // this could re-enter, though we can asume the governance token is not maliciuous
        uint256 voterStake = token.balanceOfAt(msg.sender, survey.snapshotBlock);
        uint256[] memory options = new uint256[](1);
        uint256[] memory stakes = new uint256[](1);
        options[0] = _optionId;
        stakes[0] = voterStake;

        voteOptions(_surveyId, options, stakes);
    }

    function canVote(uint256 _surveyId, address _voter) public view returns (bool) {
        SurveyStruct storage survey = surveys[_surveyId];

        return _isSurveyOpen(survey) && token.balanceOfAt(_voter, survey.snapshotBlock) > 0;
    }

    function getSurvey(uint256 _surveyId)
        public
        view
        returns (
            bool _open,
            address _creator,
            uint64 _startDate,
            uint256 _snapshotBlock,
            uint256 _minParticipationPct,
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

    function getSurveyMetadata(uint256 _surveyId) public view returns (string) {
        return surveys[_surveyId].metadata;
    }

    /* solium-disable-next-line function-order */
    function getVoterState(uint256 _surveyId, address _voter) external view returns (uint256[] options, uint256[] stakes) {
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

    function getOptionPower(uint256 _surveyId, uint256 _optionId) public view returns (uint256) {
        SurveyStruct storage survey = surveys[_surveyId];
        require(_optionId <= survey.options);

        return survey.optionPower[_optionId];
    }

    function isParticipationAchieved(uint256 _surveyId) public view returns (bool) {
        SurveyStruct storage survey = surveys[_surveyId];
        // votingPower is always > 0
        uint256 participationPct = survey.participation.mul(PCT_BASE) / survey.votingPower;
        return participationPct >= survey.minParticipationPct;
    }

    function _isSurveyOpen(SurveyStruct storage survey) internal view returns (bool) {
        return getTimestamp64() < survey.startDate.add(surveyTime);
    }
}
