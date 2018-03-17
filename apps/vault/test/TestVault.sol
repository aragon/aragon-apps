pragma solidity 0.4.18;

import "../contracts/Vault.sol";
import "../contracts/IVaultConnector.sol";

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";

import "truffle/Assert.sol";

contract TestVault {
    MiniMeToken token;

    IVaultConnector vault;

    uint constant public initialBalance = 200 wei;
    address constant ETH = address(0);

    function beforeAll() {
        token = new MiniMeToken(address(0), address(0), 0, "CARLOS", 2, "MATOS", true);
        token.generateTokens(this, 200);
        token.changeController(msg.sender);
    }

    function beforeEach() {
        vault = IVaultConnector(new Vault());
    }

    function testETHDeposit() {
        vault.deposit.value(1)(ETH, this, 1, new bytes(0));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
        Assert.equal(vault.balance(ETH), 1, "should return 1 wei balance");
    }

    function testETHDepositFallback() {
        require(vault.call.value(1)(new bytes(0)));

        Assert.equal(address(vault).balance, 1, "should hold 1 wei");
    }

    function testTransferETH() {
        vault.call.value(1)(new bytes(0));

        vault.transfer(ETH, address(10), 1, new bytes(0));
        Assert.equal(address(10).balance, 1, "should hold 1 wei");
    }

    /*
    // For some reason uncommenting this code makes truffle OOG...
    function testTokenDeposit() {
        token.approve(vault, 1);
        vault.deposit(token, this, 1, new bytes(0));

        Assert.equal(token.balanceOf(vault), 1, "should hold 1 token");
        Assert.equal(vault.balance(token), 1, "should return 1 token balance");
    }
    */

    function testTransferTokens() {
        address to = address(1);
        token.transfer(vault, 1);
        vault.transfer(token, to, 1, new bytes(0));

        Assert.equal(token.balanceOf(to), 1, "should return 1 token balance after transfer");
    }
}
