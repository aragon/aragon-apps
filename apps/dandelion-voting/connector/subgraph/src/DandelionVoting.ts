import { Address, BigInt } from '@graphprotocol/graph-ts'
import {
  StartVote as StartVoteEvent,
  CastVote as CastVoteEvent,
  ExecuteVote as ExecuteVoteEvent,
  DandelionVoting as DandelionVotingContract
} from '../generated/templates/DandelionVoting/DandelionVoting'
import {
  Vote as VoteEntity,
  Cast as CastEntity
} from '../generated/schema'

export function handleStartVote(event: StartVoteEvent): void {
  let vote = _getVoteEntity(event.address, event.params.voteId)

  _populateVoteDataFromEvent(vote, event)
  _populateVoteDataFromContract(vote, event.address, vote.voteNum)

  vote.save()
}

export function handleCastVote(event: CastVoteEvent): void {
  let vote = _getVoteEntity(event.address, event.params.voteId)

  let numCasts = vote.casts.length

  let castId = _getCastEntityId(vote, numCasts)
  let cast = new CastEntity(castId)

  _populateCastDataFromEvent(cast, event)
  cast.voteNum = vote.voteNum
  cast.voteId = vote.id

  let casts = vote.casts
  casts.push(castId)
  vote.casts = casts

  if (event.params.supports == true) {
    vote.yea = vote.yea.plus(event.params.stake)
  } else {
    vote.nay = vote.nay.plus(event.params.stake)
  }

  vote.save()
  cast.save()
}

export function handleExecuteVote(event: ExecuteVoteEvent): void {
  let vote = _getVoteEntity(event.address, event.params.voteId)

  vote.executed = true

  vote.save()
}

function _getVoteEntity(appAddress: Address, voteNum: BigInt): VoteEntity {
  let voteEntityId = _getVoteEntityId(appAddress, voteNum)

  let vote = VoteEntity.load(voteEntityId)
  if (!vote) {
    vote = new VoteEntity(voteEntityId)

    vote.voteNum = voteNum
    vote.executed = false
    vote.casts = []
  }

  return vote!
}

function _getCastEntityId(vote: VoteEntity, numCast: number): string {
  return vote.id + '-castNum:' + numCast.toString()
}

function _getVoteEntityId(appAddress: Address, voteNum: BigInt): string {
  return 'appAddress:' + appAddress.toHexString() + '-voteId:' + voteNum.toHexString()
}

function _populateVoteDataFromContract(vote: VoteEntity, appAddress: Address, voteNum: BigInt): void {
  let dandelionVoting = DandelionVotingContract.bind(appAddress)

  let voteData = dandelionVoting.getVote(voteNum)

  vote.executed = voteData.value1
  vote.startBlock = voteData.value2
  vote.executionBlock = voteData.value3
  vote.snapshotBlock = voteData.value4
  vote.votingPower = voteData.value5
  vote.supportRequiredPct = voteData.value6
  vote.minAcceptQuorum = voteData.value7
  vote.yea = voteData.value8
  vote.nay = voteData.value9
  vote.script = voteData.value10
  vote.orgAddress = dandelionVoting.kernel()
  vote.appAddress = appAddress
}

function _populateVoteDataFromEvent(vote: VoteEntity, event: StartVoteEvent): void {
  vote.creator = event.params.creator
  vote.metadata = event.params.metadata
}

function _populateCastDataFromEvent(cast: CastEntity, event: CastVoteEvent): void {
  cast.voter = event.params.voter
  cast.supports = event.params.supports
  cast.voterStake = event.params.stake
}
