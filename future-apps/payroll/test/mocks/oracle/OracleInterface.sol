pragma solidity 0.4.18;


// TODO: interface
contract OracleInterface {
    function query(address token, address pr) public returns(bool);
}
