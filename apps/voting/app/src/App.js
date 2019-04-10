import React from 'react'
import { Main, SidePanel } from '@aragon/ui'

import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AutoLink from './components/AutoLink'
import AppLayout from './components/AppLayout'
import NewVoteIcon from './components/NewVoteIcon'
import LocalIdentityBadge from './components/LocalIdentityBadge/LocalIdentityBadge'

import { IdentityProvider } from './identity-manager'
import { SettingsProvider } from './vote-settings-manager'
import { transformAddresses } from './web3-utils'
import { AppLogicProvider, useAppLogic } from './app-logic'

// Renders the text (metadata and description) of every vote.
function renderVoteText(description) {
  return description ? (
    <AutoLink>
      {description.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {transformAddresses(line, (part, isAddress, index) =>
            // Transform detected addresses into identity badges.
            isAddress ? (
              <span title={part} key={index}>
                <LocalIdentityBadge entity={part} />
              </span>
            ) : (
              <span key={index}>{part}</span>
            )
          )}
          <br />
        </React.Fragment>
      ))}
    </AutoLink>
  ) : null
}

function App() {
  const {
    votes,
    selectedVote,
    actions,
    selectVote,
    newVotePanel,
    selectedVotePanel,
  } = useAppLogic({ renderVoteText })

  return (
    <div css="min-width: 320px">
      <Main assetsUrl="./aragon-ui">
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
            <EmptyState onActivate={newVotePanel.requestOpen} />
          )}
        </AppLayout>

        <SidePanel
          title={
            selectedVote
              ? `Vote #${selectedVote.voteId} (${
                  selectedVote.data.open ? 'Open' : 'Closed'
                })`
              : ''
          }
          opened={selectedVotePanel.visible}
          onClose={selectedVotePanel.requestClose}
          onTransitionEnd={selectedVotePanel.onTransitionEnd}
        >
          {selectedVote && (
            <VotePanelContent
              vote={selectedVote}
              onVote={actions.vote}
              onExecute={actions.execute}
              panelOpened={selectedVotePanel.didOpen}
            />
          )}
        </SidePanel>

        <SidePanel
          title="New Vote"
          opened={newVotePanel.visible}
          onClose={newVotePanel.requestClose}
          onTransitionEnd={newVotePanel.onTransitionEnd}
        >
          <NewVotePanelContent
            onCreateVote={actions.createVote}
            panelOpened={newVotePanel.didOpen}
          />
        </SidePanel>
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
