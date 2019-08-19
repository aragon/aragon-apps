import { useState, useEffect, useCallback } from 'react'
import { startOfDay, endOfDay, isAfter, isBefore } from 'date-fns'
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

const useFilterVotes = votes => {
  const { pctBase } = useSettings()
  const [filteredVotes, setFilteredVotes] = useState(votes)
  const [statusFilter, setStatusFilter] = useState(NULL_FILTER_STATE)
  const [trendFilter, setTrendFilter] = useState(NULL_FILTER_STATE)
  const [outcomeFilter, setOutcomeFilter] = useState(NULL_FILTER_STATE)
  // 0: All, 1: Finance, 2: Tokens, 3: Voting
  const [appFilter, setAppFilter] = useState(NULL_FILTER_STATE)
  //
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: null,
    end: null,
  })
  //
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
      const {
        data: { endDate, startDate, yea, nay },
      } = vote
      const voteStatus = getVoteStatus(vote, pctBase)
      const { start, end } = dateRangeFilter

      return (
        // status
        (statusFilter === NULL_FILTER_STATE ||
          ((statusFilter === STATUS_FILTER_OPEN &&
            voteStatus === VOTE_STATUS_ONGOING) ||
            (statusFilter === STATUS_FILTER_CLOSED &&
              voteStatus !== VOTE_STATUS_ONGOING))) &&
        // trend
        (trendFilter === NULL_FILTER_STATE ||
          ((open && (trendFilter === TREND_FILTER_WILL_PASS && yea.gt(nay))) ||
            (trendFilter === TREND_FILTER_WILL_NOT_PASS && yea.lte(nay)))) &&
        // outcome
        (outcomeFilter === NULL_FILTER_STATE ||
          ((outcomeFilter === OUTCOME_FILTER_PASSED &&
            (voteStatus === VOTE_STATUS_ACCEPTED ||
              voteStatus === VOTE_STATUS_PENDING_ENACTMENT ||
              voteStatus === VOTE_STATUS_ENACTED)) ||
            (outcomeFilter === OUTCOME_FILTER_REJECTED &&
              voteStatus === VOTE_STATUS_REJECTED) ||
            (outcomeFilter === OUTCOME_FILTER_ENACTED &&
              voteStatus === VOTE_STATUS_ENACTED) ||
            (outcomeFilter === OUTCOME_FILTER_PENDING &&
              voteStatus === VOTE_STATUS_PENDING_ENACTMENT))) &&
        // app
        // date range
        ((!start || isAfter(startDate, startOfDay(start))) &&
          (!end || isBefore(endDate, endOfDay(end))))
      )
    })
    setFilteredVotes(filtered)
  }, [
    statusFilter,
    outcomeFilter,
    trendFilter,
    appFilter,
    dateRangeFilter,
    pctBase,
    setFilteredVotes,
    votes,
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
    handleVoteAppFilterChange: useCallback(index => setAppFilter(index), [
      setAppFilter,
    ]),
    voteDateRangeFilter: dateRangeFilter,
    handleVoteDateRangeFilterChange: setDateRangeFilter,
    handleClearFilters,
  }
}

export default useFilterVotes
