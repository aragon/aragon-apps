import React from 'react'
import { Main, SidePanel } from '@aragon/ui'

import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AutoLink from './components/AutoLink'
import AppLayout from './components/AppLayout'
import NewVoteIcon from './components/NewVoteIcon'

import { IdentityProvider } from './identity-manager'
import { SettingsProvider } from './vote-settings-manager'
import { shortenAddress, transformAddresses } from './web3-utils'
import { VotingAppProvider, useVotingApp } from './voting-app'

// Shortens every address detected in `content`.
function shortenAddresses(content) {
  return transformAddresses(content, (part, isAddress, index) =>
    isAddress ? (
      <span title={part} key={index}>
        {shortenAddress(part)}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}

// Renders the text (metadata and description) of every vote.
function renderVoteText(description) {
  return description ? (
    <AutoLink>
      {description.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {shortenAddresses(line)}
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
  } = useVotingApp({ renderVoteText })

  return (
    <div css="min-width: 320px">
      <Main assetsUrl="./aragon-ui">
        <AppLayout
          title="Voting"
          mainButton={{
            label: 'New vote',
            icon: <NewVoteIcon />,
            onClick: newVotePanel.open,
          }}
        >
          {votes.length > 0 ? (
            <Votes votes={votes} onSelectVote={selectVote} />
          ) : (
            <EmptyState onActivate={newVotePanel.open} />
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
          onClose={selectedVotePanel.close}
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
          onClose={newVotePanel.close}
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
  <VotingAppProvider>
    <IdentityProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </IdentityProvider>
  </VotingAppProvider>
)
