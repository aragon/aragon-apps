pragma solidity ^0.4.18;


interface ERC780 {
    function setClaim(address subject, bytes32 key, bytes32 value) public;
    function setSelfClaim(bytes32 key, bytes32 value) public;
    function getClaim(address issuer, address subject, bytes32 key) public constant returns (bytes32);
    function removeClaim(address issuer, address subject, bytes32 key) public;
}
