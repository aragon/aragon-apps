import React from 'react'
import {
  Button,
  GU,
  Header,
  IconPlus,
  Main,
  SyncIndicator,
  useLayout,
} from '@aragon/ui'

import NoVotes from './screens/NoVotes'
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
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'

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
          <NoVotes onClick={newVotePanel.requestOpen} isSyncing={isSyncing} />
        </div>
      )}
      {!!votes.length && (
        <React.Fragment>
          <Header
            primary="Voting"
            secondary={
              <Button
                mode="strong"
                onClick={actions.createVote}
                css={`
                  ${compactMode &&
                    `
                      min-width: 40px;
                      padding: 0;
                    `}
                `}
              >
                {compactMode ? <IconPlus /> : 'New transfer'}
              </Button>
            }
          />
          <Votes
            votes={votes}
            selectVote={selectVote}
            selectedVote={selectedVote}
          />
        </React.Fragment>
      )}

      {/*
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
      */}
    </div>
  )
}

export default () => (
  <AppLogicProvider>
    <IdentityProvider>
      <SettingsProvider>
        <Main assetsUrl="./aragon-ui">
          <App />
        </Main>
      </SettingsProvider>
    </IdentityProvider>
  </AppLogicProvider>
)
