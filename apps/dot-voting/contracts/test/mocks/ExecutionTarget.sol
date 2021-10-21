pragma solidity ^0.4.24;


contract ExecutionTarget {
    uint256[] public signal;
    uint256[] public level1Id;
    uint256[] public level2Id;
    uint256 public endValue;
    /// @dev The first 6 arguments in setSignal are necessary in a function that will be forwarded to dotVoting.
    /// Any additional parameters must not be an array type of any form (strings included), or the function will not be forwardable.
    function setSignal(
        address[] /*_addr*/,
        uint256[] _signal,
        uint256[] /*_infoIndices*/,
        string /*_candidateInfo*/,
        string /*description*/,
        uint256[] _level1Id,
        uint256[] _level2Id,
        uint256 /*external vote Identifier*/,
        bool /*test param*/,
        uint256 /*test param*/
    ) public
    {
        for (uint i = 0; i < _signal.length; i++) {
            signal.push(_signal[i]);
            level1Id.push(_level1Id[i]);
            level2Id.push(_level2Id[i]);
        }
        emit Executed(_signal.length);
    }

    function setDistribution(
      address[] _candidateAddresses,
      uint256[] _supports,
      uint256[] /*_infoIndices*/,
      string /*_candidateInfo*/,
      string _description,
      uint256[] /*level 1 Id*/,
      uint256[] /*level 2 Id*/,
      uint64 _accountId,
      uint64 _recurrences,
      uint64 _startTime,
      uint64 _period,
      uint256 _amount
    ) public
    {
        endValue = _amount;
        emit Distribution(_candidateAddresses, _supports, _amount);
    }

    function setLongTarget(
      address[] /*_addr*/,
      uint256[] /*_supports*/,
      uint256[] /*_infoIndices*/,
      string /*_candidateInfo*/,
      string /*description*/,
      uint256[] /*level 1 Id*/,
      uint256[] /*level 2 Id*/,
      uint256 /*external vote Identifier*/,
      uint256 /*test param*/,
      uint256 /*test param*/,
      uint256 /*test param*/,
      uint256 /*test param*/,
      uint256 /*test param*/,
      uint256 /*test param*/,
      uint256 _endValue
    ) public
    {
        endValue = _endValue;
        emit EndValue(_endValue);
    }

    function autoThrow(uint256[] /*_signal*/) public pure {
        require(false); // solium-disable-line error-reason
    }

    function getSignal(uint256 sigIndex) public view returns (uint256 sig, uint256 l1Id, uint256 l2Id) {
        sig = signal[sigIndex];
        l1Id = level1Id[sigIndex];
        l2Id = level2Id[sigIndex];
    }

    function getEndValue() public view returns (uint256) {
      return endValue;
    }

    event Executed(uint length);
    event Distribution(address[] candidates, uint256[] supports, uint256 amount);
    event EndValue(uint256 amount);
}
