pragma solidity ^0.4.18;
/* solium-disable */
import "./inherited/HumanStandardToken.sol";

/// @title StandardBounties
/// @dev Used to pay out individuals or groups for task fulfillment through
/// stepwise work submission, acceptance, and payment
/// @author Mark Beylin <mark.beylin@consensys.net>, Gonçalo Sá <goncalo.sa@consensys.net>
contract StandardBounties {

  /*
   * Events
   */
  event BountyIssued(uint bountyId);
  event BountyActivated(uint bountyId, address issuer);
  event BountyFulfilled(uint bountyId, address indexed fulfiller, uint256 indexed _fulfillmentId);
  event FulfillmentUpdated(uint _bountyId, uint _fulfillmentId);
  event FulfillmentAccepted(uint bountyId, address indexed fulfiller, uint256 indexed _fulfillmentId);
  event BountyKilled(uint bountyId, address indexed issuer);
  event ContributionAdded(uint bountyId, address indexed contributor, uint256 value);
  event DeadlineExtended(uint bountyId, uint newDeadline);
  event BountyChanged(uint bountyId);
  event IssuerTransferred(uint _bountyId, address indexed _newIssuer);
  event PayoutIncreased(uint _bountyId, uint _newFulfillmentAmount);


  /*
   * Storage
   */

  address public owner;

  Bounty[] public bounties;

  mapping(uint=>Fulfillment[]) fulfillments;
  mapping(uint=>uint) numAccepted;
  mapping(uint=>HumanStandardToken) tokenContracts;

  /*
   * Enums
   */

  enum BountyStages {
      Draft,
      Active,
      Dead
  }

  /*
   * Structs
   */

  struct Bounty {
      address issuer;
      uint deadline;
      string data;
      uint fulfillmentAmount;
      address arbiter;
      bool paysTokens;
      BountyStages bountyStage;
      uint balance;
  }

  struct Fulfillment {
      bool accepted;
      address fulfiller;
      string data;
  }

  /*
   * Modifiers
   */

  modifier validateNotTooManyBounties(){
    require((bounties.length + 1) > bounties.length);
    _;
  }

  modifier validateNotTooManyFulfillments(uint _bountyId){
    require((fulfillments[_bountyId].length + 1) > fulfillments[_bountyId].length);
    _;
  }

  modifier validateBountyArrayIndex(uint _bountyId){
    require(_bountyId < bounties.length);
    _;
  }

  modifier onlyIssuer(uint _bountyId) {
      require(msg.sender == bounties[_bountyId].issuer);
      _;
  }

  modifier onlyFulfiller(uint _bountyId, uint _fulfillmentId) {
      require(msg.sender == fulfillments[_bountyId][_fulfillmentId].fulfiller);
      _;
  }

  modifier amountIsNotZero(uint _amount) {
      require(_amount != 0);
      _;
  }

  modifier transferredAmountEqualsValue(uint _bountyId, uint _amount) {
      if (bounties[_bountyId].paysTokens){
        require(msg.value == 0);
        uint oldBalance = tokenContracts[_bountyId].balanceOf(this);
        if (_amount != 0){
          require(tokenContracts[_bountyId].transferFrom(msg.sender, this, _amount));
        }
        require((tokenContracts[_bountyId].balanceOf(this) - oldBalance) == _amount);

      } else {
        require((_amount * 1 wei) == msg.value);
      }
      _;
  }

  modifier isBeforeDeadline(uint _bountyId) {
      require(now < bounties[_bountyId].deadline);
      _;
  }

  modifier validateDeadline(uint _newDeadline) {
      require(_newDeadline > now);
      _;
  }

  modifier isAtStage(uint _bountyId, BountyStages _desiredStage) {
      require(bounties[_bountyId].bountyStage == _desiredStage);
      _;
  }

  modifier validateFulfillmentArrayIndex(uint _bountyId, uint _index) {
      require(_index < fulfillments[_bountyId].length);
      _;
  }

  modifier notYetAccepted(uint _bountyId, uint _fulfillmentId){
      require(fulfillments[_bountyId][_fulfillmentId].accepted == false);
      _;
  }

  /*
   * Public functions
   */


  /// @dev StandardBounties(): instantiates
  /// @param _owner the issuer of the standardbounties contract, who has the
  /// ability to remove bounties
  function StandardBounties(address _owner)
      public
  {
      owner = _owner;
  }

  /// @dev issueBounty(): instantiates a new draft bounty
  /// @param _issuer the address of the intended issuer of the bounty
  /// @param _deadline the unix timestamp after which fulfillments will no longer be accepted
  /// @param _data the requirements of the bounty
  /// @param _fulfillmentAmount the amount of wei to be paid out for each successful fulfillment
  /// @param _arbiter the address of the arbiter who can mediate claims
  /// @param _paysTokens whether the bounty pays in tokens or in ETH
  /// @param _tokenContract the address of the contract if _paysTokens is true
  function issueBounty(
      address _issuer,
      uint _deadline,
      string _data,
      uint256 _fulfillmentAmount,
      address _arbiter,
      bool _paysTokens,
      address _tokenContract
  )
      public
      validateDeadline(_deadline)
      amountIsNotZero(_fulfillmentAmount)
      validateNotTooManyBounties
      returns (uint)
  {
      bounties.push(Bounty(_issuer, _deadline, _data, _fulfillmentAmount, _arbiter, _paysTokens, BountyStages.Draft, 0));
      if (_paysTokens){
        tokenContracts[bounties.length - 1] = HumanStandardToken(_tokenContract);
      }
      BountyIssued(bounties.length - 1);
      return (bounties.length - 1);
  }

  /// @dev issueAndActivateBounty(): instantiates a new draft bounty
  /// @param _issuer the address of the intended issuer of the bounty
  /// @param _deadline the unix timestamp after which fulfillments will no longer be accepted
  /// @param _data the requirements of the bounty
  /// @param _fulfillmentAmount the amount of wei to be paid out for each successful fulfillment
  /// @param _arbiter the address of the arbiter who can mediate claims
  /// @param _paysTokens whether the bounty pays in tokens or in ETH
  /// @param _tokenContract the address of the contract if _paysTokens is true
  /// @param _value the total number of tokens being deposited upon activation
  function issueAndActivateBounty(
      address _issuer,
      uint _deadline,
      string _data,
      uint256 _fulfillmentAmount,
      address _arbiter,
      bool _paysTokens,
      address _tokenContract,
      uint256 _value
  )
      public
      payable
      validateDeadline(_deadline)
      amountIsNotZero(_fulfillmentAmount)
      validateNotTooManyBounties
      returns (uint)
  {
      require (_value >= _fulfillmentAmount);
      if (_paysTokens){
        require(msg.value == 0);
        tokenContracts[bounties.length] = HumanStandardToken(_tokenContract);
        require(tokenContracts[bounties.length].transferFrom(msg.sender, this, _value));
      } else {
        require((_value * 1 wei) == msg.value);
      }
      bounties.push(Bounty(_issuer,
                            _deadline,
                            _data,
                            _fulfillmentAmount,
                            _arbiter,
                            _paysTokens,
                            BountyStages.Active,
                            _value));
      BountyIssued(bounties.length - 1);
      ContributionAdded(bounties.length - 1, msg.sender, _value);
      BountyActivated(bounties.length - 1, msg.sender);
      return (bounties.length - 1);
  }

  modifier isNotDead(uint _bountyId) {
      require(bounties[_bountyId].bountyStage != BountyStages.Dead);
      _;
  }

  /// @dev contribute(): a function allowing anyone to contribute tokens to a
  /// bounty, as long as it is still before its deadline. Shouldn't keep
  /// them by accident (hence 'value').
  /// @param _bountyId the index of the bounty
  /// @param _value the amount being contributed in ether to prevent accidental deposits
  /// @notice Please note you funds will be at the mercy of the issuer
  ///  and can be drained at any moment. Be careful!
  function contribute (uint _bountyId, uint _value)
      payable
      public
      validateBountyArrayIndex(_bountyId)
      isBeforeDeadline(_bountyId)
      isNotDead(_bountyId)
      amountIsNotZero(_value)
      transferredAmountEqualsValue(_bountyId, _value)
  {
      bounties[_bountyId].balance += _value;

      ContributionAdded(_bountyId, msg.sender, _value);
  }

  /// @notice Send funds to activate the bug bounty
  /// @dev activateBounty(): activate a bounty so it may pay out
  /// @param _bountyId the index of the bounty
  /// @param _value the amount being contributed in ether to prevent
  /// accidental deposits
  function activateBounty(uint _bountyId, uint _value)
      payable
      public
      validateBountyArrayIndex(_bountyId)
      isBeforeDeadline(_bountyId)
      onlyIssuer(_bountyId)
      transferredAmountEqualsValue(_bountyId, _value)
  {
      bounties[_bountyId].balance += _value;
      require (bounties[_bountyId].balance >= bounties[_bountyId].fulfillmentAmount);
      transitionToState(_bountyId, BountyStages.Active);

      ContributionAdded(_bountyId, msg.sender, _value);
      BountyActivated(_bountyId, msg.sender);
  }

  modifier notIssuerOrArbiter(uint _bountyId) {
      require(tx.origin != bounties[_bountyId].issuer && tx.origin != bounties[_bountyId].arbiter);
      _;
  }

  /// @dev fulfillBounty(): submit a fulfillment for the given bounty
  /// @param _bountyId the index of the bounty
  /// @param _data the data artifacts representing the fulfillment of the bounty
  function fulfillBounty(uint _bountyId, string _data)
      public
      validateBountyArrayIndex(_bountyId)
      validateNotTooManyFulfillments(_bountyId)
      isAtStage(_bountyId, BountyStages.Active)
      isBeforeDeadline(_bountyId)
      notIssuerOrArbiter(_bountyId)
  {
      fulfillments[_bountyId].push(Fulfillment(false, tx.origin, _data));

      BountyFulfilled(_bountyId, tx.origin, (fulfillments[_bountyId].length - 1));
  }

  /// @dev updateFulfillment(): Submit updated data for a given fulfillment
  /// @param _bountyId the index of the bounty
  /// @param _fulfillmentId the index of the fulfillment
  /// @param _data the new data being submitted
  function updateFulfillment(uint _bountyId, uint _fulfillmentId, string _data)
      public
      validateBountyArrayIndex(_bountyId)
      validateFulfillmentArrayIndex(_bountyId, _fulfillmentId)
      onlyFulfiller(_bountyId, _fulfillmentId)
      notYetAccepted(_bountyId, _fulfillmentId)
  {
      fulfillments[_bountyId][_fulfillmentId].data = _data;
      FulfillmentUpdated(_bountyId, _fulfillmentId);
  }

  modifier onlyIssuerOrArbiter(uint _bountyId) {
      require(msg.sender == bounties[_bountyId].issuer ||
         (msg.sender == bounties[_bountyId].arbiter && bounties[_bountyId].arbiter != address(0)));
      _;
  }

  modifier fulfillmentNotYetAccepted(uint _bountyId, uint _fulfillmentId) {
      require(fulfillments[_bountyId][_fulfillmentId].accepted == false);
      _;
  }

  modifier enoughFundsToPay(uint _bountyId) {
      require(bounties[_bountyId].balance >= bounties[_bountyId].fulfillmentAmount);
      _;
  }

  /// @dev acceptFulfillment(): accept a given fulfillment
  /// @param _bountyId the index of the bounty
  /// @param _fulfillmentId the index of the fulfillment being accepted
  function acceptFulfillment(uint _bountyId, uint _fulfillmentId)
      public
      validateBountyArrayIndex(_bountyId)
      validateFulfillmentArrayIndex(_bountyId, _fulfillmentId)
      onlyIssuerOrArbiter(_bountyId)
      isAtStage(_bountyId, BountyStages.Active)
      fulfillmentNotYetAccepted(_bountyId, _fulfillmentId)
      enoughFundsToPay(_bountyId)
  {
      fulfillments[_bountyId][_fulfillmentId].accepted = true;
      numAccepted[_bountyId]++;
      bounties[_bountyId].balance -= bounties[_bountyId].fulfillmentAmount;
      if (bounties[_bountyId].paysTokens){
        require(tokenContracts[_bountyId].transfer(fulfillments[_bountyId][_fulfillmentId].fulfiller, bounties[_bountyId].fulfillmentAmount));
      } else {
        fulfillments[_bountyId][_fulfillmentId].fulfiller.transfer(bounties[_bountyId].fulfillmentAmount);
      }
      FulfillmentAccepted(_bountyId, msg.sender, _fulfillmentId);
  }

  /// @dev killBounty(): drains the contract of it's remaining
  /// funds, and moves the bounty into stage 3 (dead) since it was
  /// either killed in draft stage, or never accepted any fulfillments
  /// @param _bountyId the index of the bounty
  function killBounty(uint _bountyId)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
  {
      transitionToState(_bountyId, BountyStages.Dead);
      uint oldBalance = bounties[_bountyId].balance;
      bounties[_bountyId].balance = 0;
      if (oldBalance > 0){
        if (bounties[_bountyId].paysTokens){
          require(tokenContracts[_bountyId].transfer(bounties[_bountyId].issuer, oldBalance));
        } else {
          bounties[_bountyId].issuer.transfer(oldBalance);
        }
      }
      BountyKilled(_bountyId, msg.sender);
  }

  modifier newDeadlineIsValid(uint _bountyId, uint _newDeadline) {
      require(_newDeadline > bounties[_bountyId].deadline);
      _;
  }

  /// @dev extendDeadline(): allows the issuer to add more time to the
  /// bounty, allowing it to continue accepting fulfillments
  /// @param _bountyId the index of the bounty
  /// @param _newDeadline the new deadline in timestamp format
  function extendDeadline(uint _bountyId, uint _newDeadline)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      newDeadlineIsValid(_bountyId, _newDeadline)
  {
      bounties[_bountyId].deadline = _newDeadline;

      DeadlineExtended(_bountyId, _newDeadline);
  }

  /// @dev transferIssuer(): allows the issuer to transfer ownership of the
  /// bounty to some new address
  /// @param _bountyId the index of the bounty
  /// @param _newIssuer the address of the new issuer
  function transferIssuer(uint _bountyId, address _newIssuer)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
  {
      bounties[_bountyId].issuer = _newIssuer;
      IssuerTransferred(_bountyId, _newIssuer);
  }


  /// @dev changeBountyDeadline(): allows the issuer to change a bounty's deadline
  /// @param _bountyId the index of the bounty
  /// @param _newDeadline the new deadline for the bounty
  function changeBountyDeadline(uint _bountyId, uint _newDeadline)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      validateDeadline(_newDeadline)
      isAtStage(_bountyId, BountyStages.Draft)
  {
      bounties[_bountyId].deadline = _newDeadline;
      BountyChanged(_bountyId);
  }

  /// @dev changeData(): allows the issuer to change a bounty's data
  /// @param _bountyId the index of the bounty
  /// @param _newData the new requirements of the bounty
  function changeBountyData(uint _bountyId, string _newData)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      isAtStage(_bountyId, BountyStages.Draft)
  {
      bounties[_bountyId].data = _newData;
      BountyChanged(_bountyId);
  }

  /// @dev changeBountyfulfillmentAmount(): allows the issuer to change a bounty's fulfillment amount
  /// @param _bountyId the index of the bounty
  /// @param _newFulfillmentAmount the new fulfillment amount
  function changeBountyFulfillmentAmount(uint _bountyId, uint _newFulfillmentAmount)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      isAtStage(_bountyId, BountyStages.Draft)
  {
      bounties[_bountyId].fulfillmentAmount = _newFulfillmentAmount;
      BountyChanged(_bountyId);
  }

  /// @dev changeBountyArbiter(): allows the issuer to change a bounty's arbiter
  /// @param _bountyId the index of the bounty
  /// @param _newArbiter the new address of the arbiter
  function changeBountyArbiter(uint _bountyId, address _newArbiter)
      public
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      isAtStage(_bountyId, BountyStages.Draft)
  {
      bounties[_bountyId].arbiter = _newArbiter;
      BountyChanged(_bountyId);
  }

  modifier newFulfillmentAmountIsIncrease(uint _bountyId, uint _newFulfillmentAmount) {
      require(bounties[_bountyId].fulfillmentAmount < _newFulfillmentAmount);
      _;
  }

  /// @dev increasePayout(): allows the issuer to increase a given fulfillment
  /// amount in the active stage
  /// @param _bountyId the index of the bounty
  /// @param _newFulfillmentAmount the new fulfillment amount
  /// @param _value the value of the additional deposit being added
  function increasePayout(uint _bountyId, uint _newFulfillmentAmount, uint _value)
      public
      payable
      validateBountyArrayIndex(_bountyId)
      onlyIssuer(_bountyId)
      newFulfillmentAmountIsIncrease(_bountyId, _newFulfillmentAmount)
      transferredAmountEqualsValue(_bountyId, _value)
  {
      bounties[_bountyId].balance += _value;
      require(bounties[_bountyId].balance >= _newFulfillmentAmount);
      bounties[_bountyId].fulfillmentAmount = _newFulfillmentAmount;
      PayoutIncreased(_bountyId, _newFulfillmentAmount);
  }

  /// @dev getFulfillment(): Returns the fulfillment at a given index
  /// @param _bountyId the index of the bounty
  /// @param _fulfillmentId the index of the fulfillment to return
  /// @return Returns a tuple for the fulfillment
  function getFulfillment(uint _bountyId, uint _fulfillmentId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      validateFulfillmentArrayIndex(_bountyId, _fulfillmentId)
      returns (bool, address, string)
  {
      return (fulfillments[_bountyId][_fulfillmentId].accepted,
              fulfillments[_bountyId][_fulfillmentId].fulfiller,
              fulfillments[_bountyId][_fulfillmentId].data);
  }

  /// @dev getBounty(): Returns the details of the bounty
  /// @param _bountyId the index of the bounty
  /// @return Returns a tuple for the bounty
  function getBounty(uint _bountyId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      returns (address, uint, uint, bool, uint, uint)
  {
      return (bounties[_bountyId].issuer,
              bounties[_bountyId].deadline,
              bounties[_bountyId].fulfillmentAmount,
              bounties[_bountyId].paysTokens,
              uint(bounties[_bountyId].bountyStage),
              bounties[_bountyId].balance);
  }

  /// @dev getBountyArbiter(): Returns the arbiter of the bounty
  /// @param _bountyId the index of the bounty
  /// @return Returns an address for the arbiter of the bounty
  function getBountyArbiter(uint _bountyId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      returns (address)
  {
      return (bounties[_bountyId].arbiter);
  }

  /// @dev getBountyData(): Returns the data of the bounty
  /// @param _bountyId the index of the bounty
  /// @return Returns a string for the bounty data
  function getBountyData(uint _bountyId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      returns (string)
  {
      return (bounties[_bountyId].data);
  }

  /// @dev getBountyToken(): Returns the token contract of the bounty
  /// @param _bountyId the index of the bounty
  /// @return Returns an address for the token that the bounty uses
  function getBountyToken(uint _bountyId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      returns (address)
  {
      return (tokenContracts[_bountyId]);
  }

  /// @dev getNumBounties() returns the number of bounties in the registry
  /// @return Returns the number of bounties
  function getNumBounties()
      public
      constant
      returns (uint)
  {
      return bounties.length;
  }

  /// @dev getNumFulfillments() returns the number of fulfillments for a given milestone
  /// @param _bountyId the index of the bounty
  /// @return Returns the number of fulfillments
  function getNumFulfillments(uint _bountyId)
      public
      constant
      validateBountyArrayIndex(_bountyId)
      returns (uint)
  {
      return fulfillments[_bountyId].length;
  }

  /*
   * Internal functions
   */

  /// @dev transitionToState(): transitions the contract to the
  /// state passed in the parameter `_newStage` given the
  /// conditions stated in the body of the function
  /// @param _bountyId the index of the bounty
  /// @param _newStage the new stage to transition to
  function transitionToState(uint _bountyId, BountyStages _newStage)
      internal
  {
      bounties[_bountyId].bountyStage = _newStage;
  }
}
