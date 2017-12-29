pragma solidity 0.4.15;

import "@aragon/core/contracts/apps/App.sol";

import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/IForwarder.sol";
import "@aragon/core/contracts/common/EVMCallScript.sol";

import "@aragon/core/contracts/misc/Migrations.sol";


contract Group is App, Initializable, IForwarder, EVMCallScriptRunner {
    string name;
    address[] public members;
    mapping (address => bool) isMember;
    mapping (uint => bytes) actions;
    mapping (uint => bool) actionExecuted;
    mapping (uint => mapping (address => bool)) confirmations;

    uint public required;
    uint public actionCount;

    event AddMember(address indexed entity);
    event RemoveMember(address indexed entity);
    event Confirmation(uint actionId, address indexed entity);
    event Revocation(uint actionId, address indexed entity);
    event ActionAdded(uint actionId);
    event ActionExecuted(uint actionId);
    event RequirementChanged(uint _required);

    bytes32 constant public ADD_MEMBER_ROLE = bytes32(1);
    bytes32 constant public REMOVE_MEMBER_ROLE = bytes32(2);
    bytes32 constant public CHANGE_REQUIREMENTS_ROLE = bytes32(3);

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
    function changeRequirement(uint _required) public auth(CHANGE_REQUIREMENTS_ROLE) {
        changeRequirementInternal(_required);
    }

    /**
    * @notice Add `_entity` to group. It will be allowed to perform action as group.
    * @param _entity Entity being added to the group
    */
    function addMember(address _entity) auth(ADD_MEMBER_ROLE) external {
        require(!isGroupMember(_entity));
        isMember[_entity] = true;
        members.push(_entity);
        AddMember(_entity);
    }

    /**
    * @notice Remove `_entity` to group. It will no longer be able to perform actions as group.
    * @param _entity Entity being removed from the group
    */
    function removeMember(address _entity) auth(REMOVE_MEMBER_ROLE) external {
        require(isGroupMember(_entity));
        isMember[_entity] = false;
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

    function changeRequirementInternal(uint _required) internal {
        require(_required > 0 && _required <= members.length);
        required = _required;
        RequirementChanged(_required);
    }

    function numMembers() public constant returns (uint) {
        return members.length;
    }

    /**
    * @notice Allows a group member to confirm that a specific action can be executed
    * @param _actionId Index of an action
    */
    function confirm(uint _actionId) public {
        require(isGroupMember(msg.sender));
        confirmations[_actionId][msg.sender] = true;
        Confirmation(_actionId, msg.sender);

        if (isConfirmed(_actionId)) {
            forwardAction(actions[_actionId]);
        }
    }

    /**
    * @notice Allows a group member to revoke a confirmation of a specific action
    * @param _actionId Index of an action
    */
    function revoke(uint _actionId) public {
        require(isGroupMember(msg.sender));
        confirmations[_actionId][msg.sender] = false;
        Revocation(_actionId, msg.sender);
    }

    /**
    * @notice Determined is a specific action has confirmation to be executed
    * @param _actionId Index of the action
    */
    function isConfirmed(uint _actionId) public constant returns (bool) {
        uint count = 0;
        for (uint i = 0; i < members.length; i++) {
            if (confirmations[_actionId][members[i]]) {
                count += 1;
            } if (count == required) {
                return true;
            }
        }

        return false;
    }

    /**
    * @notice Returns the index of the actionable script
    * @param _evmCallScript Script being forwarded
    */
    function getActionId(bytes _evmCallScript) public constant returns (uint _actionId) {
        for (uint i = 0; i < actionCount; i++) {
            if (keccak256(actions[i]) == keccak256(_evmCallScript)) {
                _actionId = i;
                break;
            }
        }
    }

    /**
    * @notice Adds an action for the group to take based on confimations
    * @param _evmCallScript Script being forwarded
    */
    function addAction(bytes _evmCallScript) public {
        require(isGroupMember(msg.sender));
        actions[actionCount] = _evmCallScript;
        actionExecuted[actionCount] = false;
        ActionAdded(actionCount);
        actionCount++;
    }

    function forwardAction(bytes _evmCallScript) internal {
        uint actionId = getActionId(_evmCallScript);
        require(isGroupMember(msg.sender) && !actionExecuted[actionId] && isConfirmed(actionId));
        runScript(_evmCallScript);
        actionExecuted[actionId] = true;
        ActionExecuted(actionId);
    }

    /**
    * @dev IForwarder interface conformance. Forwards actions to any group member.
    * @param _evmCallScript Script being forwarded
    */
    function forward(bytes _evmCallScript) external {
        forwardAction(_evmCallScript);
    }

    /**
    * @notice Checks whether an address belongs to the group
    * @param _entity address to be checked for group membership
    */
    function isGroupMember(address _entity) public constant returns (bool) {
        return isMember[_entity];
    }

    /**
    * @notice Checks whether an address can forward a actionable script
    * @param _sender address of the sender MUST be a group member
    * @param _evmCallScript script to be executed on the EVM
    */
    function canForward(address _sender, bytes _evmCallScript) public constant returns (bool) {
        uint actionId = getActionId(_evmCallScript);
        return isGroupMember(_sender) && isConfirmed(actionId);
    }

    function getName() public constant returns (string) {
        return name;
    }
}
