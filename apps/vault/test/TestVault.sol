pragma solidity 0.4.18;

import "../contracts/Vault.sol";
import "../contracts/IConnector.sol";

import "../contracts/connectors/ETHConnector.sol";
import "../contracts/connectors/ERC20Connector.sol";

import "@aragon/os/test/mocks/StandardTokenMock.sol";
import "truffle/Assert.sol";

contract TestVault {
    StandardTokenMock token;

    address ethConnector;
    address erc20Connector;

    Vault vault;

    uint public initialBalance = 200 wei;

    function beforeAll() {
        ethConnector = new ETHConnector();
        erc20Connector = new ERC20Connector();

        //token = new StandardTokenMock(this, 200);
    }

    function beforeEach() {
        vault = new Vault();
        vault.initialize(erc20Connector, ethConnector);
    }

    function testETHDeposit() {
        ETHConnector(vault).deposit.value(1)(address(0), this, 1, new bytes(0));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
    }

    function testETHFallback() {
        require(vault.call.value(1).gas(100000)(new bytes(0)));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
    }
}
