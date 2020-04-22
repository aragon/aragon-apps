pragma solidity 0.4.24;

import "../../../arbitration/IArbitrable.sol";
import "../../../arbitration/IArbitrator.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract ArbitratorMock is IArbitrator {
    string internal constant ERROR_DISPUTE_NOT_RULED_YET = "ARBITRATOR_DISPUTE_NOT_RULED_YET";

    struct Dispute {
        IArbitrable arbitrable;
        uint256 ruling;
    }

    ERC20 public feeToken;
    uint256 public feeAmount;
    Dispute[] public disputes;

    event NewDispute(uint256 disputeId, uint256 possibleRulings, bytes metadata);
    event EvidencePeriodClosed(uint256 indexed disputeId);

    constructor(ERC20 _feeToken, uint256 _feeAmount) public {
        feeToken = _feeToken;
        feeAmount = _feeAmount;
    }

    function createDispute(uint256 _possibleRulings, bytes _metadata) external returns (uint256) {
        uint256 disputeId = disputes.length++;
        disputes[disputeId].arbitrable = IArbitrable(msg.sender);

        feeToken.transferFrom(msg.sender, address(this), feeAmount);
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
        feeToken = _feeToken;
        feeAmount = _feeAmount;
    }

    function getDisputeFees() public view returns (address, ERC20, uint256) {
        return (address(this), feeToken, feeAmount);
    }

    function getSubscriptionFees(address) external view returns (address, ERC20, uint256) {
        return (address(this), feeToken, 0);
    }
}
