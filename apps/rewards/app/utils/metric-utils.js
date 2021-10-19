import BigNumber from 'bignumber.js'
import { MILLISECONDS_IN_A_MONTH } from '../../../../shared/ui/utils/math-utils'
import { addressesEqual } from '../../../../shared/lib/web3-utils'

export const calculateAverageRewardsNumbers = ( rewards, claims, balances, convertRates ) => {
  if (balances && convertRates) {
    const claimsReturn = Object.keys(claims).length > 0 ? calculateAvgClaim(claims, balances, convertRates): 0
    return [
      claimsReturn,
      calculateMonthlyAvg(rewards, balances, convertRates),
      calculateYTDRewards(rewards,balances, convertRates),
    ]
  }
  else {
    return Array(3).fill(0, '$')
  }
}

const calculateAvgClaim = ({ claimsByToken, totalClaimsMade }, balances, convertRates) => {
  return sumTotalRewards(
    claimsByToken,
    balances,
    convertRates,
    (claim, bal) => addressesEqual(claim.address, bal.address)
  ) / totalClaimsMade
}

const calculateMonthlyAvg = (rewards, balances, convertRates) => {
  if(rewards.length === 0) {
    return 0
  }
  const earliestReward = rewards.reduce(
    (minDate, reward) => {
      return reward.endDate < minDate.endDate ? reward : minDate
    },
    rewards[0]
  )
  const millisecondsFromNow = Math.abs(earliestReward.endDate - Date.now())
  const monthsFromNow = Math.ceil(millisecondsFromNow / MILLISECONDS_IN_A_MONTH)
  const totalRewards = sumTotalRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => addressesEqual(rew.rewardToken, bal.address)
  )
  const monthlyAvg = totalRewards / monthsFromNow
  return monthlyAvg
}

const calculateYTDRewards = (rewards, balances, convertRates) => {
  const yearBeginning = new Date(new Date(Date.now()).getFullYear(), 0)
  const totalRewards = sumTotalRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => addressesEqual(rew.rewardToken, bal.address) && rew.endDate >= yearBeginning
  )
  return totalRewards
}

const sumTotalRewards = (rewards, balances, convertRates, rewardFilter) => {
  return balances.reduce((balAcc, balance) => {
    if (convertRates[balance.symbol]) {
      return rewards.reduce((rewAcc,reward) => {
        return (rewardFilter(reward, balance))
          ?
          BigNumber(reward.amount).div(Math.pow(10, balance.decimals)).div(convertRates[balance.symbol]).plus(rewAcc)
            .toNumber()
          :
          rewAcc
      },0) + balAcc
    }
    else return balAcc
  },0)
}

export const calculateMyRewardsSummary = (rewards, balances, convertRates) => {
  if (balances && convertRates) {
    return [
      calculateUnclaimedRewards(rewards, balances, convertRates),
      calculateAllRewards(rewards, balances, convertRates),
      calculateYTDUserRewards(rewards, balances, convertRates)
    ]
  }
  else {
    return Array(3).fill(0)
  }
}

const calculateUnclaimedRewards = (rewards, balances, convertRates) => {
  return sumUserRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => !rew.claimed && addressesEqual(rew.rewardToken, bal.address) // rewardFilter
  )
}

const calculateAllRewards = (rewards, balances, convertRates) => {
  return sumUserRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => rew.claimed && addressesEqual(rew.rewardToken, bal.address), // RewardFilter
  )
}

const calculateYTDUserRewards = (rewards, balances, convertRates) => {
  const yearBeginning = new Date(new Date(Date.now()).getFullYear(), 0)
  return sumUserRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => rew.claimed && addressesEqual(rew.rewardToken, bal.address) && rew.endDate >= yearBeginning
  )
}

const sumUserRewards = (rewards, balances, convertRates, rewardFilter) => {
  return balances.reduce((balAcc, balance) => {
    if (convertRates[balance.symbol]) {
      return rewards.reduce((rewAcc,reward) => {
        return (rewardFilter(reward, balance))
          ?
          BigNumber(reward.userRewardAmount).div(Math.pow(10, balance.decimals)).div(convertRates[balance.symbol]).plus(rewAcc)
            .toNumber()
          :
          rewAcc
      },0) + balAcc
    }
    else return balAcc
  },0)
}
