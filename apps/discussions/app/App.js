import React from 'react'
import styled from 'styled-components'
import { EmptyStateCard, GU, Header, Main, breakpoint } from '@aragon/ui'
import nothingToSeeHere from './empty-state.png'

const illustration = <img src={nothingToSeeHere} alt="" height="160" />

function App() {
  return (
    <Main>
      <Header primary="Discussions Proof-of-Concept" />
      <Content>
        Other apps used by your organization can embed on-chain discussions,
        thanks to the coordinating work this app does in the background.
        Someday, you may see a dashboard here, showing all your ongoing
        discussions.
      </Content>
      <Spacer>
        <EmptyStateCard
          text="This is a background app. Nothing to see here."
          onActivate={() => <div />}
          illustration={illustration}
        />
      </Spacer>
    </Main>
  )
}

const Spacer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${4 * GU}px;
`

const Content = styled.p`
  padding-left: ${2 * GU}px;
  padding-right: ${2 * GU}px;
  ${breakpoint('medium', 'padding-left: 0; padding-right: 0;')}
`

export default App
