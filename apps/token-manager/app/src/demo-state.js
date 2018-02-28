import seedRandom from 'seed-random'

const GROUP_MODE = false
const TOTAL_ACCOUNTS = 7
const TOKEN_SYMBOL = 'FOO'
const TOKEN_SUPPLY = GROUP_MODE ? TOTAL_ACCOUNTS : 1000000

const random = seedRandom('')
let supplyLeft = TOKEN_SUPPLY

const HOLDERS = new Array(TOTAL_ACCOUNTS)
  .fill('3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be')
  .map((addr, i) => {
    const base = supplyLeft / (TOTAL_ACCOUNTS - i)
    const balance = Math.floor(base * 0.1 + base * 0.9 * random())
    supplyLeft -= balance
    return {
      address: `0x${[...addr].sort(() => random() - 0.5).join('')}`,
      balance: GROUP_MODE ? 1 : balance,
    }
  })

export { HOLDERS, TOKEN_SYMBOL, TOKEN_SUPPLY }
