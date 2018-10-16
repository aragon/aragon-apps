pragma solidity 0.4.24;


contract DestinationMock {
    uint256 test;

    function () external payable {
        test = test + 1;
    }
}
