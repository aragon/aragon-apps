pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/arbitration/IArbitrable.sol";
import "@aragon/os/contracts/lib/arbitration/IArbitrator.sol";


contract ArbitratorMock is IArbitrator {
    string internal constant ERROR_DISPUTE_NOT_RULED_YET = "ARBITRATOR_DISPUTE_NOT_RULED_YET";

    struct Dispute {
        IArbitrable arbitrable;
        uint256 ruling;
    }

    struct Fee {
        ERC20 token;
        uint256 amount;
    }

    Fee public fee;
    uint256 public disputesLength;
    mapping (uint256 => Dispute) public disputes;
    mapping (bytes32 => address) internal modules;

    event NewDispute(uint256 disputeId, uint256 possibleRulings, bytes metadata);
    event EvidencePeriodClosed(uint256 indexed disputeId);

    constructor(ERC20 _feeToken, uint256 _feeAmount) public {
        fee.token = _feeToken;
        fee.amount = _feeAmount;
        disputesLength++;
    }

    function createDispute(uint256 _possibleRulings, bytes _metadata) external returns (uint256) {
        uint256 disputeId = disputesLength++;
        disputes[disputeId].arbitrable = IArbitrable(msg.sender);

        fee.token.transferFrom(msg.sender, address(this), fee.amount);
        emit NewDispute(disputeId, _possibleRulings, _metadata);
        return disputeId;
    }

    function closeEvidencePeriod(uint256 _disputeId) external {
        emit EvidencePeriodClosed(_disputeId);
    }

    function executeRuling(uint256 _disputeId) external {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.ruling != 0, ERROR_DISPUTE_NOT_RULED_YET);
        dispute.arbitrable.rule(_disputeId, dispute.ruling);
    }

    function rule(uint256 _disputeId, uint8 _ruling) external {
        Dispute storage dispute = disputes[_disputeId];
        dispute.ruling = _ruling;
    }

    function setFees(ERC20 _feeToken, uint256 _feeAmount) external {
        fee.token = _feeToken;
        fee.amount = _feeAmount;
    }

    function setModule(bytes32 _id, address _module) external {
        modules[_id] = _module;
    }

    function getDisputeFees() public view returns (address recipient, ERC20 feeToken, uint256 feeAmount) {
        return (address(this), fee.token, fee.amount);
    }

    function getSubscriptionFees(address) external view returns (address, ERC20, uint256) {
        return (address(this), fee.token, 0);
    }

    function getModule(bytes32 _id) external view returns (address) {
        return modules[_id];
    }
}
