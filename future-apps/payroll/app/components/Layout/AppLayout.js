import styled, { css } from 'styled-components'
import { AragonApp } from '@aragon/ui'

const AppLayout = styled(AragonApp)`
  display: flex;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`

AppLayout.Header = styled.header`
  flex-shrink: 0;
`

AppLayout.Content = styled.main`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
  padding: 30px;

  ${({ vertical = true }) => vertical && css`
    overflow-y: auto;
  `}
  
  ${({ horizontal = false }) => horizontal && css`
    overflow-x: auto;
  `}
`

export default AppLayout
