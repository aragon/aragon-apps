pragma solidity 0.4.18;


contract Counter {
    uint256 value;

    function Counter() public {
        value = 0;
    }

    function increment() public {
        value += 1;
    }
}
