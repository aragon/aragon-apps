pragma solidity 0.4.24;

import "../../DisputableVoting.sol";
import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/TimeHelpersMock.sol";


/**
* @dev This mock exposes a few functions to test edge cases of the disputable voting app.
*      In particular it provides a function to simulate a token transfer + vote in the same block.
*      It also exposes the internal function for computing vote pcts to allow it to be explicitly tested.
*/
contract DisputableVotingMock is DisputableVoting, TimeHelpersMock {
    // Mint a token and create a vote in the same transaction to test snapshot block values are correct
    function newTokenAndVote(address _holder, uint256 _tokenAmount, bytes _context) external returns (uint256) {
        token.generateTokens(_holder, _tokenAmount);

        bytes memory noScript = new bytes(0);
        return _newVote(noScript, _context);
    }

    // _getCurrentSettingId public wrapper
    function getCurrentSettingId() external view isInitialized returns (uint256) {
        return _getCurrentSettingId();
    }

    // _isValuePct public wrapper
    function isValuePct(uint256 _value, uint256 _total, uint256 _pct) external pure returns (bool) {
        return _isValuePct(_value, _total, _pct);
    }
}
