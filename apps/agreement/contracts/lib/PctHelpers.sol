pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/math/SafeMath.sol";


library PctHelpers {
    using SafeMath for uint256;

    uint256 internal constant PCT_BASE = 100; // % (1 / 100)

    function pct(uint256 self, uint256 _pct) internal pure returns (uint256) {
        return self.mul(_pct) / PCT_BASE;
    }
}
