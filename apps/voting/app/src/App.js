import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AragonApi, useAragonApi } from '@aragon/api-react'
import { Main, SidePanel } from '@aragon/ui'

import { VOTE_YEA } from './vote-types'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import tokenAbi from './abi/token-balanceOfAt.json'

import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AutoLink from './components/AutoLink'
import AppLayout from './components/AppLayout'
import NewVoteIcon from './components/NewVoteIcon'

import { NetworkContext, SettingsContext } from './app-contexts'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import { isVoteOpen, voteTypeFromContractEnum } from './vote-utils'
import { shortenAddress, transformAddresses } from './web3-utils'
import { useCurrentVoteData } from './vote-hooks'
import { useNow } from './utils-hooks'
import appStateReducer from './app-state-reducer'

function shortenAddresses(label) {
  return transformAddresses(label, (part, isAddress, index) =>
    isAddress ? (
      <span title={part} key={index}>
        {shortenAddress(part)}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}

function VoteText({ description }) {
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
    api,
    network,
    appState,
    requestMenu,
    displayMenuButton,
  } = useAragonApi()

  const [createVoteVisible, setCreateVoteVisible] = useState(false)
  const [currentVoteId, setCurrentVoteId] = useState(-1)
  const [tokenContract, setTokenContract] = useState(null)
  const [voteVisible, setVoteVisible] = useState(false)
  const [voteSidebarOpened, setVoteSidebarOpened] = useState(false)
  const [userAccountVotes, setUserAccountVotes] = useState(new Map())
  const now = useNow()

  const {
    appStateReady,
    pctBase,
    tokenDecimals,
    tokenSymbol,
    userAccount,
    voteTime,
  } = appState

  // Add some useful data to render the votes
  const votes = useMemo(
    () =>
      appStateReady
        ? appState.votes.map(vote => ({
            ...vote,
            data: {
              ...vote.data,
              open: isVoteOpen(vote, now),

              // Render text fields
              descriptionNode: <VoteText description={vote.data.description} />,
              metadataNode: <VoteText description={vote.data.metadata} />,
            },
            userAccountVote: voteTypeFromContractEnum(
              userAccountVotes.get(vote.voteId)
            ),
          }))
        : appState.votes,
    [appStateReady, appState.votes, userAccountVotes]
  )

  const currentVote =
    currentVoteId === -1
      ? null
      : votes.find(vote => vote.voteId === currentVoteId)

  // const { canUserVote, canExecute, userBalance } = useCurrentVoteData(
  //   currentVote,
  //   userAccount,
  //   api,
  //   tokenContract,
  //   tokenDecimals
  // )

  // update token contract
  useEffect(() => {
    setTokenContract(
      api && appState.tokenAddress
        ? api.external(appState.tokenAddress, tokenAbi)
        : null
    )
  }, [api, appState.tokenAddress])

  // update user account votes
  useEffect(() => {
    if (!userAccount) {
      setUserAccountVotes(new Map())
      return
    }

    let cancelled = false
    Promise.all(
      votes.map(vote =>
        api
          .call('getVoterState', vote.voteId, userAccount)
          .toPromise()
          .then(result => [vote.voteId, result])
      )
    ).then(voteStates => {
      if (!cancelled) {
        setUserAccountVotes(new Map(voteStates))
      }
    })

    return () => {
      cancelled = true
    }
  }, [api, votes && votes.map(vote => vote.voteId).join(), userAccount])

  // create vote panel
  const handleCreateVoteOpen = useCallback(() => {
    setCreateVoteVisible(true)
  }, [])
  const handleCreateVoteClose = useCallback(() => {
    setCreateVoteVisible(false)
  }, [])
  const handleCreateVote = useCallback(
    question => {
      api.newVote(EMPTY_CALLSCRIPT, question)
      handleCreateVoteClose()
    },
    [api]
  )

  // single vote panel
  const handleVoteOpen = useCallback(
    voteId => {
      const exists = votes.some(vote => voteId === vote.voteId)
      if (exists) {
        setCurrentVoteId(voteId)
        setVoteVisible(true)
        setVoteSidebarOpened(false)
      }
    },
    [votes]
  )

  const handleVoteClose = useCallback(() => {
    setVoteVisible(false)
  }, [])

  const handleVoteTransitionEnd = useCallback(opened => {
    if (opened) {
      setVoteSidebarOpened(true)
    } else {
      setCurrentVoteId(-1)
    }
  }, [])

  // vote (action)
  const handleVote = useCallback(
    (voteId, voteType, executesIfDecided = true) => {
      api.vote(voteId, voteType === VOTE_YEA, executesIfDecided)
      handleVoteClose()
    },
    [api]
  )

  // execute (action)
  const handleExecute = useCallback(
    voteId => {
      api.executeVote(voteId)
      handleVoteClose()
    },
    [api]
  )

  // Local identity
  const resolveLocalIdentity = useCallback(
    address => api.resolveAddressIdentity(address).toPromise(),
    [api]
  )
  const showLocalIdentityModal = useCallback(
    address => api.requestAddressIdentityModification(address).toPromise(),
    [api]
  )

  const hasCurrentVote = appStateReady && Boolean(currentVote)

  return (
    <div css="min-width: 320px">
      <Main assetsUrl="./aragon-ui">
        <IdentityProvider
          onResolve={resolveLocalIdentity}
          onShowLocalIdentityModal={showLocalIdentityModal}
        >
          <NetworkContext.Provider value={network}>
            <SettingsContext.Provider value={{ pctBase, voteTime }}>
              <AppLayout
                title="Voting"
                onMenuOpen={requestMenu}
                mainButton={{
                  label: 'New vote',
                  icon: <NewVoteIcon />,
                  onClick: handleCreateVoteOpen,
                }}
              >
                {appStateReady && votes.length > 0 ? (
                  <Votes votes={votes} onSelectVote={handleVoteOpen} />
                ) : (
                  <EmptyState onActivate={handleCreateVoteOpen} />
                )}
              </AppLayout>

              <SidePanel
                title={`Vote #${currentVoteId} (${
                  currentVote && currentVote.data.open ? 'Open' : 'Closed'
                })`}
                opened={hasCurrentVote && !createVoteVisible && voteVisible}
                onClose={handleVoteClose}
                onTransitionEnd={handleVoteTransitionEnd}
              >
                {hasCurrentVote && (
                  <VotePanelContent
                    api={api}
                    vote={currentVote}
                    user={userAccount}
                    ready={voteSidebarOpened}
                    tokenContract={tokenContract}
                    tokenDecimals={tokenDecimals}
                    tokenSymbol={tokenSymbol}
                    onVote={handleVote}
                    onExecute={handleExecute}
                  />
                )}
              </SidePanel>

              <SidePanel
                title="New Vote"
                opened={createVoteVisible}
                onClose={handleCreateVoteClose}
              >
                <NewVotePanelContent
                  opened={createVoteVisible}
                  onCreateVote={handleCreateVote}
                />
              </SidePanel>
            </SettingsContext.Provider>
          </NetworkContext.Provider>
        </IdentityProvider>
      </Main>
    </div>
  )
}

export default () => (
  <AragonApi reducer={appStateReducer}>
    <App />
  </AragonApi>
)
