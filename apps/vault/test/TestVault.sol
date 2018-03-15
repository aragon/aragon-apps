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

    IConnector vault;

    uint constant public initialBalance = 200 wei;
    address constant ETH = address(0);

    function beforeAll() {
        ethConnector = new ETHConnector();
        erc20Connector = new ERC20Connector();

        //
    }

    function beforeEach() {
        vault = IConnector(new Vault());
        Vault(vault).initialize(erc20Connector, ethConnector);
    }

    function testETHDeposit() {
        vault.deposit.value(1)(ETH, this, 1, new bytes(0));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
        Assert.equal(vault.balance(ETH), 1, "should return 1 wei balance");
    }

    function testTokenDeposit() {
        // token = new StandardTokenMock(this, 200);
    }

    function testETHFallback() {
        require(vault.call.value(1).gas(100000)(new bytes(0)));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
    }
}
