pragma solidity 0.4.24;


contract Zombie {
    address public owner;

    function Zombie(address _owner) public {
        owner = _owner;
    }

    function() public payable {}

    function escapeHatch() public {
        selfdestruct(owner);
    }

}
