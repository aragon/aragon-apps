pragma solidity 0.4.18;

import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";


library DenominationToken {
    using SafeMath for uint;

    uint256 constant public DENOMINATION_DECIMALS = 10**9; // for sub-cent precision
    uint256 constant public SECONDS_IN_A_YEAR = 31557600; // 365.25 days

    function toYearlyDenomination(uint256 a) internal pure returns (uint256) {
        return a.mul(SECONDS_IN_A_YEAR) / DENOMINATION_DECIMALS;
    }

    function toSecondDenominationToken(uint256 a) internal pure returns (uint256) {
        return a.mul(DENOMINATION_DECIMALS) / SECONDS_IN_A_YEAR;
    }
}
