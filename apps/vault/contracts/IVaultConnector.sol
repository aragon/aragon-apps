pragma solidity ^0.4.18;


// Connectors can define additional functions, but these are required
interface IVaultConnector {
    function deposit(address token, address who, uint256 value, bytes how) external payable returns (bool);
    function transfer(address token, address to, uint256 value, bytes how) external returns (bool);
    function balance(address token) public view returns (uint256);

    event Transfer(address indexed token, address indexed receiver, uint256 amount);
    event Deposit(address indexed token, address indexed sender, uint256 amount);
}


contract IVaultFake {
    function IVaultFake() public {
        // work around coverage weird error
    }
}
