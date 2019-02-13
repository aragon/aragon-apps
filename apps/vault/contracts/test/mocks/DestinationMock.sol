pragma solidity 0.4.24;


contract DestinationMock {
    bool public expensiveFallback;
    uint256 public counter;

    constructor(bool _expensiveFallback) public {
        expensiveFallback = _expensiveFallback;
    }

    function () external payable {
        // If expensiveFallback is used, this breaks the 2300 gas stipend given by
        // .send() and .transfer()
        if (expensiveFallback) {
            counter = counter + 1;
        }
    }
}
