import React from 'react'
import { SyncIndicator, Main } from '@aragon/ui'

import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanel from './components/VotePanel'
import NewVotePanel from './components/NewVotePanel'
import AppLayout from './components/AppLayout'
import NewVoteIcon from './components/NewVoteIcon'

import { IdentityProvider } from './identity-manager'
import { SettingsProvider } from './vote-settings-manager'
import { AppLogicProvider, useAppLogic } from './app-logic'

function App() {
  const {
    isSyncing,
    votes,
    selectedVote,
    actions,
    selectVote,
    newVotePanel,
    selectedVotePanel,
  } = useAppLogic()

  return (
    <div css="min-width: 320px">
      <Main assetsUrl="./aragon-ui">
        <SyncIndicator visible={isSyncing} />
        <AppLayout
          title="Voting"
          mainButton={{
            label: 'New vote',
            icon: <NewVoteIcon />,
            onClick: newVotePanel.requestOpen,
          }}
        >
          {votes.length > 0 ? (
            <Votes votes={votes} onSelectVote={selectVote} />
          ) : (
            !isSyncing && <EmptyState onActivate={newVotePanel.requestOpen} />
          )}
        </AppLayout>

        <VotePanel
          vote={selectedVote}
          onExecute={actions.execute}
          onVote={actions.vote}
          panelState={selectedVotePanel}
        />

        <NewVotePanel
          onCreateVote={actions.createVote}
          panelState={newVotePanel}
        />
      </Main>
    </div>
  )
}

export default () => (
  <AppLogicProvider>
    <IdentityProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </IdentityProvider>
  </AppLogicProvider>
)
