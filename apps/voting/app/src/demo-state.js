import { VOTE_UNKNOWN, VOTE_NO, VOTE_YES } from './vote-types'

const createVote = (
  id,
  creatorName,
  creatorAddress,
  endDate,
  quorum,
  question,
  votesYes,
  votesNo,
  pending,
  userVote
) => ({
  id,
  creatorName,
  creatorAddress,
  endDate,
  quorum,
  question,
  votesYes,
  votesNo,
  pending,
  userVote,
})

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

export const tokensCount = 10000000

export const votes = [
  createVote(
    'abc',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date(Date.now() + 1 * DAY + 10 * HOUR + 23 * MINUTE + 52 * SECOND),
    0.15,
    `Do you agree to share lorem ipsum?`,
    3920122,
    382010,
    19102,
    VOTE_YES
  ),
  createVote(
    'def',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date(Date.now() + 1 * HOUR + 8 * MINUTE + 28 * SECOND),
    0.3,
    `
     Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
     Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    492010,
    92010,
    1002,
    VOTE_UNKNOWN
  ),
  createVote(
    'aaa',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date(Date.now() + 4 * HOUR + 12 * MINUTE + 17 * SECOND),
    0.4,
    `
     Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
     Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    8473920,
    473920,
    0,
    VOTE_YES
  ),
  createVote(
    'ghi',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date() - 10,
    0.4,
    `
     Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
     Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    8473920,
    473920,
    0,
    VOTE_YES
  ),
  createVote(
    'jkl',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date() - 20,
    0.2,
    `
     Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
     Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    239920,
    2229920,
    0,
    VOTE_NO
  ),
  createVote(
    'mno',
    'Blue Wildflower',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    new Date() - 30,
    0.3,
    `
     Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec.
     Sed sollicitudin ipsum quis nunc sollicitudin ultrices?
    `,
    0,
    0,
    0,
    VOTE_YES
  ),
]
