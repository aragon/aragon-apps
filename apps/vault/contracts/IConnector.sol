pragma solidity ^0.4.18;


interface IConnector {
    function deposit(address token, uint256 who, uint256 value, bytes how) external returns (bool);
    function transfer(address token, uint256 to, uint256 value, bytes how) external returns (bool);
    function balance(address token) public view returns (uint256);

    event Transfer(address indexed token, address indexed receiver, uint256 amount);
    event Deposit(address indexed token, address indexed sender, uint256 amount);
}
