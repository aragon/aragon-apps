import { useState, useEffect, useCallback } from 'react'
import { startOfDay, endOfDay, isAfter, isBefore } from 'date-fns'
import { useCurrentApp } from '@aragon/api-react'
import { useSettings } from '../vote-settings-manager'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_PENDING_ENACTMENT,
  VOTE_STATUS_ENACTED,
} from '../vote-types'
import { getVoteStatus } from '../vote-utils'

const NULL_FILTER_STATE = -1
const STATUS_FILTER_OPEN = 1
const STATUS_FILTER_CLOSED = 2
const TREND_FILTER_WILL_PASS = 1
const TREND_FILTER_WILL_NOT_PASS = 2
const OUTCOME_FILTER_PASSED = 1
const OUTCOME_FILTER_REJECTED = 2
const OUTCOME_FILTER_ENACTED = 3
const OUTCOME_FILTER_PENDING = 4
const APP_FILTER_THIS = 1

function testStatusFilter(filter, voteStatus) {
  return (
    filter === NULL_FILTER_STATE ||
    (filter === STATUS_FILTER_OPEN && voteStatus === VOTE_STATUS_ONGOING) ||
    (filter === STATUS_FILTER_CLOSED && voteStatus !== VOTE_STATUS_ONGOING)
  )
}

function testTrendFilter(filter, vote) {
  const { open, yea, nay } = vote.data
  return (
    filter === NULL_FILTER_STATE ||
    (open &&
      ((filter === TREND_FILTER_WILL_PASS && yea.gt(nay)) ||
        (filter === TREND_FILTER_WILL_NOT_PASS && yea.lte(nay))))
  )
}

function testOutcomeFilter(filter, voteStatus) {
  return (
    filter === NULL_FILTER_STATE ||
    (filter === OUTCOME_FILTER_PASSED &&
      (voteStatus === VOTE_STATUS_ACCEPTED ||
        voteStatus === VOTE_STATUS_PENDING_ENACTMENT ||
        voteStatus === VOTE_STATUS_ENACTED)) ||
    (filter === OUTCOME_FILTER_REJECTED &&
      voteStatus === VOTE_STATUS_REJECTED) ||
    (filter === OUTCOME_FILTER_ENACTED && voteStatus === VOTE_STATUS_ENACTED) ||
    (filter === OUTCOME_FILTER_PENDING &&
      voteStatus === VOTE_STATUS_PENDING_ENACTMENT)
  )
}

function testAppFilter(filter, vote, { apps, thisAddress }) {
  const { executionTargets } = vote.data

  if (filter === NULL_FILTER_STATE) {
    return true
  }
  if (filter === APP_FILTER_THIS) {
    return (
      executionTargets.length === 0 || executionTargets.includes(thisAddress)
    )
  }

  // Filter order is all, this, ...apps, external so we sub 2 to adjust the index to the apps
  filter -= 2
  if (filter === apps.length) {
    // Only return true if there's a difference between the set of execution targets and apps
    const appsSet = new Set(apps.map(({ appAddress }) => appAddress))
    return executionTargets.filter(target => !appsSet.has(target)).length
  }

  return executionTargets.includes(apps[filter].appAddress)
}

function testDateRangeFilter(filter, vote) {
  const { start, end } = filter
  const { endDate, startDate } = vote.data
  return (
    !start ||
    !end ||
    (isAfter(startDate, startOfDay(start)) && isBefore(endDate, endOfDay(end)))
  )
}

const useFilterVotes = (votes, executionTargets) => {
  const { appAddress } = useCurrentApp() || {}
  const { pctBase } = useSettings()

  const [filteredVotes, setFilteredVotes] = useState(votes)
  const [statusFilter, setStatusFilter] = useState(NULL_FILTER_STATE)
  const [trendFilter, setTrendFilter] = useState(NULL_FILTER_STATE)
  const [outcomeFilter, setOutcomeFilter] = useState(NULL_FILTER_STATE)
  // 0: All, 1: Voting (this), 2+: Execution targets, last: External
  const [appFilter, setAppFilter] = useState(NULL_FILTER_STATE)
  // Date range
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: null,
    end: null,
  })

  const handleClearFilters = useCallback(() => {
    setStatusFilter(NULL_FILTER_STATE)
    setTrendFilter(NULL_FILTER_STATE)
    setOutcomeFilter(NULL_FILTER_STATE)
    setAppFilter(NULL_FILTER_STATE)
    setDateRangeFilter({ start: null, end: null })
  }, [
    setStatusFilter,
    setTrendFilter,
    setOutcomeFilter,
    setAppFilter,
    setDateRangeFilter,
  ])

  useEffect(() => {
    const filtered = votes.filter(vote => {
      const voteStatus = getVoteStatus(vote, pctBase)

      return (
        testStatusFilter(statusFilter, voteStatus) &&
        testTrendFilter(trendFilter, vote) &&
        testOutcomeFilter(outcomeFilter, voteStatus) &&
        testAppFilter(appFilter, vote, {
          apps: executionTargets,
          thisAddress: appAddress,
        }) &&
        testDateRangeFilter(dateRangeFilter, vote)
      )
    })
    setFilteredVotes(filtered)
  }, [
    statusFilter,
    outcomeFilter,
    trendFilter,
    appFilter,
    dateRangeFilter,
    appAddress,
    pctBase,
    setFilteredVotes,
    votes,
    executionTargets,
  ])

  return {
    filteredVotes,
    voteStatusFilter: statusFilter,
    handleVoteStatusFilterChange: useCallback(
      index => {
        setStatusFilter(index || NULL_FILTER_STATE)
        setTrendFilter(NULL_FILTER_STATE)
      },
      [setStatusFilter, setTrendFilter]
    ),
    voteOutcomeFilter: outcomeFilter,
    handleVoteOutcomeFilterChange: useCallback(
      index => setOutcomeFilter(index || NULL_FILTER_STATE),
      [setOutcomeFilter]
    ),
    voteTrendFilter: trendFilter,
    handleVoteTrendFilterChange: useCallback(
      index => setTrendFilter(index || NULL_FILTER_STATE),
      [setTrendFilter]
    ),
    voteAppFilter: appFilter,
    handleVoteAppFilterChange: useCallback(
      index => setAppFilter(index || NULL_FILTER_STATE),
      [setAppFilter]
    ),
    voteDateRangeFilter: dateRangeFilter,
    handleVoteDateRangeFilterChange: setDateRangeFilter,
    handleClearFilters,
  }
}

export default useFilterVotes
