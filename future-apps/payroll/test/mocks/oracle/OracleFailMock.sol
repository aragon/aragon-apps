pragma solidity 0.4.18;

import "./OracleInterface.sol";


contract PayrollInterface {
    function setExchangeRate(address, uint256) external;
}


contract OracleFailMock is OracleInterface {
    uint256 public exchangeRate;

    event OracleFailLogSetPayroll (address sender, address pr);
    event OracleFailLogSetRate (address sender, address token, uint256 value);

    function query(address pr, address token) public returns(bool) {
        uint256 rate = 0;
        setRate(pr, token, rate);
        return true;
    }

    function setRate(address pr, address token, uint256 rate) public {
        PayrollInterface payroll = PayrollInterface(pr);
        payroll.setExchangeRate(token, rate);
        OracleFailLogSetRate(msg.sender, token, rate);
    }

}
