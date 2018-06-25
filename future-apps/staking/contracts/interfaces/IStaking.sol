pragma solidity ^0.4.18;


interface IStaking {
    function unlock(address acct, uint256 lockId) public;
    function moveTokens(address _from, address _to, uint256 _amount) public;
    function unlockAndMoveTokens(address from, uint256 lockId, address to, uint256 amount) external;
    function getLock(
        address acct,
        uint256 lockId
    )
        public
        view
        returns (
            uint256 amount,
            uint8 lockUnit,
            uint64 lockEnds,
            address unlocker,
            bytes32 metadata
        );
}


contract FakeStaking {
    // to work around coverage issue
    function fake() public {
        // for lint
    }
}
