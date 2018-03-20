pragma solidity 0.4.18;

import "../VaultBase.sol";
import "./standards/ERC721.sol";


contract ERC721Connector is VaultBase, IVaultConnector, ERC721TokenReceiver {
    function deposit(address token, address who, uint256 tokenId, bytes how) payable external returns (bool) {
        // require(who == msg.sender); // maybe actual sender wants to signal who sent it
        ERC721(token).safeTransferFrom(who, this, tokenId, how);

        return true;
    }

    function transfer(address token, address to, uint256 tokenId, bytes how)
             authP(TRANSFER_ROLE, arr(token, to, tokenId))
             external returns (bool)
    {

        ERC721(token).safeTransferFrom(this, to, tokenId, how);

        Transfer(token, to, tokenId);

        return true;
    }

    function balance(address token) public view returns (uint256) {
        return ERC721(token).balanceOf(this);
    }

    bytes4 constant ERC721_RECEIVED_SIGNATURE = bytes4(keccak256("onERC721Received(address,uint256,bytes)"));

    function onERC721Received(address _from, uint256 _tokenId, bytes data) external returns (bytes4) {
        Deposit(msg.sender, _from, uint256(_tokenId));
        return ERC721_RECEIVED_SIGNATURE;
    }
}
