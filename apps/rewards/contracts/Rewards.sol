/*
 * SPDX-License-Identitifer: GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract Rewards is AragonApp {

    using SafeMath for uint256;
    using SafeMath64 for uint64;
    /// Hardcoded constants to save gas
    bytes32 public constant ADD_REWARD_ROLE = 0x7941efc179bdce37ebd8db3e2deb46ce5280bf6d2de2e50938a9e920494c1941;

    /// Used to limit dividends occurrences for dividend rewards
    uint8 internal constant MAX_OCCURRENCES = uint8(42);

    /// Error string constants
    string private constant ERROR_VAULT = "VAULT_NOT_A_CONTRACT";
    string private constant ERROR_REWARD_TIME_SPAN = "REWARD_CLAIMED_BEFORE_DURATION_AND_DELAY";
    string private constant ERROR_VAULT_FUNDS = "VAULT_NOT_ENOUGH_FUNDS_TO_COVER_REWARD";
    string private constant ERROR_REFERENCE_TOKEN = "REFERENCE_TOKEN_NOT_A_CONTRACT";
    string private constant ERROR_REWARD_TOKEN = "REWARD_TOKEN_NOT_ETH_OR_CONTRACT";
    string private constant ERROR_MERIT_OCCURRENCES = "MERIT_REWARD_MUST_ONLY_OCCUR_ONCE";
    string private constant ERROR_MAX_OCCURRENCES = "OCURRENCES_LIMIT_REACHED";
    string private constant ERROR_START_BLOCK = "START_PERIOD_BEFORE_TOKEN_CREATION";
    string private constant ERROR_REWARD_CLAIMED = "REWARD_ALREADY_CLAIMED";
    string private constant ERROR_ZERO_DURATION = "DURATION_MUST_BE_AT_LEAST_ONE_BLOCK";
    string private constant ERROR_ZERO_OCCURRENCE = "OCCURRENCES_LESS_THAN_ONE";
    string private constant ERROR_ZERO_REWARD = "NO_REWARD_TO_CLAIM";
    string private constant ERROR_EXISTS = "REWARD_DOES_NOT_EXIST";
    string private constant ERROR_NONTRANSFERRABLE = "MINIME_CANNOT_TRANSFER";

    /// Order optimized for storage
    struct Reward {
        MiniMeToken referenceToken;
        bool isMerit;
        uint64 blockStart;
        uint64 duration;
        uint64 delay;
        uint256 amount;
        address creator;
        address rewardToken;
        string description;
        mapping (address => uint) timeClaimed;
    }

    /// Amount claimed for each token
    mapping (address => uint) internal totalAmountClaimed;
    uint256 public totalClaimsEach;

    /// Rewards internal registry
    mapping(uint256 => Reward) rewards;
    uint256 rewardsRegistryLength;
    /// Public vault that holds the funds
    Vault public vault;

    /// Events
    event RewardAdded(uint256 rewardId); /// Emitted when a new reward is created
    event RewardClaimed(uint256 rewardId, address claimant);

    /**
     * @notice Initialize Rewards app for Vault at `_vault`
     * @dev Initializes the Rewards app, this is the Aragon custom constructor
     * @param _vault Address of the vault Rewards will rely on (non changeable)
     */
    function initialize(Vault _vault) external onlyInit {
        require(isContract(_vault), ERROR_VAULT);
        vault = _vault;
        initialized();
    }

    /**
     * @notice Claim my reward for #`_rewardID`
     * @dev Allows a user to claim their reward (if one is available)
     * @param _rewardID The ID of the reward
     * @return rewardAmount calculated for that reward ID
     */
    function claimReward(uint256 _rewardID) external isInitialized returns (uint256) {
        Reward storage reward = rewards[_rewardID];
        require(reward.blockStart > 0, ERROR_EXISTS);
        uint256 rewardTimeSpan = reward.blockStart.add(reward.duration).add(reward.delay);
        require(rewardTimeSpan < getBlockNumber(), ERROR_REWARD_TIME_SPAN);

        require(reward.timeClaimed[msg.sender] == 0, ERROR_REWARD_CLAIMED);
        reward.timeClaimed[msg.sender] = getTimestamp();

        uint256 rewardAmount = _calculateRewardAmount(reward);
        require(rewardAmount > 0, ERROR_ZERO_REWARD);
        require(vault.balance(reward.rewardToken) >= rewardAmount, ERROR_VAULT_FUNDS);

        _transferReward(reward, rewardAmount);

        emit RewardClaimed(_rewardID, msg.sender);
        return rewardAmount;
    }

    /**
     * @notice Get total rewards count
     * @dev Gets the lenght of the rewards registry array
     * @return rewardsLength the length of the rewards array
     */
    function getRewardsLength() external view isInitialized returns (uint256 rewardsLength) {
        rewardsLength = rewardsRegistryLength;
    }

    /**
     * @notice Gets information for the reward with ID #`rewardID`
     * @dev Allows a user to get information about a specific reward
     * @param rewardID The ID of the reward
     * @return description message for this reward
     * @return isMerit true or false in case it is a dividend reward
     * @return referenceToken used as reference to weight the reward
     * @return rewardToken used to pay the reward
     * @return amount for this reward
     * @return startBlock when the reward went active
     * @return endBlock when the reward period ended
     * @return duration number of blocks for the reward duration
     * @return delay in number of blocks in case the reward claiming is postponed
     * @return rewardAmount which amount is available to claim
     * @return timeClaimed when it was claimed by the msg.sender
     * @return creator the address of the reward creator
     */
    function getReward(uint256 rewardID) external view isInitialized returns (
        string description,
        bool isMerit,
        address referenceToken,
        address rewardToken,
        uint256 amount,
        uint256 startBlock,
        uint256 endBlock,
        uint256 duration,
        uint256 delay,
        uint256 rewardAmount,
        uint256 timeClaimed,
        address creator
    )
    {
        Reward storage reward = rewards[rewardID];
        description = reward.description;
        isMerit = reward.isMerit;
        referenceToken = reward.referenceToken;
        rewardToken = reward.rewardToken;
        amount = reward.amount;
        endBlock = reward.blockStart + reward.duration;
        startBlock = reward.blockStart;
        duration = reward.duration;
        delay = reward.delay;
        timeClaimed = reward.timeClaimed[msg.sender];
        creator = reward.creator;
        rewardAmount = _calculateRewardAmount(reward);
    }

    /**
     * @notice Get total amount of `_token` claimed
     * @dev Gets the amount of this token claimed
     * @return totalAmountClaimed for that token
     */
    function getTotalAmountClaimed(address _token)
    external view isInitialized returns (uint256)
    {
        return totalAmountClaimed[_token];
    }

    /**
     * @notice Create a `_isMerit ? 'merit reward' : 'dividend'` that will distribute `@tokenAmount(_rewardToken, _amount)` to token holders who `_isMerit ? 'earned ' : 'hold '` `_referenceToken.symbol(): string` `(_occurrences > 1) ? ' from block ' + _startBlock + ' to block ' + (_startBlock + _duration) + '. This dividend will disburse every ' + _duration + ' blocks in proportion to the holders balance on the disbursement date. The first disbursement occurs at the end of the first cycle, on block ' + (_startBlock + _duration) + '.' : (_isMerit ? 'from block ' + _startBlock + 'to block ' + (_startBlock + _duration) +'.' : 'on block '+ _startBlock + '.')` (Reference: `_description`)
     * @dev This function creates a reward instance to be added to the rewards array. ID's
     *      are assigned the new intance's index of that array
     * @param _description description of the reward
     * @param _isMerit Recurring dividend reward or one-off merit reward
     * @param _referenceToken the token used to calculate reward distributions for each holder
     * @param _rewardToken currency received as reward, accepts address 0 for ETH reward
     * @param _amount the reward amount to be distributed
     * @param _startBlock block in which token transactions will begin to be tracked
     * @param _duration the block duration over which reference token earnings are calculated
     * @param _occurrences the number of occurrences of a dividend reward
     * @param _delay the number of blocks to delay after the end of the period that the reward can be claimed
     * @return rewardId of the newly created Reward
     */
    function newReward(
        string _description,
        bool _isMerit,
        MiniMeToken _referenceToken,
        address _rewardToken,
        uint256 _amount,
        uint64 _startBlock,
        uint64 _duration,
        uint8 _occurrences,
        uint64 _delay
    ) public auth(ADD_REWARD_ROLE) returns (uint256 rewardId)
    {
        require(isContract(_referenceToken), ERROR_REFERENCE_TOKEN);
        require(_rewardToken == address(0) || isContract(_rewardToken), ERROR_REWARD_TOKEN);
        require(_duration > 0, ERROR_ZERO_DURATION);
        require(_occurrences > 0, ERROR_ZERO_OCCURRENCE);
        require(!_isMerit || _occurrences == 1, ERROR_MERIT_OCCURRENCES);
        require(_occurrences < MAX_OCCURRENCES, ERROR_MAX_OCCURRENCES);
        require(_startBlock > _referenceToken.creationBlock(), ERROR_START_BLOCK);
        if (_isMerit) {
            require(!_referenceToken.transfersEnabled(), ERROR_NONTRANSFERRABLE);
        }
        rewardId = rewardsRegistryLength++; // increment the rewards array to create a new one
        Reward storage reward = rewards[rewardsRegistryLength - 1]; // length-1 takes the last, newly created "empty" reward
        reward.description = _description;
        reward.isMerit = _isMerit;
        reward.referenceToken = _referenceToken;
        reward.rewardToken = _rewardToken;
        reward.amount = _amount;
        reward.duration = _duration;
        reward.delay = _delay;
        reward.blockStart = _startBlock;
        reward.creator = msg.sender;
        emit RewardAdded(rewardId);
        if (_occurrences > 1) {
            newReward(
                _description,
                _isMerit,
                _referenceToken,
                _rewardToken,
                _amount,
                _startBlock + _duration,
                _duration,
                _occurrences - 1,
                _delay
            );
        }
    }

    /**
     * @dev Private intermediate function that does the actual vault transfer for a reward and reward amoun
     */
    function _transferReward(Reward storage reward, uint256 rewardAmount) private {
        totalClaimsEach++;
        totalAmountClaimed[reward.rewardToken] = totalAmountClaimed[reward.rewardToken].add(rewardAmount);
        vault.transfer(reward.rewardToken, msg.sender, rewardAmount);
    }

    /**
     * @dev Private intermediate function to calculate reward amount depending of the type, balance and supply
     * @return rewardAmount calculated for that reward
     */
    function _calculateRewardAmount(Reward storage reward) private view returns (uint256 rewardAmount) {
        uint256 balance;
        uint256 supply;
        balance = reward.referenceToken.balanceOfAt(msg.sender, reward.blockStart + reward.duration);
        supply = reward.referenceToken.totalSupplyAt(reward.blockStart + reward.duration);
        if (reward.isMerit) {
            // This is a pending implementation. We need to look into a way to track earned tokens
            // to better calculate merit reward amounts
            uint256 originalBalance = balance;
            uint256 originalSupply = supply;
            balance -= reward.referenceToken.balanceOfAt(msg.sender, reward.blockStart);
            supply -= reward.referenceToken.totalSupplyAt(reward.blockStart);
            if (originalBalance <= balance || originalSupply < supply) {
                return 0;
            }
        }
        rewardAmount = supply == 0 ? 0 : reward.amount.mul(balance).div(supply);
    }
}
