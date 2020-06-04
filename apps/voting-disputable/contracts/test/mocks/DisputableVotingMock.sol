pragma solidity 0.4.24;

import "../../DisputableVoting.sol";
import "@aragon/contract-test-helpers/contracts/TimeHelpersMock.sol";


contract DisputableVotingMock is DisputableVoting, TimeHelpersMock {
    // Mint a token and create a vote in the same transaction to test snapshot block values are correct
    function newTokenAndVote(address _holder, uint256 _tokenAmount, string _metadata) external returns (uint256) {
        token.generateTokens(_holder, _tokenAmount);

        bytes memory noScript = new bytes(0);
        return _newVote(noScript, _metadata);
    }

    // _isValuePct public wrapper
    function isValuePct(uint256 _value, uint256 _total, uint256 _pct) external pure returns (bool) {
        return _isValuePct(_value, _total, _pct);
    }
}
