import React from 'react'
import { Main, Tag, SidePanel, SyncIndicator, Header, GU } from '@aragon/ui'

import redeemIcon from './assets/icon.svg'
import Title from './components/Title'
import MainButton from './components/Buttons/MainButton'
import Balances from './components/Balances'
import NoTokens from './screens/NoTokens'
import UpdateTokens from './components/Panels/UpdateTokens'
import RedeemTokens from './components/Panels/RedeemTokens'

import { AppLogicProvider, useAppLogic, useGuiStyle } from './app-logic'
import { MODE } from './mode-types'

const App = React.memo(() => {
  const { actions, requests, isSyncing, burnableToken, tokens, panelState, mode } = useAppLogic()
  const { appearance } = useGuiStyle()

  return (
    <Main theme={appearance}>
      <SyncIndicator visible={isSyncing} />
      {tokens.length ? (
        <React.Fragment>
          <Header
            primary={
              <Title
                text="Redemptions"
                after={burnableToken && <Tag mode="identifier">{burnableToken.symbol}</Tag>}
              />
            }
            secondary={
              <MainButton
                label="Redeem"
                onClick={requests.redeemTokens}
                icon={<img src={redeemIcon} height="30px" alt="" />}
              />
            }
          />
          <Balances tokens={tokens} onRequestUpdate={requests.updateTokens} />
        </React.Fragment>
      ) : (
        !isSyncing && (
          <div
            css={`
              height: calc(100vh - ${8 * GU}px);
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <NoTokens onNewToken={requests.updateTokens} isSyncing={isSyncing} />
          </div>
        )
      )}
      <SidePanel
        title={`${mode === MODE.REDEEM_TOKENS ? 'Redeem' : 'Update'} tokens`}
        opened={panelState.visible}
        onClose={panelState.requestClose}
        onTransitionEnd={panelState.endTransition}
      >
        <div>
          {mode === MODE.REDEEM_TOKENS ? (
            <RedeemTokens
              balance={burnableToken.balance}
              symbol={burnableToken.symbol}
              decimals={burnableToken.numData.decimals}
              totalSupply={burnableToken.totalSupply}
              tokens={tokens}
              onRedeemTokens={actions.redeemTokens}
              panelOpened={panelState.opened}
            />
          ) : (
            <UpdateTokens
              tokens={tokens}
              onUpdateTokens={actions.updateTokens}
              panelVisible={panelState.visible}
              panelOpened={panelState.opened}
            />
          )}
        </div>
      </SidePanel>
    </Main>
  )
})

export default () => {
  return (
    <AppLogicProvider>
      <App />
    </AppLogicProvider>
  )
}
