# StandardBounties Complete Documentation

`Version 1.0.0`

## Summary

A bounty is a simple mechanism for individuals or groups to pay out for the completion of tasks. The issuer of the bounty begins by deploying a new bounty contract, during which time any of the storage variables (like bounty requirements or the payout amount) can be altered. Once sufficient funds have been deposited into the contract, the issuer may activate the bounty, allowing bounty hunters to submit fulfillments for the bounty task. The issuer can then approve the submitted work, releasing the payout funds to the bounty hunter in question.


## Contract Details

Any application can take advantage of the Bounties Network registry, which is currently deployed on the Main Ethereum Network at `0x2af47a65da8cd66729b4209c22017d6a5c2d2400`, and on the Rinkeby network at `0xf209d2b723b6417cbf04c07e733bee776105a073`. 

### Storage

`address issuer`
The issuer is the creator of the bounty, and has full control over administering its rewards.

`uint deadline`
A bounty can only be contributed to, activated, or fulfilled before the given deadline, however fulfillments can be accepted even after the deadline has passed. This deadline can be moved forward or backwards in the draft stage, but once the bounty is activated it can only be extended. This helps maintain the contractual nature of the relationship, where issuers cannot move deadlines forward arbitrarily while individuals are fulfilling the tasks.

`string public data`
All data representing the requirements are stored off-chain on IPFS, and their hash is updated here. Requirements and auxiliary data are mutable while the bounty is in the `Draft` stage, but becomes immutable when the bounty is activated, thereby "locking in" the terms of the contract, the requirements for acceptance for each milestone. These should be as rich as possible from the outset, to avoid conflicts stemming from task fulfillers believing they merited the bounty reward.

The schema for the bounty data field can be found at [the schema](./standardSchemas.md)

`uint public fulfillmentAmount`
The number of units which the bounty pays out for successful completion, either in wei or in token units for the relevant contract.

`address arbiter`
The arbiter is an individual or contract who is able to accept fulfillments on the issuer's behalf. The arbiter is also disallowed from fulfilling the bounty.

`bool paysTokens`
A representation of whether the given bounty pays in ERC20 tokens or in ETH. When it is `true`, the bounty cannot accept ETH deposits, and vice versa when it is false, it will not transfer tokens to the contract.

`BountyStages bountyStage`
Bounties are formed in the `Draft` stage, a period during which the issuer can edit any of the bounty's state variables, and attain sufficient funding. In the draft stage, no fulfillments can be submitted, and no funds can be paid out.

Once the bounty state variables are finalized, and the bounty contract holds sufficient funds to pay out each milestone at least once, it can be transitioned to the `Active` stage by only the issuer. During the active stage, the requirements or payout amount cannot be altered, however the deadline may be extended. Fulfillments can only be submitted in the `Active` stage before the deadline, although they may be accepted by the issuer or arbiter even after the deadline has passed.
At any point, the issuer can kill the bounty returning all funds to them (less the amount due for already accepted but unpaid submissions), transitioning the bounty into the `Dead` stage. However, this behaviour is highly discouraged and should be avoided at all costs.

`uint balance`
The number of units of tokens or ETH which the bounty has under its control. The balance must always be greater than or equal to the owedAmount for a given bounty.


`mapping(uint=>Fulfillment[]) public fulfillments`
Work is submitted and a hash is stored on-chain, allowing any deliverable to be submitted for the same bounty. Fulfillments for a given `_bountyId` are added to the array of fulfillments at that same `_bountyId`.


`mapping(uint=>uint) public numAccepted`
The number of submissions which have been accepted for each bounty


### External functions

#### StandardBounties()
Constructs the StandardBounties registry and instantiates it's owner as given
```
function StandardBounties(address _owner)
    public
{
    owner = _owner;
}
```

#### issueBounty()
Issues the bounty and instantiates state variables, initializing it in the draft stage. The bounty deadline must be after the time of issuance (contract deployment), and none of the milestones can pay out 0 tokens. The `data` field represents the IPFS hash for a JSON object, whose schema can be found at [the schema](./standardSchemas.md).
```
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
```

#### issueAndActivateBounty()
Issues the bounty and instantiates state variables, initializing it in the active stage. The bounty deadline must be after the time of issuance (contract deployment), and none of the milestones can pay out 0 tokens. The issuer must specify their initial deposit amount, which is checked against the deposited tokens or ETH. This new amount is the initial balance of the bounty.
```
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
```

