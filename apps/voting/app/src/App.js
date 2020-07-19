import React, { useCallback } from 'react'
import {
  Button,
  Header,
  IconPlus,
  Main,
  SyncIndicator,
  useLayout,
} from '@aragon/ui'
import { useGuiStyle } from '@aragon/api-react'
import NewVotePanel from './components/NewVotePanel'
import useFilterVotes from './hooks/useFilterVotes'
import useScrollTop from './hooks/useScrollTop'
import NoVotes from './screens/NoVotes'
import VoteDetail from './screens/VoteDetail'
import Votes from './screens/Votes'
import { useAppLogic } from './app-logic'
import { IdentityProvider } from './identity-manager'
import { SettingsProvider } from './vote-settings-manager'

const App = React.memo(function App() {
  const {
    actions,
    executionTargets,
    isSyncing,
    newVotePanel,
    selectVote,
    selectedVote,
    votes,
  } = useAppLogic()

  const { appearance } = useGuiStyle()

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
  } = useFilterVotes(votes, executionTargets)

  useScrollTop(selectedVote)

  return (
    <Main theme={appearance} assetsUrl="./aragon-ui">
      <React.Fragment>
        {votes.length === 0 && (
          <div
            css={`
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <NoVotes
              onNewVote={newVotePanel.requestOpen}
              isSyncing={isSyncing}
            />
          </div>
        )}
        {votes.length > 0 && (
          <React.Fragment>
            <SyncIndicator visible={isSyncing} shift={50} />
            <Header
              primary="Voting"
              secondary={
                !selectedVote && (
                  <Button
                    mode="strong"
                    onClick={newVotePanel.requestOpen}
                    label="New vote"
                    icon={<IconPlus />}
                    display={compactMode ? 'icon' : 'label'}
                  />
                )
              }
            />
            {selectedVote ? (
              <VoteDetail
                vote={selectedVote}
                onBack={handleBack}
                onVote={actions.vote}
                onExecute={actions.execute}
              />
            ) : (
              <Votes
                votes={votes}
                selectVote={selectVote}
                executionTargets={executionTargets}
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
                handleVoteDateRangeFilterChange={
                  handleVoteDateRangeFilterChange
                }
                handleClearFilters={handleClearFilters}
              />
            )}
          </React.Fragment>
        )}
        <NewVotePanel
          onCreateVote={actions.createVote}
          panelState={newVotePanel}
        />
      </React.Fragment>
    </Main>
  )
})

export default () => (
  <IdentityProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </IdentityProvider>
)
