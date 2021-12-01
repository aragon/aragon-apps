import { first, map } from 'rxjs/operators'
import { app } from './'
import { blocksToMilliseconds } from '../../../../shared/ui/utils'
import { addressesEqual } from '../../../../shared/lib/web3-utils'
import { updateBalancesAndRefTokens } from './token'


const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

export async function onRewardAdded({ rewards = [], refTokens = [], balances = [] }, { rewardId }, settings) {
  if (!rewards[rewardId]) {
    rewards[rewardId] = await getRewardById(rewardId)
    const { referenceToken } = rewards[rewardId]
    const response = await updateBalancesAndRefTokens({ balances, refTokens }, referenceToken, settings)
    return { rewards, refTokens: response.refTokens }
  }

  return { rewards, refTokens }
}

export async function onRewardClaimed(
  { rewards = [], claims = {} },
  { rewardId, claimant }
) {
  rewards[rewardId] = await getRewardById(rewardId, claimant)

  let { claimsByToken = [], totalClaimsMade = 0 } = claims

  const tokenIndex = claimsByToken.findIndex(token => addressesEqual(token.address, rewards[rewardId].rewardToken))

  if (tokenIndex === -1) {
    claimsByToken.push({
      address: rewards[rewardId].rewardToken,
      amount: await getTotalClaimed(rewards[rewardId].rewardToken)
    })
  }
  else {
    claimsByToken[tokenIndex].amount = await getTotalClaimed(rewards[rewardId].rewardToken)
  }

  totalClaimsMade = await getTotalClaims()

  return { rewards, claims: { claimsByToken, totalClaimsMade } }

}

export async function onRefreshRewards(nextState, { userAddress }) {
  const rewardsLength = Number(await getRewardsLength())
  const rewards = await Promise.all(
    [...Array(rewardsLength).keys()].map(async rewardId => await getRewardById(rewardId, userAddress))
  )
  return { ...nextState, rewards }
}

export async function updateConvertedRates({ balances = [] }) {
  const verifiedSymbols = balances
    .filter(({ verified }) => verified)
    .map(({ symbol }) => symbol)

  if (!verifiedSymbols.length) {
    return
  }

  const res = await fetch(convertApiUrl(verifiedSymbols))
  const convertRates = await res.json()
  return convertRates
}

/////////////////////////////////////////
/*      rewards helper functions       */
/////////////////////////////////////////

const getRewardById = async (rewardId, userAddress) => {
  const currentBlock = await app.web3Eth('getBlockNumber').toPromise()

  return await app.call('getReward', rewardId, { from: userAddress })
    .pipe(
      first(),
      map(data => ({
        rewardId,
        description: data.description,
        isMerit: data.isMerit,
        referenceToken: data.referenceToken,
        rewardToken: data.rewardToken,
        amount: data.amount,
        startBlock: data.startBlock,
        endBlock: data.endBlock,
        duration: data.duration,
        delay: data.delay,
        startDate: Date.now() + blocksToMilliseconds(currentBlock, data.startBlock),
        endDate: Date.now() + blocksToMilliseconds(currentBlock, data.endBlock),
        userRewardAmount: data.rewardAmount,
        claimed: data.claimed,
        timeClaimed: data.timeClaimed,
        occurances: data.occurances,
      }))
    )
    .toPromise()
}

const getTotalClaimed = async tokenAddress => {
  return await app.call('getTotalAmountClaimed', tokenAddress)
    .pipe(
      first(),
    ).toPromise()
}

const getTotalClaims = async () => {
  return await app.call('totalClaimsEach')
    .pipe(
      first(),
    ).toPromise()
}

const getRewardsLength = async () => {
  return await app.call('getRewardsLength')
    .pipe(
      first(),
    ).toPromise()
}
