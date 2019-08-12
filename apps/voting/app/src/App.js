import React, { useCallback } from 'react'
import {
  Button,
  Header,
  IconPlus,
  Main,
  SyncIndicator,
  GU,
  useLayout,
} from '@aragon/ui'
import NewVotePanel from './components/NewVotePanel'
import NoVotes from './screens/NoVotes'
import VoteDetail from './screens/VoteDetail'
import Votes from './screens/Votes'
import { AppLogicProvider, useAppLogic } from './app-logic'
import { IdentityProvider } from './identity-manager'
import { SettingsProvider } from './vote-settings-manager'
import useFilterVotes from './useFilterVotes'
import useScrollTop from './useScrollTop'

const App = React.memo(function App() {
  const {
    actions,
    isSyncing,
    newVotePanel,
    selectedVote,
    selectVote,
    votes,
  } = useAppLogic()
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const handleBack = useCallback(() => selectVote(-1), [selectVote])
  const {
    filteredVotes,
    voteStatusFilter,
    handleVoteStatusFilterChange,
    voteOutcomeFilter,
    handleVoteOutcomeFilterChange,
    voteTrendFilter,
    handleVoteTrendFilterChange,
    voteAppFilter,
    handleVoteAppFilterChange,
    voteDateRangeFilter,
    handleVoteDateRangeFilterChange,
    handleClearFilters,
  } = useFilterVotes(votes)

  useScrollTop(selectedVote)

  return (
    <div css="min-width: 320px">
      <SyncIndicator visible={isSyncing} />
      {!votes.length && (
        <div
          css={`
            height: calc(100vh - ${8 * GU}px);
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <NoVotes onNewVote={newVotePanel.requestOpen} isSyncing={isSyncing} />
        </div>
      )}
      {!!votes.length && (
        <React.Fragment>
          <Header
            primary="Voting"
            secondary={
              !selectedVote && (
                <Button
                  mode="strong"
                  onClick={newVotePanel.requestOpen}
                  css={`
                    ${compactMode &&
                      `
                        min-width: 40px;
                        padding: 0;
                      `}
                  `}
                >
                  {compactMode ? <IconPlus /> : 'New vote'}
                </Button>
              )
            }
          />
          {selectedVote ? (
            <VoteDetail
              selectVote={selectVote}
              vote={selectedVote}
              onBack={handleBack}
              onVote={actions.vote}
              onExecute={actions.execute}
            />
          ) : (
            <Votes
              votes={votes}
              selectVote={selectVote}
              filteredVotes={filteredVotes}
              voteStatusFilter={voteStatusFilter}
              handleVoteStatusFilterChange={handleVoteStatusFilterChange}
              voteOutcomeFilter={voteOutcomeFilter}
              handleVoteOutcomeFilterChange={handleVoteOutcomeFilterChange}
              voteTrendFilter={voteTrendFilter}
              handleVoteTrendFilterChange={handleVoteTrendFilterChange}
              voteAppFilter={voteAppFilter}
              handleVoteAppFilterChange={handleVoteAppFilterChange}
              voteDateRangeFilter={voteDateRangeFilter}
              handleVoteDateRangeFilterChange={handleVoteDateRangeFilterChange}
              handleClearFilters={handleClearFilters}
            />
          )}
        </React.Fragment>
      )}
      <NewVotePanel
        onCreateVote={actions.createVote}
        panelState={newVotePanel}
      />
    </div>
  )
})

export default function Voting() {
  return (
    <Main assetsUrl="./aragon-ui">
      <AppLogicProvider>
        <IdentityProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </IdentityProvider>
      </AppLogicProvider>
    </Main>
  )
}
