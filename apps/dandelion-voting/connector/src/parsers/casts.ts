import { QueryResult } from '@aragon/connect-thegraph'
import Cast, { CastData } from '../entities/Cast'

export function parseCasts(
  result: QueryResult,
  connector: any
): Cast[] {
  const casts = result.data.casts

  if (!casts) {
    throw new Error('Unable to parse casts.')
  }

  const datas = casts.map(
    (cast: any): CastData => {
      return {
        id: cast.id,
        voteId: cast.voteId,
        voteNum: cast.voteNum,
        voter: cast.voter,
        supports: cast.supports,
        voterStake: cast.voterStake
      }
    }
  )

  return datas.map((data: CastData) => {
    return new Cast(data, connector)
  })
}
