pragma solidity 0.4.15;

import "@aragon/core/contracts/apps/App.sol";

import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/IForwarder.sol";
import "@aragon/core/contracts/common/EVMCallScript.sol";

import "@aragon/core/contracts/misc/Migrations.sol";


contract Group is App, Initializable, IForwarder, EVMCallScriptRunner {
    string name;
    address[] public members;
    mapping (address => bool) isMembers;
    mapping (address => bool) confirmations;

    uint public required;

    event AddMember(address indexed entity);
    event RemoveMember(address indexed entity);
    event Confirmation(address indexed entity);
    event Revocation(address indexed entity);
    event RequirementChanged(uint _required);

    bytes32 constant public ADD_MEMBER_ROLE = bytes32(1);
    bytes32 constant public REMOVE_MEMBER_ROLE = bytes32(2);

    /**
    * @notice Initialize new `_name` group
    * @param _name Name for the group
    */
    function initialize(string _name, uint _required) onlyInit external {
        initialized();

        required = _required;
        name = _name;
    }

    /**
    * @notice Changes the number of members required to confirm before the group can perform actions
    * @param _required New number of members required to confirm action
    */
    function changeRequirement(uint _required) public {
        require(isGroupMember(msg.sender));
        require(_required > 0 && _required <= members.length);
        required = _required;
        RequirementChanged(_required);
    }

    /**
    * @notice Add `_entity` to group. It will be allowed to perform action as group.
    * @param _entity Entity being added to the group
    */
    function addMember(address _entity) auth(ADD_MEMBER_ROLE) external {
        require(!isGroupMember(_entity));
        isMembers[_entity] = true;
        members.push(_entity);
        AddMember(_entity);
    }

    /**
    * @notice Remove `_entity` to group. It will no longer be able to perform actions as group.
    * @param _entity Entity being removed from the group
    */
    function removeMember(address _entity) auth(REMOVE_MEMBER_ROLE) external {
        require(isGroupMember(_entity));
        isMembers[_entity] = false;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == _entity) {
                members[i] = members[members.length - 1];
                delete members[members.length - 1];
                members.length -= 1;
                break;
            }
        }

        if (required > members.length)
            changeRequirement(members.length);

        RemoveMember(_entity);
    }

    function numMembers() public constant returns (uint) {
        return members.length;
    }

    function getRequired() public constant returns (uint) {
        return required;
    }

    function confirm() public {
        require(isGroupMember(msg.sender));
        confirmations[msg.sender] = true;
        Confirmation(msg.sender);
    }

    function revoke() public {
        require(isGroupMember(msg.sender));
        confirmations[msg.sender] = false;
        Revocation(msg.sender);
    }

    function isConfirmed() public constant returns (bool) {
        uint count = 0;
        for (uint i = 0; i < members.length; i++) {
            if (confirmations[members[i]]) {
                count += 1;
            }
        }

        return count >= required;
    }

    /**
    * @dev IForwarder interface conformance. Forwards actions to any group member.
    * @param _evmCallScript Script being forwarded
    */
    function forward(bytes _evmCallScript) external {
        require(isGroupMember(msg.sender) && isConfirmed());
        runScript(_evmCallScript);
    }

    /**
    * @notice Checks whether an address belongs to the group
    * @param _entity address to be checked for group membership
    */
    function isGroupMember(address _entity) public constant returns (bool) {
        return isMembers[_entity];
    }

    /**
    * @notice Checks whether an address can forward a actionable script
    * @param _sender address of the sender MUST be a group member
    * @param _evmCallScript script to be executed on the EVM
    */
    function canForward(address _sender, bytes _evmCallScript) public constant returns (bool) {
        _evmCallScript; // silence unusued variable warning
        return isGroupMember(_sender) && isConfirmed();
    }

    function getName() public constant returns (string) {
        return name;
    }
}
