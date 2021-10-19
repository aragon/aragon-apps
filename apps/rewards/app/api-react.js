import buildStubbedApiReact from '../../../shared/api-react'
import {
  ONE_TIME_DIVIDEND,
  RECURRING_DIVIDEND,
  ONE_TIME_MERIT,
  MONTHS,
} from './utils/constants'

const initialState = process.env.NODE_ENV !== 'production' && {
  displayMenuButton: true,
  refTokens: [
    {
      address: '0x08C31473A219F22922F47f001611d8bac62fBB6d',
      name: 'Ether',
      symbol: 'ETH',
      verified: true,
      startBlock: true,
    },
    {
      address: '0x08C31473A219F22922F47f001611d8bac62fBB6d',
      name: 'Dai',
      symbol: 'DAI',
      verified: true,
      startBlock: true,
    },
  ],
  amountTokens: [
    {
      symbol: 'ETH',
      balance: '3.14',
    },
    {
      symbol: 'BNB',
      balance: '12.63',
    },
    {
      symbol: 'LEO',
      balance: '4986.35',
    },
    {
      symbol: 'HT',
      balance: '0.32',
    },
    {
      symbol: 'LINK',
      balance: '10',
    },
  ],
  rewards: [
    {
      rewardId: 1,
      description: 'one time dividend',
      referenceAsset: 'BAT',
      rewardType: ONE_TIME_DIVIDEND,
      amount: 3.45,
      amountToken: 'DAI',
      dateReference: new Date(),
    },
    {
      rewardId: 2,
      description: 'recurring dividend',
      referenceAsset: 'SNT',
      rewardType: RECURRING_DIVIDEND,
      amount: 10,
      amountToken: 'DAI',
      disbursement: 2,
      disbursementUnit: MONTHS,
      disbursements: [
        new Date('2019-12-02'),
        new Date('2020-01-02'),
        new Date('2020-02-02')
      ],
    },
    {
      rewardId: 3,
      description: 'one-time merit',
      referenceAsset: 'BNB',
      rewardType: ONE_TIME_MERIT,
      amount: 100,
      amountToken: 'DAI',
      startDate: new Date(),
      endDate: new Date(),
    },
  ],
  myRewards: [
    {
      rewardId: 4,
      description: 'my one time dividend',
      referenceAsset: 'BAT',
      rewardType: ONE_TIME_DIVIDEND,
      amount: 3.45,
      amountToken: 'DAI',
      dateReference: new Date(),
    },
    {
      rewardId: 5,
      description: 'my recurring dividend',
      referenceAsset: 'SNT',
      rewardType: RECURRING_DIVIDEND,
      amount: 10,
      amountToken: 'DAI',
      disbursement: 2,
      disbursementUnit: MONTHS,
      disbursements: [
        new Date('2019-12-02'),
        new Date('2020-01-02'),
        new Date('2020-02-02')
      ],
    },
    {
      rewardId: 6,
      description: 'my one-time merit',
      referenceAsset: 'BNB',
      rewardType: ONE_TIME_MERIT,
      amount: 100,
      amountToken: 'DAI',
      dateStart: new Date(),
      dateEnd: new Date(),
    },
  ],
  metrics: [
    {
      name: 'Average reward',
      value: '8.33',
      unit: 'ETH',
    },
    {
      name: 'Monthly average',
      value: '12.50',
      unit: 'ETH',
    },
    {
      name: 'Annual total',
      value: '25.00',
      unit: 'ETH',
    },
  ],
  myMetrics: [
    {
      name: 'Unclaimed rewards',
      value: '+10.00',
      unit: 'ETH',
    },
    {
      name: 'Rewards obtained this year',
      value: '25.00',
      unit: 'ETH',
    },
    {
      name: 'All time rewards obtained',
      value: '25.00',
      unit: 'ETH',
    },
  ],
  balances: [
    {
      verified: true,
      symbol: 'ETH',
      amount: 10
    },
  ],
  claims: {
    claimsByToken: [],
    totalClaimsMade: [],
  },
}

const functions = process.env.NODE_ENV !== 'production' && (() => ({
}))

const { AragonApi, useAragonApi } = buildStubbedApiReact({ initialState, functions })

export { AragonApi,  useAragonApi }
