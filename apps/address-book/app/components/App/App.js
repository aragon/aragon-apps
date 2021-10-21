import React, { useState } from 'react'

import { useAragonApi } from '../../api-react'
import { Button, Header, IconPlus, Main, SidePanel, SyncIndicator } from '@aragon/ui'

import { IdentityProvider } from '../LocalIdentityBadge/IdentityManager'
import { ipfsAdd } from '../../../../../shared/utils/ipfs'

import Entities from './Entities'
import NewEntity from '../Panel/NewEntity'
import { Empty } from '../Card'

const ASSETS_URL = './aragon-ui'

const App = () => {
  const [ panelVisible, setPanelVisible ] = useState(false)
  const { api, appState = {} } = useAragonApi()

  const { entries = [], isSyncing = true } = appState

  const createEntity = async ({ address, name, type }) => {
    closePanel()
    const content = { name, type }
    // add entry data to IPFS
    // TODO: show a nice progress animation here before closing the panel?
    const cId = await ipfsAdd(content)
    api.addEntry(address, cId).toPromise()
  }

  const removeEntity = address => {
    const cid = entries.find(e => e.addr === address).data.cid
    api.removeEntry(address, cid).toPromise()
  }

  // TODO: Implement FE for this
  // eslint-disable-next-line no-unused-vars
  const updateEntity = async ({ address, name, type }) => {
    closePanel()
    const content = { name, type }
    // add entry data to IPFS
    // TODO: show a nice progress animation here before closing the panel?
    const newCid = await ipfsAdd(content)
    const oldCid = entries.find(e => e.addr === address).data.cid
    api.updateEntry(address, oldCid, newCid).toPromise()
  }

  const newEntity = () => {
    setPanelVisible(true)
  }

  const closePanel = () => {
    setPanelVisible(false)
  }

  const handleResolveLocalIdentity = address =>
    api.resolveAddressIdentity(address).toPromise()

  const handleShowLocalIdentityModal = address =>
    api.requestAddressIdentityModification(address).toPromise()

  const addressList = entries.map(entry => entry.addr)

  return (
    <Main assetsUrl={ASSETS_URL}>
      <IdentityProvider
        onResolve={handleResolveLocalIdentity}
        onShowLocalIdentityModal={handleShowLocalIdentityModal}
      >
        <main>
          { entries.length === 0
            ? <Empty action={newEntity} isSyncing={isSyncing} />
            : (
              <React.Fragment>
                <Header
                  primary="Address Book"
                  secondary={
                    <Button mode="strong" icon={<IconPlus />} onClick={newEntity} label="New entity" />
                  }
                />
                <Entities
                  entities={entries}
                  onNewEntity={newEntity}
                  onRemoveEntity={removeEntity}
                />
                <SyncIndicator visible={isSyncing} />
              </React.Fragment>
            )
          }
        </main>
        <SidePanel onClose={closePanel} opened={panelVisible} title="New entity">
          <NewEntity onCreateEntity={createEntity} addressList={addressList} />
        </SidePanel>
      </IdentityProvider>
    </Main>
  )
}

export default App
