import React from 'react'
import styled from 'styled-components'
import { AragonApp, AppBar, Button } from '@aragon/ui'
import { transfers } from './demo-state'
import Transfers from './components/Transfers'

class App extends React.Component {
  render() {
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <Layout>
          <Layout.FixedHeader>
            <AppBar
              title="Finance"
              endContent={<Button mode="strong">New Payment</Button>}
            />
          </Layout.FixedHeader>
          <Layout.ScrollWrapper>
            <Content>
              <Transfers transfers={transfers} />
            </Content>
          </Layout.ScrollWrapper>
        </Layout>
      </AragonApp>
    )
  }
}

const Content = styled.div`
  padding: 30px;
`

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`

Layout.FixedHeader = styled.div`
  flex-shrink: 0;
`

Layout.ScrollWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
`

export default App
