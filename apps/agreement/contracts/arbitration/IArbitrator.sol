pragma solidity ^0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";


/**
* @title Arbitrator interface
* @dev This interface is the one used by `Agreement` as its dispute resolution protocol.
*      This interface was manually-copied from https://github.com/aragon/aragon-court/blob/v1.2.0/contracts/arbitration/IArbitrator.sol
*      since we are using different solidity versions.
*/
interface IArbitrator {
    /**
    * @dev Create a dispute over the Arbitrable sender with a number of possible rulings
    * @param _possibleRulings Number of possible rulings allowed for the dispute
    * @param _metadata Optional metadata that can be used to provide additional information on the dispute to be created
    * @return Dispute identifier
    */
    function createDispute(uint256 _possibleRulings, bytes _metadata) external returns (uint256);

    /**
    * @dev Close the evidence period of a dispute
    * @param _disputeId Identifier of the dispute to close its evidence submitting period
    */
    function closeEvidencePeriod(uint256 _disputeId) external;

    /**
    * @dev Execute the Arbitrable associated to a dispute based on its final ruling
    * @param _disputeId Identifier of the dispute to be executed
    */
    function executeRuling(uint256 _disputeId) external;

    /**
    * @dev Tell the dispute fees information to create a dispute
    * @return recipient Address where the corresponding dispute fees must be transferred to
    * @return feeToken ERC20 token used for the fees
    * @return feeAmount Total amount of fees that must be allowed to the recipient
    */
    function getDisputeFees() external view returns (address recipient, ERC20 feeToken, uint256 feeAmount);

    /**
    * @dev Tell the subscription fees information for a subscriber to be up-to-date
    * @param _subscriber Address of the account paying the subscription fees for
    * @return recipient Address where the corresponding subscriptions fees must be transferred to
    * @return feeToken ERC20 token used for the subscription fees
    * @return feeAmount Total amount of fees that must be allowed to the recipient
    */
    function getSubscriptionFees(address _subscriber) external view returns (address recipient, ERC20 feeToken, uint256 feeAmount);
}
