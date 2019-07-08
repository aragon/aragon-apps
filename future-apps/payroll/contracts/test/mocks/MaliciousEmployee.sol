pragma solidity 0.4.24;

import "../../Payroll.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";


contract MaliciousEmployee {
    Action public action;
    Payroll public payroll;
    uint256 public counter;

    enum Action { Payday, ChangeAddress, SetAllocation }

    function setPayroll(Payroll _payroll) public {
        payroll = _payroll;
    }

    function setAction(Action _action) public {
        action = _action;
    }

    function payday() public {
        payroll.payday(Payroll.PaymentType.Payroll, 0, new uint256[](0));
    }

    function determineAllocation(address[] _tokens, uint256[] _distribution) public {
        payroll.determineAllocation(_tokens, _distribution);
    }

    function reenter() public {
        if (counter > 0) {
            return;
        }

        counter++;

        if (action == Action.Payday) {
            payroll.payday(Payroll.PaymentType.Payroll, 0, new uint256[](0));
        } else if (action == Action.ChangeAddress) {
            payroll.changeAddressByEmployee(msg.sender);
        } else if (action == Action.SetAllocation) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(0);
            uint256[] memory distribution = new uint256[](1);
            distribution[0] = 100;
            uint256[] memory minRates = new uint256[](1);
            minRates[0] = 1e18;
            payroll.determineAllocation(tokens, distribution);
        }
    }
}


contract MaliciousERC20 is ERC20 {
    using SafeMath for uint256;

    MaliciousEmployee public employee;
    uint256 private totalSupply_;
    mapping (address => uint256) private balances;
    mapping (address => mapping (address => uint256)) private allowed;

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor (MaliciousEmployee _employee, uint256 initialBalance) public {
        employee = _employee;
        totalSupply_ = initialBalance;
        balances[msg.sender] = initialBalance;
    }

    function totalSupply() public view returns (uint256) { return totalSupply_; }

    function balanceOf(address _owner) public view returns (uint256) { return balances[_owner]; }

    function allowance(address _owner, address _spender) public view returns (uint256) { return allowed[_owner][_spender]; }

    function approve(address _spender, uint256 _value) public returns (bool) {
        require(allowed[msg.sender][_spender] == 0);
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_value <= balances[msg.sender]);
        require(_to != address(0));

        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        emit Transfer(msg.sender, _to, _value);

        employee.reenter();
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_value <= balances[_from]);
        require(_value <= allowed[_from][msg.sender]);
        require(_to != address(0));

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);

        return true;
    }
}
