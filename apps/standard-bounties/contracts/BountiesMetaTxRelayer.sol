pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./StandardBounties.sol";

contract BountiesMetaTxRelayer {

  // This contract serves as a relayer for meta txns being sent to the Bounties contract

  StandardBounties public bountiesContract;
  mapping(address => uint) public replayNonce;


  constructor(address _contract) public {
    bountiesContract = StandardBounties(_contract);
  }

  function metaIssueBounty(
    bytes memory signature,
    address payable [] memory _issuers,
    address [] memory _approvers,
    string memory _data,
    uint _deadline,
    address _token,
    uint _tokenVersion,
    uint _nonce)
    public
    returns (uint)
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaIssueBounty",
                                                  _issuers,
                                                  _approvers,
                                                  _data,
                                                  _deadline,
                                                  _token,
                                                  _tokenVersion,
                                                  _nonce));
    address signer = getSigner(metaHash, signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;
    return bountiesContract.issueBounty(address(uint160(signer)),
                                         _issuers,
                                         _approvers,
                                         _data,
                                         _deadline,
                                         _token,
                                         _tokenVersion);
  }

  function metaIssueAndContribute(
    bytes memory signature,
    address payable [] memory _issuers,
    address [] memory _approvers,
    string memory _data,
    uint _deadline,
    address _token,
    uint _tokenVersion,
    uint _depositAmount,
    uint _nonce)
    public
    payable
    returns (uint)
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaIssueAndContribute",
                                                  _issuers,
                                                  _approvers,
                                                  _data,
                                                  _deadline,
                                                  _token,
                                                  _tokenVersion,
                                                  _depositAmount,
                                                  _nonce));
    address signer = getSigner(metaHash, signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    if (msg.value > 0){
      return bountiesContract.issueAndContribute.value(msg.value)(address(uint160(signer)),
                                                 _issuers,
                                                 _approvers,
                                                 _data,
                                                 _deadline,
                                                 _token,
                                                 _tokenVersion,
                                                 _depositAmount);
    } else {
      return bountiesContract.issueAndContribute(address(uint160(signer)),
                                                 _issuers,
                                                 _approvers,
                                                 _data,
                                                 _deadline,
                                                 _token,
                                                 _tokenVersion,
                                                 _depositAmount);
    }

  }

  function metaContribute(
    bytes memory _signature,
    uint _bountyId,
    uint _amount,
    uint _nonce)
    public
    payable
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaContribute",
                                                  _bountyId,
                                                  _amount,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    if (msg.value > 0){
      bountiesContract.contribute.value(msg.value)(address(uint160(signer)), _bountyId, _amount);
    } else {
      bountiesContract.contribute(address(uint160(signer)), _bountyId, _amount);
    }
  }


  function metaRefundContribution(
    bytes memory _signature,
    uint _bountyId,
    uint _contributionId,
    uint _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaRefundContribution",
                                                  _bountyId,
                                                  _contributionId,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.refundContribution(signer, _bountyId, _contributionId);
  }

  function metaRefundMyContributions(
    bytes memory _signature,
    uint _bountyId,
    uint [] memory _contributionIds,
    uint _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaRefundMyContributions",
                                                  _bountyId,
                                                  _contributionIds,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.refundMyContributions(signer, _bountyId, _contributionIds);
  }

  function metaRefundContributions(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    uint [] memory _contributionIds,
    uint _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaRefundContributions",
                                                  _bountyId,
                                                  _issuerId,
                                                  _contributionIds,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.refundContributions(signer, _bountyId, _issuerId, _contributionIds);
  }

  function metaDrainBounty(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    uint [] memory _amounts,
    uint _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaDrainBounty",
                                                  _bountyId,
                                                  _issuerId,
                                                  _amounts,
                                                  _nonce));
    address payable signer = address(uint160(getSigner(metaHash, _signature)));

    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.drainBounty(signer, _bountyId, _issuerId, _amounts);
  }

  function metaPerformAction(
    bytes memory _signature,
    uint _bountyId,
    string memory _data,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaPerformAction",
                                                  _bountyId,
                                                  _data,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.performAction(signer, _bountyId, _data);
  }

  function metaFulfillBounty(
    bytes memory _signature,
    uint _bountyId,
    address payable [] memory  _fulfillers,
    string memory _data,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaFulfillBounty",
                                                  _bountyId,
                                                  _fulfillers,
                                                  _data,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.fulfillBounty(signer, _bountyId, _fulfillers, _data);
  }

  function metaUpdateFulfillment(
    bytes memory _signature,
    uint _bountyId,
    uint _fulfillmentId,
    address payable [] memory  _fulfillers,
    string memory _data,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaUpdateFulfillment",
                                                  _bountyId,
                                                  _fulfillmentId,
                                                  _fulfillers,
                                                  _data,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.updateFulfillment(signer, _bountyId, _fulfillmentId, _fulfillers, _data);
  }

  function metaAcceptFulfillment(
    bytes memory _signature,
    uint _bountyId,
    uint _fulfillmentId,
    uint _approverId,
    uint [] memory _tokenAmounts,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaAcceptFulfillment",
                                                  _bountyId,
                                                  _fulfillmentId,
                                                  _approverId,
                                                  _tokenAmounts,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.acceptFulfillment(signer,
                       _bountyId,
                       _fulfillmentId,
                       _approverId,
                       _tokenAmounts);
  }

  function metaFulfillAndAccept(
    bytes memory _signature,
    uint _bountyId,
    address payable [] memory _fulfillers,
    string memory _data,
    uint _approverId,
    uint [] memory _tokenAmounts,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaFulfillAndAccept",
                                                  _bountyId,
                                                  _fulfillers,
                                                  _data,
                                                  _approverId,
                                                  _tokenAmounts,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.fulfillAndAccept(signer,
                      _bountyId,
                      _fulfillers,
                      _data,
                      _approverId,
                      _tokenAmounts);
  }

  function metaChangeBounty(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    address payable [] memory _issuers,
    address payable [] memory _approvers,
    string memory _data,
    uint _deadline,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaChangeBounty",
                                                  _bountyId,
                                                  _issuerId,
                                                  _issuers,
                                                  _approvers,
                                                  _data,
                                                  _deadline,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.changeBounty(signer,
                  _bountyId,
                  _issuerId,
                  _issuers,
                  _approvers,
                  _data,
                  _deadline);
  }

  function metaChangeIssuer(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    uint _issuerIdToChange,
    address payable _newIssuer,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaChangeIssuer",
                                                  _bountyId,
                                                  _issuerId,
                                                  _issuerIdToChange,
                                                  _newIssuer,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.changeIssuer(signer,
                  _bountyId,
                  _issuerId,
                  _issuerIdToChange,
                  _newIssuer);
  }

  function metaChangeApprover(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    uint _approverId,
    address payable _approver,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaChangeApprover",
                                                  _bountyId,
                                                  _issuerId,
                                                  _approverId,
                                                  _approver,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.changeApprover(signer,
                  _bountyId,
                  _issuerId,
                  _approverId,
                  _approver);
  }

  function metaChangeData(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    string memory _data,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaChangeData",
                                                  _bountyId,
                                                  _issuerId,
                                                  _data,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.changeData(signer,
                _bountyId,
                _issuerId,
                _data);
  }

  function metaChangeDeadline(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    uint  _deadline,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaChangeDeadline",
                                                  _bountyId,
                                                  _issuerId,
                                                  _deadline,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.changeDeadline(signer,
                    _bountyId,
                    _issuerId,
                    _deadline);
  }

  function metaAddIssuers(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    address payable [] memory _issuers,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaAddIssuers",
                                                  _bountyId,
                                                  _issuerId,
                                                  _issuers,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.addIssuers(signer,
                _bountyId,
                _issuerId,
                _issuers);
  }

  function metaReplaceIssuers(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    address payable [] memory _issuers,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaReplaceIssuers",
                                                  _bountyId,
                                                  _issuerId,
                                                  _issuers,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.replaceIssuers(signer,
                    _bountyId,
                    _issuerId,
                    _issuers);
  }

  function metaAddApprovers(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    address payable [] memory _approvers,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaAddApprovers",
                                                  _bountyId,
                                                  _issuerId,
                                                  _approvers,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.addIssuers(signer,
                _bountyId,
                _issuerId,
                _approvers);
  }

  function metaReplaceApprovers(
    bytes memory _signature,
    uint _bountyId,
    uint _issuerId,
    address payable [] memory _approvers,
    uint256 _nonce)
    public
    {
    bytes32 metaHash = keccak256(abi.encodePacked(address(this),
                                                  "metaReplaceApprovers",
                                                  _bountyId,
                                                  _issuerId,
                                                  _approvers,
                                                  _nonce));
    address signer = getSigner(metaHash, _signature);
    //make sure signer doesn't come back as 0x0
    require(signer != address(0));
    require(_nonce == replayNonce[signer]);

    //increase the nonce to prevent replay attacks
    replayNonce[signer]++;

    bountiesContract.replaceIssuers(signer,
                    _bountyId,
                    _issuerId,
                    _approvers);
  }

  function getSigner(
    bytes32 _hash,
    bytes memory _signature)
    internal
    pure
    returns (address)
  {
    bytes32 r;
    bytes32 s;
    uint8 v;
    if (_signature.length != 65) {
      return address(0);
    }
    assembly {
      r := mload(add(_signature, 32))
      s := mload(add(_signature, 64))
      v := byte(0, mload(add(_signature, 96)))
    }
    if (v < 27) {
      v += 27;
    }
    if (v != 27 && v != 28) {
      return address(0);
    } else {
      return ecrecover(keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
      ), v, r, s);
    }
  }
}