#### Contribute()
This allows a bounty to receive 3rd party contributions from the crowd. This functionality is only available before the deadline has passed, and while the bounty is not in the `Dead` stage. The Ether (or tokens) which are deposited are at the mercy of the issuer, who can at any point call `killBounty()` to drain remaining funds.
```
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
```

#### ActivateBounty()
If the bounty has sufficient funds to pay out at least once, it can be activated, allowing individuals to add submissions. Only the issuer is allowed to activate their bounty.
```
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
```

#### FulfillBounty()
Once the bounty is active, anyone can fulfill it and submit the necessary deliverables (as long as the deadline has not passed). Anyone can fulfill the bounty, except for the issuer and arbiter, who are disallowed from doing so. The `data` field represents the IPFS hash for a JSON object, whose schema can be found at [the schema](./standardSchemas.md).

```
function fulfillBounty(uint _bountyId, string _data)
    public
    validateBountyArrayIndex(_bountyId)
    validateNotTooManyFulfillments(_bountyId)
    isAtStage(_bountyId, BountyStages.Active)
    isBeforeDeadline(_bountyId)
    notIssuerOrArbiter(_bountyId)
{
    fulfillments[_bountyId].push(Fulfillment(false, msg.sender, _data));

    BountyFulfilled(_bountyId, msg.sender, (fulfillments[_bountyId].length - 1));
}
```

#### updateFulfillment()
After a bounty has been fulfilled, the data representing the fulfillment deliverables can be changed or updated by the fulfiller, but only before the bounty has been accepted or paid. Individuals may only update the fulfillments which they personally submitted.
```
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
```

#### AcceptFulfillment()
Submissions can be accepted by the issuer while the bounty is active, and the contract has sufficient funds to pay out all previously accepted submissions. Arbiters also have the ability to accept work, but should only do so after mediating between the issuer and fulfiller to resolve the conflict.

```
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
```

#### KillBounty()
The issuer of the bounty can transition it into the `Dead` stage at any point in time, draining the bounty of all remaining funds (less the amount still due for successful fulfillments which are yet unpaid).
```
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
```

#### ExtendDeadline()
The issuer of the bounty can extend the deadline at any time, allowing more time for submissions to be fulfilled.
```
function extendDeadline(uint _bountyId, uint _newDeadline)
    public
    validateBountyArrayIndex(_bountyId)
    onlyIssuer(_bountyId)
    newDeadlineIsValid(_bountyId, _newDeadline)
{
    bounties[_bountyId].deadline = _newDeadline;

    DeadlineExtended(_bountyId, _newDeadline);
}
```

#### transferIssuer()
At any point, the issuer can transfer ownership of the bounty to a new address that they supply. This gives full power and authority to the new issuer address, and releases the old issuer address from the ability to administer the bounty.
```
function transferIssuer(uint _bountyId, address _newIssuer)
    public
    validateBountyArrayIndex(_bountyId)
    onlyIssuer(_bountyId)
{
    bounties[_bountyId].issuer = _newIssuer;
    IssuerTransferred(_bountyId, _newIssuer);
}
```

#### changeBountyDeadline()
The issuer of the bounty can change the deadline while the bounty is in the `Draft` stage. This is not allowed when the bounty is in the `Active` or `Dead` stage.
```
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
```

#### changeBountyData()
The issuer of the bounty can change the data while the bounty is in the `Draft` stage. This is not allowed when the bounty is in the `Active` or `Dead` stage.
```
function changeBountyData(uint _bountyId, string _newData)
    public
    validateBountyArrayIndex(_bountyId)
    onlyIssuer(_bountyId)
    isAtStage(_bountyId, BountyStages.Draft)
{
    bounties[_bountyId].data = _newData;
    BountyChanged(_bountyId);
}
```

#### changeBountyFulfillmentAmount()
The issuer of the bounty can change the fulfillment amount while the bounty is in the `Draft` stage. This is not allowed when the bounty is in the `Active` or `Dead` stage.
```
function changeBountyFulfillmentAmount(uint _bountyId, uint _newFulfillmentAmount)
    public
    validateBountyArrayIndex(_bountyId)
    onlyIssuer(_bountyId)
    isAtStage(_bountyId, BountyStages.Draft)
{
    bounties[_bountyId].fulfillmentAmount = _newFulfillmentAmount;
    BountyChanged(_bountyId);
}
```

