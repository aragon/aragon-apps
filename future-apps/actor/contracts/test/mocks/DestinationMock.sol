pragma solidity 0.4.24;


contract DestinationMock {
    bool public expensiveFallback;
    uint256 public counter;

    constructor(bool _expensiveFallback) {
        expensiveFallback = _expensiveFallback;
    }

    function () external payable {
        if (expensiveFallback) {
            counter = counter + 1;
        }
    }
}
