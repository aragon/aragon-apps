pragma solidity ^0.4.18;

import "@aragon/core/contracts/apps/App.sol";

import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/IForwarder.sol";
import "@aragon/core/contracts/common/EVMCallScript.sol";

import "@aragon/core/contracts/misc/Migrations.sol";


contract Group is App, Initializable, IForwarder, EVMCallScriptRunner {
    string name;
    mapping (address => bool) members;

    event AddMember(address indexed entity);
    event RemoveMember(address indexed entity);

    bytes32 constant public ADD_MEMBER_ROLE = bytes32(1);
    bytes32 constant public REMOVE_MEMBER_ROLE = bytes32(2);

    /**
    * @notice Initialize new `_name` group
    * @param _name Name for the group
    */
    function initialize(string _name) onlyInit external {
        initialized();

        name = _name;
    }

    /**
    * @notice Add `_entity` to group. It will be allowed to perform action as group.
    * @param _entity Entity being added to the group
    */
    function addMember(address _entity) auth(ADD_MEMBER_ROLE) external {
        require(!isGroupMember(_entity));
        members[_entity] = true;
        AddMember(_entity);
    }

    /**
    * @notice Remove `_entity` to group. It will no longer be able to perform actions as group.
    * @param _entity Entity being removed from the group
    */
    function removeMember(address _entity) auth(REMOVE_MEMBER_ROLE) external {
        require(isGroupMember(_entity));
        members[_entity] = false;
        RemoveMember(_entity);
    }

    /**
    * @dev IForwarder interface conformance. Forwards actions to any group member.
    * @param _evmCallScript Script being forwarded
    */
    function forward(bytes _evmCallScript) external {
        require(isGroupMember(msg.sender));
        runScript(_evmCallScript);
    }

    function isGroupMember(address _entity) public constant returns (bool) {
        return members[_entity];
    }

    function canForward(address _sender, bytes _evmCallScript) public constant returns (bool) {
        _evmCallScript; // silence unusued variable warning
        return isGroupMember(_sender);
    }

    function getName() public constant returns (string) {
        return name;
    }
}
