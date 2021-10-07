// solium-disable
pragma solidity ^0.4.24;

interface BountiesEvents {

  /*
   * Functions
   */

  function fulfillBounty(
    address _sender,
    uint _bountyId,
    address[]  _fulfillers,
    string _data
  ) external;
  /*
   * Events
   */

  event BountyIssued(uint _bountyId, address _creator, address [] _issuers, address [] _approvers, string _data, uint _deadline, address _token, uint _tokenVersion);
  event ContributionAdded(uint _bountyId, uint _contributionId, address  _contributor, uint _amount);
  event ContributionRefunded(uint _bountyId, uint _contributionId);
  event ContributionsRefunded(uint _bountyId, address _issuer, uint [] _contributionIds);
  event BountyDrained(uint _bountyId, address _issuer, uint [] _amounts);
  event ActionPerformed(uint _bountyId, address _fulfiller, string _data);
  event BountyFulfilled(uint _bountyId, uint _fulfillmentId, address  [] _fulfillers, string _data, address _submitter);
  event FulfillmentUpdated(uint _bountyId, uint _fulfillmentId, address  [] _fulfillers, string _data);
  event FulfillmentAccepted(uint _bountyId, uint  _fulfillmentId, address _approver, uint[] _tokenAmounts);
  event BountyChanged(uint _bountyId, address _changer, address  [] _issuers, address  [] _approvers, string _data, uint _deadline);
  event BountyIssuersUpdated(uint _bountyId, address _changer, address  [] _issuers);
  event BountyApproversUpdated(uint _bountyId, address _changer, address [] _approvers);
  event BountyDataChanged(uint _bountyId, address _changer, string _data);
  event BountyDeadlineChanged(uint _bountyId, address _changer, uint _deadline);
}
