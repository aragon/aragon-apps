import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 2fr auto;
  grid-gap: 30px;
`

const Content = styled.article`
  align-items: center;
  justify-content: center;
  padding: 30px;
`

const Sidebar = styled.aside`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 300px;
`

const MyPayroll = () => (
  <Container>
    <Content>
      My Payroll
    </Content>
    <Sidebar/>
  </Container>
)

export default MyPayroll