#### changeBountyArbiter()
The issuer of the bounty can change the arbiter while the bounty is in the `Draft` stage. This is not allowed when the bounty is in the `Active` or `Dead` stage.
```
function changeBountyArbiter(uint _bountyId, address _newArbiter)
    public
    validateBountyArrayIndex(_bountyId)
    onlyIssuer(_bountyId)
    isAtStage(_bountyId, BountyStages.Draft)
{
    bounties[_bountyId].arbiter = _newArbiter;
    BountyChanged(_bountyId);
}
```

#### increasePayout()
The issuer of the bounty can increase the payout of the bounty even in the `Active` stage, as long as the balance of their bounty is sufficient to pay out any accepted fulfillments.
```
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
```

#### getFulfillment()
Returns all of the information describing a given fulfillment for a given bounty.
```
function getFulfillment(uint _bountyId, uint _fulfillmentId)
    public
    pure
    validateBountyArrayIndex(_bountyId)
    validateFulfillmentArrayIndex(_bountyId, _fulfillmentId)
    returns (bool, address, string)
{
    return (fulfillments[_bountyId][_fulfillmentId].accepted,
            fulfillments[_bountyId][_fulfillmentId].fulfiller,
            fulfillments[_bountyId][_fulfillmentId].data);
}
```

#### getBounty()
Returns a tuple of the variables describing the bounty, except for the arbiter, data, or token contract.
```
function getBounty(uint _bountyId)
    public
    pure
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
```

#### getBountyArbiter()
Returns an address of the arbiter for the given bounty.
```
function getBountyArbiter(uint _bountyId)
    public
    pure
    validateBountyArrayIndex(_bountyId)
    returns (address)
{
    return (bounties[_bountyId].arbiter);
}
```

#### getBountyData()
Returns a string of the data for the given bounty.
```
function getBountyData(uint _bountyId)
    public
    pure
    validateBountyArrayIndex(_bountyId)
    returns (string)
{
    return (bounties[_bountyId].data);
}
```

#### getBountyToken()
Returns an address of the token for the given bounty.
```
function getBountyToken(uint _bountyId)
    public
    pure
    validateBountyArrayIndex(_bountyId)
    returns (address)
{
    return (tokenContracts[_bountyId]);
}
```

#### getNumBounties()
Returns the number of bounties which exist on the registry
```
function getNumBounties()
    public
    pure
    returns (uint)
{
    return bounties.length;
}
```

#### getNumFulfillments()
Returns the number of fulfillments which have been submitted for a given bounty
```
function getNumFulfillments(uint _bountyId)
    public
    pure
    validateBountyArrayIndex(_bountyId)
    returns (uint)
{
    return fulfillments[_bountyId].length;
}
```

### Events

```event BountyIssued(uint bountyId);```
This is emitted when a new bounty is issued on the StandardBounties registry

```event BountyActivated(uint bountyId, address issuer);```
This is emitted when the bounty gets activated by the issuer

```event BountyFulfilled(uint bountyId, address indexed fulfiller, uint256 indexed _fulfillmentId);```
This is emitted when a given bounty is fulfilled

```event FulfillmentUpdated(uint _bountyId, uint _fulfillmentId);```
This is emitted when a given fulfillment is altered

```event FulfillmentAccepted(uint bountyId, address indexed fulfiller, uint256 indexed _fulfillmentId);```
This is emitted when a given fulfillment for a given bounty is accepted and paid

```event BountyKilled(uint bountyId);```
This is emitted when a given bounty is killed

```event ContributionAdded(uint bountyId, address indexed contributor, uint256 value);```
This is emitted when an individual contributes to a given bounty

```event DeadlineExtended(uint bountyId, uint newDeadline);```
This is emitted when the deadline of the bounty has been extended

```event BountyChanged(uint bountyId);```
This is emitted when the bounty has been changed (in the draft stage)

```event IssuerTransferred(uint _bountyId, address indexed _newIssuer);```
This is emitted when the issuer of a bounty transfers the ownership of the bounty to a new issuer.

```event PayoutIncreased(uint _bountyId, uint _newFulfillmentAmount);```
This is emitted when the issuer of a bounty increases the payout amount
