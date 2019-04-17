pragma solidity 0.4.24;

import "../../Survey.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract SurveyMock is Survey, TimeHelpersMock {
    // Mint a token and create a vote in the same transaction to test snapshot block values are correct
    function newTokenAndSurvey(address _holder, uint256 _tokenAmount, string _metadata, uint256 _options)
        external
        returns (uint256 surveyId)
    {
        token.generateTokens(_holder, _tokenAmount);

        surveyId = this.newSurvey(_metadata, _options);
        emit StartSurvey(surveyId, msg.sender, _metadata);
    }
}
