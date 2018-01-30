import seedRandom from 'seed-random'
import { subSeconds, subDays } from 'date-fns'
import { randomInt, randomEntry } from './lib/utils'

const TODAY = new Date()
const RANDOM = seedRandom('seed 12345')

const CURRENCIES = ['ANT', 'ETH']

const HASH_BASE = '0998B61aE8eD80f9370B579ee8085e4e05ff7451'

const ARAGON_IDS = [
  'mark',
  'stephan',
  'john',
  'adrian',
  'billie',
  'clara',
  'jane',
  'michele',
]

const REFS_IN = [
  'Invoice IN23987',
  'Invoice IN32322',
  'Invoice IN19733',
  'Invoice IN23898',
]

const REFS_OUT = [
  'Payment to service providers',
  'Payment for PR services',
  'Buy hardware',
  'Payroll',
]

const transfer = (date, ref, amount, currency, approvedBy, transaction) => ({
  date,
  ref,
  amount,
  currency,
  approvedBy,
  transaction,
})

const createApprovedBy = () =>
  randomInt(0, 2, RANDOM)
    ? randomHash()
    : `${randomEntry(ARAGON_IDS, RANDOM)}.aragonid.eth`

const randomHash = () =>
  `0x${[...HASH_BASE].sort(() => RANDOM() - 0.5).join('')}`

export const transfers = [...new Array(43)]
  .map((_, i) => {
    const amount =
      (randomInt(1, 15000, RANDOM) +
        (randomInt(0, 2, RANDOM) ? 0 : randomInt(0, 1000, RANDOM) / 1000)) *
      (randomInt(0, 2, RANDOM) || -1)
    const refs = amount > 0 ? REFS_IN : REFS_OUT
    return transfer(
      subSeconds(subDays(TODAY, randomInt(0, 30, RANDOM)), i),
      randomEntry(refs, RANDOM),
      amount,
      randomEntry(CURRENCIES, RANDOM),
      createApprovedBy(),
      randomHash()
    )
  })
  .sort((transferA, transferB) => transferB.date - transferA.date)
