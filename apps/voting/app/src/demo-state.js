import seedRandom from 'seed-random'
import { VOTE_NAY, VOTE_YEA } from './vote-types'

const RANDOM = seedRandom('')

const TOTAL_ACCOUNTS = 10

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

export const TOKEN_SUPPLY = 1000000

export const VOTE_TIME = 2 * DAY
export const SUPPORT_REQUIRED_PCT = 0.5
export const MIN_ACCEPT_QUORUM_PCT = 0.2

export const ACCOUNTS = new Array(TOTAL_ACCOUNTS)
  .fill('3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be')
  .map(addr => ({
    address: `0x${[...addr].sort(() => RANDOM() - 0.5).join('')}`,
    balance: Math.round(RANDOM() * (TOKEN_SUPPLY / TOTAL_ACCOUNTS)),
  }))

export const USER_ACCOUNT = ACCOUNTS[0]

const getVoteStake = (voteType, voters) =>
  Object.entries(voters)
    .filter(([_, _voteType]) => _voteType === voteType)
    .reduce(
      (total, [_address]) =>
        total + ACCOUNTS.find(({ address }) => address === _address).balance,
      0
    )

export const VOTES = [
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - (1 * DAY + 10 * HOUR + 23 * MINUTE + 52 * SECOND),
    `Do you agree to share lorem ipsum?`,
    {
      [ACCOUNTS[0].address]: VOTE_YEA,
      [ACCOUNTS[1].address]: VOTE_YEA,
    },
  ],
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - (1 * HOUR + 8 * MINUTE + 28 * SECOND),
    `
    Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
    Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    {
      [ACCOUNTS[2].address]: VOTE_NAY,
      [ACCOUNTS[3].address]: VOTE_YEA,
      [ACCOUNTS[4].address]: VOTE_NAY,
      [ACCOUNTS[5].address]: VOTE_NAY,
      [ACCOUNTS[6].address]: VOTE_YEA,
    },
  ],
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - (14 * HOUR + 12 * MINUTE + 17 * SECOND),
    `
    Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
    Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    {
      [ACCOUNTS[0].address]: VOTE_YEA,
      [ACCOUNTS[2].address]: VOTE_YEA,
    },
  ],
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - 4 * DAY,
    `
    Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
    Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    {
      [ACCOUNTS[0].address]: VOTE_YEA,
      [ACCOUNTS[2].address]: VOTE_YEA,
    },
  ],
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - 5 * DAY,
    `
    Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
    Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    {
      [ACCOUNTS[0].address]: VOTE_YEA,
      [ACCOUNTS[1].address]: VOTE_YEA,
      [ACCOUNTS[2].address]: VOTE_YEA,
      [ACCOUNTS[3].address]: VOTE_YEA,
      [ACCOUNTS[4].address]: VOTE_YEA,
      [ACCOUNTS[5].address]: VOTE_YEA,
      [ACCOUNTS[6].address]: VOTE_YEA,
      [ACCOUNTS[7].address]: VOTE_YEA,
      [ACCOUNTS[8].address]: VOTE_YEA,
      [ACCOUNTS[9].address]: VOTE_NAY,
    },
  ],
  [
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    Date.now() - 6 * DAY,
    `
    Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
    Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    {},
  ],
].map(([creatorName, creatorAddress, startDate, question, voters]) => ({
  id: Math.round(RANDOM() * 10000).toString(16),
  vote: {
    creator: creatorAddress,
    startDate,
    snapshotBlock: -1,
    minAcceptQuorumPct: MIN_ACCEPT_QUORUM_PCT,
    yea: getVoteStake(VOTE_YEA, voters),
    nay: getVoteStake(VOTE_NAY, voters),
    metadata: '',
    executionScript: null,
    executed: false,
    voters,
  },
  metas: { question },
  creatorName,
  endDate: new Date(startDate + VOTE_TIME),
  voteTime: VOTE_TIME,
  tokenSupply: TOKEN_SUPPLY,
  supportRequired: SUPPORT_REQUIRED_PCT,
  quorumRequired: MIN_ACCEPT_QUORUM_PCT,
}))
