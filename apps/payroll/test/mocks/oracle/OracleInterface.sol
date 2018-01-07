pragma solidity 0.4.15;


contract OracleInterface {
    function query(address token, address pr) public returns(bool);
}
