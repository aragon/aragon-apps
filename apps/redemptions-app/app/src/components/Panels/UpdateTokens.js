import React, { useCallback, useEffect, useState } from 'react'
import { SidePanel, Tabs, GU } from '@aragon/ui'
import styled from 'styled-components'

import AddToken from './AddToken'
import RemoveToken from './RemoveToken'

const MODES = ['add', 'remove']

const initialState = {
  tabIndex: 0,
  value: MODES[0],
}

const UpdateTokens = React.memo(({ tokens, onUpdateTokens, panelVisible, panelOpened }) => {
  const [mode, setMode] = useMode(panelOpened)

  const handleAction = useCallback(
    address => {
      onUpdateTokens(mode.value, address)
    },
    [mode, onUpdateTokens]
  )

  return (
    <div>
      <TabsWrapper>
        <Tabs items={['Add', 'Remove']} selected={mode.tabIndex} onChange={setMode} />
      </TabsWrapper>

      {mode.tabIndex === 0 && (
        <AddToken
          tokens={tokens}
          onAddToken={handleAction}
          panelVisible={panelVisible}
          panelOpened={panelOpened}
        />
      )}
      {mode.tabIndex === 1 && <RemoveToken tokens={tokens} onRemoveToken={handleAction} />}
    </div>
  )
})

const TabsWrapper = styled.div`
  margin: 0 -${SidePanel.HORIZONTAL_PADDING}px ${3 * GU}px;
`

const useMode = panelOpened => {
  const [mode, setMode] = useState(initialState)

  useEffect(() => {
    if (!panelOpened) setMode(initialState)
  }, [panelOpened])

  const handleModeChange = tabIndex => {
    setMode({ tabIndex, value: MODES[tabIndex] })
  }
  return [mode, handleModeChange]
}

export default UpdateTokens
