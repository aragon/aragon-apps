import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { EmptyStateCard, GU, Header, LoadingRing, Main, SyncIndicator } from '@aragon/ui'
import { useAragonApi } from './api-react'
import { IdentityProvider } from './components/LocalIdentityBadge/IdentityManager'
import { AppLogicProvider, useAppLogic } from './app-logic'
import Decisions from './Decisions'
import emptyStatePng from './assets/voting-empty-state.png'

const ASSETS_URL = './aragon-ui'

const illustration = <img src={emptyStatePng} alt="" height="160" />

const useVoteCloseWatcher = () => {
  const { votes, voteTime } = useAppLogic()
  const [ now, setNow ] = useState(new Date().getTime())

  useEffect(() => {
    const timeouts = {}

    votes.forEach(({ voteId: id, data: { startDate } }) => {
      const endTime = new Date(startDate + voteTime).getTime()

      if (endTime < now) return // ignore; voting has closed

      timeouts[id] = setTimeout(
        () => setNow(new Date().getTime()),
        endTime - now
      )
    })

    return function cleanup() {
      for (let id in timeouts) {
        clearTimeout(timeouts[id])
      }
    }
  }, [ votes, voteTime ])
}

const Empty = ({ isSyncing }) => (
  <div
    css={`
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
    `}
  >
    <EmptyStateCard
      text={
        isSyncing ? (
          <div
            css={`
              display: grid;
              align-items: center;
              justify-content: center;
              grid-template-columns: auto auto;
              grid-gap: ${1 * GU}px;
            `}
          >
            <LoadingRing />
            <span>Syncing…</span>
          </div>
        ) : (
          'After you create an allocation or issue curation, you can vote here.'
        )}
      illustration={illustration}
    />
  </div>
)

Empty.propTypes = {
  isSyncing: PropTypes.bool.isRequired,
}

const App = () => {
  useVoteCloseWatcher()

  const { api } = useAragonApi()

  const handleResolveLocalIdentity = useCallback(address => {
    return api.resolveAddressIdentity(address).toPromise()
  }, [api])

  const handleShowLocalIdentityModal = useCallback(address => {
    return api
      .requestAddressIdentityModification(address)
      .toPromise()
  }, [api])

  const { isSyncing, votes, voteTime, pctBase } = useAppLogic()

  if (!votes.length) return <Empty isSyncing={isSyncing}/>

  return (
    <IdentityProvider
      onResolve={handleResolveLocalIdentity}
      onShowLocalIdentityModal={handleShowLocalIdentityModal}>
      <Header primary="Dot Voting" />
      <Decisions />
      <SyncIndicator visible={isSyncing} />
    </IdentityProvider>
  )
}

const DotVoting = () =>
  <Main  assetsUrl={ASSETS_URL}>
    <AppLogicProvider>
      <App />
    </AppLogicProvider>
  </Main>

// eslint-disable-next-line react/display-name
export default DotVoting
